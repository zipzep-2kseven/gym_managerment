import { and, asc, count, desc, eq, sql } from 'drizzle-orm';
import type { db } from '../database/index.js';
import { consultationRequests, gyms } from '../database/schema/index.js';
import type { ConsultationPage } from '../validators/consultation.validator.js';
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export const consultationDto = (r: typeof consultationRequests.$inferSelect) => ({
  consultation_request_id: r.consultationRequestId, gym_id: r.gymId, full_name: r.fullName,
  phone: r.phone, content: r.content, preferred_contact: r.preferredContact,
  processing_note: r.processingNote, status: r.status,
  created_at: r.createdAt.toISOString(), updated_at: r.updatedAt.toISOString(),
});
export const createConsultationRepository = (tx: Transaction) => ({
  lockGym: async (id: string) => (await tx.select().from(gyms).where(eq(gyms.gymId, id)).for('no key update'))[0],
  insert: async (input: typeof consultationRequests.$inferInsert) => (await tx.insert(consultationRequests).values(input).returning())[0],
  list: async (gymId: string, query: ConsultationPage) => {
    const where = and(eq(consultationRequests.gymId, gymId), query.status ? eq(consultationRequests.status, query.status) : undefined);
    const [{ total }] = await tx.select({ total: count() }).from(consultationRequests).where(where);
    const rows = await tx.select().from(consultationRequests).where(where)
      .orderBy(desc(consultationRequests.createdAt), asc(consultationRequests.consultationRequestId))
      .limit(query.pageSize).offset((query.page - 1) * query.pageSize);
    return { rows, total };
  },
  find: async (gymId: string, id: string) => (await tx.select().from(consultationRequests).where(and(
    eq(consultationRequests.gymId, gymId), eq(consultationRequests.consultationRequestId, id))).for('update'))[0],
  change: async (gymId: string, id: string, status: string, note?: string) => (await tx.update(consultationRequests)
    .set({ status, ...(note !== undefined ? { processingNote: note || null } : {}), updatedAt: sql`clock_timestamp()` })
    .where(and(eq(consultationRequests.gymId, gymId), eq(consultationRequests.consultationRequestId, id))).returning())[0],
});
