import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { packageTestHarness } from './package-test-fixture.js';
const h = await packageTestHarness();
const upgrade = readFileSync(fileURLToPath(new URL('../drizzle/0003_pt_workflow.sql', import.meta.url)), 'utf8');
const down = readFileSync(fileURLToPath(new URL('../drizzle/rollback/0003_pt_workflow.sql', import.meta.url)), 'utf8');
try {
  const f = await h.fixture(); const customer = await h.user('CUSTOMER'); const pt = await h.user('PT');
  const t = (await h.pool.query('INSERT INTO gym_trainers(gym_id,user_id) VALUES($1,$2) RETURNING gym_trainer_id', [f.gymA.gymId, pt])).rows[0].gym_trainer_id;
  const m = (await h.pool.query("INSERT INTO memberships(user_id,gym_id,package_id,start_date,end_date,purchase_price,status) VALUES($1,$2,$3,'2026-10-01','2026-10-31',10,'ACTIVE') RETURNING membership_id", [customer, f.gymA.gymId, f.packages[0].packageId])).rows[0].membership_id;
  const r = (await h.pool.query("INSERT INTO pt_registrations(membership_id,gym_trainer_id,status) VALUES($1,$2,'ACTIVE') RETURNING registration_id", [m, t])).rows[0].registration_id;
  const holder = await h.pool.connect();
  try {
    await holder.query('BEGIN'); const before = (await holder.query('SELECT to_jsonb(r) data FROM pt_registrations r')).rows;
    await holder.query(down); assert.deepEqual((await holder.query('SELECT to_jsonb(r) data FROM pt_registrations r')).rows, before); await holder.query('ROLLBACK');
    console.log('PASS migration: explicit rollback preserves rows');
    await holder.query('BEGIN'); await holder.query(down);
    await holder.query("INSERT INTO pt_registrations(membership_id,gym_trainer_id,status) VALUES($1,$2,'ACTIVE')", [m, t]);
    await holder.query('SAVEPOINT legacy'); await assert.rejects(holder.query(upgrade), (e: unknown) => (e as { code: string }).code === '23505');
    await holder.query('ROLLBACK TO SAVEPOINT legacy'); assert.equal((await holder.query('SELECT count(*)::int n FROM pt_registrations')).rows[0].n, 2);
    assert.equal((await holder.query("SELECT to_regclass('pt_registrations_active_membership_key') n")).rows[0].n, null); await holder.query('ROLLBACK');
    console.log('PASS migration: legacy duplicate refuses without edits');
    await holder.query('BEGIN'); await holder.query(down);
    await holder.query("INSERT INTO pt_appointments(registration_id,start_time,end_time,status) VALUES($1,'2026-10-10T09:00Z','2026-10-10T10:00Z','PENDING'),($1,'2026-10-10T09:30Z','2026-10-10T10:30Z','CONFIRMED')", [r]);
    await holder.query('SAVEPOINT legacy'); await assert.rejects(holder.query(upgrade), /legacy participant schedule conflict/);
    await holder.query('ROLLBACK TO SAVEPOINT legacy'); assert.equal((await holder.query('SELECT count(*)::int n FROM pt_appointments')).rows[0].n, 2);
    assert.equal((await holder.query("SELECT to_regclass('pt_registrations_active_membership_key') n")).rows[0].n, null); await holder.query('ROLLBACK');
    console.log('PASS migration: legacy overlap refuses atomically without edits');
  } finally { await holder.query('ROLLBACK'); holder.release(); }
} finally { await h.close(); }
