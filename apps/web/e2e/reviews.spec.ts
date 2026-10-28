import { test, expect, type Page } from '@playwright/test';
const api = 'http://127.0.0.1:4103/api/v1';
const login = async (page: Page, role: string) => {
 await page.goto('/login'); await page.locator('input[name="email"]').fill(`${role}@gym03.test`); await page.locator('input[name="password"]').fill('BrowserFixture@123'); await page.getByRole('button', {name: 'Đăng nhập', exact: true}).click(); await expect(page.getByRole('link', {name: `Browser ${role.toUpperCase()}`, exact: true})).toBeVisible();
};
test('Real Customer reviews Gym and PT after use; guest sees reviews, reload cannot send again', async ({page}) => {
 const gyms = await (await page.request.get(`${api}/gyms`)).json(), gym = gyms.data[0].gym_id;
 const trainers = await (await page.request.get(`${api}/gyms/${gym}/trainers`)).json(), trainer = trainers.data[0].gym_trainer_id;
 await page.goto(`/gyms/${gym}`); await expect(page.getByRole('region', {name: 'Đánh giá hội viên'})).toContainText('Chưa có đánh giá');
 await login(page, 'customer'); await page.goto(`/gyms/${gym}`);
 await page.getByLabel('Mức đánh giá').selectOption('5'); await page.getByLabel('Nhận xét (không bắt buộc)').fill('Phòng tập thoáng, hướng dẫn rõ ràng.');
 const posted = page.waitForResponse(r => r.url().endsWith('/reviews') && r.request().method() === 'POST'); await page.getByRole('button', {name: 'Gửi đánh giá', exact: true}).click(); expect((await posted).status()).toBe(201);
 await expect(page.getByRole('status')).toContainText('Đã gửi đánh giá'); await expect(page.getByRole('heading', {name: 'Đánh giá bạn đã gửi'})).toBeVisible(); await page.reload(); await expect(page.getByRole('button', {name: 'Gửi đánh giá', exact: true})).toHaveCount(0);
 await page.goto(`/gyms/${gym}/trainers/${trainer}`); await page.getByLabel('Mức đánh giá').selectOption('4'); await page.getByLabel('Nhận xét (không bắt buộc)').fill('PT hướng dẫn kỹ trong buổi tập.'); await page.getByRole('button', {name: 'Gửi đánh giá', exact: true}).click(); await expect(page.getByRole('heading', {name: 'Đánh giá bạn đã gửi'})).toBeVisible();
 await page.getByRole('button', {name: 'Đăng xuất', exact: true}).click(); await page.goto(`/gyms/${gym}/trainers/${trainer}`); const panel = page.getByRole('region', {name: 'Đánh giá hội viên'}); await expect(panel).toContainText('4/5 · 1 đánh giá'); await expect(panel).toContainText('Browser CUSTOMER'); await expect(panel).toContainText('PT hướng dẫn kỹ');
 for (const width of [375, 768, 1024, 1440]) { await page.setViewportSize({width, height: 900}); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); }
 await page.screenshot({path: '/tmp/reviews-public.png', fullPage: true}); expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
});
test('Pending locks form; conflict preserves draft; reload shows hidden own review without publishing it', async ({page}) => {
 const gym = '10000000-0000-4000-8000-000000000001'; let posts = 0, hidden = false, release = () => {}; const gate = new Promise<void>(r => {release = r;});
 await page.route('**/api/v1/**', async route => {
  const path = new URL(route.request().url()).pathname;
  if (path.endsWith('/auth/me')) return route.fulfill({json: {success: true, data: {user_id: 'customer', roles: ['CUSTOMER'], status: 'ACTIVE', must_change_password: false, active_gym_assignments: []}}});
  if (route.request().method() === 'POST') {posts++; await gate; return route.fulfill({status: 409, json: {success: false, error: {code: 'REVIEW_ALREADY_EXISTS', message: 'Bạn đã gửi đánh giá. Hãy tải lại để xem kết quả.'}}});}
  if (path.endsWith('/reviews/me')) return route.fulfill({json: {success: true, data: {eligible: !hidden, reason: null, review: hidden ? {review_id: 'own', rating: 2, comment: 'Nội dung đánh giá riêng', status: 'HIDDEN', created_at: '2026-10-10T00:00:00Z'} : null}}});
  if (path.endsWith('/reviews')) return route.fulfill({json: {success: true, data: {items: [], total: 0, average_rating: null, page: 1, page_size: 10}}});
  if (path.endsWith('/images')) return route.fulfill({json: {success: true, data: []}});
  return route.fulfill({json: {success: true, data: {gym_id: gym, gym_name: 'Gym kiểm thử', address: 'Địa chỉ', status: 'ACTIVE'}}});
 });
 await page.goto(`/gyms/${gym}`); await page.getByLabel('Mức đánh giá').selectOption('2'); await page.getByLabel('Nhận xét (không bắt buộc)').fill('Nội dung cần giữ'); await page.getByRole('button', {name: 'Gửi đánh giá', exact: true}).click();
 await expect(page.getByRole('button', {name: 'Đang gửi…'})).toBeDisabled(); await expect(page.getByLabel('Mức đánh giá')).toBeDisabled(); expect(posts).toBe(1); release(); await expect(page.getByRole('alert')).toContainText('Bạn đã gửi đánh giá'); await expect(page.getByLabel('Nhận xét (không bắt buộc)')).toHaveValue('Nội dung cần giữ');
 await page.screenshot({path: '/tmp/reviews-customer.png', fullPage: true}); hidden = true; await page.getByRole('button', {name: 'Tải lại đánh giá'}).click(); await expect(page.getByRole('heading', {name: 'Đánh giá bạn đã gửi'})).toBeVisible(); await expect(page.getByText('Đã ẩn khỏi danh sách công khai', {exact: false})).toBeVisible(); await expect(page.getByRole('button', {name: 'Gửi đánh giá', exact: true})).toHaveCount(0); await expect(page.getByText('Chưa có đánh giá.', {exact: false})).toBeVisible();
});
