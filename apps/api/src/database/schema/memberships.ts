import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  numeric,
  date,
  foreignKey,
  unique,
  check,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users.js';
import { gyms } from './gyms.js';
import { packages } from './packages.js';
import { payments } from './payments.js';

// 10. memberships
export const memberships = pgTable(
  'memberships',
  {
    membershipId: uuid('membership_id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    gymId: uuid('gym_id').notNull(),
    packageId: uuid('package_id').notNull(),
    paymentId: uuid('payment_id'),
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
    purchasePrice: numeric('purchase_price', { precision: 14, scale: 2 }).notNull(),
    status: varchar('status', { length: 20 }).notNull(),
    createdAt: timestamp('created_at', { precision: 3, withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { precision: 3, withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      name: 'memberships_user_fk',
      columns: [table.userId],
      foreignColumns: [users.userId],
    })
      .onDelete('restrict')
      .onUpdate('restrict'),
    foreignKey({
      name: 'memberships_gym_fk',
      columns: [table.gymId],
      foreignColumns: [gyms.gymId],
    })
      .onDelete('restrict')
      .onUpdate('restrict'),
    foreignKey({
      name: 'memberships_package_gym_fk',
      columns: [table.packageId, table.gymId],
      foreignColumns: [packages.packageId, packages.gymId],
    })
      .onDelete('restrict')
      .onUpdate('restrict'),
    foreignKey({
      name: 'memberships_payment_source_fk',
      columns: [table.paymentId, table.userId, table.gymId, table.packageId],
      foreignColumns: [
        payments.paymentId,
        payments.userId,
        payments.gymId,
        payments.packageId,
      ],
    })
      .onDelete('restrict')
      .onUpdate('restrict'),
    unique('memberships_payment_id_key').on(table.paymentId),
    check('memberships_end_date_check', sql`end_date >= start_date`),
    check(
      'memberships_purchase_price_check',
      sql`purchase_price >= 0 AND purchase_price <> 'NaN'::numeric`
    ),
    check(
      'memberships_status_check',
      sql`status IN ('PENDING', 'ACTIVE', 'EXPIRED', 'CANCELLED')`
    ),
    index('memberships_user_created_idx').on(table.userId, table.createdAt.desc()),
    index('memberships_gym_status_created_idx').on(
      table.gymId,
      table.status,
      table.createdAt.desc()
    ),
    index('memberships_package_gym_idx').on(table.packageId, table.gymId),
  ]
);
