import { db } from '../database/index.js';
import { createStaffingRepository } from '../repositories/staffing.repository.js';
import { createAdminDashboardRepository } from '../repositories/admin-dashboard.repository.js';
import { AppError } from '../utils/errors.js';
import { staffingDatabaseError } from './staffing-errors.js';

export const createAdminDashboardService = (database = db, clock = () => new Date()) => ({
  summary: (actor: string) => database.transaction(async tx => {
    const auth = createStaffingRepository(tx);
    const account = await auth.findAccountState(actor);
    if (!account || account.status !== 'ACTIVE' || account.mustChangePassword
      || !(await auth.findCurrentUserRoles(actor)).includes('ADMIN')) {
      throw new AppError(403, 'ADMIN_DASHBOARD_FORBIDDEN', 'Chỉ Admin đang hoạt động được xem tổng quan hệ thống.');
    }
    return createAdminDashboardRepository(tx).summary(clock());
  }, { isolationLevel: 'repeatable read' }).catch(staffingDatabaseError),
});
export const adminDashboardService = createAdminDashboardService();
