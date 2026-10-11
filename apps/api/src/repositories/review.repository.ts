import { and, eq, inArray, lte, sql, desc } from 'drizzle-orm';
import type { db } from '../database/index.js';
import { gymReviews, trainerReviews, memberships, ptRegistrations, ptAppointments, gymTrainers, gyms, users, userProfiles } from '../database/schema/index.js';
import type { ReviewTarget } from '../validators/review.validator.js';
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
export const createReviewRepository = (tx: Tx) => {
  const targetFilter = (target: ReviewTarget) => target.kind === 'gym' ? eq(gymReviews.gymId, target.id) : eq(trainerReviews.gymTrainerId, target.id);
  return {
    trainer: async (target: Extract<ReviewTarget, {kind: 'trainer'}>) => (await tx.select().from(gymTrainers).where(and(eq(gymTrainers.gymTrainerId, target.id), target.gymId ? eq(gymTrainers.gymId, target.gymId) : undefined)).for('share'))[0],
    resolveGym: async (target: ReviewTarget) => target.kind === 'gym' ? target.id : (await tx.select({ gym: gymTrainers.gymId }).from(gymTrainers).where(and(eq(gymTrainers.gymTrainerId, target.id), target.gymId ? eq(gymTrainers.gymId, target.gymId) : undefined)))[0]?.gym,
    gym: async (id: string, write: boolean) => (await tx.select().from(gyms).where(eq(gyms.gymId, id)).for(write ? 'no key update' : 'share'))[0],
    trainerAccount: async (actor: string) => (await tx.select({ status: users.status }).from(users).where(eq(users.userId, actor)).for('share'))[0],
    eligible: async (actor: string, gym: string, target: ReviewTarget) => {
      const filter = and(eq(memberships.userId, actor), eq(memberships.gymId, gym), inArray(memberships.status, ['ACTIVE', 'EXPIRED']), lte(memberships.startDate, sql`CURRENT_DATE`));
      if (target.kind === 'gym') return !!(await tx.select({ id: memberships.membershipId }).from(memberships).where(filter).for('share').limit(1)).length;
      return !!(await tx.select({ id: memberships.membershipId }).from(memberships)
        .innerJoin(ptRegistrations, eq(ptRegistrations.membershipId, memberships.membershipId))
        .innerJoin(ptAppointments, eq(ptAppointments.registrationId, ptRegistrations.registrationId))
        .where(and(filter, eq(ptRegistrations.gymTrainerId, target.id), inArray(ptRegistrations.status, ['ACTIVE', 'COMPLETED']), eq(ptAppointments.status, 'COMPLETED'))).for('share').limit(1)).length;
    },
    own: async (actor: string, target: ReviewTarget) => {
      const table = target.kind === 'gym' ? gymReviews : trainerReviews;
      return (await tx.select().from(table).where(and(targetFilter(target), eq(table.userId, actor))).orderBy(desc(table.createdAt)).limit(1))[0];
    },
    insert: async (actor: string, target: ReviewTarget, input: {rating: number; comment?: string | null}) => {
      const values = { userId: actor, ...input };
      return target.kind === 'gym'
        ? (await tx.insert(gymReviews).values({ ...values, gymId: target.id }).returning())[0]
        : (await tx.insert(trainerReviews).values({ ...values, gymTrainerId: target.id }).returning())[0];
    },
    list: async (target: ReviewTarget, page: number, pageSize: number) => {
      const table = target.kind === 'gym' ? gymReviews : trainerReviews;
      const id = target.kind === 'gym' ? gymReviews.gymReviewId : trainerReviews.trainerReviewId;
      const filter = and(targetFilter(target), eq(table.status, 'VISIBLE'));
      const [stats] = await tx.select({ total: sql<number>`count(*)::int`, average: sql<string | null>`avg(${table.rating})` }).from(table).where(filter);
      const items = await tx.select({ review_id: id, rating: table.rating, comment: table.comment, created_at: table.createdAt, author_name: userProfiles.fullName })
        .from(table).leftJoin(userProfiles, eq(userProfiles.userId, table.userId)).where(filter)
        .orderBy(desc(table.createdAt), desc(id)).limit(pageSize).offset((page - 1) * pageSize);
      return { items: items.map(r => ({ ...r, author_name: r.author_name || 'Hội viên' })), page, page_size: pageSize, total: stats.total,
        average_rating: stats.average === null ? null : Math.round(Number(stats.average) * 10) / 10 };
    },
  };
};
