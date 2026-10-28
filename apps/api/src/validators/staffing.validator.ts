import { z } from 'zod';
import { registerSchema } from '../utils/validators.js';

const identity = registerSchema.pick({ email: true, full_name: true, phone: true });
export const managerProvisionSchema = identity.extend({ gym_id: z.uuid() }).strict();
export const trainerProvisionSchema = identity.extend({
  specialization: z.string().trim().optional(),
  experience_years: z.number().int().min(0).max(2147483647).optional(),
  bio: z.string().optional(),
}).strict();
export const managerAssignSchema = z.object({ user_id: z.uuid() }).strict();
export const emptyBodySchema = z.object({}).strict();
export const gymParamsSchema = z.object({ gymId: z.uuid() });
export const managerParamsSchema = gymParamsSchema.extend({ managerId: z.uuid() });
export type ManagerProvisionInput = z.infer<typeof managerProvisionSchema>;
export type TrainerProvisionInput = z.infer<typeof trainerProvisionSchema>;
