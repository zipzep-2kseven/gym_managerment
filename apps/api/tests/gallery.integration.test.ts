import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, readdir, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import express from 'express';
import cookieParser from 'cookie-parser';
import { eq } from 'drizzle-orm';
import { packageTestHarness } from './package-test-fixture.js';
import { createGalleryService } from '../src/services/gallery.service.js';
import { createGalleryImageStore, stripGalleryMetadata } from '../src/services/gallery-image-store.js';
import { createGalleryRouter } from '../src/routes/gallery.routes.js';
import { errorHandler } from '../src/middleware/error-handler.js';
import { gymImages, gymManagers, gyms } from '../src/database/schema/index.js';
import { signJwt } from '../src/utils/jwt.js';
import { config } from '../src/config/index.js';
const h = await packageTestHarness(), directory = await mkdtemp(join(tmpdir(), 'gallery-test-'));
const store = createGalleryImageStore(directory, true), service = createGalleryService(h.database, store);
const app = express(); app.use(cookieParser());
app.use((req, res, next) => req.method === 'POST' ? next() : express.json()(req, res, next));
app.use('/api/v1', createGalleryRouter(service)); app.use(errorHandler);
const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
const port = (server.address() as { port: number }).port;
type Dto = { image_id: string; gym_id: string; caption: string | null; display_order: number; updated_at: string };
const request = async (method: string, path: string, actor: string | null, body?: unknown) => {
  const result = await fetch(`http://127.0.0.1:${port}/api/v1${path}`, { method,
    headers: { 'Content-Type': 'application/json', ...(actor ? { Cookie: `${config.cookie.name}=${signJwt({ sub: actor, email: 'claim@test.local', roles: ['ADMIN'] })}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: result.status, headers: result.headers, body: result.headers.get('content-type')?.includes('json') ? await result.json() as { data: Dto | Dto[]; error: { code: string } } : null };
};
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jL1sAAAAASUVORK5CYII=', 'base64');
const photo = { mime_type: 'image/png', data: png.toString('base64') };
let checks = 0;
const run = async (name: string, fn: () => Promise<void>) => { await fn(); checks++; console.log(`PASS gallery: ${name}`); };
try {
 const f = await h.fixture(), customer = await h.user('CUSTOMER'), pt = await h.user('PT'), other = await h.user('MANAGER');
 await h.database.insert(gymManagers).values({ gymId: f.gymB.gymId, userId: other });
 const path = `/gyms/${f.gymA.gymId}/images`, privatePath = `/gyms/${f.gymA.gymId}/management/images`;
 await run('Guest lists ACTIVE Gym only; upload/private list use real DB role and assignment', async () => {
  assert.equal((await request('GET', path, null)).status, 200); assert.equal((await request('GET', `/gyms/${f.gymC.gymId}/images`, null)).status, 404);
  assert.equal((await request('POST', path, null, { image: photo })).status, 401);
  for (const actor of [customer, pt, other]) { assert.equal((await request('POST', path, actor, { image: photo })).status, 403); assert.equal((await request('GET', privatePath, actor)).status, 403); }
 });
 let first: Dto, second: Dto;
 await run('One image uploaded; DTO hides storage key; public/private bytes scope and no-store', async () => {
  const result = await request('POST', path, f.manager, { image: photo, caption: 'Khu tập' }); assert.equal(result.status, 201); first = result.body!.data as Dto;
  second = await service.upload(f.admin, f.gymA.gymId, { image: photo });
  assert.equal(first.display_order, 0); assert.equal(second.display_order, 1);
  const rows = await h.database.select().from(gymImages); assert.ok(!JSON.stringify(result.body).includes(rows[0].imageUrl));
  const image = await request('GET', `${path}/${first.image_id}/file`, null); assert.equal(image.status, 200); assert.equal(image.headers.get('cache-control'), 'no-store'); assert.equal(image.headers.get('x-content-type-options'), 'nosniff');
  assert.equal((await request('GET', `${privatePath}/${first.image_id}/file`, null)).status, 401);
  assert.equal((await request('GET', `${privatePath}/${first.image_id}/file`, other)).status, 403);
  assert.equal((await request('GET', `/gyms/${f.gymB.gymId}/images/${first.image_id}/file`, null)).status, 404);
 });
 await run('Strict image/caption validation; malformed files/oversize/paths rejected without writes', async () => {
  for (const extra of [{ image_url: '/tmp/file' }, { gym_id: f.gymB.gymId }, { display_order: 9 }, { user_id: customer }]) assert.equal((await request('POST', path, f.manager, { image: photo, ...extra })).status, 400);
  for (const image of [{ ...photo, mime_type: 'image/jpeg' }, { mime_type: 'image/svg+xml', data: 'PHN2Zz4=' }, { ...photo, data: Buffer.alloc(5 * 1024 * 1024 + 1).toString('base64') }]) assert.equal((await request('POST', path, f.manager, { image })).status, 400);
  assert.equal((await request('POST', path, f.manager, { image: photo, caption: 'a'.repeat(201) })).status, 400);
  assert.equal((await readdir(directory)).length, 2);
 });
 await run('Backend strips PNG text/EXIF and JPEG metadata, including between scans', async () => {
  const chunk = (name: string, data: Buffer) => { const out = Buffer.alloc(data.length + 12); out.writeUInt32BE(data.length); out.write(name, 4); data.copy(out, 8); return out; };
  const withExif = Buffer.concat([png.subarray(0, 33), chunk('eXIf', Buffer.from('GPSLatitudeSecret')), chunk('tEXt', Buffer.from('LocationSecret')), png.subarray(33)]);
  assert.deepEqual(stripGalleryMetadata(withExif, 'image/png'), png);
  const name = await store.save('00000000-0000-4000-8000-000000000099', { mime_type: 'image/png', data: withExif.toString('base64') });
  assert.deepEqual(await readFile(join(directory, name)), png); await store.remove(name);
  const jpeg = Buffer.from([255,216,255,225,0,5,71,80,83,255,218,0,2,1,2,255,225,0,5,71,80,83,255,217]);
  assert.deepEqual(stripGalleryMetadata(jpeg, 'image/jpeg'), Buffer.from([255,216,255,218,0,2,1,2,255,217]));
 });
 await run('Caption stale checks and complete atomic reorder reject duplicates/foreign IDs/old order', async () => {
  const update = await request('PATCH', `${path}/${first.image_id}`, f.manager, { caption: 'Chú thích mới', expected_updated_at: first.updated_at }); assert.equal(update.status, 200);
  assert.equal((await request('PATCH', `${path}/${first.image_id}`, f.manager, { caption: 'Stale', expected_updated_at: first.updated_at })).status, 409);
  const current = [first.image_id, second.image_id], next = [...current].reverse();
  assert.equal((await request('PATCH', `${path}/order`, f.manager, { expected_image_ids: current, image_ids: next })).status, 200);
  assert.deepEqual((await service.list(f.gymA.gymId)).map(r => r.image_id), next);
  assert.equal((await request('PATCH', `${path}/order`, f.manager, { expected_image_ids: current, image_ids: next })).status, 409);
  assert.equal((await request('PATCH', `${path}/order`, f.manager, { expected_image_ids: next, image_ids: [first.image_id, first.image_id] })).status, 409);
  assert.equal((await request('PATCH', `${path}/${first.image_id}`, other, { caption: 'Wrong Gym', expected_updated_at: first.updated_at })).status, 403);
 });
 await run('Gym INACTIVE hides list/bytes immediately, retains rows; authorized internal management still works', async () => {
  await h.database.update(gyms).set({ status: 'INACTIVE' }).where(eq(gyms.gymId, f.gymA.gymId));
  assert.equal((await request('GET', path, null)).status, 404); assert.equal((await request('GET', `${path}/${first.image_id}/file`, null)).status, 404);
  assert.equal((await request('GET', privatePath, f.manager)).status, 200); assert.equal((await request('GET', `${privatePath}/${first.image_id}/file`, f.admin)).status, 200);
  assert.equal((await service.list(f.gymA.gymId, f.admin)).length, 2);
  await h.database.update(gyms).set({ status: 'ACTIVE' }).where(eq(gyms.gymId, f.gymA.gymId));
 });
 await run('Delete removes row/file, other Gym cannot delete, old image URL returns 404', async () => {
  assert.equal((await request('DELETE', `${path}/${second.image_id}`, other)).status, 403);
  assert.equal((await request('DELETE', `${path}/${second.image_id}`, f.manager)).status, 200);
  assert.equal((await request('GET', `${path}/${second.image_id}/file`, null)).status, 404); assert.equal((await readdir(directory)).length, 1);
 });
 await run('Concurrent tenth upload: one commit only, no quota overflow or leftover file; revoke takes effect', async () => {
  for (let i = 0; i < 8; i++) await service.upload(f.manager, f.gymA.gymId, { image: photo });
  const result = await Promise.allSettled([service.upload(f.manager, f.gymA.gymId, { image: photo }), service.upload(f.admin, f.gymA.gymId, { image: photo })]);
  assert.equal(result.filter(r => r.status === 'fulfilled').length, 1); assert.equal((await service.list(f.gymA.gymId)).length, 10); assert.equal((await readdir(directory)).length, 10);
  assert.equal((await request('POST', path, f.manager, { image: photo })).status, 409);
  await h.database.update(gymManagers).set({ status: 'INACTIVE' }).where(eq(gymManagers.gymManagerId, f.assignment.gymManagerId));
  assert.equal((await request('GET', privatePath, f.manager)).status, 403); assert.equal((await request('DELETE', `${path}/${first.image_id}`, f.manager)).status, 403);
  await assert.rejects(createGalleryImageStore(directory, false).save('00000000-0000-4000-8000-000000000098', photo), e => (e as { statusCode: number }).statusCode === 503);
 });
 console.log(`PASS: ${checks} gallery integration groups.`);
} finally { await new Promise<void>(resolve => server.close(() => resolve())); await h.close(); await rm(directory, { recursive: true, force: true }); }
