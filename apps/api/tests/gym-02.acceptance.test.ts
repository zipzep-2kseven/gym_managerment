import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { hash } from '@node-rs/argon2';
import pg from 'pg';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import '../src/config/index.js';

// Load the REAL app only after redirecting its singleton DB to a disposable database.
const adminConnection = new pg.Client({ connectionString: process.env.DATABASE_URL });
await adminConnection.connect();
const name = `gym02_acceptance_${randomUUID().replaceAll('-', '')}`;
await adminConnection.query(`CREATE DATABASE "${name}"`);
const url = new URL(process.env.DATABASE_URL!); url.pathname = `/${name}`;
process.env.DATABASE_URL = url.toString();
const { db, pool } = await import('../src/database/index.js');
let server: import('node:http').Server | undefined;
const successfulRoutes = new Set<string>();
let checks = 0;
try {
  await migrate(db, { migrationsFolder: fileURLToPath(new URL('../drizzle', import.meta.url)) });
  await pool.query("INSERT INTO roles(role_name) VALUES ('ADMIN'),('MANAGER'),('PT'),('CUSTOMER')");
  const adminPassword = `Admin1!${randomUUID()}`;
  const adminEmail = `${randomUUID()}@acceptance.test`;
  const adminUser = (await pool.query('INSERT INTO users(email,password_hash) VALUES ($1,$2) RETURNING user_id',
    [adminEmail, await hash(adminPassword)])).rows[0];
  await pool.query("INSERT INTO user_roles(user_id,role_id) SELECT $1,role_id FROM roles WHERE role_name='ADMIN'", [adminUser.user_id]);
  const { app } = await import('../src/app.js');
  server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  const port = (server.address() as { port: number }).port;
  const request = async (method: string, path: string, cookie = '', body?: unknown, expected = 200) => {
    const response = await fetch(`http://127.0.0.1:${port}/api/v1${path}`, { method,
      headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body) });
    const json = await response.json() as any;
    if (response.status !== expected) {
      assert.fail(`${method} ${path}: expected ${expected}, got ${response.status}, code=${json.error?.code ?? 'none'}`);
    }
    checks++;
    if (response.ok) successfulRoutes.add(`${method} ${path.split('?')[0].replace(/[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}/gi, ':id')}`);
    return { body: json, headers: response.headers };
  };
  const login = async (email: string, password: string) => {
    const response = await request('POST', '/auth/login', '', { email, password });
    const header = response.headers.get('set-cookie');
    assert.ok(header?.includes('HttpOnly'));
    assert.ok(!JSON.stringify(response.body).includes(password));
    return header!.split(';')[0];
  };
  const adminCookie = await login(adminEmail, adminPassword);
  const gymA = (await request('POST', '/gyms', adminCookie, { gym_name: 'Acceptance A', address: 'Address A' }, 201)).body.data;
  const gymB = (await request('POST', '/gyms', adminCookie, { gym_name: 'Acceptance B', address: 'Address B' }, 201)).body.data;
  const managerEmail = `${randomUUID()}@acceptance.test`;
  const manager = (await request('POST', '/admin/managers/provision', adminCookie,
    { gym_id: gymA.gym_id, email: managerEmail, full_name: 'Acceptance Manager' }, 201)).body.data;
  assert.equal(manager.user.must_change_password, true); assert.equal(manager.user.email_verified_at, null);
  const managerCookie = await login(managerEmail, manager.temporary_password);
  const gated = await request('PATCH', `/gyms/${gymA.gym_id}`, managerCookie, { description: 'Gated' }, 403);
  assert.equal(gated.body.error.code, 'PASSWORD_CHANGE_REQUIRED');
  await request('POST', '/auth/change-password', managerCookie,
    { current_password: manager.temporary_password, new_password: manager.temporary_password }, 400);
  const managerPassword = `Manager1!${randomUUID()}`;
  await request('POST', '/auth/change-password', managerCookie,
    { current_password: manager.temporary_password, new_password: managerPassword });
  await request('POST', '/auth/login', '', { email: managerEmail, password: manager.temporary_password }, 401);
  const session = (await request('GET', '/auth/me', managerCookie)).body.data;
  assert.equal(session.must_change_password, false); assert.equal(session.email_verified_at, null); assert.equal(session.status, 'ACTIVE');
  assert.ok(!JSON.stringify(session).includes(manager.temporary_password));
  await request('PATCH', `/gyms/${gymA.gym_id}`, managerCookie, { description: 'Updated by Manager' });
  await request('PATCH', `/gyms/${gymB.gym_id}`, managerCookie, { description: 'Forbidden' }, 403);
  await request('GET', '/admin/gyms', managerCookie, undefined, 403);
  await request('GET', '/admin/gyms?status=ACTIVE', adminCookie);
  await request('GET', `/gyms/${gymA.gym_id}/managers`, managerCookie);
  const trainerEmail = `${randomUUID()}@acceptance.test`;
  const trainerInput = { email: trainerEmail, full_name: 'Acceptance PT', specialization: 'Fitness' };
  await request('POST', `/gyms/${gymB.gym_id}/trainers/provision`, managerCookie, trainerInput, 403);
  const trainer = (await request('POST', `/gyms/${gymA.gym_id}/trainers/provision`, managerCookie, trainerInput, 201)).body.data;
  const repeated = await request('POST', `/gyms/${gymA.gym_id}/trainers/provision`, managerCookie, trainerInput, 409);
  assert.equal(repeated.body.error.code, 'EMAIL_ALREADY_EXISTS');
  assert.ok(!JSON.stringify(repeated.body).includes(trainer.temporary_password));
  const ptCookie = await login(trainerEmail, trainer.temporary_password);
  await request('POST', '/auth/change-password', ptCookie,
    { current_password: trainer.temporary_password, new_password: `Trainer1!${randomUUID()}` });
  await request('GET', `/gyms/${gymA.gym_id}/management/trainers`, ptCookie, undefined, 403);
  const internal = (await request('GET', `/gyms/${gymA.gym_id}/management/trainers`, managerCookie)).body.data;
  assert.equal(internal[0].user_id, trainer.user.user_id);
  assert.ok(!JSON.stringify(internal).includes(trainer.temporary_password));
  await request('GET', '/gyms');
  await request('GET', `/gyms/${gymA.gym_id}`);
  const publicList = (await request('GET', `/gyms/${gymA.gym_id}/trainers`)).body.data;
  const trainerId = trainer.assignment.gym_trainer_id;
  const ptPath = `/gyms/${gymA.gym_id}/trainers/${trainerId}`;
  const publicDetail = (await request('GET', ptPath)).body.data;
  assert.deepEqual(publicList[0], publicDetail);
  assert.equal(publicDetail.availability, 'NOT_ACCEPTING');
  assert.ok(!('user_id' in publicDetail) && !('email' in publicDetail.profile));
  await request('GET', `/gyms/${gymB.gym_id}/trainers/${trainerId}`, '', undefined, 404);
  // Downstream APIs are out of scope. Seed obligations as explicit test fixtures.
  const pkg = (await pool.query("INSERT INTO packages(gym_id,package_name,duration_days,price) VALUES ($1,'Fixture',30,100) RETURNING package_id", [gymA.gym_id])).rows[0];
  const member = (await pool.query("INSERT INTO memberships(user_id,gym_id,package_id,start_date,end_date,purchase_price,status) VALUES ($1,$2,$3,CURRENT_DATE,CURRENT_DATE+30,100,'ACTIVE') RETURNING membership_id", [adminUser.user_id, gymA.gym_id, pkg.package_id])).rows[0];
  const reg = (await pool.query("INSERT INTO pt_registrations(membership_id,gym_trainer_id,status) VALUES ($1,$2,'ACTIVE') RETURNING registration_id", [member.membership_id, trainerId])).rows[0];
  const appt = (await pool.query("INSERT INTO pt_appointments(registration_id,start_time,end_time,status) VALUES ($1,now(),now()+interval '1 hour','PENDING') RETURNING appointment_id", [reg.registration_id])).rows[0];
  const blockedGym = await request('PATCH', `/gyms/${gymA.gym_id}/status`, adminCookie, { status: 'INACTIVE' }, 409);
  assert.equal(blockedGym.body.error.code, 'GYM_HAS_OPEN_OBLIGATIONS');
  assert.deepEqual(blockedGym.body.error.details, { payments: 0, memberships: 1, registrations: 1, appointments: 1 });
  const blockedPT = await request('PATCH', `${ptPath}/status`, managerCookie, { status: 'INACTIVE' }, 409);
  assert.equal(blockedPT.body.error.code, 'TRAINER_HAS_OPEN_OBLIGATIONS');
  // Resolve fixtures, without pretending cancellation/completion APIs are implemented.
  await pool.query("UPDATE pt_appointments SET status='COMPLETED' WHERE appointment_id=$1", [appt.appointment_id]);
  await pool.query("UPDATE pt_registrations SET status='COMPLETED' WHERE registration_id=$1", [reg.registration_id]);
  await pool.query("UPDATE memberships SET status='EXPIRED' WHERE membership_id=$1", [member.membership_id]);
  await request('PATCH', `${ptPath}/status`, managerCookie, { status: 'INACTIVE' });
  await request('GET', ptPath, '', undefined, 404);
  await request('PATCH', `${ptPath}/status`, managerCookie, { status: 'ACTIVE' });
  const managersPath = `/gyms/${gymA.gym_id}/managers`;
  await request('POST', `${managersPath}/${manager.assignment.gym_manager_id}/revoke`, adminCookie, {});
  await request('GET', `/gyms/${gymA.gym_id}/management/trainers`, managerCookie, undefined, 403);
  const reactivated = (await request('POST', `${managersPath}/assign`, adminCookie, { user_id: manager.user.user_id })).body.data;
  assert.equal(reactivated.gym_manager_id, manager.assignment.gym_manager_id);
  assert.equal(reactivated.created_at, manager.assignment.created_at);
  await request('GET', `/gyms/${gymA.gym_id}/management/trainers`, managerCookie);
  await request('POST', `/gyms/${gymB.gym_id}/trainers`, adminCookie, { user_id: trainer.user.user_id }, 409);
  await request('PATCH', `${ptPath}/status`, managerCookie, { status: 'INACTIVE' });
  const moved = (await request('POST', `/gyms/${gymB.gym_id}/trainers`, adminCookie, { user_id: trainer.user.user_id }, 201)).body.data;
  await request('PATCH', `${ptPath}/status`, managerCookie, { status: 'ACTIVE' }, 409);
  await request('PATCH', `/gyms/${gymB.gym_id}/trainers/${moved.gym_trainer_id}/status`, adminCookie, { status: 'INACTIVE' });
  const restored = (await request('PATCH', `${ptPath}/status`, managerCookie, { status: 'ACTIVE' })).body.data;
  assert.equal(restored.gym_trainer_id, trainerId); assert.equal(restored.joined_at, trainer.assignment.joined_at);
  await request('PATCH', `/gyms/${gymA.gym_id}/status`, adminCookie, { status: 'INACTIVE' });
  await request('GET', `/gyms/${gymA.gym_id}`, '', undefined, 404);
  await request('GET', `/gyms/${gymA.gym_id}/trainers`, '', undefined, 404);
  await request('GET', `/gyms/${gymA.gym_id}/management/trainers`, managerCookie);
  await request('GET', '/admin/gyms?status=INACTIVE', adminCookie);
  await request('PATCH', `/gyms/${gymA.gym_id}/status`, adminCookie, { status: 'ACTIVE' });
  await request('GET', ptPath);
  assert.equal((await pool.query('SELECT status FROM pt_appointments WHERE appointment_id=$1', [appt.appointment_id])).rows[0].status, 'COMPLETED');
  const expected = ['GET /gyms', 'GET /gyms/:id', 'POST /gyms', 'PATCH /gyms/:id', 'PATCH /gyms/:id/status',
    'POST /admin/managers/provision', 'GET /gyms/:id/managers', 'POST /gyms/:id/managers/assign', 'POST /gyms/:id/managers/:id/revoke',
    'POST /gyms/:id/trainers/provision', 'POST /gyms/:id/trainers', 'PATCH /gyms/:id/trainers/:id/status',
    'GET /gyms/:id/trainers', 'GET /gyms/:id/trainers/:id', 'GET /admin/gyms', 'GET /gyms/:id/management/trainers'];
  assert.ok(expected.every(route => successfulRoutes.has(route)), 'Every GYM-02 endpoint must succeed through the production router');
  console.log(`PASS: GYM-02 full-app acceptance; ${checks} HTTP checks, ${expected.length}/16 Gym endpoints, real login/password flow, isolated DB.`);
} finally {
  if (server) await new Promise<void>((resolve, reject) => server!.close(error => error ? reject(error) : resolve()));
  await pool.end();
  await adminConnection.query(`DROP DATABASE "${name}"`); await adminConnection.end();
}
