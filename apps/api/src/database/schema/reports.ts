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
import { users } from './users.js';
import { gyms } from './gyms.js';
import { equipments } from './equipments.js';

// 15. gym_reports
export const gymReports = pgTable(
  'gym_reports',
  {
    reportId: uuid('report_id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    gymId: uuid('gym_id').notNull(),
    equipmentId: uuid('equipment_id'),
    reportType: varchar('report_type', { length: 20 }).notNull(),
    title: text('title').notNull(),
    content: text('content').notNull(),
    imageUrl: text('image_url'),
    status: varchar('status', { length: 20 }).notNull().default('PENDING'),
    resolvedBy: uuid('resolved_by'),
    resolvedAt: timestamp('resolved_at', { precision: 3, withTimezone: true }),
    resolutionNote: text('resolution_note'),
    createdAt: timestamp('created_at', { precision: 3, withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { precision: 3, withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      name: 'gym_reports_user_fk',
      columns: [table.userId],
      foreignColumns: [users.userId],
    })
      .onDelete('restrict')
      .onUpdate('restrict'),
    foreignKey({
      name: 'gym_reports_gym_fk',
      columns: [table.gymId],
      foreignColumns: [gyms.gymId],
    })
      .onDelete('restrict')
      .onUpdate('restrict'),
    foreignKey({
      name: 'gym_reports_equipment_gym_fk',
      columns: [table.equipmentId, table.gymId],
      foreignColumns: [equipments.equipmentId, equipments.gymId],
    })
      .onDelete('restrict')
      .onUpdate('restrict'),
    foreignKey({
      name: 'gym_reports_resolver_fk',
      columns: [table.resolvedBy],
      foreignColumns: [users.userId],
    })
      .onDelete('set null')
      .onUpdate('restrict'),
    check(
      'gym_reports_report_type_check',
      sql`report_type IN ('EQUIPMENT', 'FACILITY', 'CLEANLINESS', 'SERVICE', 'OTHER')`
    ),
    check(
      'gym_reports_status_check',
      sql`status IN ('PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED')`
    ),
    index('gym_reports_gym_status_created_idx').on(
      table.gymId,
      table.status,
      table.createdAt.desc()
    ),
    index('gym_reports_gym_type_created_idx').on(
      table.gymId,
      table.reportType,
      table.createdAt.desc()
    ),
    index('gym_reports_equipment_gym_idx').on(table.equipmentId, table.gymId),
    index('gym_reports_user_created_idx').on(table.userId, table.createdAt.desc()),
    index('gym_reports_resolver_idx').on(table.resolvedBy),
  ]
);
