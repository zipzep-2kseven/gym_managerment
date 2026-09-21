import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  date,
  foreignKey,
  unique,
  check,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { gyms } from './gyms.js';

// 13. equipment_types
export const equipmentTypes = pgTable('equipment_types', {
  equipmentTypeId: uuid('equipment_type_id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { precision: 3, withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { precision: 3, withTimezone: true }).notNull().defaultNow(),
});

// 14. equipments
export const equipments = pgTable(
  'equipments',
  {
    equipmentId: uuid('equipment_id').primaryKey().defaultRandom(),
    gymId: uuid('gym_id').notNull(),
    equipmentTypeId: uuid('equipment_type_id').notNull(),
    equipmentCode: text('equipment_code').notNull(),
    purchaseDate: date('purchase_date'),
    condition: varchar('condition', { length: 20 }).notNull(),
    status: varchar('status', { length: 20 }).notNull(),
    createdAt: timestamp('created_at', { precision: 3, withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { precision: 3, withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      name: 'equipments_gym_fk',
      columns: [table.gymId],
      foreignColumns: [gyms.gymId],
    })
      .onDelete('restrict')
      .onUpdate('restrict'),
    foreignKey({
      name: 'equipments_type_fk',
      columns: [table.equipmentTypeId],
      foreignColumns: [equipmentTypes.equipmentTypeId],
    })
      .onDelete('restrict')
      .onUpdate('restrict'),
    unique('equipments_gym_code_key').on(table.gymId, table.equipmentCode),
    unique('equipments_equipment_gym_key').on(table.equipmentId, table.gymId),
    check(
      'equipments_condition_check',
      sql`condition IN ('GOOD', 'MAINTENANCE', 'BROKEN', 'OUT_OF_SERVICE')`
    ),
    check('equipments_status_check', sql`status IN ('ACTIVE', 'INACTIVE')`),
    index('equipments_type_idx').on(table.equipmentTypeId),
  ]
);
