import { test, expect, type Page } from '@playwright/test';
const login = async (page: Page, role: string) => {
 await page.goto('/login'); await page.locator('input[name="email"]').fill(`${role}@gym03.test`); await page.locator('input[name="password"]').fill('BrowserFixture@123');
 await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click(); await expect(page.getByRole('link', { name: `Browser ${role.toUpperCase()}`, exact: true })).toBeVisible();
};
test('PT publishes own bio/social/shifts; Manager edits professional information; Guest sees advisory hours', async ({ page }) => {
 await login(page, 'pt'); await page.getByRole('link', { name: 'Hồ sơ PT', exact: true }).click();
 await page.getByLabel('Giới thiệu ngắn').fill('Hướng dẫn tập luyện an toàn và bền vững');
 await page.getByRole('button', { name: 'Thêm liên kết' }).click(); await page.getByLabel('Nền tảng 1', { exact: true }).selectOption('WEBSITE'); await page.getByLabel('Đường dẫn 1', { exact: true }).fill('https://example.com/trainer');
 await page.getByRole('button', { name: 'Thêm ca làm việc' }).click(); await page.getByRole('button', { name: 'Thêm ca làm việc' }).click();
 await page.getByLabel('Bắt đầu ca 2', { exact: true }).fill('17:00'); await page.getByLabel('Kết thúc ca 2', { exact: true }).fill('21:00');
 await page.getByRole('button', { name: 'Lưu hồ sơ và giờ làm việc' }).click(); await expect(page.getByRole('status')).toContainText('Đã lưu thay đổi');
 for (const width of [375, 768, 1024, 1440]) { await page.setViewportSize({ width, height: 900 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); }
 await page.screenshot({ path: '/tmp/trainer-profile-own.png', fullPage: true });
 const own = await (await page.request.get('http://127.0.0.1:4103/api/v1/trainer-profile/me')).json(), gym = own.data.gym_id, trainer = own.data.gym_trainer_id;
 await page.getByRole('button', { name: 'Đăng xuất' }).click(); await login(page, 'manager'); await page.goto('/manager/trainers');
 await page.getByRole('link', { name: 'Hồ sơ và giờ làm việc', exact: true }).click();
 await expect(page.getByLabel('Giới thiệu ngắn')).toHaveCount(0); await expect(page.getByText('Thứ hai: 06:00–10:00', { exact: true })).toBeVisible();
 await page.getByLabel('Chuyên môn', { exact: true }).fill('Sức mạnh và phục hồi cơ bản'); await page.getByLabel('Số năm kinh nghiệm', { exact: true }).fill('6');
 await page.getByRole('button', { name: 'Lưu thông tin chuyên môn' }).click(); await expect(page.getByRole('status')).toContainText('Đã lưu thay đổi');
 await page.getByRole('button', { name: 'Đăng xuất' }).click(); await page.goto(`/gyms/${gym}/trainers/${trainer}`);
 await expect(page.getByRole('heading', { name: 'Giờ làm việc tham khảo' })).toBeVisible(); await expect(page.getByText('Thứ hai: 17:00–21:00', { exact: true })).toBeVisible();
 await expect(page.getByText('Sức mạnh và phục hồi cơ bản', { exact: true })).toBeVisible(); await expect(page.getByText('Hướng dẫn tập luyện an toàn và bền vững', { exact: true })).toBeVisible();
 await expect(page.getByRole('link', { name: 'WEBSITE', exact: true })).toHaveAttribute('href', 'https://example.com/trainer');
 await expect(page.getByText('Giờ làm việc không thể hiện chỗ trống.', { exact: false })).toBeVisible();
 await page.screenshot({ path: '/tmp/trainer-profile-public.png', fullPage: true });
 expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
});
test('Pending submission locks; stale error preserves drafts', async ({ page }) => {
 let posts = 0, release = () => {}; const gate = new Promise<void>(r => { release = r; });
 const profile = { gym_id: '10000000-0000-4000-8000-000000000001', gym_trainer_id: '20000000-0000-4000-8000-000000000001', status: 'ACTIVE', availability: 'ACCEPTING', updated_at: '2026-10-10T00:00:00.000Z', bio: '', specialization: 'Sức mạnh', experience_years: 3, profile: { full_name: 'PT Demo', avatar_url: null }, social_links: [], working_schedules: [] };
 await page.route('**/api/v1/**', async route => {
  const path = new URL(route.request().url()).pathname;
  if (path.endsWith('/auth/me')) return route.fulfill({ json: { success: true, data: { user_id: 'pt', roles: ['PT'], status: 'ACTIVE', active_gym_assignments: [], must_change_password: false } } });
  if (route.request().method() === 'PUT') { posts++; expect(route.request().postDataJSON()).not.toHaveProperty('specialization'); await gate; return route.fulfill({ status: 409, json: { success: false, error: { code: 'PROFILE_CHANGED', message: 'Hồ sơ đã thay đổi. Hãy tải lại trước khi lưu.' } } }); }
  return route.fulfill({ json: { success: true, data: profile } });
 });
 await page.goto('/pt/profile'); await page.getByLabel('Giới thiệu ngắn').fill('Giới thiệu đang sửa'); await page.getByRole('button', { name: 'Thêm ca làm việc' }).click();
 await page.getByRole('button', { name: 'Lưu hồ sơ và giờ làm việc' }).click(); await expect(page.getByRole('button', { name: 'Đang lưu…' })).toBeDisabled(); await expect(page.getByLabel('Giới thiệu ngắn')).toBeDisabled(); expect(posts).toBe(1);
 release(); await expect(page.getByRole('alert')).toContainText('Hồ sơ đã thay đổi'); await expect(page.getByLabel('Giới thiệu ngắn')).toHaveValue('Giới thiệu đang sửa');
});

test('Real API rejects overlapping hours without discarding the PT draft', async ({ page }) => {
 await login(page, 'pt'); await page.goto('/pt/profile'); await page.getByLabel('Giới thiệu ngắn').fill('Nội dung cần giữ sau lỗi');
 await page.getByRole('button', { name: 'Thêm ca làm việc' }).click();
 const response = page.waitForResponse(r => r.url().endsWith('/trainer-profile/me') && r.request().method() === 'PUT');
 await page.getByRole('button', { name: 'Lưu hồ sơ và giờ làm việc' }).click(); expect((await response).status()).toBe(400);
 await expect(page.getByRole('alert')).toContainText('không hợp lệ'); await expect(page.getByLabel('Giới thiệu ngắn')).toHaveValue('Nội dung cần giữ sau lỗi');
});
