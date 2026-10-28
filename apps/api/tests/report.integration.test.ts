import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { mkdtemp, readdir, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import express from 'express';
import cookieParser from 'cookie-parser';
import { eq } from 'drizzle-orm';
import { packageTestHarness } from './package-test-fixture.js';
import { createReportService } from '../src/services/report.service.js';
import { createReportImageStore } from '../src/services/report-image-store.js';
import { createReportRouter } from '../src/routes/report.routes.js';
import { errorHandler } from '../src/middleware/error-handler.js';
import { signJwt } from '../src/utils/jwt.js';
import { config } from '../src/config/index.js';
import { memberships, gymManagers, gymReports, users } from '../src/database/schema/index.js';
const h = await packageTestHarness(), directory = await mkdtemp(join(tmpdir(), 'gym-report-'));
const service = createReportService(h.database, createReportImageStore(directory, true));
const app = express(); app.use(cookieParser()); app.use('/api/v1', createReportRouter(service));
// GET/PATCH need normal parser while POST route parses bounded images itself.
app.use(errorHandler);
const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
const port = (server.address() as { port: number }).port;
const request = async (method: string, path: string, actor: string | null, body?: unknown) => {
  const response = await fetch(`http://127.0.0.1:${port}/api/v1${path}`, { method,
    headers: { 'Content-Type': 'application/json', ...(actor ? { Cookie: `${config.cookie.name}=${signJwt({ sub: actor, email: 'report@test.local', roles: ['ADMIN'] })}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const contentType = response.headers.get('content-type') || '';
  return { status: response.status, headers: response.headers, body: contentType.includes('json') ? await response.json() as { data: { report_id: string; has_image: boolean; length: number }; error: { code: string } } : undefined };
};
const png = { mime_type: 'image/png', data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jL1sAAAAASUVORK5CYII=' };
let checks = 0;
const run = async (name: string, fn: () => Promise<void>) => { await fn(); checks++; console.log(`PASS report: ${name}`); };
try {
  const f = await h.fixture(), customer = await h.user('CUSTOMER'), outsider = await h.user('CUSTOMER'), admin = await h.user('ADMIN');
  const managerB = await h.user('MANAGER');
  await h.database.insert(gymManagers).values({ gymId: f.gymB.gymId, userId: managerB });
  const membership = (await h.database.insert(memberships).values({ userId: customer, gymId: f.gymA.gymId, packageId: f.packages[0].packageId, startDate: '2020-01-01', endDate: '2099-12-31', purchasePrice: '10', status: 'ACTIVE' }).returning())[0];
  const path = `/gyms/${f.gymA.gymId}/reports`;
  await run('Guest and unqualified role/card denied; forged ADMIN JWT does not grant access', async () => {
    assert.equal((await request('POST', path, null, { content: 'Máy bị hỏng' })).status, 401);
    for (const actor of [outsider, admin, f.manager]) assert.equal((await request('POST', path, actor, { content: 'Máy bị hỏng' })).status, 403);
    assert.equal((await request('POST', `/gyms/${f.gymB.gymId}/reports`, customer, { content: 'Máy bị hỏng' })).status, 403);
  });
  let id: string;
  await run('Photo + content creates server-owned PENDING report with no equipment', async () => {
    const response = await request('POST', path, customer, { content: 'Máy chạy bộ gần cửa bị đứng', image: png });
    assert.equal(response.status, 201); id = response.body!.data.report_id;
    assert.equal(response.headers.get('cache-control'), 'no-store'); assert.equal(response.body!.data.has_image, true);
    const [row] = await h.database.select().from(gymReports).where(eq(gymReports.reportId, id));
    assert.equal(row.equipmentId, null); assert.equal(row.userId, customer); assert.equal(row.status, 'PENDING');
    assert.ok(!JSON.stringify(response.body).includes(row.imageUrl!)); assert.equal((await readdir(directory)).length, 1);
  });
  await run('Owner/local Manager/Admin may read private image; others never receive bytes', async () => {
    for (const actor of [customer, f.manager, admin]) { const result = await request('GET', `/reports/${id}/image`, actor); assert.equal(result.status, 200); assert.equal(result.headers.get('x-content-type-options'), 'nosniff'); }
    for (const actor of [outsider, managerB]) assert.equal((await request('GET', `/reports/${id}/image`, actor)).status, 403);
    assert.equal((await request('GET', `/reports/${id}/image`, null)).status, 401);
    assert.equal((await request('GET', '/reports/invalid/image', customer)).status, 400);
  });
  await run('Strict allowlist and image signatures; no orphan files for bad requests', async () => {
    for (const extra of [{ user_id: outsider }, { equipment_id: randomUUID() }, { status: 'RESOLVED' }, { image_url: 'https://foreign.test/a.jpg' }, { gym_id: f.gymB.gymId }]) assert.equal((await request('POST', path, customer, { content: 'Máy chạy bộ bị hỏng', ...extra })).status, 400);
    assert.equal((await request('POST', path, customer, { content: 'Máy bị hỏng', image: { mime_type: 'image/jpeg', data: png.data } })).status, 400);
    assert.equal((await request('POST', path, customer, { content: 'Máy bị hỏng', image: { mime_type: 'image/svg+xml', data: 'PHN2Zz4=' } })).status, 400);
    assert.equal((await request('POST', path, customer, { content: 'Máy bị hỏng', image: { mime_type: 'image/png', data: Buffer.alloc(5 * 1024 * 1024 + 1).toString('base64') } })).status, 400);
    assert.equal((await readdir(directory)).length, 1);
  });
  await run('Lists enforce scope, owner and strict pagination', async () => {
    assert.equal((await request('GET', path, managerB)).status, 403);
    assert.equal((await request('GET', '/reports/me', outsider)).body!.data.length, 0);
    assert.equal((await request('GET', '/reports/me', customer)).body!.data.length, 1);
    for (const query of ['?page=0', '?pageSize=101', '?status=BAD', '?user_id=other', '?page=1&page=2']) assert.equal((await request('GET', `/reports/me${query}`, customer)).status, 400);
  });
  await run('Terminal transitions are scoped, atomic and preserve original evidence', async () => {
    assert.equal((await service.change(outsider, f.gymA.gymId, id!, 'investigate', {}).catch(e => e)).statusCode, 403);
    await service.change(f.manager, f.gymA.gymId, id!, 'investigate', {});
    const results = await Promise.allSettled([service.change(f.manager, f.gymA.gymId, id!, 'resolve', { resolution_note: 'Đã sửa băng chuyền' }), service.change(f.manager, f.gymA.gymId, id!, 'reject', { resolution_note: 'Không xác định được sự cố' })]);
    assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
    const [row] = await h.database.select().from(gymReports).where(eq(gymReports.reportId, id!));
    assert.equal(row.content, 'Máy chạy bộ gần cửa bị đứng'); assert.equal(row.userId, customer); assert.ok(row.resolvedBy);
    assert.equal(row.resolvedAt !== null, row.status === 'RESOLVED');
    await assert.rejects(service.change(admin, f.gymA.gymId, id!, 'investigate', {}));
  });
  await run('Expired card blocks new submissions but not history/photos; no photo is valid', async () => {
    await h.database.update(memberships).set({ endDate: '2020-12-31' }).where(eq(memberships.membershipId, membership.membershipId));
    assert.equal((await request('POST', path, customer, { content: 'Máy bị hỏng' })).status, 403);
    assert.equal((await request('GET', '/reports/me', customer)).body!.data.length, 1);
    assert.equal((await request('GET', `/reports/${id}/image`, customer)).status, 200);
    await h.database.update(memberships).set({ endDate: '2099-12-31' }).where(eq(memberships.membershipId, membership.membershipId));
    const noPhoto = await request('POST', path, customer, { content: 'Sàn gần cửa bị trơn' }); assert.equal(noPhoto.status, 201); assert.equal(noPhoto.body!.data.has_image, false);
    await service.change(f.manager, f.gymA.gymId, noPhoto.body!.data.report_id, 'reject', { resolution_note: 'Đã kiểm tra, đây là báo cáo trùng' });
    await h.database.update(users).set({ status: 'INACTIVE' }).where(eq(users.userId, customer));
    assert.equal((await request('GET', '/reports/me', customer)).status, 403);
  });
  await run('Admin reads reports and images but cannot process them', async () => {
    assert.equal((await request('GET', path, admin)).status, 200);
    assert.equal((await request('GET', `/reports/${id!}/image`, admin)).status, 200);
    for (const action of ['investigate', 'resolve', 'reject']) {
      assert.equal((await request('PATCH', `${path}/${id!}/${action}`, admin,
        action === 'investigate' ? {} : { resolution_note: 'Trái quyền' })).status, 403);
    }
    assert.equal((await request('GET', path, f.manager)).status, 200);
    assert.equal((await request('GET', path, managerB)).status, 403);
    assert.equal((await request('GET', path, null)).status, 401);
  });
  await run('Migration allows unlinked equipment reports and rollback preserves incompatible data', async () => {
    const legacy = (await h.pool.query("INSERT INTO gym_reports(user_id,gym_id,report_type,title,content) VALUES($1,$2,'EQUIPMENT','Legacy','Unlinked machine report') RETURNING report_id", [customer, f.gymA.gymId])).rows[0];
    const rollback = await readFile(new URL('../drizzle/rollback/0004_report_without_equipment.sql', import.meta.url), 'utf8');
    await assert.rejects(h.pool.query(rollback));
    assert.equal((await h.pool.query('SELECT report_id FROM gym_reports WHERE report_id=$1', [legacy.report_id])).rowCount, 1);
    await h.pool.query('DELETE FROM gym_reports WHERE report_id=$1', [legacy.report_id]);
    await h.pool.query(rollback);
    await h.pool.query('ALTER TABLE gym_reports DROP CONSTRAINT gym_reports_equipment_required_check');
  });
  console.log(`PASS: ${checks} report integration groups.`);
} finally { await new Promise<void>(resolve => server.close(() => resolve())); await h.close(); await rm(directory, { recursive: true, force: true }); }
