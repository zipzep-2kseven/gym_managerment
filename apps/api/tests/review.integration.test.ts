import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createPaymentService } from '../src/services/payment.service.js';
import { once } from 'node:events';
import express from 'express';
import cookieParser from 'cookie-parser';
import { eq } from 'drizzle-orm';
import { packageTestHarness } from './package-test-fixture.js';
import { createReviewService } from '../src/services/review.service.js';
import { createReviewRouter } from '../src/routes/review.routes.js';
import { errorHandler } from '../src/middleware/error-handler.js';
import { signJwt } from '../src/utils/jwt.js';
import { config } from '../src/config/index.js';
import { memberships, gymTrainers, ptRegistrations, ptAppointments, users, roles, userRoles } from '../src/database/schema/index.js';
const h = await packageTestHarness(), service = createReviewService(h.database);
const app = express(); app.use(express.json(), cookieParser()); app.use('/api/v1', createReviewRouter(service)); app.use(errorHandler);
const server = app.listen(0, '127.0.0.1'); await once(server, 'listening'); const port = (server.address() as {port: number}).port;
interface Data { review_id: string; rating: number; status: string; comment: string | null; eligible: boolean; review: Data | null; items: Data[]; total: number; average_rating: number | null }
const request = async (method: string, path: string, actor: string | null, body?: unknown) => {
 const response = await fetch(`http://127.0.0.1:${port}/api/v1${path}`, { method, headers: { 'Content-Type': 'application/json', ...(actor ? { Cookie: `${config.cookie.name}=${signJwt({ sub: actor, email: 'claim@review.test', roles: ['ADMIN'] })}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
 return { status: response.status, headers: response.headers, body: await response.json() as {data: Data; error: {code: string}} };
};
let checks = 0; const run = async (name: string, fn: () => Promise<void>) => { await fn(); checks++; console.log(`PASS review: ${name}`); };
try {
 const f = await h.fixture(), customer = await h.user('CUSTOMER'), outsider = await h.user('CUSTOMER'), trainerUser = await h.user('PT'), foreignUser = await h.user('PT');
 const [trainer, foreign] = await h.database.insert(gymTrainers).values([{ gymId: f.gymA.gymId, userId: trainerUser }, { gymId: f.gymB.gymId, userId: foreignUser }]).returning();
 const member = async (actor: string, start = '2020-01-01', status = 'ACTIVE') => (await h.database.insert(memberships).values({ userId: actor, gymId: f.gymA.gymId, packageId: f.packages[0].packageId, startDate: start, endDate: '2099-12-31', purchasePrice: '10.00', status }).returning())[0];
 const m = await member(customer); const [reg] = await h.database.insert(ptRegistrations).values({ membershipId: m.membershipId, gymTrainerId: trainer.gymTrainerId, status: 'ACTIVE' }).returning();
 const gymPath = `/gyms/${f.gymA.gymId}/reviews`, trainerPath = `/gyms/${f.gymA.gymId}/trainers/${trainer.gymTrainerId}/reviews`;
 await run('Guest read only; real DB Customer role; cross-Gym trainer; strict query', async () => {
  assert.equal((await request('GET', gymPath, null)).body.data.average_rating, null);
  assert.equal((await request('POST', gymPath, null, {rating: 5})).status, 401);
  for (const actor of [f.admin, f.manager, trainerUser]) assert.equal((await request('POST', gymPath, actor, {rating: 5})).status, 403);
  assert.equal((await request('GET', `/gyms/${f.gymA.gymId}/trainers/${foreign.gymTrainerId}/reviews`, null)).status, 404);
  for (const query of ['page=0', 'pageSize=51', 'status=HIDDEN', 'user_id=x', 'page=1.2']) assert.equal((await request('GET', `${gymPath}?${query}`, null)).status, 400);
  assert.equal((await request('GET', `${gymPath}/me`, null)).status, 401);
  assert.equal((await request('GET', `${gymPath}/me?user_id=x`, customer)).status, 400);
  assert.equal((await request('POST', `${gymPath}?status=VISIBLE`, customer, {rating: 5})).status, 400);
  assert.equal((await request('POST', gymPath, outsider, {rating: 5})).body.error.code, 'REVIEW_NOT_ELIGIBLE');
 });
 await run('Strict rating/comment/actor fields; future or cancelled Membership ineligible', async () => {
  for (const body of [{rating: 0}, {rating: 6}, {rating: 2.5}, {rating: '5'}, {rating: 5, user_id: outsider}, {rating: 5, status: 'VISIBLE'}, {rating: 5, comment: 'x'.repeat(2001)}]) assert.equal((await request('POST', gymPath, customer, body)).status, 400);
  const future = await h.user('CUSTOMER'), cancelled = await h.user('CUSTOMER'); await member(future, '2090-01-01'); await member(cancelled, '2020-01-01', 'CANCELLED');
  for (const actor of [future, cancelled]) assert.equal((await request('GET', `${gymPath}/me`, actor)).body.data.eligible, false);
 });
 let gymReview = '';
 await run('Concurrent double-click exactly one insert; replay 409; trimmed content', async () => {
  const results = await Promise.all([request('POST', gymPath, customer, {rating: 5, comment: '  Tập luyện thuận tiện  '}), request('POST', gymPath, customer, {rating: 5, comment: 'Tập luyện thuận tiện'})]);
  assert.deepEqual(results.map(r => r.status).sort(), [201, 409]); gymReview = results.find(r => r.status === 201)!.body.data.review_id;
  const own = await request('GET', `${gymPath}/me`, customer); assert.equal(own.body.data.review!.comment, 'Tập luyện thuận tiện'); assert.equal(own.body.data.eligible, false); assert.equal(own.headers.get('cache-control'), 'no-store');
  assert.equal((await request('POST', gymPath, customer, {rating: 1})).status, 409);
 });
 await run('PT requires COMPLETED session; pending/cancelled insufficient; correct trainer and membership', async () => {
  assert.equal((await request('GET', `${trainerPath}/me`, customer)).body.data.eligible, false);
  await h.database.insert(ptAppointments).values({ registrationId: reg.registrationId, startTime: new Date('2026-01-01T01:00:00Z'), endTime: new Date('2026-01-01T02:00:00Z'), status: 'CANCELLED' }).returning();
  assert.equal((await request('POST', trainerPath, customer, {rating: 4})).status, 403);
  await h.database.insert(ptAppointments).values({registrationId: reg.registrationId, startTime: new Date('2026-01-02T01:00:00Z'), endTime: new Date('2026-01-02T02:00:00Z'), status: 'COMPLETED'});
  assert.equal((await request('GET', `${trainerPath}/me`, customer)).body.data.eligible, true);
  const created = await request('POST', trainerPath, customer, {rating: 4, comment: 'Hướng dẫn rõ ràng'}); assert.equal(created.status, 201);
  assert.equal((await request('POST', `/gyms/${f.gymB.gymId}/trainers/${foreign.gymTrainerId}/reviews`, customer, {rating: 4})).status, 403);
 });
 await run('Hidden review retained, excluded from public stats, cannot send replacement; no private fields', async () => {
  await service.hide(f.admin, 'gym', gymReview, 'Vi phạm thông tin riêng');
  const publicResult = await request('GET', gymPath, null); assert.equal(publicResult.body.data.total, 0); assert.equal(publicResult.body.data.average_rating, null); assert.equal(publicResult.body.data.items.length, 0);
  const own = await request('GET', `${gymPath}/me`, customer); assert.equal(own.body.data.review!.status, 'HIDDEN'); assert.ok(!/hidden_|password|email|phone|user_id/.test(JSON.stringify(own.body)));
  assert.equal((await request('POST', gymPath, customer, {rating: 5})).status, 409);
  const publicTrainer = await request('GET', trainerPath, null); assert.equal(publicTrainer.body.data.average_rating, 4); assert.ok(!/hidden_|password|email|phone|user_id/.test(JSON.stringify(publicTrainer.body)));
  await assert.rejects(h.pool.query('DELETE FROM gym_reviews WHERE gym_review_id=$1', [gymReview]));
  await assert.rejects(h.pool.query("UPDATE gym_reviews SET comment='changed' WHERE gym_review_id=$1", [gymReview]));
 });
 await run('Expired Membership eligible; stable pagination and visible-only aggregate', async () => {
  const actors = await Promise.all(Array.from({length: 3}, () => h.user('CUSTOMER')));
  for (let i = 0; i < actors.length; i++) { await member(actors[i], '2020-01-01', 'EXPIRED'); assert.equal((await request('POST', gymPath, actors[i], {rating: i + 1})).status, 201); }
  const a = await request('GET', `${gymPath}?pageSize=2`, null), b = await request('GET', `${gymPath}?pageSize=2&page=2`, null);
  assert.equal(a.body.data.total, 3); assert.equal(a.body.data.average_rating, 2); assert.equal(a.body.data.items.length, 2); assert.equal(b.body.data.items.length, 1); assert.equal(new Set([...a.body.data.items, ...b.body.data.items].map(r => r.review_id)).size, 3);
 });
 await run('Demo purchase provides eligible Membership without PT; no replay after renewal', async () => {
  const buyer = await h.user('CUSTOMER');
  await createPaymentService(h.database, true).createDemo(buyer, f.gymA.gymId, randomUUID(), {package_id: f.packages[0].packageId, payment_method: 'CARD'});
  assert.equal((await request('GET', `${gymPath}/me`, buyer)).body.data.eligible, true);
  assert.equal((await request('POST', gymPath, buyer, {rating: 5})).status, 201);
  await createPaymentService(h.database, true).createDemo(buyer, f.gymA.gymId, randomUUID(), {package_id: f.packages[0].packageId, payment_method: 'WALLET'});
  assert.equal((await request('POST', gymPath, buyer, {rating: 5})).status, 409);
 });
 await run('Staff conflict of interest, account/password/role revocation and inactive target', async () => {
  const [customerRole] = await h.database.select().from(roles).where(eq(roles.roleName, 'CUSTOMER'));
  for (const actor of [f.manager, trainerUser]) { await h.database.insert(userRoles).values({userId: actor, roleId: customerRole.roleId}); await member(actor); assert.equal((await request('GET', `${gymPath}/me`, actor)).body.data.eligible, false); }
  await h.database.update(users).set({mustChangePassword: true}).where(eq(users.userId, outsider)); assert.equal((await request('POST', gymPath, outsider, {rating: 5})).status, 403);
  await h.database.update(users).set({mustChangePassword: false, status: 'SUSPENDED'}).where(eq(users.userId, outsider)); assert.equal((await request('POST', gymPath, outsider, {rating: 5})).status, 403);
  const revoked = await h.user('CUSTOMER'); await member(revoked); await h.database.delete(userRoles).where(eq(userRoles.userId, revoked)); assert.equal((await request('POST', gymPath, revoked, {rating: 5})).status, 403);
  assert.equal((await request('GET', `/gyms/${f.gymC.gymId}/reviews`, null)).status, 404);
  await h.database.update(gymTrainers).set({status: 'INACTIVE'}).where(eq(gymTrainers.gymTrainerId, foreign.gymTrainerId));
  assert.equal((await request('GET', `/gyms/${f.gymB.gymId}/trainers/${foreign.gymTrainerId}/reviews`, null)).status, 404);
 });
 console.log(`PASS review integration: ${checks} groups`);
} finally { await new Promise<void>(r => server.close(() => r())); await h.close(); }
