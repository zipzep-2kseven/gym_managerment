import { test, expect } from '@playwright/test';
for (const method of ['CARD', 'BANK_TRANSFER', 'WALLET']) test(`Real demo checkout ${method}: Guest login, Payment SUCCESS, Membership and history`, async ({ page }) => {
  await page.goto('/login');
  await page.locator('input[name="email"]').fill('admin@gym03.test'); await page.locator('input[name="password"]').fill('BrowserFixture@123');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click(); await expect(page).toHaveURL('http://127.0.0.1:3104/');
  await page.goto('/admin/gyms'); await page.getByRole('link', { name: 'Sửa thông tin Browser Gym' }).click();
  const gymId = new URL(page.url()).pathname.split('/').pop()!;
  await page.getByRole('link', { name: 'Quản lý gói tập' }).click(); await page.getByRole('button', { name: 'Tạo gói mới' }).click();
  await page.getByLabel('Tên gói tập', { exact: true }).fill(`Demo ${method}`); await page.getByLabel('Thời hạn (ngày)').fill('30'); await page.getByLabel('Giá (VND)').fill('123456.78');
  const created = page.waitForResponse(r => r.request().method() === 'POST' && r.url().endsWith('/packages'));
  await page.getByRole('button', { name: 'Tạo gói tập', exact: true }).click();
  const packageId = (await (await created).json()).data.package_id as string;
  await expect(page.getByRole('status')).toContainText('Gói tập đã được tạo');
  await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
  await page.goto(`/gyms/${gymId}/packages/${packageId}`);
  await page.getByRole('link', { name: 'Tiếp tục thanh toán demo' }).click(); await expect(page).toHaveURL(/\/login/);
  await page.locator('input[name="email"]').fill('customer@gym03.test'); await page.locator('input[name="password"]').fill('BrowserFixture@123');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Thanh toán demo' })).toBeVisible();
  await page.getByLabel('Phương thức thanh toán (demo)').selectOption(method);
  const submitted = page.waitForResponse(r => r.request().method() === 'POST' && r.url().endsWith('/payments'));
  await page.getByRole('button', { name: 'Thanh toán demo', exact: true }).click();
  const response = await submitted; expect(response.status()).toBe(201);
  expect(response.request().postDataJSON()).toEqual({ package_id: packageId, payment_method: method });
  const key = response.request().headers()['idempotency-key']; expect(key).toBeTruthy();
  const result = (await response.json()).data;
  expect(result.payment.payment_status).toBe('SUCCESS'); expect(result.membership.purchase_price).toBe('123456.78');
  await expect(page.getByRole('status')).toContainText('Thẻ hội viên demo đã được tạo');
  const replay = await page.request.post(`http://127.0.0.1:4103/api/v1/gyms/${gymId}/payments`, { headers: { 'Idempotency-Key': key }, data: { package_id: packageId, payment_method: method } });
  expect(replay.status()).toBe(200); expect((await replay.json()).data.membership.membership_id).toBe(result.membership.membership_id);
  await page.getByRole('link', { name: 'Thẻ hội viên của tôi', exact: true }).click(); await expect(page.getByRole('article').filter({ hasText: '123.456,78 VND' }).first()).toBeVisible();
  await page.getByRole('link', { name: 'Lịch sử thanh toán' }).click(); await expect(page.getByRole('article').filter({ hasText: method }).first()).toContainText('Thành công');
  expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
});

test('Customer demo checkout responsive and double submit sends once', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  const gymId = '10000000-0000-4000-8000-000000000001', packageId = '20000000-0000-4000-8000-000000000001';
  let posts = 0, release = () => {}; const gate = new Promise<void>(r => { release = r; });
  await page.route('**/api/v1/**', async route => {
    if (route.request().url().includes('/auth/me')) return route.fulfill({ json: { success: true, data: { user_id: 'customer', roles: ['CUSTOMER'], status: 'ACTIVE', must_change_password: false, active_gym_assignments: [] } } });
    if (route.request().method() === 'POST') { posts++; await gate; return route.fulfill({ status: 503, json: { success: false, error: { code: 'PAYMENT_DEMO_DISABLED', message: 'Chưa bật demo.' } } }); }
    return route.fulfill({ json: { success: true, data: { package_id: packageId, gym_id: gymId, package_name: 'Demo', price: '10.00', duration_days: 30, description: 'Demo' } } });
  });
  await page.goto(`/gyms/${gymId}/packages/${packageId}/checkout`); await page.getByRole('button', { name: 'Thanh toán demo', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Đang xử lý…' })).toBeDisabled(); expect(posts).toBe(1); release();
  await expect(page.getByRole('alert')).toContainText('Chưa bật demo');
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});
