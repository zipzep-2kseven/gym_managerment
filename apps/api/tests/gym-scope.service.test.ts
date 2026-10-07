import { createIsolatedCases } from './isolated-cases.js';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import type { db as appDb } from '../src/database/index.js';
import { gyms, gymManagers, gymTrainers, users, roles, userRoles } from '../src/database/schema/index.js';
import { createGymRepository } from '../src/repositories/gym.repository.js';
import { createUserRepository } from '../src/repositories/user.repository.js';
import { createGymScopeService } from '../src/services/gym-scope.service.js';
import { AppError } from '../src/utils/errors.js';

// Invoked by the existing harness only against its disposable database.
export const testGymScopeService = async (database: typeof appDb) => {
  const userRepository = createUserRepository(database);
  const gymRepository = createGymRepository(database);
  const service = createGymScopeService(userRepository, gymRepository);
  const [gymA, gymB] = await database.insert(gyms).values([
    { gymName: 'Scope A', address: 'A' }, { gymName: 'Scope B', address: 'B' },
  ]).returning();
  const [manager, trainer, admin, customer, unassigned] = await database.insert(users).values(
    Array.from({ length: 5 }, () => ({ email: `${randomUUID()}@scope.test`, passwordHash: 'test-only' })),
  ).returning();
  await database.insert(roles).values(
    ['ADMIN', 'MANAGER', 'PT', 'CUSTOMER'].map((roleName) => ({ roleName })),
  ).onConflictDoNothing();
  const roleRows = await database.select().from(roles);
  const roleId = (name: string) => roleRows.find((role) => role.roleName === name)!.roleId;
  await database.insert(userRoles).values([
    { userId: manager.userId, roleId: roleId('MANAGER') },
    { userId: trainer.userId, roleId: roleId('PT') },
    { userId: admin.userId, roleId: roleId('ADMIN') },
    { userId: customer.userId, roleId: roleId('CUSTOMER') },
    { userId: unassigned.userId, roleId: roleId('MANAGER') },
  ]);
  const [managerAssignment] = await database.insert(gymManagers).values({
    userId: manager.userId, gymId: gymA.gymId,
  }).returning();
  const [trainerAssignment] = await database.insert(gymTrainers).values({
    userId: trainer.userId, gymId: gymA.gymId, availability: 'NOT_ACCEPTING',
  }).returning();
  const { check, runCases } = createIsolatedCases(database, 'scope');
  const denied = async (result: Promise<unknown>, code: string, status: number, reason?: string) => {
    await assert.rejects(result, (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.code, code); assert.equal(error.statusCode, status);
      if (reason) assert.deepEqual(error.details, { reason });
      return true;
    });
  };
  const internal = (userId: string, gymId = gymA.gymId) => service.requireInternalScope(userId, gymId);
  await check('manager with current role and active assignment is allowed', async () => {
    assert.deepEqual(await internal(manager.userId), {
      access: 'INTERNAL', userId: manager.userId, gymId: gymA.gymId,
      gymStatus: 'ACTIVE', role: 'MANAGER', assignmentId: managerAssignment.gymManagerId,
    });
  });
  await check('manager wrong gym and missing assignment are denied', async () => {
    for (const result of [() => internal(manager.userId, gymB.gymId), () => internal(unassigned.userId)]) {
      await denied(result(), 'GYM_SCOPE_FORBIDDEN', 403, 'ASSIGNMENT_MISSING_OR_INACTIVE');
    }
  });
  await check('revoked database role overrides stale JWT roles with active assignment', async () => {
    const staleIdentity = { userId: manager.userId, roles: ['MANAGER'] };
    await database.delete(userRoles).where(eq(userRoles.userId, manager.userId));
    await database.insert(userRoles).values({ userId: manager.userId, roleId: roleId('CUSTOMER') });
    await denied(internal(staleIdentity.userId), 'INSUFFICIENT_ROLE', 403);
    await database.insert(userRoles).values({ userId: manager.userId, roleId: roleId('MANAGER') });
  });
  await check('inactive manager assignment overrides stale session projection', async () => {
    const staleSession = { userId: manager.userId, active_gym_assignments: [managerAssignment] };
    await database.update(gymManagers).set({ status: 'INACTIVE' })
      .where(eq(gymManagers.gymManagerId, managerAssignment.gymManagerId));
    await denied(internal(staleSession.userId), 'GYM_SCOPE_FORBIDDEN', 403);
    await database.update(gymManagers).set({ status: 'ACTIVE' })
      .where(eq(gymManagers.gymManagerId, managerAssignment.gymManagerId));
  });
  await check('PT active assignment allows every availability value', async () => {
    for (const availability of ['ACCEPTING', 'ALMOST_FULL', 'NOT_ACCEPTING']) {
      await database.update(gymTrainers).set({ availability })
        .where(eq(gymTrainers.gymTrainerId, trainerAssignment.gymTrainerId));
      const scope = await internal(trainer.userId);
      assert.equal(scope.role, 'PT'); assert.equal(scope.assignmentId, trainerAssignment.gymTrainerId);
    }
  });
  await check('PT wrong gym or inactive assignment is denied', async () => {
    await denied(internal(trainer.userId, gymB.gymId), 'GYM_SCOPE_FORBIDDEN', 403);
    await database.update(gymTrainers).set({ status: 'INACTIVE' })
      .where(eq(gymTrainers.gymTrainerId, trainerAssignment.gymTrainerId));
    await denied(internal(trainer.userId), 'GYM_SCOPE_FORBIDDEN', 403);
    await database.update(gymTrainers).set({ status: 'ACTIVE' })
      .where(eq(gymTrainers.gymTrainerId, trainerAssignment.gymTrainerId));
  });
  await check('customer and roleless accounts have no internal scope', async () => {
    await denied(internal(customer.userId), 'INSUFFICIENT_ROLE', 403);
    await database.delete(userRoles).where(eq(userRoles.userId, unassigned.userId));
    await denied(internal(unassigned.userId), 'INSUFFICIENT_ROLE', 403);
  });
  await check('inactive and suspended accounts stop before role/gym/assignment queries', async () => {
    const fail = async (): Promise<never> => { throw new Error('Unexpected downstream query'); };
    const guarded = createGymScopeService({ ...userRepository, findCurrentUserRoles: fail }, {
      findById: fail, findActiveManagerAssignment: fail, findActiveTrainerAssignment: fail,
    });
    for (const status of ['INACTIVE', 'SUSPENDED']) {
      await database.update(users).set({ status }).where(eq(users.userId, manager.userId));
      await denied(guarded.requireInternalScope(manager.userId, gymA.gymId), 'ACCOUNT_DEACTIVATED', 403);
    }
    await database.update(users).set({ status: 'ACTIVE' }).where(eq(users.userId, manager.userId));
    await denied(guarded.requireInternalScope(randomUUID(), gymA.gymId), 'UNAUTHORIZED', 401);
    await database.update(users).set({ mustChangePassword: true }).where(eq(users.userId, manager.userId));
    await denied(guarded.requireInternalScope(manager.userId, gymA.gymId), 'PASSWORD_CHANGE_REQUIRED', 403);
    await database.update(users).set({ mustChangePassword: false }).where(eq(users.userId, manager.userId));
  });
  await check('missing gym is denied even for admin', async () => {
    await denied(internal(admin.userId, randomUUID()), 'NOT_FOUND', 404);
  });
  await check('admin has system scope without assignment but obeys account restrictions', async () => {
    for (const gymId of [gymA.gymId, gymB.gymId]) assert.equal((await internal(admin.userId, gymId)).role, 'ADMIN');
    await database.update(users).set({ mustChangePassword: true }).where(eq(users.userId, admin.userId));
    await denied(internal(admin.userId), 'PASSWORD_CHANGE_REQUIRED', 403);
    await database.update(users).set({ mustChangePassword: false }).where(eq(users.userId, admin.userId));
  });
  await check('operation role policy rejects PT management access and empty policy', async () => {
    await denied(service.requireInternalScope(trainer.userId, gymA.gymId, ['ADMIN', 'MANAGER']),
      'GYM_SCOPE_FORBIDDEN', 403, 'INSUFFICIENT_SCOPE');
    await denied(service.requireInternalScope(admin.userId, gymA.gymId, []), 'GYM_SCOPE_FORBIDDEN', 403);
  });
  await check('multiple roles fall back to an assigned eligible role', async () => {
    await database.insert(userRoles).values({ userId: trainer.userId, roleId: roleId('MANAGER') });
    assert.equal((await internal(trainer.userId)).role, 'PT');
    await denied(service.requireInternalScope(trainer.userId, gymA.gymId, ['MANAGER']), 'GYM_SCOPE_FORBIDDEN', 403);
    await database.delete(userRoles).where(and(eq(userRoles.userId, trainer.userId), eq(userRoles.roleId, roleId('MANAGER'))));
  });
  await check('public scope requires no identity, roles or assignments', async () => {
    const fail = async (): Promise<never> => { throw new Error('Unexpected identity/assignment query'); };
    const publicService = createGymScopeService({ findAccountState: fail, findCurrentUserRoles: fail }, {
      ...gymRepository, findActiveManagerAssignment: fail, findActiveTrainerAssignment: fail,
    });
    assert.deepEqual(await publicService.requirePublicScope(gymB.gymId), {
      access: 'PUBLIC', userId: null, gymId: gymB.gymId, role: null,
    });
    await denied(publicService.requirePublicScope(randomUUID()), 'NOT_FOUND', 404);
  });
  await check('inactive gym is hidden publicly; internal scope exposes state for operation policy', async () => {
    await database.update(gyms).set({ status: 'INACTIVE' }).where(eq(gyms.gymId, gymA.gymId));
    await denied(service.requirePublicScope(gymA.gymId), 'NOT_FOUND', 404);
    assert.equal((await internal(admin.userId)).gymStatus, 'INACTIVE');
    assert.equal((await internal(manager.userId)).gymStatus, 'INACTIVE');
  });
  await check('repository failures propagate without granting scope', async () => {
    const failure = new Error('Database unavailable');
    const broken = createGymScopeService({ ...userRepository, findCurrentUserRoles: async () => { throw failure; } }, gymRepository);
    await assert.rejects(broken.requireInternalScope(admin.userId, gymA.gymId), (error) => error === failure);
  });
  return runCases();
};
