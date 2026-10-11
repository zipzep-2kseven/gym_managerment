import { z } from 'zod';
import { ptPage } from './pt-workflow.validator.js';
export const reportInput = z.object({ content: z.string().trim().min(5).max(4000), image: z.object({
  mime_type: z.enum(['image/jpeg', 'image/png']), data: z.string().min(4).max(6990508).regex(/^[A-Za-z0-9+/]*={0,2}$/).refine(v => v.length % 4 === 0),
}).strict().optional() }).strict();
export const reportPage = ptPage.extend({ status: z.enum(['PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED']).optional() }).strict();
export const reportNote = z.object({ resolution_note: z.string().trim().min(1).max(2000) }).strict();
export type ReportPage = z.infer<typeof reportPage>;
