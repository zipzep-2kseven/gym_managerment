import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import * as schema from '../src/database/schema/index.js';
import { pool as appPool } from '../src/database/index.js';
import { testGymWriteIntegration } from './gym-write.integration.test.js';
import { testStaffingIntegration } from './staffing.integration.test.js';
const admin = new pg.Client({ connectionString: process.env.DATABASE_URL });
await admin.connect();
const name = `gym_onboarding_${randomUUID().replaceAll('-', '')}`;
await admin.query(`CREATE DATABASE "${name}"`);
const url = new URL(process.env.DATABASE_URL!); url.pathname = `/${name}`;
const pool = new pg.Pool({ connectionString: url.toString() });
const db = drizzle(pool, { schema });
try {
  await migrate(db, { migrationsFolder: fileURLToPath(new URL('../drizzle', import.meta.url)) });
  await db.insert(schema.roles).values(['ADMIN', 'MANAGER', 'PT', 'CUSTOMER'].map(roleName => ({ roleName })));
  console.log(`PASS: ${await testGymWriteIntegration(db)} Gym write/onboarding cases on full migration chain.`);
  console.log(`PASS: ${await testStaffingIntegration(db)} staffing regression cases.`);
} finally {
  await pool.end(); await appPool.end();
  await admin.query(`DROP DATABASE "${name}"`); await admin.end();
}
