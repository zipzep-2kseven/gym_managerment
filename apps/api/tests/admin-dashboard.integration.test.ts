import assert from 'node:assert/strict';
import express from 'express';
import cookieParser from 'cookie-parser';
import { once } from 'node:events';
import { packageTestHarness } from './package-test-fixture.js';
import { createAdminDashboardService } from '../src/services/admin-dashboard.service.js';
import { createAdminDashboardRouter } from '../src/routes/admin-dashboard.routes.js';
import { errorHandler } from '../src/middleware/error-handler.js';
import { config } from '../src/config/index.js';
import { signJwt } from '../src/utils/jwt.js';
const h = await packageTestHarness();
const service = createAdminDashboardService(h.database, () => new Date('2026-10-01T01:00:00Z'));
const app = express(); app.use(cookieParser(), createAdminDashboardRouter(service), errorHandler);
const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
try {
  const f = await h.fixture();
  const seed = async (amount: string, status: string, paidAt: string | null) => h.pool.query(
    `INSERT INTO payments(user_id,gym_id,package_id,amount,payment_method,payment_status,paid_at)
    VALUES($1,$2,$3,$4,'CASH',$5,$6)`, [f.admin, f.gymA.gymId, f.packages[0].packageId, amount, status, paidAt]);
  const empty = await service.summary(f.admin);
  assert.equal(empty.daily_revenue.length, 7);
  assert.ok(empty.daily_revenue.every(day => Number(day.amount) === 0));
  await seed('100.25', 'SUCCESS', '2026-09-30T16:59:59Z'); // Sep 30 VN
  await seed('200.50', 'SUCCESS', '2026-09-30T17:00:00Z'); // Oct 1 VN
  await seed('10.25', 'SUCCESS', '2026-10-01T01:00:00Z'); // exact as_of
  await seed('999', 'SUCCESS', '2026-10-01T01:00:01Z'); // future
  await seed('999', 'REFUNDED', '2026-10-01T00:00:00Z');
  await seed('999', 'FAILED', '2026-10-01T00:00:00Z');
  await seed('999', 'PENDING', null);
  await seed('999', 'SUCCESS', null);
  await seed('999', 'SUCCESS', '2026-09-24T16:59:59Z'); // before seven days
  const result = await service.summary(f.admin);
  assert.equal(result.month, '2026-10');
  assert.equal(result.month_revenue, '210.75');
  assert.equal(result.daily_revenue[0].date, '2026-09-25');
  assert.equal(result.daily_revenue[5].amount, '100.25');
  assert.equal(result.daily_revenue[6].amount, '210.75');
  const counts = (await h.pool.query(`SELECT (SELECT count(*) FROM gyms)::int gyms, (SELECT count(*) FROM users)::int users`)).rows[0];
  assert.equal(result.total_gyms, counts.gyms); assert.equal(result.total_accounts, counts.users);
  assert.equal(result.active_gyms, 2);
  console.log('PASS dashboard: decimal totals, VN midnight/month boundary, future/null/refunded exclusion and zero-filled days');
  await assert.rejects(service.summary(f.manager), { statusCode: 403 });
  const url = `http://127.0.0.1:${(server.address() as {port:number}).port}/admin/dashboard`;
  assert.equal((await fetch(url)).status, 401);
  const headers = { Cookie: `${config.cookie.name}=${signJwt({ sub: f.admin, email: 'claim@example.test', roles: [] })}` };
  const response = await fetch(url, { headers });
  assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'no-store');
  await h.pool.query(`DELETE FROM user_roles WHERE user_id=$1`, [f.admin]);
  assert.equal((await fetch(url, { headers })).status, 403);
  const locked = await h.user('ADMIN');
  await h.pool.query(`UPDATE users SET status='SUSPENDED' WHERE user_id=$1`, [locked]);
  await assert.rejects(service.summary(locked), { statusCode: 403 });
  console.log('PASS dashboard: authentication, current role, suspended account and HTTP no-store');
} finally {
  await new Promise<void>(resolve => server.close(() => resolve())); await h.close();
}
