import { test, expect, type Page } from '@playwright/test';
import { card, choosePhoto, edit } from './admin-gallery-fixtures';
import type { GalleryImage } from '../src/services/gallery.service';
const api = 'http://127.0.0.1:4103/api/v1';
const createGym = async (page: Page, suffix: string) => {
  await page.goto('/login'); await page.locator('input[name="email"]').fill('admin@gym03.test'); await page.locator('input[name="password"]').fill('BrowserFixture@123');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click(); await expect(page).toHaveURL('http://127.0.0.1:3104/'); await page.goto('/admin/gyms/create');
  await page.getByLabel('Tên phòng Gym', { exact: true }).fill(`R21 ${suffix}`); await page.getByLabel('Địa chỉ', { exact: true }).fill('Địa chỉ R21');
  await page.getByLabel('Họ và tên Manager', { exact: true }).fill('Manager R21'); await page.getByLabel('Email đăng nhập Manager', { exact: true }).fill(`r21-${suffix}@gym03.test`);
  const response = page.waitForResponse(response => response.request().method() === 'POST' && response.url().endsWith('/gyms'));
  await page.getByRole('button', { name: 'Tạo cơ sở và Manager', exact: true }).click(); const created = await response; expect(created.status()).toBe(201);
  return (await created.json()).data.gym_id as string;
};
const seedPhoto = async (page: Page) => page.evaluate(() => { const c = document.createElement('canvas'); c.width = 40; c.height = 20; c.getContext('2d')!.fillRect(0, 0, 40, 20); return { mime_type: 'image/png', data: c.toDataURL('image/png').split(',')[1] }; });

test('Real Admin inactive Gym private upload/caption CAS/order/delete and wrong scope', async ({ page, browser }) => {
  const gym = await createGym(page, 'operations'), path = `${api}/gyms/${gym}/images`;
  expect((await page.request.patch(`${api}/gyms/${gym}/status`, { data: { status: 'INACTIVE' } })).status()).toBe(200);
  await page.goto(`/admin/gyms/${gym}/gallery`); await expect(page.getByText('R21 operations · Gym ngừng hoạt động · 0/10 ảnh')).toBeVisible();
  await choosePhoto(page); await page.getByLabel('Chú thích ảnh mới (không bắt buộc)').fill('Không gian Admin'); await page.getByRole('button', { name: 'Thêm ảnh', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(1); await expect.poll(() => card(page).getByRole('img').evaluate((el: HTMLImageElement) => el.naturalWidth)).toBe(1600);
  const first = (await (await page.request.get(`${api}/gyms/${gym}/management/images`)).json()).data[0] as GalleryImage;
  expect(Object.keys(first).sort()).toEqual(['caption', 'display_order', 'gym_id', 'image_id', 'updated_at']);
  await edit(page); await page.getByLabel('Chú thích ảnh', { exact: true }).fill('Nháp Admin');
  expect((await page.request.patch(`${path}/${first.image_id}`, { data: { caption: 'Người khác', expected_updated_at: first.updated_at } })).status()).toBe(200);
  const conflict = page.waitForResponse(response => response.request().method() === 'PATCH' && response.url() === `${path}/${first.image_id}`);
  await page.getByRole('button', { name: 'Lưu chú thích', exact: true }).click(); expect((await conflict).status()).toBe(409);
  await page.getByRole('button', { name: 'Đọc lại gallery', exact: true }).click(); await expect(page.getByText('Chú thích hiện tại: Người khác')).toBeVisible();
  await expect(page.getByLabel('Chú thích ảnh', { exact: true })).toHaveValue('Nháp Admin'); await page.getByRole('button', { name: 'Dùng dữ liệu vừa đọc', exact: true }).click();
  await page.getByLabel('Chú thích ảnh', { exact: true }).fill(''); await page.getByRole('button', { name: 'Lưu chú thích', exact: true }).click(); await expect(card(page).getByText('Chưa có chú thích.')).toBeVisible();
  await choosePhoto(page); await page.getByLabel('Chú thích ảnh mới (không bắt buộc)').fill('Ảnh thứ hai'); await page.getByRole('button', { name: 'Thêm ảnh', exact: true }).click(); await expect(page.getByRole('article')).toHaveCount(2);
  await card(page, 1).getByRole('button', { name: 'Lên', exact: true }).click(); await expect(card(page).getByText('Ảnh thứ hai')).toBeVisible();
  const gyms = (await (await page.request.get(`${api}/admin/gyms`)).json()).data as { gym_id: string; gym_name: string }[], other = gyms.find(row => row.gym_name === 'Browser Gym')!;
  expect((await page.request.delete(`${api}/gyms/${other.gym_id}/images/${first.image_id}`)).status()).toBe(404);
  await card(page, 1).getByRole('button', { name: 'Xóa ảnh', exact: true }).click(); await page.getByRole('button', { name: 'Xác nhận xóa', exact: true }).click(); await expect(page.getByRole('article')).toHaveCount(1);
  expect((await page.request.get(`${api}/gyms/${gym}/management/images/${first.image_id}/file`)).status()).toBe(404);
  const guest = await browser.newContext(); try { expect((await guest.request.get(path)).status()).toBe(404); expect((await guest.request.get(`${api}/gyms/${gym}/management/images`)).status()).toBe(401); }
  finally { await guest.close(); }
});
test('Real Admin final-slot transaction race yields one winner and UI reads quota conflict without resending', async ({ page }) => {
  const gym = await createGym(page, 'quota'), path = `${api}/gyms/${gym}/images`, image = await seedPhoto(page);
  for (let index = 1; index <= 9; index++) expect((await page.request.post(path, { data: { image, caption: `Ảnh ${index}` } })).status()).toBe(201);
  await page.goto(`/admin/gyms/${gym}/gallery`); await expect(page.getByRole('article')).toHaveCount(9); await choosePhoto(page); await page.getByLabel('Chú thích ảnh mới (không bắt buộc)').fill('Ảnh UI giữ lại');
  const results = await Promise.all([page.request.post(path, { data: { image, caption: 'Race A' } }), page.request.post(path, { data: { image, caption: 'Race B' } })]);
  expect(results.map(response => response.status()).sort()).toEqual([201, 409]);
  const response = page.waitForResponse(response => response.request().method() === 'POST' && response.url() === path);
  await page.getByRole('button', { name: 'Thêm ảnh', exact: true }).click(); expect((await response).status()).toBe(409);
  await page.getByRole('button', { name: 'Đọc lại gallery', exact: true }).click(); await expect(page.getByRole('article')).toHaveCount(10);
  await page.getByRole('button', { name: 'Dùng dữ liệu vừa đọc', exact: true }).click(); await expect(page.getByAltText('Ảnh phòng tập sẽ thêm')).toBeVisible(); await expect(page.getByRole('button', { name: 'Thêm ảnh', exact: true })).toBeDisabled();
  await card(page).getByRole('button', { name: 'Xóa ảnh', exact: true }).click(); await page.getByRole('button', { name: 'Xác nhận xóa', exact: true }).click(); await expect(page.getByRole('article')).toHaveCount(9);
  await page.getByRole('button', { name: 'Thêm ảnh', exact: true }).click(); await expect(page.getByRole('status').filter({ hasText: 'Đã thêm ảnh.' })).toBeVisible(); await expect(page.getByRole('article')).toHaveCount(10);
});
