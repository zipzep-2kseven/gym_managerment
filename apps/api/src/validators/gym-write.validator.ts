import { z } from 'zod';
import { managerProvisionSchema } from './staffing.validator.js';

const coordinate = (min: number, max: number) => z.union([
  z.number(), z.string().trim().regex(/^-?\d+(?:\.\d+)?$/),
]).transform(Number).pipe(z.number().min(min).max(max)).transform(String).nullable().optional();
const time = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/)
  .transform(value => value.length === 5 ? `${value}:00` : value).nullable().optional();
const gymFieldsSchema = z.object({
  gym_name: z.string().trim().min(1),
  address: z.string().trim().min(1),
  description: z.string().nullable().optional(),
  phone: z.string().trim().min(1).max(20).nullable().optional(),
  email: z.string().trim().toLowerCase().email().max(254).nullable().optional(),
  latitude: coordinate(-90, 90),
  longitude: coordinate(-180, 180),
  logo_url: z.url({ protocol: /^https?$/ }).nullable().optional(),
  opening_time: time,
  closing_time: time,
}).strict();
export const createGymSchema = gymFieldsSchema.extend({
  manager: managerProvisionSchema.omit({ gym_id: true }).strict().optional(),
}).strict();
export const updateGymSchema = gymFieldsSchema.partial().refine(
  value => Object.values(value).some(field => field !== undefined),
  { message: 'Cần ít nhất một trường để cập nhật.' },
);
export type CreateGymInput = z.infer<typeof createGymSchema>;
export type UpdateGymInput = z.infer<typeof updateGymSchema>;
