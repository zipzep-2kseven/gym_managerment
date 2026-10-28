import { and, eq } from 'drizzle-orm';
import { db } from '../database/index.js';
import { gyms, gymManagers, gymTrainers } from '../database/schema/index.js';
import type { Gym, GymManager, GymTrainer } from '../database/schema/index.js';

// Data access only; account, role and access policy belong to the calling service.
export const createGymRepository = (database: typeof db) => ({
  findById: async (gymId: string): Promise<Gym | null> => {
    const [gym] = await database.select().from(gyms)
      .where(eq(gyms.gymId, gymId)).limit(1);
    return gym ?? null;
  },

  findActiveManagerAssignment: async (userId: string, gymId: string): Promise<GymManager | null> => {
    const [assignment] = await database.select().from(gymManagers).where(and(
      eq(gymManagers.userId, userId),
      eq(gymManagers.gymId, gymId),
      eq(gymManagers.status, 'ACTIVE'),
    )).limit(1);
    return assignment ?? null;
  },

  findActiveTrainerAssignment: async (userId: string, gymId: string): Promise<GymTrainer | null> => {
    const [assignment] = await database.select().from(gymTrainers).where(and(
      eq(gymTrainers.userId, userId),
      eq(gymTrainers.gymId, gymId),
      eq(gymTrainers.status, 'ACTIVE'),
    )).limit(1);
    return assignment ?? null;
  },
});

export const gymRepository = createGymRepository(db);
