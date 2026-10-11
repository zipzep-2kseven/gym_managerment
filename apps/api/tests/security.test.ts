import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { once } from 'node:events';
import express from 'express';
import jwt from 'jsonwebtoken';
import { app } from '../src/app.js';
import { pool } from '../src/database/index.js';
import { DUMMY_ARGON2_HASH } from '../src/constants/auth.constants.js';
import { config } from '../src/config/index.js';
import { errorHandler } from '../src/middleware/error-handler.js';
import { loginSchema, registerSchema, changePasswordSchema, updateProfileSchema } from '../src/utils/validators.js';

const server = app.listen(0, '127.0.0.1');
await once(server, 'listening');
const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
after(async () => { await new Promise<void>(resolve => server.close(() => resolve())); await pool.end(); });
const logout = (headers: Record<string, string> = {}) => fetch(`${base}/api/v1/auth/logout`, { method: 'POST', headers });

test('Auth success and failure responses are private, cookies retain security attributes', async () => {
  const res = await logout();
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('cache-control'), 'no-store');
  assert.match(res.headers.get('set-cookie')!, /HttpOnly/);
  assert.match(res.headers.get('set-cookie')!, /SameSite=Lax/);
  assert.match(res.headers.get('set-cookie')!, /Path=\/api\/v1/);
  assert.match(res.headers.get('set-cookie')!, /Max-Age=0/);
  if (config.cookie.secure) assert.match(res.headers.get('set-cookie')!, /Secure/);
  assert.deepEqual(await res.json(), { success: true, data: { message: 'Đăng xuất thành công.' } });
  const rejected = await fetch(`${base}/api/v1/auth/me`);
  assert.equal(rejected.status, 401); assert.equal(rejected.headers.get('cache-control'), 'no-store');
});

test('Untrusted browser origins cannot mutate, including logout without JSON', async () => {
  for (const origin of ['https://attacker.example', 'null', `${config.cors.origin[0]}.attacker.example`, `${config.cors.origin[0]}/path`]) {
    const res = await logout({ Origin: origin });
    assert.equal(res.status, 403, origin);
    assert.equal(((await res.json()) as {error:{code:string}}).error.code, 'UNTRUSTED_ORIGIN');
    assert.equal(res.headers.get('set-cookie'), null);
  }
});

test('Trusted origins and native clients work; Referer fallback and missing browser source are checked', async () => {
  assert.equal((await logout({ Origin: config.cors.origin[0] })).status, 200);
  assert.equal((await logout({ Referer: `${config.cors.origin[0]}/profile` })).status, 200);
  assert.equal((await logout({ Referer: 'https://attacker.example/form' })).status, 403);
  assert.equal((await logout({ Referer: 'invalid' })).status, 403);
  assert.equal((await logout({ 'Sec-Fetch-Site': 'same-site' })).status, 403);
  assert.equal((await logout()).status, 200);
});

test('API unknown paths return the standard JSON contract, never reflected HTML', async () => {
  const res = await fetch(`${base}/api/v1/missing-private-sentinel`);
  assert.equal(res.status, 404); assert.match(res.headers.get('content-type')!, /application\/json/);
  assert.deepEqual(await res.json(), { success: false, error: { code: 'NOT_FOUND', message: 'Không tìm thấy API.', details: null } });
});

test('API responses prevent sniffing and omit framework disclosure', async () => {
  const res = await logout();
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(res.headers.get('referrer-policy'), 'no-referrer');
  assert.equal(res.headers.get('x-powered-by'), null);
});

