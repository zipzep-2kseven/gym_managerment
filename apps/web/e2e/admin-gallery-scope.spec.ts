import { test, expect } from '@playwright/test';
import { card, choosePhoto, edit, fail, image, openGallery, png, setupGallery } from './admin-gallery-fixtures';

for (const status of [401, 403, 404, 500]) test(`Initial private list ${status} blocks writes and reveals no photo`, async ({ page }) => {
  const state = await setupGallery(page, { readError: () => status }); await openGallery(page);
  if ([401, 403].includes(status)) await expect(page.getByRole('alert')).toBeVisible(); else await expect(page.getByText('Không thể tải dữ liệu.')).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(0); expect(state.files).toHaveLength(0); expect(state.writes).toHaveLength(0);
});
for (const status of [401, 403]) test(`Caption ${status} gates draft, cached rows and competing uploads`, async ({ page }) => {
  const state = await setupGallery(page, { write: route => fail(route, status) }); await openGallery(page); await edit(page); await page.getByLabel('Chú thích ảnh', { exact: true }).fill('Nháp riêng');
  await page.getByRole('button', { name: 'Lưu chú thích', exact: true }).click(); await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByLabel('Chú thích ảnh', { exact: true })).toHaveCount(0); await expect(page.getByRole('article')).toHaveCount(0); await expect(page.getByLabel('Ảnh phòng tập', { exact: true })).toHaveCount(0); expect(state.writes).toHaveLength(1);
});
test('Actor change after private image denial clears prepared photo and caption draft', async ({ page }) => {
  let status = 404; const options = { actor: 'admin-a', fileError: () => { const result = status; if (status === 403) status = 0; return result; } }; await setupGallery(page, options); await openGallery(page); await choosePhoto(page);
  await page.getByLabel('Chú thích ảnh mới (không bắt buộc)').fill('Nháp actor A'); options.actor = 'admin-b'; status = 403;
  await edit(page); await page.getByLabel('Chú thích ảnh', { exact: true }).fill('Nháp chú thích A');
  await card(page).getByRole('button', { name: 'Thử lại ảnh 1', exact: true }).click();
  await expect(card(page).getByRole('img')).toBeVisible(); await expect(page.getByAltText('Ảnh phòng tập sẽ thêm')).toHaveCount(0);
  await expect(page.getByLabel('Chú thích ảnh', { exact: true })).toHaveCount(0); await expect(page.getByLabel('Chú thích ảnh mới (không bắt buộc)')).toHaveValue('');
});
test('Image above 20 megapixels is rejected before POST', async ({ page }) => {
  const state = await setupGallery(page); await openGallery(page);
  await page.evaluate(() => { window.createImageBitmap = (() => Promise.resolve({ width: 5000, height: 5000, close() {} })) as typeof createImageBitmap; });
  await page.getByLabel('Ảnh phòng tập', { exact: true }).setInputFiles({ name: 'large.png', mimeType: 'image/png', buffer: png });
  await expect(page.getByRole('alert')).toContainText('Ảnh quá lớn'); await expect(page.getByRole('button', { name: 'Thêm ảnh', exact: true })).toBeDisabled(); expect(state.writes).toHaveLength(0);
});
test('Unknown caption target disappears before readback: close without phantom retry', async ({ page }) => {
  const rows = [image(1)]; const state = await setupGallery(page, { rows, write: route => { rows.splice(0); return fail(route, 404); } });
  await openGallery(page); await edit(page); await page.getByLabel('Chú thích ảnh', { exact: true }).fill('Nháp'); await page.getByRole('button', { name: 'Lưu chú thích', exact: true }).click();
  await page.getByRole('button', { name: 'Đọc lại gallery', exact: true }).click(); await expect(page.getByText('Ảnh không còn trong gallery hiện tại.')).toBeVisible();
  await page.getByRole('button', { name: 'Dùng dữ liệu vừa đọc', exact: true }).click(); await expect(page.getByRole('form', { name: 'Sửa chú thích ảnh', exact: true })).toHaveCount(0); expect(state.writes).toHaveLength(1);
});
test('Pending delete locks upload, reorder and cancellation', async ({ page }) => {
  let release = () => {}; const gate = new Promise<void>(resolve => { release = resolve; });
  const state = await setupGallery(page, { write: async route => { await gate; return fail(route, 500); } }); await openGallery(page); await card(page).getByRole('button', { name: 'Xóa ảnh', exact: true }).click();
  await page.getByRole('button', { name: 'Xác nhận xóa', exact: true }).click(); await expect(page.getByRole('button', { name: 'Hủy', exact: true })).toBeDisabled(); await expect(page.getByLabel('Ảnh phòng tập', { exact: true })).toBeDisabled();
  await expect(card(page, 1).getByRole('button', { name: 'Lên', exact: true })).toBeDisabled(); await page.keyboard.press('Escape'); await expect(page.getByRole('region', { name: 'Xác nhận xóa ảnh', exact: true })).toBeVisible();
  expect(state.writes).toHaveLength(1); release(); await expect(page.getByRole('button', { name: 'Đọc lại gallery', exact: true })).toBeVisible();
});
test('Malformed successful upload identity requires manual review rather than confirmed receipt', async ({ page }) => {
  const state = await setupGallery(page, { write: route => route.fulfill({ status: 201, json: { success: true, data: { ...image(3), gym_id: 'foreign' } } }) });
  await openGallery(page); await choosePhoto(page); await page.getByRole('button', { name: 'Thêm ảnh', exact: true }).click(); await expect(page.getByRole('alert')).toContainText('Phản hồi ảnh không xác định');
  await expect(page.getByRole('status').filter({ hasText: 'Đã thêm ảnh.' })).toHaveCount(0); await expect(page.getByText('Gallery không chứng minh ảnh nào', { exact: false })).toBeVisible(); expect(state.writes).toHaveLength(1);
});
