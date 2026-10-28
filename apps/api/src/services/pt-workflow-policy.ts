import { and, eq, or } from 'drizzle-orm';
import { gymTrainers, memberships } from '../database/schema/index.js';
import { createStaffingRepository } from '../repositories/staffing.repository.js';
import { createGymScopeService } from './gym-scope.service.js';
import type { PtTransaction, PtRegistrationRow, PtAppointmentRow } from '../repositories/pt-workflow.repository.js';
import { AppError, UnauthorizedError, AccountDeactivatedError } from '../utils/errors.js';
export const ptMissing = () => new AppError(404, 'NOT_FOUND', 'Không tìm thấy dữ liệu PT trong phạm vi được phép.');
export const ptConflict = (code: string, message: string) => new AppError(409, code, message);
export const ptAccount = async (tx: PtTransaction, id: string) => {
  const staff = createStaffingRepository(tx); const account = await staff.findAccountState(id);
  if (!account) throw new UnauthorizedError();
  if (account.status !== 'ACTIVE') throw new AccountDeactivatedError();
  if (account.mustChangePassword) throw new AppError(403, 'PASSWORD_CHANGE_REQUIRED', 'Bạn phải đổi mật khẩu trước khi tiếp tục.');
  return staff.findCurrentUserRoles(id);
};
export const ptInternal = (tx: PtTransaction, actor: string, gym: string, admin = false) => {
  const staff = createStaffingRepository(tx);
  return createGymScopeService(staff, staff).requireInternalScope(actor, gym, admin ? ['ADMIN', 'MANAGER'] : ['MANAGER']);
};
export const ptParticipant = async (tx: PtTransaction, actor: string, row: PtRegistrationRow, staffOnly = false) => {
  const roles = await ptAccount(tx, actor);
  if (!staffOnly && roles.includes('CUSTOMER') && row.membership.userId === actor) return 'CUSTOMER' as const;
  if (roles.includes('PT') && row.trainer.userId === actor && row.trainer.status === 'ACTIVE') return 'PT' as const;
  await ptInternal(tx, actor, row.membership.gymId);
  return 'MANAGER' as const;
};
export const vietnamDate = (now: Date) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
export const ptCustomerEligible = async (tx: PtTransaction, id: string) => {
  const staff = createStaffingRepository(tx); const account = await staff.findAccountState(id);
  if (!account || account.status !== 'ACTIVE' || !(await staff.findCurrentUserRoles(id)).includes('CUSTOMER')) throw ptConflict('CUSTOMER_INACTIVE', 'Tài khoản hội viên không còn hoạt động.');
};
export const ptEligible = async (tx: PtTransaction, row: PtRegistrationRow, gymStatus: string, now: Date) => {
  const day = vietnamDate(now); const member = row.membership;
  await ptCustomerEligible(tx, member.userId);
  if (gymStatus !== 'ACTIVE' || row.trainer.status !== 'ACTIVE' || row.registration.status !== 'ACTIVE') throw ptConflict('PT_INACTIVE', 'Gym, PT và đăng ký phải đang hoạt động.');
  if (member.status !== 'ACTIVE' || member.startDate > day || member.endDate < day) throw ptConflict('MEMBERSHIP_REQUIRED', 'Cần thẻ hội viên ACTIVE còn hạn.');
  const staff = createStaffingRepository(tx); const account = await staff.findAccountState(row.trainer.userId);
  if (!account || account.status !== 'ACTIVE' || !(await staff.findCurrentUserRoles(row.trainer.userId)).includes('PT')) throw ptConflict('PT_INACTIVE', 'Tài khoản PT không còn hoạt động.');
};
export const ptTimesEligible = (row: PtRegistrationRow, start: Date, end: Date, now: Date) => {
  const lower = Date.parse(`${row.membership.startDate}T00:00:00+07:00`);
  const upper = Date.parse(`${row.membership.endDate}T00:00:00+07:00`) + 86400000;
  if (start <= now || end <= start || start.getTime() < lower || end.getTime() > upper) throw new AppError(400, 'INVALID_APPOINTMENT_TIME', 'Lịch phải ở tương lai và nằm trọn trong thời hạn thẻ.');
};
export const ptRegistrationDto = (row: PtRegistrationRow) => {
  const r = row.registration, m = row.membership, t = row.trainer;
  return { registration_id: r.registrationId, membership_id: r.membershipId, gym_trainer_id: r.gymTrainerId,
    status: r.status, note: r.note, registered_at: r.registeredAt.toISOString(), created_at: r.createdAt.toISOString(), updated_at: r.updatedAt.toISOString(),
    membership: { membership_id: m.membershipId, user_id: m.userId, gym_id: m.gymId, package_id: m.packageId, start_date: m.startDate, end_date: m.endDate, status: m.status },
    customer: { user_id: m.userId, full_name: row.customerName, avatar_url: row.customerAvatar },
    trainer: { gym_trainer_id: t.gymTrainerId, user_id: t.userId, gym_id: t.gymId, full_name: row.trainerName, avatar_url: row.trainerAvatar },
    gym: { gym_id: m.gymId, gym_name: row.gymName } };
};
export const ptAppointmentDto = (row: PtAppointmentRow) => {
  const a = row.appointment;
  return { appointment_id: a.appointmentId, registration_id: a.registrationId, start_time: a.startTime.toISOString(), end_time: a.endTime.toISOString(),
    status: a.status, note: a.note, created_at: a.createdAt.toISOString(), updated_at: a.updatedAt.toISOString(), registration: ptRegistrationDto(row) };
};
export const ptMineFilter = async (tx: PtTransaction, actor: string) => {
  const roles = await ptAccount(tx, actor);
  if (!roles.some(r => ['CUSTOMER', 'PT'].includes(r))) throw new AppError(403, 'INSUFFICIENT_ROLE', 'Chỉ Customer hoặc PT xem danh sách cá nhân.');
  return or(roles.includes('CUSTOMER') ? eq(memberships.userId, actor) : undefined,
    roles.includes('PT') ? and(eq(gymTrainers.userId, actor), eq(gymTrainers.status, 'ACTIVE')) : undefined)!;
};
export const ptSafeFailure = (error: unknown): never => {
  if (error instanceof AppError) throw error;
  let current = error;
  for (let i = 0; i < 6 && current && typeof current === 'object'; i++) {
    const e = current as { code?: string; cause?: unknown; constraint?: string };
    if (e.code === '23505' && e.constraint === 'pt_registrations_active_membership_key') throw ptConflict('ACTIVE_REGISTRATION_EXISTS', 'Thẻ đã có PT phụ trách.');
    if (['40001', '40P01'].includes(e.code ?? '')) throw ptConflict('CONCURRENT_MODIFICATION', 'Dữ liệu vừa thay đổi; vui lòng thử lại.');
    if (e.code === '23514') throw ptConflict('PT_POLICY_CONFLICT', 'Thao tác không phù hợp trạng thái dữ liệu hiện tại.');
    current = e.cause;
  }
  throw new AppError(500, 'INTERNAL_SERVER_ERROR', 'Không thể xử lý dữ liệu PT.');
};
