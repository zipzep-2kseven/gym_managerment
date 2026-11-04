import { pgTable, uuid, varchar, text, timestamp, foreignKey, check, index } from 'drizzle-orm/pg-core';
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


