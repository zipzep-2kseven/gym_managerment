import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import express from 'express';
import cookieParser from 'cookie-parser';
import { eq } from 'drizzle-orm';
import { packageTestHarness } from './package-test-fixture.js';
import { createPaymentService, demoMembershipDates } from '../src/services/payment.service.js';
import { createPaymentRouter } from '../src/routes/payment.routes.js';
import { errorHandler } from '../src/middleware/error-handler.js';
import { signJwt } from '../src/utils/jwt.js';
import { config } from '../src/config/index.js';
import { payments, memberships, packages, users, userRoles } from '../src/database/schema/index.js';
const h = await packageTestHarness(); const service = createPaymentService(h.database, true);
const app = express(); app.use(express.json(), cookieParser()); app.use('/api/v1', createPaymentRouter(service));
app.use('/disabled', createPaymentRouter(createPaymentService(h.database, false))); app.use(errorHandler);
const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
const port = (server.address() as { port: number }).port;
let checks = 0;
type CheckoutData = Awaited<ReturnType<typeof service.createDemo>>;
interface Envelope<T> { data: T; error: { code: string }; pagination: { hasNextPage: boolean } }
const request = async <T = CheckoutData>(method: string, path: string, actor: string | null, body?: object, key?: string, prefix = '/api/v1') => {
  const response = await fetch(`http://127.0.0.1:${port}${prefix}${path}`, { method,
    headers: { 'Content-Type': 'application/json', ...(key ? { 'Idempotency-Key': key } : {}),
      ...(actor ? { Cookie: `${config.cookie.name}=${signJwt({ sub: actor, email: 'test@demo.test', roles: ['ADMIN'] })}` } : {}) },
    body: body ? JSON.stringify(body) : undefined });
  return { status: response.status, body: await response.json() as Envelope<T>, headers: response.headers };
};
const run = async (name: string, fn: () => Promise<void>) => { await fn(); checks++; console.log(`PASS demo: ${name}`); };
try {
  const f = await h.fixture(); const customer = await h.user('CUSTOMER'); const outsider = await h.user('CUSTOMER');
  const path = `/gyms/${f.gymA.gymId}/payments`; const input = { package_id: f.packages[0].packageId, payment_method: 'ANY METHOD' };
  await run('Guest 401 on four private endpoints', async () => {
    for (const [method, p] of [['POST', path], ['GET', '/payments/me'], ['GET', `/payments/${randomUUID()}`], ['GET', '/memberships/me']]) assert.equal((await request(method, p, null, method === 'POST' ? input : undefined, randomUUID())).status, 401);
  });
  await run('Current role required despite forged JWT ADMIN', async () => {
    for (const role of ['ADMIN', 'MANAGER', 'PT']) assert.equal((await request('POST', path, await h.user(role), input, randomUUID())).status, 403);
  });
  await run('Disabled mode cannot manufacture success', async () => { assert.equal((await request('POST', path, customer, input, randomUUID(), '/disabled')).status, 503); });
  await run('Strict payload/key/query validation', async () => {
    for (const body of [{ ...input, amount: '0' }, { ...input, user_id: outsider }, { ...input, payment_status: 'SUCCESS' }, { ...input, duration_days: 10 }, { ...input, payment_method: '' }]) assert.equal((await request('POST', path, customer, body, randomUUID())).status, 400);
    assert.equal((await request('POST', path, customer, input)).status, 400);
    assert.equal((await request('POST', path, customer, input, 'bad')).status, 400);
    assert.equal((await request('GET', '/payments/me?status=SUCCESS', customer)).status, 400);
  });
  await run('Package isolation and hidden resources', async () => {
    for (const item of [f.packages[3], f.packages[4]]) assert.equal((await request('POST', path, customer, { ...input, package_id: item.packageId }, randomUUID())).status, 404);
    assert.equal((await request('POST', `/gyms/${f.gymC.gymId}/payments`, customer, { ...input, package_id: f.packages[5].packageId }, randomUUID())).status, 404);
  });
  const key = randomUUID(); let first: Awaited<ReturnType<typeof request<CheckoutData>>>;
  await run('Server-priced atomic success and demo marker', async () => {
    first = await request('POST', path, customer, input, key); assert.equal(first.status, 201);
    assert.equal(first.body.data.payment.amount, '10.00'); assert.equal(first.body.data.membership.purchase_price, '10.00');
    assert.equal(first.body.data.payment.payment_status, 'SUCCESS'); assert.equal(first.body.data.membership.status, 'ACTIVE');
    assert.equal(first.body.data.membership.payment_id, key); assert.equal(first.body.data.demo, true);
    assert.equal(first.headers.get('cache-control'), 'no-store');
  });
  await run('Replay retains amount/dates after Package price/duration/status change', async () => {
    await h.database.update(packages).set({ price: '77.00', durationDays: 60, status: 'INACTIVE' }).where(eq(packages.packageId, input.package_id));
    const replay = await request('POST', path, customer, input, key); assert.equal(replay.status, 200);
    assert.deepEqual(replay.body.data.membership, first!.body.data.membership); assert.equal(replay.body.data.payment.amount, '10.00');
    await h.database.update(packages).set({ status: 'ACTIVE' }).where(eq(packages.packageId, input.package_id));
  });
  await run('Idempotency scope/input conflicts do not leak or create', async () => {
    assert.equal((await request('POST', path, outsider, input, key)).status, 409);
    assert.equal((await request('POST', path, customer, { ...input, payment_method: 'CHANGED' }, key)).status, 409);
    assert.equal((await request('POST', `/gyms/${f.gymB.gymId}/payments`, customer, { package_id: f.packages[4].packageId, payment_method: input.payment_method }, key)).status, 409);
  });
  await run('Concurrent identical POST creates exactly one Payment/Membership', async () => {
    const concurrentKey = randomUUID();
    const results = await Promise.all(Array.from({ length: 5 }, () => request('POST', path, customer, input, concurrentKey)));
    assert.equal(results.filter(r => r.status === 201).length, 1); assert.equal(results.filter(r => r.status === 200).length, 4);
    assert.equal((await h.database.select().from(payments).where(eq(payments.paymentId, concurrentKey))).length, 1);
    assert.equal((await h.database.select().from(memberships).where(eq(memberships.paymentId, concurrentKey))).length, 1);
  });
  await run('Every demo method, zero and max decimal remain exact', async () => {
    for (const method of ['CARD', 'BANK_TRANSFER', 'WALLET', 'custom']) assert.equal((await request('POST', path, customer, { ...input, payment_method: method }, randomUUID())).status, 201);
    for (const price of ['0.00', '999999999999.99']) {
      await h.database.update(packages).set({ price }).where(eq(packages.packageId, input.package_id));
      const result = await request('POST', path, customer, input, randomUUID()); assert.equal(result.status, 201); assert.equal(result.body.data.payment.amount, price);
    }
  });
  await run('Ownership and paged history', async () => {
    assert.equal((await request('GET', `/payments/${key}`, customer)).status, 200);
    assert.equal((await request('GET', `/payments/${key}`, outsider)).status, 404);
    const history = await request<unknown[]>('GET', '/payments/me?page=1&pageSize=2', customer);
    assert.equal(history.body.data.length, 2); assert.equal(history.body.pagination.hasNextPage, true);
    assert.equal((await request<unknown[]>('GET', '/memberships/me', outsider)).body.data.length, 0);
  });
  await run('Revoke account/password/role prevents writes', async () => {
    await h.database.update(users).set({ mustChangePassword: true }).where(eq(users.userId, outsider));
    assert.equal((await request('POST', path, outsider, input, randomUUID())).body.error.code, 'PASSWORD_CHANGE_REQUIRED');
    await h.database.update(users).set({ mustChangePassword: false, status: 'INACTIVE' }).where(eq(users.userId, outsider));
    assert.equal((await request('POST', path, outsider, input, randomUUID())).body.error.code, 'ACCOUNT_DEACTIVATED');
    await h.database.update(users).set({ status: 'ACTIVE' }).where(eq(users.userId, outsider));
    await h.database.delete(userRoles).where(eq(userRoles.userId, outsider));
    assert.equal((await request('POST', path, outsider, input, randomUUID())).status, 403);
  });
  await run('Vietnam midnight and inclusive end-date calculation', async () => {
    assert.deepEqual(demoMembershipDates(new Date('2026-10-07T17:01:00Z'), 1), { startDate: '2026-10-08', endDate: '2026-10-08' });
    assert.deepEqual(demoMembershipDates(new Date('2026-10-07T00:00:00Z'), 30), { startDate: '2026-10-07', endDate: '2026-11-05' });
    assert.throws(() => demoMembershipDates(new Date(), 2147483647));
  });
  await run('Insert Membership failure rolls back Payment', async () => {
    const failingDb = new Proxy(h.database, { get(target, property, receiver) {
      if (property === 'transaction') return (callback: Parameters<typeof h.database.transaction>[0]) => h.database.transaction(tx => callback(new Proxy(tx, { get(inner, key, context) {
        if (key === 'insert') return (table: unknown) => { if (table === memberships) throw new Error('test failure after Payment insert'); return inner.insert(table as typeof payments); };
        return Reflect.get(inner, key, context);
      } })));
      return Reflect.get(target, property, receiver);
    } });
    const rollbackKey = randomUUID(); await assert.rejects(createPaymentService(failingDb, true).createDemo(customer, f.gymA.gymId, rollbackKey, input));
    assert.equal((await h.database.select().from(payments).where(eq(payments.paymentId, rollbackKey))).length, 0);
  });
  console.log(`PASS: ${checks} demo Payment HTTP/DB cases.`);
} finally {
  await new Promise<void>(resolve => server.close(() => resolve())); await h.close();
}
