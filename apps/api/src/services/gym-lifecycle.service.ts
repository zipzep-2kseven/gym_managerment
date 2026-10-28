import { db } from '../database/index.js';
import { createGymLifecycleRepository } from '../repositories/gym-lifecycle.repository.js';
import { createStaffingRepository } from '../repositories/staffing.repository.js';
import { createGymScopeService } from './gym-scope.service.js';
import { staffingDatabaseError } from './staffing-errors.js';
import { AppError, AccountDeactivatedError } from '../utils/errors.js';
import { lifecycleStatusSchema, trainerAssignSchema, type TrainerAssignInput } from '../validators/gym-lifecycle.validator.js';

export const createGymLifecycleService = (database: typeof db = db) => {
  const transact = async <T>(gymId: string, run: (lifecycle: ReturnType<typeof createGymLifecycleRepository>,
    staff: ReturnType<typeof createStaffingRepository>) => Promise<T>) => {
    try {
      return await database.transaction(async tx => {
        const lifecycle = createGymLifecycleRepository(tx);
        await lifecycle.lockGym(gymId);
        return run(lifecycle, createStaffingRepository(tx));
      });
    } catch (error) { return staffingDatabaseError(error); }
  };
  const requireTrainerAccount = async (staff: ReturnType<typeof createStaffingRepository>, userId: string) => {
    const account = await staff.findAccountState(userId);
    if (!account) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy User.');
    if (account.status !== 'ACTIVE') throw new AccountDeactivatedError();
    if (!(await staff.findCurrentUserRoles(userId)).includes('PT')) {
      throw new AppError(403, 'INSUFFICIENT_ROLE', 'User chưa có role PT.');
    }
  };
  return {
    setGymStatus: (actorId: string, gymId: string, status: 'ACTIVE' | 'INACTIVE') => {
      lifecycleStatusSchema.parse({ status });
      return transact(gymId, async (lifecycle, staff) => {
        const scope = await createGymScopeService(staff, staff).requireInternalScope(actorId, gymId, ['ADMIN']);
        if (scope.gymStatus === status) throw new AppError(409, 'INVALID_STATUS_TRANSITION', 'Gym đã ở trạng thái yêu cầu.');
        return lifecycle.setGymStatus(gymId, status);
      });
    },
    setTrainerStatus: (actorId: string, gymId: string, trainerId: string, status: 'ACTIVE' | 'INACTIVE') => {
      lifecycleStatusSchema.parse({ status });
      return transact(gymId, async (lifecycle, staff) => {
        await createGymScopeService(staff, staff).requireInternalScope(actorId, gymId, ['MANAGER']);
        const trainer = await lifecycle.findTrainer(gymId, trainerId);
        if (!trainer) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy phân công PT tại Gym.');
        if (trainer.status === status) throw new AppError(409, 'INVALID_STATUS_TRANSITION', 'PT đã ở trạng thái yêu cầu.');
        if (status === 'ACTIVE') await requireTrainerAccount(staff, trainer.userId);
        return lifecycle.setTrainerStatus(trainerId, status);
      });
    },
    assignTrainer: (actorId: string, gymId: string, input: TrainerAssignInput) => {
      const parsed = trainerAssignSchema.parse(input);
      return transact(gymId, async (_lifecycle, staff) => {
        await createGymScopeService(staff, staff).requireInternalScope(actorId, gymId, ['MANAGER']);
        await requireTrainerAccount(staff, parsed.user_id);
        return staff.createTrainer(gymId, parsed.user_id, parsed);
      });
    },
  };
};
export const gymLifecycleService = createGymLifecycleService();
