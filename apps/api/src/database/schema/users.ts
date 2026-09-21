import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  date,
  boolean,
  primaryKey,
  foreignKey,
  unique,
  check,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// 1. users
export const users = pgTable(
  'users',
  {
    userId: uuid('user_id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 254 }).notNull(),
    phone: varchar('phone', { length: 20 }),
    passwordHash: text('password_hash').notNull(),
    emailVerifiedAt: timestamp('email_verified_at', { precision: 3, withTimezone: true }),
    mustChangePassword: boolean('must_change_password').notNull().default(false),
    status: varchar('status', { length: 20 }).notNull().default('ACTIVE'),
    createdAt: timestamp('created_at', { precision: 3, withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { precision: 3, withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('users_email_key').on(table.email),
    unique('users_phone_key').on(table.phone),
    check('users_email_check', sql`email = lower(btrim(email)) AND email <> ''`),
    check('users_phone_check', sql`phone IS NULL OR btrim(phone) <> ''`),
    check('users_status_check', sql`status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')`),
  ]
);

// 2. user_profiles
export const userProfiles = pgTable(
  'user_profiles',
  {
    profileId: uuid('profile_id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    fullName: varchar('full_name', { length: 100 }).notNull(),
    dateOfBirth: date('date_of_birth'),
    gender: text('gender'),
    address: text('address'),
    avatarUrl: text('avatar_url'),
    createdAt: timestamp('created_at', { precision: 3, withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { precision: 3, withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      name: 'user_profiles_user_fk',
      columns: [table.userId],
      foreignColumns: [users.userId],
    })
      .onDelete('cascade')
      .onUpdate('restrict'),
    unique('user_profiles_user_key').on(table.userId),
    check('user_profiles_full_name_check', sql`char_length(btrim(full_name)) BETWEEN 2 AND 100`),
  ]
);

// 3. roles
export const roles = pgTable(
  'roles',
  {
    roleId: uuid('role_id').primaryKey().defaultRandom(),
    roleName: varchar('role_name', { length: 20 }).notNull(),
    description: text('description'),
  },
  (table) => [
    unique('roles_role_name_key').on(table.roleName),
    check('roles_role_name_check', sql`role_name IN ('ADMIN', 'MANAGER', 'PT', 'CUSTOMER')`),
  ]
);

// 4. user_roles
export const userRoles = pgTable(
  'user_roles',
  {
    userId: uuid('user_id').notNull(),
    roleId: uuid('role_id').notNull(),
    assignedAt: timestamp('assigned_at', { precision: 3, withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ name: 'user_roles_pkey', columns: [table.userId, table.roleId] }),
    foreignKey({
      name: 'user_roles_user_fk',
      columns: [table.userId],
      foreignColumns: [users.userId],
    })
      .onDelete('cascade')
      .onUpdate('restrict'),
    foreignKey({
      name: 'user_roles_role_fk',
      columns: [table.roleId],
      foreignColumns: [roles.roleId],
    })
      .onDelete('restrict')
      .onUpdate('restrict'),
    index('user_roles_role_idx').on(table.roleId),
  ]
);
