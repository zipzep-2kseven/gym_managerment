import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import express from 'express';
import cookieParser from 'cookie-parser';
import { eq } from 'drizzle-orm';
import { packageTestHarness } from './package-test-fixture.js';
import { createPtWorkflowService } from '../src/services/pt-workflow.service.js';
import { createPtWorkflowRouter } from '../src/routes/pt-workflow.routes.js';
import { createPaymentService } from '../src/services/payment.service.js';
import { errorHandler } from '../src/middleware/error-handler.js';
import { signJwt } from '../src/utils/jwt.js';
import { config } from '../src/config/index.js';
import { memberships, gymTrainers, users, userRoles, ptRegistrations, ptAppointments } from '../src/database/schema/index.js';
let now = new Date('2026-10-09T01:00:00Z');
const h = await packageTestHarness(); const service = createPtWorkflowService(h.database, () => now);
const app = express(); app.use(express.json(), cookieParser()); app.use('/api/v1', createPtWorkflowRouter(service)); app.use(errorHandler);
const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
const port = (server.address() as { port: number }).port;
interface Data { registration_id: string; appointment_id: string; membership_id: string; status: string; note: string; start_time: string; updated_at: string; }
interface Envelope { data: Data & Data[]; error: { code: string }; pagination: { totalItems: number }; }
const request = async (method: string, path: string, actor: string | null, body?: object) => {
  const response = await fetch(`http://127.0.0.1:${port}/api/v1${path}`, { method, headers: { 'Content-Type': 'application/json', ...(actor ? { Cookie: `${config.cookie.name}=${signJwt({ sub: actor, email: 'test@pt.test', roles: ['ADMIN'] })}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: response.status, body: await response.json() as Envelope, headers: response.headers };
};
let checks = 0; const run = async (name: string, fn: () => Promise<void>) => { await fn(); checks++; console.log(`PASS PT: ${name}`); };
try {
  const f = await h.fixture(); const customer = await h.user('CUSTOMER'), outsider = await h.user('CUSTOMER'), pt = await h.user('PT'), pt2 = await h.user('PT');
  const [trainer, trainer2] = await h.database.insert(gymTrainers).values([{ gymId: f.gymA.gymId, userId: pt }, { gymId: f.gymB.gymId, userId: pt2, availability: 'ACCEPTING' }]).returning();
  const payment = await createPaymentService(h.database, true).createDemo(customer, f.gymA.gymId, randomUUID(), { package_id: f.packages[0].packageId, payment_method: 'CARD' });
  const memberId = payment.membership.membership_id;
  await h.database.update(memberships).set({ startDate: '2026-10-01', endDate: '2026-10-31' }).where(eq(memberships.membershipId, memberId));
  const base = `/gyms/${f.gymA.gymId}`; const body = { membership_id: memberId, gym_trainer_id: trainer.gymTrainerId };
  await run('Guest authentication and strict validation', async () => {
    for (const path of ['/pt-registrations/me', '/pt-appointments/me', `${base}/pt-registrations`, `${base}/pt-appointments`, `${base}/memberships`]) assert.equal((await request('GET', path, null)).status, 401);
    assert.equal((await request('POST', `${base}/pt-registrations`, customer, { ...body, status: 'ACTIVE' })).status, 400);
    assert.equal((await request('GET', '/pt-appointments/me?gym_id=spoof', customer)).status, 400);
    for (const query of ['page[]=1', 'page=1&page=2', 'page=1.5', 'pageSize=101']) assert.equal((await request('GET', `/pt-registrations/me?${query}`, customer)).status, 400);
  });
  await run('Manager Membership choices are scoped, paged and safe', async () => {
    assert.equal((await request('GET', `${base}/memberships`, customer)).status, 403);
    assert.equal((await request('GET', `/gyms/${f.gymB.gymId}/memberships`, f.manager)).status, 403);
    const result = await request('GET', `${base}/memberships?pageSize=1`, f.manager); assert.equal(result.status, 200);
    assert.equal(result.body.data[0].membership_id, memberId); assert.equal(result.body.pagination.totalItems, 1);
    assert.equal(JSON.stringify(result.body).includes('private_hash'), false);
    assert.equal((await request('GET', `${base}/memberships`, f.admin)).status, 200);
  });
  await run('NOT_ACCEPTING blocks new and only owner/Manager change availability', async () => {
    assert.equal((await request('POST', `${base}/pt-registrations`, customer, body)).body.error.code, 'TRAINER_NOT_ACCEPTING');
    for (const actor of [customer, pt2, f.admin]) assert.equal((await request('PATCH', `${base}/trainers/${trainer.gymTrainerId}/availability`, actor, { availability: 'ACCEPTING' })).status, 403);
    assert.equal((await request('PATCH', `${base}/trainers/${trainer.gymTrainerId}/availability`, pt, { availability: 'ACCEPTING' })).status, 200);
  });
  await run('Ownership, Manager cross-Gym and wrong PT', async () => {
    assert.equal((await request('POST', `${base}/pt-registrations`, outsider, body)).status, 403);
    assert.equal((await request('GET', `/gyms/${f.gymB.gymId}/pt-registrations`, f.manager)).status, 403);
    assert.equal((await request('POST', `${base}/pt-registrations`, customer, { ...body, gym_trainer_id: trainer2.gymTrainerId })).status, 404);
    assert.equal((await request('POST', `${base}/pt-registrations`, f.admin, body)).status, 403);
  });
  let regId = '';
  await run('Demo Membership eligible and concurrent registrations one winner', async () => {
    const results = await Promise.all([request('POST', `${base}/pt-registrations`, customer, body), request('POST', `${base}/pt-registrations`, f.manager, body)]);
    assert.deepEqual(results.map(r => r.status).sort(), [201, 409]); regId = results.find(r => r.status === 201)!.body.data.registration_id;
    assert.equal((await request('GET', '/pt-registrations/me', pt)).body.data.length, 1);
    assert.equal((await request('GET', '/pt-registrations/me', outsider)).body.data.length, 0);
  });
  const booking = (start = '2026-10-10T09:00:00+07:00', end = '2026-10-10T10:00:00+07:00') => ({ registration_id: regId, start_time: start, end_time: end });
  let aptId = '';
  await run('Availability does not block existing pupils; PENDING holds slot', async () => {
    await request('PATCH', `${base}/trainers/${trainer.gymTrainerId}/availability`, f.manager, { availability: 'NOT_ACCEPTING' });
    const result = await request('POST', `${base}/pt-appointments`, customer, booking()); assert.equal(result.status, 201); aptId = result.body.data.appointment_id; assert.equal(result.body.data.status, 'PENDING');
    assert.equal((await request('POST', `${base}/pt-appointments`, customer, booking())).body.error.code, 'APPOINTMENT_OVERLAP');
  });
  const aptPath = `${base}/pt-appointments/${aptId}`;
  await run('Confirm assigned PT/Manager only and repeat preserves timestamp', async () => {
    assert.equal((await request('PATCH', `${aptPath}/confirm`, customer, {})).status, 403);
    assert.equal((await request('PATCH', `${aptPath}/confirm`, pt2, {})).status, 403);
    const result = await request('PATCH', `${aptPath}/confirm`, pt, {}); assert.equal(result.status, 200); assert.equal(result.body.data.status, 'CONFIRMED');
    assert.deepEqual((await request('PATCH', `${aptPath}/confirm`, f.manager, {})).body.data, result.body.data);
  });
  await run('Timezone/time/card range validation', async () => {
    for (const [start, end] of [['2026-10-10T09:00:00', '2026-10-10T10:00:00'], ['2026-10-08T09:00:00+07:00', '2026-10-08T10:00:00+07:00'], ['2026-10-11T10:00:00Z', '2026-10-11T09:00:00Z'], ['2026-10-31T23:00:00+07:00', '2026-11-01T01:00:00+07:00']]) assert.equal((await request('POST', `${base}/pt-appointments`, customer, booking(start, end))).status, 400);
    assert.equal((await request('POST', `${base}/pt-appointments`, customer, booking('2026-10-31T23:00:00+07:00', '2026-11-01T00:00:00+07:00'))).status, 201);
  });
  await run('Adjacent appointment allowed; concurrent overlap one winner', async () => {
    assert.equal((await request('POST', `${base}/pt-appointments`, customer, booking('2026-10-10T10:00:00+07:00', '2026-10-10T11:00:00+07:00'))).status, 201);
    const results = await Promise.all([request('POST', `${base}/pt-appointments`, customer, booking('2026-10-12T09:00:00Z', '2026-10-12T10:00:00Z')), request('POST', `${base}/pt-appointments`, pt, booking('2026-10-12T09:30:00Z', '2026-10-12T10:30:00Z'))]);
    assert.deepEqual(results.map(r => r.status).sort(), [201, 409]);
  });
  await run('Reschedule reconfirm, reason required, pending cannot complete', async () => {
    const result = await request('PATCH', `${aptPath}/reschedule`, customer, { start_time: '2026-10-11T09:00:00+07:00', end_time: '2026-10-11T10:00:00+07:00' }); assert.equal(result.status, 200); assert.equal(result.body.data.status, 'PENDING');
    assert.equal((await request('PATCH', `${aptPath}/cancel`, customer, {})).status, 400);
    assert.equal((await request('PATCH', `${aptPath}/complete`, pt, {})).status, 409);
    assert.equal((await request('PATCH', `${aptPath}/confirm`, f.manager, {})).status, 200);
  });
  await run('Membership expiry blocks new but staff can resolve past obligation', async () => {
    now = new Date('2026-11-01T02:00:00Z');
    assert.equal((await request('POST', `${base}/pt-appointments`, customer, booking('2026-11-02T09:00:00Z', '2026-11-02T10:00:00Z'))).body.error.code, 'MEMBERSHIP_REQUIRED');
    assert.equal((await request('PATCH', `${aptPath}/cancel`, customer, { note: 'Vắng' })).status, 409);
    const result = await request('PATCH', `${aptPath}/complete`, pt, {}); assert.equal(result.status, 200);
    assert.deepEqual((await request('PATCH', `${aptPath}/complete`, f.manager, {})).body.data, result.body.data);
    assert.equal((await request('PATCH', `${aptPath}/reschedule`, pt, { start_time: '2026-11-02T09:00:00Z', end_time: '2026-11-02T10:00:00Z' })).status, 409);
  });
  await run('End/change PT resolves each open and preserves history', async () => {
    const path = `${base}/pt-registrations/${regId}/cancel`;
    assert.equal((await request('PATCH', path, f.manager, { note: 'Đổi PT' })).body.error.code, 'REGISTRATION_HAS_OPEN_APPOINTMENTS');
    const rows = (await request('GET', '/pt-appointments/me', pt)).body.data;
    for (const a of rows) if (a.status === 'PENDING' || a.status === 'CONFIRMED') assert.equal((await request('PATCH', `${base}/pt-appointments/${a.appointment_id}/cancel`, f.manager, { note: 'Hội viên vắng mặt' })).status, 200);
    assert.equal((await request('PATCH', path, f.manager, { note: 'Đổi PT' })).status, 200);
    assert.equal((await h.database.select().from(ptAppointments).where(eq(ptAppointments.appointmentId, aptId)))[0].registrationId, regId);
    now = new Date('2026-10-09T01:00:00Z');
    await request('PATCH', `${base}/trainers/${trainer.gymTrainerId}/availability`, pt, { availability: 'ACCEPTING' });
    assert.equal((await request('POST', `${base}/pt-registrations`, customer, body)).status, 201);
    const list = await request('GET', '/pt-registrations/me?pageSize=1', customer); assert.equal(list.body.data.length, 1); assert.equal(list.body.pagination.totalItems, 2);
  });
  await run('Global Customer overlap across Gyms and real lock waiter', async () => {
    const [mB] = await h.database.insert(memberships).values({ userId: customer, gymId: f.gymB.gymId, packageId: f.packages[4].packageId, startDate: '2026-10-01', endDate: '2026-10-31', status: 'ACTIVE', purchasePrice: '99.00' }).returning();
    const rB = await service.register(customer, f.gymB.gymId, { membership_id: mB.membershipId, gym_trainer_id: trainer2.gymTrainerId });
    const rA = (await request('GET', '/pt-registrations/me', customer)).body.data.find(r => r.status === 'ACTIVE' && r.membership_id === memberId)!.registration_id;
    const holder = await h.pool.connect();
    try {
      await holder.query('BEGIN');
      await holder.query('SELECT gym_id FROM gyms WHERE gym_id=$1 FOR NO KEY UPDATE', [f.gymA.gymId]);
      await holder.query('SELECT user_id FROM users WHERE user_id=ANY($1::uuid[]) ORDER BY user_id FOR UPDATE', [[customer, pt]]);
      const waiting = request('POST', `/gyms/${f.gymB.gymId}/pt-appointments`, customer, { registration_id: rB.registration_id, start_time: '2026-10-15T09:30:00Z', end_time: '2026-10-15T10:30:00Z' });
      await h.waitForBlocked(holder);
      await holder.query("INSERT INTO pt_appointments(registration_id,start_time,end_time,status) VALUES($1,'2026-10-15T09:00:00Z','2026-10-15T10:00:00Z','PENDING')", [rA]);
      await holder.query('COMMIT');
      assert.equal((await waiting).body.error.code, 'APPOINTMENT_OVERLAP');
      assert.equal((await request('GET', `/gyms/${f.gymB.gymId}/pt-appointments`, f.manager)).status, 403);
    } finally { await holder.query('ROLLBACK'); holder.release(); }
  });
  await run('Dual-role user cannot overlap teaching and attending', async () => {
    await h.pool.query("INSERT INTO user_roles(user_id,role_id) SELECT $1,role_id FROM roles WHERE role_name='CUSTOMER'", [pt]);
    const [m] = await h.database.insert(memberships).values({ userId: pt, gymId: f.gymB.gymId, packageId: f.packages[4].packageId, startDate: '2026-10-01', endDate: '2026-10-31', status: 'ACTIVE', purchasePrice: '99.00' }).returning();
    const r = await service.register(pt, f.gymB.gymId, { membership_id: m.membershipId, gym_trainer_id: trainer2.gymTrainerId });
    const result = await request('POST', `/gyms/${f.gymB.gymId}/pt-appointments`, pt, { registration_id: r.registration_id, start_time: '2026-10-15T09:00:00Z', end_time: '2026-10-15T10:00:00Z' });
    assert.equal(result.body.error.code, 'APPOINTMENT_OVERLAP');
  });
  await run('Database guard rejects overlap and historical identity rewrites', async () => {
    const rows = (await request('GET', '/pt-registrations/me', customer)).body.data;
    const r = rows.find(row => row.status === 'ACTIVE')!;
    await assert.rejects(h.database.insert(ptAppointments).values({ registrationId: r.registration_id, startTime: new Date('2026-10-15T09:00:00Z'), endTime: new Date('2026-10-15T10:00:00Z'), status: 'PENDING' }));
    await assert.rejects(h.database.update(ptRegistrations).set({ gymTrainerId: trainer2.gymTrainerId }).where(eq(ptRegistrations.registrationId, regId)));
    await assert.rejects(h.database.update(ptAppointments).set({ note: 'Rewrite' }).where(eq(ptAppointments.appointmentId, aptId)));
    await assert.rejects(h.database.transaction(tx => tx.insert(ptAppointments).values({ registrationId: r.registration_id, startTime: new Date('2026-10-25T09:00:00Z'), endTime: new Date('2026-10-25T10:00:00Z'), status: 'PENDING' }), { isolationLevel: 'repeatable read' }));
    await assert.rejects(h.database.update(memberships).set({ userId: outsider }).where(eq(memberships.membershipId, memberId)));
  });
  await run('Card status, target role and Gym lifecycle remain authoritative', async () => {
    const [m] = await h.database.insert(memberships).values({ userId: outsider, gymId: f.gymA.gymId, packageId: f.packages[0].packageId, startDate: '2026-10-01', endDate: '2026-10-31', status: 'EXPIRED', purchasePrice: '10.00' }).returning();
    assert.equal((await request('POST', `${base}/pt-registrations`, outsider, { ...body, membership_id: m.membershipId })).body.error.code, 'MEMBERSHIP_REQUIRED');
    await h.database.update(memberships).set({ status: 'ACTIVE', startDate: '2026-10-20' }).where(eq(memberships.membershipId, m.membershipId));
    assert.equal((await request('POST', `${base}/pt-registrations`, outsider, { ...body, membership_id: m.membershipId })).body.error.code, 'MEMBERSHIP_REQUIRED');
    await h.pool.query("UPDATE memberships SET start_date='2026-10-01' WHERE membership_id=$1", [m.membershipId]);
    await h.pool.query("DELETE FROM user_roles WHERE user_id=$1 AND role_id=(SELECT role_id FROM roles WHERE role_name='PT')", [pt]);
    assert.equal((await request('POST', `${base}/pt-registrations`, outsider, { ...body, membership_id: m.membershipId })).body.error.code, 'PT_INACTIVE');
    await h.pool.query("INSERT INTO user_roles(user_id,role_id) SELECT $1,role_id FROM roles WHERE role_name='PT'", [pt]);
    await assert.rejects(h.pool.query("UPDATE gyms SET status='INACTIVE' WHERE gym_id=$1", [f.gymA.gymId]));
  });
  await run('Current account/role/password gate despite forged token claims', async () => {
    await h.database.update(users).set({ mustChangePassword: true }).where(eq(users.userId, outsider));
    assert.equal((await request('GET', '/pt-registrations/me', outsider)).body.error.code, 'PASSWORD_CHANGE_REQUIRED');
    await h.database.update(users).set({ mustChangePassword: false, status: 'INACTIVE' }).where(eq(users.userId, outsider));
    assert.equal((await request('GET', '/pt-registrations/me', outsider)).status, 403);
    await h.database.update(users).set({ status: 'ACTIVE' }).where(eq(users.userId, outsider)); await h.database.delete(userRoles).where(eq(userRoles.userId, outsider));
    assert.equal((await request('GET', '/pt-registrations/me', outsider)).status, 403);
  });
  console.log(`PASS: ${checks} PT workflow HTTP/DB cases.`);
} finally { await new Promise<void>(resolve => server.close(() => resolve())); await h.close(); }
