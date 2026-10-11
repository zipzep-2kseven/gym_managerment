import { and, count, desc, eq } from 'drizzle-orm';
import type { db } from '../database/index.js';
import { gyms, packages, payments, memberships } from '../database/schema/index.js';
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export const createPaymentRepository = (tx: Transaction) => ({
  gym: async (id: string) => (await tx.select().from(gyms).where(eq(gyms.gymId, id)).for('share'))[0],
  package: async (gymId: string, id: string) => (await tx.select().from(packages)
    .where(and(eq(packages.gymId, gymId), eq(packages.packageId, id))).for('share'))[0],
  payment: async (userId: string, id: string, gymId?: string) => (await tx.select().from(payments)
    .where(and(eq(payments.userId, userId), eq(payments.paymentId, id), gymId ? eq(payments.gymId, gymId) : undefined)))[0],
  membership: async (userId: string, gymId: string, paymentId: string) => (await tx.select().from(memberships)
    .where(and(eq(memberships.userId, userId), eq(memberships.gymId, gymId), eq(memberships.paymentId, paymentId))))[0],
  insertPayment: (input: typeof payments.$inferInsert) => tx.insert(payments).values(input).onConflictDoNothing().returning(),
  insertMembership: async (input: typeof memberships.$inferInsert) => (await tx.insert(memberships).values(input).returning())[0],
  listPayments: async (userId: string, page: number, pageSize: number) => ({
    rows: await tx.select().from(payments).where(eq(payments.userId, userId)).orderBy(desc(payments.createdAt), payments.paymentId).limit(pageSize).offset((page - 1) * pageSize),
    total: (await tx.select({ total: count() }).from(payments).where(eq(payments.userId, userId)))[0].total,
  }),
  listMemberships: async (userId: string, page: number, pageSize: number) => ({
    rows: await tx.select().from(memberships).leftJoin(payments, and(eq(payments.paymentId, memberships.paymentId), eq(payments.userId, memberships.userId), eq(payments.gymId, memberships.gymId))).where(eq(memberships.userId, userId)).orderBy(desc(memberships.createdAt), memberships.membershipId).limit(pageSize).offset((page - 1) * pageSize),
    total: (await tx.select({ total: count() }).from(memberships).where(eq(memberships.userId, userId)))[0].total,
  }),
});
