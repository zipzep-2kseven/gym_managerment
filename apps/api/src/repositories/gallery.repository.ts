import { and, asc, eq, sql } from 'drizzle-orm';
import type { db } from '../database/index.js';
import { gymImages, gyms } from '../database/schema/index.js';
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export const galleryDto = (r: typeof gymImages.$inferSelect) => ({
  image_id: r.imageId, gym_id: r.gymId, caption: r.caption, display_order: r.displayOrder, updated_at: r.updatedAt.toISOString(),
});
export const createGalleryRepository = (tx: Transaction) => ({
  lockGym: async (id: string) => (await tx.select().from(gyms).where(eq(gyms.gymId, id)).for('no key update'))[0],
  publicGym: async (id: string) => (await tx.select().from(gyms).where(and(eq(gyms.gymId, id), eq(gyms.status, 'ACTIVE'))).for('share'))[0],
  list: (gymId: string) => tx.select().from(gymImages).where(eq(gymImages.gymId, gymId)).orderBy(asc(gymImages.displayOrder), asc(gymImages.createdAt), asc(gymImages.imageId)),
  find: async (gymId: string, id: string) => (await tx.select().from(gymImages).where(and(eq(gymImages.gymId, gymId), eq(gymImages.imageId, id))))[0],
  insert: async (input: typeof gymImages.$inferInsert) => (await tx.insert(gymImages).values(input).returning())[0],
  change: async (gymId: string, id: string, input: Partial<typeof gymImages.$inferInsert>) => (await tx.update(gymImages).set({ ...input, updatedAt: sql`clock_timestamp()` })
    .where(and(eq(gymImages.gymId, gymId), eq(gymImages.imageId, id))).returning())[0],
  remove: (gymId: string, id: string) => tx.delete(gymImages).where(and(eq(gymImages.gymId, gymId), eq(gymImages.imageId, id))),
});
