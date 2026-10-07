import { and, eq, lte, gte, sql } from 'drizzle-orm';
import { db } from '../database/index.js';
import { memberships, gymTrainers, ptRegistrations } from '../database/schema/index.js';
import { staffingDatabaseError } from './staffing-errors.js';
import { AppError } from '../utils/errors.js';

// actorId comes from the authenticated server context. No PT price/payment is created.
export const createPtRegistrationService = (database: typeof db) => ({
  register: async (actorId: string, membershipId: string, gymTrainerId: string, note?: string) =>
    database.transaction(async (tx) => {
      // Follow lifecycle lock order before membership/trainer row locks.
      const [scope] = await tx.select({ gymId: memberships.gymId }).from(memberships)
        .where(and(eq(memberships.membershipId, membershipId), eq(memberships.userId, actorId)));
      if (scope) await tx.execute(sql`SELECT gym_id FROM gyms WHERE gym_id = ${scope.gymId} FOR NO KEY UPDATE`);
      const [membership] = await tx.select().from(memberships).where(and(
        eq(memberships.membershipId, membershipId), eq(memberships.userId, actorId),
        eq(memberships.status, 'ACTIVE'), lte(memberships.startDate, sql`CURRENT_DATE`),
        gte(memberships.endDate, sql`CURRENT_DATE`),
      )).for('share');
      if (!membership) throw new AppError(403, 'MEMBERSHIP_REQUIRED', 'Cần Membership đang hoạt động của Customer.');
      const [trainer] = await tx.select().from(gymTrainers).where(and(
        eq(gymTrainers.gymTrainerId, gymTrainerId), eq(gymTrainers.gymId, membership.gymId),
        eq(gymTrainers.status, 'ACTIVE'),
      )).for('share');
      if (!trainer) throw new AppError(400, 'TRAINER_GYM_MISMATCH', 'PT phải hoạt động tại cùng Gym với Membership.');
      return (await tx.insert(ptRegistrations).values({ membershipId, gymTrainerId, status: 'ACTIVE', note }).returning())[0];
    }).catch(staffingDatabaseError),
});

export const ptRegistrationService = createPtRegistrationService(db);
