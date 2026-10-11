import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { gymManagers, packages, users, userRoles } from '../src/database/schema/index.js';
import type { PackageCase, PackageHarness } from './package-test-fixture.js';

const input = { package_name: 'Monthly', duration_days: 30, price: '10.00' };
export const packageAuthCases = (h: PackageHarness): PackageCase[] => [
  ['All five private endpoints require authentication', async () => {
    const f = await h.fixture(); const id = f.packages[0].packageId;
    for (const [method, path, body] of [
      ['GET', f.management, undefined], ['POST', f.path, input],
      ['PATCH', `${f.path}/${id}`, { price: '2.00' }],
      ['PATCH', `${f.path}/${id}/deactivate`, {}], ['PATCH', `${f.path}/${id}/activate`, {}],
    ] as const) {
      const result = await h.request(method, path, null, body);
      assert.equal(result.status, 401); assert.equal(result.headers.get('cache-control'), 'no-store');
    }
  }],
  ['PT, Customer and role-only Manager denied despite forged ADMIN claims', async () => {
    const f = await h.fixture(); const id = f.packages[0].packageId;
    for (const role of ['PT', 'CUSTOMER', 'MANAGER']) {
      const actor = await h.user(role);
      for (const [method, path, body] of [
        ['GET', f.management, undefined], ['POST', f.path, input],
        ['PATCH', `${f.path}/${id}`, { price: '2.00' }],
        ['PATCH', `${f.path}/${id}/deactivate`, {}], ['PATCH', `${f.path}/${id}/activate`, {}],
      ] as const) assert.equal((await h.request(method, path, actor, body)).status, 403, `${role}: ${path}`);
    }
  }],
  ['Manager A cannot read/write Gym B; wrong-Gym Package IDs never alter rows', async () => {
    const f = await h.fixture(); const other = f.packages[4];
    const foreign = `/gyms/${f.gymB.gymId}/packages`;
    for (const [method, path, body] of [
      ['GET', `/gyms/${f.gymB.gymId}/management/packages`, undefined], ['POST', foreign, input],
      ['PATCH', `${foreign}/${other.packageId}`, { price: '2.00' }],
      ['PATCH', `${foreign}/${other.packageId}/deactivate`, {}], ['PATCH', `${foreign}/${other.packageId}/activate`, {}],
    ] as const) assert.equal((await h.request(method, path, f.manager, body)).status, 403);
    for (const actor of [f.admin, f.manager]) {
      for (const path of [`${f.path}/${other.packageId}`, `${f.path}/${other.packageId}/activate`, `${f.path}/${other.packageId}/deactivate`]) {
        assert.equal((await h.request('PATCH', path, actor, path.endsWith(other.packageId) ? { price: '2.00' } : {})).status, 404);
      }
    }
    assert.deepEqual((await h.database.select().from(packages).where(eq(packages.packageId, other.packageId)))[0], other);
  }],
  ['Current account/password gates and revoked role/assignment take effect immediately', async () => {
    const f = await h.fixture(); const id = f.packages[0].packageId;
    await h.database.update(gymManagers).set({ status: 'INACTIVE' }).where(eq(gymManagers.gymManagerId, f.assignment.gymManagerId));
    assert.equal((await h.request('PATCH', `${f.path}/${id}`, f.manager, { price: '2.00' })).status, 403);
    assert.equal((await h.request('GET', f.management, f.manager)).status, 403);
    for (const patch of [{ status: 'INACTIVE' }, { status: 'SUSPENDED' }, { mustChangePassword: true }]) {
      const actor = await h.user('ADMIN'); await h.database.update(users).set(patch).where(eq(users.userId, actor));
      for (const [method, path, body] of [['GET', f.management, undefined], ['POST', f.path, input]] as const) {
        const result = await h.request(method, path, actor, body);
        assert.equal(result.status, 403); assert.equal(result.body.error.code, 'mustChangePassword' in patch ? 'PASSWORD_CHANGE_REQUIRED' : 'ACCOUNT_DEACTIVATED');
      }
    }
    const formerAdmin = await h.user('ADMIN'); await h.database.delete(userRoles).where(eq(userRoles.userId, formerAdmin));
    assert.equal((await h.request('POST', f.path, formerAdmin, input)).status, 403);
    assert.equal((await h.request('POST', f.path, randomUUID(), input)).status, 401);
    assert.equal((await h.request('POST', `/gyms/${randomUUID()}/packages`, f.admin, input)).status, 404);
  }],
  ['A write waiting behind committed assignment revocation rechecks authorization', async () => {
    const f = await h.fixture(); const holder = await h.pool.connect();
    try {
      await holder.query('BEGIN');
      await holder.query("UPDATE gym_managers SET status='INACTIVE' WHERE gym_manager_id=$1", [f.assignment.gymManagerId]);
      const writing = h.request('PATCH', `${f.path}/${f.packages[0].packageId}`, f.manager, { price: '456.78' });
      await h.waitForBlocked(holder); await holder.query('COMMIT');
      assert.equal((await writing).status, 403);
      const [row] = await h.database.select().from(packages).where(eq(packages.packageId, f.packages[0].packageId));
      assert.equal(row.price, '10.00');
    } finally { await holder.query('ROLLBACK'); holder.release(); }
  }],
];