test('Malformed JSON and oversized bodies retain safe error envelopes', async () => {
  for (const [body, status, code] of [['{"password":"private-sentinel",', 400, 'VALIDATION_ERROR'], [JSON.stringify({ password: 'x'.repeat(110_000) }), 413, 'PAYLOAD_TOO_LARGE']] as const) {
    const res = await fetch(`${base}/api/v1/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    assert.equal(res.status, status); const data = await res.json() as {error:{code:string}}; assert.equal(data.error.code, code);
    assert.ok(!JSON.stringify(data).includes('private-sentinel'));
  }
});

test('Auth schemas reject spoofed roles/identity and excessive passwords', () => {
  assert.equal(loginSchema.safeParse({ email: 'a@test.local', password: 'Aa123456', roles: ['ADMIN'] }).success, false);
  assert.equal(registerSchema.safeParse({ email: 'a@test.local', password: 'Aa123456', full_name: 'Test User', role: 'ADMIN' }).success, false);
  assert.equal(changePasswordSchema.safeParse({ current_password: 'Aa123456', new_password: 'Bb123456', user_id: 'spoof' }).success, false);
  assert.equal(changePasswordSchema.safeParse({ current_password: 'x'.repeat(129), new_password: 'Bb123456' }).success, false);
  assert.equal(updateProfileSchema.safeParse({ full_name: 'Test User', status: 'ACTIVE' }).success, false);
});

test('Profile dates are real calendar days and avatar URLs are HTTP(S) without credentials', () => {
  for (const date of ['2025-02-29', '2026-02-30', '2026-04-31']) assert.equal(updateProfileSchema.safeParse({ date_of_birth: date }).success, false, date);
  assert.equal(updateProfileSchema.safeParse({ date_of_birth: '2024-02-29' }).success, true);
  for (const url of ['javascript:alert(1)', 'data:text/html,test', 'ftp://host/img', 'https://user:password@host/img']) assert.equal(updateProfileSchema.safeParse({ avatar_url: url }).success, false, url);
  assert.equal(updateProfileSchema.safeParse({ avatar_url: 'https://example.com/img.png' }).success, true);
});

test('JWT algorithms and subject shape are restricted before database queries', async () => {
  for (const payload of [{ sub: 'invalid-id' }, { sub: ['invalid'] }, { sub: '00000000-0000-0000-0000-000000000000', exp: 1 }]) {
    const token = jwt.sign(payload, config.jwt.secret);
    const res = await fetch(`${base}/api/v1/auth/me`, { headers: { Cookie: `${config.cookie.name}=${token}` } });
    assert.equal(res.status, 401); assert.equal(((await res.json()) as {error:{code:string}}).error.code, 'UNAUTHORIZED');
  }
  const token = jwt.sign({ sub: '123e4567-e89b-42d3-a456-426614174000' }, config.jwt.secret, { algorithm: 'HS384' });
  const res = await fetch(`${base}/api/v1/auth/me`, { headers: { Cookie: `${config.cookie.name}=${token}` } });
  assert.equal(res.status, 401);
});

test('Unhandled database errors cannot leak secrets to logs or responses', async () => {
  const logged: unknown[][] = [], original = console.error;
  const probe = express();
  probe.get('/', (_req, _res, next) => next(new Error('SQL password=private-sentinel cookie=raw-cookie token=raw-token')));
  probe.use(errorHandler);
  const listener = probe.listen(0, '127.0.0.1'); await once(listener, 'listening');
  try {
    console.error = (...args: unknown[]) => { logged.push(args); };
    const res = await fetch(`http://127.0.0.1:${(listener.address() as { port: number }).port}/`);
    assert.equal(res.status, 500); const data = await res.json() as {error:{code:string}};
    assert.equal(data.error.code, 'INTERNAL_SERVER_ERROR');
    assert.ok(!/private-sentinel|raw-cookie|raw-token|SQL/.test(JSON.stringify(data)));
    assert.equal(logged.length, 1);
    assert.ok(!/private-sentinel|raw-cookie|raw-token|SQL/.test(JSON.stringify(logged)));
  } finally { console.error = original; await new Promise<void>(resolve => listener.close(() => resolve())); }
});

test('Dummy password verification uses the same Argon2 work parameters as real passwords', () => {
  assert.match(DUMMY_ARGON2_HASH, /^\$argon2id\$v=19\$m=65536,t=3,p=4\$/);
});
