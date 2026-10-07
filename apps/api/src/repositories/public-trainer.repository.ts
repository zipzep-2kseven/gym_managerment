import { and, asc, count, desc, eq, ilike, inArray, or } from 'drizzle-orm';
import { db } from '../database/index.js';
import { gyms, gymTrainers, userProfiles, ptSocialLinks, ptWorkingSchedules } from '../database/schema/index.js';
import type { PublicTrainerQuery } from '../validators/public-trainer.validator.js';

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
const columns = {
  gym_trainer_id: gymTrainers.gymTrainerId, gym_id: gymTrainers.gymId,
  specialization: gymTrainers.specialization, experience_years: gymTrainers.experienceYears,
  bio: gymTrainers.bio, status: gymTrainers.status, availability: gymTrainers.availability,
  joined_at: gymTrainers.joinedAt,
  profile: { full_name: userProfiles.fullName, avatar_url: userProfiles.avatarUrl },
};
const sortColumns = { created_at: gymTrainers.createdAt, joined_at: gymTrainers.joinedAt, full_name: userProfiles.fullName };
const selectTrainers = (tx: Transaction) => tx.select(columns).from(gymTrainers)
  .leftJoin(userProfiles, eq(userProfiles.userId, gymTrainers.userId));
const enrich = async <T extends { gym_trainer_id: string }>(tx: Transaction, rows: T[]) => {
  const ids = rows.map(row => row.gym_trainer_id);
  if (!ids.length) return [];
  // Two batch reads per page, not a query per PT; never select the full User/profile.
  const links = await tx.select({ social_link_id: ptSocialLinks.socialLinkId,
    gym_trainer_id: ptSocialLinks.gymTrainerId, platform: ptSocialLinks.platform, url: ptSocialLinks.url,
    created_at: ptSocialLinks.createdAt, updated_at: ptSocialLinks.updatedAt }).from(ptSocialLinks)
    .where(inArray(ptSocialLinks.gymTrainerId, ids)).orderBy(ptSocialLinks.platform, ptSocialLinks.socialLinkId);
  const schedules = await tx.select({ schedule_id: ptWorkingSchedules.scheduleId,
    gym_trainer_id: ptWorkingSchedules.gymTrainerId, day_of_week: ptWorkingSchedules.dayOfWeek,
    start_time: ptWorkingSchedules.startTime, end_time: ptWorkingSchedules.endTime, status: ptWorkingSchedules.status,
    created_at: ptWorkingSchedules.createdAt, updated_at: ptWorkingSchedules.updatedAt }).from(ptWorkingSchedules)
    .where(and(inArray(ptWorkingSchedules.gymTrainerId, ids), eq(ptWorkingSchedules.status, 'ACTIVE')))
    .orderBy(ptWorkingSchedules.dayOfWeek, ptWorkingSchedules.startTime, ptWorkingSchedules.scheduleId);
  return rows.map(row => ({ ...row, social_links: links.filter(link => link.gym_trainer_id === row.gym_trainer_id),
    working_schedules: schedules.filter(schedule => schedule.gym_trainer_id === row.gym_trainer_id) }));
};
export const createPublicTrainerRepository = (database: typeof db = db) => {
  const read = <T>(gymId: string, run: (tx: Transaction) => Promise<T>) => database.transaction(async tx => {
    const [gym] = await tx.select({ id: gyms.gymId }).from(gyms)
      .where(and(eq(gyms.gymId, gymId), eq(gyms.status, 'ACTIVE')));
    if (!gym) return null;
    // Parent visibility, PT page and children use the same read-only snapshot.
    return run(tx);
  }, { isolationLevel: 'repeatable read', accessMode: 'read only' });
  return {
    list: (gymId: string, query: PublicTrainerQuery) => read(gymId, async tx => {
      const pattern = `%${(query.search ?? '').replace(/[\\%_]/g, '\\$&')}%`;
      const filter = and(eq(gymTrainers.gymId, gymId), eq(gymTrainers.status, 'ACTIVE'), query.search
        ? or(ilike(userProfiles.fullName, pattern), ilike(gymTrainers.specialization, pattern)) : undefined);
      const [{ totalItems }] = await tx.select({ totalItems: count() }).from(gymTrainers)
        .leftJoin(userProfiles, eq(userProfiles.userId, gymTrainers.userId)).where(filter);
      const order = query.sortOrder === 'asc' ? asc : desc;
      const rows = await selectTrainers(tx).where(filter)
        .orderBy(order(sortColumns[query.sortBy]), asc(gymTrainers.gymTrainerId))
        .limit(query.pageSize).offset((query.page - 1) * query.pageSize);
      return { data: await enrich(tx, rows), totalItems };
    }),
    detail: (gymId: string, trainerId: string) => read(gymId, async tx => {
      const rows = await selectTrainers(tx).where(and(eq(gymTrainers.gymId, gymId),
        eq(gymTrainers.gymTrainerId, trainerId), eq(gymTrainers.status, 'ACTIVE'))).limit(1);
      return (await enrich(tx, rows))[0] ?? null;
    }),
  };
};
