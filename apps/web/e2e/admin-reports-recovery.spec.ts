import { test, expect } from '@playwright/test';
import { setupReports, gymA, report, reportsRegion, fail, type Options } from './admin-report-fixtures';

test('Actor change after auth recheck resets page/status/note even for the same Gym', async ({ page }) => {
  const options: Options = { rows: Array.from({ length: 25 }, (_, i) => report(i + 1, gymA, 'IN_PROGRESS')) };
  await setupReports(page, options); await page.goto(`/admin/gyms/${gymA}/reports`);
  await page.getByRole('combobox', { name: 'Trạng thái báo cáo', exact: true }).selectOption('IN_PROGRESS');
  await page.getByRole('button', { name: 'Trang sau', exact: true }).click();
  await reportsRegion(page).getByRole('button', { name: 'Giải quyết', exact: true }).first().click(); await page.getByLabel('Kết quả xử lý').fill('Ghi chú actor cũ');
  let failure = true; options.actorId = 'another-admin'; options.readError = () => { if (failure) { failure = false; return 403; } return 0; };
  await page.getByRole('button', { name: 'Làm mới báo cáo', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Trạng thái báo cáo', exact: true })).toHaveValue('');
  await expect(page.getByText('Trang 1 / 2 · 25 kết quả', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Kết quả xử lý')).toHaveCount(0);
});

for (const expired of [true, false]) test(`Read access loss rechecks a ${expired ? 'expired session' : 'revoked Admin role'}`, async ({ page }) => {
  const options: Options = { rows: [report()] }; await setupReports(page, options); await page.goto(`/admin/gyms/${gymA}/reports`);
  await expect(page.getByRole('article')).toHaveCount(1);
  if (expired) options.guest = true; else options.role = 'CUSTOMER';
  options.readError = () => expired ? 401 : 403;
  await page.getByRole('button', { name: 'Làm mới báo cáo', exact: true }).click();
  if (expired) await expect(page).toHaveURL(/\/login$/);
  else await expect(page.getByRole('heading', { name: 'Không có quyền truy cập', exact: true })).toBeVisible();
  await expect(reportsRegion(page)).toHaveCount(0);
});

test('A now-empty last report page recovers from fresh metadata; whole-Gym empty has a distinct message', async ({ page }) => {
  const { rows } = await setupReports(page); await page.goto(`/admin/gyms/${gymA}/reports`);
  await page.getByRole('button', { name: 'Trang sau', exact: true }).click(); await expect(page.getByRole('article')).toHaveCount(5);
  rows.splice(0, 6); await page.getByRole('button', { name: 'Làm mới báo cáo', exact: true }).click();
  await expect(page.getByText('Trang 1 / 1 · 19 kết quả', { exact: true })).toBeVisible();
  await expect(page.getByText('Trang trước không còn dữ liệu; đã chuyển về trang 1.', { exact: true })).toBeVisible();
  rows.splice(0); await page.getByRole('button', { name: 'Làm mới báo cáo', exact: true }).click();
  await expect(page.getByText('0 báo cáo phù hợp', { exact: true })).toBeVisible(); await expect(page.getByText('Chưa có báo cáo phù hợp.', { exact: true })).toBeVisible();
  await expect(page.getByText('Không có Gym phù hợp.', { exact: true })).toHaveCount(0);
});

for (const status of [-1, 400, 404, 500]) test(`Initial scoped report read ${status} retries without mutation or Customer/public fallback`, async ({ page }) => {
  let error = status; const { reads, writes } = await setupReports(page, { readError: () => error }); await page.goto(`/admin/gyms/${gymA}/reports`);
  await expect(page.getByText('Không thể tải dữ liệu.', { exact: true })).toBeVisible();
  error = 0; await page.getByRole('button', { name: 'Thử lại', exact: true }).click(); await expect(page.getByRole('article')).toHaveCount(20);
  expect(reads.every(url => url.pathname.endsWith('/admin/gyms') || url.pathname.endsWith(`/gyms/${gymA}/reports`) || /\/reports\/[^/]+\/image$/.test(url.pathname))).toBe(true); expect(writes).toEqual([]);
});

test('Write validation400 leaves note editable, while reconciliation read failure keeps unknown writes locked', async ({ page }) => {
  let error = 400, readError = 0;
  const { writes } = await setupReports(page, { rows: [report(1, gymA, 'IN_PROGRESS')], write: route => fail(route, error), readError: () => readError });
  await page.goto(`/admin/gyms/${gymA}/reports`); await page.getByRole('button', { name: 'Giải quyết', exact: true }).click(); await page.getByLabel('Kết quả xử lý').fill('Ghi chú đang sửa'); await page.getByRole('button', { name: 'Lưu kết quả', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible(); await expect(page.getByLabel('Kết quả xử lý')).toBeEnabled(); expect(writes).toHaveLength(1);
  error = -1; await page.getByRole('button', { name: 'Lưu kết quả', exact: true }).click(); await expect(page.getByRole('button', { name: 'Đọc lại báo cáo', exact: true })).toBeEnabled();
  readError = 500; await page.getByRole('button', { name: 'Đọc lại báo cáo', exact: true }).click(); await expect(page.getByRole('button', { name: 'Lưu kết quả', exact: true })).toBeDisabled(); expect(writes).toHaveLength(2);
});
