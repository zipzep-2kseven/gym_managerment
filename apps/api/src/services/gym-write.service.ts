import { db } from '../database/index.js';
import { createGymWriteRepository } from '../repositories/gym-write.repository.js';
import { createStaffingRepository } from '../repositories/staffing.repository.js';
import { createGymScopeService } from './gym-scope.service.js';
import { staffingDatabaseError } from './staffing-errors.js';
import { AppError, AccountDeactivatedError, UnauthorizedError } from '../utils/errors.js';
import { prepareStaffCredential, provisionStaffInTransaction } from './staff-provisioning.js';
import { createGymSchema, updateGymSchema } from '../validators/gym-write.validator.js';

export const createGymWriteService = (database: typeof db = db) => ({
  create: async (actorId: string, input: unknown) => {
    const parsed = createGymSchema.parse(input);
    // System scope; no Gym exists yet. Authorize before expensive hashing.
    const authorize = async (tx: Parameters<Parameters<typeof database.transaction>[0]>[0]) => {
      const staff = createStaffingRepository(tx);
      const account = await staff.findAccountState(actorId);
      if (!account) throw new UnauthorizedError();
      if (account.status !== 'ACTIVE') throw new AccountDeactivatedError();
      if (account.mustChangePassword) throw new AppError(403, 'PASSWORD_CHANGE_REQUIRED', 'Bạn phải đổi mật khẩu trước khi tiếp tục.');
      if (!(await staff.findCurrentUserRoles(actorId)).includes('ADMIN')) {
        throw new AppError(403, 'INSUFFICIENT_ROLE', 'Chỉ Admin được tạo Gym.');
      }
    };
    if (parsed.manager) await database.transaction(authorize).catch(staffingDatabaseError);
    const credential = parsed.manager ? await prepareStaffCredential() : undefined;
    return database.transaction(async tx => {
      await authorize(tx); // Lock current account/role through commit, including after hashing.
      const gym = await createGymWriteRepository(tx).create(parsed);
      const manager = parsed.manager && credential
        ? await provisionStaffInTransaction(tx, gym.gymId, 'MANAGER', parsed.manager, credential) : undefined;
      return { ...gym, ...(manager ? { manager } : {}) };
    }).catch(staffingDatabaseError);
  },
  remove: async (actorId: string, gymId: string) => {
    return database.transaction(async tx => {
      const repository = createGymWriteRepository(tx);
      await repository.lockGym(gymId);
      const staff = createStaffingRepository(tx);
      await createGymScopeService(staff, staff).requireInternalScope(actorId, gymId, ['ADMIN']);
      // RESTRICT foreign keys preserve all linked business and assignment history.
      return repository.remove(gymId);
    }).catch(error => {
      let cause: unknown = error;
      for (let i = 0; i < 5 && cause && typeof cause === 'object'; i++) {
        const record = cause as { code?: string; cause?: unknown };
        if (record.code === '23503') throw new AppError(409, 'GYM_HAS_LINKED_DATA',
          'Phòng Gym có dữ liệu liên kết hoặc lịch sử phân công Manager nên không thể xóa. Bạn có thể chọn ngừng hoạt động.');
        cause = record.cause;
      }
      return staffingDatabaseError(error);
    });
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
