import { z } from 'zod';
export const paymentGymParams = z.object({ gymId: z.uuid().transform(value => value.toLowerCase()) }).strict();
export const paymentIdParams = z.object({ paymentId: z.uuid().transform(value => value.toLowerCase()) }).strict();
export const demoPaymentInput = z.object({ package_id: z.uuid().transform(value => value.toLowerCase()), payment_method: z.string().trim().min(1).max(80) }).strict();
export const paymentKey = z.uuid().transform(value => value.toLowerCase());
export const paymentListQuery = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1).max(1000000)).default(1),
  pageSize: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1).max(100)).default(20),
}).strict();
export const emptyPaymentQuery = z.object({}).strict();
export type DemoPaymentInput = z.infer<typeof demoPaymentInput>;
