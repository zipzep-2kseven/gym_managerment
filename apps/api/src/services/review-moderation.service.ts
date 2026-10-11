import { db } from '../database/index.js';
import { createStaffingRepository } from '../repositories/staffing.repository.js';
import { createReviewRepository } from '../repositories/review.repository.js';
import { createReviewModerationRepository } from '../repositories/review-moderation.repository.js';
import { AppError } from '../utils/errors.js';
import { hideReviewInput, moderationQuery } from '../validators/review.validator.js';
import { staffingDatabaseError } from './staffing-errors.js';
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
const requireAdmin = async (tx: Tx, actor: string) => {
  const auth = createStaffingRepository(tx), account = await auth.findAccountState(actor);
  if (!account || account.status !== 'ACTIVE' || account.mustChangePassword || !(await auth.findCurrentUserRoles(actor)).includes('ADMIN')) throw new AppError(403, 'REVIEW_MODERATION_FORBIDDEN', 'Chỉ Admin đang hoạt động và đã đổi mật khẩu tạm được quản lý đánh giá.');
};
export const createReviewModerationService = (database = db) => {
  const hide = async (actor: string, kind: 'gym' | 'trainer', id: string, reason: string) => {
    const input = hideReviewInput.parse({hidden_reason: reason});
    return database.transaction(async tx => {
      const repo = createReviewModerationRepository(tx), scope = await repo.scope(kind, id);
      if (scope) await createReviewRepository(tx).gym(scope.gymId, true);
      await requireAdmin(tx, actor);
      if (!scope) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy đánh giá.');
      const raw = await repo.hide(kind, id, actor, input.hidden_reason, scope);
      if (!raw) throw new AppError(409, 'REVIEW_NOT_VISIBLE', 'Đánh giá đã bị ẩn. Hãy tải lại để xem lịch sử.');
      const view = (await repo.list({kind, page: 1, pageSize: 1}, id)).items[0];
      return {raw, view};
    }).catch(staffingDatabaseError);
  };
  return {
    list: async (actor: string, input: unknown) => {
      const query = moderationQuery.parse(input);
      return database.transaction(async tx => {await requireAdmin(tx, actor); return createReviewModerationRepository(tx).list(query);}, {isolationLevel: 'repeatable read'}).catch(staffingDatabaseError);
    },
    hide: async (actor: string, kind: 'gym' | 'trainer', id: string, reason: string) => (await hide(actor, kind, id, reason)).raw,
    hideManaged: async (actor: string, kind: 'gym' | 'trainer', id: string, reason: string) => (await hide(actor, kind, id, reason)).view,
  };
};
export const reviewModerationService = createReviewModerationService();
