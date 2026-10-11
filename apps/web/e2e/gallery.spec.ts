import { test, expect, type Page } from '@playwright/test';
const login = async (page: Page, role: string) => {
 await page.goto('/login'); await page.locator('input[name="email"]').fill(`${role}@gym03.test`); await page.locator('input[name="password"]').fill('BrowserFixture@123');
 await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click(); await expect(page.getByRole('link', { name: `Browser ${role.toUpperCase()}`, exact: true })).toBeVisible();
};
const choosePhoto = async (page: Page) => {
 const data = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 2000; c.height = 1000; const ctx = c.getContext('2d')!; ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, c.width, c.height); ctx.fillStyle = '#e11d48'; ctx.fillRect(0, 600, 2000, 400); ctx.fillStyle = '#fff'; ctx.font = '100px sans-serif'; ctx.fillText('GYM · Ảnh kiểm thử', 120, 300); return c.toDataURL('image/png').split(',')[1]; });
 await page.getByLabel('Ảnh phòng tập', { exact: true }).setInputFiles({ name: 'gym.png', mimeType: 'image/png', buffer: Buffer.from(data, 'base64') });
 await expect(page.getByAltText('Ảnh phòng tập sẽ thêm')).toBeVisible();
 await expect.poll(() => page.getByAltText('Ảnh phòng tập sẽ thêm').evaluate((el: HTMLImageElement) => el.naturalWidth)).toBe(1600);
};
test('Manager uploads/captions/reorders; Guest sees actual resized images; Admin deletes with confirmation', async ({ page }) => {
 await login(page, 'manager'); await page.goto('/manager/gym'); await page.getByRole('link', { name: 'Ảnh phòng Gym', exact: true }).click();
 await choosePhoto(page); await page.getByLabel('Chú thích ảnh mới (không bắt buộc)').fill('Không gian tập luyện');
 await page.getByRole('button', { name: 'Thêm ảnh', exact: true }).click(); await expect(page.getByRole('status')).toContainText('Đã thêm ảnh');
 await expect(page.getByRole('article')).toHaveCount(1);
 await choosePhoto(page); await page.getByLabel('Chú thích ảnh mới (không bắt buộc)').fill('Khu tập sức mạnh'); await page.getByRole('button', { name: 'Thêm ảnh', exact: true }).click(); await expect(page.getByRole('article')).toHaveCount(2);
 const cards = page.getByRole('article'); await cards.nth(1).getByRole('button', { name: 'Lên', exact: true }).click();
 await expect(cards.nth(0).getByLabel('Chú thích ảnh', { exact: true })).toHaveValue('Khu tập sức mạnh');
 await cards.nth(0).getByLabel('Chú thích ảnh', { exact: true }).fill('Khu sức mạnh mới'); await cards.nth(0).getByRole('button', { name: 'Lưu chú thích' }).click();
 await expect(cards.nth(0).getByRole('img')).toHaveAttribute('alt', 'Khu sức mạnh mới');
 for (const width of [375, 768, 1024, 1440]) { await page.setViewportSize({ width, height: 900 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); }
 await page.screenshot({ path: '/tmp/gallery-manager.png', fullPage: true });
 const gyms = await (await page.request.get('http://127.0.0.1:4103/api/v1/gyms')).json(), gym = gyms.data[0].gym_id;
 await page.getByRole('button', { name: 'Đăng xuất' }).click(); await page.goto(`/gyms/${gym}`);
 const figures = page.locator('.gallery-grid figure'); await expect(figures).toHaveCount(2); await expect(figures.first()).toContainText('Khu sức mạnh mới');
 await expect.poll(() => figures.first().locator('img').evaluate((el: HTMLImageElement) => el.naturalWidth)).toBe(1600);
 for (const width of [375, 768, 1024, 1440]) { await page.setViewportSize({ width, height: 900 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); }
 await page.screenshot({ path: '/tmp/gallery-public.png', fullPage: true });
 await login(page, 'admin'); await page.goto(`/admin/gyms/${gym}`); await page.getByRole('link', { name: 'Ảnh phòng Gym', exact: true }).click();
 page.once('dialog', dialog => dialog.dismiss()); await page.getByRole('article').first().getByRole('button', { name: 'Xóa ảnh', exact: true }).click(); await expect(page.getByRole('article')).toHaveCount(2);
 page.once('dialog', dialog => dialog.accept()); await page.getByRole('article').first().getByRole('button', { name: 'Xóa ảnh', exact: true }).click(); await expect(page.getByRole('article')).toHaveCount(1);
 expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
});
test('Invalid upload blocks submission; pending locks and server error keeps caption/photo', async ({ page }) => {
 const gym = '10000000-0000-4000-8000-000000000001'; let posts = 0, release = () => {}; const gate = new Promise<void>(r => { release = r; });
 await page.route('**/api/v1/**', async route => {
  const path = new URL(route.request().url()).pathname;
  if (path.endsWith('/auth/me')) return route.fulfill({ json: { success: true, data: { user_id: 'manager', roles: ['MANAGER'], status: 'ACTIVE', active_gym_assignments: [{ assignment_type: 'MANAGER', gym_id: gym }], must_change_password: false } } });
  if (route.request().method() === 'POST') { posts++; expect(route.request().postDataJSON().caption).toBe('Ảnh mới'); await gate; return route.fulfill({ status: 409, json: { success: false, error: { code: 'GALLERY_LIMIT', message: 'Mỗi Gym có tối đa 10 ảnh.' } } }); }
  return route.fulfill({ json: { success: true, data: [] } });
 });
 await page.goto('/manager/gallery'); await page.getByLabel('Ảnh phòng tập', { exact: true }).setInputFiles({ name: 'bad.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg/>') });
 await expect(page.getByRole('alert')).toContainText('JPEG hoặc PNG'); await expect(page.getByRole('button', { name: 'Thêm ảnh', exact: true })).toBeDisabled(); expect(posts).toBe(0);
 await page.getByRole('button', { name: 'Bỏ ảnh đã chọn' }).click(); await choosePhoto(page); await page.getByLabel('Chú thích ảnh mới (không bắt buộc)').fill('Ảnh mới');
 await page.getByRole('button', { name: 'Thêm ảnh', exact: true }).click(); await expect(page.getByRole('button', { name: 'Đang tải ảnh…' })).toBeDisabled(); expect(posts).toBe(1); release();
 await expect(page.getByRole('alert')).toContainText('tối đa 10 ảnh'); await expect(page.getByLabel('Chú thích ảnh mới (không bắt buộc)')).toHaveValue('Ảnh mới'); await expect(page.getByAltText('Ảnh phòng tập sẽ thêm')).toBeVisible();
});
