import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { readFileSync, mkdtempSync, mkdirSync, copyFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import express from 'express';
import cookieParser from 'cookie-parser';
import * as schema from '../src/database/schema/index.js';
import { pool as appPool } from '../src/database/index.js';
import { createGymLifecycleService } from '../src/services/gym-lifecycle.service.js';
import { createStaffingService } from '../src/services/staffing.service.js';
import { createGymLifecycleRouter } from '../src/routes/gym-lifecycle.routes.js';
import { errorHandler } from '../src/middleware/error-handler.js';
import { signJwt } from '../src/utils/jwt.js';
import { config } from '../src/config/index.js';
import { createGymScopeService } from '../src/services/gym-scope.service.js';
import { createGymRepository } from '../src/repositories/gym.repository.js';
import { createUserRepository } from '../src/repositories/user.repository.js';
import { testGymManagementIntegration } from './gym-management.integration.test.js';
import { testPublicTrainerIntegration } from './public-trainer.integration.test.js';
import { testGymWriteIntegration } from './gym-write.integration.test.js';
import { testPublicGymIntegration } from './public-gym.integration.test.js';
import { testStaffingIntegration } from './staffing.integration.test.js';

const adminConnection = new pg.Client({ connectionString: process.env.DATABASE_URL });
await adminConnection.connect();
const name = `gym_lifecycle_test_${randomUUID().replaceAll('-', '')}`;
await adminConnection.query(`CREATE DATABASE "${name}"`);
const url = new URL(process.env.DATABASE_URL!); url.pathname = `/${name}`;
const pool = new pg.Pool({ connectionString: url.toString() });
const db = drizzle(pool, { schema });
const migrationSource = fileURLToPath(new URL('../drizzle', import.meta.url));
// This frozen suite rolls back 0002 explicitly; keep its chain pinned to 0000–0002.
// Full current-chain migration is exercised by package/PT/browser suites.
const migrations = mkdtempSync(join(tmpdir(), 'gym-lifecycle-frozen-'));
mkdirSync(join(migrations, 'meta'));
mkdirSync(join(migrations, 'rollback'));
const sourceJournal = JSON.parse(readFileSync(join(migrationSource, 'meta/_journal.json'), 'utf8'));
writeFileSync(join(migrations, 'meta/_journal.json'), JSON.stringify({ ...sourceJournal, entries: sourceJournal.entries.slice(0, 3) }));
for (const entry of sourceJournal.entries.slice(0, 3)) copyFileSync(join(migrationSource, `${entry.tag}.sql`), join(migrations, `${entry.tag}.sql`));
copyFileSync(join(migrationSource, 'rollback/0002_gym_lifecycle.sql'), join(migrations, 'rollback/0002_gym_lifecycle.sql'));
const baseline = mkdtempSync(join(tmpdir(), 'gym-lifecycle-upgrade-'));
mkdirSync(join(baseline, 'meta'));
const journal = JSON.parse(readFileSync(join(migrations, 'meta/_journal.json'), 'utf8'));
writeFileSync(join(baseline, 'meta/_journal.json'), JSON.stringify({ ...journal, entries: journal.entries.slice(0, 2) }));
for (const entry of journal.entries.slice(0, 2)) copyFileSync(join(migrations, `${entry.tag}.sql`), join(baseline, `${entry.tag}.sql`));
const row = async (query: string, values: unknown[] = []) => (await pool.query(query, values)).rows[0];
const gym = async () => (await row("INSERT INTO gyms(gym_name,address) VALUES ('Lifecycle','Test') RETURNING gym_id")).gym_id as string;
const user = async (role = 'PT') => {
  const id = (await row('INSERT INTO users(email,password_hash) VALUES ($1,$2) RETURNING user_id', [`${randomUUID()}@lifecycle.test`, 'fixture'])).user_id as string;
  await pool.query('INSERT INTO user_roles(user_id,role_id) SELECT $1,role_id FROM roles WHERE role_name=$2', [id, role]);
  return id;
};
const packageFor = async (gymId: string) => (await row("INSERT INTO packages(gym_id,package_name,duration_days,price) VALUES ($1,'Month',30,100) RETURNING package_id", [gymId])).package_id as string;
const membership = async (gymId: string, status = 'ACTIVE') => {
  const owner = await user('CUSTOMER'); const packageId = await packageFor(gymId);
  return (await row("INSERT INTO memberships(user_id,gym_id,package_id,start_date,end_date,purchase_price,status) VALUES ($1,$2,$3,CURRENT_DATE-30,CURRENT_DATE-1,100,$4) RETURNING membership_id", [owner, gymId, packageId, status])).membership_id as string;
};
const registration = async (membershipId: string, trainerId: string, status = 'ACTIVE') =>
  (await row('INSERT INTO pt_registrations(membership_id,gym_trainer_id,status) VALUES ($1,$2,$3) RETURNING registration_id', [membershipId, trainerId, status])).registration_id as string;
const appointment = async (registrationId: string, status = 'PENDING') =>
  (await row("INSERT INTO pt_appointments(registration_id,start_time,end_time,status) VALUES ($1,now()-interval '2 hours',now()-interval '1 hour',$2) RETURNING appointment_id", [registrationId, status])).appointment_id as string;
const rejects = (promise: Promise<unknown>, code: string) => assert.rejects(promise, (e: any) => e.code === code);
const constraint = (promise: Promise<unknown>, name: string) => assert.rejects(promise, (e: any) => e.constraint === name);
// Observe a real lock waiter before releasing the first transaction.
const waitForBlockedTransaction = async (holder: pg.PoolClient) => {
  const pid = (await holder.query('SELECT pg_backend_pid() pid')).rows[0].pid;
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    const result = await row('SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE $1::int = ANY(pg_blocking_pids(pid))) blocked', [pid]);
    if (result.blocked) return;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  assert.fail('Expected concurrent transaction to wait for the lifecycle lock');
};
const service = createGymLifecycleService(db);
const staff = createStaffingService(db);
const scope = createGymScopeService(createUserRepository(db), createGymRepository(db));
let server: ReturnType<typeof express.application.listen> | undefined;
let checks = 0;
try {
  // Fresh install of the complete chain, then return to 0001 to test real upgrades.
  await migrate(db, { migrationsFolder: migrations });
  assert.ok((await row("SELECT to_regclass('gym_trainers_active_user_key') name")).name);
  const freshRollback = await pool.connect();
  try {
    await freshRollback.query('BEGIN');
    await freshRollback.query(readFileSync(join(migrations, 'rollback/0002_gym_lifecycle.sql'), 'utf8'));
    await freshRollback.query('DELETE FROM drizzle.__drizzle_migrations WHERE id=(SELECT max(id) FROM drizzle.__drizzle_migrations)');
    await freshRollback.query('COMMIT');
  } finally { freshRollback.release(); }
  checks++;
  await migrate(db, { migrationsFolder: baseline });
  await pool.query("INSERT INTO roles(role_name) VALUES ('ADMIN'),('MANAGER'),('PT'),('CUSTOMER')");
  const actor = await user('ADMIN');
  // Upgrade refuses conflicting legacy ACTIVE PT assignments without changing them.
  const legacyUser = await user(); const g1 = await gym(); const g2 = await gym();
  await pool.query('INSERT INTO gym_trainers(gym_id,user_id) VALUES ($1,$3),($2,$3)', [g1, g2, legacyUser]);
  await assert.rejects(migrate(db, { migrationsFolder: migrations }));
  assert.equal((await row('SELECT count(*)::int n FROM gym_trainers WHERE user_id=$1 AND status=\'ACTIVE\'', [legacyUser])).n, 2);
  assert.equal((await row("SELECT to_regclass('gym_trainers_active_user_key') name")).name, null);
  // Explicit test-fixture reconciliation, never performed by the migration.
  await pool.query("UPDATE gym_trainers SET status='INACTIVE' WHERE user_id=$1 AND gym_id=$2", [legacyUser, g2]);
  const invalidGym = await gym(); await membership(invalidGym);
  await pool.query("UPDATE gyms SET status='INACTIVE' WHERE gym_id=$1", [invalidGym]);
  await assert.rejects(migrate(db, { migrationsFolder: migrations }));
  assert.equal((await row("SELECT to_regprocedure('require_active_gym(uuid)') name")).name, null);
  await pool.query("UPDATE gyms SET status='ACTIVE' WHERE gym_id=$1", [invalidGym]);
  await migrate(db, { migrationsFolder: migrations });
  await migrate(db, { migrationsFolder: migrations });
  checks++;
  const rollbackClient = await pool.connect();
  try {
    await rollbackClient.query('BEGIN');
    const before = (await rollbackClient.query('SELECT to_jsonb(t) data FROM gym_trainers t ORDER BY gym_trainer_id')).rows;
    await rollbackClient.query(readFileSync(join(migrations, 'rollback/0002_gym_lifecycle.sql'), 'utf8'));
    assert.deepEqual((await rollbackClient.query('SELECT to_jsonb(t) data FROM gym_trainers t ORDER BY gym_trainer_id')).rows, before);
    assert.equal((await rollbackClient.query("SELECT to_regclass('gym_trainers_active_user_key') name")).rows[0].name, null);
    await rollbackClient.query('ROLLBACK');
  } finally { rollbackClient.release(); }
  checks++;
  const app = express(); app.use(express.json(), cookieParser(), createGymLifecycleRouter(service), errorHandler);
  server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  const port = (server.address() as { port: number }).port;
  const request = async (path: string, actorId: string | null, body: unknown, method = 'PATCH') => {
    const token = actorId ? signJwt({ sub: actorId, email: 'claim@test.local', roles: ['ADMIN'] }) : '';
    const res = await fetch(`http://127.0.0.1:${port}${path}`, { method,
      headers: { 'Content-Type': 'application/json', ...(actorId ? { Cookie: `${config.cookie.name}=${token}` } : {}) },
      body: JSON.stringify(body) });
    return { status: res.status, headers: res.headers, body: await res.json() as any };
  };
  const cases: [string, () => Promise<void>][] = [
    ['HTTP permissions, strict status payload, route ownership and account gate', async () => {
      const gymId = await gym(); const other = await gym(); const manager = await user('MANAGER');
      await staff.assignManager(actor, gymId, manager);
      const trainer = await service.assignTrainer(actor, gymId, { user_id: await user() });
      const created = await request(`/gyms/${gymId}/trainers`, manager, { user_id: await user() }, 'POST');
      assert.equal(created.status, 201); assert.equal(created.body.data.gym_id, gymId);
      const path = `/gyms/${gymId}/status`;
      assert.equal((await request(path, null, { status: 'INACTIVE' })).status, 401);
      for (const denied of [manager, await user('PT'), await user('CUSTOMER')]) {
        assert.equal((await request(path, denied, { status: 'INACTIVE' })).status, 403);
      }
      assert.equal((await request(path, actor, { status: 'SUSPENDED' })).status, 400);
      assert.equal((await request(path, actor, { status: 'INACTIVE', force: true })).status, 400);
      assert.equal((await request('/gyms/bad/status', actor, { status: 'INACTIVE' })).status, 400);
      assert.equal((await request(`/gyms/${other}/trainers/${trainer.gymTrainerId}/status`, actor, { status: 'INACTIVE' })).status, 404);
      assert.equal((await request(`/gyms/${other}/trainers/${trainer.gymTrainerId}/status`, manager, { status: 'INACTIVE' })).status, 403);
      const revoked = await user('ADMIN'); await pool.query('DELETE FROM user_roles WHERE user_id=$1', [revoked]);
      assert.equal((await request(path, revoked, { status: 'INACTIVE' })).status, 403);
      for (const patch of ["status='SUSPENDED'", 'must_change_password=true']) {
        const restricted = await user('ADMIN'); await pool.query(`UPDATE users SET ${patch} WHERE user_id=$1`, [restricted]);
        assert.equal((await request(path, restricted, { status: 'INACTIVE' })).status, 403);
      }
      const stopped = await request(`/gyms/${gymId}/trainers/${trainer.gymTrainerId}/status`, manager, { status: 'INACTIVE' });
      assert.equal(stopped.status, 200); assert.equal(stopped.headers.get('cache-control'), 'no-store');
      assert.equal(stopped.body.data.status, 'INACTIVE');
    }],
    ['Gym shutdown returns exact blockers, including overdue unfinished appointments', async () => {
      const gymId = await gym(); const trainer = await service.assignTrainer(actor, gymId, { user_id: await user() });
      const member = await membership(gymId); const reg = await registration(member, trainer.gymTrainerId);
      const appt = await appointment(reg, 'CONFIRMED');
      const payer = await user('CUSTOMER'); const pkg = await packageFor(gymId);
      const payment = await row("INSERT INTO payments(user_id,gym_id,package_id,amount,payment_method) VALUES ($1,$2,$3,100,'CASH') RETURNING payment_id", [payer, gymId, pkg]);
      const result = await request(`/gyms/${gymId}/status`, actor, { status: 'INACTIVE' });
      assert.equal(result.status, 409); assert.equal(result.body.error.code, 'GYM_HAS_OPEN_OBLIGATIONS');
      assert.deepEqual(result.body.error.details, { payments: 1, memberships: 1, registrations: 1, appointments: 1 });
      assert.equal((await row('SELECT status FROM gyms WHERE gym_id=$1', [gymId])).status, 'ACTIVE');
      await pool.query("UPDATE payments SET payment_status='FAILED' WHERE payment_id=$1", [payment.payment_id]);
      await pool.query("UPDATE memberships SET status='EXPIRED' WHERE membership_id=$1", [member]);
      await pool.query("UPDATE pt_registrations SET status='COMPLETED' WHERE registration_id=$1", [reg]);
      await rejects(service.setGymStatus(actor, gymId, 'INACTIVE'), 'GYM_HAS_OPEN_OBLIGATIONS');
      await pool.query("UPDATE pt_appointments SET status='COMPLETED' WHERE appointment_id=$1", [appt]);
      const assignmentsBefore = (await pool.query('SELECT * FROM gym_trainers WHERE gym_id=$1', [gymId])).rows;
      assert.equal((await service.setGymStatus(actor, gymId, 'INACTIVE')).status, 'INACTIVE');
      assert.deepEqual((await pool.query('SELECT * FROM gym_trainers WHERE gym_id=$1', [gymId])).rows, assignmentsBefore);
      await rejects(service.setGymStatus(actor, gymId, 'INACTIVE'), 'INVALID_STATUS_TRANSITION');
      await service.setGymStatus(actor, gymId, 'ACTIVE');
      assert.equal((await row('SELECT status FROM pt_appointments WHERE appointment_id=$1', [appt])).status, 'COMPLETED');
      assert.equal((await row('SELECT payment_status FROM payments WHERE payment_id=$1', [payment.payment_id])).payment_status, 'FAILED');
    }],
    ['PT deactivation checks registrations and appointments independently; preserves identity/history', async () => {
      const gymId = await gym(); const trainerUser = await user();
      const trainer = await service.assignTrainer(actor, gymId, { user_id: trainerUser, bio: 'Keep history' });
      await pool.query("UPDATE gym_trainers SET availability='ALMOST_FULL' WHERE gym_trainer_id=$1", [trainer.gymTrainerId]);
      const member = await membership(gymId); const reg = await registration(member, trainer.gymTrainerId);
      await rejects(service.setTrainerStatus(actor, gymId, trainer.gymTrainerId, 'INACTIVE'), 'TRAINER_HAS_OPEN_OBLIGATIONS');
      const appt = await appointment(reg); await pool.query("UPDATE pt_registrations SET status='COMPLETED' WHERE registration_id=$1", [reg]);
      await rejects(service.setTrainerStatus(actor, gymId, trainer.gymTrainerId, 'INACTIVE'), 'TRAINER_HAS_OPEN_OBLIGATIONS');
      await pool.query("UPDATE pt_appointments SET status='CANCELLED' WHERE appointment_id=$1", [appt]);
      const beforeUser = await row('SELECT * FROM users WHERE user_id=$1', [trainerUser]);
      const beforeRoles = (await pool.query('SELECT * FROM user_roles WHERE user_id=$1', [trainerUser])).rows;
      await service.setTrainerStatus(actor, gymId, trainer.gymTrainerId, 'INACTIVE');
      await rejects(scope.requireInternalScope(trainerUser, gymId, ['PT']), 'GYM_SCOPE_FORBIDDEN');
      const reactivated = await service.setTrainerStatus(actor, gymId, trainer.gymTrainerId, 'ACTIVE');
      assert.equal(reactivated.gymTrainerId, trainer.gymTrainerId);
      assert.deepEqual(reactivated.createdAt, trainer.createdAt); assert.deepEqual(reactivated.joinedAt, trainer.joinedAt);
      assert.equal(reactivated.availability, 'ALMOST_FULL'); assert.equal(reactivated.bio, 'Keep history');
      assert.deepEqual(await row('SELECT * FROM users WHERE user_id=$1', [trainerUser]), beforeUser);
      assert.deepEqual((await pool.query('SELECT * FROM user_roles WHERE user_id=$1', [trainerUser])).rows, beforeRoles);
      assert.equal((await row('SELECT status FROM pt_appointments WHERE appointment_id=$1', [appt])).status, 'CANCELLED');
    }],
    ['Q08 concurrent multi-Gym assignments have one winner, then explicit transfer/reuse', async () => {
      const first = await gym(); const second = await gym(); const pt = await user();
      const results = await Promise.allSettled([service.assignTrainer(actor, first, { user_id: pt }), service.assignTrainer(actor, second, { user_id: pt })]);
      assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
      assert.equal((results.find(r => r.status === 'rejected') as PromiseRejectedResult).reason.code, 'USER_ALREADY_ACTIVE_TRAINER');
      const active = (results.find(r => r.status === 'fulfilled') as PromiseFulfilledResult<schema.GymTrainer>).value;
      const other = active.gymId === first ? second : first;
      await service.setTrainerStatus(actor, active.gymId, active.gymTrainerId, 'INACTIVE');
      const transferred = await service.assignTrainer(actor, other, { user_id: pt });
      await rejects(service.setTrainerStatus(actor, active.gymId, active.gymTrainerId, 'ACTIVE'), 'USER_ALREADY_ACTIVE_TRAINER');
      await service.setTrainerStatus(actor, other, transferred.gymTrainerId, 'INACTIVE');
      assert.equal((await service.setTrainerStatus(actor, active.gymId, active.gymTrainerId, 'ACTIVE')).gymTrainerId, active.gymTrainerId);
      assert.equal((await row('SELECT count(*)::int n FROM gym_trainers WHERE user_id=$1', [pt])).n, 2);
      await rejects(service.assignTrainer(actor, active.gymId, { user_id: pt }), 'ASSIGNMENT_ALREADY_EXISTS');
    }],
    ['inactive Gym blocks new obligations and assignments, while internal reads remain allowed', async () => {
      const gymId = await gym(); const manager = await user('MANAGER'); await staff.assignManager(actor, gymId, manager);
      const trainer = await service.assignTrainer(actor, gymId, { user_id: await user() });
      const member = await membership(gymId, 'EXPIRED'); const reg = await registration(member, trainer.gymTrainerId, 'COMPLETED');
      const payer = await user('CUSTOMER'); const pkg = await packageFor(gymId);
      await service.setGymStatus(actor, gymId, 'INACTIVE');
      assert.equal((await staff.listManagers(manager, gymId)).length, 1);
      await rejects(scope.requirePublicScope(gymId), 'NOT_FOUND');
      await rejects(staff.provisionTrainer(actor, gymId, { email: `${randomUUID()}@test.local`, full_name: 'Staff Test', phone: null }), 'GYM_INACTIVE');
      await rejects(staff.assignManager(actor, gymId, await user('MANAGER')), 'GYM_INACTIVE');
      await rejects(service.assignTrainer(actor, gymId, { user_id: await user() }), 'GYM_INACTIVE');
      await constraint(pool.query("INSERT INTO payments(user_id,gym_id,package_id,amount,payment_method) VALUES ($1,$2,$3,100,'CASH')", [payer, gymId, pkg]), 'gym_lifecycle_inactive');
      await constraint(pool.query("UPDATE memberships SET status='ACTIVE' WHERE membership_id=$1", [member]), 'gym_lifecycle_inactive');
      await constraint(registration(member, trainer.gymTrainerId), 'gym_lifecycle_inactive');
      await constraint(appointment(reg), 'gym_lifecycle_inactive');
      await service.setTrainerStatus(actor, gymId, trainer.gymTrainerId, 'INACTIVE');
      await rejects(service.setTrainerStatus(actor, gymId, trainer.gymTrainerId, 'ACTIVE'), 'GYM_INACTIVE');
    }],
    ['PT activation requires current role and active account; inactive PT rejects new work', async () => {
      const gymId = await gym(); const pt = await user(); const trainer = await service.assignTrainer(actor, gymId, { user_id: pt });
      const member = await membership(gymId, 'EXPIRED'); const reg = await registration(member, trainer.gymTrainerId, 'COMPLETED');
      await service.setTrainerStatus(actor, gymId, trainer.gymTrainerId, 'INACTIVE');
      await constraint(registration(member, trainer.gymTrainerId), 'trainer_lifecycle_inactive');
      await constraint(appointment(reg), 'trainer_lifecycle_inactive');
      await pool.query("UPDATE users SET status='SUSPENDED' WHERE user_id=$1", [pt]);
      await rejects(service.setTrainerStatus(actor, gymId, trainer.gymTrainerId, 'ACTIVE'), 'ACCOUNT_DEACTIVATED');
      await pool.query("UPDATE users SET status='ACTIVE' WHERE user_id=$1", [pt]);
      await pool.query('DELETE FROM user_roles WHERE user_id=$1', [pt]);
      await rejects(service.setTrainerStatus(actor, gymId, trainer.gymTrainerId, 'ACTIVE'), 'INSUFFICIENT_ROLE');
    }],
    ['concurrency: new payment committed first prevents Gym shutdown', async () => {
      const gymId = await gym(); const payer = await user('CUSTOMER'); const pkg = await packageFor(gymId);
      const writer = await pool.connect();
      try {
        await writer.query('BEGIN');
        await writer.query("INSERT INTO payments(user_id,gym_id,package_id,amount,payment_method) VALUES ($1,$2,$3,100,'CASH')", [payer, gymId, pkg]);
        const closing = rejects(service.setGymStatus(actor, gymId, 'INACTIVE'), 'GYM_HAS_OPEN_OBLIGATIONS');
        await waitForBlockedTransaction(writer);
        await writer.query('COMMIT'); await closing;
      } finally { await writer.query('ROLLBACK'); writer.release(); }
    }],
    ['concurrency: Gym shutdown committed first prevents new payment', async () => {
      const gymId = await gym(); const payer = await user('CUSTOMER'); const pkg = await packageFor(gymId);
      const closer = await pool.connect();
      try {
        await closer.query('BEGIN'); await closer.query("UPDATE gyms SET status='INACTIVE' WHERE gym_id=$1", [gymId]);
        const buying = constraint(pool.query("INSERT INTO payments(user_id,gym_id,package_id,amount,payment_method) VALUES ($1,$2,$3,100,'CASH')", [payer, gymId, pkg]), 'gym_lifecycle_inactive');
        await waitForBlockedTransaction(closer);
        await closer.query('COMMIT'); await buying;
      } finally { await closer.query('ROLLBACK'); closer.release(); }
    }],
    ['concurrency: booking and PT deactivation cannot both commit', async () => {
      for (const bookingFirst of [true, false]) {
        const gymId = await gym(); const trainer = await service.assignTrainer(actor, gymId, { user_id: await user() });
        const member = await membership(gymId, 'EXPIRED'); const reg = await registration(member, trainer.gymTrainerId, 'COMPLETED');
        const first = await pool.connect();
        try {
          await first.query('BEGIN');
          if (bookingFirst) {
            await first.query("INSERT INTO pt_appointments(registration_id,start_time,end_time,status) VALUES ($1,now(),now()+interval '1 hour','CONFIRMED')", [reg]);
            const stopping = rejects(service.setTrainerStatus(actor, gymId, trainer.gymTrainerId, 'INACTIVE'), 'TRAINER_HAS_OPEN_OBLIGATIONS');
            await waitForBlockedTransaction(first);
            await first.query('COMMIT'); await stopping;
          } else {
            await first.query("UPDATE gym_trainers SET status='INACTIVE' WHERE gym_trainer_id=$1", [trainer.gymTrainerId]);
            const booking = constraint(appointment(reg), 'trainer_lifecycle_inactive');
            await waitForBlockedTransaction(first);
            await first.query('COMMIT'); await booking;
          }
        } finally { await first.query('ROLLBACK'); first.release(); }
      }
    }],
  ];
  for (const [label, run] of process.env.GYM_TEST_ORDER === 'reverse' ? [...cases].reverse() : cases) {
    try { await run(); checks++; console.log(`PASS lifecycle: ${label}`); }
    catch (error) { console.error(`FAIL lifecycle: ${label}`); throw error; }
  }
  console.log(`PASS: ${await testGymManagementIntegration(db)} Gym management integration cases.`);
  console.log(`PASS: ${await testPublicTrainerIntegration(db)} public PT integration cases.`);
  console.log(`PASS: ${await testGymWriteIntegration(db)} Gym write integration cases.`);
  console.log(`PASS: ${await testPublicGymIntegration(db)} public Gym integration cases.`);
  console.log(`PASS: ${checks} lifecycle/migration cases (${process.env.GYM_TEST_ORDER ?? 'forward'}).`);
  console.log(`PASS: ${await testStaffingIntegration(db)} staffing cases on CURRENT schema.`);
} finally {
  if (server) await new Promise<void>((resolve, reject) => server!.close(error => error ? reject(error) : resolve()));
  await pool.end(); await appPool.end();
  await adminConnection.query(`DROP DATABASE "${name}"`); await adminConnection.end();
  rmSync(baseline, { recursive: true });
  rmSync(migrations, { recursive: true });
}
