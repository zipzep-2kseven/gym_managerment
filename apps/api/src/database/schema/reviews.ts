import { pgTable, uuid, varchar, text, integer, timestamp, foreignKey, check, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { gyms, gymTrainers } from './gyms.js';
import { users } from './users.js';

export const gymReviews = pgTable('gym_reviews', {
  gymReviewId: uuid('gym_review_id').primaryKey().defaultRandom(),
  gymId: uuid('gym_id').notNull(),
  userId: uuid('user_id').notNull(),
  rating: integer('rating').notNull(),
  comment: text('comment'),
  status: varchar('status', { length: 20 }).notNull().default('VISIBLE'),
  hiddenAt: timestamp('hidden_at', { precision: 3, withTimezone: true }),
  hiddenBy: uuid('hidden_by'),
  hiddenReason: text('hidden_reason'),
  createdAt: timestamp('created_at', { precision: 3, withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { precision: 3, withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  foreignKey({ name: 'gym_reviews_target_fk', columns: [t.gymId], foreignColumns: [gyms.gymId] }).onDelete('restrict').onUpdate('restrict'),
  foreignKey({ name: 'gym_reviews_user_fk', columns: [t.userId], foreignColumns: [users.userId] }).onDelete('restrict').onUpdate('restrict'),
  foreignKey({ name: 'gym_reviews_moderator_fk', columns: [t.hiddenBy], foreignColumns: [users.userId] }).onDelete('restrict').onUpdate('restrict'),
  check('gym_reviews_rating_check', sql`rating BETWEEN 1 AND 5`),
  check('gym_reviews_status_check', sql`status IN ('VISIBLE', 'HIDDEN')`),
  check('gym_reviews_moderation_check', sql`(status = 'VISIBLE' AND hidden_at IS NULL AND hidden_by IS NULL AND hidden_reason IS NULL) OR (status = 'HIDDEN' AND hidden_at IS NOT NULL AND hidden_by IS NOT NULL AND hidden_reason IS NOT NULL AND btrim(hidden_reason) <> '')`),
  index('gym_reviews_target_status_idx').on(t.gymId, t.status),
  index('gym_reviews_user_idx').on(t.userId),
  index('gym_reviews_moderator_idx').on(t.hiddenBy),
]);

export const trainerReviews = pgTable('trainer_reviews', {
  trainerReviewId: uuid('trainer_review_id').primaryKey().defaultRandom(),
  gymTrainerId: uuid('gym_trainer_id').notNull(),
  userId: uuid('user_id').notNull(),
  rating: integer('rating').notNull(),
  comment: text('comment'),
  status: varchar('status', { length: 20 }).notNull().default('VISIBLE'),
  hiddenAt: timestamp('hidden_at', { precision: 3, withTimezone: true }),
  hiddenBy: uuid('hidden_by'),
  hiddenReason: text('hidden_reason'),
  createdAt: timestamp('created_at', { precision: 3, withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { precision: 3, withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  foreignKey({ name: 'trainer_reviews_target_fk', columns: [t.gymTrainerId], foreignColumns: [gymTrainers.gymTrainerId] }).onDelete('restrict').onUpdate('restrict'),
  foreignKey({ name: 'trainer_reviews_user_fk', columns: [t.userId], foreignColumns: [users.userId] }).onDelete('restrict').onUpdate('restrict'),
  foreignKey({ name: 'trainer_reviews_moderator_fk', columns: [t.hiddenBy], foreignColumns: [users.userId] }).onDelete('restrict').onUpdate('restrict'),
  check('trainer_reviews_rating_check', sql`rating BETWEEN 1 AND 5`),
  check('trainer_reviews_status_check', sql`status IN ('VISIBLE', 'HIDDEN')`),
  check('trainer_reviews_moderation_check', sql`(status = 'VISIBLE' AND hidden_at IS NULL AND hidden_by IS NULL AND hidden_reason IS NULL) OR (status = 'HIDDEN' AND hidden_at IS NOT NULL AND hidden_by IS NOT NULL AND hidden_reason IS NOT NULL AND btrim(hidden_reason) <> '')`),
  index('trainer_reviews_target_status_idx').on(t.gymTrainerId, t.status),
  index('trainer_reviews_user_idx').on(t.userId),
  index('trainer_reviews_moderator_idx').on(t.hiddenBy),
]);

