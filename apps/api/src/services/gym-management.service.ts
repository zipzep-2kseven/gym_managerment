import { sql } from 'drizzle-orm';
import { db } from '../database/index.js';
import { createStaffingRepository } from '../repositories/staffing.repository.js';
import { createGymManagementRepository } from '../repositories/gym-management.repository.js';
import { createGymScopeService } from './gym-scope.service.js';
import { staffingDatabaseError } from './staffing-errors.js';
import { AppError, AccountDeactivatedError, UnauthorizedError } from '../utils/errors.js';
import { managedGymQuerySchema, managedTrainerQuerySchema } from '../validators/gym-management.validator.js';

const paginate = <T>(result: { data: T[]; totalItems: number }, query: { page: number; pageSize: number }) => {
  const totalPages = Math.ceil(result.totalItems / query.pageSize);
  return { data: result.data, pagination: { page: query.page, pageSize: query.pageSize,
    totalItems: result.totalItems, totalPages, hasNextPage: query.page < totalPages, hasPreviousPage: query.page > 1 } };
};
export const createGymManagementService = (database: typeof db = db) => ({
  gyms: async (actorId: string, input: unknown) => {
    const query = managedGymQuerySchema.parse(input);
    return database.transaction(async tx => {
      const staff = createStaffingRepository(tx);
      const account = await staff.findAccountState(actorId);
      if (!account) throw new UnauthorizedError();
      if (account.status !== 'ACTIVE') throw new AccountDeactivatedError();
      if (account.mustChangePassword) throw new AppError(403, 'PASSWORD_CHANGE_REQUIRED', 'Bạn phải đổi mật khẩu trước khi tiếp tục.');
      if (!(await staff.findCurrentUserRoles(actorId)).includes('ADMIN')) {
        throw new AppError(403, 'INSUFFICIENT_ROLE', 'Chỉ Admin được xem danh sách Gym quản trị.');
      }
      return paginate(await createGymManagementRepository(tx).gyms(query), query);
    }, { isolationLevel: 'repeatable read' }).catch(staffingDatabaseError);
  },
  trainers: async (actorId: string, gymId: string, input: unknown) => {
    const query = managedTrainerQuerySchema.parse(input);
    return database.transaction(async tx => {
      // Lock Gym before actor/assignment, matching the lifecycle write lock order.
      await tx.execute(sql`SELECT gym_id FROM gyms WHERE gym_id = ${gymId} FOR SHARE`);
      const staff = createStaffingRepository(tx);
      await createGymScopeService(staff, staff).requireInternalScope(actorId, gymId, ['ADMIN', 'MANAGER']);
      return paginate(await createGymManagementRepository(tx).trainers(gymId, query), query);
    }, { isolationLevel: 'repeatable read' }).catch(staffingDatabaseError);
  },
});
export const gymManagementService = createGymManagementService();
