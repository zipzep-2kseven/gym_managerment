import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import express from 'express';
import cookieParser from 'cookie-parser';
import { eq } from 'drizzle-orm';
import { packageTestHarness } from './package-test-fixture.js';
import { consultationRequests, gymManagers, users } from '../src/database/schema/index.js';
import { createConsultationService } from '../src/services/consultation.service.js';
import { createConsultationRouter } from '../src/routes/consultation.routes.js';
import { createConsultationRateLimit } from '../src/middleware/consultation-rate-limit.js';
import { errorHandler } from '../src/middleware/error-handler.js';
import { config } from '../src/config/index.js';
import { signJwt } from '../src/utils/jwt.js';
const h = await packageTestHarness(), service = createConsultationService(h.database);
const app = express(); app.use(express.json(), cookieParser());
app.use('/api/v1', createConsultationRouter(service, createConsultationRateLimit(200)));
let time = 1000;
app.use('/limited', createConsultationRouter(service, createConsultationRateLimit(2, 1000, () => time)));
app.use(errorHandler);
const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
const port = (server.address() as { port: number }).port;
const request = async (method: string, path: string, actor: string | null, body?: unknown, cookie?: string) => {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, { method,
    headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': String(Math.random()), ...(cookie ? { Cookie: cookie } : actor ? { Cookie: `${config.cookie.name}=${signJwt({ sub: actor, email: 'claim@test.local', roles: ['ADMIN'] })}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: response.status, headers: response.headers, body: await response.json() as { data: { length: number }; error: { code: string } } };
};
const body = { full_name: 'Khách tư vấn', phone: '090 123 4567', preferred_contact: 'Sau 18h', content: 'Muốn tập thử' };
let count = 0;
const run = async (name: string, fn: () => Promise<void>) => { await fn(); count++; console.log(`PASS consultation: ${name}`); };
try {
  const f = await h.fixture(), customer = await h.user('CUSTOMER'), otherManager = await h.user('MANAGER'), pt = await h.user('PT');
  await h.database.insert(gymManagers).values({ gymId: f.gymB.gymId, userId: otherManager });
  const path = `/api/v1/gyms/${f.gymA.gymId}/consultation-requests`;
  await run('Guest submit without membership; public response exposes no contact or identifiers', async () => {
    const result = await request('POST', path, null, body); assert.equal(result.status, 201);
    assert.equal(result.headers.get('cache-control'), 'no-store');
    assert.deepEqual(result.body, { success: true, data: { message: 'Gym đã nhận yêu cầu và sẽ liên hệ để tư vấn.' } });
    const [row] = await h.database.select().from(consultationRequests);
    assert.equal(row.userId, null); assert.equal(row.status, 'PENDING'); assert.equal(row.assignedTo, null);
    assert.equal(row.phone, '0901234567'); assert.equal(row.preferredContact, 'Sau 18h');
  });
  await run('Strict allowlist, contact validation and inactive/missing Gym', async () => {
    for (const extra of [{ user_id: customer }, { status: 'COMPLETED' }, { assigned_to: f.manager }, { email: 'test@test.local' }, { preferred_date: '2030-01-01' }, { processing_note: 'spoof' }, { gym_id: f.gymB.gymId }]) assert.equal((await request('POST', path, null, { ...body, ...extra })).status, 400);
    for (const invalid of [{ ...body, phone: 'javascript:alert(1)' }, { ...body, full_name: ' ' }, { ...body, preferred_contact: 'a'.repeat(201) }, { ...body, content: 'a'.repeat(2001) }]) assert.equal((await request('POST', path, null, invalid)).status, 400);
    assert.equal((await request('POST', `/api/v1/gyms/${f.gymC.gymId}/consultation-requests`, null, body)).status, 404);
    assert.equal((await request('POST', '/api/v1/gyms/invalid/consultation-requests', null, body)).status, 400);
  });
  await run('Optional session links actual identity; invalid/revoked account never becomes Guest', async () => {
    assert.equal((await request('POST', path, customer, { full_name: 'Tên được sửa', phone: '+84901234567' })).status, 201);
    assert.equal((await h.database.select().from(consultationRequests).where(eq(consultationRequests.userId, customer))).length, 1);
    assert.equal((await request('POST', path, null, body, `${config.cookie.name}=bad`)).status, 401);
    await h.database.update(users).set({ status: 'INACTIVE' }).where(eq(users.userId, customer));
    assert.equal((await request('POST', path, customer, body)).status, 403);
    await h.database.update(users).set({ status: 'ACTIVE', mustChangePassword: true }).where(eq(users.userId, customer));
    assert.equal((await request('POST', path, customer, body)).status, 403);
  });
  await run('Only assigned active Manager can list; no ADMIN claim/bypass or public contact leakage', async () => {
    assert.equal((await request('GET', path, null)).status, 401);
    for (const actor of [customer, pt, f.admin, otherManager]) assert.equal((await request('GET', path, actor)).status, 403);
    const result = await request('GET', `${path}?pageSize=1`, f.manager); assert.equal(result.status, 200); assert.equal(result.body.data.length, 1);
    for (const query of ['?page=0', '?status=BAD', '?user_id=other', '?page=1&page=2']) assert.equal((await request('GET', path + query, f.manager)).status, 400);
  });
  const row = (await h.database.select().from(consultationRequests).where(eq(consultationRequests.userId, customer)))[0];
  const item = `${path}/${row.consultationRequestId}`;
  await run('Notes separate from customer content, terminal policy and stale concurrent updates', async () => {
    const change = (status: string, expected_status = 'PENDING', processing_note = 'Đã gọi khách') => ({ status, expected_status, processing_note });
    assert.equal((await request('PATCH', item, otherManager, change('CONTACTED'))).status, 403);
    assert.equal((await request('PATCH', item, f.admin, change('CONTACTED'))).status, 403);
    assert.equal((await request('PATCH', item, f.manager, change('COMPLETED'))).status, 409);
    assert.equal((await request('PATCH', item, f.manager, change('CANCELLED', 'PENDING', ' '))).status, 400);
    assert.equal((await request('PATCH', item, f.manager, { ...change('CONTACTED'), full_name: 'overwrite' })).status, 400);
    assert.equal((await request('PATCH', item, f.manager, change('PENDING'))).status, 200);
    assert.equal((await request('PATCH', item, f.manager, change('CONTACTED'))).status, 200);
    const results = await Promise.all([request('PATCH', item, f.manager, change('COMPLETED', 'CONTACTED')), request('PATCH', item, f.manager, change('CANCELLED', 'CONTACTED'))]);
    assert.deepEqual(results.map(r => r.status).sort(), [200, 409]);
    assert.equal((await request('PATCH', item, f.manager, change('PENDING', 'COMPLETED'))).status, 409);
    const [actual] = await h.database.select().from(consultationRequests).where(eq(consultationRequests.consultationRequestId, row.consultationRequestId));
    assert.equal(actual.fullName, 'Tên được sửa'); assert.equal(actual.content, null); assert.equal(actual.processingNote, 'Đã gọi khách');
  });
  await run('Revoked Manager cannot read or change existing requests', async () => {
    await h.database.update(gymManagers).set({ status: 'INACTIVE' }).where(eq(gymManagers.gymManagerId, f.assignment.gymManagerId));
    assert.equal((await request('GET', path, f.manager)).status, 403);
    assert.equal((await request('PATCH', item, f.manager, { status: 'CONTACTED', expected_status: 'PENDING' })).status, 403);
  });
  await run('IP rate limit ignores spoofed forwarding header and expires', async () => {
    const limited = path.replace('/api/v1', '/limited');
    for (let i = 0; i < 2; i++) assert.equal((await request('POST', limited, null, body)).status, 201);
    const third = await request('POST', limited, null, body); assert.equal(third.status, 429); assert.equal(third.headers.get('retry-after'), '1');
    time += 1001; assert.equal((await request('POST', limited, null, body)).status, 201);
  });
  await run('Additive migration preserves old values; rollback refuses to discard new notes', async () => {
    const rollback = await readFile(new URL('../drizzle/rollback/0005_consultation_simple.sql', import.meta.url), 'utf8');
    await assert.rejects(h.pool.query(rollback));
    assert.equal((await h.database.select().from(consultationRequests).where(eq(consultationRequests.consultationRequestId, row.consultationRequestId))).length, 1);
    await h.pool.query('UPDATE consultation_requests SET preferred_contact=NULL,processing_note=NULL');
    await h.pool.query(rollback);
    const old = await h.pool.query('SELECT full_name, phone, content, status FROM consultation_requests ORDER BY consultation_request_id');
    assert.ok(old.rowCount! > 0);
    const upgrade = await readFile(new URL('../drizzle/0005_consultation_simple.sql', import.meta.url), 'utf8');
    await h.pool.query(upgrade);
    assert.deepEqual((await h.pool.query('SELECT full_name, phone, content, status FROM consultation_requests ORDER BY consultation_request_id')).rows, old.rows);
    assert.ok((await h.database.select().from(consultationRequests)).every(r => r.preferredContact === null && r.processingNote === null));
  });
  console.log(`PASS: ${count} consultation integration groups.`);
} finally { await new Promise<void>(resolve => server.close(() => resolve())); await h.close(); }
