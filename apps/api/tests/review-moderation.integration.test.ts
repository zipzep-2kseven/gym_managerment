import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import express from 'express';
import cookieParser from 'cookie-parser';
import { eq } from 'drizzle-orm';
import { packageTestHarness } from './package-test-fixture.js';
import { createReviewService } from '../src/services/review.service.js';
import { createReviewModerationService } from '../src/services/review-moderation.service.js';
import { createReviewRouter } from '../src/routes/review.routes.js';
import { createReviewModerationRouter } from '../src/routes/review-moderation.routes.js';
import { errorHandler } from '../src/middleware/error-handler.js';
import { signJwt } from '../src/utils/jwt.js';
import { config } from '../src/config/index.js';
import { memberships, gymTrainers, ptRegistrations, ptAppointments, gyms, users, userRoles, roles } from '../src/database/schema/index.js';
const h = await packageTestHarness(), review = createReviewService(h.database), moderation = createReviewModerationService(h.database);
const app = express(); app.use(express.json(), cookieParser()); app.use('/api/v1', createReviewRouter(review), createReviewModerationRouter(moderation)); app.use(errorHandler);
const server = app.listen(0, '127.0.0.1'); await once(server, 'listening'); const port = (server.address() as {port: number}).port;
interface Row {review_id: string; kind: string; rating: number; comment: string; status: string; moderation: {hidden_by: string; hidden_at: string; hidden_reason: string}; gym: {gym_id: string}; trainer: {gym_trainer_id: string} | null}
const request = async (method: string, path: string, actor: string | null, body?: unknown) => {
 const response = await fetch(`http://127.0.0.1:${port}/api/v1${path}`, {method, headers: {'Content-Type': 'application/json', ...(actor ? {Cookie: `${config.cookie.name}=${signJwt({sub: actor, email: 'claim@moderation.test', roles: ['ADMIN']})}`} : {})}, body: body === undefined ? undefined : JSON.stringify(body)});
 return {status: response.status, headers: response.headers, body: await response.json() as {data: Row & {items: Row[]; total: number; average_rating: number|null}; error: {code: string}}};
};
let checks = 0; const run = async (name: string, fn: () => Promise<void>) => {await fn(); checks++; console.log(`PASS moderation: ${name}`);};
try {
 const f = await h.fixture(), customer = await h.user('CUSTOMER'), pt = await h.user('PT'), admin2 = await h.user('ADMIN');
 const [trainer] = await h.database.insert(gymTrainers).values({gymId: f.gymB.gymId, userId: pt}).returning();
 const [_a,b] = await h.database.insert(memberships).values([{userId: customer, gymId: f.gymA.gymId, packageId: f.packages[0].packageId}, {userId: customer, gymId: f.gymB.gymId, packageId: f.packages[4].packageId}].map(m => ({...m, status: 'EXPIRED', startDate: '2020-01-01', endDate: '2021-01-01', purchasePrice: '10.00'}))).returning();
 const [reg] = await h.database.insert(ptRegistrations).values({membershipId: b.membershipId, gymTrainerId: trainer.gymTrainerId, status: 'COMPLETED'}).returning();
 await h.database.insert(ptAppointments).values({registrationId: reg.registrationId, startTime: new Date('2020-06-01T01:00:00Z'), endTime: new Date('2020-06-01T02:00:00Z'), status: 'COMPLETED'});
 const ga = await review.create(customer, {kind: 'gym', id: f.gymA.gymId}, {rating: 1, comment: 'Góp ý về dịch vụ'}), gb = await review.create(customer, {kind: 'gym', id: f.gymB.gymId}, {rating: 5, comment: 'Nội dung cần xử lý'}), tr = await review.create(customer, {kind: 'trainer', id: trainer.gymTrainerId, gymId: f.gymB.gymId}, {rating: 2, comment: 'Nội dung PT'});
 const id = (r: typeof ga) => 'gymReviewId' in r ? r.gymReviewId : r.trainerReviewId;
 const hide = (kind: string, value: string) => `/admin/reviews/${kind}/${value}/hide`;
 await run('Only DB-current Admin; Guest/Customer/Manager/PT denied', async () => {
  assert.equal((await request('GET', '/admin/reviews', null)).status, 401);
  for (const actor of [customer, f.manager, pt]) {assert.equal((await request('GET', '/admin/reviews', actor)).status, 403); assert.equal((await request('PATCH', hide('gym', id(ga)), actor, {hidden_reason: 'Lý do'})).status, 403);}
 });
 await run('Kind/Gym/status pagination, safe DTO, low rating stays visible', async () => {
  const all = await request('GET', '/admin/reviews?pageSize=1', f.admin); assert.equal(all.status, 200); assert.equal(all.body.data.total, 2); assert.equal(all.body.data.items.length, 1); assert.equal(all.headers.get('cache-control'), 'no-store');
  const filtered = await request('GET', `/admin/reviews?gym_id=${f.gymA.gymId}`, f.admin); assert.equal(filtered.body.data.total, 1); assert.equal(filtered.body.data.items[0].rating, 1); assert.equal(filtered.body.data.items[0].status, 'VISIBLE');
  const trainers = await request('GET', '/admin/reviews?kind=trainer', f.admin); assert.equal(trainers.body.data.total, 1); assert.equal(trainers.body.data.items[0].trainer!.gym_trainer_id, trainer.gymTrainerId);
  assert.ok(!/password|email|phone|cookie|token/.test(JSON.stringify(trainers.body)));
  assert.equal((await request('GET', `/admin/reviews?gym_id=${randomUUID()}`, f.admin)).body.data.total, 0);
 });
 await run('Strict body/query/params; nonexistent/wrong kind; validation has no write', async () => {
  for (const body of [{hidden_reason: ''}, {hidden_reason: '  '}, {hidden_reason: 'x'.repeat(1001)}, {hidden_reason: 'reason', hidden_by: admin2}, {hidden_reason: 'reason', rating: 5}, {hidden_reason: 'reason', status: 'HIDDEN'}]) assert.equal((await request('PATCH', hide('gym', id(gb)), f.admin, body)).status, 400);
  for (const q of ['kind=all', 'status=ACTIVE', 'page=0', 'pageSize=51', 'user_id=x']) assert.equal((await request('GET', `/admin/reviews?${q}`, f.admin)).status, 400);
  assert.equal((await request('PATCH', `${hide('gym', id(gb))}?gym_id=${f.gymA.gymId}`, f.admin, {hidden_reason: 'reason'})).status, 400);
  assert.equal((await request('PATCH', hide('trainer', id(gb)), f.admin, {hidden_reason: 'reason'})).status, 404);
  assert.equal((await request('PATCH', hide('other', id(gb)), f.admin, {hidden_reason: 'reason'})).status, 400);
 });
 await run('Concurrent hiding once, original content/audit immutable, public aggregate removes hidden', async () => {
  const responses = await Promise.all([request('PATCH', hide('gym', id(gb)), f.admin, {hidden_reason: '  Tiết lộ thông tin riêng  '}), request('PATCH', hide('gym', id(gb)), admin2, {hidden_reason: 'Spam'})]);
  assert.deepEqual(responses.map(r => r.status).sort(), [200,409]); const saved = responses.find(r => r.status===200)!.body.data;
  assert.equal(saved.status, 'HIDDEN'); assert.equal(saved.comment, 'Nội dung cần xử lý'); assert.equal(saved.rating, 5); assert.ok(saved.moderation.hidden_at); assert.ok([f.admin,admin2].includes(saved.moderation.hidden_by));
  const before = await h.pool.query('select to_jsonb(r) data from gym_reviews r where gym_review_id=$1', [id(gb)]);
  assert.equal((await request('PATCH', hide('gym', id(gb)), f.admin, {hidden_reason: 'Overwrite'})).status,409);
  assert.deepEqual((await h.pool.query('select to_jsonb(r) data from gym_reviews r where gym_review_id=$1',[id(gb)])).rows,before.rows);
  const publicResult = await request('GET', `/gyms/${f.gymB.gymId}/reviews`,null); assert.equal(publicResult.body.data.total,0); assert.equal(publicResult.body.data.average_rating,null);
  const own = await request('GET', `/gyms/${f.gymB.gymId}/reviews/me`,customer); assert.ok(!/hidden_reason|hidden_by|hidden_at/.test(JSON.stringify(own.body)));
  await assert.rejects(h.pool.query("update gym_reviews set comment='changed' where gym_review_id=$1",[id(gb)])); await assert.rejects(h.pool.query('delete from gym_reviews where gym_review_id=$1',[id(gb)]));
 });
 await run('Historical reviews remain manageable with PT/Gym INACTIVE', async () => {
  await h.database.update(gymTrainers).set({status: 'INACTIVE'}).where(eq(gymTrainers.gymTrainerId,trainer.gymTrainerId));
  await h.database.update(gyms).set({status: 'INACTIVE'}).where(eq(gyms.gymId,f.gymB.gymId));
  assert.equal((await request('GET', '/admin/reviews?kind=trainer',f.admin)).body.data.total,1);
  const hidden = await request('PATCH',hide('trainer',id(tr)),f.admin,{hidden_reason:'Nội dung không liên quan'}); assert.equal(hidden.status,200); assert.equal(hidden.body.data.trainer!.gym_trainer_id,trainer.gymTrainerId);
  assert.equal((await request('GET', '/admin/reviews?kind=trainer&status=HIDDEN',f.admin)).body.data.total,1);
  assert.equal((await request('GET',`/gyms/${f.gymB.gymId}/trainers/${trainer.gymTrainerId}/reviews`,null)).status,404);
 });
 await run('Revoked role, suspended account, temporary password gate despite old JWT', async () => {
  const [adminRole] = await h.database.select().from(roles).where(eq(roles.roleName,'ADMIN'));
  await h.database.delete(userRoles).where(eq(userRoles.userId,admin2)); assert.equal((await request('GET','/admin/reviews',admin2)).status,403);
  await h.database.insert(userRoles).values({userId:admin2,roleId:adminRole.roleId}); await h.database.update(users).set({mustChangePassword:true}).where(eq(users.userId,admin2)); assert.equal((await request('PATCH',hide('gym',id(ga)),admin2,{hidden_reason:'reason'})).status,403);
  await h.database.update(users).set({mustChangePassword:false,status:'SUSPENDED'}).where(eq(users.userId,admin2)); assert.equal((await request('GET','/admin/reviews',admin2)).status,403);
 });
 console.log(`PASS review moderation: ${checks} groups`);
} finally {await new Promise<void>(r=>server.close(()=>r())); await h.close();}
