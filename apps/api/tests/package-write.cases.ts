import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { packages, payments, memberships } from '../src/database/schema/index.js';
import type { PackageCase, PackageHarness, PackageDto } from './package-test-fixture.js';

const input = { package_name: '  Monthly  ', duration_days: 30, price: '00012.5', description: 'Month plan' };
export const packageWriteCases = (h: PackageHarness): PackageCase[] => [
  ['Malformed/scalar JSON is a safe validation error and never logs the payload', async () => {
    const f = await h.fixture();
    const logged: string[] = [];
    const original = console.error;
    console.error = (...args: unknown[]) => { logged.push(args.map(String).join(' ')); };
    try {
      for (const [body, rawJson] of [['private_payload_sentinel', false], ['{"package_name":"private_payload_sentinel",', true]] as const) {
        const result = await h.request('POST', f.path, f.admin, body, rawJson);
        assert.equal(result.status, 400); assert.equal(result.body.error.code, 'VALIDATION_ERROR');
        assert.equal(result.headers.get('cache-control'), 'no-store');
        assert.ok(!JSON.stringify(result.body).includes('private_payload_sentinel'));
      }
      assert.ok(!logged.join(' ').includes('private_payload_sentinel'));
    } finally { console.error = original; }
  }],
  ['Admin and assigned Manager create ACTIVE packages with canonical price', async () => {
    const f = await h.fixture();
    for (const actor of [f.admin, f.manager]) {
      const result = await h.request('POST', f.path, actor, input);
      assert.equal(result.status, 201); assert.equal(result.body.data.gym_id, f.gymA.gymId);
      assert.equal(result.body.data.package_name, 'Monthly'); assert.equal(result.body.data.price, '12.50');
      assert.equal(result.body.data.duration_days, 30); assert.equal(result.body.data.status, 'ACTIVE');
      assert.equal(result.headers.get('cache-control'), 'no-store');
      assert.deepEqual((await h.request('GET', `${f.path}/${result.body.data.package_id}`, null)).body.data, result.body.data);
    }
    const zero = await h.request('POST', f.path, f.admin, { ...input, price: '0' });
    assert.equal(zero.status, 201); assert.equal(zero.body.data.price, '0.00');
    const max = await h.request('POST', f.path, f.admin, { ...input, price: '999999999999.99', duration_days: 2147483647 });
    assert.equal(max.status, 201); assert.equal(max.body.data.price, '999999999999.99');
  }],
  ['Strict body validation rejects spoofed scope/status, quota and invalid decimal/domain values', async () => {
    const f = await h.fixture();
    for (const extra of ['gym_id', 'package_id', 'status', 'user_id', 'role', 'created_at', 'updated_at', 'pt_sessions']) {
      assert.equal((await h.request('POST', f.path, f.admin, { ...input, [extra]: 'spoofed' })).status, 400, extra);
      assert.equal((await h.request('PATCH', `${f.path}/${f.packages[0].packageId}`, f.admin, { [extra]: 'spoofed' })).status, 400, extra);
    }
    for (const price of [-1, 1, null, '', '-1', 'NaN', 'Infinity', '1e2', '1.234', '1000000000000', '12,50', '+1', '1.', '.5']) {
      assert.equal((await h.request('POST', f.path, f.admin, { ...input, price })).status, 400, String(price));
    }
    for (const duration_days of [0, -1, 0.5, 2147483648, '30', null]) {
      assert.equal((await h.request('POST', f.path, f.admin, { ...input, duration_days })).status, 400, String(duration_days));
    }
    for (const body of [{}, [], { package_name: ' ', duration_days: 30, price: '10' }, { ...input, description: 9 }]) {
      assert.equal((await h.request('POST', f.path, f.admin, body)).status, 400);
    }
    assert.equal((await h.request('PATCH', `${f.path}/${f.packages[0].packageId}`, f.admin, {})).status, 400);
    assert.equal((await h.request('POST', `${f.path}?status=INACTIVE`, f.admin, input)).status, 400);
  }],
  ['Partial PATCH preserves identity, created/status/omitted fields and clears description', async () => {
    const f = await h.fixture(); const before = f.packages[0];
    const result = await h.request('PATCH', `${f.path}/${before.packageId}`, f.manager, { package_name: 'Updated', description: null });
    assert.equal(result.status, 200);
    assert.equal(result.body.data.package_name, 'Updated'); assert.equal(result.body.data.description, null);
    assert.equal(result.body.data.price, before.price); assert.equal(result.body.data.duration_days, before.durationDays);
    assert.equal(result.body.data.package_id, before.packageId); assert.equal(result.body.data.gym_id, before.gymId);
    assert.equal(result.body.data.status, before.status); assert.equal(result.body.data.created_at, before.createdAt.toISOString());
    assert.ok(new Date(result.body.data.updated_at) >= before.updatedAt);
  }],
  ['Price/duration/status changes preserve Payment and purchased Membership history', async () => {
    const f = await h.fixture(); const pkg = f.packages[0]; const owner = await h.user('CUSTOMER');
    const [payment] = await h.database.insert(payments).values({ userId: owner, gymId: f.gymA.gymId,
      packageId: pkg.packageId, amount: '10.00', paymentMethod: 'fixture-only', paymentStatus: 'SUCCESS', paidAt: new Date() }).returning();
    const [member] = await h.database.insert(memberships).values({ userId: owner, gymId: f.gymA.gymId,
      packageId: pkg.packageId, paymentId: payment.paymentId, purchasePrice: '10.00',
      startDate: '2026-01-01', endDate: '2026-01-30', status: 'ACTIVE' }).returning();
    assert.equal((await h.request('PATCH', `${f.path}/${pkg.packageId}`, f.manager, { price: '99.99', duration_days: 7 })).status, 200);
    for (const state of ['deactivate', 'activate', 'deactivate']) {
      const response = await h.request('PATCH', `${f.path}/${pkg.packageId}/${state}`, f.manager);
      assert.equal(response.status, 200); assert.equal(response.body.data.price, '99.99');
      assert.deepEqual((await h.database.select().from(payments).where(eq(payments.paymentId, payment.paymentId)))[0], payment);
      assert.deepEqual((await h.database.select().from(memberships).where(eq(memberships.membershipId, member.membershipId)))[0], member);
    }
  }],
  ['Status actions are repeatable and reject client-controlled body fields', async () => {
    const f = await h.fixture(); const id = f.packages[0].packageId;
    for (const status of ['deactivate', 'deactivate', 'activate', 'activate']) {
      const result = await h.request('PATCH', `${f.path}/${id}/${status}`, f.admin, {});
      assert.equal(result.status, 200); assert.equal(result.body.data.status, status === 'activate' ? 'ACTIVE' : 'INACTIVE');
    }
    for (const body of [{ status: 'ACTIVE' }, { force: true }, { cascade: true }, { note: 'not allowed' }, []]) {
      assert.equal((await h.request('PATCH', `${f.path}/${id}/deactivate`, f.admin, body)).status, 400);
    }
    assert.equal((await h.request('PATCH', `${f.path}/${randomUUID()}/activate`, f.admin)).status, 404);
  }],
  ['Internal list supports ACTIVE/INACTIVE filters, pagination and inactive Gym catalog', async () => {
    const f = await h.fixture();
    for (const actor of [f.admin, f.manager]) {
      const all = await h.request<PackageDto[]>('GET', f.management, actor);
      assert.equal(all.status, 200); assert.equal(all.body.pagination.totalItems, 4);
      for (const [status, total] of [['ACTIVE', 3], ['INACTIVE', 1]] as const) {
        const list = await h.request<PackageDto[]>('GET', `${f.management}?status=${status}`, actor);
        assert.equal(list.body.pagination.totalItems, total); assert.ok(list.body.data.every(row => row.status === status));
      }
    }
    const page = await h.request<PackageDto[]>('GET', `${f.management}?pageSize=2&page=2&sortBy=package_name&sortOrder=asc`, f.manager);
    assert.equal(page.body.pagination.hasPreviousPage, true); assert.equal(page.body.data.length, 2);
    const inactive = await h.request<PackageDto[]>('GET', `/gyms/${f.gymC.gymId}/management/packages`, f.admin);
    assert.equal(inactive.status, 200); assert.equal(inactive.body.pagination.totalItems, 1);
    assert.equal((await h.request('POST', `/gyms/${f.gymC.gymId}/packages`, f.admin, input)).status, 201);
    assert.equal((await h.request('GET', `/gyms/${f.gymC.gymId}/packages`, null)).status, 404);
    assert.equal((await h.request('GET', `${f.management}?status=DELETED`, f.admin)).status, 400);
    assert.equal((await h.request('GET', `${f.management}?sortBy=password_hash`, f.admin)).status, 400);
  }],
  ['Concurrent independent PATCH and status updates preserve every changed field', async () => {
    const f = await h.fixture(); const id = f.packages[0].packageId;
    const requests = await Promise.all([
      h.request('PATCH', `${f.path}/${id}`, f.manager, { package_name: 'Concurrent' }),
      h.request('PATCH', `${f.path}/${id}`, f.admin, { price: '123.45' }),
      h.request('PATCH', `${f.path}/${id}/deactivate`, f.manager),
    ]);
    assert.ok(requests.every(row => row.status === 200));
    const [row] = await h.database.select().from(packages).where(eq(packages.packageId, id));
    assert.equal(row.packageName, 'Concurrent'); assert.equal(row.price, '123.45'); assert.equal(row.status, 'INACTIVE');
    assert.equal(row.durationDays, 30);
  }],
];
