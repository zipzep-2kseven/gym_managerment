import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import express from 'express';
import { count, eq } from 'drizzle-orm';
import type { db as applicationDb } from '../src/database/index.js';
import { gyms } from '../src/database/schema/index.js';
import { createPublicGymRepository } from '../src/repositories/public-gym.repository.js';
import { createPublicGymService } from '../src/services/public-gym.service.js';
import { createPublicGymRouter } from '../src/routes/public-gym.routes.js';
import { errorHandler } from '../src/middleware/error-handler.js';

type GymDto = { gym_id: string; gym_name: string; address: string; status: string; created_at: string };
type Envelope<T> = { success: boolean; data: T; error: { code: string }; pagination: {
  page: number; pageSize: number; totalItems: number; totalPages: number; hasNextPage: boolean; hasPreviousPage: boolean;
} };
export async function testPublicGymIntegration(db: typeof applicationDb) {
  const marker = randomUUID();
  const fixtures = await db.insert(gyms).values([
    { gymName: `${marker} Alpha`, address: 'North', status: 'ACTIVE' },
    { gymName: `${marker} Beta`, address: 'South', status: 'ACTIVE' },
    { gymName: `${marker} Gamma`, address: `${marker} Harbor`, status: 'ACTIVE' },
    { gymName: `${marker} Literal%_\\`, address: 'West', status: 'ACTIVE' },
    { gymName: `${marker} Hidden`, address: 'Private', status: 'INACTIVE' },
  ].map(gym => ({ ...gym, createdAt: new Date('2020-01-01'), phone: '0901111222', email: 'gym@example.test' }))).returning();
  const repository = createPublicGymRepository(db);
  const service = createPublicGymService(repository);
  const app = express();
  app.use('/api/v1', createPublicGymRouter(service));
  app.use('/failure', createPublicGymRouter(createPublicGymService({ ...repository,
    list: async () => { throw new Error('SQL internal private sentinel'); },
  })));
  app.use(errorHandler);
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  const port = (server.address() as { port: number }).port;
  const request = async <T = GymDto[]>(path = '/gyms', prefix = '/api/v1') => {
    const response = await fetch(`http://127.0.0.1:${port}${prefix}${path}`);
    return { status: response.status, headers: response.headers, body: await response.json() as Envelope<T> };
  };
  const search = `search=${encodeURIComponent(marker)}`;
  const cases: [string, () => Promise<void>][] = [
    ['Guest list: defaults, active-only totals and explicit public projection', async () => {
      const result = await request();
      const [{ total }] = await db.select({ total: count() }).from(gyms).where(eq(gyms.status, 'ACTIVE'));
      assert.equal(result.status, 200); assert.equal(result.body.success, true);
      assert.equal(result.body.pagination.page, 1); assert.equal(result.body.pagination.pageSize, 20);
      assert.equal(result.body.pagination.totalItems, total);
      assert.equal(result.body.data.length, Math.min(total, 20));
      assert.ok(result.body.data.every(row => row.status === 'ACTIVE'));
      const detail = await request<GymDto>(`/gyms/${fixtures[0].gymId}`);
      assert.equal(detail.status, 200); assert.equal(detail.body.data.gym_id, fixtures[0].gymId);
      assert.deepEqual(Object.keys(detail.body.data).sort(), ['gym_id', 'gym_name', 'description', 'phone', 'email',
        'address', 'latitude', 'longitude', 'logo_url', 'opening_time', 'closing_time', 'status', 'created_at', 'updated_at'].sort());
      assert.ok(typeof detail.body.data.created_at === 'string');
      assert.equal(detail.headers.get('cache-control'), 'no-store');
      assert.equal(result.headers.get('cache-control'), 'no-store');
    }],
    ['Pagination metadata, deterministic tie ordering and empty pages', async () => {
      const first = await request(`/gyms?${search}&pageSize=2`);
      const second = await request(`/gyms?${search}&pageSize=2&page=2`);
      assert.deepEqual(first.body.pagination, { page: 1, pageSize: 2, totalItems: 4, totalPages: 2, hasNextPage: true, hasPreviousPage: false });
      assert.deepEqual(second.body.pagination, { page: 2, pageSize: 2, totalItems: 4, totalPages: 2, hasNextPage: false, hasPreviousPage: true });
      assert.deepEqual([...first.body.data, ...second.body.data].map(row => row.gym_id), fixtures.slice(0, 4).map(row => row.gymId).sort());
      const beyond = await request(`/gyms?${search}&pageSize=2&page=3`);
      assert.deepEqual(beyond.body.data, []); assert.equal(beyond.body.pagination.totalItems, 4);
      const empty = await request(`/gyms?search=${randomUUID()}`);
      assert.deepEqual(empty.body.data, []); assert.equal(empty.body.pagination.totalPages, 0);
      assert.equal(empty.body.pagination.hasNextPage, false);
    }],
    ['Search name/address, ignore case, trim and escape literal wildcard characters', async () => {
      for (const [term, index] of [[`${marker} ALPHA`, 0], [`  ${marker} harbor  `, 2], [`${marker} Literal%_\\`, 3]] as const) {
        const result = await request(`/gyms?search=${encodeURIComponent(term)}`);
        assert.deepEqual(result.body.data.map(row => row.gym_id), [fixtures[index].gymId]);
      }
      assert.equal((await request(`/gyms?search=${encodeURIComponent("' OR 1=1 --")}`)).body.pagination.totalItems, 0);
      const asc = await request(`/gyms?${search}&sortBy=gym_name&sortOrder=asc`);
      assert.deepEqual(asc.body.data.map(row => row.gym_id), fixtures.slice(0, 4).map(row => row.gymId));
      const desc = await request(`/gyms?${search}&sortBy=gym_name&sortOrder=desc`);
      assert.deepEqual(desc.body.data.map(row => row.gym_id), fixtures.slice(0, 4).reverse().map(row => row.gymId));
    }],
    ['Inactive and missing Gym are indistinguishable; malformed UUID is rejected', async () => {
      const hidden = await request(`/gyms/${fixtures[4].gymId}`);
      const missing = await request(`/gyms/${randomUUID()}`);
      assert.equal(hidden.status, 404); assert.equal(missing.status, 404); assert.deepEqual(hidden.body, missing.body);
      assert.equal(hidden.body.error.code, 'NOT_FOUND');
      assert.equal((await request('/gyms/not-a-uuid')).status, 400);
    }],
    ['Reject invalid pagination, injected sorting, unknown filters and repeated parameters', async () => {
      for (const query of ['page=0', 'page=-1', 'page=1.5', 'page=1e3', 'pageSize=0', 'pageSize=101',
        'page=9007199254740991&pageSize=100', 'page=1&page=2', 'search[x]=test', 'status=INACTIVE',
        'sortBy=password_hash', 'sortBy=gym_name%3BDROP%20TABLE%20gyms', 'sortOrder=sideways']) {
        const result = await request(`/gyms?${query}`);
        assert.equal(result.status, 400, query); assert.equal(result.body.error.code, 'VALIDATION_ERROR');
      }
      assert.equal((await request(`/gyms?${search}&pageSize=100`)).status, 200);
    }],
    ['Visibility follows deactivation/reactivation on the next request', async () => {
      const gymId = fixtures[0].gymId;
      try {
        await db.update(gyms).set({ status: 'INACTIVE' }).where(eq(gyms.gymId, gymId));
        assert.equal((await request(`/gyms/${gymId}`)).status, 404);
        const hidden = await request(`/gyms?${search}`);
        assert.equal(hidden.body.pagination.totalItems, 3);
        assert.ok(!hidden.body.data.some(row => row.gym_id === gymId));
      } finally { await db.update(gyms).set({ status: 'ACTIVE' }).where(eq(gyms.gymId, gymId)); }
      assert.equal((await request(`/gyms/${gymId}`)).status, 200);
    }],
    ['Database failures return safe errors without SQL details', async () => {
      const result = await request('/gyms', '/failure');
      assert.equal(result.status, 500); assert.equal(result.body.error.code, 'INTERNAL_SERVER_ERROR');
      assert.ok(!JSON.stringify(result.body).includes('sentinel'));
    }],
  ];
  try {
    for (const [label, run] of process.env.GYM_TEST_ORDER === 'reverse' ? [...cases].reverse() : cases) {
      try { await run(); } catch (error) { console.error(`FAIL public Gym: ${label}`); throw error; }
    }
    return cases.length;
  } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
}
