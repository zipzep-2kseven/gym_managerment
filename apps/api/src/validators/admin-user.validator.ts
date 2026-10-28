import { z } from 'zod';
const integer = (max: number) => z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1).max(max));
export const adminUserQuery = z.object({search: z.string().trim().max(100).optional(), role: z.enum(['ADMIN','MANAGER','PT','CUSTOMER']).optional(), status: z.enum(['ACTIVE','INACTIVE','SUSPENDED']).optional(), page: integer(100000).default(1), pageSize: integer(50).default(20)}).strict();
export const adminUserStatusInput = z.object({status: z.enum(['ACTIVE','INACTIVE','SUSPENDED']), expected_updated_at: z.iso.datetime({offset: true}).transform(value => new Date(value).toISOString())}).strict();
export const adminUserParams = z.object({userId: z.uuid().transform(v => v.toLowerCase())}).strict();
export type AdminUserQuery = z.infer<typeof adminUserQuery>;
