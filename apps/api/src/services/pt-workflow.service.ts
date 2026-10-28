import { and, eq } from 'drizzle-orm';
import { db } from '../database/index.js';
import { memberships } from '../database/schema/index.js';
import { createPtWorkflowRepository, type PtTransaction } from '../repositories/pt-workflow.repository.js';
import { createStaffingRepository } from '../repositories/staffing.repository.js';
import { ptAccount, ptCustomerEligible, ptInternal, ptParticipant, ptEligible, ptTimesEligible, ptMissing, ptConflict,
  ptRegistrationDto, ptAppointmentDto, ptMineFilter, ptSafeFailure, vietnamDate } from './pt-workflow-policy.js';
import type { PtRegisterInput, PtAppointmentInput, PtTimes, PtPage } from '../validators/pt-workflow.validator.js';
export const createPtWorkflowService = (database = db, clock: () => Date = () => new Date()) => {
  const gymWrite = <T>(_actor: string, gymId: string, run: (tx: PtTransaction, gymStatus: string) => Promise<T>) => database.transaction(async tx => {
    const repo = createPtWorkflowRepository(tx); const gym = await repo.lockGym(gymId);
    if (!gym) throw ptMissing();
    return run(tx, gym.status);
  }).catch(ptSafeFailure);
  const list = (actor: string, kind: 'registrations' | 'appointments', query: PtPage, gymId?: string) => database.transaction(async tx => {
    const filter = gymId ? (await ptInternal(tx, actor, gymId, true), eq(memberships.gymId, gymId)) : await ptMineFilter(tx, actor);
    const result = await createPtWorkflowRepository(tx).list(kind, filter, query);
    const data = result.kind === 'appointments' ? result.data.map(ptAppointmentDto) : result.data.map(ptRegistrationDto);
    return { data, pagination: { page: query.page, pageSize: query.pageSize, totalItems: result.total,
      totalPages: Math.ceil(result.total / query.pageSize), hasNextPage: query.page * query.pageSize < result.total, hasPreviousPage: query.page > 1 } };
  }, { isolationLevel: 'repeatable read' }).catch(ptSafeFailure);
  return {
    listMemberships: (actor: string, gymId: string, query: PtPage) => database.transaction(async tx => {
      await ptInternal(tx, actor, gymId, true);
      const result = await createPtWorkflowRepository(tx).listMemberships(gymId, query);
      return { data: result.rows.map(({ membership: m, fullName, gymName, packageName }) => ({
        membership_id: m.membershipId, user_id: m.userId, gym_id: m.gymId, package_id: m.packageId, payment_id: m.paymentId,
        purchase_price: m.purchasePrice, start_date: m.startDate, end_date: m.endDate, status: m.status,
        created_at: m.createdAt.toISOString(), updated_at: m.updatedAt.toISOString(),
        customer: { user_id: m.userId, full_name: fullName }, gym: { gym_id: m.gymId, gym_name: gymName }, package: { package_id: m.packageId, package_name: packageName },
      })), pagination: { page: query.page, pageSize: query.pageSize, totalItems: result.total, totalPages: Math.ceil(result.total / query.pageSize), hasNextPage: query.page * query.pageSize < result.total, hasPreviousPage: query.page > 1 } };
    }, { isolationLevel: 'repeatable read' }).catch(ptSafeFailure),
    list,
    availability: (actor: string, gymId: string, trainerId: string, availability: string) => gymWrite(actor, gymId, async (tx, status) => {
      const repo = createPtWorkflowRepository(tx); const trainer = await repo.trainer(gymId, trainerId);
      if (!trainer) throw ptMissing();
      await repo.lockUsers([actor, trainer.userId]); const roles = await ptAccount(tx, actor);
      if (!(roles.includes('PT') && trainer.userId === actor && trainer.status === 'ACTIVE')) await ptInternal(tx, actor, gymId);
      if (status !== 'ACTIVE' || trainer.status !== 'ACTIVE') throw ptConflict('PT_INACTIVE', 'PT và Gym phải đang hoạt động.');
      await repo.availability(gymId, trainerId, availability);
      return { gym_trainer_id: trainerId, gym_id: gymId, availability };
    }),
    register: (actor: string, gymId: string, input: PtRegisterInput) => gymWrite(actor, gymId, async (tx, status) => {
      const repo = createPtWorkflowRepository(tx);
      // Discover participant IDs under the Gym lock, then lock accounts in sorted order.
      const [member] = await tx.select().from(memberships).where(and(eq(memberships.gymId, gymId), eq(memberships.membershipId, input.membership_id)));
      const trainer = await repo.trainer(gymId, input.gym_trainer_id);
      await repo.lockUsers([actor, ...(member && member.gymId === gymId ? [member.userId] : []), ...(trainer ? [trainer.userId] : [])]);
      const roles = await ptAccount(tx, actor);
      if (!(roles.includes('CUSTOMER') && member?.userId === actor)) await ptInternal(tx, actor, gymId);
      if (!member || member.gymId !== gymId || !trainer) throw ptMissing();
      await ptCustomerEligible(tx, member.userId);
      const m = await repo.membership(gymId, member.membershipId);
      const day = vietnamDate(clock()); const staff = createStaffingRepository(tx);
      const pt = await staff.findAccountState(trainer.userId);
      if (status !== 'ACTIVE' || trainer.status !== 'ACTIVE' || !pt || pt.status !== 'ACTIVE' || !(await staff.findCurrentUserRoles(trainer.userId)).includes('PT')) throw ptConflict('PT_INACTIVE', 'PT không còn hoạt động.');
      if (!m || m.status !== 'ACTIVE' || m.startDate > day || m.endDate < day) throw ptConflict('MEMBERSHIP_REQUIRED', 'Cần thẻ hội viên ACTIVE còn hạn.');
      if (trainer.availability === 'NOT_ACCEPTING') throw ptConflict('TRAINER_NOT_ACCEPTING', 'PT đang ngừng nhận học viên mới.');
      if (await repo.activeRegistration(gymId, m.membershipId)) throw ptConflict('ACTIVE_REGISTRATION_EXISTS', 'Thẻ đã có PT phụ trách; cần kết thúc đăng ký cũ trước.');
      const r = await repo.insertRegistration({ membershipId: m.membershipId, gymTrainerId: trainer.gymTrainerId, status: 'ACTIVE', note: input.note });
      return ptRegistrationDto((await repo.registration(gymId, r.registrationId))!);
    }),
    cancelRegistration: (actor: string, gymId: string, id: string, note: string) => gymWrite(actor, gymId, async tx => {
      const repo = createPtWorkflowRepository(tx); const row = await repo.registration(gymId, id);
      await repo.lockUsers([actor, ...(row ? [row.membership.userId, row.trainer.userId] : [])]);
      await ptInternal(tx, actor, gymId);
      if (!row) throw ptMissing();
      if (row.registration.status === 'CANCELLED') return ptRegistrationDto(row);
      if (row.registration.status !== 'ACTIVE') throw ptConflict('INVALID_STATUS', 'Đăng ký đã kết thúc.');
      if (await repo.hasOpen(gymId, id)) throw ptConflict('REGISTRATION_HAS_OPEN_APPOINTMENTS', 'Cần xử lý các lịch đang mở trước khi kết thúc đăng ký.');
      await repo.cancelRegistration(gymId, id, note); return ptRegistrationDto((await repo.registration(gymId, id))!);
    }),
    createAppointment: (actor: string, gymId: string, input: PtAppointmentInput) => gymWrite(actor, gymId, async (tx, status) => {
      const repo = createPtWorkflowRepository(tx); const before = await repo.registration(gymId, input.registration_id);
      await repo.lockUsers([actor, ...(before ? [before.membership.userId, before.trainer.userId] : [])]);
      await ptAccount(tx, actor); if (!before) throw ptMissing();
      await repo.membership(gymId, before.membership.membershipId);
      const row = (await repo.registration(gymId, input.registration_id))!;
      await ptParticipant(tx, actor, row); await ptEligible(tx, row, status, clock());
      const start = new Date(input.start_time), end = new Date(input.end_time); ptTimesEligible(row, start, end, clock());
      if (await repo.overlap([row.membership.userId, row.trainer.userId], start, end)) throw ptConflict('APPOINTMENT_OVERLAP', 'Hội viên hoặc PT đã có lịch trong khoảng này.');
      const a = await repo.insertAppointment({ registrationId: input.registration_id, startTime: start, endTime: end, status: 'PENDING', note: input.note });
      return ptAppointmentDto((await repo.appointment(gymId, a.appointmentId))!);
    }),
    appointmentAction: (actor: string, gymId: string, id: string, action: 'confirm' | 'reschedule' | 'cancel' | 'complete', input: Partial<PtTimes>) => gymWrite(actor, gymId, async (tx, status) => {
      const repo = createPtWorkflowRepository(tx); const before = await repo.appointment(gymId, id);
      await repo.lockUsers([actor, ...(before ? [before.membership.userId, before.trainer.userId] : [])]);
      await ptAccount(tx, actor); if (!before) throw ptMissing();
      await repo.membership(gymId, before.membership.membershipId);
      const row = (await repo.appointment(gymId, id))!;
      const role = await ptParticipant(tx, actor, row, action === 'confirm' || action === 'complete');
      const a = row.appointment; const now = clock();
      const target = { confirm: 'CONFIRMED', cancel: 'CANCELLED', complete: 'COMPLETED', reschedule: 'PENDING' }[action];
      if (action !== 'reschedule' && a.status === target) return ptAppointmentDto(row);
      if (!['PENDING', 'CONFIRMED'].includes(a.status)) throw ptConflict('INVALID_STATUS', 'Lịch đã kết thúc, không thể chỉnh sửa.');
      if (action === 'cancel') {
        if (!input.note) throw ptConflict('REASON_REQUIRED', 'Cần nhập lý do hủy.');
        if (role === 'CUSTOMER' && a.startTime <= now) throw ptConflict('APPOINTMENT_STARTED', 'Hãy liên hệ PT hoặc Manager để xử lý lịch đã bắt đầu.');
      } else if (action === 'complete') {
        if (a.status !== 'CONFIRMED' || a.endTime > now) throw ptConflict('INVALID_STATUS', 'Chỉ hoàn thành buổi đã xác nhận và kết thúc.');
      } else {
        if (a.startTime <= now) throw ptConflict('APPOINTMENT_STARTED', 'Lịch đã bắt đầu, không thể dời hoặc xác nhận.');
        await ptEligible(tx, row, status, now);
        const start = action === 'reschedule' ? new Date(input.start_time!) : a.startTime;
        const end = action === 'reschedule' ? new Date(input.end_time!) : a.endTime;
        ptTimesEligible(row, start, end, now);
        if (action === 'reschedule' && start.getTime() === a.startTime.getTime() && end.getTime() === a.endTime.getTime()) return ptAppointmentDto(row);
        if (await repo.overlap([row.membership.userId, row.trainer.userId], start, end, id)) throw ptConflict('APPOINTMENT_OVERLAP', 'Hội viên hoặc PT đã có lịch trong khoảng này.');
        await repo.updateAppointment(gymId, id, { startTime: start, endTime: end, status: target, ...(input.note ? { note: input.note } : {}) });
        return ptAppointmentDto((await repo.appointment(gymId, id))!);
      }
      await repo.updateAppointment(gymId, id, { status: target, ...(input.note ? { note: input.note } : {}) });
      return ptAppointmentDto((await repo.appointment(gymId, id))!);
    }),
  };
};
export const ptWorkflowService = createPtWorkflowService();
