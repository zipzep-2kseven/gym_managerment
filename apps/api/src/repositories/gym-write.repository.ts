import { eq, sql } from 'drizzle-orm';
import type { db } from '../database/index.js';
import { gyms } from '../database/schema/index.js';
import type { CreateGymInput, UpdateGymInput } from '../validators/gym-write.validator.js';

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
const fields = (input: UpdateGymInput) => ({
  gymName: input.gym_name, address: input.address, description: input.description,
  phone: input.phone, email: input.email, latitude: input.latitude, longitude: input.longitude,
  logoUrl: input.logo_url, openingTime: input.opening_time, closingTime: input.closing_time,
});
export const createGymWriteRepository = (tx: Transaction) => ({
  lockGym: async (gymId: string) => {
    await tx.execute(sql`SELECT gym_id FROM gyms WHERE gym_id = ${gymId} FOR NO KEY UPDATE`);
  },
  create: async (input: CreateGymInput) => {
    const [row] = await tx.insert(gyms).values({ ...fields(input), gymName: input.gym_name,
      address: input.address }).returning();
    return row;
  },
  update: async (gymId: string, input: UpdateGymInput) => {
    const [row] = await tx.update(gyms).set({ ...fields(input), updatedAt: sql`clock_timestamp()` })
      .where(eq(gyms.gymId, gymId)).returning();
    return row;
  },
});
