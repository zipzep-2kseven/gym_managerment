import { z } from 'zod';
import { ptPage } from './pt-workflow.validator.js';
const optionalText = (max: number) => z.string().trim().max(max).transform(v => v || null).optional();
export const consultationInput = z.object({
  full_name: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(20).transform(v => v.replace(/[ ().-]/g, '')).pipe(z.string().regex(/^\+?[0-9]{9,15}$/, 'Số điện thoại cần từ 9 đến 15 chữ số.')),
  content: optionalText(2000), preferred_contact: optionalText(200),
}).strict();
export const consultationStatus = z.enum(['PENDING', 'CONTACTED', 'COMPLETED', 'CANCELLED']);
export const consultationPage = ptPage.extend({ status: consultationStatus.optional() }).strict();
export const consultationUpdate = z.object({
  expected_status: consultationStatus, status: consultationStatus,
  processing_note: z.string().trim().max(2000).optional(),
}).strict().superRefine((body, ctx) => {
  if (body.status === 'CANCELLED' && !body.processing_note) ctx.addIssue({ code: 'custom', path: ['processing_note'], message: 'Hủy yêu cầu cần ghi lý do.' });
});
export type ConsultationPage = z.infer<typeof consultationPage>;
