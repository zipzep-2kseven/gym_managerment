// Browser acceptance fixture: all writes and migrations target a disposable DB.
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { hash } from '@node-rs/argon2';
import pg from 'pg';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import '../src/config/index.js';

const admin = new pg.Client({ connectionString: process.env.DATABASE_URL });
await admin.connect();
const databaseName = `gym03_browser_${randomUUID().replaceAll('-', '')}`;
await admin.query(`CREATE DATABASE "${databaseName}"`);
const url = new URL(process.env.DATABASE_URL!);
url.pathname = `/${databaseName}`;
process.env.DATABASE_URL = url.toString();
const reportImages = await mkdtemp(join(tmpdir(), 'gym03-report-images-'));
process.env.REPORT_UPLOAD_DIR = reportImages;
process.env.GALLERY_UPLOAD_DIR = join(reportImages, 'gallery');
const { db, pool } = await import('../src/database/index.js');
let server: import('node:http').Server | undefined;
let cleaned = false;
const cleanup = async () => {
  if (cleaned) return;
  cleaned = true;
  if (server) await new Promise<void>(resolve => server!.close(() => resolve()));
  await pool.end();
  await admin.query(`DROP DATABASE "${databaseName}" WITH (FORCE)`);
  await admin.end();
  await rm(reportImages, { recursive: true, force: true });
  if (process.env.BROWSER_FIXTURE_INFO_PATH) await rm(process.env.BROWSER_FIXTURE_INFO_PATH, { force: true });
};
try {
  await migrate(db, { migrationsFolder: fileURLToPath(new URL('../drizzle', import.meta.url)) });
  await pool.query("INSERT INTO roles(role_name) VALUES ('ADMIN'),('MANAGER'),('PT'),('CUSTOMER')");
  const passwordHash = await hash('BrowserFixture@123'); // Disposable test users only.
  const actorIds: string[] = [];
  for (const role of ['ADMIN', 'MANAGER', 'PT', 'CUSTOMER']) {
    const row = (await pool.query('INSERT INTO users(email,password_hash) VALUES ($1,$2) RETURNING user_id', [`${role.toLowerCase()}@gym03.test`, passwordHash])).rows[0] as { user_id: string };
    actorIds.push(row.user_id);
    await pool.query('INSERT INTO user_roles(user_id,role_id) SELECT $1,role_id FROM roles WHERE role_name=$2', [row.user_id, role]);
    await pool.query('INSERT INTO user_profiles(user_id,full_name) VALUES ($1,$2)', [row.user_id, `Browser ${role}`]);
  }
  const gym = (await pool.query("INSERT INTO gyms(gym_name,address,opening_time,closing_time) VALUES ('Browser Gym','Địa chỉ kiểm thử','06:00','22:00') RETURNING gym_id")).rows[0] as { gym_id: string };
  await pool.query('INSERT INTO gym_managers(gym_id,user_id) VALUES ($1,$2)', [gym.gym_id, actorIds[1]]);
  await pool.query("INSERT INTO gym_trainers(gym_id,user_id,specialization,experience_years,bio) VALUES ($1,$2,'Sức mạnh',3,'Giới thiệu PT')", [gym.gym_id, actorIds[2]]);
  if (process.env.PT_WORKFLOW_FIXTURE === 'true') {
    await pool.query("INSERT INTO packages(gym_id,package_name,duration_days,price) VALUES($1,'PT Demo',30,150000)", [gym.gym_id]);
  }
  if (process.env.REVIEW_FIXTURE === 'true') {
    // Historical use exists only in the disposable review browser database.
    const packageRow = (await pool.query("SELECT package_id FROM packages WHERE gym_id=$1 LIMIT 1", [gym.gym_id])).rows[0];
    const trainerRow = (await pool.query("SELECT gym_trainer_id FROM gym_trainers WHERE gym_id=$1", [gym.gym_id])).rows[0];
    const member = (await pool.query("INSERT INTO memberships(user_id,gym_id,package_id,start_date,end_date,purchase_price,status) VALUES($1,$2,$3,'2020-01-01','2099-12-31',150000,'ACTIVE') RETURNING membership_id", [actorIds[3], gym.gym_id, packageRow.package_id])).rows[0];
    const registration = (await pool.query("INSERT INTO pt_registrations(membership_id,gym_trainer_id,status) VALUES($1,$2,'ACTIVE') RETURNING registration_id", [member.membership_id, trainerRow.gym_trainer_id])).rows[0];
    await pool.query("INSERT INTO pt_appointments(registration_id,start_time,end_time,status) VALUES($1,NOW()-interval '2 days',NOW()-interval '2 days'+interval '1 hour','COMPLETED')", [registration.registration_id]);
  }
  if (process.env.BROWSER_FIXTURE_INFO_PATH) {
    await mkdir(dirname(process.env.BROWSER_FIXTURE_INFO_PATH), { recursive: true });
    await writeFile(process.env.BROWSER_FIXTURE_INFO_PATH, JSON.stringify({ databaseName }));
  }
  const { app } = await import('../src/app.js');
  server = app.listen(4103, '127.0.0.1');
  await once(server, 'listening');
  for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => { void cleanup().then(() => process.exit(0)); });
  console.log('GYM-03 disposable browser API ready.');
} catch (error) {
  await cleanup();
  throw error;
}
