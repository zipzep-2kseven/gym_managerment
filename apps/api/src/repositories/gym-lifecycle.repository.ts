import { and, eq, sql } from 'drizzle-orm';
import type { db } from '../database/index.js';
import { gyms, gymTrainers } from '../database/schema/index.js';

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export const createGymLifecycleRepository = (tx: Transaction) => ({
  lockGym: async (gymId: string) => {
    await tx.execute(sql`SELECT gym_id FROM gyms WHERE gym_id = ${gymId} FOR NO KEY UPDATE`);
  },
  findTrainer: async (gymId: string, trainerId: string) => {
    const [row] = await tx.select().from(gymTrainers).where(and(eq(gymTrainers.gymId, gymId),
      eq(gymTrainers.gymTrainerId, trainerId))).for('update');
    return row;
  },
  setGymStatus: async (gymId: string, status: 'ACTIVE' | 'INACTIVE') => {
    const [row] = await tx.update(gyms).set({ status, updatedAt: sql`clock_timestamp()` })
      .where(eq(gyms.gymId, gymId)).returning();
    return row;
  },
  setTrainerStatus: async (trainerId: string, status: 'ACTIVE' | 'INACTIVE') => {
    const [row] = await tx.update(gymTrainers).set({ status, updatedAt: sql`clock_timestamp()` })
      .where(eq(gymTrainers.gymTrainerId, trainerId)).returning();
    return row;
  },
});
