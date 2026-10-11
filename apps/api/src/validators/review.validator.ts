import { z } from 'zod';
export const reviewInput = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(2000, 'Nhận xét tối đa 2.000 ký tự.').nullable().optional().transform(v => v || null),
}).strict();
export const reviewParams = z.object({ gymId: z.uuid().transform(v => v.toLowerCase()), trainerId: z.uuid().transform(v => v.toLowerCase()).optional() }).strict();
const integer = (max: number) => z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1).max(max));
export const reviewQuery = z.object({ page: integer(100000).default(1), pageSize: integer(50).default(10) }).strict();
export type ReviewTarget = { kind: 'gym'; id: string } | { kind: 'trainer'; id: string; gymId?: string };
export const moderationQuery = z.object({ kind: z.enum(['gym', 'trainer']).default('gym'), gym_id: z.uuid().transform(v => v.toLowerCase()).optional(), status: z.enum(['VISIBLE', 'HIDDEN']).optional(), page: integer(100000).default(1), pageSize: integer(50).default(10) }).strict();
export const moderationParams = z.object({ kind: z.enum(['gym', 'trainer']), reviewId: z.uuid().transform(v => v.toLowerCase()) }).strict();
export const hideReviewInput = z.object({ hidden_reason: z.string().trim().min(1, 'Cần lý do ẩn đánh giá.').max(1000, 'Lý do tối đa 1.000 ký tự.') }).strict();
export type ModerationQuery = z.infer<typeof moderationQuery>;
