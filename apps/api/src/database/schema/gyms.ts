import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  numeric,
  integer,
  time,
  foreignKey,
  unique,
  uniqueIndex,
  check,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users.js';

// 5. gyms
export const gyms = pgTable(
  'gyms',
  {
    gymId: uuid('gym_id').primaryKey().defaultRandom(),
    gymName: text('gym_name').notNull(),
    description: text('description'),
    phone: varchar('phone', { length: 20 }),
    email: varchar('email', { length: 254 }),
    address: text('address').notNull(),
    latitude: numeric('latitude', { precision: 9, scale: 6 }),
    longitude: numeric('longitude', { precision: 9, scale: 6 }),
    logoUrl: text('logo_url'),
    openingTime: time('opening_time', { precision: 0 }),
    closingTime: time('closing_time', { precision: 0 }),
    status: varchar('status', { length: 20 }).notNull().default('ACTIVE'),
    createdAt: timestamp('created_at', { precision: 3, withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { precision: 3, withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check('gyms_latitude_check', sql`latitude IS NULL OR (latitude >= -90 AND latitude <= 90)`),
    check('gyms_longitude_check', sql`longitude IS NULL OR (longitude >= -180 AND longitude <= 180)`),
    check('gyms_status_check', sql`status IN ('ACTIVE', 'INACTIVE')`),
  ]
);

// 6. gym_managers
export const gymManagers = pgTable(
  'gym_managers',
  {
    gymManagerId: uuid('gym_manager_id').primaryKey().defaultRandom(),
    gymId: uuid('gym_id').notNull(),
    userId: uuid('user_id').notNull(),
    assignedAt: timestamp('assigned_at', { precision: 3, withTimezone: true }).notNull().defaultNow(),
    status: varchar('status', { length: 20 }).notNull().default('ACTIVE'),
    createdAt: timestamp('created_at', { precision: 3, withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { precision: 3, withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      name: 'gym_managers_gym_fk',
      columns: [table.gymId],
      foreignColumns: [gyms.gymId],
    })
      .onDelete('restrict')
      .onUpdate('restrict'),
    foreignKey({
      name: 'gym_managers_user_fk',
      columns: [table.userId],
      foreignColumns: [users.userId],
    })
      .onDelete('restrict')
      .onUpdate('restrict'),
    unique('gym_managers_gym_user_key').on(table.gymId, table.userId),
    uniqueIndex('gym_managers_active_gym_key')
      .on(table.gymId)
      .where(sql`status = 'ACTIVE'`),
    uniqueIndex('gym_managers_active_user_key')
      .on(table.userId)
      .where(sql`status = 'ACTIVE'`),
    check('gym_managers_status_check', sql`status IN ('ACTIVE', 'INACTIVE')`),
    index('gym_managers_user_idx').on(table.userId),
  ]
);

// 7. gym_trainers
export const gymTrainers = pgTable(
  'gym_trainers',
  {
    gymTrainerId: uuid('gym_trainer_id').primaryKey().defaultRandom(),
    gymId: uuid('gym_id').notNull(),
    userId: uuid('user_id').notNull(),
    specialization: text('specialization'),
    experienceYears: integer('experience_years'),
    bio: text('bio'),
    status: varchar('status', { length: 20 }).notNull().default('ACTIVE'),
    joinedAt: timestamp('joined_at', { precision: 3, withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { precision: 3, withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { precision: 3, withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      name: 'gym_trainers_gym_fk',
      columns: [table.gymId],
      foreignColumns: [gyms.gymId],
    })
      .onDelete('restrict')
      .onUpdate('restrict'),
    foreignKey({
      name: 'gym_trainers_user_fk',
      columns: [table.userId],
      foreignColumns: [users.userId],
    })
      .onDelete('restrict')
      .onUpdate('restrict'),
    unique('gym_trainers_gym_user_key').on(table.gymId, table.userId),
    check('gym_trainers_experience_years_check', sql`experience_years IS NULL OR experience_years >= 0`),
    check('gym_trainers_status_check', sql`status IN ('ACTIVE', 'INACTIVE')`),
    index('gym_trainers_user_idx').on(table.userId),
  ]
);
