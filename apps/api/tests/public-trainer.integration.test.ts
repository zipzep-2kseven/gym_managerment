import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import express from 'express';
import { eq } from 'drizzle-orm';
import type { db as applicationDb } from '../src/database/index.js';
import { gyms, users, userProfiles, gymTrainers, ptSocialLinks, ptWorkingSchedules } from '../src/database/schema/index.js';
import { createPublicTrainerRepository } from '../src/repositories/public-trainer.repository.js';
import { createPublicTrainerService } from '../src/services/public-trainer.service.js';
import { createPublicTrainerRouter } from '../src/routes/public-trainer.routes.js';
import { errorHandler } from '../src/middleware/error-handler.js';

type TrainerDto = { gym_trainer_id: string; gym_id: string; availability: string;
  profile: { full_name: string; avatar_url: string | null } | null;
  social_links: Record<string, unknown>[]; working_schedules: Record<string, unknown>[] };
type Envelope<T> = { success: boolean; data: T; error: { code: string }; pagination: {
  page: number; pageSize: number; totalItems: number; totalPages: number; hasNextPage: boolean; hasPreviousPage: boolean;
} };
export async function testPublicTrainerIntegration(db: typeof applicationDb) {
  const [gym, other, empty] = await db.insert(gyms).values([
    { gymName: 'Public PT', address: 'A' }, { gymName: 'Other', address: 'B' }, { gymName: 'Empty', address: 'C' },
  ]).returning();
  const trainer = async (gymId: string, name: string | null, status = 'ACTIVE', availability = 'ACCEPTING') => {
    const [user] = await db.insert(users).values({ email: `${randomUUID()}@private-trainer.test`, passwordHash: 'private_hash_sentinel' }).returning();
    if (name) await db.insert(userProfiles).values({ userId: user.userId, fullName: name,
      avatarUrl: 'https://example.test/avatar.png', address: 'private_address_sentinel', dateOfBirth: '1990-01-01', gender: 'private_gender_sentinel' });
    return (await db.insert(gymTrainers).values({ userId: user.userId, gymId, status, availability,
      specialization: name === 'Beta' ? 'Yoga%_\\' : 'Fitness', experienceYears: 3, bio: 'Public biography',
      createdAt: new Date('2020-01-01') }).returning())[0];
  };
  const active = [await trainer(gym.gymId, 'Alpha'), await trainer(gym.gymId, 'Beta', 'ACTIVE', 'ALMOST_FULL'),
    await trainer(gym.gymId, null, 'ACTIVE', 'NOT_ACCEPTING')];
  const inactive = await trainer(gym.gymId, 'Hidden', 'INACTIVE');
  const outsider = await trainer(other.gymId, 'Other Gym');
  await db.insert(ptSocialLinks).values([
    { gymTrainerId: active[0].gymTrainerId, platform: 'WEBSITE', url: 'https://example.test/public' },
    { gymTrainerId: outsider.gymTrainerId, platform: 'WEBSITE', url: 'https://example.test/other-gym' },
  ]);
  await db.insert(ptWorkingSchedules).values([
    { gymTrainerId: active[0].gymTrainerId, dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '10:00', status: 'ACTIVE' },
    { gymTrainerId: active[0].gymTrainerId, dayOfWeek: 'TUESDAY', startTime: '12:00', endTime: '13:00', status: 'INACTIVE' },
    { gymTrainerId: outsider.gymTrainerId, dayOfWeek: 'FRIDAY', startTime: '09:00', endTime: '10:00', status: 'ACTIVE' },
  ]);
  const repository = createPublicTrainerRepository(db);
  const app = express();
  app.use('/api/v1', createPublicTrainerRouter(createPublicTrainerService(repository)));
  app.use('/failure', createPublicTrainerRouter(createPublicTrainerService({ ...repository,
    detail: async () => { throw new Error('private SQL sentinel'); },
  })));
  app.use(errorHandler);
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  const port = (server.address() as { port: number }).port;
  const path = `/gyms/${gym.gymId}/trainers`;
  const request = async <T = TrainerDto[]>(url: string, prefix = '/api/v1') => {
    const res = await fetch(`http://127.0.0.1:${port}${prefix}${url}`);
    return { status: res.status, headers: res.headers, body: await res.json() as Envelope<T> };
  };
  const cases: [string, () => Promise<void>][] = [
    ['Guest list is scoped and includes every availability; no login data in DTO', async () => {
      const result = await request(path);
      assert.equal(result.status, 200); assert.equal(result.body.success, true);
      assert.deepEqual(result.body.data.map(row => row.gym_trainer_id), active.map(row => row.gymTrainerId).sort());
      assert.deepEqual(result.body.data.map(row => row.availability).sort(), ['ACCEPTING', 'ALMOST_FULL', 'NOT_ACCEPTING'].sort());
      assert.equal(result.body.pagination.totalItems, 3); assert.equal(result.body.pagination.pageSize, 20);
      assert.equal(result.headers.get('cache-control'), 'no-store');
      for (const row of result.body.data) {
        assert.deepEqual(Object.keys(row).sort(), ['gym_trainer_id', 'gym_id', 'specialization', 'experience_years', 'bio',
          'status', 'availability', 'joined_at', 'profile', 'social_links', 'working_schedules'].sort());
        if (row.profile) assert.deepEqual(Object.keys(row.profile).sort(), ['avatar_url', 'full_name']);
      }
      const serialized = JSON.stringify(result.body);
      for (const forbidden of ['password', 'user_id', 'profile_id', 'date_of_birth', 'gender', 'email', 'phone', 'private_']) {
        assert.ok(!serialized.includes(forbidden), forbidden);
      }
    }],
    ['Detail includes only this PT social links and ACTIVE schedules; missing profile is safe', async () => {
      const detail = await request<TrainerDto>(`${path}/${active[0].gymTrainerId}`);
      assert.equal(detail.status, 200); assert.equal(detail.body.data.profile?.full_name, 'Alpha');
      assert.equal(detail.body.data.social_links.length, 1); assert.equal(detail.body.data.working_schedules.length, 1);
      assert.equal(detail.body.data.social_links[0].url, 'https://example.test/public');
      assert.equal(detail.body.data.working_schedules[0].day_of_week, 'MONDAY');
      assert.equal(detail.body.data.working_schedules[0].gym_trainer_id, active[0].gymTrainerId);
      assert.deepEqual(Object.keys(detail.body.data.social_links[0]).sort(),
        ['social_link_id', 'gym_trainer_id', 'platform', 'url', 'created_at', 'updated_at'].sort());
      assert.deepEqual(Object.keys(detail.body.data.working_schedules[0]).sort(),
        ['schedule_id', 'gym_trainer_id', 'day_of_week', 'start_time', 'end_time', 'status', 'created_at', 'updated_at'].sort());
      const missing = await request<TrainerDto>(`${path}/${active[2].gymTrainerId}`);
      assert.equal(missing.body.data.profile, null); assert.deepEqual(missing.body.data.social_links, []);
      assert.deepEqual(missing.body.data.working_schedules, []);
      assert.deepEqual((await request(path)).body.data.find(row => row.gym_trainer_id === active[0].gymTrainerId), detail.body.data);
    }],
    ['Inactive, foreign Gym, User ID and nonexistent trainer IDs return the same 404', async () => {
      const ids = [inactive.gymTrainerId, outsider.gymTrainerId, active[0].userId, randomUUID()];
      const responses = await Promise.all(ids.map(id => request(`${path}/${id}`)));
      for (const result of responses) {
        assert.equal(result.status, 404); assert.equal(result.body.error.code, 'NOT_FOUND');
        assert.deepEqual(result.body, responses[0].body);
      }
    }],
    ['Hidden/missing Gym returns 404 even for list; empty ACTIVE Gym returns empty page', async () => {
      try {
        await db.update(gyms).set({ status: 'INACTIVE' }).where(eq(gyms.gymId, gym.gymId));
        assert.equal((await request(path)).status, 404);
        assert.equal((await request(`${path}/${active[0].gymTrainerId}`)).status, 404);
      } finally { await db.update(gyms).set({ status: 'ACTIVE' }).where(eq(gyms.gymId, gym.gymId)); }
      assert.equal((await request(`/gyms/${randomUUID()}/trainers`)).status, 404);
      const result = await request(`/gyms/${empty.gymId}/trainers`);
      assert.equal(result.status, 200); assert.deepEqual(result.body.data, []); assert.equal(result.body.pagination.totalPages, 0);
      assert.equal((await request(path)).body.pagination.totalItems, 3);
    }],
    ['Pagination and literal name/specialization search match totals', async () => {
      const first = await request(`${path}?pageSize=2`); const second = await request(`${path}?pageSize=2&page=2`);
      assert.deepEqual(first.body.pagination, { page: 1, pageSize: 2, totalItems: 3, totalPages: 2, hasNextPage: true, hasPreviousPage: false });
      assert.equal(second.body.data.length, 1); assert.equal(second.body.pagination.hasNextPage, false);
      assert.deepEqual([...first.body.data, ...second.body.data].map(row => row.gym_trainer_id), active.map(row => row.gymTrainerId).sort());
      assert.deepEqual((await request(`${path}?page=100`)).body.data, []);
      for (const term of ['  beta  ', 'Yoga%_\\']) {
        const result = await request(`${path}?search=${encodeURIComponent(term)}`);
        assert.equal(result.body.pagination.totalItems, 1); assert.equal(result.body.data[0].gym_trainer_id, active[1].gymTrainerId);
      }
      assert.equal((await request(`${path}?search=${encodeURIComponent("' OR 1=1 --")}`)).body.pagination.totalItems, 0);
      const sorted = await request(`${path}?sortBy=full_name&sortOrder=asc`);
      assert.deepEqual(sorted.body.data.map(row => row.profile?.full_name ?? null), ['Alpha', 'Beta', null]);
    }],
    ['Strict query and UUID validation cannot widen public visibility', async () => {
      for (const query of ['status=INACTIVE', 'availability=ACCEPTING', 'page=0', 'pageSize=101', 'page=1.5',
        'page=1&page=2', 'search[x]=test', 'sortBy=password_hash', 'sortOrder=bad', 'page=9007199254740991&pageSize=100']) {
        const result = await request(`${path}?${query}`); assert.equal(result.status, 400, query);
        assert.equal(result.body.error.code, 'VALIDATION_ERROR');
      }
      assert.equal((await request('/gyms/bad/trainers')).status, 400);
      assert.equal((await request(`${path}/bad`)).status, 400);
    }],
    ['Revoked PT disappears on next read; reactivation restores same profile', async () => {
      const id = active[0].gymTrainerId;
      try {
        await db.update(gymTrainers).set({ status: 'INACTIVE' }).where(eq(gymTrainers.gymTrainerId, id));
        assert.equal((await request(`${path}/${id}`)).status, 404);
        const list = await request(path); assert.equal(list.body.pagination.totalItems, 2);
        assert.ok(!list.body.data.some(row => row.gym_trainer_id === id));
      } finally { await db.update(gymTrainers).set({ status: 'ACTIVE' }).where(eq(gymTrainers.gymTrainerId, id)); }
      assert.equal((await request<TrainerDto>(`${path}/${id}`)).body.data.profile?.full_name, 'Alpha');
    }],
    ['Internal read errors never expose SQL in responses', async () => {
      const result = await request(`${path}/${active[0].gymTrainerId}`, '/failure');
      assert.equal(result.status, 500); assert.equal(result.body.error.code, 'INTERNAL_SERVER_ERROR');
      assert.ok(!JSON.stringify(result.body).includes('sentinel'));
    }],
  ];
  try {
    for (const [label, run] of process.env.GYM_TEST_ORDER === 'reverse' ? [...cases].reverse() : cases) {
      try { await run(); } catch (error) { console.error(`FAIL public PT: ${label}`); throw error; }
    }
    return cases.length;
  } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
}
