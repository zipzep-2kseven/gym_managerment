import { createReviewModerationService } from './review-moderation.service.js';
import { sql } from 'drizzle-orm';
import { db } from '../database/index.js';
import { gymReviews, trainerReviews } from '../database/schema/index.js';
import { AppError } from '../utils/errors.js';
import { createReviewRepository } from '../repositories/review.repository.js';
import { createStaffingRepository } from '../repositories/staffing.repository.js';
import { reviewInput, type ReviewTarget } from '../validators/review.validator.js';
import { staffingDatabaseError } from './staffing-errors.js';
const sqlTimezone = sql`select set_config('TimeZone', 'Asia/Ho_Chi_Minh', true)`;
type Database = typeof db;
type Tx = Parameters<Parameters<Database['transaction']>[0]>[0];
export const ownReviewView = (row: typeof gymReviews.$inferSelect | typeof trainerReviews.$inferSelect) => ({
  review_id: 'gymReviewId' in row ? row.gymReviewId : row.trainerReviewId,
  rating: row.rating, comment: row.comment, status: row.status, created_at: row.createdAt,
});
const targetScope = async (tx: Tx, target: ReviewTarget, write = false) => {
  const repo = createReviewRepository(tx), gymId = await repo.resolveGym(target);
  if (!gymId) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy Gym/PT.');
  const gym = await repo.gym(gymId, write);
  if (!gym || gym.status !== 'ACTIVE') throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy Gym/PT đang hoạt động.');
  if (target.kind === 'trainer') {
    const trainer = await repo.trainer(target);
    if (!trainer || trainer.status !== 'ACTIVE' || (await repo.trainerAccount(trainer.userId))?.status !== 'ACTIVE') throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy PT đang hoạt động.');
  }
  return gymId;
};
const eligibility = async (tx: Tx, actor: string, target: ReviewTarget, gym: string) => {
  const auth = createStaffingRepository(tx), account = await auth.findAccountState(actor), roles = await auth.findCurrentUserRoles(actor);
  if (!account || account.status !== 'ACTIVE' || account.mustChangePassword || !roles.includes('CUSTOMER')) throw new AppError(403, 'REVIEW_FORBIDDEN', 'Bạn cần tài khoản Customer đang hoạt động và đã đổi mật khẩu tạm.');
  const review = await createReviewRepository(tx).own(actor, target);
  if (review) return { eligible: false, reason: 'Bạn đã gửi đánh giá cho đối tượng này.', review: ownReviewView(review) };
  if (await auth.findActiveManagerAssignment(actor, gym) || await auth.findActiveTrainerAssignment(actor, gym)) return { eligible: false, reason: 'Nhân sự không đánh giá Gym hoặc PT tại Gym đang phụ trách.', review: null };
  const eligible = await createReviewRepository(tx).eligible(actor, gym, target);
  return { eligible, reason: eligible ? null : target.kind === 'gym' ? 'Cần thẻ ACTIVE/EXPIRED đã bắt đầu tại Gym này.' : 'Cần thẻ hợp lệ và ít nhất một buổi tập đã hoàn thành với PT này.', review: null };
};
export const createReviewService = (database: Database = db) => ({
  list: (target: ReviewTarget, page: number, pageSize: number) => database.transaction(async tx => {
    await targetScope(tx, target); return createReviewRepository(tx).list(target, page, pageSize);
  }, { isolationLevel: 'repeatable read' }).catch(staffingDatabaseError),
  mine: (actor: string, target: ReviewTarget) => database.transaction(async tx => {
    await tx.execute(sqlTimezone); const gym = await targetScope(tx, target); return eligibility(tx, actor, target, gym);
  }).catch(staffingDatabaseError),
  create: async (actor: string, target: ReviewTarget, input: unknown) => {
    const body = reviewInput.parse(input);
    return database.transaction(async tx => {
      await tx.execute(sqlTimezone); const gym = await targetScope(tx, target, true);
      const result = await eligibility(tx, actor, target, gym);
      if (result.review) throw new AppError(409, 'REVIEW_ALREADY_EXISTS', 'Bạn đã gửi đánh giá. Hãy tải lại để xem kết quả.');
      if (!result.eligible) throw new AppError(403, 'REVIEW_NOT_ELIGIBLE', result.reason!);
      return createReviewRepository(tx).insert(actor, target, body);
    }).catch(staffingDatabaseError);
  },
  hide: createReviewModerationService(database).hide,
});
export const reviewService = createReviewService();
