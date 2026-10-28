import { test, expect, type Page } from '@playwright/test';
const login = async (page: Page, role: string) => {
  await page.goto('/login'); await page.locator('input[name="email"]').fill(`${role}@gym03.test`);
  await page.locator('input[name="password"]').fill('BrowserFixture@123');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page.getByRole('link', { name: `Browser ${role.toUpperCase()}`, exact: true })).toBeVisible();
};
test('Real PT journey: availability, demo Membership, registration, request, confirm, reschedule and preserve history', async ({ page }) => {
  test.setTimeout(90000);
  const gyms = await (await page.request.get('http://127.0.0.1:4103/api/v1/gyms')).json(); const gym = gyms.data[0].gym_id;
  await login(page, 'pt'); await page.getByRole('link', { name: 'PT và lịch tập', exact: true }).click();
  await page.getByLabel('Nhận học viên mới', { exact: true }).selectOption('ACCEPTING');
  await page.getByRole('button', { name: 'Lưu trạng thái nhận học viên' }).click(); await expect(page.getByLabel('Nhận học viên mới', { exact: true })).toHaveValue('ACCEPTING');
  await expect(page.getByRole('button', { name: 'Lưu trạng thái nhận học viên' })).toBeDisabled();
  await page.getByRole('button', { name: 'Đăng xuất' }).click(); await login(page, 'customer');
  const packages = await (await page.request.get(`http://127.0.0.1:4103/api/v1/gyms/${gym}/packages`)).json();
  await page.goto(`/gyms/${gym}/packages/${packages.data[0].package_id}/checkout`);
  await page.getByRole('button', { name: 'Thanh toán demo', exact: true }).click();
  await page.getByRole('link', { name: 'Thẻ hội viên của tôi', exact: true }).click(); await page.getByRole('link', { name: 'Đăng ký PT', exact: true }).click();
  await page.getByLabel('Huấn luyện viên', { exact: true }).selectOption({ label: 'Browser PT · Đang nhận học viên' });
  await page.getByRole('checkbox').check(); await page.getByRole('button', { name: 'Đăng ký PT', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Đã đăng ký PT'); await page.getByRole('link', { name: 'Xem đăng ký và đặt lịch' }).click();
  await page.getByRole('button', { name: 'Đặt lịch tập', exact: true }).click();
  const date = new Date(Date.now() + 86400000 + 7 * 3600000).toISOString().slice(0, 10);
  await page.getByLabel('Bắt đầu', { exact: true }).fill(`${date}T09:00`); await page.getByLabel('Kết thúc', { exact: true }).fill(`${date}T10:00`);
  await page.getByRole('button', { name: 'Gửi yêu cầu lịch', exact: true }).click();
  await expect(page.getByRole('article').filter({ hasText: 'Chờ xác nhận' })).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Xác nhận lịch', exact: true })).toHaveCount(0);
  for (const width of [375, 768, 1024, 1440]) { await page.setViewportSize({ width, height: 900 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); if ([375, 1440].includes(width)) await page.screenshot({ path: `/tmp/pt-workflow-${width}.png`, fullPage: true }); }
  await page.getByRole('button', { name: 'Đăng xuất' }).click(); await login(page, 'pt'); await page.goto('/my-pt');
  await page.getByRole('button', { name: 'Xác nhận lịch', exact: true }).click(); await expect(page.getByRole('article').filter({ hasText: 'Đã xác nhận' })).toHaveCount(1);
  await page.getByLabel('Nhận học viên mới', { exact: true }).selectOption('NOT_ACCEPTING'); await page.getByRole('button', { name: 'Lưu trạng thái nhận học viên' }).click();
  await page.getByRole('button', { name: 'Dời lịch', exact: true }).click();
  await page.getByLabel('Bắt đầu', { exact: true }).fill(`${date}T10:00`); await page.getByLabel('Kết thúc', { exact: true }).fill(`${date}T11:00`);
  await page.getByRole('button', { name: 'Gửi yêu cầu lịch', exact: true }).click(); await expect(page.getByRole('article').filter({ hasText: 'Chờ xác nhận' })).toHaveCount(1);
  await page.getByRole('button', { name: 'Đăng xuất' }).click(); await login(page, 'manager'); await page.goto('/manager/pt');
  await page.getByRole('button', { name: 'Kết thúc đăng ký / đổi PT' }).click(); await page.getByLabel('Lý do', { exact: true }).fill('Đổi PT theo yêu cầu');
  await page.getByRole('button', { name: 'Xác nhận', exact: true }).click(); await expect(page.getByRole('alert')).toContainText('Cần xử lý các lịch đang mở');
  await page.getByRole('button', { name: 'Đóng', exact: true }).click();
  await page.getByRole('button', { name: 'Hủy lịch', exact: true }).click(); await page.getByLabel('Lý do', { exact: true }).fill('Hội viên đổi lịch');
  await page.getByRole('button', { name: 'Xác nhận', exact: true }).click(); await expect(page.getByRole('article').filter({ hasText: 'Hội viên đổi lịch' })).toContainText('Đã hủy');
  await page.getByRole('button', { name: 'Kết thúc đăng ký / đổi PT' }).click(); await page.getByLabel('Lý do', { exact: true }).fill('Đổi PT theo yêu cầu');
  await page.getByRole('button', { name: 'Xác nhận', exact: true }).click(); await expect(page.getByRole('article').filter({ hasText: 'Đổi PT theo yêu cầu' })).toContainText('Đã hủy');
  await page.goto('/manager/trainers'); await page.getByLabel('Nhận học viên mới', { exact: true }).selectOption('ACCEPTING');
  await page.getByRole('button', { name: 'Lưu trạng thái nhận học viên' }).click(); await expect(page.getByRole('button', { name: 'Lưu trạng thái nhận học viên' })).toBeDisabled();
  await page.goto('/manager/pt'); await page.getByRole('link', { name: 'Đăng ký PT hộ hội viên' }).click();
  await page.getByLabel('Thẻ hội viên', { exact: true }).selectOption({ index: 1 });
  await page.getByLabel('Huấn luyện viên', { exact: true }).selectOption({ label: 'Browser PT · Đang nhận học viên' });
  await page.getByRole('checkbox').check(); await page.getByRole('button', { name: 'Đăng ký PT', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Đã đăng ký PT');
  expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
  await page.getByRole('button', { name: 'Đăng xuất' }).click(); await login(page, 'admin'); await page.goto(`/admin/gyms/${gym}/pt`);
  await expect(page.getByRole('article').filter({ hasText: 'Hội viên đổi lịch' })).toBeVisible(); await expect(page.getByRole('button', { name: 'Đặt lịch tập' })).toHaveCount(0);
});
test('Pending appointment submit disables form and displays conflict', async ({ page }) => {
  const gym = '10000000-0000-4000-8000-000000000001'; const reg = { registration_id: '20000000-0000-4000-8000-000000000001', status: 'ACTIVE', membership: { start_date: '2026-10-01', end_date: '2026-12-01' }, customer: { user_id: 'customer', full_name: 'Hội viên' }, trainer: { user_id: 'trainer', full_name: 'PT' }, gym: { gym_id: gym, gym_name: 'Gym' } };
  let calls = 0; let release = () => {}; const gate = new Promise<void>(r => { release = r; });
  await page.route('**/api/v1/**', async route => {
    if (route.request().url().includes('/auth/me')) return route.fulfill({ json: { success: true, data: { user_id: 'customer', roles: ['CUSTOMER'], status: 'ACTIVE', must_change_password: false, active_gym_assignments: [] } } });
    if (route.request().method() === 'POST') { calls++; await gate; return route.fulfill({ status: 409, json: { success: false, error: { code: 'APPOINTMENT_OVERLAP', message: 'Hội viên hoặc PT đã có lịch trong khoảng này.' } } }); }
    return route.fulfill({ json: { success: true, data: route.request().url().includes('pt-registrations') ? [reg] : [], pagination: { page: 1, totalPages: 1, totalItems: 1, hasNextPage: false, hasPreviousPage: false } } });
  });
  await page.goto('/my-pt'); await page.getByRole('button', { name: 'Đặt lịch tập', exact: true }).click();
  await page.getByLabel('Bắt đầu', { exact: true }).fill('2026-10-20T09:00'); await page.getByLabel('Kết thúc', { exact: true }).fill('2026-10-20T10:00');
  await page.getByRole('button', { name: 'Gửi yêu cầu lịch', exact: true }).click(); await expect(page.getByRole('button', { name: 'Đang gửi…' })).toBeDisabled();
  expect(calls).toBe(1); release(); await expect(page.getByRole('alert')).toContainText('đã có lịch');
  for (const width of [375, 768, 1024, 1440]) { await page.setViewportSize({ width, height: 900 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); }
  await page.screenshot({ path: '/tmp/pt-workflow-form.png', fullPage: true });
});
