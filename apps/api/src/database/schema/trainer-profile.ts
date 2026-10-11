import { pgTable, uuid, varchar, text, timestamp, time, foreignKey, check, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { gymTrainers } from './gyms.js';

export const ptSocialLinks = pgTable('pt_social_links', {
  socialLinkId: uuid('social_link_id').primaryKey().defaultRandom(),
  gymTrainerId: uuid('gym_trainer_id').notNull(),
  platform: varchar('platform', { length: 20 }).notNull(),
  url: text('url').notNull(),
  createdAt: timestamp('created_at', { precision: 3, withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { precision: 3, withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  foreignKey({ name: 'pt_social_links_trainer_fk', columns: [t.gymTrainerId], foreignColumns: [gymTrainers.gymTrainerId] }).onDelete('restrict').onUpdate('restrict'),
  check('pt_social_links_platform_check', sql`platform IN ('FACEBOOK', 'INSTAGRAM', 'YOUTUBE', 'TIKTOK', 'WEBSITE')`),
  check('pt_social_links_url_check', sql`btrim(url) <> ''`),
  index('pt_social_links_trainer_idx').on(t.gymTrainerId),
]);

export const ptWorkingSchedules = pgTable('pt_working_schedules', {
  scheduleId: uuid('schedule_id').primaryKey().defaultRandom(),
  gymTrainerId: uuid('gym_trainer_id').notNull(),
  dayOfWeek: varchar('day_of_week', { length: 20 }).notNull(),
  startTime: time('start_time', { precision: 0 }).notNull(),
  endTime: time('end_time', { precision: 0 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('ACTIVE'),
  createdAt: timestamp('created_at', { precision: 3, withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { precision: 3, withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  foreignKey({ name: 'pt_working_schedules_trainer_fk', columns: [t.gymTrainerId], foreignColumns: [gymTrainers.gymTrainerId] }).onDelete('restrict').onUpdate('restrict'),
  check('pt_working_schedules_day_check', sql`day_of_week IN ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY')`),
  check('pt_working_schedules_time_check', sql`end_time > start_time`),
  check('pt_working_schedules_status_check', sql`status IN ('ACTIVE', 'INACTIVE')`),
  index('pt_working_schedules_trainer_day_idx').on(t.gymTrainerId, t.dayOfWeek),
]);

