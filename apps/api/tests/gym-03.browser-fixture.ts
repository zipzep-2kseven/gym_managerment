// Browser acceptance fixture: all writes and migrations target a disposable DB.
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
};
try {
  await migrate(db, { migrationsFolder: fileURLToPath(new URL('../drizzle', import.meta.url)) });
  await pool.query("INSERT INTO roles(role_name) VALUES ('ADMIN'),('MANAGER'),('PT'),('CUSTOMER')");
  const passwordHash = await hash('BrowserFixture@123'); // Disposable test users only.
  const actorIds: string[] = [];
  for (const role of ['ADMIN', 'MANAGER', 'PT']) {
    const row = (await pool.query('INSERT INTO users(email,password_hash) VALUES ($1,$2) RETURNING user_id', [`${role.toLowerCase()}@gym03.test`, passwordHash])).rows[0] as { user_id: string };
    actorIds.push(row.user_id);
    await pool.query('INSERT INTO user_roles(user_id,role_id) SELECT $1,role_id FROM roles WHERE role_name=$2', [row.user_id, role]);
    await pool.query('INSERT INTO user_profiles(user_id,full_name) VALUES ($1,$2)', [row.user_id, `Browser ${role}`]);
  }
  const gym = (await pool.query("INSERT INTO gyms(gym_name,address,opening_time,closing_time) VALUES ('Browser Gym','Địa chỉ kiểm thử','06:00','22:00') RETURNING gym_id")).rows[0] as { gym_id: string };
  await pool.query('INSERT INTO gym_managers(gym_id,user_id) VALUES ($1,$2)', [gym.gym_id, actorIds[1]]);
  await pool.query("INSERT INTO gym_trainers(gym_id,user_id,specialization,experience_years,bio) VALUES ($1,$2,'Sức mạnh',3,'Giới thiệu PT')", [gym.gym_id, actorIds[2]]);
  const { app } = await import('../src/app.js');
  server = app.listen(4103, '127.0.0.1');
  await once(server, 'listening');
  for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => { void cleanup().then(() => process.exit(0)); });
  console.log('GYM-03 disposable browser API ready.');
} catch (error) {
  await cleanup();
  throw error;
}
