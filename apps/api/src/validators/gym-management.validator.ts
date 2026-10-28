import { z } from 'zod';

const positiveInteger = z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().positive().max(Number.MAX_SAFE_INTEGER));
const base = z.object({
  page: positiveInteger.default(1),
  pageSize: positiveInteger.pipe(z.number().max(100)).default(20),
  search: z.string().trim().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
const safeOffset = (value: { page: number; pageSize: number }) => Number.isSafeInteger((value.page - 1) * value.pageSize);
const offsetError = { message: 'Phân trang vượt giới hạn.', path: ['page'] };
export const managedGymQuerySchema = base.extend({
  sortBy: z.enum(['created_at', 'gym_name', 'address']).default('created_at'),
}).strict().refine(safeOffset, offsetError);
export const managedTrainerQuerySchema = base.extend({
  sortBy: z.enum(['created_at', 'joined_at', 'specialization']).default('created_at'),
}).strict().refine(safeOffset, offsetError);
export type ManagedGymQuery = z.infer<typeof managedGymQuerySchema>;
export type ManagedTrainerQuery = z.infer<typeof managedTrainerQuerySchema>;
