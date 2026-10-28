import { and, eq, desc, count, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { db } from '../database/index.js';
import { gymReviews, trainerReviews, gyms, gymTrainers, userProfiles } from '../database/schema/index.js';
import type { ModerationQuery } from '../validators/review.validator.js';
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
const author = alias(userProfiles, 'review_author'), moderator = alias(userProfiles, 'review_moderator'), trainer = alias(userProfiles, 'review_trainer');
export const createReviewModerationRepository = (tx: Tx) => {
  const list = async (query: ModerationQuery, reviewId?: string) => {
    const isGym = query.kind === 'gym', table = isGym ? gymReviews : trainerReviews;
    const id = isGym ? gymReviews.gymReviewId : trainerReviews.trainerReviewId;
    const filter = and(query.gym_id ? eq(gyms.gymId, query.gym_id) : undefined, query.status ? eq(table.status, query.status) : undefined, reviewId ? eq(id, reviewId) : undefined);
    const columns = { review_id: id, rating: table.rating, comment: table.comment, status: table.status, created_at: table.createdAt,
      gym: { gym_id: gyms.gymId, gym_name: gyms.gymName, status: gyms.status }, author: {user_id: table.userId, full_name: author.fullName},
      hidden_by: table.hiddenBy, moderator_name: moderator.fullName, hidden_at: table.hiddenAt, hidden_reason: table.hiddenReason };
    const base = isGym ? tx.select(columns).from(gymReviews).innerJoin(gyms, eq(gyms.gymId, gymReviews.gymId))
      : tx.select({...columns, trainer: {gym_trainer_id: gymTrainers.gymTrainerId, full_name: trainer.fullName, status: gymTrainers.status}}).from(trainerReviews)
        .innerJoin(gymTrainers, eq(gymTrainers.gymTrainerId, trainerReviews.gymTrainerId)).innerJoin(gyms, eq(gyms.gymId, gymTrainers.gymId)).leftJoin(trainer, eq(trainer.userId, gymTrainers.userId));
    const rows = await base.leftJoin(author, eq(author.userId, table.userId)).leftJoin(moderator, eq(moderator.userId, table.hiddenBy)).where(filter)
      .orderBy(desc(table.createdAt), desc(id)).limit(query.pageSize).offset((query.page - 1) * query.pageSize);
    const totalQuery = isGym ? tx.select({total: count()}).from(gymReviews).innerJoin(gyms, eq(gyms.gymId, gymReviews.gymId))
      : tx.select({total: count()}).from(trainerReviews).innerJoin(gymTrainers, eq(gymTrainers.gymTrainerId, trainerReviews.gymTrainerId)).innerJoin(gyms, eq(gyms.gymId, gymTrainers.gymId));
    const [stats] = await totalQuery.where(filter);
    return {items: rows.map(row => ({review_id: row.review_id, kind: query.kind, rating: row.rating, comment: row.comment, status: row.status, created_at: row.created_at,
      gym: row.gym, trainer: 'trainer' in row ? row.trainer : null, author: {...row.author, full_name: row.author.full_name || 'Hội viên'},
      moderation: row.status === 'HIDDEN' ? {hidden_by: row.hidden_by, moderator_name: row.moderator_name || 'Admin', hidden_at: row.hidden_at, hidden_reason: row.hidden_reason} : null})), page: query.page, page_size: query.pageSize, total: stats.total};
  };
  return { list,
    scope: async (kind: 'gym' | 'trainer', id: string) => kind === 'gym'
      ? (await tx.select({gymId: gymReviews.gymId, targetId: gymReviews.gymId}).from(gymReviews).where(eq(gymReviews.gymReviewId, id)))[0]
      : (await tx.select({gymId: gymTrainers.gymId, targetId: gymTrainers.gymTrainerId}).from(trainerReviews).innerJoin(gymTrainers, eq(gymTrainers.gymTrainerId, trainerReviews.gymTrainerId)).where(eq(trainerReviews.trainerReviewId, id)))[0],
    hide: async (kind: 'gym' | 'trainer', id: string, actor: string, reason: string, scope: {gymId: string; targetId: string}) => {
      const table = kind === 'gym' ? gymReviews : trainerReviews, key = kind === 'gym' ? gymReviews.gymReviewId : trainerReviews.trainerReviewId;
      return (await tx.update(table).set({status: 'HIDDEN', hiddenBy: actor, hiddenAt: sql`clock_timestamp()`, hiddenReason: reason, updatedAt: sql`clock_timestamp()`})
        .where(and(eq(key, id), eq(table.status, 'VISIBLE'), kind === 'gym' ? eq(gymReviews.gymId, scope.gymId) : eq(trainerReviews.gymTrainerId, scope.targetId))).returning())[0];
    },
  };
};
