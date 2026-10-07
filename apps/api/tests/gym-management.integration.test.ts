import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import express from 'express';
import cookieParser from 'cookie-parser';
import { eq } from 'drizzle-orm';
import type { db as applicationDb } from '../src/database/index.js';
import { gyms, users, roles, userRoles, gymTrainers } from '../src/database/schema/index.js';
import { createGymManagementService } from '../src/services/gym-management.service.js';
import { createGymManagementRouter } from '../src/routes/gym-management.routes.js';
import { createStaffingService } from '../src/services/staffing.service.js';
import { createPublicGymRepository } from '../src/repositories/public-gym.repository.js';
import { createPublicGymService } from '../src/services/public-gym.service.js';
import { createPublicGymRouter } from '../src/routes/public-gym.routes.js';
import { createPublicTrainerRepository } from '../src/repositories/public-trainer.repository.js';
import { createPublicTrainerService } from '../src/services/public-trainer.service.js';
import { createPublicTrainerRouter } from '../src/routes/public-trainer.routes.js';
import { errorHandler } from '../src/middleware/error-handler.js';
import { config } from '../src/config/index.js';
import { signJwt } from '../src/utils/jwt.js';

type Envelope = { success: boolean; data: Record<string, unknown>[]; error: { code: string }; pagination: {
  page: number; pageSize: number; totalItems: number; totalPages: number; hasNextPage: boolean; hasPreviousPage: boolean;
} };
export async function testGymManagementIntegration(db: typeof applicationDb) {
  const user = async (role: string) => {
    const [account] = await db.insert(users).values({ email: `${randomUUID()}@management.test`, passwordHash: 'private_hash_sentinel' }).returning();
    const [grant] = await db.select().from(roles).where(eq(roles.roleName, role));
    await db.insert(userRoles).values({ userId: account.userId, roleId: grant.roleId });
    return account.userId;
  };
  const marker = randomUUID();
  const fixtures = await db.insert(gyms).values(['Alpha', 'Beta', 'Hidden'].map((name, index) => ({
    gymName: `${marker} ${name}`, address: index === 1 ? `${marker} Harbor%_\\` : 'Address',
    status: index === 2 ? 'INACTIVE' : 'ACTIVE', createdAt: new Date('2020-01-01'),
  }))).returning();
  const [local, other, hidden] = fixtures;
  const admin = await user('ADMIN'); const manager = await user('MANAGER');
  const staff = createStaffingService(db);
  await staff.assignManager(admin, local.gymId, manager);
  const trainers: (typeof gymTrainers.$inferSelect)[] = [];
  for (const [index, specialization] of ['Alpha', 'Beta', 'Gamma'].entries()) {
    trainers.push((await db.insert(gymTrainers).values({ gymId: local.gymId, userId: await user('PT'),
      specialization, bio: index === 1 ? 'Yoga%_\\' : 'General', status: index === 2 ? 'INACTIVE' : 'ACTIVE',
      createdAt: new Date('2020-01-01') }).returning())[0]);
  }
  const [outside] = await db.insert(gymTrainers).values({ gymId: other.gymId, userId: await user('PT') }).returning();
  const app = express(); app.use(cookieParser());
  app.use('/api/v1', createGymManagementRouter(createGymManagementService(db)),
    createPublicGymRouter(createPublicGymService(createPublicGymRepository(db))),
    createPublicTrainerRouter(createPublicTrainerService(createPublicTrainerRepository(db))));
  app.use(errorHandler);
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  const port = (server.address() as { port: number }).port;
  const path = `/gyms/${local.gymId}/management/trainers`;
  const request = async (path: string, actor: string | null = admin) => {
    const token = actor ? signJwt({ sub: actor, email: 'claim@test.local', roles: ['ADMIN'] }) : '';
    const response = await fetch(`http://127.0.0.1:${port}/api/v1${path}`, {
      headers: actor ? { Cookie: `${config.cookie.name}=${token}` } : {},
    });
    return { status: response.status, headers: response.headers, body: await response.json() as Envelope };
  };
  const cases: [string, () => Promise<void>][] = [
    ['Admin lists both Gym statuses with consistent filters, search and pagination', async () => {
      const base = `/admin/gyms?search=${marker}`;
      const all = await request(base); assert.equal(all.status, 200); assert.equal(all.body.pagination.totalItems, 3);
      assert.equal(all.body.pagination.pageSize, 20); assert.equal(all.headers.get('cache-control'), 'no-store');
      for (const [status, total] of [['ACTIVE', 2], ['INACTIVE', 1]] as const) {
        const response = await request(`${base}&status=${status}`);
        assert.equal(response.body.pagination.totalItems, total); assert.ok(response.body.data.every(row => row.status === status));
      }
      const page1 = await request(`${base}&pageSize=2`); const page2 = await request(`${base}&pageSize=2&page=2`);
      assert.deepEqual(page1.body.pagination, { page: 1, pageSize: 2, totalItems: 3, totalPages: 2, hasNextPage: true, hasPreviousPage: false });
      assert.deepEqual([...page1.body.data, ...page2.body.data].map(row => row.gym_id), fixtures.map(row => row.gymId).sort());
      const found = await request(`/admin/gyms?search=${encodeURIComponent(`${marker} HARBOR%_\\`)}`);
      assert.deepEqual(found.body.data.map(row => row.gym_id), [other.gymId]);
      assert.deepEqual((await request(`${base}&sortBy=gym_name&sortOrder=asc`)).body.data.map(row => row.gym_id), fixtures.map(row => row.gymId));
      assert.deepEqual((await request(`${base}&page=100`)).body.data, []);
      assert.equal((await request(`/admin/gyms?search=${randomUUID()}`)).body.pagination.totalPages, 0);
    }],
    ['Admin and local Manager list both PT statuses with assignment-only projection', async () => {
      for (const actor of [admin, manager]) {
        const result = await request(path, actor);
        assert.equal(result.status, 200); assert.equal(result.body.pagination.totalItems, 3);
        assert.ok(result.body.data.every(row => row.gym_id === local.gymId));
        assert.ok(!result.body.data.some(row => row.gym_trainer_id === outside.gymTrainerId));
        assert.equal(result.headers.get('cache-control'), 'no-store');
        for (const row of result.body.data) assert.deepEqual(Object.keys(row).sort(), ['gym_trainer_id', 'gym_id', 'user_id',
          'specialization', 'experience_years', 'bio', 'availability', 'status', 'joined_at', 'created_at', 'updated_at'].sort());
        for (const forbidden of ['password', 'email', 'phone', 'private_hash_sentinel']) assert.ok(!JSON.stringify(result.body).includes(forbidden));
      }
      assert.equal((await request(`${path}?status=ACTIVE`, manager)).body.pagination.totalItems, 2);
      assert.deepEqual((await request(`${path}?status=INACTIVE`, manager)).body.data.map(row => row.gym_trainer_id), [trainers[2].gymTrainerId]);
      const first = await request(`${path}?pageSize=2`); const second = await request(`${path}?pageSize=2&page=2`);
      assert.deepEqual([...first.body.data, ...second.body.data].map(row => row.gym_trainer_id), trainers.map(row => row.gymTrainerId).sort());
      const found = await request(`${path}?search=${encodeURIComponent(' yoga%_\\ ')}&sortBy=specialization&sortOrder=asc`);
      assert.equal(found.body.pagination.totalItems, 1); assert.equal(found.body.data[0].gym_trainer_id, trainers[1].gymTrainerId);
      assert.equal((await request(`${path}?search=${randomUUID()}`)).body.pagination.totalPages, 0);
    }],
    ['Guest, stale JWT roles and cross-Gym Manager access cannot read management data', async () => {
      for (const endpoint of ['/admin/gyms', path]) {
        const guest = await request(endpoint, null); assert.equal(guest.status, 401); assert.equal(guest.headers.get('cache-control'), 'no-store');
        for (const role of ['CUSTOMER', 'PT']) assert.equal((await request(endpoint, await user(role))).status, 403);
        assert.equal((await request(endpoint, randomUUID())).status, 401);
      }
      assert.equal((await request('/admin/gyms', manager)).status, 403);
      assert.equal((await request(path, await user('MANAGER'))).status, 403);
      assert.equal((await request(`/gyms/${other.gymId}/management/trainers`, manager)).status, 403);
    }],
    ['Revoked roles, account restrictions and revoked assignments take effect on next request', async () => {
      const formerAdmin = await user('ADMIN'); await db.delete(userRoles).where(eq(userRoles.userId, formerAdmin));
      for (const endpoint of ['/admin/gyms', path]) {
        assert.equal((await request(endpoint, formerAdmin)).status, 403);
        for (const patch of [{ status: 'INACTIVE' }, { status: 'SUSPENDED' }, { mustChangePassword: true }]) {
          const actor = await user('ADMIN'); await db.update(users).set(patch).where(eq(users.userId, actor));
          const result = await request(endpoint, actor); assert.equal(result.status, 403);
          assert.equal(result.body.error.code, 'mustChangePassword' in patch ? 'PASSWORD_CHANGE_REQUIRED' : 'ACCOUNT_DEACTIVATED');
        }
      }
      const [gym] = await db.insert(gyms).values({ gymName: 'Revocation', address: 'Test' }).returning();
      const actor = await user('MANAGER'); const assignment = await staff.assignManager(admin, gym.gymId, actor);
      const endpoint = `/gyms/${gym.gymId}/management/trainers`;
      assert.equal((await request(endpoint, actor)).status, 200);
      await db.delete(userRoles).where(eq(userRoles.userId, actor));
      assert.equal((await request(endpoint, actor)).status, 403);
      const [role] = await db.select().from(roles).where(eq(roles.roleName, 'MANAGER'));
      await db.insert(userRoles).values({ userId: actor, roleId: role.roleId });
      await staff.revokeManager(admin, gym.gymId, assignment.gymManagerId);
      assert.equal((await request(endpoint, actor)).status, 403);
    }],
    ['INACTIVE Gym remains internally readable but public APIs stay restricted even for Admin', async () => {
      try {
        await db.update(gyms).set({ status: 'INACTIVE' }).where(eq(gyms.gymId, local.gymId));
        for (const actor of [admin, manager]) assert.equal((await request(path, actor)).body.pagination.totalItems, 3);
        assert.equal((await request(`/gyms/${local.gymId}`, admin)).status, 404);
        assert.equal((await request(`/gyms/${local.gymId}/trainers`, admin)).status, 404);
      } finally { await db.update(gyms).set({ status: 'ACTIVE' }).where(eq(gyms.gymId, local.gymId)); }
      const visible = await request(`/gyms?search=${marker}`, null);
      assert.equal(visible.body.pagination.totalItems, 2); assert.ok(!visible.body.data.some(row => row.gym_id === hidden.gymId));
      const publicPT = await request(`/gyms/${local.gymId}/trainers`, admin);
      assert.equal(publicPT.body.pagination.totalItems, 2);
      assert.ok(publicPT.body.data.every(row => !('user_id' in row) && row.status === 'ACTIVE'));
      assert.equal((await request(`/gyms/${local.gymId}/trainers?status=INACTIVE`, admin)).status, 400);
    }],
    ['Validation rejects scope injection, unsafe sorting and malformed pagination/UUID', async () => {
      for (const endpoint of ['/admin/gyms', path]) {
        for (const query of ['status=ALL', 'status=SUSPENDED', 'status=ACTIVE&status=INACTIVE', 'page=0', 'pageSize=101',
          'page=1.5', 'page=1&page=2', 'page=9007199254740991&pageSize=100', 'sortOrder=bad', 'sortBy=password_hash',
          `gym_id=${other.gymId}`, 'roles=ADMIN', 'search[x]=test']) {
          const response = await request(`${endpoint}?${query}`); assert.equal(response.status, 400, query);
          assert.equal(response.body.error.code, 'VALIDATION_ERROR');
        }
      }
      assert.equal((await request('/gyms/bad/management/trainers')).status, 400);
      assert.equal((await request(`/gyms/${randomUUID()}/management/trainers`)).status, 404);
      assert.equal((await request(`/gyms/${hidden.gymId}/management/trainers`)).body.pagination.totalItems, 0);
    }],
  ];
  try {
    for (const [label, run] of process.env.GYM_TEST_ORDER === 'reverse' ? [...cases].reverse() : cases) {
      try { await run(); } catch (error) { console.error(`FAIL Gym management: ${label}`); throw error; }
    }
    return cases.length;
  } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
}
