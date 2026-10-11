import { and, asc, count, desc, eq, ilike, or, sql } from 'drizzle-orm';
import type { db } from '../database/index.js';
import { gyms, packages } from '../database/schema/index.js';
import type { CreatePackageInput, UpdatePackageInput, PackageQuery } from '../validators/package.validator.js';

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
const columns = {
  package_id: packages.packageId, gym_id: packages.gymId,
  package_name: packages.packageName, description: packages.description,
  duration_days: packages.durationDays, price: packages.price, status: packages.status,
  created_at: packages.createdAt, updated_at: packages.updatedAt,
};
const sortColumns = {
  created_at: packages.createdAt, package_name: packages.packageName,
  duration_days: packages.durationDays, price: packages.price,
};
const fields = (input: UpdatePackageInput) => ({
  packageName: input.package_name, durationDays: input.duration_days,
  price: input.price, description: input.description,
});

export const createPackageRepository = (tx: Transaction) => ({
  lockGym: async (gymId: string) => {
    await tx.select({ gymId: gyms.gymId }).from(gyms)
      .where(eq(gyms.gymId, gymId)).for('share');
  },
  findPublicGym: async (gymId: string) => {
    const [gym] = await tx.select({ gymId: gyms.gymId }).from(gyms)
      .where(and(eq(gyms.gymId, gymId), eq(gyms.status, 'ACTIVE')));
    return gym ?? null;
  },
  list: async (gymId: string, query: PackageQuery, publicOnly: boolean) => {
    const pattern = `%${(query.search ?? '').replace(/[\\%_]/g, '\\$&')}%`;
    const filter = and(eq(packages.gymId, gymId),
      publicOnly ? eq(packages.status, 'ACTIVE') : query.status ? eq(packages.status, query.status) : undefined,
      query.search ? or(ilike(packages.packageName, pattern), ilike(packages.description, pattern)) : undefined);
    const order = query.sortOrder === 'asc' ? asc : desc;
    const [{ totalItems }] = await tx.select({ totalItems: count() }).from(packages).where(filter);
    const data = await tx.select(columns).from(packages).where(filter)
      .orderBy(order(sortColumns[query.sortBy]), asc(packages.packageId))
      .limit(query.pageSize).offset((query.page - 1) * query.pageSize);
    return { data, totalItems };
  },
  publicDetail: async (gymId: string, packageId: string) => {
    const [row] = await tx.select(columns).from(packages).where(and(
      eq(packages.gymId, gymId), eq(packages.packageId, packageId), eq(packages.status, 'ACTIVE')));
    return row ?? null;
  },
  create: async (gymId: string, input: CreatePackageInput) => {
    const [row] = await tx.insert(packages).values({ gymId, ...fields(input),
      packageName: input.package_name, durationDays: input.duration_days, price: input.price }).returning();
    return row;
  },
  update: async (gymId: string, packageId: string, input: UpdatePackageInput) => {
    const [row] = await tx.update(packages).set({ ...fields(input), updatedAt: sql`clock_timestamp()` })
      .where(and(eq(packages.gymId, gymId), eq(packages.packageId, packageId))).returning();
    return row ?? null;
  },
  setStatus: async (gymId: string, packageId: string, status: 'ACTIVE' | 'INACTIVE') => {
    const [row] = await tx.update(packages).set({ status, updatedAt: sql`clock_timestamp()` })
      .where(and(eq(packages.gymId, gymId), eq(packages.packageId, packageId))).returning();
    return row ?? null;
  },
});
