import { and, eq, sql } from 'drizzle-orm';
import type { db } from '../database/index.js';
import { users, userProfiles, userRoles, roles, gyms, gymManagers, gymTrainers } from '../database/schema/index.js';
import type { TrainerProvisionInput } from '../validators/staffing.validator.js';

// Transaction-only adapter: lock authorization facts until the write commits.
// Existing GYM-01 repositories and policy remain unchanged.
type Database = Pick<typeof db, 'select' | 'insert' | 'update'>;
export const createStaffingRepository = (tx: Database) => ({
  findAccountState: async (userId: string) => {
    const [row] = await tx.select({ userId: users.userId, status: users.status,
      mustChangePassword: users.mustChangePassword }).from(users)
      .where(eq(users.userId, userId)).for('share');
    return row ?? null;
  },
  findCurrentUserRoles: async (userId: string) => {
    const rows = await tx.select({ name: roles.roleName }).from(userRoles)
      .innerJoin(roles, eq(roles.roleId, userRoles.roleId))
      .where(eq(userRoles.userId, userId)).for('share');
    return rows.map((row) => row.name);
  },
  findById: async (gymId: string) => {
    const [row] = await tx.select().from(gyms).where(eq(gyms.gymId, gymId)).for('share');
    return row ?? null;
  },
  findActiveManagerAssignment: async (userId: string, gymId: string) => {
    const [row] = await tx.select().from(gymManagers).where(and(eq(gymManagers.userId, userId),
      eq(gymManagers.gymId, gymId), eq(gymManagers.status, 'ACTIVE'))).for('share');
    return row ?? null;
  },
  findActiveTrainerAssignment: async (userId: string, gymId: string) => {
    const [row] = await tx.select().from(gymTrainers).where(and(eq(gymTrainers.userId, userId),
      eq(gymTrainers.gymId, gymId), eq(gymTrainers.status, 'ACTIVE'))).for('share');
    return row ?? null;
  },
  findRole: async (name: 'MANAGER' | 'PT') => {
    const [row] = await tx.select().from(roles).where(eq(roles.roleName, name)).for('share');
    return row ?? null;
  },
  createAccount: async (input: TrainerProvisionInput, passwordHash: string, roleId: string) => {
    const [user] = await tx.insert(users).values({ email: input.email, phone: input.phone,
      passwordHash, status: 'ACTIVE', mustChangePassword: true }).returning();
    await tx.insert(userProfiles).values({ userId: user.userId, fullName: input.full_name });
    await tx.insert(userRoles).values({ userId: user.userId, roleId });
    return user;
  },
  createManager: async (gymId: string, userId: string) => {
    const [row] = await tx.insert(gymManagers).values({ gymId, userId }).returning();
    return row;
  },
  createTrainer: async (gymId: string, userId: string, input: Pick<TrainerProvisionInput, 'specialization' | 'experience_years' | 'bio'>) => {
    const [row] = await tx.insert(gymTrainers).values({ gymId, userId,
      specialization: input.specialization, experienceYears: input.experience_years, bio: input.bio }).returning();
    return row;
  },
  findManagerPair: async (gymId: string, userId: string) => {
    const [row] = await tx.select().from(gymManagers).where(and(eq(gymManagers.gymId, gymId),
      eq(gymManagers.userId, userId))).for('update');
    return row ?? null;
  },
  reactivateManager: async (id: string) => {
    const [row] = await tx.update(gymManagers).set({ status: 'ACTIVE',
      assignedAt: sql`clock_timestamp()`, updatedAt: sql`clock_timestamp()` })
      .where(eq(gymManagers.gymManagerId, id)).returning();
    return row;
  },
  listManagers: (gymId: string) => tx.select().from(gymManagers)
    .where(eq(gymManagers.gymId, gymId)).orderBy(gymManagers.assignedAt, gymManagers.gymManagerId),
  findManager: async (gymId: string, id: string) => {
    const [row] = await tx.select().from(gymManagers).where(and(eq(gymManagers.gymId, gymId),
      eq(gymManagers.gymManagerId, id))).for('update');
    return row ?? null;
  },
  revokeManager: async (id: string) => {
    const [row] = await tx.update(gymManagers).set({ status: 'INACTIVE', updatedAt: sql`clock_timestamp()` })
      .where(eq(gymManagers.gymManagerId, id)).returning();
    return row;
  },
});
