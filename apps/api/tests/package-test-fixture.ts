import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { eq } from 'drizzle-orm';
import express from 'express';
import cookieParser from 'cookie-parser';
import * as schema from '../src/database/schema/index.js';
import { pool as appPool } from '../src/database/index.js';
import { createPackageService } from '../src/services/package.service.js';
import { createPackageRouter } from '../src/routes/package.routes.js';
import { errorHandler } from '../src/middleware/error-handler.js';
import { signJwt } from '../src/utils/jwt.js';
import { config } from '../src/config/index.js';

export interface PackageDto {
  package_id: string; gym_id: string; package_name: string; description: string | null;
  duration_days: number; price: string; status: string; created_at: string; updated_at: string;
}
interface Envelope<T> {
  success: boolean; data: T; error: { code: string; message: string };
  pagination: { page: number; pageSize: number; totalItems: number; totalPages: number;
    hasNextPage: boolean; hasPreviousPage: boolean };
}
export const packageTestHarness = async () => {
  const adminConnection = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await adminConnection.connect();
  const name = `pkg01_test_${randomUUID().replaceAll('-', '')}`;
  await adminConnection.query(`CREATE DATABASE "${name}"`);
  const url = new URL(process.env.DATABASE_URL!); url.pathname = `/${name}`;
  const pool = new pg.Pool({ connectionString: url.toString() });
  const database = drizzle(pool, { schema });
  let server: import('node:http').Server | undefined;
  const close = async () => {
    if (server) await new Promise<void>((resolve, reject) => server!.close(error => error ? reject(error) : resolve()));
    await pool.end(); await appPool.end();
    await adminConnection.query(`DROP DATABASE "${name}"`); await adminConnection.end();
  };
  try {
    await migrate(database, { migrationsFolder: fileURLToPath(new URL('../drizzle', import.meta.url)) });
    await database.insert(schema.roles).values(['ADMIN', 'MANAGER', 'PT', 'CUSTOMER'].map(roleName => ({ roleName })));
    const service = createPackageService(database);
    const app = express(); app.use(express.json(), cookieParser());
    app.use('/api/v1', createPackageRouter(service));
    const failedDatabase = new Proxy(database, {
      get(target, key, receiver) {
        if (key === 'transaction') return async () => { throw new Error('SQL private_hash_sentinel database detail'); };
        return Reflect.get(target, key, receiver);
      },
    });
    app.use('/api/v1/failure', createPackageRouter(createPackageService(failedDatabase)));
    app.use(errorHandler);
    server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
    const port = (server.address() as { port: number }).port;
    const request = async <T = PackageDto>(method: string, path: string, actor: string | null, body?: unknown, rawJson = false) => {
      // Deliberately forged role claims: authorization must use current DB roles.
      const token = actor ? signJwt({ sub: actor, email: 'claim@test.local', roles: ['ADMIN'] }) : '';
      const response = await fetch(`http://127.0.0.1:${port}/api/v1${path}`, {
        method, headers: { 'Content-Type': 'application/json', ...(actor ? { Cookie: `${config.cookie.name}=${token}` } : {}) },
        body: body === undefined ? undefined : rawJson ? String(body) : JSON.stringify(body),
      });
      return { status: response.status, headers: response.headers, body: await response.json() as Envelope<T> };
    };
    const user = async (roleName: string) => {
      const [account] = await database.insert(schema.users).values({ email: `${randomUUID()}@package.test`, passwordHash: 'private_hash_sentinel' }).returning();
      const [role] = await database.select().from(schema.roles).where(eq(schema.roles.roleName, roleName));
      await database.insert(schema.userRoles).values({ userId: account.userId, roleId: role.roleId });
      return account.userId;
    };
    const fixture = async () => {
      const [gymA, gymB, gymC] = await database.insert(schema.gyms).values([
        { gymName: `A ${randomUUID()}`, address: 'A' },
        { gymName: `B ${randomUUID()}`, address: 'B' },
        { gymName: `C ${randomUUID()}`, address: 'C', status: 'INACTIVE' },
      ]).returning();
      const admin = await user('ADMIN'); const manager = await user('MANAGER');
      const [assignment] = await database.insert(schema.gymManagers).values({ gymId: gymA.gymId, userId: manager }).returning();
      const packages = await database.insert(schema.packages).values([
        { gymId: gymA.gymId, packageName: 'Alpha', description: 'Strength', durationDays: 30, price: '10.00' },
        { gymId: gymA.gymId, packageName: 'Beta', description: 'Harbor%_\\', durationDays: 7, price: '2.00' },
        { gymId: gymA.gymId, packageName: 'Literal%_\\', durationDays: 365, price: '999999999999.99' },
        { gymId: gymA.gymId, packageName: 'Hidden', durationDays: 30, price: '0.00', status: 'INACTIVE' },
        { gymId: gymB.gymId, packageName: 'Other', durationDays: 30, price: '99.00' },
        { gymId: gymC.gymId, packageName: 'Inactive Gym', durationDays: 30, price: '99.00' },
      ].map(row => ({ ...row, createdAt: new Date('2020-01-01') }))).returning();
      return { gymA, gymB, gymC, admin, manager, assignment, packages,
        path: `/gyms/${gymA.gymId}/packages`, management: `/gyms/${gymA.gymId}/management/packages` };
    };
    const waitForBlocked = async (holder: pg.PoolClient) => {
      const pid = (await holder.query<{ pid: number }>('SELECT pg_backend_pid() pid')).rows[0].pid;
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        const { rows } = await pool.query<{ blocked: boolean }>('SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE $1::int = ANY(pg_blocking_pids(pid))) blocked', [pid]);
        if (rows[0].blocked) return;
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      assert.fail('Expected a real concurrent lock waiter.');
    };
    return { database, pool, service, fixture, request, user, close, waitForBlocked };
  } catch (error) { await close(); throw error; }
};
export type PackageHarness = Awaited<ReturnType<typeof packageTestHarness>>;
export type PackageCase = [string, () => Promise<void>];
