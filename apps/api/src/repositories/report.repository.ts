import { and, asc, count, desc, eq, gte, lte, sql, type SQL } from 'drizzle-orm';
import type { db } from '../database/index.js';
import { gymReports, gyms, memberships } from '../database/schema/index.js';
import type { ReportPage } from '../validators/report.validator.js';
export type ReportTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export const reportDto = (row: typeof gymReports.$inferSelect, name: string) => ({
  report_id: row.reportId, gym_id: row.gymId, gym_name: name, content: row.content, status: row.status,
  has_image: !!row.imageUrl, resolution_note: row.resolutionNote, created_at: row.createdAt.toISOString(),
  updated_at: row.updatedAt.toISOString(), resolved_at: row.resolvedAt?.toISOString() ?? null,
});
export const createReportRepository = (tx: ReportTransaction) => ({
  lockGym: async (id: string) => (await tx.select().from(gyms).where(eq(gyms.gymId, id)).for('no key update'))[0],
  eligible: async (actor: string, gymId: string) => (await tx.select({ id: memberships.membershipId }).from(memberships).where(and(
    eq(memberships.userId, actor), eq(memberships.gymId, gymId), eq(memberships.status, 'ACTIVE'),
    lte(memberships.startDate, sql`(clock_timestamp() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date`),
    gte(memberships.endDate, sql`(clock_timestamp() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date`))).for('share').limit(1)).length > 0,
  insert: async (input: typeof gymReports.$inferInsert) => (await tx.insert(gymReports).values(input).returning())[0],
  find: async (id: string) => (await tx.select({ report: gymReports, gymName: gyms.gymName }).from(gymReports)
    .innerJoin(gyms, eq(gyms.gymId, gymReports.gymId)).where(eq(gymReports.reportId, id)).for('share'))[0],
  list: async (filter: SQL, query: ReportPage) => {
    const where = and(filter, query.status ? eq(gymReports.status, query.status) : undefined);
    const [{ total }] = await tx.select({ total: count() }).from(gymReports).where(where);
    const rows = await tx.select({ report: gymReports, gymName: gyms.gymName }).from(gymReports)
      .innerJoin(gyms, eq(gyms.gymId, gymReports.gymId)).where(where).orderBy(desc(gymReports.createdAt), asc(gymReports.reportId))
      .limit(query.pageSize).offset((query.page - 1) * query.pageSize);
    return { rows, total };
  },
  change: async (gymId: string, id: string, body: Partial<typeof gymReports.$inferInsert>) => (await tx.update(gymReports)
    .set({ ...body, updatedAt: sql`clock_timestamp()` }).where(and(eq(gymReports.gymId, gymId), eq(gymReports.reportId, id))).returning())[0],
});
