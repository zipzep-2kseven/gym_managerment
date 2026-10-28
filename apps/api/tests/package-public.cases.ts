import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { gyms } from '../src/database/schema/index.js';
import type { PackageCase, PackageHarness, PackageDto } from './package-test-fixture.js';

export const packagePublicCases = (h: PackageHarness): PackageCase[] => [
  ['Database failures return safe 500 responses without raw SQL or private data', async () => {
    const f = await h.fixture();
    for (const [method, path, actor, body] of [
      ['GET', f.path, null, undefined], ['GET', f.management, f.admin, undefined],
      ['POST', f.path, f.admin, { package_name: 'Test', duration_days: 30, price: '10' }],
    ] as const) {
      const result = await h.request(method, `/failure${path}`, actor, body);
      assert.equal(result.status, 500); assert.equal(result.body.error.code, 'INTERNAL_SERVER_ERROR');
      for (const secret of ['SQL', 'private_hash_sentinel', 'stack']) assert.ok(!JSON.stringify(result.body).includes(secret));
    }
  }],
  ['Guest ACTIVE-only projection and decimal-string DTO', async () => {
    const f = await h.fixture();
    const list = await h.request<PackageDto[]>('GET', f.path, null);
    assert.equal(list.status, 200); assert.equal(list.body.success, true);
    assert.equal(list.headers.get('cache-control'), 'no-store');
    assert.equal(list.body.pagination.totalItems, 3); assert.equal(list.body.pagination.pageSize, 20);
    const keys = ['package_id', 'gym_id', 'package_name', 'description', 'duration_days', 'price', 'status', 'created_at', 'updated_at'].sort();
    for (const row of list.body.data) {
      assert.equal(row.gym_id, f.gymA.gymId); assert.equal(row.status, 'ACTIVE');
      assert.deepEqual(Object.keys(row).sort(), keys); assert.equal(typeof row.price, 'string');
      assert.match(row.created_at, /Z$/);
    }
    const detail = await h.request('GET', `${f.path}/${f.packages[2].packageId}`, null);
    assert.equal(detail.status, 200); assert.equal(detail.body.data.price, '999999999999.99');
    assert.deepEqual(Object.keys(detail.body.data).sort(), keys);
    for (const word of ['private_hash_sentinel', 'user_id', 'quota', 'payment_id']) assert.ok(!JSON.stringify(list.body).includes(word));
  }],
  ['Pagination totals/ties, empty search and beyond-last page', async () => {
    const f = await h.fixture();
    const first = await h.request<PackageDto[]>('GET', `${f.path}?pageSize=2`, null);
    const second = await h.request<PackageDto[]>('GET', `${f.path}?pageSize=2&page=2`, null);
    assert.deepEqual(first.body.pagination, { page: 1, pageSize: 2, totalItems: 3, totalPages: 2, hasNextPage: true, hasPreviousPage: false });
    assert.deepEqual([...first.body.data, ...second.body.data].map(row => row.package_id), f.packages.slice(0, 3).map(row => row.packageId).sort());
    assert.deepEqual((await h.request<PackageDto[]>('GET', `${f.path}?page=99`, null)).body.data, []);
    const empty = await h.request<PackageDto[]>('GET', `${f.path}?search=${randomUUID()}`, null);
    assert.equal(empty.body.pagination.totalPages, 0); assert.equal(empty.body.pagination.hasNextPage, false);
    assert.deepEqual(empty.body.data, []);
  }],
  ['Search escapes wildcards, case and injection; sorting is numeric', async () => {
    const f = await h.fixture();
    for (const [search, index] of [['  aLPHa  ', 0], ['harbor%_\\', 1], ['Literal%_\\', 2]] as const) {
      const found = await h.request<PackageDto[]>('GET', `${f.path}?search=${encodeURIComponent(search)}`, null);
      assert.deepEqual(found.body.data.map(row => row.package_id), [f.packages[index].packageId]);
    }
    const numeric = await h.request<PackageDto[]>('GET', `${f.path}?sortBy=price&sortOrder=asc`, null);
    assert.deepEqual(numeric.body.data.map(row => row.price), ['2.00', '10.00', '999999999999.99']);
    const days = await h.request<PackageDto[]>('GET', `${f.path}?sortBy=duration_days&sortOrder=desc`, null);
    assert.deepEqual(days.body.data.map(row => row.duration_days), [365, 30, 7]);
    const injected = await h.request<PackageDto[]>('GET', `${f.path}?search=${encodeURIComponent("' OR 1=1 --")}`, null);
    assert.equal(injected.body.pagination.totalItems, 0);
  }],
  ['Public query and UUID allowlist validation', async () => {
    const f = await h.fixture();
    for (const query of ['page=0', 'page=-1', 'page=1.5', 'page=1e3', 'pageSize=0', 'pageSize=101',
      'page=9007199254740991&pageSize=100', 'page=1&page=2', 'search[x]=test', 'status=INACTIVE',
      'sortBy=password_hash', 'sortOrder=sideways', 'gym_id=other']) {
      const result = await h.request('GET', `${f.path}?${query}`, null);
      assert.equal(result.status, 400, query); assert.equal(result.body.error.code, 'VALIDATION_ERROR');
    }
    assert.equal((await h.request('GET', '/gyms/not-a-uuid/packages', null)).status, 400);
    assert.equal((await h.request('GET', `${f.path}/not-a-uuid`, null)).status, 400);
    assert.equal((await h.request('GET', `${f.path}/${f.packages[0].packageId}?status=ACTIVE`, null)).status, 400);
  }],
  ['Hidden, missing and wrong-Gym resources return the same safe 404', async () => {
    const f = await h.fixture();
    const hidden = await h.request('GET', `${f.path}/${f.packages[3].packageId}`, null);
    const other = await h.request('GET', `${f.path}/${f.packages[4].packageId}`, null);
    const missing = await h.request('GET', `${f.path}/${randomUUID()}`, null);
    for (const row of [hidden, other, missing]) { assert.equal(row.status, 404); assert.deepEqual(row.body, missing.body); }
    for (const id of [f.gymC.gymId, randomUUID()]) {
      const list = await h.request('GET', `/gyms/${id}/packages`, null);
      const detail = await h.request('GET', `/gyms/${id}/packages/${f.packages[0].packageId}`, null);
      assert.equal(list.status, 404); assert.deepEqual(list.body, missing.body); assert.equal(detail.status, 404);
    }
  }],
  ['Visibility tracks Package and parent Gym changes on next request', async () => {
    const f = await h.fixture(); const id = f.packages[0].packageId;
    assert.equal((await h.request('PATCH', `${f.path}/${id}/deactivate`, f.manager)).status, 200);
    assert.equal((await h.request('GET', `${f.path}/${id}`, null)).status, 404);
    assert.equal((await h.request<PackageDto[]>('GET', f.path, null)).body.pagination.totalItems, 2);
    assert.equal((await h.request('PATCH', `${f.path}/${id}/activate`, f.manager)).status, 200);
    await h.database.update(gyms).set({ status: 'INACTIVE' }).where(eq(gyms.gymId, f.gymA.gymId));
    assert.equal((await h.request('GET', f.path, null)).status, 404);
    assert.equal((await h.request('GET', `${f.path}/${id}`, null)).status, 404);
    await h.database.update(gyms).set({ status: 'ACTIVE' }).where(eq(gyms.gymId, f.gymA.gymId));
    assert.equal((await h.request('GET', `${f.path}/${id}`, null)).status, 200);
  }],
];
