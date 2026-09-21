import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  foreignKey,
  check,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { memberships } from './memberships.js';
import { gymTrainers } from './gyms.js';

// 11. pt_registrations
export const ptRegistrations = pgTable(
  'pt_registrations',
  {
    registrationId: uuid('registration_id').primaryKey().defaultRandom(),
    membershipId: uuid('membership_id').notNull(),
    gymTrainerId: uuid('gym_trainer_id').notNull(),
    registeredAt: timestamp('registered_at', { precision: 3, withTimezone: true }).notNull().defaultNow(),
    status: varchar('status', { length: 20 }).notNull(),
    note: text('note'),
    createdAt: timestamp('created_at', { precision: 3, withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { precision: 3, withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      name: 'pt_registrations_membership_fk',
      columns: [table.membershipId],
      foreignColumns: [memberships.membershipId],
    })
      .onDelete('restrict')
      .onUpdate('restrict'),
    foreignKey({
      name: 'pt_registrations_gym_trainer_fk',
      columns: [table.gymTrainerId],
      foreignColumns: [gymTrainers.gymTrainerId],
    })
      .onDelete('restrict')
      .onUpdate('restrict'),
    check(
      'pt_registrations_status_check',
      sql`status IN ('ACTIVE', 'CANCELLED', 'COMPLETED')`
    ),
    index('pt_registrations_membership_idx').on(table.membershipId),
    index('pt_registrations_gym_trainer_idx').on(table.gymTrainerId),
  ]
);

// 12. pt_appointments
export const ptAppointments = pgTable(
  'pt_appointments',
  {
    appointmentId: uuid('appointment_id').primaryKey().defaultRandom(),
    registrationId: uuid('registration_id').notNull(),
    startTime: timestamp('start_time', { precision: 3, withTimezone: true }).notNull(),
    endTime: timestamp('end_time', { precision: 3, withTimezone: true }).notNull(),
    status: varchar('status', { length: 20 }).notNull(),
    note: text('note'),
    createdAt: timestamp('created_at', { precision: 3, withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { precision: 3, withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      name: 'pt_appointments_registration_fk',
      columns: [table.registrationId],
      foreignColumns: [ptRegistrations.registrationId],
    })
      .onDelete('restrict')
      .onUpdate('restrict'),
    check('pt_appointments_time_check', sql`end_time > start_time`),
    check(
      'pt_appointments_status_check',
      sql`status IN ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED')`
    ),
    index('pt_appointments_registration_start_idx').on(table.registrationId, table.startTime),
    index('pt_appointments_start_idx').on(table.startTime),
  ]
);
