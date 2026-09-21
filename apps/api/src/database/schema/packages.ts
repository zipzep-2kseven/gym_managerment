import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  numeric,
  integer,
  foreignKey,
  unique,
  check,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { gyms } from './gyms.js';

// 8. packages
export const packages = pgTable(
  'packages',
  {
    packageId: uuid('package_id').primaryKey().defaultRandom(),
    gymId: uuid('gym_id').notNull(),
    packageName: text('package_name').notNull(),
    description: text('description'),
    durationDays: integer('duration_days').notNull(),
    price: numeric('price', { precision: 14, scale: 2 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('ACTIVE'),
    createdAt: timestamp('created_at', { precision: 3, withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { precision: 3, withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      name: 'packages_gym_fk',
      columns: [table.gymId],
      foreignColumns: [gyms.gymId],
    })
      .onDelete('restrict')
      .onUpdate('restrict'),
    unique('packages_package_gym_key').on(table.packageId, table.gymId),
    check('packages_duration_days_check', sql`duration_days > 0`),
    check('packages_price_check', sql`price >= 0 AND price <> 'NaN'::numeric`),
    check('packages_status_check', sql`status IN ('ACTIVE', 'INACTIVE')`),
    index('packages_gym_status_created_idx').on(table.gymId, table.status, table.createdAt.desc()),
  ]
);
