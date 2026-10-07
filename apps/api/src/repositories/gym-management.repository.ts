import { and, asc, count, desc, eq, ilike, or } from 'drizzle-orm';
import type { db } from '../database/index.js';
import { gyms, gymTrainers } from '../database/schema/index.js';
import type { ManagedGymQuery, ManagedTrainerQuery } from '../validators/gym-management.validator.js';

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
const pattern = (search: string) => `%${search.replace(/[\\%_]/g, '\\$&')}%`;
export const createGymManagementRepository = (tx: Transaction) => ({
  gyms: async (query: ManagedGymQuery) => {
    const filter = and(query.status ? eq(gyms.status, query.status) : undefined,
      query.search ? or(ilike(gyms.gymName, pattern(query.search)), ilike(gyms.address, pattern(query.search))) : undefined);
    const columns = { created_at: gyms.createdAt, gym_name: gyms.gymName, address: gyms.address };
    const order = query.sortOrder === 'asc' ? asc : desc;
    const [{ totalItems }] = await tx.select({ totalItems: count() }).from(gyms).where(filter);
    const data = await tx.select({ gym_id: gyms.gymId, gym_name: gyms.gymName, address: gyms.address,
      description: gyms.description, phone: gyms.phone, email: gyms.email, latitude: gyms.latitude, longitude: gyms.longitude,
      logo_url: gyms.logoUrl, opening_time: gyms.openingTime, closing_time: gyms.closingTime,
      status: gyms.status, created_at: gyms.createdAt, updated_at: gyms.updatedAt }).from(gyms).where(filter)
      .orderBy(order(columns[query.sortBy]), asc(gyms.gymId)).limit(query.pageSize).offset((query.page - 1) * query.pageSize);
    return { data, totalItems };
  },
  trainers: async (gymId: string, query: ManagedTrainerQuery) => {
    const filter = and(eq(gymTrainers.gymId, gymId), query.status ? eq(gymTrainers.status, query.status) : undefined,
      query.search ? or(ilike(gymTrainers.specialization, pattern(query.search)), ilike(gymTrainers.bio, pattern(query.search))) : undefined);
    const columns = { created_at: gymTrainers.createdAt, joined_at: gymTrainers.joinedAt, specialization: gymTrainers.specialization };
    const order = query.sortOrder === 'asc' ? asc : desc;
    const [{ totalItems }] = await tx.select({ totalItems: count() }).from(gymTrainers).where(filter);
    const data = await tx.select({ gym_trainer_id: gymTrainers.gymTrainerId, gym_id: gymTrainers.gymId,
      user_id: gymTrainers.userId, specialization: gymTrainers.specialization, experience_years: gymTrainers.experienceYears,
      bio: gymTrainers.bio, status: gymTrainers.status, availability: gymTrainers.availability,
      joined_at: gymTrainers.joinedAt, created_at: gymTrainers.createdAt, updated_at: gymTrainers.updatedAt })
      .from(gymTrainers).where(filter).orderBy(order(columns[query.sortBy]), asc(gymTrainers.gymTrainerId))
      .limit(query.pageSize).offset((query.page - 1) * query.pageSize);
    return { data, totalItems };
  },
});
