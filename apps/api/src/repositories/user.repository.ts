import { eq } from 'drizzle-orm';
import { db } from '../database/index.js';
import { users, roles, userRoles } from '../database/schema/index.js';
import type { User } from '../database/schema/index.js';

export type UserAccountState = Pick<User, 'userId' | 'status' | 'mustChangePassword'>;

// These reads are independent of session projections and do not enforce account policy.
export const createUserRepository = (database: typeof db) => ({
  findCurrentUserRoles: async (userId: string): Promise<string[]> => {
    const rows = await database.select({ roleName: roles.roleName }).from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.roleId))
      .where(eq(userRoles.userId, userId))
      .orderBy(roles.roleName);
    return rows.map((row) => row.roleName);
  },

  findAccountState: async (userId: string): Promise<UserAccountState | null> => {
    const [user] = await database.select({
      userId: users.userId,
      status: users.status,
      mustChangePassword: users.mustChangePassword,
    }).from(users).where(eq(users.userId, userId)).limit(1);
    return user ?? null;
  },
});

export const userRepository = createUserRepository(db);
