import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { card, choosePhoto, edit, fail, gymA, gymB, image, ok, openGallery, setupGallery } from './admin-gallery-fixtures';

test('Internal inactive Gym, nullable caption, cover, private bytes and no query', async ({ page }) => {
  const state = await setupGallery(page); await openGallery(page);
  await expect(page.getByText('Gym A · Gym ngừng hoạt động · 2/10 ảnh')).toBeVisible();
  await expect(card(page).getByText('Đại diện gallery')).toBeVisible(); await expect(card(page, 1).getByText('Chưa có chú thích.')).toBeVisible();
  await expect(card(page).getByRole('img')).toBeVisible(); expect(state.reads.every(url => !url.search && url.pathname.includes('/management/images'))).toBe(true);
  expect(state.files.every(url => url.pathname.includes(`/gyms/${gymA}/management/images/`) && !url.search)).toBe(true);
  expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
});
test('Upload strictly sends resized image/caption and permits another deliberate upload', async ({ page }) => {
  const state = await setupGallery(page); await openGallery(page); await choosePhoto(page);
  await expect(page.getByLabel('Ảnh phòng tập', { exact: true })).toHaveValue(/gym\.png$/);
  await page.getByLabel('Chú thích ảnh mới (không bắt buộc)').fill('  Ảnh mới  '); await page.getByRole('button', { name: 'Thêm ảnh', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Đã thêm ảnh.' })).toBeVisible(); await expect(page.getByRole('article')).toHaveCount(3);
  expect(Object.keys(state.writes[0].body).sort()).toEqual(['caption', 'image']); expect(state.writes[0].body.caption).toBe('Ảnh mới'); expect(state.writes[0].body.image.mime_type).toBe('image/jpeg');
  await expect(page.getByAltText('Ảnh phòng tập sẽ thêm')).toHaveCount(0); await choosePhoto(page); await page.getByRole('button', { name: 'Thêm ảnh', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(4); expect(state.writes).toHaveLength(2);
});
test('Caption nullable normalization, original timestamp, cancel and Escape restore focus', async ({ page }) => {
  const state = await setupGallery(page); await openGallery(page); await edit(page); await expect(page.getByLabel('Chú thích ảnh', { exact: true })).toBeFocused();
  await page.getByLabel('Chú thích ảnh', { exact: true }).fill(''); await page.getByRole('button', { name: 'Lưu chú thích', exact: true }).click();
  await expect(card(page).getByText('Chưa có chú thích.')).toBeVisible(); expect(state.writes[0].body).toEqual({ caption: '', expected_updated_at: image().updated_at });
  await edit(page); await page.getByLabel('Chú thích ảnh', { exact: true }).fill('Nháp'); await page.keyboard.press('Escape');
  await expect(card(page).getByRole('button', { name: 'Sửa chú thích ảnh 1', exact: true })).toBeFocused(); expect(state.writes).toHaveLength(1);
});
test('Full ID order changes cover and preserves keyboard context at boundary', async ({ page }) => {
  const state = await setupGallery(page); await openGallery(page); await card(page, 1).getByRole('button', { name: 'Lên', exact: true }).click();
  await expect(card(page).getByText('Chưa có chú thích.')).toBeVisible(); await expect(card(page).getByRole('heading', { name: 'Ảnh 1', exact: true })).toBeFocused();
  expect(state.writes[0].body).toEqual({ expected_image_ids: [image(1).image_id, image(2).image_id], image_ids: [image(2).image_id, image(1).image_id] });
  await expect(card(page).getByRole('button', { name: 'Lên', exact: true })).toBeDisabled(); await expect(card(page, 1).getByRole('button', { name: 'Xuống', exact: true })).toBeDisabled();
});
test('Delete inline cancellation then confirmation has no request body and keeps receipt', async ({ page }) => {
  const state = await setupGallery(page); await openGallery(page); await card(page).getByRole('button', { name: 'Xóa ảnh', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Xác nhận xóa', exact: true })).toBeFocused(); await page.keyboard.press('Escape'); expect(state.writes).toHaveLength(0);
  await card(page).getByRole('button', { name: 'Xóa ảnh', exact: true }).click(); await page.getByRole('button', { name: 'Xác nhận xóa', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(1); await expect(page.getByRole('status').filter({ hasText: 'Đã xóa ảnh.' })).toBeVisible(); expect(state.writes[0]).toMatchObject({ method: 'DELETE', body: null });
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
});
test('Pending upload locks all mutations and ignores a second synthetic submit', async ({ page }) => {
  let release = () => {}; const gate = new Promise<void>(resolve => { release = resolve; });
  const state = await setupGallery(page, { write: async route => { await gate; return fail(route, 400); } }); await openGallery(page); await choosePhoto(page);
  await page.getByRole('button', { name: 'Thêm ảnh', exact: true }).click(); await expect(card(page).getByRole('button', { name: 'Xóa ảnh', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Làm mới ảnh', exact: true })).toBeDisabled(); await expect(page.getByLabel('Ảnh phòng tập', { exact: true })).toBeDisabled();
  await page.getByRole('form', { name: 'Thêm ảnh phòng tập', exact: true }).evaluate(el => el.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  expect(state.writes).toHaveLength(1); release(); await expect(page.getByRole('alert')).toContainText('400'); await expect(page.getByAltText('Ảnh phòng tập sẽ thêm')).toBeVisible();
});
test('Image conversion locks row writes and can be cancelled without late preview', async ({ page }) => {
  await setupGallery(page); await openGallery(page); await expect(card(page).getByRole('button', { name: 'Xóa ảnh', exact: true })).toBeEnabled();
  await page.evaluate(() => { const original = window.createImageBitmap; window.createImageBitmap = ((...args: Parameters<typeof createImageBitmap>) => new Promise(resolve => setTimeout(() => resolve(original(...args)), 700))) as typeof createImageBitmap; });
  await page.getByLabel('Ảnh phòng tập', { exact: true }).setInputFiles({ name: 'small.png', mimeType: 'image/png', buffer: (await import('./admin-gallery-fixtures')).png });
  await expect(page.getByText('Đang xử lý ảnh…')).toBeVisible(); await expect(card(page).getByRole('button', { name: 'Xóa ảnh', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Bỏ ảnh đã chọn', exact: true }).click(); await expect(card(page).getByRole('button', { name: 'Xóa ảnh', exact: true })).toBeEnabled();
  await page.waitForTimeout(800); await expect(page.getByAltText('Ảnh phòng tập sẽ thêm')).toHaveCount(0);
});
for (const invalid of ['type', 'size', 'corrupt'] as const) test(`Invalid photo ${invalid} prevents POST`, async ({ page }) => {
  const state = await setupGallery(page); await openGallery(page);
  await page.getByLabel('Ảnh phòng tập', { exact: true }).setInputFiles({ name: invalid === 'type' ? 'bad.svg' : 'bad.png', mimeType: invalid === 'type' ? 'image/svg+xml' : 'image/png', buffer: invalid === 'size' ? Buffer.alloc(5 * 1024 * 1024 + 1) : Buffer.from('invalid') });
  await expect(page.getByRole('alert')).toBeVisible(); await expect(page.getByRole('button', { name: 'Thêm ảnh', exact: true })).toBeDisabled(); expect(state.writes).toHaveLength(0);
});
for (const status of [400, 413, 503]) test(`Known upload rejection ${status} retains draft without ambiguous retry`, async ({ page }) => {
  const state = await setupGallery(page, { write: route => fail(route, status) }); await openGallery(page); await choosePhoto(page); await page.getByLabel('Chú thích ảnh mới (không bắt buộc)').fill('Nháp');
  await page.getByRole('button', { name: 'Thêm ảnh', exact: true }).click(); await expect(page.getByRole('alert')).toContainText(String(status));
  await expect(page.getByAltText('Ảnh phòng tập sẽ thêm')).toBeVisible(); await expect(page.getByLabel('Chú thích ảnh mới (không bắt buộc)')).toHaveValue('Nháp');
  await expect(page.getByRole('region', { name: 'Kiểm tra kết quả gallery', exact: true })).toHaveCount(0); expect(state.writes).toHaveLength(1);
});
for (const status of [401, 403]) test(`Private bytes ${status} removes gallery controls and rechecks session`, async ({ page }) => {
  const state = await setupGallery(page, { fileError: () => status }); let sessions = 0; page.on('request', req => { if (req.url().endsWith('/auth/me')) sessions++; });
  await openGallery(page); await expect(page.getByRole('alert')).toBeVisible(); await expect(page.getByRole('article')).toHaveCount(0); await expect(page.getByLabel('Ảnh phòng tập', { exact: true })).toHaveCount(0);
  expect(sessions).toBeGreaterThan(1); expect(state.writes).toHaveLength(0);
});
test('Missing private bytes fallback remains actionable and retries image alone', async ({ page }) => {
  let status = 404; const state = await setupGallery(page, { fileError: () => status }); await openGallery(page);
  await expect(card(page).getByText('Không tải được ảnh 1.', { exact: false })).toBeVisible(); await expect(card(page).getByRole('button', { name: 'Sửa chú thích ảnh 1', exact: true })).toBeEnabled();
  status = 0; await card(page).getByRole('button', { name: 'Thử lại ảnh 1', exact: true }).click(); await expect(card(page).getByRole('img')).toBeVisible(); expect(state.writes).toHaveLength(0);
});
test('Corrupt bytes show decode fallback', async ({ page }) => {
  await setupGallery(page, { file: route => route.fulfill({ contentType: 'image/png', body: 'broken' }) }); await openGallery(page);
  await expect(card(page).getByRole('button', { name: 'Thử lại ảnh 1', exact: true })).toBeVisible(); await expect(card(page).getByRole('button', { name: 'Xóa ảnh', exact: true })).toBeEnabled();
});
test('Cross-Gym DTO and invalid Gym never expose image controls', async ({ page }) => {
  await setupGallery(page, { read: route => route.fulfill({ json: ok([image(1, gymB)]) }) }); await openGallery(page); await expect(page.getByText('Không thể tải dữ liệu.')).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(0); await expect(page.getByRole('button', { name: 'Thêm ảnh', exact: true })).toBeDisabled();
  await page.goto('/admin/gyms/invalid/gallery'); await expect(page.getByRole('alert')).toHaveText('Mã Gym không hợp lệ.');
});
test('Changing Gym drops draft and late upload receipt from previous scope', async ({ page }) => {
  let release = () => {}; const gate = new Promise<void>(resolve => { release = resolve; });
  await setupGallery(page, { rows: [image(1), image(2, gymB)], write: async route => { await gate; return route.fulfill({ status: 201, json: ok(image(3)) }); } });
  await openGallery(page); await choosePhoto(page); await page.getByLabel('Chú thích ảnh mới (không bắt buộc)').fill('Gym A nháp'); await page.getByRole('button', { name: 'Thêm ảnh', exact: true }).click();
  await page.evaluate(gym => { history.pushState({}, '', `/admin/gyms/${gym}/gallery`); dispatchEvent(new PopStateEvent('popstate')); }, gymB);
  await expect(page.getByText('Gym B · Gym đang hoạt động · 1/10 ảnh')).toBeVisible(); release(); await expect(page.getByLabel('Chú thích ảnh mới (không bắt buộc)')).toHaveValue('');
  await expect(page.getByRole('status').filter({ hasText: 'Đã thêm ảnh.' })).toHaveCount(0); await expect(page.getByAltText('Ảnh phòng tập sẽ thêm')).toHaveCount(0);
});
for (const width of [375, 768, 1024, 1440]) test(`Gallery responsive ${width} and focusable controls`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 }); await setupGallery(page, { rows: [{ ...image(), caption: 'Chú_thích_dài_'.repeat(15) }, image(2)] }); await openGallery(page); await expect(card(page).getByRole('img')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); await edit(page); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.getByLabel('Chú thích ảnh', { exact: true }).evaluate(el => getComputedStyle(el).outlineStyle)).toBe('solid');
  if (width === 375 || width === 1440) expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
  await page.keyboard.press('Escape'); await expect(card(page).getByRole('button', { name: 'Sửa chú thích ảnh 1', exact: true })).toBeFocused();
});
test('Normal-content previews', async ({ page }) => {
  const bytes = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 800; c.height = 450; const ctx = c.getContext('2d')!; ctx.fillStyle = '#274060'; ctx.fillRect(0, 0, 800, 450); ctx.fillStyle = '#fff'; ctx.font = '28px sans-serif'; ctx.fillText('Ảnh kiểm thử gallery', 32, 225); return c.toDataURL('image/png').split(',')[1]; });
  await setupGallery(page, { file: route => route.fulfill({ contentType: 'image/png', body: Buffer.from(bytes, 'base64') }) }); await openGallery(page); await expect(card(page).getByRole('img')).toBeVisible(); await expect(card(page, 1).getByRole('img')).toBeVisible();
  await page.getByRole('heading', { level: 1 }).evaluate(el => el.blur());
  for (const [width, size] of [[1440, 'desktop'], [375, 'mobile']] as const) { await page.setViewportSize({ width, height: 1000 }); await page.screenshot({ path: `/tmp/multi-gym-r21-gallery-${size}.png`, fullPage: true }); }
});
