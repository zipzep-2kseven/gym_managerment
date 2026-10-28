import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import express from 'express';
import cookieParser from 'cookie-parser';
import { count, eq } from 'drizzle-orm';
import type { db as applicationDb } from '../src/database/index.js';
import { gyms, users, roles, userRoles, gymManagers, gymTrainers } from '../src/database/schema/index.js';
import { createGymWriteService } from '../src/services/gym-write.service.js';
import { createGymWriteRouter } from '../src/routes/gym-write.routes.js';
import { createPublicGymService } from '../src/services/public-gym.service.js';
import { createPublicGymRepository } from '../src/repositories/public-gym.repository.js';
import { createPublicGymRouter } from '../src/routes/public-gym.routes.js';
import { createStaffingService } from '../src/services/staffing.service.js';
import { errorHandler } from '../src/middleware/error-handler.js';
import { signJwt } from '../src/utils/jwt.js';
import { gymOnboardingCases } from './gym-onboarding.cases.js';
import { config } from '../src/config/index.js';

export async function testGymWriteIntegration(db: typeof applicationDb) {
  const service = createGymWriteService(db);
  const staff = createStaffingService(db);
  const user = async (role: string) => {
    const [account] = await db.insert(users).values({ email: `${randomUUID()}@gym-write.test`, passwordHash: 'fixture' }).returning();
    const [assignedRole] = await db.select().from(roles).where(eq(roles.roleName, role));
    await db.insert(userRoles).values({ userId: account.userId, roleId: assignedRole.roleId });
    return account.userId;
  };
  const admin = await user('ADMIN');
  const gymInput = () => ({ gym_name: `Gym ${randomUUID()}`, address: 'Address' });
  const create = () => service.create(admin, gymInput());
  const app = express();
  app.use(express.json(), cookieParser());
  app.use('/api/v1', createGymWriteRouter(service), createPublicGymRouter(createPublicGymService(createPublicGymRepository(db))));
  app.use(errorHandler);
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  const port = (server.address() as { port: number }).port;
  type Envelope = { success: boolean; data: Record<string, unknown>; error: { code: string } };
  const request = async (method: string, path: string, actor: string | null, body?: unknown) => {
    // Intentionally stale ADMIN claims for every actor: DB grants are authoritative.
    const token = actor ? signJwt({ sub: actor, email: 'claim@test.local', roles: ['ADMIN'] }) : '';
    const result = await fetch(`http://127.0.0.1:${port}/api/v1${path}`, { method,
      headers: { 'Content-Type': 'application/json', ...(actor ? { Cookie: `${config.cookie.name}=${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: result.status, headers: result.headers, body: await result.json() as Envelope };
  };
  const cases: [string, () => Promise<void>][] = [
    ['Only current Admin can delete an unlinked Gym; foreign keys preserve assigned Gym', async () => {
      const empty = await create();
      const path = `/gyms/${empty.gymId}`;
      assert.equal((await request('DELETE', path, null)).status, 401);
      const manager = await user('MANAGER');
      assert.equal((await request('DELETE', path, manager)).status, 403);
      const result = await request('DELETE', path, admin);
      assert.equal(result.status, 200); assert.equal(result.body.data.gym_id, empty.gymId);
      assert.equal((await request('DELETE', path, admin)).status, 404);
      const linked = await create();
      await staff.assignManager(admin, linked.gymId, manager);
      const denied = await request('DELETE', `/gyms/${linked.gymId}`, admin);
      assert.equal(denied.status, 409); assert.equal(denied.body.error.code, 'GYM_HAS_LINKED_DATA');
      assert.equal((await db.select().from(gyms).where(eq(gyms.gymId, linked.gymId))).length, 1);
      const revoked = await user('ADMIN');
      await db.delete(userRoles).where(eq(userRoles.userId, revoked));
      assert.equal((await request('DELETE', `/gyms/${linked.gymId}`, revoked)).status, 403);
    }],
    ...gymOnboardingCases({ db, admin, service, staff, gymInput, create, user, request }),
    ['Admin creates an ACTIVE Gym and no account/role/assignment side effects', async () => {
      const [{ n: beforeUsers }] = await db.select({ n: count() }).from(users);
      const [{ n: beforeRoles }] = await db.select({ n: count() }).from(userRoles);
      const response = await request('POST', '/gyms', admin, {
        gym_name: '  New Gym  ', address: '  Main Street  ', description: 'Public description',
        phone: ' +84 12345 ', email: ' CONTACT@GYM.TEST ', latitude: '10.123456', longitude: 106.123456,
        logo_url: 'https://example.test/logo.png', opening_time: '22:00', closing_time: '06:00',
      });
      assert.equal(response.status, 201); assert.equal(response.headers.get('cache-control'), 'no-store');
      const data = response.body.data;
      assert.equal(data.gym_name, 'New Gym'); assert.equal(data.address, 'Main Street'); assert.equal(data.status, 'ACTIVE');
      assert.equal(data.email, 'contact@gym.test'); assert.equal(data.opening_time, '22:00:00');
      assert.equal(data.latitude, '10.123456'); assert.equal(data.longitude, '106.123456');
      assert.ok(typeof data.created_at === 'string');
      assert.deepEqual(Object.keys(data).sort(), ['gym_id', 'gym_name', 'address', 'description', 'phone', 'email',
        'latitude', 'longitude', 'logo_url', 'opening_time', 'closing_time', 'status', 'created_at', 'updated_at'].sort());
      const gymId = data.gym_id as string;
      assert.equal((await db.select().from(gymManagers).where(eq(gymManagers.gymId, gymId))).length, 0);
      assert.equal((await db.select().from(gymTrainers).where(eq(gymTrainers.gymId, gymId))).length, 0);
      assert.equal((await db.select({ n: count() }).from(users))[0].n, beforeUsers);
      assert.equal((await db.select({ n: count() }).from(userRoles))[0].n, beforeRoles);
      assert.deepEqual((await request('GET', `/gyms/${gymId}`, null)).body.data, data);
    }],
    ['Only a current unrestricted Admin can create, regardless of JWT role claims', async () => {
      const noSession = await request('POST', '/gyms', null, gymInput());
      assert.equal(noSession.status, 401); assert.equal(noSession.headers.get('cache-control'), 'no-store');
      for (const role of ['MANAGER', 'PT', 'CUSTOMER']) {
        assert.equal((await request('POST', '/gyms', await user(role), gymInput())).status, 403);
      }
      const formerAdmin = await user('ADMIN'); await db.delete(userRoles).where(eq(userRoles.userId, formerAdmin));
      assert.equal((await request('POST', '/gyms', formerAdmin, gymInput())).status, 403);
      for (const patch of [{ status: 'INACTIVE' }, { status: 'SUSPENDED' }, { mustChangePassword: true }]) {
        const actor = await user('ADMIN'); await db.update(users).set(patch).where(eq(users.userId, actor));
        const response = await request('POST', '/gyms', actor, gymInput());
        assert.equal(response.status, 403);
        assert.equal(response.body.error.code, 'mustChangePassword' in patch ? 'PASSWORD_CHANGE_REQUIRED' : 'ACCOUNT_DEACTIVATED');
      }
      assert.equal((await request('POST', '/gyms', randomUUID(), gymInput())).status, 401);
    }],
    ['Manager updates only their ACTIVE assignment Gym; PT/Customer/role-only Manager denied', async () => {
      const first = await create(); const second = await create(); const manager = await user('MANAGER');
      const assignment = await staff.assignManager(admin, first.gymId, manager);
      assert.equal((await request('PATCH', `/gyms/${first.gymId}`, manager, { gym_name: 'Updated locally' })).status, 200);
      assert.equal((await request('PATCH', `/gyms/${second.gymId}`, manager, { gym_name: 'Cross Gym' })).status, 403);
      for (const role of ['PT', 'CUSTOMER', 'MANAGER']) {
        assert.equal((await request('PATCH', `/gyms/${first.gymId}`, await user(role), { address: 'Denied' })).status, 403);
      }
      await staff.revokeManager(admin, first.gymId, assignment.gymManagerId);
      assert.equal((await request('PATCH', `/gyms/${first.gymId}`, manager, { address: 'Revoked' })).status, 403);
      assert.equal((await db.select().from(gyms).where(eq(gyms.gymId, second.gymId)))[0].gymName, second.gymName);
    }],
    ['Partial update preserves identity/status/creation and omitted fields; nullable fields can be cleared', async () => {
      const gym = await service.create(admin, { ...gymInput(), description: 'Keep', phone: '123', email: 'gym@test.local' });
      const changed = await request('PATCH', `/gyms/${gym.gymId}`, admin, { address: 'New Address', email: null });
      assert.equal(changed.status, 200);
      const data = changed.body.data;
      assert.equal(data.gym_id, gym.gymId); assert.equal(data.gym_name, gym.gymName); assert.equal(data.status, gym.status);
      assert.equal(data.created_at, gym.createdAt.toISOString()); assert.equal(data.description, 'Keep');
      assert.equal(data.phone, '123'); assert.equal(data.email, null); assert.equal(data.address, 'New Address');
      assert.ok(new Date(data.updated_at as string) > gym.updatedAt);
      assert.deepEqual((await request('GET', `/gyms/${gym.gymId}`, null)).body.data, data);
      await db.update(gyms).set({ status: 'INACTIVE' }).where(eq(gyms.gymId, gym.gymId));
      assert.equal((await request('PATCH', `/gyms/${gym.gymId}`, admin, { description: 'Internal correction' })).status, 200);
      assert.equal((await request('GET', `/gyms/${gym.gymId}`, null)).status, 404);
      assert.equal((await db.select().from(gyms).where(eq(gyms.gymId, gym.gymId)))[0].status, 'INACTIVE');
    }],
    ['Validation and strict field allowlist reject full request without partial writes', async () => {
      const gym = await create();
      const invalid = [{ gym_name: '' }, { address: '  ' }, { gym_name: null }, { address: null },
        { latitude: 91 }, { longitude: -181 }, { latitude: 'NaN' }, { latitude: true },
        { email: 'invalid' }, { phone: '1'.repeat(21) }, { opening_time: '25:00' }, { closing_time: '09:99' },
        { logo_url: 'javascript:alert(1)' }, { gym_id: randomUUID() }, { status: 'INACTIVE' },
        { created_at: '2000-01-01' }, { updated_at: '2000-01-01' }, { manager_id: admin }, { roles: ['ADMIN'] }];
      const [{ n: before }] = await db.select({ n: count() }).from(gyms);
      for (const input of invalid) {
        assert.equal((await request('POST', '/gyms', admin, { ...gymInput(), ...input })).status, 400);
        assert.equal((await request('PATCH', `/gyms/${gym.gymId}`, admin, { description: 'Must not persist', ...input })).status, 400);
      }
      assert.equal((await request('POST', '/gyms', admin, {})).status, 400);
      assert.equal((await request('PATCH', `/gyms/${gym.gymId}`, admin, {})).status, 400);
      assert.equal((await db.select({ n: count() }).from(gyms))[0].n, before);
      assert.deepEqual((await db.select().from(gyms).where(eq(gyms.gymId, gym.gymId)))[0], gym);
      assert.equal((await request('PATCH', `/gyms/${gym.gymId}`, admin, { latitude: 90, longitude: '-180', opening_time: null })).status, 200);
    }],
    ['Update validates identity, account/password restrictions and current roles', async () => {
      const gym = await create();
      assert.equal((await request('PATCH', `/gyms/${gym.gymId}`, null, { address: 'Denied' })).status, 401);
      assert.equal((await request('PATCH', '/gyms/invalid', admin, { address: 'Unknown' })).status, 400);
      assert.equal((await request('PATCH', `/gyms/${randomUUID()}`, admin, { address: 'Unknown' })).status, 404);
      const manager = await user('MANAGER'); await staff.assignManager(admin, gym.gymId, manager);
      await db.delete(userRoles).where(eq(userRoles.userId, manager));
      assert.equal((await request('PATCH', `/gyms/${gym.gymId}`, manager, { address: 'Stale role' })).status, 403);
      for (const patch of [{ status: 'INACTIVE' }, { status: 'SUSPENDED' }, { mustChangePassword: true }]) {
        const actor = await user('ADMIN'); await db.update(users).set(patch).where(eq(users.userId, actor));
        assert.equal((await request('PATCH', `/gyms/${gym.gymId}`, actor, { address: 'Denied' })).status, 403);
      }
    }],
    ['Concurrent partial updates preserve both independent changes', async () => {
      const gym = await create();
      const results = await Promise.all([
        request('PATCH', `/gyms/${gym.gymId}`, admin, { address: 'Concurrent address' }),
        request('PATCH', `/gyms/${gym.gymId}`, admin, { description: 'Concurrent description' }),
      ]);
      assert.ok(results.every(result => result.status === 200));
      const [stored] = await db.select().from(gyms).where(eq(gyms.gymId, gym.gymId));
      assert.equal(stored.address, 'Concurrent address'); assert.equal(stored.description, 'Concurrent description');
    }],
  ];
  try {
    for (const [label, run] of process.env.GYM_TEST_ORDER === 'reverse' ? [...cases].reverse() : cases) {
      try { await run(); } catch (error) { console.error(`FAIL Gym writes: ${label}`); throw error; }
    }
    return cases.length;
  } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
}
