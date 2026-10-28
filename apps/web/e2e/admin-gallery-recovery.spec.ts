import { test, expect } from '@playwright/test';
import { card, choosePhoto, edit, fail, gymA, image, ok, openGallery, setupGallery } from './admin-gallery-fixtures';

test('Caption conflict preserves draft until explicit fresh timestamp adoption, including failed read', async ({ page }) => {
  let status = 0, attempts = 0; const rows = [image(1), image(2)];
  const state = await setupGallery(page, { rows, readError: () => status, write: async (route, row) => {
    if (++attempts === 1) { row!.caption = 'Người khác sửa'; row!.updated_at = '2025-01-01T00:00:00Z'; return fail(route, 409, 'GALLERY_CHANGED'); }
    return route.fulfill({ json: ok({ ...row!, caption: route.request().postDataJSON().caption }) });
  } }); await openGallery(page); await edit(page); await page.getByLabel('Chú thích ảnh', { exact: true }).fill('Bản nháp của tôi');
  await page.getByRole('button', { name: 'Lưu chú thích', exact: true }).click(); await expect(page.getByRole('button', { name: 'Đọc lại gallery', exact: true })).toBeVisible();
  status = 500; await page.getByRole('button', { name: 'Đọc lại gallery', exact: true }).click(); await expect(page.getByRole('alert')).toContainText('500');
  await expect(page.getByLabel('Chú thích ảnh', { exact: true })).toHaveValue('Bản nháp của tôi'); await expect(page.getByRole('button', { name: 'Lưu chú thích', exact: true })).toBeDisabled();
  status = 0; await page.getByRole('button', { name: 'Đọc lại gallery', exact: true }).click(); await expect(page.getByText('Chú thích hiện tại: Người khác sửa')).toBeVisible();
  await expect(page.getByLabel('Chú thích ảnh', { exact: true })).toHaveValue('Bản nháp của tôi'); expect(state.writes).toHaveLength(1);
  await page.getByRole('button', { name: 'Dùng dữ liệu vừa đọc', exact: true }).click(); await page.getByRole('button', { name: 'Lưu chú thích', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Đã lưu chú thích.' })).toBeVisible(); expect(state.writes[1].body).toEqual({ caption: 'Bản nháp của tôi', expected_updated_at: '2025-01-01T00:00:00Z' });
});
test('Order conflict after concurrent upload requires a new click with all fresh IDs', async ({ page }) => {
  let attempts = 0; const rows = [image(1), image(2)];
  const state = await setupGallery(page, { rows, write: route => { if (++attempts === 1) { rows.push(image(3)); return fail(route, 409); }
    const ids: string[] = route.request().postDataJSON().image_ids; rows.sort((a, b) => ids.indexOf(a.image_id) - ids.indexOf(b.image_id)); return route.fulfill({ json: ok(rows) }); } });
  await openGallery(page); await card(page, 1).getByRole('button', { name: 'Lên', exact: true }).click(); await page.getByRole('button', { name: 'Đọc lại gallery', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(3); await expect(card(page, 1).getByRole('button', { name: 'Lên', exact: true })).toBeDisabled(); expect(state.writes).toHaveLength(1);
  await page.getByRole('button', { name: 'Dùng dữ liệu vừa đọc', exact: true }).click(); await card(page, 1).getByRole('button', { name: 'Lên', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Đã cập nhật thứ tự ảnh.' })).toBeVisible(); expect(state.writes[1].body).toEqual({ expected_image_ids: [image(1).image_id, image(2).image_id, image(3).image_id], image_ids: [image(2).image_id, image(1).image_id, image(3).image_id] });
});
for (const status of [-1, 500]) test(`Unknown POST ${status} never replays and requires manual review then discards draft`, async ({ page }) => {
  const state = await setupGallery(page, { write: route => fail(route, status) }); await openGallery(page); await choosePhoto(page); await page.getByLabel('Chú thích ảnh mới (không bắt buộc)').fill('Ảnh chưa rõ');
  await page.getByRole('button', { name: 'Thêm ảnh', exact: true }).click(); await expect(page.getByRole('button', { name: 'Đọc lại gallery', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Đọc lại gallery', exact: true }).click(); await expect(page.getByRole('button', { name: 'Đóng sau khi kiểm tra gallery', exact: true })).toBeDisabled();
  await expect(page.getByAltText('Ảnh phòng tập sẽ thêm')).toBeVisible(); expect(state.writes).toHaveLength(1);
  await page.getByRole('checkbox', { name: 'Tôi đã kiểm tra gallery và hiểu rằng kết quả tải ảnh chưa được xác định.', exact: true }).check(); await page.getByRole('button', { name: 'Đóng sau khi kiểm tra gallery', exact: true }).click();
  await expect(page.getByAltText('Ảnh phòng tập sẽ thêm')).toHaveCount(0); await expect(page.getByLabel('Chú thích ảnh mới (không bắt buộc)')).toHaveValue(''); expect(state.writes).toHaveLength(1);
});
test('Upload quota conflict reads full gallery, retains chosen photo and can continue after deletion', async ({ page }) => {
  const rows = Array.from({ length: 9 }, (_, i) => image(i + 1)); let first = true;
  const state = await setupGallery(page, { rows, write: (route, row) => {
    if (first) { first = false; rows.push(image(10)); return fail(route, 409, 'GALLERY_LIMIT'); }
    if (route.request().method() === 'DELETE') { rows.splice(rows.indexOf(row!), 1); return route.fulfill({ json: ok({ message: 'Đã xóa ảnh.' }) }); }
    const created = { ...image(11), caption: route.request().postDataJSON().caption }; rows.push(created); return route.fulfill({ status: 201, json: ok(created) });
  } }); await openGallery(page); await choosePhoto(page); await page.getByLabel('Chú thích ảnh mới (không bắt buộc)').fill('Ảnh giữ lại'); await page.getByRole('button', { name: 'Thêm ảnh', exact: true }).click();
  await page.getByRole('button', { name: 'Đọc lại gallery', exact: true }).click(); await expect(page.getByRole('article')).toHaveCount(10); await page.getByRole('button', { name: 'Dùng dữ liệu vừa đọc', exact: true }).click();
  await expect(page.getByAltText('Ảnh phòng tập sẽ thêm')).toBeVisible(); await expect(page.getByLabel('Chú thích ảnh mới (không bắt buộc)')).toHaveValue('Ảnh giữ lại'); await expect(page.getByRole('button', { name: 'Thêm ảnh', exact: true })).toBeDisabled();
  await card(page).getByRole('button', { name: 'Xóa ảnh', exact: true }).click(); await page.getByRole('button', { name: 'Xác nhận xóa', exact: true }).click(); await expect(page.getByRole('article')).toHaveCount(9);
  await page.getByRole('button', { name: 'Thêm ảnh', exact: true }).click(); await expect(page.getByRole('status').filter({ hasText: 'Đã thêm ảnh.' })).toBeVisible(); expect(state.writes).toHaveLength(3);
});
for (const status of [-1, 500]) test(`DELETE ${status} after committed row removal reads absence without second delete`, async ({ page }) => {
  const rows = [image(1), image(2)]; const state = await setupGallery(page, { rows, write: (route, row) => { rows.splice(rows.indexOf(row!), 1); return fail(route, status); } });
  await openGallery(page); await card(page).getByRole('button', { name: 'Xóa ảnh', exact: true }).click(); await page.getByRole('button', { name: 'Xác nhận xóa', exact: true }).click();
  await page.getByRole('button', { name: 'Đọc lại gallery', exact: true }).click(); await expect(page.getByText('Ảnh không còn trong gallery hiện tại.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Xác nhận xóa', exact: true })).toBeDisabled(); await page.getByRole('button', { name: 'Dùng dữ liệu vừa đọc', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Xác nhận xóa ảnh', exact: true })).toHaveCount(0); expect(state.writes).toHaveLength(1);
});
test('Confirmed upload receipt survives failed read, no replay and prepared photo cleared', async ({ page }) => {
  let status = 0; const rows = [image(1)]; const state = await setupGallery(page, { rows, readError: () => status, write: route => {
    rows.push(image(2)); status = 500; return route.fulfill({ status: 201, json: ok(image(2)) }); } });
  await openGallery(page); await choosePhoto(page); await page.getByRole('button', { name: 'Thêm ảnh', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Đã thêm ảnh.' })).toBeVisible(); await expect(page.getByText('Đã lưu, cần đọc lại gallery')).toBeVisible(); await expect(page.getByAltText('Ảnh phòng tập sẽ thêm')).toHaveCount(0);
  status = 0; await page.getByRole('button', { name: 'Đọc lại gallery', exact: true }).click(); await page.getByRole('button', { name: 'Dùng dữ liệu vừa đọc', exact: true }).click(); await expect(page.getByRole('article')).toHaveCount(2); expect(state.writes).toHaveLength(1);
});
test('Confirmed caption with failed read keeps editor draft and receipt', async ({ page }) => {
  let status = 0; const state = await setupGallery(page, { readError: () => status, write: (route, row) => { status = 500; row!.caption = route.request().postDataJSON().caption; return route.fulfill({ json: ok(row) }); } });
  await openGallery(page); await edit(page); await page.getByLabel('Chú thích ảnh', { exact: true }).fill('Đã lưu'); await page.getByRole('button', { name: 'Lưu chú thích', exact: true }).click();
  await expect(page.getByText('Đã lưu, cần đọc lại gallery')).toBeVisible(); await expect(page.getByLabel('Chú thích ảnh', { exact: true })).toHaveValue('Đã lưu'); await expect(page.getByRole('status').filter({ hasText: 'Đã lưu chú thích.' })).toBeVisible(); expect(state.writes).toHaveLength(1);
});
test('Cached gallery refresh failure preserves upload draft and blocks writes', async ({ page }) => {
  let status = 0; await setupGallery(page, { readError: () => status }); await openGallery(page); await choosePhoto(page); await page.getByLabel('Chú thích ảnh mới (không bắt buộc)').fill('Nháp');
  status = 500; await page.getByRole('button', { name: 'Làm mới ảnh', exact: true }).click(); await expect(page.getByText('Làm mới thất bại. Dữ liệu cũ có thể đã thay đổi.')).toBeVisible();
  await expect(page.getByAltText('Ảnh phòng tập sẽ thêm')).toBeVisible(); await expect(page.getByRole('button', { name: 'Thêm ảnh', exact: true })).toBeDisabled();
  status = 0; await page.getByRole('region', { name: 'Gallery nội bộ', exact: true }).getByRole('button', { name: 'Thử lại', exact: true }).click(); await expect(page.getByRole('button', { name: 'Thêm ảnh', exact: true })).toBeEnabled();
});
test('Cached Gym context failure keeps caption draft and requires context recovery', async ({ page }) => {
  let status = 0; await setupGallery(page, { gymError: () => status }); await openGallery(page); await edit(page); await page.getByLabel('Chú thích ảnh', { exact: true }).fill('Nháp context');
  status = 500; await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' }); window.dispatchEvent(new Event('visibilitychange')); });
  await expect(page.getByText('Thông tin Gym chưa được làm mới.', { exact: false })).toBeVisible({ timeout: 15000 }); await expect(page.getByLabel('Chú thích ảnh', { exact: true })).toHaveValue('Nháp context'); await expect(page.getByRole('button', { name: 'Lưu chú thích', exact: true })).toBeDisabled();
  status = 0; await page.getByRole('button', { name: 'Thử lại', exact: true }).click(); await expect(page.getByRole('button', { name: 'Lưu chú thích', exact: true })).toBeEnabled();
});
test('Late internal GET aborted on navigation does not populate another Gym', async ({ page }) => {
  let release = () => {}; const gate = new Promise<void>(resolve => { release = resolve; });
  const state = await setupGallery(page, { read: async route => { if (route.request().url().includes(gymA)) await gate; return route.fulfill({ json: ok(route.request().url().includes(gymA) ? [image(1)] : []) }); } });
  await openGallery(page); await expect.poll(() => state.reads.length).toBeGreaterThan(0); await page.goto('/admin/gyms/10000000-0000-4000-8000-000000000002/gallery');
  release(); await expect(page.getByText('Chưa có ảnh giới thiệu.', { exact: false })).toBeVisible(); await expect(page.getByRole('article')).toHaveCount(0);
});
