import { eq } from 'drizzle-orm';
import { db } from '../database/index.js';
import { users, type Payment, type Membership } from '../database/schema/index.js';
import { config } from '../config/index.js';
import { createPaymentRepository } from '../repositories/payment.repository.js';
import { createStaffingRepository } from '../repositories/staffing.repository.js';
import { AppError, UnauthorizedError, AccountDeactivatedError } from '../utils/errors.js';
import type { DemoPaymentInput } from '../validators/payment.validator.js';
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export const paymentDto = (p: Payment) => ({ payment_id: p.paymentId, user_id: p.userId, gym_id: p.gymId,
  package_id: p.packageId, amount: p.amount, payment_method: p.paymentMethod, transaction_code: p.transactionCode,
  payment_status: p.paymentStatus, paid_at: p.paidAt?.toISOString() ?? null,
  created_at: p.createdAt.toISOString(), updated_at: p.updatedAt.toISOString(), demo: p.paymentMethod.startsWith('DEMO:') });
export const membershipDto = (m: Membership, demo = false) => ({ membership_id: m.membershipId, user_id: m.userId,
  gym_id: m.gymId, package_id: m.packageId, payment_id: m.paymentId, purchase_price: m.purchasePrice,
  start_date: m.startDate, end_date: m.endDate, status: m.status, demo, created_at: m.createdAt.toISOString(), updated_at: m.updatedAt.toISOString() });
export const demoMembershipDates = (now: Date, days: number) => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = (type: string) => parts.find(p => p.type === type)!.value;
  const start = `${part('year')}-${part('month')}-${part('day')}`;
  const end = new Date(Date.parse(`${start}T00:00:00Z`) + (days - 1) * 86400000);
  if (!Number.isFinite(end.getTime()) || end.getUTCFullYear() > 9999) throw new AppError(400, 'INVALID_DURATION', 'Thời hạn gói vượt phạm vi ngày hỗ trợ của demo.');
  return { startDate: start, endDate: end.toISOString().slice(0, 10) };
};
const safeFailure = (error: unknown): never => {
  if (error instanceof AppError) throw error;
  let current = error;
  for (let i = 0; i < 5 && current && typeof current === 'object'; i++) {
    const e = current as { code?: string; cause?: unknown };
    if (['40001', '40P01'].includes(e.code ?? '')) throw new AppError(409, 'CONCURRENT_MODIFICATION', 'Vui lòng thử lại giao dịch.');
    current = e.cause;
  }
  throw new AppError(500, 'INTERNAL_SERVER_ERROR', 'Không thể xử lý giao dịch.');
};
const customer = async (tx: Transaction, id: string, write = false) => {
  const [account] = await tx.select({ status: users.status, mustChangePassword: users.mustChangePassword }).from(users)
    .where(eq(users.userId, id)).for(write ? 'update' : 'share');
  if (!account) throw new UnauthorizedError();
  if (account.status !== 'ACTIVE') throw new AccountDeactivatedError();
  if (account.mustChangePassword) throw new AppError(403, 'PASSWORD_CHANGE_REQUIRED', 'Bạn phải đổi mật khẩu trước khi tiếp tục.');
  if (!(await createStaffingRepository(tx).findCurrentUserRoles(id)).includes('CUSTOMER')) throw new AppError(403, 'INSUFFICIENT_ROLE', 'Chỉ tài khoản Customer được mua và xem giao dịch cá nhân.');
};
const collection = <T>(rows: T[], total: number, page: number, pageSize: number) => ({ data: rows, pagination: {
  page, pageSize, totalItems: total, totalPages: Math.ceil(total / pageSize), hasPreviousPage: page > 1, hasNextPage: page < Math.ceil(total / pageSize) } });
export const createPaymentService = (database = db, demoEnabled = config.paymentDemoEnabled) => ({
  createDemo: (actorId: string, gymId: string, key: string, input: DemoPaymentInput) => {
    if (!demoEnabled) throw new AppError(503, 'PAYMENT_DEMO_DISABLED', 'Thanh toán mô phỏng chưa được bật trên máy chủ.');
    return database.transaction(async tx => {
      const repo = createPaymentRepository(tx);
      const gym = await repo.gym(gymId); // Match existing Gym → account → resource lock order.
      await customer(tx, actorId, true); // Serialize retries for this actor, also across Gyms.
      const method = `DEMO:${input.payment_method}`;
      const replay = async (p: Payment) => {
        if (p.packageId !== input.package_id || p.paymentMethod !== method || p.paymentStatus !== 'SUCCESS') throw new AppError(409, 'IDEMPOTENCY_CONFLICT', 'Mã yêu cầu đã được sử dụng cho giao dịch khác.');
        const membership = await repo.membership(actorId, gymId, p.paymentId);
        if (!membership) throw new AppError(409, 'PAYMENT_INCONSISTENT', 'Giao dịch cần được kiểm tra lại.');
        return { payment: paymentDto(p), membership: membershipDto(membership, true), demo: true, replayed: true };
      };
      const existing = await repo.payment(actorId, key, gymId);
      if (existing) return replay(existing);
      if (!gym || gym.status !== 'ACTIVE') throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy Gym đang hoạt động.');
      const item = await repo.package(gymId, input.package_id);
      if (!item || item.status !== 'ACTIVE') throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy gói tập đang bán.');
      const now = new Date();
      const dates = demoMembershipDates(now, item.durationDays);
      const [payment] = await repo.insertPayment({ paymentId: key, userId: actorId, gymId, packageId: item.packageId,
        amount: item.price, paymentMethod: method, transactionCode: `DEMO:${key}`, paymentStatus: 'SUCCESS', paidAt: now });
      if (!payment) {
        const raced = await repo.payment(actorId, key, gymId);
        if (raced) return replay(raced);
        throw new AppError(409, 'IDEMPOTENCY_CONFLICT', 'Mã yêu cầu đã được sử dụng.');
      }
      const membership = await repo.insertMembership({ userId: actorId, gymId, packageId: item.packageId,
        paymentId: payment.paymentId, purchasePrice: payment.amount, status: 'ACTIVE', ...dates });
      return { payment: paymentDto(payment), membership: membershipDto(membership, true), demo: true, replayed: false };
    }).catch(safeFailure);
  },
  detail: (actorId: string, paymentId: string) => database.transaction(async tx => {
    await customer(tx, actorId);
    const p = await createPaymentRepository(tx).payment(actorId, paymentId);
    if (!p) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy giao dịch.');
    return paymentDto(p);
  }).catch(safeFailure),
  list: (actorId: string, query: { page: number; pageSize: number }, kind: 'payments' | 'memberships') => database.transaction(async tx => {
    await customer(tx, actorId);
    const repo = createPaymentRepository(tx);
    if (kind === 'payments') {
      const result = await repo.listPayments(actorId, query.page, query.pageSize);
      return collection(result.rows.map(paymentDto), result.total, query.page, query.pageSize);
    }
    const result = await repo.listMemberships(actorId, query.page, query.pageSize);
    return collection(result.rows.map(row => membershipDto(row.memberships, row.payments?.paymentMethod.startsWith('DEMO:') ?? false)), result.total, query.page, query.pageSize);
  }, { isolationLevel: 'repeatable read' }).catch(safeFailure),
});
export const paymentService = createPaymentService();
