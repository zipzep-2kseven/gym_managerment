import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { setupReports, gymA } from './admin-report-fixtures';

test('System menu selects a Gym with server paging/filters, literal search and URL history without report fan-out', async ({ page }) => {
  const { reads, writes } = await setupReports(page);
  await page.goto('/admin/reports');
  await expect(page.getByRole('heading', { name: 'Chọn Gym để xem báo cáo sự cố', exact: true })).toBeFocused();
  await expect(page.locator('aside a[aria-current=page]')).toHaveAttribute('href', '/admin/reports');
  await expect(page.getByText('15 Gym phù hợp', { exact: true })).toBeVisible();
  await expect(page.locator('main').getByRole('link', { name: /^Xem báo cáo sự cố tại / })).toHaveCount(12);
  await page.getByRole('button', { name: 'Trang sau', exact: true }).click();
  await expect(page).toHaveURL(/page=2/); await expect(page.locator('main').getByRole('link', { name: /^Xem báo cáo sự cố tại / })).toHaveCount(3);
  await page.reload(); await expect(page.getByText('Trang 2 / 2 · 15 kết quả', { exact: true })).toBeVisible();
  await page.getByLabel('Tên hoặc địa chỉ Gym', { exact: true }).fill('%_\\'); await page.keyboard.press('Enter');
  await expect(page.getByText('1 Gym phù hợp', { exact: true })).toBeVisible();
  expect(reads.some(url => url.searchParams.get('search') === '%_\\' && url.searchParams.get('page') === '1')).toBe(true);
  await page.goBack(); await expect(page.getByText('Trang 2 / 2 · 15 kết quả', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Tên hoặc địa chỉ Gym', { exact: true })).toHaveValue('');
  await page.getByRole('combobox', { name: 'Trạng thái Gym', exact: true }).selectOption('INACTIVE');
  await expect(page.getByText('7 Gym phù hợp', { exact: true })).toBeVisible();
  await expect(page.getByText('Cơ sở đã ngừng hoạt động; vẫn có thể xem báo cáo lịch sử.', { exact: true })).toHaveCount(7);
  expect(reads.every(url => url.pathname.endsWith('/admin/gyms'))).toBe(true); expect(writes).toEqual([]);
  await page.locator('main').getByRole('link', { name: 'Xem báo cáo sự cố tại Gym 02', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Cơ sở đang chọn' })).toContainText('Gym 02');
  await expect(page.getByText('báo cáo lịch sử vẫn được tra cứu', { exact: false })).toBeVisible();
  await expect(page.getByRole('article')).toContainText('Gym 02:');
  await page.goBack(); await expect(page.getByRole('combobox', { name: 'Trạng thái Gym', exact: true })).toHaveValue('INACTIVE');
  const selector = reads.filter(url => url.pathname.endsWith('/admin/gyms') && url.searchParams.get('pageSize') === '12');
  expect(selector.every(url => url.searchParams.get('sortBy') === 'gym_name' && url.searchParams.get('sortOrder') === 'asc')).toBe(true);
});

test('Invalid selector query normalizes and out-of-range page recovers from fresh Gym totals', async ({ page }) => {
  const { reads } = await setupReports(page);
  await page.goto('/admin/reports?page=-1&status=PENDING&sortBy=report_status&pageSize=1&unknown=x');
  await expect(page).toHaveURL(/page=1&sortBy=gym_name$/);
  await expect(page.getByText('15 Gym phù hợp', { exact: true })).toBeVisible();
  expect(reads.every(url => !url.searchParams.has('unknown') && !url.searchParams.has('status'))).toBe(true);
  await page.goto('/admin/reports?page=5');
  await expect(page).toHaveURL(/page=2$/);
  await expect(page.getByText('Trang trước không còn dữ liệu; đã chuyển về trang 2.', { exact: true })).toBeVisible();
  // Development StrictMode may abort the first mount's GET and start a second.
  expect(reads.filter(url => url.searchParams.get('page') === '5').length).toBeLessThanOrEqual(2);
  expect(reads.at(-1)?.searchParams.get('page')).toBe('2');
});

test('Empty Gym selector keeps filters/reload and differs from an empty report list', async ({ page }) => {
  const { reads } = await setupReports(page, { emptyGyms: true });
  await page.goto('/admin/reports?page=2'); await expect(page).toHaveURL(/page=1$/);
  await expect(page.getByText('0 Gym phù hợp', { exact: true })).toBeVisible();
  await expect(page.getByText('Không có Gym phù hợp.', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Tên hoặc địa chỉ Gym', { exact: true })).toBeEnabled();
  expect(reads.every(url => url.pathname.endsWith('/admin/gyms'))).toBe(true);
});

for (const status of [-1, 400, 404, 500]) test(`Selector read ${status} has deliberate retry, no private report fallback and keyboard focus recovery`, async ({ page }) => {
  let error = status; const { reads } = await setupReports(page, { gymError: () => error });
  await page.goto('/admin/reports');
  await expect(page.getByText('Không thể tải dữ liệu.', { exact: true })).toBeVisible();
  error = 0; await page.getByRole('button', { name: 'Thử lại', exact: true }).focus(); await page.keyboard.press('Enter');
  await expect(page.getByText('15 Gym phù hợp', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tải lại danh sách Gym', exact: true })).toBeFocused();
  expect(reads.every(url => url.pathname.endsWith('/admin/gyms'))).toBe(true);
});

for (const status of [401, 403, 500]) test(`Selector refetch ${status} handles cached data and current authority`, async ({ page }) => {
  let error = 0; const { writes } = await setupReports(page, { gymError: () => error });
  await page.goto('/admin/reports'); await expect(page.getByText('15 Gym phù hợp', { exact: true })).toBeVisible();
  error = status; await page.getByRole('button', { name: 'Tải lại danh sách Gym', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Thử lại', exact: true })).toBeVisible();
  await expect(page.locator('main').getByRole('link', { name: /^Xem báo cáo sự cố tại / })).toHaveCount(0);
  if (status === 500) await expect(page.getByText('Làm mới thất bại. Dữ liệu cũ có thể đã thay đổi.', { exact: true })).toBeVisible();
  else await expect(page.getByText('15 Gym phù hợp', { exact: true })).toHaveCount(0);
  expect(writes).toEqual([]);
});

for (const role of ['CUSTOMER', 'PT', 'MANAGER']) test(`${role} cannot open the Admin report selector or destination`, async ({ page }) => {
  const { reads } = await setupReports(page, { role });
  for (const path of ['/admin/reports', `/admin/gyms/${gymA}/reports`]) {
    await page.goto(path); await expect(page.getByRole('heading', { name: 'Không có quyền truy cập', exact: true })).toBeVisible();
  }
  expect(reads).toEqual([]);
});

test('Guest, password-gated and suspended actors never query the selector', async ({ page }) => {
  const options = { guest: true, mustChange: false, accountStatus: 'ACTIVE' }; const { reads } = await setupReports(page, options);
  await page.goto('/admin/reports'); await expect(page).toHaveURL(/\/login$/);
  options.guest = false; options.mustChange = true;
  await page.goto('/admin/reports'); await expect(page).toHaveURL(/\/change-password$/);
  options.mustChange = false; options.accountStatus = 'SUSPENDED';
  await page.goto('/admin/reports'); await expect(page.getByTestId('account-deactivated')).toBeVisible(); expect(reads).toEqual([]);
});

test('Selector long names/addresses, keyboard links and mobile drawer pass responsive/axe checks', async ({ page }) => {
  await setupReports(page, { long: true }); await page.goto('/admin/reports');
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if ([375, 1440].includes(width)) expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
  }
  await page.screenshot({ path: '/tmp/multi-gym-r18-report-entry-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 375, height: 1000 }); await page.screenshot({ path: '/tmp/multi-gym-r18-report-entry-mobile.png', fullPage: true });
  const link = page.locator('main').getByRole('link', { name: /^Xem báo cáo sự cố tại / }).first();
  await link.focus(); await page.keyboard.press('Enter'); await expect(page).toHaveURL(new RegExp(`${gymA}/reports$`));
  await expect(page.getByRole('heading', { name: 'Báo cáo sự cố tại Gym', exact: true })).toBeFocused();
});
