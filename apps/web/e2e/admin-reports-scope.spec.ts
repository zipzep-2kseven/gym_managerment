import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { setupReports, gymA, gymB, report, reportsRegion, switchGym, fail, paged, type Options } from './admin-report-fixtures';

test('Gym scope remount resets local report page/status/note and never transfers a form or photo', async ({ page }) => {
  const { reads } = await setupReports(page, { rows: Array.from({ length: 25 }, (_, i) => report(i + 1, gymA, 'IN_PROGRESS')) });
  await page.goto(`/admin/gyms/${gymA}/reports`);
  await page.getByRole('combobox', { name: 'Trạng thái báo cáo', exact: true }).selectOption('IN_PROGRESS');
  await page.getByRole('button', { name: 'Trang sau', exact: true }).click();
  await expect(page.getByText('Trang 2 / 2 · 25 kết quả', { exact: true })).toBeVisible();
  await reportsRegion(page).getByRole('button', { name: 'Giải quyết', exact: true }).first().click();
  await page.getByLabel('Kết quả xử lý').fill('Ghi chú chỉ thuộc Gym A');
  await switchGym(page);
  await expect(page.getByRole('combobox', { name: 'Trạng thái báo cáo', exact: true })).toHaveValue('');
  await expect(page.getByRole('textbox', { name: 'Kết quả xử lý' })).toHaveCount(0);
  await expect(reportsRegion(page).getByRole('article')).toHaveCount(1);
  await expect(reportsRegion(page)).not.toContainText('Ghi chú chỉ thuộc Gym A');
  expect(reads.filter(url => url.pathname === `/api/v1/gyms/${gymB}/reports`).every(url => url.searchParams.get('page') === '1' && !url.searchParams.has('status'))).toBe(true);
  await switchGym(page, gymA); await expect(page.getByRole('combobox', { name: 'Trạng thái báo cáo', exact: true })).toHaveValue('');
  await expect(page.getByText('Trang 1 / 2 · 25 kết quả', { exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Kết quả xử lý' })).toHaveCount(0);
});

test('A late old Gym GET is aborted and cannot paint under a new Gym header', async ({ page }) => {
  let aborted = false;
  page.on('requestfailed', req => { if (req.url().includes(`${gymA}/reports?page`)) aborted = true; });
  let release = () => {}; const gate = new Promise<void>(resolve => { release = resolve; });
  const options: Options = { read: async (route, url) => {
    if (url.pathname.includes(gymA)) await gate;
    await route.fulfill({ json: paged([report(1, url.pathname.includes(gymB) ? gymB : gymA)], 1, 20) }).catch(() => {});
  } };
  await setupReports(page, options);
  const requested = page.waitForRequest(req => req.url().includes(`${gymA}/reports?page`));
  await page.goto(`/admin/gyms/${gymA}/reports`); await requested;
  await expect(page.getByText('Đang tải dữ liệu…', { exact: true })).toBeVisible();
  await expect(page.getByText('0 báo cáo phù hợp', { exact: true })).toHaveCount(0);
  await switchGym(page); await expect(reportsRegion(page)).toContainText('Gym 02:');
  release(); await expect.poll(() => aborted).toBe(true); await expect(reportsRegion(page)).not.toContainText('Gym 01:');
  await expect(page.getByRole('heading', { name: 'Báo cáo sự cố tại Gym', exact: true })).toBeFocused();
});

test('Deep link/reload starts local filters at default and Choose another Gym goes to the default selector', async ({ page }) => {
  await setupReports(page); await page.goto(`/admin/gyms/${gymA}/reports?status=REJECTED&page=2`);
  await expect(page.getByRole('combobox', { name: 'Trạng thái báo cáo', exact: true })).toHaveValue('');
  await expect(page.getByText('Trang 1 / 2 · 25 kết quả', { exact: true })).toBeVisible();
  await page.getByRole('combobox', { name: 'Trạng thái báo cáo', exact: true }).selectOption('RESOLVED');
  await page.reload(); await expect(page.getByRole('combobox', { name: 'Trạng thái báo cáo', exact: true })).toHaveValue('');
  await page.getByRole('link', { name: 'Chọn Gym khác', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/reports$/); await expect(page.getByRole('combobox', { name: 'Trạng thái Gym', exact: true })).toHaveValue('');
});

test('Invalid/missing Gym cannot request reports or fall back to public data', async ({ page }) => {
  const { reads } = await setupReports(page);
  await page.goto('/admin/gyms/invalid/reports'); await expect(page.getByRole('heading', { name: 'Cơ sở không hợp lệ', exact: true })).toBeVisible(); expect(reads).toEqual([]);
  await page.goto('/admin/gyms/10000000-0000-4000-8000-000000009999/reports');
  await expect(page.getByRole('alert')).toBeVisible();
  expect(reads.every(url => url.pathname.endsWith('/admin/gyms'))).toBe(true);
});

test('Admin transitions PENDING to IN_PROGRESS then resolves with required trimmed note and preserved evidence', async ({ page }) => {
  const { writes } = await setupReports(page, { rows: [report()] }); await page.goto(`/admin/gyms/${gymA}/reports`);
  await page.getByRole('button', { name: 'Tiếp nhận', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Giải quyết', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Giải quyết', exact: true }).click();
  await expect(page.getByLabel('Kết quả xử lý')).toBeFocused();
  await expect(page.getByRole('button', { name: 'Lưu kết quả', exact: true })).toBeDisabled();
  await page.getByLabel('Kết quả xử lý').fill('   '); await expect(page.getByRole('button', { name: 'Lưu kết quả', exact: true })).toBeDisabled();
  await page.getByLabel('Kết quả xử lý').fill('  Đã kiểm tra và xử lý  '); await page.getByRole('button', { name: 'Lưu kết quả', exact: true }).click();
  await expect(page.getByText(`Đã lưu báo cáo ${report().report_id}: Đã giải quyết.`, { exact: true })).toBeVisible();
  await expect(page.getByRole('article')).toContainText('Đã kiểm tra và xử lý');
  await expect(page.getByRole('article')).toContainText(report().content);
  await expect(page.getByRole('button', { name: 'Giải quyết', exact: true })).toHaveCount(0);
  expect(writes).toEqual([{ method: 'PATCH', path: `/api/v1/gyms/${gymA}/reports/${report().report_id}/investigate`, body: {} }, { method: 'PATCH', path: `/api/v1/gyms/${gymA}/reports/${report().report_id}/resolve`, body: { resolution_note: 'Đã kiểm tra và xử lý' } }]);
});

for (const status of ['PENDING', 'IN_PROGRESS']) test(`Admin rejects ${status}; Escape closes with focus and no mutation before submit`, async ({ page }) => {
  const { writes } = await setupReports(page, { rows: [report(1, gymA, status)] }); await page.goto(`/admin/gyms/${gymA}/reports`);
  const opener = page.getByRole('button', { name: 'Từ chối', exact: true }); await opener.focus(); await page.keyboard.press('Enter');
  await expect(page.getByLabel('Lý do từ chối')).toBeFocused(); await page.keyboard.press('Escape'); await expect(opener).toBeFocused(); expect(writes).toEqual([]);
  await opener.click(); await page.getByLabel('Lý do từ chối').fill('  Báo cáo trùng, đã đối chiếu  ');
  await page.getByRole('button', { name: 'Lưu kết quả', exact: true }).click();
  await expect(page.getByRole('article')).toContainText('Lý do từ chối: Báo cáo trùng, đã đối chiếu');
  expect(writes).toHaveLength(1); expect(writes[0].body).toEqual({ resolution_note: 'Báo cáo trùng, đã đối chiếu' });
});

test('A pending write locks filters/page/submit, cannot duplicate, and its completion never leaks into another Gym', async ({ page }) => {
  let release = () => {}; const gate = new Promise<void>(resolve => { release = resolve; });
  const { writes } = await setupReports(page, { rows: [report()], write: async (route, row) => { await gate; await route.fulfill({ json: { success: true, data: { ...row, status: 'IN_PROGRESS' } } }); } });
  await page.goto(`/admin/gyms/${gymA}/reports`); const button = page.getByRole('button', { name: 'Tiếp nhận', exact: true });
  await button.evaluate(node => { (node as HTMLButtonElement).click(); (node as HTMLButtonElement).click(); });
  await expect(page.getByRole('combobox', { name: 'Trạng thái báo cáo', exact: true })).toBeDisabled(); await expect(button).toBeDisabled();
  expect(writes).toHaveLength(1); await switchGym(page); release();
  await expect(reportsRegion(page)).toContainText('Gym 02:');
  await expect(page.getByText(`Đã lưu báo cáo ${report().report_id}: Đang xử lý.`, { exact: true })).toHaveCount(0);
  expect(writes.every(row => row.path.includes(gymA))).toBe(true);
});

for (const status of [-1, 409, 500]) test(`Write ${status} preserves note, requires a fresh read and never automatically retries the mutation`, async ({ page }) => {
  let error = status; const { writes } = await setupReports(page, { rows: [report(1, gymA, 'IN_PROGRESS')], write: async (route, row) => error ? fail(route, error) : route.fulfill({ json: { success: true, data: { ...row, status: 'RESOLVED' } } }) });
  await page.goto(`/admin/gyms/${gymA}/reports`); await page.getByRole('button', { name: 'Giải quyết', exact: true }).click(); await page.getByLabel('Kết quả xử lý').fill('Ghi chú cần giữ'); await page.getByRole('button', { name: 'Lưu kết quả', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Đọc lại báo cáo', exact: true })).toBeVisible(); await expect(page.getByLabel('Kết quả xử lý')).toHaveValue('Ghi chú cần giữ'); await expect(page.getByRole('button', { name: 'Lưu kết quả', exact: true })).toBeDisabled();
  expect(writes).toHaveLength(1); error = 0; await page.getByRole('button', { name: 'Đọc lại báo cáo', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Lưu kết quả', exact: true })).toBeEnabled(); expect(writes).toHaveLength(1);
});

test('Committed write with lost response reconciles to terminal state without resending', async ({ page }) => {
  const { writes } = await setupReports(page, { rows: [report(1, gymA, 'IN_PROGRESS')], write: async (route, row) => { row.status = 'RESOLVED'; row.resolution_note = 'Đã lưu thật'; await route.abort('failed'); } });
  await page.goto(`/admin/gyms/${gymA}/reports`); await page.getByRole('button', { name: 'Giải quyết', exact: true }).click(); await page.getByLabel('Kết quả xử lý').fill('Đã lưu thật'); await page.getByRole('button', { name: 'Lưu kết quả', exact: true }).click();
  await page.getByRole('button', { name: 'Đọc lại báo cáo', exact: true }).click();
  await expect(page.getByRole('article')).toContainText('Đã lưu thật'); await expect(page.getByRole('button', { name: 'Giải quyết', exact: true })).toHaveCount(0); expect(writes).toHaveLength(1);
});

for (const status of [401, 403]) test(`Write ${status} removes cached report/action even when auth still returns Admin`, async ({ page }) => {
  await setupReports(page, { rows: [report()], write: route => fail(route, status) }); await page.goto(`/admin/gyms/${gymA}/reports`);
  await page.getByRole('button', { name: 'Tiếp nhận', exact: true }).click(); await expect(page.getByRole('alert')).toBeVisible();
  await expect(reportsRegion(page)).toHaveCount(0); await expect(page.getByRole('article')).toHaveCount(0);
});

for (const status of [401, 403, 500]) test(`Report refetch ${status} blocks stale writes and handles access loss`, async ({ page }) => {
  let error = 0; await setupReports(page, { rows: [report()], readError: () => error }); await page.goto(`/admin/gyms/${gymA}/reports`);
  await expect(page.getByRole('button', { name: 'Tiếp nhận', exact: true })).toBeEnabled(); error = status; await page.getByRole('button', { name: 'Làm mới báo cáo', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Thử lại', exact: true })).toBeVisible();
  if (status === 500) { await expect(page.getByRole('button', { name: 'Tiếp nhận', exact: true })).toBeDisabled(); await expect(page.getByText('Làm mới thất bại. Dữ liệu cũ có thể đã thay đổi.', { exact: true })).toBeVisible(); }
  else await expect(reportsRegion(page)).toHaveCount(0);
});

test('Success followed by read failure keeps receipt and prevents another action until reconciliation', async ({ page }) => {
  let error = 0; const { writes } = await setupReports(page, { rows: [report()], readError: () => error, write: async (route, row) => { row.status = 'IN_PROGRESS'; error = 500; await route.fulfill({ json: { success: true, data: row } }); } });
  await page.goto(`/admin/gyms/${gymA}/reports`); await page.getByRole('button', { name: 'Tiếp nhận', exact: true }).click();
  await expect(page.getByText(`Đã lưu báo cáo ${report().report_id}: Đang xử lý.`, { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Đọc lại báo cáo', exact: true })).toBeDisabled(); expect(writes).toHaveLength(1);
  error = 0; await page.getByRole('button', { name: 'Thử lại', exact: true }).click(); await page.getByRole('button', { name: 'Đọc lại báo cáo', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Giải quyết', exact: true })).toBeEnabled(); expect(writes).toHaveLength(1);
});

test('Report page/empty recovery and photo failure remain private and accessible at four widths', async ({ page }) => {
  const long = report(1, gymA, 'IN_PROGRESS'); long.content = 'Nội dung dài '.repeat(50);
  await setupReports(page, { rows: [long], long: true });
  await page.route('**/reports/*/image', route => fail(route, 403)); await page.goto(`/admin/gyms/${gymA}/reports`);
  await expect(page.getByText('Không tải được ảnh.', { exact: false })).toBeVisible(); await page.getByRole('button', { name: 'Giải quyết', exact: true }).click();
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if ([375, 1440].includes(width)) expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
  }
  await page.screenshot({ path: '/tmp/multi-gym-r18-reports-desktop.png', fullPage: true }); await page.setViewportSize({ width: 375, height: 1000 }); await page.screenshot({ path: '/tmp/multi-gym-r18-reports-mobile.png', fullPage: true });
  await expect(page.getByRole('button', { name: /Tạo báo cáo|Xóa|Sửa nội dung|Mở lại|Thanh toán/ })).toHaveCount(0);
});
