import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import '../../api/src/config/index.js';

const api = 'http://127.0.0.1:4103/api/v1';
// One sequential acceptance workflow shares this run's disposable fixture.
test.describe.configure({ mode: 'serial' });
let pool: pg.Pool;
test.beforeAll(async () => {
  const infoPath = process.env.ADMIN_DASHBOARD_TEST_DB_INFO;
  if (!infoPath) throw new Error('Use the isolated Admin dashboard live config');
  const { databaseName } = JSON.parse(await readFile(infoPath, 'utf8'));
  if (!/^gym03_browser_[a-f0-9]{32}$/.test(databaseName)) throw new Error('Invalid disposable database');
  const url = new URL(process.env.DATABASE_URL!);
  url.pathname = `/${databaseName}`;
  pool = new pg.Pool({ connectionString: url.toString() });
});
test.afterAll(async () => { await pool?.end(); });
const login = async (page: Page) => {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill('admin@gym03.test');
  await page.locator('input[name=password]').fill('BrowserFixture@123');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL('http://127.0.0.1:3104/');
  await page.goto('/admin/dashboard');
};
test('Live overview matches SQL aggregates and refreshes revenue from successful payments', async ({ page }) => {
  await login(page);
  const read = async () => {
    const response = await page.request.get(`${api}/admin/dashboard`);
    expect(response.status()).toBe(200);
    expect(response.headers()['cache-control']).toBe('no-store');
    return (await response.json()).data;
  };
  const initial = await read();
  const counts = (await pool.query(`SELECT (SELECT count(*)::int FROM gyms) gyms,
    (SELECT count(*)::int FROM users) accounts`)).rows[0];
  expect(initial.total_gyms).toBe(counts.gyms);
  expect(initial.total_accounts).toBe(counts.accounts);
  expect(initial.daily_revenue).toHaveLength(7);
  await expect(page.getByRole('article', { name: 'Tổng phòng Gym', exact: true }).locator('.management-metric-value')).toHaveText(counts.gyms.toLocaleString('vi-VN'));
  await expect(page.getByRole('article', { name: 'Tổng tài khoản', exact: true }).locator('.management-metric-value')).toHaveText(counts.accounts.toLocaleString('vi-VN'));
  const parent = (await pool.query(`SELECT p.package_id,p.gym_id,u.user_id FROM packages p
    JOIN gyms g ON g.gym_id=p.gym_id CROSS JOIN users u WHERE g.status='ACTIVE' LIMIT 1`)).rows[0];
  await pool.query(`INSERT INTO payments(user_id,gym_id,package_id,amount,payment_method,payment_status,paid_at)
    VALUES($1,$2,$3,123456.75,'CASH','SUCCESS',now()),($1,$2,$3,999999,'CASH','REFUNDED',now())`,
    [parent.user_id,parent.gym_id,parent.package_id]);
  const response = page.waitForResponse(r => new URL(r.url()).pathname === '/api/v1/admin/dashboard');
  await page.getByRole('button', { name: 'Làm mới tổng quan', exact: true }).click();
  const updated = (await (await response).json()).data;
  expect(Number(updated.month_revenue)).toBe(Number(initial.month_revenue) + 123456.75);
  expect(Number(updated.daily_revenue[6].amount)).toBe(Number(initial.daily_revenue[6].amount) + 123456.75);
  const formatted = new Intl.NumberFormat('vi-VN', {style:'currency',currency:'VND',maximumFractionDigits:2}).format(Number(updated.month_revenue));
  await expect(page.getByRole('article', { name: 'Doanh thu tháng này', exact: true }).locator('.management-metric-value')).toHaveText(formatted);
  await page.getByText('Xem số liệu theo ngày', { exact: true }).click();
  await expect(page.getByRole('table')).toBeVisible();
  await expect(page.getByRole('row')).toHaveCount(8);
});
