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
  if (process.env.ADMIN_DASHBOARD_FIXTURE === 'true') {
    // Mixed states and >5 rows exercise metadata totals rather than page length.
    await pool.query("INSERT INTO gyms(gym_name,address,status) SELECT 'Dashboard Gym '||n,'Địa chỉ mẫu',CASE WHEN n%2=0 THEN 'INACTIVE' ELSE 'ACTIVE' END FROM generate_series(1,6) n");
    const plan = (await pool.query("INSERT INTO packages(gym_id,package_name,duration_days,price) VALUES($1,'Dashboard history',30,10) RETURNING package_id", [gym.gym_id])).rows[0];
    for (const userId of [actorIds[2], actorIds[3]]) {
      await pool.query("INSERT INTO memberships(user_id,gym_id,package_id,start_date,end_date,purchase_price,status) VALUES($1,$2,$3,'2020-01-01','2021-01-01',10,'EXPIRED')", [userId, gym.gym_id, plan.package_id]);
    }
    await pool.query("INSERT INTO pt_registrations(membership_id,gym_trainer_id,status) SELECT m.membership_id,t.gym_trainer_id,'COMPLETED' FROM memberships m JOIN gym_trainers t USING(gym_id) WHERE m.user_id=$1", [actorIds[3]]);
    await pool.query("INSERT INTO gym_reviews(gym_id,user_id,rating,comment) VALUES($1,$2,4,'Dashboard visible review')", [gym.gym_id, actorIds[3]]);
    await pool.query("INSERT INTO gym_reviews(gym_id,user_id,rating) VALUES($1,$2,2)", [gym.gym_id, actorIds[2]]);
    await pool.query("UPDATE gym_reviews SET status='HIDDEN',hidden_at=NOW(),hidden_by=$2,hidden_reason='Fixture hidden review' WHERE user_id=$1", [actorIds[2], actorIds[0]]);
    await pool.query("INSERT INTO trainer_reviews(gym_trainer_id,user_id,rating) SELECT gym_trainer_id,$2,5 FROM gym_trainers WHERE gym_id=$1", [gym.gym_id, actorIds[3]]);
  }
  if (process.env.PT_WORKFLOW_FIXTURE === 'true') {
    await pool.query("INSERT INTO packages(gym_id,package_name,duration_days,price) VALUES($1,'PT Demo',30,150000)", [gym.gym_id]);
  }
  if (process.env.ADMIN_PT_WORKSPACE_FIXTURE === 'true') {
    // R22 data belongs only to the disposable browser DB, including historical obligations.
    const plan = (await pool.query("INSERT INTO packages(gym_id,package_name,duration_days,price) VALUES($1,'R22 history',30,10) RETURNING package_id", [gym.gym_id])).rows[0];
    const trainer = (await pool.query('SELECT gym_trainer_id FROM gym_trainers WHERE gym_id=$1', [gym.gym_id])).rows[0];
    for (let index = 1; index <= 25; index++) {
      const member = (await pool.query("INSERT INTO memberships(user_id,gym_id,package_id,start_date,end_date,purchase_price,status) VALUES($1,$2,$3,'2020-01-01','2021-01-01',10,'EXPIRED') RETURNING membership_id", [actorIds[3], gym.gym_id, plan.package_id])).rows[0];
      const registration = (await pool.query("INSERT INTO pt_registrations(membership_id,gym_trainer_id,status,created_at) VALUES($1,$2,$3,'2020-01-01T00:00:00Z'::timestamptz+$4*interval '1 second') RETURNING registration_id", [member.membership_id, trainer.gym_trainer_id, index === 25 ? 'ACTIVE' : 'COMPLETED', index])).rows[0];
      if (index <= 23 || index === 25) await pool.query("INSERT INTO pt_appointments(registration_id,start_time,end_time,status) VALUES($1,'2020-06-01T02:00:00Z'::timestamptz+$2*interval '1 day','2020-06-01T03:00:00Z'::timestamptz+$2*interval '1 day',$3)", [registration.registration_id, index, index === 25 ? 'PENDING' : 'COMPLETED']);
    }
  }
  if (process.env.ADMIN_REPORT_FIXTURE === 'true') {
    // Isolated Admin selector pagination and scoped historical reports, never production data.
    const facilities = (await pool.query("INSERT INTO gyms(gym_name,address,status) SELECT 'Report Gym '||lpad(n::text,2,'0'),'Địa chỉ Report '||n,CASE WHEN n%2=0 THEN 'INACTIVE' ELSE 'ACTIVE' END FROM generate_series(1,15) n RETURNING gym_id,gym_name")).rows;
    const facility = facilities.find(row => row.gym_name === 'Report Gym 01');
    const other = facilities.find(row => row.gym_name === 'Report Gym 02');
    const rows = (await pool.query("INSERT INTO gym_reports(user_id,gym_id,report_type,title,content,status,created_at) SELECT $1,$2,'OTHER','Sự cố mẫu','Báo cáo Report Gym 01 số '||n,(ARRAY['PENDING','IN_PROGRESS','RESOLVED','REJECTED'])[((n-1)%4)+1],'2020-01-01T00:00:00Z' FROM generate_series(1,25) n RETURNING report_id", [actorIds[3], facility.gym_id])).rows;
    const imageId = rows[0].report_id;
    await pool.query("UPDATE gym_reports SET resolved_by=$2,resolved_at=CASE WHEN status='RESOLVED' THEN '2020-01-02T00:00:00Z'::timestamptz ELSE NULL END,resolution_note='Kết quả xử lý lịch sử trong fixture' WHERE gym_id=$1 AND status IN ('RESOLVED','REJECTED')", [facility.gym_id, actorIds[0]]);
    await writeFile(join(reportImages, `${imageId}.png`), Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jL1sAAAAASUVORK5CYII=', 'base64'), { mode: 0o600 });
    await pool.query('UPDATE gym_reports SET image_url=$2 WHERE report_id=$1', [imageId, `${imageId}.png`]);
    await pool.query("INSERT INTO gym_reports(user_id,gym_id,report_type,title,content) VALUES($1,$2,'OTHER','Báo cáo lịch sử','Báo cáo Report Gym 02 lịch sử')", [actorIds[3], other.gym_id]);
  }
  if (process.env.ADMIN_MEMBERSHIP_FIXTURE === 'true') {
    // Independent Gym/card history only for Admin Membership acceptance; the base Gym stays intact.
    const facility = (await pool.query("INSERT INTO gyms(gym_name,address) VALUES('Membership Gym','Địa chỉ lịch sử thẻ') RETURNING gym_id")).rows[0];
    const other = (await pool.query("INSERT INTO gyms(gym_name,address) VALUES('Membership Other Gym','Địa chỉ khác') RETURNING gym_id")).rows[0];
    const plans = (await pool.query("INSERT INTO packages(gym_id,package_name,duration_days,price) VALUES($1,'Gói lịch sử Membership',30,99),($2,'Gói Gym khác',30,99) RETURNING package_id,gym_id", [facility.gym_id, other.gym_id])).rows;
    const plan = plans.find(row => row.gym_id === facility.gym_id).package_id;
    const missingName = (await pool.query("INSERT INTO users(email,password_hash) VALUES('membership-no-profile@gym03.test',$1) RETURNING user_id", [passwordHash])).rows[0].user_id;
    await pool.query("INSERT INTO user_roles(user_id,role_id) SELECT $1,role_id FROM roles WHERE role_name='CUSTOMER'", [missingName]);
    await pool.query("INSERT INTO memberships(user_id,gym_id,package_id,start_date,end_date,purchase_price,status,created_at,updated_at) SELECT CASE WHEN n=1 THEN $1::uuid ELSE $2::uuid END,$3,$4,'2020-01-01','2021-01-01',CASE WHEN n=1 THEN 0 WHEN n=2 THEN 999999999999.99 ELSE 12.34 END,(ARRAY['PENDING','ACTIVE','EXPIRED','CANCELLED'])[((n-1)%4)+1],'2020-01-01T00:00:00Z','2020-01-01T17:00:00Z' FROM generate_series(1,25) n", [missingName, actorIds[3], facility.gym_id, plan]);
    await pool.query("INSERT INTO memberships(user_id,gym_id,package_id,start_date,end_date,purchase_price,status) VALUES($1,$2,$3,'2020-01-01','2021-01-01',99,'EXPIRED'),($1,$2,$3,'2020-01-01','2021-01-01',0,'CANCELLED')", [actorIds[3], other.gym_id, plans.find(row => row.gym_id === other.gym_id).package_id]);
    // Only the Gym without open PENDING/ACTIVE cards can be stopped under current DB policy.
    await pool.query("UPDATE gyms SET status='INACTIVE' WHERE gym_id=$1", [other.gym_id]);
  }
  if (process.env.ADMIN_TRAINER_LIFECYCLE_FIXTURE === 'true') {
    const facility = (await pool.query("INSERT INTO gyms(gym_name,address) VALUES('Lifecycle Gym','Địa chỉ lifecycle fixture') RETURNING gym_id")).rows[0];
    const account = (await pool.query("INSERT INTO users(email,password_hash) VALUES('lifecyclept@gym03.test',$1) RETURNING user_id", [passwordHash])).rows[0];
    await pool.query("INSERT INTO user_roles(user_id,role_id) SELECT $1,role_id FROM roles WHERE role_name='PT'", [account.user_id]);
    await pool.query("INSERT INTO user_profiles(user_id,full_name) VALUES($1,'Lifecycle PT')", [account.user_id]);
    const trainer = (await pool.query("INSERT INTO gym_trainers(gym_id,user_id,specialization,availability) VALUES($1,$2,'Lifecycle strength','NOT_ACCEPTING') RETURNING gym_trainer_id", [facility.gym_id, account.user_id])).rows[0];
    const plan = (await pool.query("INSERT INTO packages(gym_id,package_name,duration_days,price) VALUES($1,'Lifecycle history',30,10) RETURNING package_id", [facility.gym_id])).rows[0];
    const member = (await pool.query("INSERT INTO memberships(user_id,gym_id,package_id,start_date,end_date,purchase_price,status) VALUES($1,$2,$3,'2020-01-01','2099-12-31',10,'ACTIVE') RETURNING membership_id", [actorIds[3], facility.gym_id, plan.package_id])).rows[0];
    const registration = (await pool.query("INSERT INTO pt_registrations(membership_id,gym_trainer_id,status) VALUES($1,$2,'ACTIVE') RETURNING registration_id", [member.membership_id, trainer.gym_trainer_id])).rows[0];
    await pool.query("INSERT INTO pt_appointments(registration_id,start_time,end_time,status) VALUES($1,NOW()-interval '2 hours',NOW()-interval '1 hour','PENDING')", [registration.registration_id]);
  }
  if (process.env.REVIEW_FIXTURE === 'true') {
    // Historical use exists only in the disposable review browser database.
    const packageRow = (await pool.query("SELECT package_id FROM packages WHERE gym_id=$1 LIMIT 1", [gym.gym_id])).rows[0];
    const trainerRow = (await pool.query("SELECT gym_trainer_id FROM gym_trainers WHERE gym_id=$1", [gym.gym_id])).rows[0];
    const member = (await pool.query("INSERT INTO memberships(user_id,gym_id,package_id,start_date,end_date,purchase_price,status) VALUES($1,$2,$3,'2020-01-01','2099-12-31',150000,'ACTIVE') RETURNING membership_id", [actorIds[3], gym.gym_id, packageRow.package_id])).rows[0];
    const registration = (await pool.query("INSERT INTO pt_registrations(membership_id,gym_trainer_id,status) VALUES($1,$2,'ACTIVE') RETURNING registration_id", [member.membership_id, trainerRow.gym_trainer_id])).rows[0];
    await pool.query("INSERT INTO pt_appointments(registration_id,start_time,end_time,status) VALUES($1,NOW()-interval '2 days',NOW()-interval '2 days'+interval '1 hour','COMPLETED')", [registration.registration_id]);
  }
  if (process.env.ADMIN_REVIEW_MODERATION_FIXTURE === 'true') {
    // Multi-page selector and immutable review history only in this disposable DB.
    const facilities = (await pool.query("INSERT INTO gyms(gym_name,address) SELECT 'Review Gym '||lpad(n::text,2,'0'),'Địa chỉ Review '||n FROM generate_series(1,17) n RETURNING gym_id,gym_name")).rows;
    const facility = facilities.find(row => row.gym_name === 'Review Gym 14');
    const plan = (await pool.query("INSERT INTO packages(gym_id,package_name,duration_days,price) VALUES($1,'Review history',30,10) RETURNING package_id", [facility.gym_id])).rows[0];
    const trainerAccount = (await pool.query("INSERT INTO users(email,password_hash) VALUES('review-history-pt@gym03.test',$1) RETURNING user_id", [passwordHash])).rows[0];
    await pool.query("INSERT INTO user_roles(user_id,role_id) SELECT $1,role_id FROM roles WHERE role_name='PT'", [trainerAccount.user_id]);
    const trainer = (await pool.query('INSERT INTO gym_trainers(gym_id,user_id) VALUES($1,$2) RETURNING gym_trainer_id', [facility.gym_id, trainerAccount.user_id])).rows[0];
    for (let index = 1; index <= 13; index++) {
      const author = (await pool.query('INSERT INTO users(email,password_hash) VALUES($1,$2) RETURNING user_id', [`review-history-${index}@gym03.test`, passwordHash])).rows[0];
      await pool.query("INSERT INTO user_roles(user_id,role_id) SELECT $1,role_id FROM roles WHERE role_name='CUSTOMER'", [author.user_id]);
      await pool.query('INSERT INTO user_profiles(user_id,full_name) VALUES($1,$2)', [author.user_id, `Hội viên lịch sử ${index}`]);
      const member = (await pool.query("INSERT INTO memberships(user_id,gym_id,package_id,start_date,end_date,purchase_price,status) VALUES($1,$2,$3,'2020-01-01','2021-01-01',10,'EXPIRED') RETURNING membership_id", [author.user_id, facility.gym_id, plan.package_id])).rows[0];
      await pool.query("INSERT INTO gym_reviews(gym_id,user_id,rating,comment,created_at) VALUES($1,$2,1,$3,'2020-01-01T00:00:00Z'::timestamptz + $4 * interval '1 second')", [facility.gym_id, author.user_id, index === 2 ? null : `Góp ý lịch sử Review ${index}`, index]);
      if (index % 4 === 0) await pool.query("UPDATE gym_reviews SET status='HIDDEN',hidden_by=$3,hidden_at='2020-01-02T00:00:00Z',hidden_reason='Vi phạm nội dung trong fixture' WHERE gym_id=$1 AND user_id=$2", [facility.gym_id, author.user_id, actorIds[0]]);
      if (index === 1) {
        const registration = (await pool.query("INSERT INTO pt_registrations(membership_id,gym_trainer_id,status) VALUES($1,$2,'COMPLETED') RETURNING registration_id", [member.membership_id, trainer.gym_trainer_id])).rows[0];
        await pool.query("INSERT INTO pt_appointments(registration_id,start_time,end_time,status) VALUES($1,'2020-06-01T00:00:00Z','2020-06-01T01:00:00Z','COMPLETED')", [registration.registration_id]);
        await pool.query('INSERT INTO trainer_reviews(gym_trainer_id,user_id,rating) VALUES($1,$2,2)', [trainer.gym_trainer_id, author.user_id]);
      }
    }
    await pool.query("UPDATE gym_trainers SET status='INACTIVE' WHERE gym_id=$1", [facility.gym_id]);
    await pool.query("UPDATE gyms SET status='INACTIVE' WHERE gym_id=ANY($1::uuid[])", [facilities.map(row => row.gym_id)]);
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
