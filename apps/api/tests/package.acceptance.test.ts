import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { hash } from '@node-rs/argon2';
import pg from 'pg';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import '../src/config/index.js';
import type { PackageDto } from './package-test-fixture.js';

// Redirect singleton DB before importing the real app/router/service graph.
const adminConnection = new pg.Client({ connectionString: process.env.DATABASE_URL });
await adminConnection.connect();
const name = `pkg01_acceptance_${randomUUID().replaceAll('-', '')}`;
await adminConnection.query(`CREATE DATABASE "${name}"`);
const url = new URL(process.env.DATABASE_URL!); url.pathname = `/${name}`;
process.env.DATABASE_URL = url.toString();
const { db, pool } = await import('../src/database/index.js');
let server: import('node:http').Server | undefined;
let checks = 0;
try {
  await migrate(db, { migrationsFolder: fileURLToPath(new URL('../drizzle', import.meta.url)) });
  await pool.query("INSERT INTO roles(role_name) VALUES ('ADMIN'),('MANAGER'),('PT'),('CUSTOMER')");
  const email = `${randomUUID()}@package-acceptance.test`;
  const password = `Admin1!${randomUUID()}`;
  const actor = (await pool.query<{ user_id: string }>('INSERT INTO users(email,password_hash) VALUES ($1,$2) RETURNING user_id', [email, await hash(password)])).rows[0];
  await pool.query("INSERT INTO user_roles(user_id,role_id) SELECT $1,role_id FROM roles WHERE role_name='ADMIN'", [actor.user_id]);
  const { app } = await import('../src/app.js');
  server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  const port = (server.address() as { port: number }).port;
  const request = async <T>(method: string, path: string, cookie = '', body?: unknown, expected = 200) => {
    const result = await fetch(`http://127.0.0.1:${port}/api/v1${path}`, { method,
      headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body) });
    const json = await result.json() as { success: boolean; data: T; error: { code: string }; pagination: { totalItems: number } };
    assert.equal(result.status, expected, `${method} ${path}: ${json.error?.code ?? 'success'}`);
    // Enforce the Package contract here; auth bootstrap is existing behavior.
    if (path.includes('/packages')) assert.equal(result.headers.get('cache-control'), 'no-store');
    checks++;
    return { body: json, headers: result.headers };
  };
  const login = await request<unknown>('POST', '/auth/login', '', { email, password });
  const cookie = login.headers.get('set-cookie'); assert.ok(cookie?.includes('HttpOnly'));
  const auth = cookie!.split(';')[0];
  const gym = (await request<{ gym_id: string }>('POST', '/gyms', auth, { gym_name: 'Package Acceptance', address: 'Test' }, 201)).body.data;
  const path = `/gyms/${gym.gym_id}/packages`;
  await request<unknown>('POST', path, auth, 'invalid object payload', 400);
  const created = (await request<PackageDto>('POST', path, auth, { package_name: 'Monthly', duration_days: 30, price: '123.45' }, 201)).body.data;
  assert.equal(created.price, '123.45'); assert.equal(created.gym_id, gym.gym_id);
  const detailPath = `${path}/${created.package_id}`;
  await request<PackageDto[]>('GET', path);
  await request<PackageDto>('GET', detailPath);
  await request<PackageDto[]>('GET', `/gyms/${gym.gym_id}/management/packages`, '', undefined, 401);
  await request<PackageDto>('PATCH', detailPath, auth, { price: '234.56' });
  await request<PackageDto>('PATCH', `${detailPath}/deactivate`, auth, {});
  await request<PackageDto>('GET', detailPath, '', undefined, 404);
  const privateList = await request<PackageDto[]>('GET', `/gyms/${gym.gym_id}/management/packages?status=INACTIVE`, auth);
  assert.equal(privateList.body.pagination.totalItems, 1); assert.equal(privateList.body.data[0].price, '234.56');
  await request<PackageDto>('PATCH', `${detailPath}/activate`, auth, {});
  assert.equal((await request<PackageDto>('GET', detailPath)).body.data.status, 'ACTIVE');
  console.log(`PASS: ${checks} PKG-01 full-app HTTP checks, all 7 Package endpoints with real login/cookie.`);
} finally {
  if (server) await new Promise<void>((resolve, reject) => server!.close(error => error ? reject(error) : resolve()));
  await pool.end();
  await adminConnection.query(`DROP DATABASE "${name}"`); await adminConnection.end();
}
