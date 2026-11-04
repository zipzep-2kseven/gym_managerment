import { and, asc, eq, sql } from 'drizzle-orm';
import type { db } from '../database/index.js';
import { gymTrainers, gyms, userProfiles, ptSocialLinks } from '../database/schema/index.js';
import type { TrainerOwnInput } from '../validators/trainer-profile.validator.js';
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
      return { gym_id: row.gymId, gym_trainer_id: row.gymTrainerId, specialization: row.specialization, experience_years: row.experienceYears,
        bio: row.bio, availability: row.availability, status: row.status, updated_at: row.updatedAt.toISOString(), profile: profile ?? null,
        social_links: links.map(r => ({ platform: r.platform, url: r.url })) };
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
    },
  };
};
