import { randomBytes } from 'node:crypto';
import { hash, Algorithm } from '@node-rs/argon2';
import { db } from '../database/index.js';
import { createStaffingRepository } from '../repositories/staffing.repository.js';
import { createGymScopeService } from './gym-scope.service.js';
import { AuthService } from './auth.service.js';
import { AppError, AccountDeactivatedError } from '../utils/errors.js';
import { managerProvisionSchema, trainerProvisionSchema, managerAssignSchema,
  type ManagerProvisionInput, type TrainerProvisionInput } from '../validators/staffing.validator.js';

import { staffingDatabaseError } from './staffing-errors.js';
import { sql } from 'drizzle-orm';

export const createStaffingService = (database: typeof db = db) => {
  const transact = async <T>(gymId: string, run: (repo: ReturnType<typeof createStaffingRepository>,
    tx: Parameters<Parameters<typeof database.transaction>[0]>[0]) => Promise<T>) => {
    try { return await database.transaction(async (tx) => {
      await tx.execute(sql`SELECT gym_id FROM gyms WHERE gym_id = ${gymId} FOR NO KEY UPDATE`);
      return run(createStaffingRepository(tx), tx);
    }); }
    catch (error) { return staffingDatabaseError(error); }
  };
  const provision = async (actorId: string, gymId: string, role: 'MANAGER' | 'PT', input: TrainerProvisionInput) => {
    // Preliminary authorization avoids expensive hashing for unauthorized callers.
    await transact(gymId, async (repo) => createGymScopeService(repo, repo)
      .requireInternalScope(actorId, gymId, role === 'MANAGER' ? ['ADMIN'] : ['ADMIN', 'MANAGER']));
    const temporaryPassword = `Aa1!${randomBytes(24).toString('base64url')}`;
    const passwordHash = await hash(temporaryPassword, { algorithm: Algorithm.Argon2id,
      memoryCost: 65536, timeCost: 3, parallelism: 4, outputLen: 32 });
    return transact(gymId, async (repo, tx) => {
      // Recheck and lock current authorization inside the actual write transaction.
      await createGymScopeService(repo, repo).requireInternalScope(actorId, gymId,
        role === 'MANAGER' ? ['ADMIN'] : ['ADMIN', 'MANAGER']);
      const targetRole = await repo.findRole(role);
      if (!targetRole) throw new AppError(500, 'INTERNAL_SERVER_ERROR', 'Thiếu cấu hình role.');
      const user = await repo.createAccount(input, passwordHash, targetRole.roleId);
      const assignment = role === 'MANAGER' ? await repo.createManager(gymId, user.userId)
        : await repo.createTrainer(gymId, user.userId, input);
      const session = await new AuthService(tx).getCurrentUser(user.userId);
      return { user: session, assignment, temporary_password: temporaryPassword };
    });
  };
  return {
    provisionManager: (actorId: string, input: ManagerProvisionInput) => {
      const parsed = managerProvisionSchema.parse(input);
      return provision(actorId, parsed.gym_id, 'MANAGER', parsed);
    },
    provisionTrainer: (actorId: string, gymId: string, input: TrainerProvisionInput) =>
      provision(actorId, gymId, 'PT', trainerProvisionSchema.parse(input)),
    assignManager: (actorId: string, gymId: string, userId: string) => {
      managerAssignSchema.parse({ user_id: userId });
      return transact(gymId, async (repo) => {
        await createGymScopeService(repo, repo).requireInternalScope(actorId, gymId, ['ADMIN']);
        const target = await repo.findAccountState(userId);
        if (!target) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy User.');
        if (target.status !== 'ACTIVE') throw new AccountDeactivatedError();
        if (!(await repo.findCurrentUserRoles(userId)).includes('MANAGER')) {
          throw new AppError(403, 'INSUFFICIENT_ROLE', 'User chưa có role MANAGER.');
        }
        const existing = await repo.findManagerPair(gymId, userId);
        if (existing?.status === 'ACTIVE') throw new AppError(409, 'ASSIGNMENT_ALREADY_EXISTS', 'Phân công đã ACTIVE.');
        return existing ? repo.reactivateManager(existing.gymManagerId) : repo.createManager(gymId, userId);
      });
    },
    listManagers: (actorId: string, gymId: string) => transact(gymId, async (repo) => {
      await createGymScopeService(repo, repo).requireInternalScope(actorId, gymId, ['ADMIN', 'MANAGER']);
      return repo.listManagers(gymId);
    }),
    revokeManager: (actorId: string, gymId: string, id: string) => transact(gymId, async (repo) => {
      await createGymScopeService(repo, repo).requireInternalScope(actorId, gymId, ['ADMIN']);
      const assignment = await repo.findManager(gymId, id);
      if (!assignment) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy phân công.');
      if (assignment.status !== 'ACTIVE') throw new AppError(409, 'INVALID_STATUS_TRANSITION', 'Phân công đã INACTIVE.');
      return repo.revokeManager(id);
    }),
  };
};
export const staffingService = createStaffingService();
