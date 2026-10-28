import assert from 'node:assert/strict';
import { once } from 'node:events';
import express from 'express';
import cookieParser from 'cookie-parser';
import { eq } from 'drizzle-orm';
import { packageTestHarness } from './package-test-fixture.js';
import { gymTrainers, gymManagers, users, memberships, ptWorkingSchedules, ptAppointments } from '../src/database/schema/index.js';
import { createTrainerProfileService } from '../src/services/trainer-profile.service.js';
import { createTrainerProfileRouter } from '../src/routes/trainer-profile.routes.js';
import { createPublicTrainerRepository } from '../src/repositories/public-trainer.repository.js';
import { createPtWorkflowService } from '../src/services/pt-workflow.service.js';
import { errorHandler } from '../src/middleware/error-handler.js';
import { config } from '../src/config/index.js';
import { signJwt } from '../src/utils/jwt.js';
const h = await packageTestHarness(), service = createTrainerProfileService(h.database);
const app = express(); app.use(express.json(), cookieParser()); app.use('/api/v1', createTrainerProfileRouter(service)); app.use(errorHandler);
const server = app.listen(0, '127.0.0.1'); await once(server, 'listening'); const port = (server.address() as { port: number }).port;
type Profile = NonNullable<Awaited<ReturnType<typeof service.mine>>>;
const request = async (method: string, path: string, actor: string | null, body?: unknown) => {
 const response = await fetch(`http://127.0.0.1:${port}/api/v1${path}`, { method, headers: { 'Content-Type': 'application/json', ...(actor ? { Cookie: `${config.cookie.name}=${signJwt({ sub: actor, email: 'claim@profile.test', roles: ['ADMIN'] })}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
 return { status: response.status, headers: response.headers, body: await response.json() as { data: Profile; error: { code: string } } };
};
let checks = 0; const run = async (name: string, fn: () => Promise<void>) => { await fn(); checks++; console.log(`PASS trainer-profile: ${name}`); };
try {
 const f = await h.fixture(), pt = await h.user('PT'), ptB = await h.user('PT'), customer = await h.user('CUSTOMER'), managerB = await h.user('MANAGER');
 await h.database.insert(gymManagers).values({ gymId: f.gymB.gymId, userId: managerB });
 const [trainer, foreign] = await h.database.insert(gymTrainers).values([{ gymId: f.gymA.gymId, userId: pt, availability: 'ACCEPTING' }, { gymId: f.gymB.gymId, userId: ptB }]).returning();
 const managed = `/gyms/${f.gymA.gymId}/management/trainers/${trainer.gymTrainerId}/profile`;
 const input = async () => ({ expected_updated_at: (await service.mine(pt))!.updated_at, bio: 'Tập luyện an toàn', social_links: [{ platform: 'WEBSITE', url: 'https://example.com/pt' }], working_schedules: [{ day_of_week: 'MONDAY', start_time: '06:00', end_time: '10:00' }, { day_of_week: 'MONDAY', start_time: '10:00', end_time: '12:00' }] });
 await run('Self identity/real roles; Manager scope; projections no credentials or contact', async () => {
  assert.equal((await request('GET', '/trainer-profile/me', null)).status, 401);
  for (const actor of [customer, f.admin, f.manager]) assert.equal((await request('GET', '/trainer-profile/me', actor)).status, 403);
  const result = await request('GET', '/trainer-profile/me', pt); assert.equal(result.status, 200); assert.equal(result.body.data.gym_id, f.gymA.gymId); assert.equal(result.headers.get('cache-control'), 'no-store');
  for (const actor of [customer, pt, f.admin, managerB]) assert.equal((await request('GET', managed, actor)).status, 403);
  assert.equal((await request('GET', managed, f.manager)).status, 200);
  assert.equal((await request('GET', `/gyms/${f.gymA.gymId}/management/trainers/${foreign.gymTrainerId}/profile`, f.manager)).status, 404);
  assert.ok(!/password|email|phone|user_id/.test(JSON.stringify(result.body)));
 });
 await run('PT biography/social/multiple adjacent shifts publish; Manager cannot edit these fields', async () => {
  const saved = await request('PUT', '/trainer-profile/me', pt, await input()); assert.equal(saved.status, 200); assert.equal(saved.body.data.working_schedules.length, 2);
  const publicView = await createPublicTrainerRepository(h.database).detail(f.gymA.gymId, trainer.gymTrainerId); assert.equal(publicView!.bio, 'Tập luyện an toàn'); assert.equal(publicView!.social_links[0].url, 'https://example.com/pt'); assert.equal(publicView!.working_schedules.length, 2);
  assert.equal((await request('PATCH', managed, f.manager, { expected_updated_at: saved.body.data.updated_at, specialization: 'Strength', experience_years: 4, bio: 'overwrite' })).status, 400);
  assert.equal((await request('PUT', '/trainer-profile/me', pt, { ...await input(), specialization: 'Spoof' })).status, 400);
 });
 await run('Strict links/limits; overlapping/overnight/zero shifts rejected atomically', async () => {
  const base = await input(); const original = await service.mine(pt);
  const invalid = [
   { ...base, working_schedules: [{ day_of_week: 'MONDAY', start_time: '06:00', end_time: '10:00' }, { day_of_week: 'MONDAY', start_time: '09:00', end_time: '12:00' }] },
   { ...base, working_schedules: [{ day_of_week: 'MONDAY', start_time: '22:00', end_time: '06:00' }] },
   { ...base, working_schedules: [{ day_of_week: 'MONDAY', start_time: '06:00', end_time: '06:00' }] },
   { ...base, working_schedules: [{ day_of_week: 'MONDAY', start_time: '24:00', end_time: '25:00' }] },
   { ...base, social_links: [{ platform: 'WEBSITE', url: 'javascript:alert(1)' }] },
   { ...base, social_links: [{ platform: 'WEBSITE', url: 'https://user:password@example.com/' }] },
   { ...base, social_links: [...base.social_links, ...base.social_links] }, { ...base, user_id: ptB }, { ...base, bio: 'a'.repeat(2001) },
  ];
  for (const body of invalid) assert.equal((await request('PUT', '/trainer-profile/me', pt, body)).status, 400);
  assert.deepEqual(await service.mine(pt), original);
 });
 await run('Manager edits specialization/experience only; PT/other Manager denied and stale rejected', async () => {
  const body = { expected_updated_at: (await service.mine(pt))!.updated_at, specialization: 'Sức mạnh', experience_years: 5 };
  for (const actor of [pt, managerB, f.admin]) assert.equal((await request('PATCH', managed, actor, body)).status, 403);
  assert.equal((await request('PATCH', managed, f.manager, { ...body, experience_years: -1 })).status, 400);
  assert.equal((await request('PATCH', managed, f.manager, body)).status, 200);
  assert.equal((await request('PATCH', managed, f.manager, body)).status, 409);
  assert.equal((await service.mine(pt))!.specialization, 'Sức mạnh'); assert.equal((await service.mine(pt))!.bio, 'Tập luyện an toàn');
 });
 await run('Concurrent self updates: one succeeds; deleted shifts retain inactive history and reactivate ID', async () => {
  const before = await h.database.select().from(ptWorkingSchedules).where(eq(ptWorkingSchedules.gymTrainerId, trainer.gymTrainerId)); const body = await input();
  const result = await Promise.all([request('PUT', '/trainer-profile/me', pt, { ...body, working_schedules: [] }), request('PUT', '/trainer-profile/me', pt, { ...body, bio: 'Khác' })]);
  assert.deepEqual(result.map(r => r.status).sort(), [200, 409]);
  await service.saveMine(pt, { ...await input(), working_schedules: [] });
  assert.ok((await h.database.select().from(ptWorkingSchedules).where(eq(ptWorkingSchedules.gymTrainerId, trainer.gymTrainerId))).every(r => r.status === 'INACTIVE'));
  await service.saveMine(pt, await input());
  const after = await h.database.select().from(ptWorkingSchedules).where(eq(ptWorkingSchedules.gymTrainerId, trainer.gymTrainerId));
  assert.deepEqual(after.map(r => r.scheduleId).sort(), before.map(r => r.scheduleId).sort());
 });
 await run('Booking outside advisory hours allowed; changing/clearing hours preserves appointments', async () => {
  const member = (await h.database.insert(memberships).values({ userId: customer, gymId: f.gymA.gymId, packageId: f.packages[0].packageId, startDate: '2020-01-01', endDate: '2099-12-31', purchasePrice: '10', status: 'ACTIVE' }).returning())[0];
  const flow = createPtWorkflowService(h.database); const reg = await flow.register(customer, f.gymA.gymId, { membership_id: member.membershipId, gym_trainer_id: trainer.gymTrainerId });
  const date = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
  await flow.createAppointment(customer, f.gymA.gymId, { registration_id: reg.registration_id, start_time: `${date}T20:00:00+07:00`, end_time: `${date}T21:00:00+07:00` });
  const before = await h.database.select().from(ptAppointments);
  await service.saveMine(pt, { ...await input(), working_schedules: [] });
  assert.deepEqual(await h.database.select().from(ptAppointments), before);
 });
 await run('Account/password/revoked assignment gates take effect', async () => {
  await h.database.update(users).set({ mustChangePassword: true }).where(eq(users.userId, pt)); assert.equal((await request('GET', '/trainer-profile/me', pt)).status, 403);
  await h.database.update(users).set({ mustChangePassword: false }).where(eq(users.userId, pt));
  await h.database.update(gymManagers).set({ status: 'INACTIVE' }).where(eq(gymManagers.gymManagerId, f.assignment.gymManagerId)); assert.equal((await request('GET', managed, f.manager)).status, 403);
  await h.database.update(gymTrainers).set({ status: 'INACTIVE' }).where(eq(gymTrainers.gymTrainerId, foreign.gymTrainerId)); assert.equal((await request('GET', '/trainer-profile/me', ptB)).status, 403);
 });
 console.log(`PASS: ${checks} trainer-profile integration groups.`);
} finally { await new Promise<void>(resolve => server.close(() => resolve())); await h.close(); }
