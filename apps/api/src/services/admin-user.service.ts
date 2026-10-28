import { db } from '../database/index.js';
import { createAdminUserRepository } from '../repositories/admin-user.repository.js';
import { createStaffingRepository } from '../repositories/staffing.repository.js';
import { adminUserQuery, adminUserStatusInput } from '../validators/admin-user.validator.js';
import { AppError } from '../utils/errors.js';
import { staffingDatabaseError } from './staffing-errors.js';
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
const requireAdmin = async (tx: Tx, actor: string) => {
  const auth = createStaffingRepository(tx), account = await auth.findAccountState(actor);
  if (!account || account.status !== 'ACTIVE' || account.mustChangePassword || !(await auth.findCurrentUserRoles(actor)).includes('ADMIN')) throw new AppError(403,'ADMIN_USER_FORBIDDEN','Chỉ Admin đang hoạt động và đã đổi mật khẩu tạm được quản lý tài khoản.');
};
export const createAdminUserService = (database = db, event: (entry: Record<string,string>) => void = entry => console.info('USER_STATUS_CHANGED',JSON.stringify(entry))) => ({
  list: async (actor: string, input: unknown) => {const query=adminUserQuery.parse(input);return database.transaction(async tx=>{await requireAdmin(tx,actor);return createAdminUserRepository(tx).list(query);},{isolationLevel:'repeatable read'}).catch(staffingDatabaseError);},
  roles: (actor: string) => database.transaction(async tx=>{await requireAdmin(tx,actor);return createAdminUserRepository(tx).roleList();}).catch(staffingDatabaseError),
  status: async (actor: string, id: string, input: unknown) => {
    const body=adminUserStatusInput.parse(input);
    const result=await database.transaction(async tx=>{
      const repo=createAdminUserRepository(tx);await repo.lockAccounts([actor,id]);await requireAdmin(tx,actor);
      const current=await repo.state(id);if(!current)throw new AppError(404,'NOT_FOUND','Không tìm thấy tài khoản.');
      if(actor===id || (await createStaffingRepository(tx).findCurrentUserRoles(id)).includes('ADMIN'))throw new AppError(403,'ADMIN_ACCOUNT_PROTECTED','Tài khoản Admin được bảo vệ; không đổi trạng thái tại chức năng này.');
      if(current.updatedAt.toISOString()!==body.expected_updated_at)throw new AppError(409,'USER_CHANGED','Tài khoản đã thay đổi. Hãy tải lại trước khi thao tác.');
      if(current.status===body.status)throw new AppError(409,'INVALID_STATUS_TRANSITION','Tài khoản đã ở trạng thái yêu cầu.');
      await repo.setStatus(id,body.status);return {view: await repo.view(id), previous: current.status};
    }).catch(staffingDatabaseError);
    try {event({actor_id:actor,target_id:id,previous_status:result.previous,status:body.status,changed_at:result.view.updated_at.toISOString()});} catch { /* A logging failure must not turn a committed change into a retryable error. */ }
    return result.view;
  },
});
export const adminUserService=createAdminUserService();
