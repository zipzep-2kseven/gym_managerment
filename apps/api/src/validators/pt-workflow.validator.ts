import { z } from 'zod';
const uuid = z.uuid().transform(v => v.toLowerCase());
export const ptGymParams = z.object({ gymId: uuid }).strict();
export const ptResourceParams = z.object({ gymId: uuid, resourceId: uuid }).strict();
export const ptTrainerParams = z.object({ gymId: uuid, trainerId: uuid }).strict();
export const ptEmpty = z.object({}).strict();
const note = z.string().trim().min(1).max(2000);
export const ptRegisterInput = z.object({ membership_id: uuid, gym_trainer_id: uuid, note: note.optional() }).strict();
export const ptReason = z.object({ note }).strict();
export const ptOptionalNote = z.object({ note: note.optional() }).strict();
const instant = z.iso.datetime({ offset: true }).refine(v => Number.isFinite(Date.parse(v)), 'Thời gian không hợp lệ.');
export const ptTimes = z.object({ start_time: instant, end_time: instant, note: note.optional() }).strict();
export const ptAppointmentInput = ptTimes.extend({ registration_id: uuid });
export const ptAvailability = z.object({ availability: z.enum(['ACCEPTING', 'ALMOST_FULL', 'NOT_ACCEPTING']) }).strict();
export const ptPage = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1).max(1000000)).default(1),
  pageSize: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1).max(100)).default(20),
}).strict();
export type PtPage = z.infer<typeof ptPage>;
export type PtRegisterInput = z.infer<typeof ptRegisterInput>;
export type PtAppointmentInput = z.infer<typeof ptAppointmentInput>;
export type PtTimes = z.infer<typeof ptTimes>;
