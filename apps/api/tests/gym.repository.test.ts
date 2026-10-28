import { createIsolatedCases } from './isolated-cases.js';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { db as appDb } from '../src/database/index.js';
import { gyms, gymManagers, gymTrainers, users, roles, userRoles } from '../src/database/schema/index.js';
import { createGymRepository } from '../src/repositories/gym.repository.js';
import { createUserRepository } from '../src/repositories/user.repository.js';

// Called only by the database harness, against its disposable database.
export const testGymRepository = async (database: typeof appDb) => {
  const gymRepository = createGymRepository(database);
  const userRepository = createUserRepository(database);
  const [gymA, gymB] = await database.insert(gyms).values([
    { gymName: 'Repository Gym A', address: 'A' },
    { gymName: 'Repository Gym B', address: 'B' },
  ]).returning();
  const [manager, trainer, outsider] = await database.insert(users).values(
    ['manager', 'trainer', 'outsider'].map((name) => ({
      email: `${name}-${randomUUID()}@repository.test`, passwordHash: 'test-only',
    })),
  ).returning();
  const [managerAssignment] = await database.insert(gymManagers).values({
    userId: manager.userId, gymId: gymA.gymId,
  }).returning();
  const [trainerAssignment] = await database.insert(gymTrainers).values({
    userId: trainer.userId, gymId: gymA.gymId, availability: 'NOT_ACCEPTING',
  }).returning();

  const { check, runCases } = createIsolatedCases(database, 'repository');

  await check('find existing gym without an actor or assignment', async () => {
    assert.deepEqual(await gymRepository.findById(gymB.gymId), gymB);
  });
  await check('missing gym returns null', async () => {
    assert.equal(await gymRepository.findById(randomUUID()), null);
  });
  await check('inactive gym remains readable', async () => {
    await database.update(gyms).set({ status: 'INACTIVE' }).where(eq(gyms.gymId, gymB.gymId));
    assert.equal((await gymRepository.findById(gymB.gymId))?.status, 'INACTIVE');
  });
  await check('active manager assignment matches user and gym', async () => {
    assert.deepEqual(await gymRepository.findActiveManagerAssignment(manager.userId, gymA.gymId), managerAssignment);
  });
  await check('manager assignment cannot leak across gyms or users', async () => {
    assert.equal(await gymRepository.findActiveManagerAssignment(manager.userId, gymB.gymId), null);
    assert.equal(await gymRepository.findActiveManagerAssignment(outsider.userId, gymA.gymId), null);
  });
  await check('deactivated manager assignment returns null and remains stored', async () => {
    await database.update(gymManagers).set({ status: 'INACTIVE' })
      .where(eq(gymManagers.gymManagerId, managerAssignment.gymManagerId));
    assert.equal(await gymRepository.findActiveManagerAssignment(manager.userId, gymA.gymId), null);
    const [stored] = await database.select().from(gymManagers)
      .where(eq(gymManagers.gymManagerId, managerAssignment.gymManagerId));
    assert.equal(stored.status, 'INACTIVE');
  });
  await check('active trainer is returned even when NOT_ACCEPTING', async () => {
    assert.deepEqual(await gymRepository.findActiveTrainerAssignment(trainer.userId, gymA.gymId), trainerAssignment);
  });
  await check('trainer assignment cannot leak across gyms or users', async () => {
    assert.equal(await gymRepository.findActiveTrainerAssignment(trainer.userId, gymB.gymId), null);
    assert.equal(await gymRepository.findActiveTrainerAssignment(outsider.userId, gymA.gymId), null);
  });
  await check('trainer with multiple gyms gets the requested assignment', async () => {
    const [second] = await database.insert(gymTrainers).values({
      userId: trainer.userId, gymId: gymB.gymId, availability: 'ACCEPTING',
    }).returning();
    assert.deepEqual(await gymRepository.findActiveTrainerAssignment(trainer.userId, gymB.gymId), second);
    assert.deepEqual(await gymRepository.findActiveTrainerAssignment(trainer.userId, gymA.gymId), trainerAssignment);
  });
  await check('inactive trainer is excluded even when ACCEPTING', async () => {
    await database.update(gymTrainers).set({ status: 'INACTIVE', availability: 'ACCEPTING' })
      .where(eq(gymTrainers.gymTrainerId, trainerAssignment.gymTrainerId));
    assert.equal(await gymRepository.findActiveTrainerAssignment(trainer.userId, gymA.gymId), null);
    const [stored] = await database.select().from(gymTrainers)
      .where(eq(gymTrainers.gymTrainerId, trainerAssignment.gymTrainerId));
    assert.equal(stored.status, 'INACTIVE');
  });
  await check('roles reflect current database grants and revocations', async () => {
    assert.deepEqual(await userRepository.findCurrentUserRoles(manager.userId), []);
    await database.insert(roles).values([{ roleName: 'MANAGER' }, { roleName: 'PT' }]).onConflictDoNothing();
    const [managerRole] = await database.select().from(roles).where(eq(roles.roleName, 'MANAGER'));
    const [ptRole] = await database.select().from(roles).where(eq(roles.roleName, 'PT'));
    await database.insert(userRoles).values([
      { userId: manager.userId, roleId: managerRole.roleId },
      { userId: manager.userId, roleId: ptRole.roleId },
      { userId: outsider.userId, roleId: ptRole.roleId },
    ]);
    assert.deepEqual(await userRepository.findCurrentUserRoles(manager.userId), ['MANAGER', 'PT']);
    await database.delete(userRoles).where(eq(userRoles.userId, manager.userId));
    assert.deepEqual(await userRepository.findCurrentUserRoles(manager.userId), []);
    assert.deepEqual(await userRepository.findCurrentUserRoles(outsider.userId), ['PT']);
    assert.deepEqual(await userRepository.findCurrentUserRoles(randomUUID()), []);
  });
  await check('role alone does not produce manager or trainer assignments', async () => {
    await database.insert(roles).values({ roleName: 'PT' }).onConflictDoNothing();
    const [ptRole] = await database.select().from(roles).where(eq(roles.roleName, 'PT'));
    await database.insert(userRoles).values({ userId: outsider.userId, roleId: ptRole.roleId });
    assert.deepEqual(await userRepository.findCurrentUserRoles(outsider.userId), ['PT']);
    assert.equal(await gymRepository.findActiveTrainerAssignment(outsider.userId, gymA.gymId), null);
    assert.equal(await gymRepository.findActiveManagerAssignment(outsider.userId, gymA.gymId), null);
  });
  await check('account state is current, unfiltered and excludes credentials', async () => {
    assert.deepEqual(await userRepository.findAccountState(manager.userId), {
      userId: manager.userId, status: 'ACTIVE', mustChangePassword: false,
    });
    for (const status of ['SUSPENDED', 'INACTIVE']) {
      await database.update(users).set({ status, mustChangePassword: true }).where(eq(users.userId, manager.userId));
      assert.deepEqual(await userRepository.findAccountState(manager.userId), {
        userId: manager.userId, status, mustChangePassword: true,
      });
    }
    assert.equal(await userRepository.findAccountState(randomUUID()), null);
  });
  return runCases();
};
