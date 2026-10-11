import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { verify } from '@node-rs/argon2';
import { count, eq, sql } from 'drizzle-orm';
import type { db as applicationDb } from '../src/database/index.js';
import { gyms, users, userProfiles, userRoles, gymManagers } from '../src/database/schema/index.js';
import { AuthService } from '../src/services/auth.service.js';
import type { UserSession } from '../src/types/auth.types.js';
import type { createGymWriteService } from '../src/services/gym-write.service.js';
import type { createStaffingService } from '../src/services/staffing.service.js';

type GymService = ReturnType<typeof createGymWriteService>;
interface Context {
  db: typeof applicationDb; admin: string; service: GymService; staff: ReturnType<typeof createStaffingService>;
  gymInput: () => { gym_name: string; address: string };
  create: () => ReturnType<GymService['create']>;
  user: (role: string) => Promise<string>;
  request: (method: string, path: string, actor: string | null, body?: unknown) => Promise<{
    status: number; headers: Headers;
    body: { success: boolean; data: Record<string, unknown>; error: { code: string } };
  }>;
}
export const gymOnboardingCases = ({ db, admin, service, staff, gymInput, create, user, request }: Context): [string, () => Promise<void>][] => [
    ['Combined create returns one-time credential, forces password change and scopes Manager', async () => {
      const email = `${randomUUID()}@onboarding.test`;
      const response = await request('POST', '/gyms', admin, { ...gymInput(), manager: { email: ` ${email.toUpperCase()} `, full_name: ' New Manager ', phone: null } });
      assert.equal(response.status, 201); assert.equal(response.headers.get('cache-control'), 'no-store');
      const gymId = response.body.data.gym_id as string;
      const manager = response.body.data.manager as { user: UserSession; assignment: { gym_id: string; user_id: string; status: string }; temporary_password: string };
      assert.equal(manager.user.email, email); assert.equal(manager.user.must_change_password, true);
      assert.deepEqual(manager.user.roles, ['MANAGER']); assert.equal(manager.assignment.gym_id, gymId);
      assert.equal(manager.assignment.status, 'ACTIVE'); assert.equal(manager.assignment.user_id, manager.user.user_id);
      assert.ok(manager.temporary_password.length >= 32);
      assert.ok(!JSON.stringify(response.body).includes('password_hash'));
      const [stored] = await db.select().from(users).where(eq(users.userId, manager.user.user_id));
      assert.ok(stored.passwordHash.startsWith('$argon2id$')); assert.ok(await verify(stored.passwordHash, manager.temporary_password));
      assert.equal((await request('PATCH', `/gyms/${gymId}`, stored.userId, { address: 'Denied until password change' })).body.error.code, 'PASSWORD_CHANGE_REQUIRED');
      const auth = new AuthService(db);
      await auth.login({ email, password: manager.temporary_password });
      await auth.changePassword(stored.userId, { current_password: manager.temporary_password, new_password: `Next1!${randomUUID()}` });
      assert.equal((await request('PATCH', `/gyms/${gymId}`, stored.userId, { address: 'Local manager update' })).status, 200);
      const other = await create();
      assert.equal((await request('PATCH', `/gyms/${other.gymId}`, stored.userId, { address: 'Cross Gym' })).status, 403);
      const publicGym = await request('GET', `/gyms/${gymId}`, null);
      assert.ok(!('manager' in publicGym.body.data)); assert.ok(!JSON.stringify(publicGym.body).includes(manager.temporary_password));
      assert.ok(!JSON.stringify(await auth.getCurrentUser(stored.userId)).includes(manager.temporary_password));
      assert.ok(!JSON.stringify(await staff.listManagers(admin, gymId)).includes(manager.temporary_password));
    }],
    ['Duplicate identity rolls back Gym and all account side effects', async () => {
      const email = `${randomUUID()}@onboarding.test`;
      await service.create(admin, { ...gymInput(), manager: { email, full_name: 'First Manager', phone: '0901234567' } });
      const totals = async () => ({ gyms: (await db.select({ n: count() }).from(gyms))[0].n,
        users: (await db.select({ n: count() }).from(users))[0].n, grants: (await db.select({ n: count() }).from(userRoles))[0].n,
        assignments: (await db.select({ n: count() }).from(gymManagers))[0].n });
      const before = await totals();
      for (const [identity, code] of [[{ email, full_name: 'Duplicate' }, 'EMAIL_ALREADY_EXISTS'],
        [{ email: `${randomUUID()}@onboarding.test`, full_name: 'Duplicate', phone: '0901234567' }, 'PHONE_ALREADY_EXISTS']] as const) {
        const response = await request('POST', '/gyms', admin, { ...gymInput(), manager: identity });
        assert.equal(response.status, 409); assert.equal(response.body.error.code, code);
        assert.ok(!JSON.stringify(response.body).includes('temporary_password')); assert.deepEqual(await totals(), before);
      }
    }],
    ['Manager input strictly validated; PATCH and non-Admin creation cannot provision', async () => {
      const manager = { email: `${randomUUID()}@onboarding.test`, full_name: 'Manager' };
      const before = (await db.select({ n: count() }).from(gyms))[0].n;
      for (const identity of [null, {}, { ...manager, email: 'bad' }, { ...manager, full_name: 'x' },
        { ...manager, password: 'Injected1!' }, { ...manager, roles: ['ADMIN'] }, { ...manager, gym_id: randomUUID() },
        { ...manager, user_id: randomUUID() }, { ...manager, status: 'INACTIVE' }]) {
        assert.equal((await request('POST', '/gyms', admin, { ...gymInput(), manager: identity })).status, 400);
      }
      for (const role of ['MANAGER', 'CUSTOMER', 'PT']) assert.equal((await request('POST', '/gyms', await user(role), { ...gymInput(), manager })).status, 403);
      assert.equal((await request('POST', '/gyms', null, { ...gymInput(), manager })).status, 401);
      assert.equal((await db.select({ n: count() }).from(gyms))[0].n, before);
      const gym = await create();
      assert.equal((await request('PATCH', `/gyms/${gym.gymId}`, admin, { manager })).status, 400);
    }],
    ['A later assignment failure rolls back Gym/User/Profile/Role atomically', async () => {
      const counts = async () => Promise.all([gyms, users, userProfiles, userRoles, gymManagers].map(async table => (await db.select({ n: count() }).from(table))[0].n));
      const before = await counts();
      // Test-only trigger injects a failure after User/Profile/Role have already been inserted.
      await db.execute(sql`CREATE FUNCTION test_onboarding_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Injected assignment failure'; END; $$`);
      await db.execute(sql`CREATE TRIGGER test_onboarding_failure BEFORE INSERT ON gym_managers FOR EACH ROW EXECUTE FUNCTION test_onboarding_failure()`);
      try {
        const response = await request('POST', '/gyms', admin, { ...gymInput(), manager: { email: `${randomUUID()}@onboarding.test`, full_name: 'Atomic Manager' } });
        assert.equal(response.status, 500); assert.equal(response.body.error.code, 'INTERNAL_SERVER_ERROR');
        assert.ok(!JSON.stringify(response.body).includes('Injected')); assert.ok(!JSON.stringify(response.body).includes('temporary_password'));
        assert.deepEqual(await counts(), before);
      } finally {
        await db.execute(sql`DROP TRIGGER test_onboarding_failure ON gym_managers`);
        await db.execute(sql`DROP FUNCTION test_onboarding_failure()`);
      }
    }],
    ['Concurrent combined creates with same email commit only one Gym/Manager', async () => {
      const manager = { email: `${randomUUID()}@onboarding.test`, full_name: 'Concurrent Manager' };
      const before = (await db.select({ n: count() }).from(gyms))[0].n;
      const responses = await Promise.all([request('POST', '/gyms', admin, { ...gymInput(), manager }), request('POST', '/gyms', admin, { ...gymInput(), manager })]);
      assert.deepEqual(responses.map(r => r.status).sort(), [201, 409]);
      assert.equal((await db.select({ n: count() }).from(gyms))[0].n, before + 1);
      const [stored] = await db.select().from(users).where(eq(users.email, manager.email));
      assert.equal((await db.select().from(gymManagers).where(eq(gymManagers.userId, stored.userId))).length, 1);
    }],
];
