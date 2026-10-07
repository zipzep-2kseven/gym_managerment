import { and, asc, count, desc, eq, ilike, or } from 'drizzle-orm';
import { db } from '../database/index.js';
import { gyms } from '../database/schema/index.js';
import type { PublicGymQuery } from '../validators/public-gym.validator.js';

// Explicit projection: Gym contact details are public; no User/staff/member joins.
const publicColumns = {
  gym_id: gyms.gymId, gym_name: gyms.gymName, description: gyms.description,
  phone: gyms.phone, email: gyms.email, address: gyms.address,
  latitude: gyms.latitude, longitude: gyms.longitude, logo_url: gyms.logoUrl,
  opening_time: gyms.openingTime, closing_time: gyms.closingTime, status: gyms.status,
  created_at: gyms.createdAt, updated_at: gyms.updatedAt,
};
const sortColumns = { created_at: gyms.createdAt, gym_name: gyms.gymName, address: gyms.address };
export const createPublicGymRepository = (database: typeof db = db) => ({
  list: async (query: PublicGymQuery) => {
    // Treat %, _ and backslash as literal search characters, not LIKE wildcards.
    const pattern = `%${(query.search ?? '').replace(/[\\%_]/g, '\\$&')}%`;
    const filter = and(eq(gyms.status, 'ACTIVE'), query.search
      ? or(ilike(gyms.gymName, pattern), ilike(gyms.address, pattern)) : undefined);
    const order = query.sortOrder === 'asc' ? asc : desc;
    // Count and page share one snapshot, including during concurrent status changes.
    return database.transaction(async tx => {
      const [{ totalItems }] = await tx.select({ totalItems: count() }).from(gyms).where(filter);
      const data = await tx.select(publicColumns).from(gyms).where(filter)
        .orderBy(order(sortColumns[query.sortBy]), asc(gyms.gymId))
        .limit(query.pageSize).offset((query.page - 1) * query.pageSize);
      return { data, totalItems };
    }, { isolationLevel: 'repeatable read', accessMode: 'read only' });
  },
  findActive: async (gymId: string) => {
    const [gym] = await database.select(publicColumns).from(gyms)
      .where(and(eq(gyms.gymId, gymId), eq(gyms.status, 'ACTIVE'))).limit(1);
    return gym ?? null;
  },
});
