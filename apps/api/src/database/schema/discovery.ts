import { pgTable, uuid, varchar, text, integer, timestamp, date, time, foreignKey, check, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { gyms, gymTrainers } from './gyms.js';
import { users } from './users.js';

export const gymImages = pgTable('gym_images', {
  imageId: uuid('image_id').primaryKey().defaultRandom(),
  gymId: uuid('gym_id').notNull(),
  imageUrl: text('image_url').notNull(),
  caption: text('caption'),
  displayOrder: integer('display_order').notNull().default(0),
  createdAt: timestamp('created_at', { precision: 3, withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { precision: 3, withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  foreignKey({ name: 'gym_images_gym_fk', columns: [t.gymId], foreignColumns: [gyms.gymId] }).onDelete('restrict').onUpdate('restrict'),
  check('gym_images_order_check', sql`display_order >= 0`),
  check('gym_images_url_check', sql`btrim(image_url) <> ''`),
  index('gym_images_gym_order_idx').on(t.gymId, t.displayOrder),
]);

export const consultationRequests = pgTable('consultation_requests', {
  consultationRequestId: uuid('consultation_request_id').primaryKey().defaultRandom(),
  userId: uuid('user_id'),
  gymId: uuid('gym_id').notNull(),
  fullName: varchar('full_name', { length: 100 }).notNull(),
  phone: varchar('phone', { length: 20 }).notNull(),
  email: varchar('email', { length: 254 }),
  preferredDate: date('preferred_date'),
  preferredTime: time('preferred_time', { precision: 0 }),
  content: text('content'),
  status: varchar('status', { length: 20 }).notNull().default('PENDING'),
  assignedTo: uuid('assigned_to'),
  createdAt: timestamp('created_at', { precision: 3, withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { precision: 3, withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  foreignKey({ name: 'consultation_requests_gym_fk', columns: [t.gymId], foreignColumns: [gyms.gymId] }).onDelete('restrict').onUpdate('restrict'),
  foreignKey({ name: 'consultation_requests_user_fk', columns: [t.userId], foreignColumns: [users.userId] }).onDelete('restrict').onUpdate('restrict'),
  foreignKey({ name: 'consultation_requests_assignee_fk', columns: [t.assignedTo], foreignColumns: [users.userId] }).onDelete('restrict').onUpdate('restrict'),
  check('consultation_requests_status_check', sql`status IN ('PENDING', 'CONTACTED', 'COMPLETED', 'CANCELLED')`),
  check('consultation_requests_contact_check', sql`btrim(full_name) <> '' AND btrim(phone) <> ''`),
  index('consultation_requests_gym_status_idx').on(t.gymId, t.status),
  index('consultation_requests_user_idx').on(t.userId),
  index('consultation_requests_assignee_idx').on(t.assignedTo),
]);

