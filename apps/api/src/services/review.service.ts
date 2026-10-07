import { and, eq, inArray, lte, sql } from 'drizzle-orm';
import { db } from '../database/index.js';
import { gymReviews, trainerReviews, memberships, ptRegistrations, gymTrainers, users, roles, userRoles } from '../database/schema/index.js';
import { AppError, ValidationError } from '../utils/errors.js';

type ReviewTarget = { kind: 'gym'; id: string } | { kind: 'trainer'; id: string };
type ReviewInput = { rating: number; comment?: string | null };
type Database = typeof db;

// actorId must come from authenticated server context, never request body.
// No edit/delete method is exposed: review text and moderation history are retained.
export const createReviewService = (database: Database) => ({
  create: async (actorId: string, target: ReviewTarget, input: ReviewInput) => {
    if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
      throw new ValidationError('Rating phải là số nguyên từ 1 đến 5.');
    }
    return database.transaction(async (tx) => {
      const [actor] = await tx.select().from(users).where(and(eq(users.userId, actorId), eq(users.status, 'ACTIVE')));
      if (!actor) throw new AppError(403, 'REVIEW_FORBIDDEN', 'Tài khoản không hoạt động.');
      const eligibleMembership = and(
        eq(memberships.userId, actorId),
        inArray(memberships.status, ['ACTIVE', 'EXPIRED']),
        lte(memberships.startDate, sql`CURRENT_DATE`),
      );
      const eligible = target.kind === 'gym'
        ? await tx.select({ id: memberships.membershipId }).from(memberships)
          .where(and(eligibleMembership, eq(memberships.gymId, target.id))).limit(1)
        : await tx.select({ id: memberships.membershipId }).from(memberships)
          .innerJoin(ptRegistrations, eq(ptRegistrations.membershipId, memberships.membershipId))
          .innerJoin(gymTrainers, eq(gymTrainers.gymTrainerId, ptRegistrations.gymTrainerId))
          .where(and(eligibleMembership, eq(gymTrainers.gymTrainerId, target.id),
            eq(memberships.gymId, gymTrainers.gymId), inArray(ptRegistrations.status, ['ACTIVE', 'COMPLETED']))).limit(1);
      if (!eligible.length) throw new AppError(403, 'REVIEW_NOT_ELIGIBLE', 'Chưa có quan hệ sử dụng Gym/PT hợp lệ.');
      const values = { userId: actorId, rating: input.rating, comment: input.comment };
      if (target.kind === 'gym') return (await tx.insert(gymReviews).values({ ...values, gymId: target.id }).returning())[0];
      return (await tx.insert(trainerReviews).values({ ...values, gymTrainerId: target.id }).returning())[0];
    });
  },
  hide: async (actorId: string, kind: ReviewTarget['kind'], reviewId: string, reason: string) => {
    if (!reason.trim()) throw new ValidationError('Phải ghi lý do ẩn review.');
    return database.transaction(async (tx) => {
      const [admin] = await tx.select({ id: users.userId }).from(users)
        .innerJoin(userRoles, eq(userRoles.userId, users.userId))
        .innerJoin(roles, eq(roles.roleId, userRoles.roleId))
        .where(and(eq(users.userId, actorId), eq(users.status, 'ACTIVE'), eq(roles.roleName, 'ADMIN'))).limit(1);
      if (!admin) throw new AppError(403, 'REVIEW_MODERATION_FORBIDDEN', 'Chỉ Admin được ẩn review.');
      const table = kind === 'gym' ? gymReviews : trainerReviews;
      const id = kind === 'gym' ? gymReviews.gymReviewId : trainerReviews.trainerReviewId;
      const [review] = await tx.update(table).set({ status: 'HIDDEN', hiddenBy: actorId,
        hiddenAt: new Date(), hiddenReason: reason.trim(), updatedAt: new Date() })
        .where(and(eq(id, reviewId), eq(table.status, 'VISIBLE'))).returning();
      if (!review) throw new AppError(409, 'REVIEW_NOT_VISIBLE', 'Review không tồn tại hoặc đã bị ẩn.');
      return review;
    });
  },
});

export const reviewService = createReviewService(db);
