import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  numeric,
  foreignKey,
  unique,
  check,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users.js';
import { gyms } from './gyms.js';
import { packages } from './packages.js';

// 9. payments
export const payments = pgTable(
  'payments',
  {
    paymentId: uuid('payment_id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    gymId: uuid('gym_id').notNull(),
    packageId: uuid('package_id').notNull(),
    amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
    paymentMethod: text('payment_method').notNull(),
    transactionCode: text('transaction_code'),
    paymentStatus: varchar('payment_status', { length: 20 }).notNull().default('PENDING'),
    paidAt: timestamp('paid_at', { precision: 3, withTimezone: true }),
    createdAt: timestamp('created_at', { precision: 3, withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { precision: 3, withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      name: 'payments_user_fk',
      columns: [table.userId],
      foreignColumns: [users.userId],
    })
      .onDelete('restrict')
      .onUpdate('restrict'),
    foreignKey({
      name: 'payments_gym_fk',
      columns: [table.gymId],
      foreignColumns: [gyms.gymId],
    })
      .onDelete('restrict')
      .onUpdate('restrict'),
    foreignKey({
      name: 'payments_package_gym_fk',
      columns: [table.packageId, table.gymId],
      foreignColumns: [packages.packageId, packages.gymId],
    })
      .onDelete('restrict')
      .onUpdate('restrict'),
    unique('payments_transaction_code_key').on(table.transactionCode),
    unique('payments_payment_user_gym_package_key').on(
      table.paymentId,
      table.userId,
      table.gymId,
      table.packageId
    ),
    check('payments_amount_check', sql`amount >= 0 AND amount <> 'NaN'::numeric`),
    check(
      'payments_transaction_code_check',
      sql`transaction_code IS NULL OR btrim(transaction_code) <> ''`
    ),
    check(
      'payments_payment_status_check',
      sql`payment_status IN ('PENDING', 'SUCCESS', 'FAILED', 'CANCELLED', 'REFUNDED')`
    ),
    index('payments_user_created_idx').on(table.userId, table.createdAt.desc()),
    index('payments_gym_status_created_idx').on(
      table.gymId,
      table.paymentStatus,
      table.createdAt.desc()
    ),
    index('payments_package_gym_idx').on(table.packageId, table.gymId),
  ]
);
