import { db } from '../database/index.js';
import { createGymWriteRepository } from '../repositories/gym-write.repository.js';
import { createStaffingRepository } from '../repositories/staffing.repository.js';
import { createGymScopeService } from './gym-scope.service.js';
import { staffingDatabaseError } from './staffing-errors.js';
import { AppError, AccountDeactivatedError, UnauthorizedError } from '../utils/errors.js';
import { createGymSchema, updateGymSchema } from '../validators/gym-write.validator.js';

export const createGymWriteService = (database: typeof db = db) => ({
  create: async (actorId: string, input: unknown) => {
    const parsed = createGymSchema.parse(input);
    // Creation has system scope: no Gym exists yet to authorize against.
    return database.transaction(async tx => {
      const staff = createStaffingRepository(tx);
      const account = await staff.findAccountState(actorId);
      if (!account) throw new UnauthorizedError();
      if (account.status !== 'ACTIVE') throw new AccountDeactivatedError();
      if (account.mustChangePassword) throw new AppError(403, 'PASSWORD_CHANGE_REQUIRED', 'Bạn phải đổi mật khẩu trước khi tiếp tục.');
      if (!(await staff.findCurrentUserRoles(actorId)).includes('ADMIN')) {
        throw new AppError(403, 'INSUFFICIENT_ROLE', 'Chỉ Admin được tạo Gym.');
      }
      return createGymWriteRepository(tx).create(parsed);
    }).catch(staffingDatabaseError);
  },
  update: async (actorId: string, gymId: string, input: unknown) => {
    const parsed = updateGymSchema.parse(input);
    return database.transaction(async tx => {
      const repository = createGymWriteRepository(tx);
      // Same lock order as assignment/status operations to protect authorization.
      await repository.lockGym(gymId);
      const staff = createStaffingRepository(tx);
      await createGymScopeService(staff, staff).requireInternalScope(actorId, gymId, ['ADMIN', 'MANAGER']);
      return repository.update(gymId, parsed);
    }).catch(staffingDatabaseError);
  },
});
export const gymWriteService = createGymWriteService();
