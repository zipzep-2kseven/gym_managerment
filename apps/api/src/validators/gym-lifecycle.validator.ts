import { z } from 'zod';
import { trainerProvisionSchema } from './staffing.validator.js';

export const lifecycleStatusSchema = z.object({ status: z.enum(['ACTIVE', 'INACTIVE']) }).strict();
export const trainerRouteSchema = z.object({ gymId: z.uuid(), trainerId: z.uuid() });
export const trainerAssignSchema = trainerProvisionSchema.pick({ specialization: true, experience_years: true, bio: true })
  .extend({ user_id: z.uuid() }).strict();
export type TrainerAssignInput = z.infer<typeof trainerAssignSchema>;
