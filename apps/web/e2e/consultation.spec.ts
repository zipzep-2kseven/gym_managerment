import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const gym = '10000000-0000-4000-8000-000000000001';
const login = async (page: Page, role: string) => {
  await page.goto('/login'); await page.locator('input[name="email"]').fill(`${role}@gym03.test`);
  await page.locator('input[name="password"]').fill('BrowserFixture@123'); await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page.getByRole('link', { name: `Browser ${role.toUpperCase()}`, exact: true })).toBeVisible();
};
test('Guest sends request; scoped Manager calls, records notes and completes consultation', async ({ page }) => {
  await page.goto('/gyms'); const list = await (await page.request.get('http://127.0.0.1:4103/api/v1/gyms')).json(), id = list.data[0].gym_id;
  await page.goto(`/gyms/${id}`); await page.getByRole('link', { name: 'Đăng ký tư vấn', exact: true }).click();
  await page.getByLabel('Họ tên', { exact: true }).fill('Khách tập thử'); await page.getByLabel('Số điện thoại', { exact: true }).fill('0901234567');
  await page.getByLabel('Bạn muốn tư vấn về gì? (không bắt buộc)').fill('Muốn tìm hiểu gói tập và tập thử');
  await page.getByLabel('Thời gian tiện liên hệ (không bắt buộc)').fill('Sau 18h');
  for (const width of [375, 768, 1024, 1440]) { await page.setViewportSize({ width, height: 900 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); }
  await page.screenshot({ path: '/tmp/consultation-public.png', fullPage: true });
  await page.getByRole('button', { name: 'Gửi yêu cầu tư vấn', exact: true }).click(); await expect(page.getByRole('status')).toContainText('Gym đã nhận yêu cầu');
  await expect(page.getByRole('button', { name: 'Gửi yêu cầu tư vấn', exact: true })).toHaveCount(0);
  await login(page, 'manager'); await page.getByRole('link', { name: 'Yêu cầu tư vấn', exact: true }).click();
  const article = page.getByRole('article'); await expect(article).toContainText('Khách tập thử'); await expect(article).toContainText('Sau 18h');
  await expect(article.getByRole('link', { name: 'Gọi 0901234567' })).toHaveAttribute('href', 'tel:0901234567');
  await article.getByLabel('Ghi chú xử lý').fill('Khách hẹn đến Gym vào chiều mai'); await article.getByRole('button', { name: 'Lưu ghi chú', exact: true }).click();
  await expect(article).toContainText('Ghi chú xử lý: Khách hẹn đến Gym vào chiều mai');
  await article.getByRole('button', { name: 'Đánh dấu đã liên hệ' }).click(); await expect(article.getByRole('heading')).toContainText('Đã liên hệ');
  await article.getByRole('button', { name: 'Hoàn thành tư vấn' }).click(); await expect(article.getByRole('heading')).toContainText('Hoàn thành');
  await expect(article.getByLabel('Ghi chú xử lý')).toHaveCount(0);
  await page.screenshot({ path: '/tmp/consultation-manager.png', fullPage: true });
  await page.getByLabel('Trạng thái tư vấn').selectOption('PENDING'); await expect(page.getByText('Chưa có yêu cầu tư vấn phù hợp.')).toBeVisible();
  expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
});
test('Authenticated profile prefills editable contact; pending locks and 429 preserves input', async ({ page }) => {
  let posts = 0, release = () => {}; const gate = new Promise<void>(r => { release = r; });
  await page.route('**/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/auth/me')) return route.fulfill({ json: { success: true, data: { user_id: 'customer', roles: ['CUSTOMER'], status: 'ACTIVE', phone: '0901111111', profile: { full_name: 'Tên hồ sơ' }, active_gym_assignments: [], must_change_password: false } } });
    if (route.request().method() === 'POST') {
      posts++; expect(route.request().postDataJSON()).toEqual({ full_name: 'Tên chỉnh sửa', phone: '0901111111', preferred_contact: 'Buổi sáng' });
      await gate; return route.fulfill({ status: 429, json: { success: false, error: { code: 'RATE_LIMITED', message: 'Bạn đã gửi nhiều yêu cầu. Vui lòng thử lại sau.' } } });
    }
    return route.fulfill({ json: { success: true, data: { gym_id: gym, gym_name: 'Gym Demo', address: 'Địa chỉ demo' } } });
  });
  await page.goto(`/gyms/${gym}/consultation`); await expect(page.getByLabel('Họ tên', { exact: true })).toHaveValue('Tên hồ sơ');
  await page.getByLabel('Họ tên', { exact: true }).fill('Tên chỉnh sửa'); await page.getByLabel('Thời gian tiện liên hệ (không bắt buộc)').fill('Buổi sáng');
  await page.getByRole('button', { name: 'Gửi yêu cầu tư vấn' }).click(); await expect(page.getByRole('button', { name: 'Đang gửi…' })).toBeDisabled();
  await expect(page.getByLabel('Họ tên', { exact: true })).toBeDisabled(); expect(posts).toBe(1);
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
  release();
  await expect(page.getByRole('alert')).toContainText('Bạn đã gửi nhiều yêu cầu'); await expect(page.getByLabel('Họ tên', { exact: true })).toHaveValue('Tên chỉnh sửa');
});
test('Manager cancellation requires a reason, confirms action and keeps customer content', async ({ page }) => {
  const list = await (await page.request.get('http://127.0.0.1:4103/api/v1/gyms')).json(), id = list.data[0].gym_id;
  const response = await page.request.post(`http://127.0.0.1:4103/api/v1/gyms/${id}/consultation-requests`, { data: { full_name: 'Khách hủy tư vấn', phone: '0902222222', content: 'Muốn tập thử' } }); expect(response.status()).toBe(201);
  await login(page, 'manager'); await page.goto('/manager/consultations');
  const article = page.getByRole('article').filter({ hasText: 'Khách hủy tư vấn' }); await expect(article.getByRole('button', { name: 'Hủy yêu cầu' })).toBeDisabled();
  await article.getByLabel('Ghi chú xử lý').fill('Khách đổi ý, chưa muốn tập'); page.once('dialog', dialog => dialog.accept());
  await article.getByRole('button', { name: 'Hủy yêu cầu' }).click(); await expect(article.getByRole('heading')).toContainText('Đã hủy');
  await expect(article).toContainText('Muốn tập thử'); await expect(article).toContainText('Khách đổi ý, chưa muốn tập');
});
