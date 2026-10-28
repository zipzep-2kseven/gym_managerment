import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import express from 'express';
import cookieParser from 'cookie-parser';
import { and, count, eq } from 'drizzle-orm';
import { verify } from '@node-rs/argon2';
import type { db as applicationDb } from '../src/database/index.js';
import { users, userProfiles, roles, userRoles, gyms, gymManagers, gymTrainers } from '../src/database/schema/index.js';
import { createStaffingService } from '../src/services/staffing.service.js';
import type { UserSession } from '../src/types/auth.types.js';
import { AuthService } from '../src/services/auth.service.js';
import { createStaffingRouter } from '../src/routes/staffing.routes.js';
import { errorHandler } from '../src/middleware/error-handler.js';
import { config } from '../src/config/index.js';
import { signJwt } from '../src/utils/jwt.js';
import { provisionStaffInTransaction } from '../src/services/staff-provisioning.js';

// Real transactions and separate pool connections, only in the harness's disposable DB.
export async function testStaffingIntegration(db: typeof applicationDb) {
  for (const roleName of ['ADMIN', 'MANAGER', 'PT', 'CUSTOMER']) {
    await db.insert(roles).values({ roleName }).onConflictDoNothing();
  }
  const roleRows = await db.select().from(roles);
  const account = async (role: string) => {
    const [user] = await db.insert(users).values({ email: `${randomUUID()}@staff.test`, passwordHash: 'fixture' }).returning();
    await db.insert(userRoles).values({ userId: user.userId, roleId: roleRows.find(r => r.roleName === role)!.roleId });
    return user.userId;
  };
  const gym = async () => (await db.insert(gyms).values({ gymName: 'Staffing test', address: 'Test' }).returning())[0].gymId;
  const identity = () => ({ email: `${randomUUID()}@staff.test`, full_name: 'Staff Test', phone: null });
  const admin = await account('ADMIN');
  const service = createStaffingService(db);
  const operatorFor = async (gymId: string) => {
    const manager = await account('MANAGER');
    await service.assignManager(admin, gymId, manager);
    return manager;
  };
  const auth = new AuthService(db);
  const app = express();
  app.use(express.json(), cookieParser(), createStaffingRouter(service), errorHandler);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = (server.address() as { port: number }).port;
  type ProvisionResponse = { user: UserSession; assignment: Record<string, string>; temporary_password: string };
  const request = async <T = ProvisionResponse>(path: string, actor: string | null, body?: unknown) => {
    const token = actor ? signJwt({ sub: actor, email: 'claim@staff.test', roles: ['ADMIN'] }) : '';
    const res = await fetch(`http://127.0.0.1:${port}${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { 'Content-Type': 'application/json', ...(actor ? { Cookie: `${config.cookie.name}=${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: res.status, headers: res.headers, body: await res.json() as { data: T; error: { code: string } } };
  };
  const rejects = (promise: Promise<unknown>, code: string) => assert.rejects(promise,
    (error: any) => error.code === code);
  const snapshot = () => Promise.all([
    db.select({ total: count() }).from(users), db.select({ total: count() }).from(userProfiles),
    db.select({ total: count() }).from(userRoles), db.select({ total: count() }).from(gymTrainers),
  ]);
  const cases: [string, () => Promise<void>][] = [
    ['PT duplicate email leaves account/profile/role/assignment unchanged', async () => {
      const gymId = await gym(), existing = await account('CUSTOMER'), operator = await operatorFor(gymId);
      const [target] = await db.select().from(users).where(eq(users.userId, existing));
      const before = await snapshot();
      await rejects(service.provisionTrainer(operator, gymId, { ...identity(), email: target.email }), 'EMAIL_ALREADY_EXISTS');
      assert.deepEqual(await snapshot(), before);
      assert.deepEqual((await db.select().from(users).where(eq(users.userId, existing)))[0], target);
    }],
    ['PT missing role configuration leaves no partial account and restores isolated fixture configuration', async () => {
      const gymId = await gym(), operator = await operatorFor(gymId), input = identity(), before = await snapshot();
      const roleId = roleRows.find(role => role.roleName === 'PT')!.roleId;
      const rollbackFixture = new Error('Restore disposable fixture role');
      await assert.rejects(db.transaction(async tx => {
        // Savepoints exercise the real service; the outer transaction restores all fixture role links.
        await tx.delete(userRoles).where(eq(userRoles.roleId, roleId));
        await tx.delete(roles).where(eq(roles.roleId, roleId));
        const scopedService = createStaffingService(tx as unknown as typeof applicationDb);
        await rejects(scopedService.provisionTrainer(operator, gymId, input), 'INTERNAL_SERVER_ERROR');
        assert.equal((await tx.select().from(users).where(eq(users.email, input.email))).length, 0);
        assert.equal((await tx.select().from(gymTrainers).where(eq(gymTrainers.gymId, gymId))).length, 0);
        throw rollbackFixture;
      }), error => error === rollbackFixture);
      assert.deepEqual(await snapshot(), before);
      assert.equal((await db.select().from(roles).where(eq(roles.roleId, roleId)))[0].roleName, 'PT');
    }],
    ['PT assignment failure rolls back the newly inserted account/profile/role in the write transaction', async () => {
      const input = identity(), before = await snapshot();
      await assert.rejects(db.transaction(tx => provisionStaffInTransaction(tx, randomUUID(), 'PT', input,
        { passwordHash: 'synthetic-fixture-hash', temporaryPassword: 'unused-synthetic-value' })),
      (error: { cause?: { code?: string } }) => error.cause?.code === '23503');
      assert.equal((await db.select().from(users).where(eq(users.email, input.email))).length, 0);
      assert.deepEqual(await snapshot(), before);
    }],
    ['HTTP provisioning: safe one-time credential, normalized identity, no email gate', async () => {
      const gymId = await gym(); const input = identity();
      const result = await request('/admin/managers/provision', admin,
        { ...input, email: ` ${input.email.toUpperCase()} `, gym_id: gymId });
      assert.equal(result.status, 201);
      assert.equal(result.headers.get('cache-control'), 'no-store');
      const data = result.body.data;
      assert.equal(data.user.email, input.email);
      assert.equal(data.user.email_verified_at, null);
      assert.equal(data.user.must_change_password, true);
      assert.deepEqual(data.user.roles, ['MANAGER']);
      assert.equal(data.assignment.gym_id, gymId);
      assert.equal(data.assignment.status, 'ACTIVE');
      assert.ok(typeof data.temporary_password === 'string' && data.temporary_password.length >= 32);
      assert.ok(!JSON.stringify(data).includes('password_hash'));
      const [stored] = await db.select().from(users).where(eq(users.userId, data.user.user_id));
      assert.ok(stored.passwordHash.startsWith('$argon2id$'));
      assert.ok(await verify(stored.passwordHash, data.temporary_password));
      assert.ok(!JSON.stringify(stored).includes(data.temporary_password));
      const repeat = await request('/admin/managers/provision', admin, { ...input, gym_id: gymId });
      assert.equal(repeat.status, 409); assert.equal(repeat.body.error.code, 'EMAIL_ALREADY_EXISTS');
      assert.ok(!JSON.stringify(repeat.body).includes(data.temporary_password));
      const listed = await request(`/gyms/${gymId}/managers`, admin);
      assert.equal(listed.status, 200);
      assert.ok(!JSON.stringify(listed.body).includes(data.temporary_password));
      assert.ok(!JSON.stringify(await auth.getCurrentUser(stored.userId)).includes(data.temporary_password));
    }],
    ['password change invalidates temporary value and preserves account/assignment state', async () => {
      const gymId = await gym(); const result = await service.provisionManager(admin, { ...identity(), gym_id: gymId });
      const userId = result.user.user_id; const current = result.temporary_password;
      const [before] = await db.select().from(users).where(eq(users.userId, userId));
      const assignmentsBefore = await db.select().from(gymManagers).where(eq(gymManagers.userId, userId));
      await auth.login({ email: result.user.email, password: current });
      await rejects(auth.changePassword(userId, { current_password: current, new_password: current }), 'VALIDATION_ERROR');
      const [unchanged] = await db.select().from(users).where(eq(users.userId, userId));
      assert.ok(unchanged.passwordHash === before.passwordHash && unchanged.mustChangePassword);
      const next = `Next1!${randomUUID()}`;
      await auth.changePassword(userId, { current_password: current, new_password: next });
      const [after] = await db.select().from(users).where(eq(users.userId, userId));
      assert.equal(after.mustChangePassword, false);
      assert.equal(after.status, before.status); assert.equal(after.emailVerifiedAt, before.emailVerifiedAt);
      assert.ok(after.updatedAt >= before.updatedAt && after.passwordHash !== before.passwordHash);
      assert.deepEqual(await db.select().from(gymManagers).where(eq(gymManagers.userId, userId)), assignmentsBefore);
      await rejects(auth.login({ email: result.user.email, password: current }), 'INVALID_CREDENTIALS');
      await auth.login({ email: result.user.email, password: next });
    }],
    ['PT: active local Manager allowed; Admin, other Gym and revoked Manager denied', async () => {
      const gymId = await gym(); const other = await gym(); const manager = await account('MANAGER');
      const assignment = await service.assignManager(admin, gymId, manager);
      assert.equal((await request(`/gyms/${gymId}/trainers/provision`, admin, identity())).status, 403);
      for (const actor of [manager]) {
        const result = await request(`/gyms/${gymId}/trainers/provision`, actor, identity());
        assert.equal(result.status, 201); assert.deepEqual(result.body.data.user.roles, ['PT']);
        assert.equal(result.body.data.assignment.availability, 'NOT_ACCEPTING');
      }
      assert.equal((await request(`/gyms/${other}/trainers/provision`, manager, identity())).status, 403);
      assert.equal((await request('/admin/managers/provision', manager, { ...identity(), gym_id: other })).status, 403);
      await service.revokeManager(admin, gymId, assignment.gymManagerId);
      assert.equal((await request(`/gyms/${gymId}/trainers/provision`, manager, identity())).status, 403);
    }],
    ['HTTP uses current database role/account/password gate, not ADMIN token claims', async () => {
      const gymId = await gym();
      for (const role of ['CUSTOMER', 'PT', 'MANAGER']) {
        assert.equal((await request(`/gyms/${gymId}/trainers/provision`, await account(role), identity())).status, 403);
      }
      const unauthenticated = await request('/admin/managers/provision', null, { ...identity(), gym_id: gymId });
      assert.equal(unauthenticated.status, 401);
      assert.equal(unauthenticated.headers.get('cache-control'), 'no-store');
      for (const patch of [{ status: 'SUSPENDED' }, { mustChangePassword: true }]) {
        const actor = await account('ADMIN'); await db.update(users).set(patch).where(eq(users.userId, actor));
        assert.equal((await request('/admin/managers/provision', actor, { ...identity(), gym_id: gymId })).status, 403);
      }
      const formerAdmin = await account('ADMIN'); await db.delete(userRoles).where(eq(userRoles.userId, formerAdmin));
      assert.equal((await request('/admin/managers/provision', formerAdmin, { ...identity(), gym_id: gymId })).status, 403);
    }],
    ['strict request allowlist, UUID validation and missing Gym', async () => {
      const gymId = await gym();
      for (const extra of [{ password: 'ActorPassword1' }, { roles: ['ADMIN'] }, { status: 'ACTIVE' }]) {
        assert.equal((await request('/admin/managers/provision', admin, { ...identity(), gym_id: gymId, ...extra })).status, 400);
      }
      assert.equal((await request(`/gyms/${gymId}/trainers/provision`, admin, { ...identity(), gym_id: await gym() })).status, 400);
      assert.equal((await request('/gyms/not-uuid/managers', admin)).status, 400);
      assert.equal((await request('/admin/managers/provision', admin, { ...identity(), gym_id: randomUUID() })).status, 404);
    }],
    ['revoke/reactivate same row; preserve creation; refresh assigned_at; no role mutation', async () => {
      const gymId = await gym(); const manager = await account('MANAGER');
      const original = await service.assignManager(admin, gymId, manager);
      await db.update(gymManagers).set({ assignedAt: new Date('2020-01-01') }).where(eq(gymManagers.gymManagerId, original.gymManagerId));
      await rejects(service.revokeManager(admin, await gym(), original.gymManagerId), 'NOT_FOUND');
      const result = await request<Record<string, string>>(`/gyms/${gymId}/managers/${original.gymManagerId}/revoke`, admin, {});
      assert.equal(result.status, 200); assert.equal(result.body.data.status, 'INACTIVE');
      await rejects(service.revokeManager(admin, gymId, original.gymManagerId), 'INVALID_STATUS_TRANSITION');
      const assigned = await request<Record<string, string>>(`/gyms/${gymId}/managers/assign`, admin, { user_id: manager });
      assert.equal(assigned.status, 200); assert.equal(assigned.body.data.gym_manager_id, original.gymManagerId);
      assert.equal(assigned.body.data.created_at, original.createdAt.toISOString());
      assert.ok(new Date(assigned.body.data.assigned_at) > new Date('2020-01-01'));
      assert.equal((await db.select().from(gymManagers).where(and(eq(gymManagers.gymId, gymId), eq(gymManagers.userId, manager)))).length, 1);
      assert.equal((await db.select().from(userRoles).where(eq(userRoles.userId, manager))).length, 1);
      await rejects(service.assignManager(admin, gymId, manager), 'ASSIGNMENT_ALREADY_EXISTS');
    }],
    ['target must exist, be ACTIVE and hold MANAGER role', async () => {
      const gymId = await gym();
      await rejects(service.assignManager(admin, gymId, randomUUID()), 'NOT_FOUND');
      await rejects(service.assignManager(admin, gymId, await account('PT')), 'INSUFFICIENT_ROLE');
      const manager = await account('MANAGER'); await db.update(users).set({ status: 'INACTIVE' }).where(eq(users.userId, manager));
      await rejects(service.assignManager(admin, gymId, manager), 'ACCOUNT_DEACTIVATED');
    }],
    ['conflicting Manager remains ACTIVE and reactivation is rolled back', async () => {
      const gymId = await gym(); const first = await account('MANAGER'); const second = await account('MANAGER');
      const initial = await service.assignManager(admin, gymId, first);
      await service.revokeManager(admin, gymId, initial.gymManagerId);
      const active = await service.assignManager(admin, gymId, second);
      await rejects(service.assignManager(admin, gymId, first), 'GYM_ALREADY_HAS_ACTIVE_MANAGER');
      const rows = await service.listManagers(admin, gymId);
      assert.equal(rows.find(r => r.gymManagerId === initial.gymManagerId)!.status, 'INACTIVE');
      assert.equal(rows.find(r => r.gymManagerId === active.gymManagerId)!.status, 'ACTIVE');
      await rejects(service.assignManager(admin, await gym(), second), 'USER_ALREADY_ACTIVE_MANAGER');
    }],
    ['concurrent assignment enforces both active Gym and active User uniqueness', async () => {
      for (const sameUser of [false, true]) {
        const gymId = await gym(); const manager = await account('MANAGER');
        const secondGym = sameUser ? await gym() : gymId;
        const secondManager = sameUser ? manager : await account('MANAGER');
        const results = await Promise.allSettled([
          service.assignManager(admin, gymId, manager),
          service.assignManager(admin, secondGym, secondManager),
        ]);
        assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
        const failed = results.find(r => r.status === 'rejected') as PromiseRejectedResult;
        assert.equal(failed.reason.code, sameUser ? 'USER_ALREADY_ACTIVE_MANAGER' : 'GYM_ALREADY_HAS_ACTIVE_MANAGER');
      }
    }],
    ['concurrent reactivation returns one success and preserves one record', async () => {
      const gymId = await gym(); const manager = await account('MANAGER');
      const original = await service.assignManager(admin, gymId, manager);
      await service.revokeManager(admin, gymId, original.gymManagerId);
      const results = await Promise.allSettled([service.assignManager(admin, gymId, manager), service.assignManager(admin, gymId, manager)]);
      assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
      assert.equal((results.find(r => r.status === 'rejected') as PromiseRejectedResult).reason.code, 'ASSIGNMENT_ALREADY_EXISTS');
      assert.equal((await service.listManagers(admin, gymId)).length, 1);
    }],
    ['concurrent Manager provisioning rolls back losing account/profile/role transaction', async () => {
      const gymId = await gym(); const inputs = [identity(), identity()];
      const results = await Promise.allSettled(inputs.map(input => service.provisionManager(admin, { ...input, gym_id: gymId })));
      assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
      const loser = results.findIndex(r => r.status === 'rejected');
      assert.equal((results[loser] as PromiseRejectedResult).reason.code, 'GYM_ALREADY_HAS_ACTIVE_MANAGER');
      assert.equal((await db.select().from(users).where(eq(users.email, inputs[loser].email))).length, 0);
      assert.equal((await service.listManagers(admin, gymId)).length, 1);
    }],
    ['duplicate phone rolls back provisioning and returns domain conflict', async () => {
      const gymId = await gym(); const existing = await account('CUSTOMER'), operator = await operatorFor(gymId);
      const phone = '0901234599'; await db.update(users).set({ phone }).where(eq(users.userId, existing));
      const input = { ...identity(), phone };
      await rejects(service.provisionTrainer(operator, gymId, input), 'PHONE_ALREADY_EXISTS');
      assert.equal((await db.select().from(users).where(eq(users.email, input.email))).length, 0);
      assert.equal((await db.select().from(gymTrainers).where(eq(gymTrainers.gymId, gymId))).length, 0);
    }],
  ];
  try {
    const ordered = process.env.GYM_TEST_ORDER === 'reverse' ? [...cases].reverse() : cases;
    for (const [name, run] of ordered) {
      try { await run(); } catch (error) { console.error(`FAIL staffing: ${name}`); throw error; }
    }
    return cases.length;
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
}
