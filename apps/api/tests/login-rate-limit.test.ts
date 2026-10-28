import assert from 'node:assert/strict';
import { once } from 'node:events';
import { test } from 'node:test';
import express from 'express';
import { createLoginRateLimit } from '../src/middleware/login-rate-limit.js';

test('Login limiter counts failures, reserves concurrent attempts, ignores spoofed IP, and expires', async () => {
  let time = 0, complete: (() => void) | undefined;
  const app = express();
  app.use(createLoginRateLimit(2, 60_000, () => time));
  app.post('/login', (req, res) => {
    if (req.get('X-Pending')) { complete = () => { if (!res.writableEnded) res.sendStatus(200); }; return; }
    res.sendStatus(req.get('X-Success') ? 200 : 401);
  });
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}/login`;
  const request = (headers: Record<string, string> = {}) => fetch(base, { method: 'POST', headers });
  try {
    for (let i = 0; i < 3; i++) assert.equal((await request({ 'X-Success': '1' })).status, 200);
    assert.equal((await request()).status, 401);
    const pending = request({ 'X-Pending': '1' });
    const deadline = Date.now() + 3000;
    while (!complete && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 5));
    assert.ok(complete, 'Pending request must have reserved its slot');
    const limited = await request({ 'X-Forwarded-For': '198.51.100.1' });
    assert.equal(limited.status, 429); assert.equal(limited.headers.get('retry-after'), '60');
    assert.equal(limited.headers.get('cache-control'), 'no-store');
    complete(); assert.equal((await pending).status, 200);
    assert.equal((await request()).status, 401);
    assert.equal((await request()).status, 429);
    time = 60_000;
    assert.equal((await request()).status, 401);
  } finally { complete?.(); await new Promise<void>(resolve => server.close(() => resolve())); }
});
