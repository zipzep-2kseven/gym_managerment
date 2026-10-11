import { and, asc, eq, sql } from 'drizzle-orm';
import type { db } from '../database/index.js';
import { gymTrainers, gyms, userProfiles, ptSocialLinks, ptWorkingSchedules } from '../database/schema/index.js';
import { trainerDays, type TrainerOwnInput } from '../validators/trainer-profile.validator.js';
export type TrainerProfileTx = Parameters<Parameters<typeof db.transaction>[0]>[0];
export const createTrainerProfileRepository = (tx: TrainerProfileTx) => {
  const find = async (gym: string, id: string) => (await tx.select().from(gymTrainers).where(and(eq(gymTrainers.gymId, gym), eq(gymTrainers.gymTrainerId, id))).for('share'))[0];
  return {
    find,
    own: async (actor: string) => (await tx.select().from(gymTrainers).where(and(eq(gymTrainers.userId, actor), eq(gymTrainers.status, 'ACTIVE'))))[0],
    lockGym: async (gym: string) => (await tx.select().from(gyms).where(eq(gyms.gymId, gym)).for('no key update'))[0],
    view: async (gym: string, id: string) => {
      const row = await find(gym, id); if (!row) return null;
      const [profile] = await tx.select({ full_name: userProfiles.fullName, avatar_url: userProfiles.avatarUrl }).from(userProfiles).where(eq(userProfiles.userId, row.userId));
      const links = await tx.select().from(ptSocialLinks).where(eq(ptSocialLinks.gymTrainerId, id)).orderBy(asc(ptSocialLinks.platform), asc(ptSocialLinks.socialLinkId));
      const slots = await tx.select().from(ptWorkingSchedules).where(and(eq(ptWorkingSchedules.gymTrainerId, id), eq(ptWorkingSchedules.status, 'ACTIVE'))).orderBy(asc(ptWorkingSchedules.startTime), asc(ptWorkingSchedules.scheduleId));
      slots.sort((a, b) => trainerDays.indexOf(a.dayOfWeek as typeof trainerDays[number]) - trainerDays.indexOf(b.dayOfWeek as typeof trainerDays[number]) || a.startTime.localeCompare(b.startTime));
      return { gym_id: row.gymId, gym_trainer_id: row.gymTrainerId, specialization: row.specialization, experience_years: row.experienceYears,
        bio: row.bio, availability: row.availability, status: row.status, updated_at: row.updatedAt.toISOString(), profile: profile ?? null,
        social_links: links.map(r => ({ platform: r.platform, url: r.url })), working_schedules: slots.map(r => ({ day_of_week: r.dayOfWeek, start_time: r.startTime.slice(0, 5), end_time: r.endTime.slice(0, 5) })) };
    },
    update: (gym: string, id: string, input: Partial<typeof gymTrainers.$inferInsert>) => tx.update(gymTrainers).set({ ...input, updatedAt: sql`greatest(clock_timestamp(), ${gymTrainers.updatedAt} + interval '1 millisecond')` }).where(and(eq(gymTrainers.gymId, gym), eq(gymTrainers.gymTrainerId, id))),
    saveChildren: async (id: string, body: TrainerOwnInput) => {
      const links = await tx.select().from(ptSocialLinks).where(eq(ptSocialLinks.gymTrainerId, id));
      for (const old of links) if (!body.social_links.some(r => r.platform === old.platform)) await tx.delete(ptSocialLinks).where(and(eq(ptSocialLinks.gymTrainerId, id), eq(ptSocialLinks.socialLinkId, old.socialLinkId)));
      for (const input of body.social_links) {
        const existing = links.filter(r => r.platform === input.platform);
        if (!existing.length) await tx.insert(ptSocialLinks).values({ gymTrainerId: id, ...input });
        else {
          await tx.update(ptSocialLinks).set({ url: input.url, updatedAt: sql`clock_timestamp()` }).where(and(eq(ptSocialLinks.gymTrainerId, id), eq(ptSocialLinks.socialLinkId, existing[0].socialLinkId)));
          for (const duplicate of existing.slice(1)) await tx.delete(ptSocialLinks).where(and(eq(ptSocialLinks.gymTrainerId, id), eq(ptSocialLinks.socialLinkId, duplicate.socialLinkId)));
        }
      }
      const slots = await tx.select().from(ptWorkingSchedules).where(eq(ptWorkingSchedules.gymTrainerId, id));
      await tx.update(ptWorkingSchedules).set({ status: 'INACTIVE', updatedAt: sql`clock_timestamp()` }).where(and(eq(ptWorkingSchedules.gymTrainerId, id), eq(ptWorkingSchedules.status, 'ACTIVE')));
      for (const input of body.working_schedules) {
        const previous = slots.find(r => r.dayOfWeek === input.day_of_week && r.startTime === `${input.start_time}:00` && r.endTime === `${input.end_time}:00`);
        if (previous) await tx.update(ptWorkingSchedules).set({ status: 'ACTIVE', updatedAt: sql`clock_timestamp()` }).where(and(eq(ptWorkingSchedules.gymTrainerId, id), eq(ptWorkingSchedules.scheduleId, previous.scheduleId)));
        else await tx.insert(ptWorkingSchedules).values({ gymTrainerId: id, dayOfWeek: input.day_of_week, startTime: input.start_time, endTime: input.end_time });
      }
    },
  };
};
