import { createIsolatedCases } from './isolated-cases.js';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { Request, Response } from 'express';
import { and, eq } from 'drizzle-orm';
import type { db as appDb } from '../src/database/index.js';
import { gyms, gymManagers, gymTrainers, users, roles, userRoles } from '../src/database/schema/index.js';
import { createGymRepository } from '../src/repositories/gym.repository.js';
import { createUserRepository } from '../src/repositories/user.repository.js';
import { createGymScopeService, type GymScopeRole } from '../src/services/gym-scope.service.js';
import { authenticate } from '../src/middleware/auth.middleware.js';
import { signJwt } from '../src/utils/jwt.js';
import { config } from '../src/config/index.js';
import { AppError } from '../src/utils/errors.js';

// Runs only on the existing harness's disposable database. No routes are mounted.
export const testGymScopeIntegration = async (database: typeof appDb) => {
  const service = createGymScopeService(createUserRepository(database), createGymRepository(database));
  const [gymA, gymB, gymC] = await database.insert(gyms).values(
    ['A', 'B', 'C'].map((name) => ({ gymName: `Integration ${name}`, address: name })),
  ).returning();
  const [actor, admin, customer, unassigned] = await database.insert(users).values(
    Array.from({ length: 4 }, () => ({ email: `${randomUUID()}@integration.test`, passwordHash: 'test-only' })),
  ).returning();
  await database.insert(roles).values(
    ['MANAGER', 'PT', 'ADMIN', 'CUSTOMER'].map((roleName) => ({ roleName })),
  ).onConflictDoNothing();
  const roleRows = await database.select().from(roles);
  const roleId = (name: string) => roleRows.find((role) => role.roleName === name)!.roleId;
  await database.insert(userRoles).values([
    { userId: actor.userId, roleId: roleId('MANAGER') },
    { userId: actor.userId, roleId: roleId('PT') },
    { userId: admin.userId, roleId: roleId('ADMIN') },
    { userId: customer.userId, roleId: roleId('CUSTOMER') },
    { userId: unassigned.userId, roleId: roleId('MANAGER') },
    { userId: unassigned.userId, roleId: roleId('PT') },
  ]);
  const [manager] = await database.insert(gymManagers).values({ userId: actor.userId, gymId: gymA.gymId }).returning();
  const [trainer] = await database.insert(gymTrainers).values({ userId: actor.userId, gymId: gymB.gymId }).returning();
  const token = signJwt({ sub: actor.userId, email: actor.email, roles: ['MANAGER', 'PT'] });
  const adminToken = signJwt({ sub: admin.userId, email: admin.email, roles: ['ADMIN'] });
  const identity = async (cookie?: string) => {
    const request: Partial<Request> = { cookies: { [config.cookie.name]: cookie } };
    await new Promise<void>((resolve, reject) => {
      authenticate(request as Request, {} as Response, (error?: unknown) => error ? reject(error) : resolve());
    });
    assert.ok(request.user);
    return request.user;
  };
  // Reuse tokens and service after real SQL updates visible on the test connection.
  // Each case is rolled back by the harness; this does not test concurrent sessions.
  const access = async (cookie: string, gymId: string, policy?: readonly GymScopeRole[]) => {
    const actorIdentity = await identity(cookie);
    return service.requireInternalScope(actorIdentity.userId, gymId, policy);
  };
  const deny = async (result: Promise<unknown>, code: string, statusCode = 403) => {
    await assert.rejects(result, (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.code, code); assert.equal(error.statusCode, statusCode);
      return true;
    });
  };
  const { check, runCases } = createIsolatedCases(database, 'integration');
  await check('authenticated multi-role identity is isolated across three gyms and operation policies', async () => {
    assert.equal((await access(token, gymA.gymId)).assignmentId, manager.gymManagerId);
    assert.equal((await access(token, gymB.gymId)).assignmentId, trainer.gymTrainerId);
    await deny(access(token, gymC.gymId), 'GYM_SCOPE_FORBIDDEN');
    await deny(access(token, gymB.gymId, ['ADMIN', 'MANAGER']), 'GYM_SCOPE_FORBIDDEN');
    await deny(access(token, gymA.gymId, ['PT']), 'GYM_SCOPE_FORBIDDEN');
    assert.equal((await access(token, gymB.gymId, ['PT'])).role, 'PT');
  });
  await check('revoking each role takes effect despite an unchanged valid JWT', async () => {
    for (const [role, gymId] of [['MANAGER', gymA.gymId], ['PT', gymB.gymId]] as const) {
      assert.equal((await access(token, gymId)).role, role);
      await database.delete(userRoles).where(and(eq(userRoles.userId, actor.userId), eq(userRoles.roleId, roleId(role))));
      assert.ok((await identity(token)).roles.includes(role));
      await deny(access(token, gymId), 'GYM_SCOPE_FORBIDDEN');
      await database.insert(userRoles).values({ userId: actor.userId, roleId: roleId(role) });
      assert.equal((await access(token, gymId)).role, role);
    }
  });
  await check('assignment revocation and restoration are observed on the next authenticated call', async () => {
    assert.equal((await access(token, gymA.gymId)).role, 'MANAGER');
    await database.update(gymManagers).set({ status: 'INACTIVE' }).where(eq(gymManagers.gymManagerId, manager.gymManagerId));
    await deny(access(token, gymA.gymId), 'GYM_SCOPE_FORBIDDEN');
    assert.equal((await access(token, gymB.gymId)).role, 'PT');
    await database.update(gymManagers).set({ status: 'ACTIVE' }).where(eq(gymManagers.gymManagerId, manager.gymManagerId));
    assert.equal((await access(token, gymA.gymId)).role, 'MANAGER');
    await database.update(gymTrainers).set({ status: 'INACTIVE' }).where(eq(gymTrainers.gymTrainerId, trainer.gymTrainerId));
    await deny(access(token, gymB.gymId), 'GYM_SCOPE_FORBIDDEN');
    await database.update(gymTrainers).set({ status: 'ACTIVE' }).where(eq(gymTrainers.gymTrainerId, trainer.gymTrainerId));
    assert.equal((await access(token, gymB.gymId)).role, 'PT');
  });
  await check('account suspension, deactivation and password restriction invalidate subsequent access', async () => {
    for (const [user, cookie] of [[actor, token], [admin, adminToken]] as const) {
      for (const status of ['INACTIVE', 'SUSPENDED']) {
        await access(cookie, gymA.gymId);
        await database.update(users).set({ status }).where(eq(users.userId, user.userId));
        assert.equal((await identity(cookie)).userId, user.userId);
        await deny(access(cookie, gymA.gymId), 'ACCOUNT_DEACTIVATED');
        await database.update(users).set({ status: 'ACTIVE' }).where(eq(users.userId, user.userId));
        await access(cookie, gymA.gymId);
      }
      await database.update(users).set({ mustChangePassword: true }).where(eq(users.userId, user.userId));
      await deny(access(cookie, gymA.gymId), 'PASSWORD_CHANGE_REQUIRED');
      await database.update(users).set({ mustChangePassword: false }).where(eq(users.userId, user.userId));
      await access(cookie, gymA.gymId);
    }
  });
  await check('admin role revocation removes system scope while JWT still claims ADMIN', async () => {
    assert.equal((await access(adminToken, gymC.gymId)).role, 'ADMIN');
    await database.delete(userRoles).where(eq(userRoles.userId, admin.userId));
    assert.deepEqual((await identity(adminToken)).roles, ['ADMIN']);
    await deny(access(adminToken, gymC.gymId), 'INSUFFICIENT_ROLE');
    await database.insert(userRoles).values({ userId: admin.userId, roleId: roleId('ADMIN') });
    assert.equal((await access(adminToken, gymC.gymId)).role, 'ADMIN');
  });
  await check('public scope neither grants internal access nor caches gym visibility', async () => {
    assert.equal((await service.requirePublicScope(gymC.gymId)).access, 'PUBLIC');
    await deny(access(token, gymC.gymId), 'GYM_SCOPE_FORBIDDEN');
    await database.update(gyms).set({ status: 'INACTIVE' }).where(eq(gyms.gymId, gymC.gymId));
    await deny(service.requirePublicScope(gymC.gymId), 'NOT_FOUND', 404);
    await database.update(gyms).set({ status: 'ACTIVE' }).where(eq(gyms.gymId, gymC.gymId));
    assert.equal((await service.requirePublicScope(gymC.gymId)).access, 'PUBLIC');
    await database.delete(gyms).where(eq(gyms.gymId, gymC.gymId));
    await deny(service.requirePublicScope(gymC.gymId), 'NOT_FOUND', 404);
    await deny(access(adminToken, gymC.gymId), 'NOT_FOUND', 404);
  });
  await check('deleted account cannot retain access with an otherwise valid JWT', async () => {
    await access(adminToken, gymA.gymId);
    await database.delete(users).where(eq(users.userId, admin.userId));
    assert.equal((await identity(adminToken)).userId, admin.userId);
    await deny(access(adminToken, gymA.gymId), 'UNAUTHORIZED', 401);
  });
  await check('missing or invalid authentication cannot supply an internal actor', async () => {
    await deny(identity(), 'UNAUTHORIZED', 401);
    await deny(access('invalid-token', gymA.gymId), 'UNAUTHORIZED', 401);
  });
  await check('authenticated customer cannot obtain internal scope', async () => {
    const customerToken = signJwt({ sub: customer.userId, email: customer.email, roles: ['CUSTOMER'] });
    assert.equal((await identity(customerToken)).userId, customer.userId);
    await deny(access(customerToken, gymA.gymId), 'INSUFFICIENT_ROLE');
  });
  await check('validly signed JWT without a subject cannot supply an actor', async () => {
    const missingSubject = jwt.sign({ email: actor.email, roles: ['MANAGER'] }, config.jwt.secret, { expiresIn: '1h' });
    const decoded = jwt.verify(missingSubject, config.jwt.secret);
    assert.ok(typeof decoded !== 'string');
    assert.equal(Object.hasOwn(decoded, 'sub'), false);
    await deny(access(missingSubject, gymA.gymId), 'UNAUTHORIZED', 401);
  });
  await check('valid JWT for a nonexistent subject cannot obtain scope', async () => {
    const userId = randomUUID();
    const unknownToken = signJwt({ sub: userId, email: 'unknown@integration.test', roles: ['ADMIN'] });
    assert.equal((await identity(unknownToken)).userId, userId);
    await deny(access(unknownToken, gymA.gymId), 'UNAUTHORIZED', 401);
  });
  await check('active PT keeps scope through all availability states; inactive assignment denies it', async () => {
    for (const availability of ['ACCEPTING', 'ALMOST_FULL', 'NOT_ACCEPTING']) {
      const [assignment] = await database.update(gymTrainers).set({ availability })
        .where(eq(gymTrainers.gymTrainerId, trainer.gymTrainerId)).returning();
      assert.equal(assignment.status, 'ACTIVE');
      assert.equal(assignment.availability, availability);
      const scope = await access(token, gymB.gymId, ['PT']);
      assert.equal(scope.role, 'PT');
      assert.equal(scope.assignmentId, trainer.gymTrainerId);
    }
    await database.update(gymTrainers).set({ status: 'INACTIVE', availability: 'ACCEPTING' })
      .where(eq(gymTrainers.gymTrainerId, trainer.gymTrainerId));
    await deny(access(token, gymB.gymId, ['PT']), 'GYM_SCOPE_FORBIDDEN');
  });
  await check('internal scope exposes active and inactive Gym state without granting every operation', async () => {
    for (const [gym, role, assignmentId] of [
      [gymA, 'MANAGER', manager.gymManagerId], [gymB, 'PT', trainer.gymTrainerId],
    ] as const) {
      for (const status of ['ACTIVE', 'INACTIVE']) {
        await database.update(gyms).set({ status }).where(eq(gyms.gymId, gym.gymId));
        const scope = await access(token, gym.gymId, [role]);
        assert.equal(scope.gymStatus, status);
        assert.equal(scope.assignmentId, assignmentId);
        assert.equal(scope.role, role);
        assert.equal((await access(adminToken, gym.gymId)).gymStatus, status);
      }
    }
  });
  await check('deleted assigned gyms and nonexistent gyms reject public and authenticated access', async () => {
    await access(token, gymA.gymId, ['MANAGER']);
    await access(token, gymB.gymId, ['PT']);
    // FK RESTRICT forbids a dangling assignment: remove it before deleting Gym.
    // The JWT and the previously read assignment objects deliberately stay unchanged.
    await database.delete(gymManagers).where(eq(gymManagers.gymManagerId, manager.gymManagerId));
    await database.delete(gymTrainers).where(eq(gymTrainers.gymTrainerId, trainer.gymTrainerId));
    for (const gym of [gymA, gymB]) {
      await database.delete(gyms).where(eq(gyms.gymId, gym.gymId));
    }
    for (const gymId of [manager.gymId, trainer.gymId, randomUUID()]) {
      await deny(service.requirePublicScope(gymId), 'NOT_FOUND', 404);
      await deny(access(token, gymId), 'NOT_FOUND', 404);
      await deny(access(adminToken, gymId), 'NOT_FOUND', 404);
    }
  });
  await check('assignments of another user cannot grant scope to an authenticated unassigned actor', async () => {
    const unassignedToken = signJwt({ sub: unassigned.userId, email: unassigned.email, roles: ['MANAGER', 'PT'] });
    await deny(access(unassignedToken, gymA.gymId, ['MANAGER']), 'GYM_SCOPE_FORBIDDEN');
    await deny(access(unassignedToken, gymB.gymId, ['PT']), 'GYM_SCOPE_FORBIDDEN');
    assert.equal((await access(token, gymA.gymId)).assignmentId, manager.gymManagerId);
    assert.equal((await access(token, gymB.gymId)).assignmentId, trainer.gymTrainerId);
  });
  return runCases();
};
