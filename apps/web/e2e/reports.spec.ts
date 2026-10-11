import { test, expect, type Page } from '@playwright/test';
const login = async (page: Page, role: string) => {
  await page.goto('/login'); await page.locator('input[name="email"]').fill(`${role}@gym03.test`); await page.locator('input[name="password"]').fill('BrowserFixture@123');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click(); await expect(page.getByRole('link', { name: `Browser ${role.toUpperCase()}`, exact: true })).toBeVisible();
};
test('Real incident journey: demo member sends photo without equipment; Manager resolves; owner sees outcome', async ({ page }) => {
  await login(page, 'customer'); const gyms = await (await page.request.get('http://127.0.0.1:4103/api/v1/gyms')).json(), gym = gyms.data[0].gym_id;
  const packages = await (await page.request.get(`http://127.0.0.1:4103/api/v1/gyms/${gym}/packages`)).json();
  await page.goto(`/gyms/${gym}/packages/${packages.data[0].package_id}/checkout`); await page.getByRole('button', { name: 'Thanh toán demo', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Thẻ hội viên của tôi', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Báo cáo sự cố', exact: true }).click();
  await expect(page.getByLabel('Gym', { exact: true })).toHaveValue(gym); await expect(page.getByLabel('Mã máy')).toHaveCount(0);
  await page.getByLabel('Nội dung sự cố').fill('Máy chạy bộ gần cửa bị đứng băng chuyền');
  await page.getByLabel('Ảnh sự cố (không bắt buộc)').setInputFiles({ name: 'incident.png', mimeType: 'image/png', buffer: Buffer.from(await page.evaluate(() => { const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 360; const ctx = canvas.getContext('2d')!; const pixels = ctx.createImageData(640, 360); let seed = 12345; for (let i = 0; i < pixels.data.length; i += 4) { seed = (seed * 1664525 + 1013904223) >>> 0; pixels.data[i] = seed & 255; pixels.data[i + 1] = (seed >>> 8) & 255; pixels.data[i + 2] = (seed >>> 16) & 255; pixels.data[i + 3] = 255; } ctx.putImageData(pixels, 0, 0); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 640, 60); ctx.fillStyle = '#0f172a'; ctx.font = '24px sans-serif'; ctx.fillText('Ảnh kiểm thử sự cố', 20, 40); return canvas.toDataURL('image/png').split(',')[1]; }), 'base64') });
  await expect(page.getByAltText('Ảnh sự cố sẽ gửi')).toBeVisible();
  const sending = page.waitForRequest(r => r.method() === 'POST' && r.url().endsWith('/reports'));
  await page.getByRole('button', { name: 'Gửi báo cáo', exact: true }).click(); expect((await sending).postData()!.length).toBeGreaterThan(100 * 1024); await expect(page.getByRole('status')).toContainText('Đã gửi báo cáo');
  await expect(page.getByRole('article')).toContainText('Chờ xử lý');
  await expect(page.getByAltText('Ảnh do người gửi cung cấp')).toBeVisible();
  await expect.poll(() => page.getByAltText('Ảnh do người gửi cung cấp').evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
  for (const width of [375, 768, 1024, 1440]) { await page.setViewportSize({ width, height: 900 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); }
  await page.screenshot({ path: '/tmp/reports-customer.png', fullPage: true });
  await page.getByRole('button', { name: 'Đăng xuất' }).click(); await login(page, 'manager'); await page.getByRole('link', { name: 'Xử lý báo cáo', exact: true }).click();
  await page.getByRole('button', { name: 'Tiếp nhận', exact: true }).click(); await expect(page.getByRole('article')).toContainText('Đang xử lý');
  await page.getByRole('button', { name: 'Giải quyết', exact: true }).click(); await page.getByLabel('Kết quả xử lý').fill('Đã kiểm tra và sửa băng chuyền');
  await page.getByRole('button', { name: 'Lưu kết quả', exact: true }).click(); await expect(page.getByRole('article')).toContainText('Đã giải quyết');
  await expect(page.getByRole('button', { name: 'Giải quyết', exact: true })).toHaveCount(0);
  await page.screenshot({ path: '/tmp/reports-manager.png', fullPage: true });
  await page.getByRole('button', { name: 'Đăng xuất' }).click(); await login(page, 'customer'); await page.goto('/reports');
  await expect(page.getByRole('article')).toContainText('Đã kiểm tra và sửa băng chuyền');
  expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
});
test('No card shows history and explains eligibility', async ({ page }) => {
  await page.route('**/api/v1/**', async route => {
    const url = route.request().url();
    if (url.includes('/auth/me')) return route.fulfill({ json: { success: true, data: { user_id: 'customer', roles: ['CUSTOMER'], status: 'ACTIVE', active_gym_assignments: [], must_change_password: false } } });
    return route.fulfill({ json: { success: true, data: [], pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false } } });
  });
  await page.goto('/reports'); await expect(page.getByText(/Bạn cần thẻ hội viên/)).toBeVisible(); await expect(page.getByRole('button', { name: 'Gửi báo cáo', exact: true })).toHaveCount(0);
  await expect(page.getByText('Chưa có báo cáo phù hợp.')).toBeVisible();
});
test('Photo validation, pending submit and failed request keep content for correction', async ({ page }) => {
  const gym = '10000000-0000-4000-8000-000000000001'; let posts = 0, release = () => {};
  const gate = new Promise<void>(r => { release = r; });
  await page.route('**/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/auth/me')) return route.fulfill({ json: { success: true, data: { user_id: 'customer', roles: ['CUSTOMER'], status: 'ACTIVE', active_gym_assignments: [], must_change_password: false } } });
    if (route.request().method() === 'POST') { posts++; expect(route.request().postDataJSON()).toEqual({ content: 'Máy gần cửa bị hỏng' }); await gate; return route.fulfill({ status: 403, json: { success: false, error: { code: 'MEMBERSHIP_REQUIRED', message: 'Thẻ đã hết hạn, vui lòng tải lại.' } } }); }
    if (path.endsWith(`/gyms/${gym}`)) return route.fulfill({ json: { success: true, data: { gym_id: gym, gym_name: 'Gym Demo' } } });
    return route.fulfill({ json: { success: true, data: path.endsWith('/memberships/me') ? [{ gym_id: gym, status: 'ACTIVE', start_date: '2020-01-01', end_date: '2099-12-31' }] : [], pagination: { page: 1, hasNextPage: false, totalPages: 1, totalItems: 0 } } });
  });
  await page.goto('/reports'); await page.getByLabel('Nội dung sự cố').fill('Máy gần cửa bị hỏng');
  await page.getByLabel('Ảnh sự cố (không bắt buộc)').setInputFiles({ name: 'bad.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg/>') });
  await expect(page.getByRole('alert')).toContainText('JPEG hoặc PNG'); await expect(page.getByRole('button', { name: 'Gửi báo cáo', exact: true })).toBeDisabled(); expect(posts).toBe(0);
  await page.getByRole('button', { name: 'Bỏ ảnh không hợp lệ' }).click(); await page.getByRole('button', { name: 'Gửi báo cáo', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Đang gửi…' })).toBeDisabled(); await expect(page.getByLabel('Nội dung sự cố')).toBeDisabled(); expect(posts).toBe(1);
  release(); await expect(page.getByRole('alert')).toContainText('Thẻ đã hết hạn'); await expect(page.getByLabel('Nội dung sự cố')).toHaveValue('Máy gần cửa bị hỏng');
});
