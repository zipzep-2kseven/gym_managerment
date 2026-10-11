import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, copyFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import * as schema from '../src/database/schema/index.js';
import { createPtRegistrationService } from '../src/services/pt-registration.service.js';
import { createReviewService } from '../src/services/review.service.js';
import { pool as appPool } from '../src/database/index.js';
import { testStaffingIntegration } from './staffing.integration.test.js';
import { testGymRepository } from './gym.repository.test.js';
import { testGymScopeService } from './gym-scope.service.test.js';
import { testGymScopeIntegration } from './gym-scope.integration.test.js';

// Only a uniquely named temporary database is mutated/dropped by this test.
const admin = new pg.Client({ connectionString: process.env.DATABASE_URL });
await admin.connect();
const name = `gym_business_test_${randomUUID().replaceAll('-', '')}`;
await admin.query(`CREATE DATABASE "${name}"`);
const url = new URL(process.env.DATABASE_URL!); url.pathname = `/${name}`;
const pool = new pg.Pool({ connectionString: url.toString() });
const db = drizzle(pool, { schema });
// Frozen GYM-01 fixtures intentionally include multi-Gym PTs allowed by 0001.
// Exercise that historical baseline here; test:lifecycle always verifies current migrations.
const sourceMigrations = fileURLToPath(new URL('../drizzle', import.meta.url));
const migrationsFolder = mkdtempSync(join(tmpdir(), 'gym-baseline-migrations-'));
mkdirSync(join(migrationsFolder, 'meta'));
mkdirSync(join(migrationsFolder, 'rollback'));
const journal = JSON.parse(readFileSync(join(sourceMigrations, 'meta/_journal.json'), 'utf8'));
journal.entries = journal.entries.filter((entry: { idx: number }) => entry.idx <= 1);
for (const entry of journal.entries) copyFileSync(join(sourceMigrations, `${entry.tag}.sql`), join(migrationsFolder, `${entry.tag}.sql`));
copyFileSync(join(sourceMigrations, 'rollback/0001_gym_business_update.sql'), join(migrationsFolder, 'rollback/0001_gym_business_update.sql'));
writeFileSync(join(migrationsFolder, 'meta/_journal.json'), JSON.stringify(journal));
const down = readFileSync(`${migrationsFolder}/rollback/0001_gym_business_update.sql`, 'utf8');
let checks = 0;
const rejected = async (query: string, params: unknown[] = [], code = '23514') => {
  await assert.rejects(pool.query(query, params), (e: any) => e.code === code); checks++;
};
const insert = async (query: string, params: unknown[] = []) => (await pool.query(query, params)).rows[0];
try {
  await migrate(db, { migrationsFolder });
  await migrate(db, { migrationsFolder }); // journal makes repeated migration a no-op
  checks++;
  const client = await pool.connect();
  try { await client.query('BEGIN'); await client.query(down); await client.query('DELETE FROM drizzle.__drizzle_migrations WHERE id = (SELECT max(id) FROM drizzle.__drizzle_migrations)'); await client.query('COMMIT'); }
  catch(e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
  checks++;
  const u = await insert("INSERT INTO users(email,password_hash) VALUES ('customer@test.local','test') RETURNING user_id");
  const a = await insert("INSERT INTO users(email,password_hash) VALUES ('admin@test.local','test') RETURNING user_id");
  const outsider = await insert("INSERT INTO users(email,password_hash) VALUES ('outsider@test.local','test') RETURNING user_id");
  const role = await insert("INSERT INTO roles(role_name) VALUES ('ADMIN') RETURNING role_id");
  await pool.query('INSERT INTO user_roles(user_id,role_id) VALUES ($1,$2)',[a.user_id,role.role_id]);
  const g = await insert("INSERT INTO gyms(gym_name,address) VALUES ('Gym','Address') RETURNING gym_id");
  const g2 = await insert("INSERT INTO gyms(gym_name,address) VALUES ('Other','Address') RETURNING gym_id");
  const p = await insert("INSERT INTO packages(gym_id,package_name,duration_days,price) VALUES ($1,'Month',30,100) RETURNING package_id",[g.gym_id]);
  const m = await insert("INSERT INTO memberships(user_id,gym_id,package_id,start_date,end_date,purchase_price,status) VALUES ($1,$2,$3,CURRENT_DATE-30,CURRENT_DATE-1,100,'EXPIRED') RETURNING membership_id",[u.user_id,g.gym_id,p.package_id]);
  const t = await insert('INSERT INTO gym_trainers(gym_id,user_id) VALUES ($1,$2) RETURNING gym_trainer_id',[g.gym_id,a.user_id]);
  const t2 = await insert('INSERT INTO gym_trainers(gym_id,user_id) VALUES ($1,$2) RETURNING gym_trainer_id',[g2.gym_id,a.user_id]);
  await pool.query("INSERT INTO pt_registrations(membership_id,gym_trainer_id,status) VALUES ($1,$2,'COMPLETED')",[m.membership_id,t.gym_trainer_id]);
  const before = (await pool.query('SELECT to_jsonb(m) AS data FROM memberships m')).rows;
  // Invalid legacy rows abort upgrade without partially creating new tables.
  const bad = await insert("INSERT INTO pt_registrations(membership_id,gym_trainer_id,status) VALUES ($1,$2,'ACTIVE') RETURNING registration_id",[m.membership_id,t2.gym_trainer_id]);
  await assert.rejects(migrate(db,{migrationsFolder})); checks++;
  assert.equal((await pool.query("SELECT to_regclass('gym_reviews') AS name")).rows[0].name,null); checks++;
  await pool.query('DELETE FROM pt_registrations WHERE registration_id=$1',[bad.registration_id]);
  await migrate(db, { migrationsFolder });
  assert.deepEqual((await pool.query('SELECT to_jsonb(m) AS data FROM memberships m')).rows,before); checks++;
  assert.equal((await pool.query('SELECT availability FROM gym_trainers LIMIT 1')).rows[0].availability,'NOT_ACCEPTING'); checks++;
  await pool.query("INSERT INTO consultation_requests(gym_id,full_name,phone) VALUES ($1,'Guest','0901234567')",[g.gym_id]);
  await pool.query("INSERT INTO gym_images(gym_id,image_url) VALUES ($1,'https://example.test/gym.jpg')",[g.gym_id]);
  await pool.query("INSERT INTO pt_social_links(gym_trainer_id,platform,url) VALUES ($1,'WEBSITE','https://example.test')",[t.gym_trainer_id]);
  await pool.query("INSERT INTO pt_working_schedules(gym_trainer_id,day_of_week,start_time,end_time) VALUES ($1,'MONDAY','17:00','21:00')",[t.gym_trainer_id]);
  await rejected("INSERT INTO pt_working_schedules(gym_trainer_id,day_of_week,start_time,end_time) VALUES ($1,'MONDAY','21:00','17:00')",[t.gym_trainer_id]);
  await rejected("UPDATE gym_trainers SET availability='ACTIVE'");
  await rejected("INSERT INTO pt_registrations(membership_id,gym_trainer_id,status) VALUES ($1,$2,'ACTIVE')",[m.membership_id,t2.gym_trainer_id]);
  await rejected('UPDATE gym_trainers SET gym_id=$1 WHERE gym_trainer_id=$2',[g2.gym_id,t.gym_trainer_id]);
  await rejected("INSERT INTO payments(user_id,gym_id,package_id,amount,payment_method) VALUES ($1,$2,$3,100,'CASH')",[u.user_id,g2.gym_id,p.package_id],'23503');
  await rejected('UPDATE memberships SET gym_id=$1 WHERE membership_id=$2',[g2.gym_id,m.membership_id]);
  await rejected('INSERT INTO gym_reviews(user_id,gym_id,rating) VALUES ($1,$2,5)',[outsider.user_id,g.gym_id]);
  await rejected('INSERT INTO trainer_reviews(user_id,gym_trainer_id,rating) VALUES ($1,$2,5)',[u.user_id,t2.gym_trainer_id]);
  await rejected('INSERT INTO gym_reviews(user_id,gym_id,rating) VALUES ($1,$2,6)',[u.user_id,g.gym_id]);
  const customerRole = await insert("INSERT INTO roles(role_name) VALUES ('CUSTOMER') RETURNING role_id");
  await pool.query('INSERT INTO user_roles(user_id,role_id) VALUES ($1,$3),($2,$3)',[u.user_id,outsider.user_id,customerRole.role_id]);
  await pool.query("INSERT INTO pt_appointments(registration_id,start_time,end_time,status) SELECT registration_id, NOW()-interval '2 days', NOW()-interval '2 days'+interval '1 hour','COMPLETED' FROM pt_registrations WHERE gym_trainer_id=$1", [t.gym_trainer_id]);
  const service = createReviewService(db);
  await assert.rejects(service.create(outsider.user_id,{kind:'gym',id:g.gym_id},{rating:5}), (e:any)=> e.code==='REVIEW_NOT_ELIGIBLE'); checks++;
  const review = await service.create(u.user_id,{kind:'gym',id:g.gym_id},{rating:5,comment:'Original'});
  const reviewId = (review as schema.GymReviewsRow).gymReviewId;
  await service.create(u.user_id,{kind:'trainer',id:t.gym_trainer_id},{rating:4}); checks++;
  await rejected("UPDATE gym_reviews SET comment='Changed'");
  await rejected('DELETE FROM gym_reviews');
  await rejected('TRUNCATE trainer_reviews');
  await rejected("UPDATE gym_reviews SET status='HIDDEN'");
  await assert.rejects(service.hide(u.user_id,'gym',reviewId,'reason'),(e:any)=>e.code==='REVIEW_MODERATION_FORBIDDEN'); checks++;
  const hidden = await service.hide(a.user_id,'gym',reviewId,'Vi phạm');
  assert.equal(hidden.comment,'Original'); assert.equal(hidden.hiddenBy,a.user_id); assert.ok(hidden.hiddenAt); checks++;
  await rejected("UPDATE gym_reviews SET hidden_reason='Overwrite'");
  // ORM relations are usable and disambiguate author/moderator and requester/assignee.
  const result = await db.query.gyms.findFirst({ with: { images: true, reviews: { with: { author: true, moderator: true } }, consultations: { columns: { preferredContact: false, processingNote: false } } } });
  assert.ok(result); checks++;
  const rollbackClient = await pool.connect();
  try {
    await rollbackClient.query('BEGIN');
    await assert.rejects(rollbackClient.query(down), /Rollback refused/); checks++;
    await rollbackClient.query('ROLLBACK');
  } finally { rollbackClient.release(); }
  const ptService = createPtRegistrationService(db);
  await assert.rejects(ptService.register(u.user_id,m.membership_id,t.gym_trainer_id), (e:any)=>e.code==='MEMBERSHIP_REQUIRED'); checks++;
  await pool.query("UPDATE memberships SET status='ACTIVE', end_date=CURRENT_DATE+30 WHERE membership_id=$1",[m.membership_id]);
  await assert.rejects(ptService.register(outsider.user_id,m.membership_id,t.gym_trainer_id), (e:any)=>e.code==='MEMBERSHIP_REQUIRED'); checks++;
  await assert.rejects(ptService.register(u.user_id,m.membership_id,t2.gym_trainer_id), (e:any)=>e.code==='TRAINER_GYM_MISMATCH'); checks++;
  await ptService.register(u.user_id,m.membership_id,t.gym_trainer_id); checks++;
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM gym_reviews')).rows[0].n,1); checks++;
  console.log(`PASS: ${checks} checks; fresh migration, repeat, safe rollback, legacy upgrade, constraints, review services and relations.`);
  console.log(`PASS: ${await testStaffingIntegration(db)} staffing integration cases (${process.env.GYM_TEST_ORDER ?? 'forward'}).`);
  const suites = [
    ['repository', testGymRepository],
    ['scope', testGymScopeService],
    ['scope integration', testGymScopeIntegration],
  ] as const;
  const orderedSuites = process.env.GYM_TEST_ORDER === 'reverse' ? [...suites].reverse() : suites;
  for (const [label, run] of orderedSuites) {
    const suitePool = new pg.Pool({ connectionString: url.toString(), max: 1, idleTimeoutMillis: 0 });
    try {
      await suitePool.query('BEGIN');
      // One connection, no idle eviction or parallel queries: repositories and
      // savepoints share the transaction while retaining the production DB type.
      const database = drizzle(suitePool, { schema });
      console.log(`PASS: ${await run(database)} ${label} cases (${process.env.GYM_TEST_ORDER ?? 'forward'}).`);
    } finally {
      try { await suitePool.query('ROLLBACK'); } finally { await suitePool.end(); }
    }
  }
} finally {
  await pool.end(); await appPool.end();
  await admin.query(`DROP DATABASE "${name}"`); await admin.end();
  rmSync(migrationsFolder, { recursive: true });
}
