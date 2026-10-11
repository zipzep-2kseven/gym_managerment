import { and, eq, or, ilike, inArray, desc, asc, count, sql } from 'drizzle-orm';
import type { db } from '../database/index.js';
import { users, userProfiles, roles, userRoles, gyms, gymManagers, gymTrainers } from '../database/schema/index.js';
import type { AdminUserQuery } from '../validators/admin-user.validator.js';
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
const columns = {user_id: users.userId, email: users.email, phone: users.phone, status: users.status, must_change_password: users.mustChangePassword, email_verified_at: users.emailVerifiedAt, created_at: users.createdAt, updated_at: users.updatedAt, profile: {full_name: userProfiles.fullName, avatar_url: userProfiles.avatarUrl}};
export const createAdminUserRepository = (tx: Tx) => {
  const rows = (filter: ReturnType<typeof and>) => tx.select(columns).from(users).leftJoin(userProfiles, eq(userProfiles.userId,users.userId)).where(filter);
  const enrich = async (data: Awaited<ReturnType<typeof rows>>) => {
    if (!data.length) return [];
    const ids = data.map(row => row.user_id);
    const grants = await tx.select({userId: userRoles.userId, role: roles.roleName}).from(userRoles).innerJoin(roles,eq(roles.roleId,userRoles.roleId)).where(inArray(userRoles.userId,ids)).orderBy(asc(roles.roleName));
    const manager = await tx.select({userId: gymManagers.userId, gym_id: gyms.gymId, gym_name: gyms.gymName}).from(gymManagers).innerJoin(gyms,eq(gyms.gymId,gymManagers.gymId)).where(and(inArray(gymManagers.userId,ids),eq(gymManagers.status,'ACTIVE'))).orderBy(asc(gyms.gymName));
    const trainer = await tx.select({userId: gymTrainers.userId, gym_id: gyms.gymId, gym_name: gyms.gymName}).from(gymTrainers).innerJoin(gyms,eq(gyms.gymId,gymTrainers.gymId)).where(and(inArray(gymTrainers.userId,ids),eq(gymTrainers.status,'ACTIVE'))).orderBy(asc(gyms.gymName));
    return data.map(row => ({...row, roles: grants.filter(r=>r.userId===row.user_id).map(r=>r.role), active_gym_assignments: [...manager.filter(r=>r.userId===row.user_id).map(({userId: _userId,...r})=>({...r,assignment_type:'MANAGER' as const})),...trainer.filter(r=>r.userId===row.user_id).map(({userId: _userId,...r})=>({...r,assignment_type:'PT' as const}))]}));
  };
  return {
    lockAccounts: (ids: string[]) => tx.select({id: users.userId}).from(users).where(inArray(users.userId,[...new Set(ids)].sort())).orderBy(asc(users.userId)).for('update'),
    state: async (id: string) => (await tx.select({status: users.status, updatedAt: users.updatedAt}).from(users).where(eq(users.userId,id)))[0],
    view: async (id: string) => (await enrich(await rows(eq(users.userId,id))))[0],
    list: async (query: AdminUserQuery) => {
      const pattern = `%${(query.search || '').replace(/[\\%_]/g,'\\$&')}%`;
      const filter = and(query.status ? eq(users.status,query.status) : undefined, query.search ? or(ilike(users.email,pattern),ilike(userProfiles.fullName,pattern)) : undefined,
        query.role ? sql`exists(select 1 from ${userRoles} join ${roles} on ${roles.roleId}=${userRoles.roleId} where ${userRoles.userId}=${users.userId} and ${roles.roleName}=${query.role})` : undefined);
      const [stats] = await tx.select({total: count()}).from(users).leftJoin(userProfiles,eq(userProfiles.userId,users.userId)).where(filter);
      const data = await rows(filter).orderBy(desc(users.createdAt),asc(users.userId)).limit(query.pageSize).offset((query.page-1)*query.pageSize);
      return {items: await enrich(data), page: query.page, page_size: query.pageSize, total: stats.total};
    },
    roleList: () => tx.select({role_id: roles.roleId, role_name: roles.roleName, description: roles.description}).from(roles).orderBy(asc(roles.roleName)),
    setStatus: (id: string, status: string) => tx.update(users).set({status, updatedAt: sql`greatest(clock_timestamp(), ${users.updatedAt} + interval '1 millisecond')`}).where(eq(users.userId,id)),
  };
};
