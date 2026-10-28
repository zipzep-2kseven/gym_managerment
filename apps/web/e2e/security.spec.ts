import { test, expect } from '@playwright/test';
import { createServer } from 'node:http';
import { once } from 'node:events';

const api = 'http://127.0.0.1:4103/api/v1';
test('A same-site untrusted browser origin cannot log out the user; normal logout works', async ({ page, context }) => {
  await page.goto('/login');
  await page.locator('input[name="email"]').fill('customer@gym03.test');
  await page.locator('input[name="password"]').fill('BrowserFixture@123');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Browser CUSTOMER', exact: true })).toBeVisible();
  const session = await context.request.get(`${api}/auth/me`);
  expect(session.status()).toBe(200); expect(session.headers()['cache-control']).toBe('no-store');
  const cookies = await context.cookies(api);
  expect(cookies.find(cookie => cookie.name === 'auth_token')?.httpOnly).toBe(true);
  // Different port on 127.0.0.1 is same-site, so SameSite=Lax alone permits the cookie.
  const attacker = createServer((_req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.end(`<form method="POST" action="${api}/auth/logout"><button>Submit forged logout</button></form>`);
  });
  attacker.listen(0, '127.0.0.1'); await once(attacker, 'listening');
  try {
    await page.goto(`http://127.0.0.1:${(attacker.address() as { port: number }).port}`);
    const rejected = page.waitForResponse(response => response.url() === `${api}/auth/logout`);
    await page.getByRole('button', { name: 'Submit forged logout' }).click();
    expect((await rejected).status()).toBe(403);
    expect((await context.request.get(`${api}/auth/me`)).status()).toBe(200);
    expect((await context.cookies(api)).find(cookie => cookie.name === 'auth_token')?.value)
      .toBe(cookies.find(cookie => cookie.name === 'auth_token')?.value);
    await page.goto('/profile');
    await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Đăng nhập', exact: true })).toBeVisible();
    expect((await context.request.get(`${api}/auth/me`)).status()).toBe(401);
    expect(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length })))
      .toEqual({ local: 0, session: 0 });
  } finally { await new Promise<void>(resolve => attacker.close(() => resolve())); }
});
