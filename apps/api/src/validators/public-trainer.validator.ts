import { z } from 'zod';

const positiveInteger = z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().positive().max(Number.MAX_SAFE_INTEGER));
export const publicTrainerQuerySchema = z.object({
  page: positiveInteger.default(1),
  pageSize: positiveInteger.pipe(z.number().max(100)).default(20),
  search: z.string().trim().optional(),
  sortBy: z.enum(['created_at', 'joined_at', 'full_name']).default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
}).strict().refine(value => Number.isSafeInteger((value.page - 1) * value.pageSize), {
  message: 'Phân trang vượt giới hạn.', path: ['page'],
});
export const publicTrainerParamsSchema = z.object({ gymId: z.uuid(), trainerId: z.uuid() });
export type PublicTrainerQuery = z.infer<typeof publicTrainerQuerySchema>;
