import { z } from 'zod';

export const packageGymParamsSchema = z.object({ gymId: z.uuid() }).strict();
export const packageParamsSchema = packageGymParamsSchema.extend({ packageId: z.uuid() });
export const emptyPackageInputSchema = z.object({}).strict();

// Money crosses the API as decimal text. Never round a binary floating point
// value or let PostgreSQL silently round a third fractional digit.
const priceSchema = z.string().trim().regex(/^\d{1,12}(?:\.\d{1,2})?$/,
  'Giá phải là chuỗi thập phân không âm, tối đa 12 chữ số nguyên và 2 chữ số lẻ.')
  .transform(value => {
    const [whole, fraction = ''] = value.split('.');
    return `${whole.replace(/^0+(?=\d)/, '')}.${fraction.padEnd(2, '0')}`;
  });

export const createPackageSchema = z.object({
  package_name: z.string().trim().min(1),
  duration_days: z.number().int().positive().max(2147483647),
  price: priceSchema,
  description: z.string().nullable().optional(),
}).strict();
export const updatePackageSchema = createPackageSchema.partial().refine(
  value => Object.values(value).some(field => field !== undefined),
  { message: 'Cần ít nhất một trường để cập nhật.' },
);

const positiveInteger = z.string().regex(/^\d+$/).transform(Number)
  .pipe(z.number().int().positive().max(Number.MAX_SAFE_INTEGER));
const query = z.object({
  page: positiveInteger.default(1),
  pageSize: positiveInteger.pipe(z.number().max(100)).default(20),
  search: z.string().trim().optional(),
  sortBy: z.enum(['created_at', 'package_name', 'duration_days', 'price']).default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
const safeOffset = (value: { page: number; pageSize: number }) =>
  Number.isSafeInteger((value.page - 1) * value.pageSize);
const offsetError = { message: 'Phân trang vượt giới hạn.', path: ['page'] };
export const publicPackageQuerySchema = query.strict().refine(safeOffset, offsetError);
export const managedPackageQuerySchema = query.extend({
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
}).strict().refine(safeOffset, offsetError);

export type CreatePackageInput = z.infer<typeof createPackageSchema>;
export type UpdatePackageInput = z.infer<typeof updatePackageSchema>;
export type PackageQuery = z.infer<typeof managedPackageQuerySchema>;
