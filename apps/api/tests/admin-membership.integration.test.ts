import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import express from 'express';
import cookieParser from 'cookie-parser';
import { and, eq } from 'drizzle-orm';
import { packageTestHarness } from './package-test-fixture.js';
import { createPtWorkflowService } from '../src/services/pt-workflow.service.js';
import { createPtWorkflowRouter } from '../src/routes/pt-workflow.routes.js';
import { errorHandler } from '../src/middleware/error-handler.js';
import { config } from '../src/config/index.js';
import { signJwt } from '../src/utils/jwt.js';
import { memberships, payments, users, userProfiles, userRoles, roles, gymManagers, gyms } from '../src/database/schema/index.js';

const h = await packageTestHarness();
let server: import('node:http').Server | undefined;
let groups = 0;
const run = async (name: string, action: () => Promise<void>) => { await action(); groups++; console.log(`PASS Admin Membership: ${name}`); };
try {
  const f = await h.fixture(), service = createPtWorkflowService(h.database);
  type MembershipList = Awaited<ReturnType<typeof service.listMemberships>>;
  const app = express();
  app.use(express.json(), cookieParser());
  app.use('/api/v1', createPtWorkflowRouter(service));
  app.use(errorHandler);
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = (server.address() as { port: number }).port;
  const request = async (path: string, actor: string | null = f.admin) => {
    const response = await fetch(`http://127.0.0.1:${port}/api/v1${path}`, { headers: actor ? {
      Cookie: `${config.cookie.name}=${signJwt({ sub: actor, email: 'claim@membership.test', roles: ['ADMIN'] })}`,
    } : {} });
    return { status: response.status, headers: response.headers, body: await response.json() as MembershipList & { error: { code: string } } };
  };
  const customer = await h.user('CUSTOMER'), named = await h.user('CUSTOMER'), pt = await h.user('PT');
  await h.database.update(users).set({ phone: '0902222333' }).where(eq(users.userId, named));
  await h.database.insert(userProfiles).values({ userId: named, fullName: 'Hội viên có hồ sơ' });
  const [payment] = await h.database.insert(payments).values({ userId: named, gymId: f.gymA.gymId, packageId: f.packages[0].packageId, amount: '12.34', paymentMethod: 'CASH', paymentStatus: 'SUCCESS' }).returning();
  const expected = await h.database.insert(memberships).values(Array.from({ length: 25 }, (_, index) => ({
    membershipId: `20000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    userId: index === 3 ? named : customer, gymId: f.gymA.gymId, packageId: f.packages[0].packageId,
    paymentId: index === 3 ? payment.paymentId : null, purchasePrice: index === 0 ? '0.00' : index === 1 ? '999999999999.99' : '12.34',
    startDate: '2020-01-01', endDate: '2021-01-01', status: ['PENDING', 'ACTIVE', 'EXPIRED', 'CANCELLED'][index % 4],
    createdAt: new Date('2020-01-01T00:00:00Z'), updatedAt: new Date('2020-01-01T17:00:00Z'),
  }))).returning();
  await h.database.insert(memberships).values({ userId: customer, gymId: f.gymB.gymId, packageId: f.packages[4].packageId, purchasePrice: '99.00', startDate: '2020-01-01', endDate: '2021-01-01', status: 'EXPIRED' });
  await h.database.update(gyms).set({ status: 'INACTIVE' }).where(eq(gyms.gymId, f.gymB.gymId));
  const path = `/gyms/${f.gymA.gymId}/memberships`;
  await run('Admin and local Manager read all four statuses, counted as cards rather than unique people', async () => {
    for (const actor of [f.admin, f.manager]) {
      const result = await request(path, actor);
      assert.equal(result.status, 200); assert.equal(result.headers.get('cache-control'), 'no-store');
      assert.equal(result.body.data.length, 20); assert.equal(result.body.pagination.totalItems, 25);
      assert.equal(new Set(result.body.data.map(row => row.user_id)).size, 2);
      assert.deepEqual([...new Set(result.body.data.map(row => row.status))].sort(), ['ACTIVE', 'CANCELLED', 'EXPIRED', 'PENDING']);
    }
  });
  await run('Two pages preserve created_at tie-break order with no duplicate/missing/cross-Gym rows', async () => {
    const first = (await request(path)).body, second = (await request(`${path}?page=2&pageSize=20`)).body;
    assert.deepEqual(first.pagination, { page: 1, pageSize: 20, totalItems: 25, totalPages: 2, hasNextPage: true, hasPreviousPage: false });
    assert.equal(second.data.length, 5); assert.equal(second.pagination.hasNextPage, false); assert.equal(second.pagination.hasPreviousPage, true);
    const rows = [...first.data, ...second.data];
    assert.deepEqual(rows.map(row => row.membership_id), expected.map(row => row.membershipId));
    assert.equal(new Set(rows.map(row => row.membership_id)).size, 25);
    assert.ok(rows.every(row => row.gym_id === f.gymA.gymId && row.gym.gym_id === f.gymA.gymId && row.package.package_id === f.packages[0].packageId && row.customer.user_id === row.user_id));
  });
  await run('Exact private projection preserves nullable joins/payment and decimal/date snapshots, exposing no contact/demo/credential', async () => {
    const result = await request(path);
    for (const row of result.body.data) {
      assert.deepEqual(Object.keys(row).sort(), ['membership_id', 'user_id', 'gym_id', 'package_id', 'payment_id', 'purchase_price', 'start_date', 'end_date', 'status', 'created_at', 'updated_at', 'customer', 'gym', 'package'].sort());
      assert.deepEqual(Object.keys(row.customer).sort(), ['full_name', 'user_id']);
      assert.deepEqual(Object.keys(row.gym).sort(), ['gym_id', 'gym_name']);
      assert.deepEqual(Object.keys(row.package).sort(), ['package_id', 'package_name']);
    }
    const [zero, large, , paid] = result.body.data;
    assert.equal(zero.customer.full_name, null); assert.equal(zero.payment_id, null); assert.equal(zero.purchase_price, '0.00');
    assert.equal(large.purchase_price, '999999999999.99'); assert.equal(large.status, 'ACTIVE'); assert.equal(large.end_date, '2021-01-01');
    assert.equal(paid.customer.full_name, 'Hội viên có hồ sơ'); assert.equal(paid.payment_id, payment.paymentId); assert.equal(paid.purchase_price, '12.34');
    assert.equal(zero.start_date, '2020-01-01'); assert.equal(zero.updated_at, '2020-01-01T17:00:00.000Z');
    for (const forbidden of ['email', 'phone', 'avatar', 'demo', 'password', 'private_hash_sentinel', '0902222333']) assert.ok(!JSON.stringify(result.body).includes(forbidden));
  });
  await run('Inactive Gym history is allowed; empty and out-of-range pages retain correct metadata', async () => {
    const history = await request(`/gyms/${f.gymB.gymId}/memberships`);
    assert.equal(history.status, 200); assert.equal(history.body.data.length, 1); assert.equal(history.body.data[0].status, 'EXPIRED');
    const empty = await request(`/gyms/${f.gymC.gymId}/memberships`);
    assert.equal(empty.status, 200); assert.deepEqual(empty.body.data, []); assert.equal(empty.body.pagination.totalPages, 0);
    const outside = await request(`${path}?page=3`);
    assert.deepEqual(outside.body.data, []); assert.equal(outside.body.pagination.totalItems, 25); assert.equal(outside.body.pagination.totalPages, 2);
  });
  await run('Guest/current roles/cross-Gym Manager/missing Gym and strict query validation remain authoritative', async () => {
    assert.equal((await request(path, null)).status, 401);
    for (const actor of [customer, pt, await h.user('MANAGER')]) assert.equal((await request(path, actor)).status, 403);
    assert.equal((await request(`/gyms/${f.gymB.gymId}/memberships`, f.manager)).status, 403);
    assert.equal((await request(`/gyms/${randomUUID()}/memberships`)).status, 404);
    assert.equal((await request('/gyms/invalid/memberships')).status, 400);
    for (const query of ['page=0', 'page=-1', 'page=1.5', 'page=1000001', 'page[]=1', 'page=1&page=2', 'pageSize=101', 'search=name', 'status=ACTIVE', 'sortBy=created_at', 'user_id=ignored']) assert.equal((await request(`${path}?${query}`)).status, 400, query);
  });
  await run('Revoked Admin and Manager assignments, suspended account and password gate reject existing token claims', async () => {
    const revoked = await h.user('ADMIN');
    await h.database.delete(userRoles).where(eq(userRoles.userId, revoked));
    assert.equal((await request(path, revoked)).status, 403);
    const [ptRole] = await h.database.select().from(roles).where(eq(roles.roleName, 'PT'));
    await h.database.insert(userRoles).values({ userId: revoked, roleId: ptRole.roleId });
    assert.equal((await request(path, revoked)).status, 403);
    const gatedAdmin = await h.user('ADMIN');
    assert.equal((await request(path, gatedAdmin)).status, 200);
    for (const state of [{ status: 'SUSPENDED' }, { status: 'ACTIVE', mustChangePassword: true }]) {
      await h.database.update(users).set(state).where(eq(users.userId, gatedAdmin));
      assert.equal((await request(path, gatedAdmin)).status, 403);
    }
    await h.database.update(gymManagers).set({ status: 'INACTIVE' }).where(and(eq(gymManagers.gymId, f.gymA.gymId), eq(gymManagers.userId, f.manager)));
    assert.equal((await request(path, f.manager)).status, 403);
  });
  await run('Repeated list/history reads leave Membership records and timestamps unchanged', async () => {
    const before = await h.database.select().from(memberships);
    await request(path); await request(`${path}?page=2`); await request(`/gyms/${f.gymB.gymId}/memberships`);
    assert.deepEqual(await h.database.select().from(memberships), before);
  });
  console.log(`PASS: ${groups} Admin Membership HTTP/DB groups.`);
} finally {
  if (server) await new Promise<void>((resolve, reject) => server!.close(error => error ? reject(error) : resolve()));
  await h.close();
}
