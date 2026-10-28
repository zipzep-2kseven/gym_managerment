import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { catalog, editFirst, gymA, gymB, ok, plan, setupPackages } from './admin-package-fixtures';

test('Inactive Gym context, decimal, nullable description, totals and URL allowlist', async ({ page }) => {
  const { reads, writes } = await setupPackages(page);
  await page.goto(`/admin/gyms/${gymA}/packages?gymId=${gymB}&page=-1&status=evil&sortBy=evil&sortOrder=evil`);
  await expect(catalog(page).getByText('999.999.999.999,99 VND', { exact: true })).toBeVisible();
  await expect(catalog(page).getByText('0,00 VND', { exact: true })).toHaveCount(11);
  await expect(page.getByText('Gym A · Gym ngừng hoạt động')).toBeVisible();
  await expect(catalog(page).getByText('Chưa có mô tả cho gói tập này.')).toBeVisible();
  await expect(page.getByText('Trang 1 / 3 · 25 kết quả')).toBeVisible();
  await expect(page).toHaveURL(/packages\?page=1&sortBy=package_name&sortOrder=asc$/);
  expect(reads.filter(url => url.pathname.includes('/packages')).every(url => url.pathname.includes(gymA) && url.searchParams.get('pageSize') === '12')).toBe(true);
  expect(reads.some(url => url.pathname.endsWith('/packages') && !url.pathname.includes('/management/'))).toBe(false);
  expect(writes).toEqual([]);
});

test('Search/sort/status reset page, Back restores URL and invalid last page recovers', async ({ page }) => {
  await setupPackages(page); await page.goto(`/admin/gyms/${gymA}/packages?page=3`);
  await expect(page.getByText('Trang 3 / 3 · 25 kết quả')).toBeVisible();
  await page.getByRole('combobox', { name: 'Trạng thái bán', exact: true }).selectOption('INACTIVE');
  await expect(page.getByText('Trang 1 / 1 · 12 kết quả')).toBeVisible();
  await page.goBack(); await expect(page.getByText('Trang 3 / 3 · 25 kết quả')).toBeVisible();
  await page.getByLabel('Tên hoặc mô tả gói tập').fill('  Gói 02  '); await page.getByRole('button', { name: 'Tìm gói tập', exact: true }).click();
  await expect(page.getByText('Trang 1 / 1 · 1 kết quả')).toBeVisible();
  await page.getByRole('combobox', { name: 'Sắp xếp theo', exact: true }).selectOption('price');
  await page.getByRole('combobox', { name: 'Thứ tự', exact: true }).selectOption('desc');
  await expect(page).toHaveURL(/sortBy=price&sortOrder=desc&search=G%C3%B3i\+02/);
  await page.goto(`/admin/gyms/${gymA}/packages?page=999`);
  await expect(page.getByText('Trang 3 / 3 · 25 kết quả')).toBeVisible();
});

test('Create validates fields, normalizes decimal, locks duplicate and persists receipt after refresh failure', async ({ page }) => {
  let readFailure = 0, release = () => {}; const gate = new Promise<void>(resolve => { release = resolve; });
  const { writes } = await setupPackages(page, { readError: () => readFailure, write: async route => { await gate; readFailure = 500; return route.fulfill({ status: 201, json: ok({ ...plan(26), ...route.request().postDataJSON() }) }); } });
  await page.goto(`/admin/gyms/${gymA}/packages`); await page.getByRole('button', { name: 'Tạo gói mới', exact: true }).click();
  await expect(page.getByLabel('Tên gói tập', { exact: true })).toBeFocused();
  await page.getByLabel('Tên gói tập', { exact: true }).fill('   '); await page.getByLabel('Thời hạn (ngày)').fill('30'); await page.getByLabel('Giá (VND)').fill('0');
  await page.getByRole('button', { name: 'Tạo gói tập', exact: true }).click(); expect(writes).toHaveLength(0);
  await page.getByLabel('Tên gói tập', { exact: true }).fill('  Gói mới  ');
  for (const value of ['0', '1.5', '2147483648']) { await page.getByLabel('Thời hạn (ngày)').fill(value); await page.getByRole('button', { name: 'Tạo gói tập', exact: true }).click(); expect(writes).toHaveLength(0); }
  await page.getByLabel('Thời hạn (ngày)').fill('2147483647');
  for (const value of ['-1', '1e3', '12.123', '1,2', '1000000000000']) { await page.getByLabel('Giá (VND)').fill(value); await page.getByRole('button', { name: 'Tạo gói tập', exact: true }).click(); expect(writes).toHaveLength(0); }
  await page.getByLabel('Giá (VND)').fill('00012.5'); await page.getByRole('button', { name: 'Tạo gói tập', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Đóng biểu mẫu', exact: true })).toBeDisabled();
  await page.getByRole('form', { name: 'Tạo gói tập', exact: true }).evaluate(form => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
  expect(writes).toHaveLength(1); expect(writes[0].body).toEqual({ package_name: 'Gói mới', duration_days: 2147483647, price: '12.50', description: null });
  release(); await expect(page.getByRole('status').filter({ hasText: 'Gói tập đã được tạo.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Đã lưu, cần đọc lại catalog' })).toBeVisible();
  await expect(page.getByLabel('Tên gói tập', { exact: true })).toHaveValue('  Gói mới  ');
  readFailure = 0; await page.getByRole('button', { name: 'Đọc lại kết quả', exact: true }).click();
  await page.getByRole('checkbox').check(); await page.getByRole('button', { name: 'Đóng sau khi kiểm tra catalog' }).click(); expect(writes).toHaveLength(1);
});

test('Edit keeps snapshot under refetch/concurrent change, sends partial/null and advances baseline', async ({ page }) => {
  const { rows, writes } = await setupPackages(page, { rows: [plan()] });
  await page.goto(`/admin/gyms/${gymA}/packages`); await editFirst(page);
  await expect(page.getByText('Nếu hai người sửa cùng trường', { exact: false })).toBeVisible();
  rows[0].package_name = 'Tên do người khác sửa'; rows[0].duration_days = 90;
  // A URL Back/POP refetch changes the list while the open form keeps its snapshot.
  await page.evaluate(path => { history.pushState({}, '', path); dispatchEvent(new PopStateEvent('popstate')); }, `/admin/gyms/${gymA}/packages?sortBy=created_at`);
  await expect(catalog(page).getByRole('heading', { name: 'Tên do người khác sửa', exact: true })).toBeVisible();
  await expect(page.getByLabel('Tên gói tập', { exact: true })).toHaveValue('Gói 01');
  await expect(page.getByLabel('Thời hạn (ngày)')).toHaveValue('30');
  await page.getByLabel('Giá (VND)').fill('0'); await page.getByLabel('Mô tả', { exact: true }).fill('');
  await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Thay đổi đã được lưu.' })).toBeVisible();
  expect(writes[0].body).toEqual({ price: '0.00', description: null }); expect(rows[0].package_name).toBe('Tên do người khác sửa'); expect(rows[0].duration_days).toBe(90);
  await page.getByLabel('Tên gói tập', { exact: true }).fill('Tên tôi sửa'); await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
  await expect(catalog(page).getByRole('heading', { name: 'Tên tôi sửa', exact: true })).toBeVisible();
  expect(writes[1].body).toEqual({ package_name: 'Tên tôi sửa' });
  await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click(); await expect(page.getByText('Không có thay đổi mới.')).toBeVisible(); expect(writes).toHaveLength(2);
});

test('Status cancellation/Escape restore focus; pending locks all actions; filtered row leaves catalog', async ({ page }) => {
  let release = () => {}; const gate = new Promise<void>(resolve => { release = resolve; });
  const { writes } = await setupPackages(page, { rows: [plan()], write: async (route, row) => { await gate; row!.status = 'INACTIVE'; return route.fulfill({ json: ok(row) }); } });
  await page.goto(`/admin/gyms/${gymA}/packages?status=ACTIVE`);
  const opener = page.getByRole('button', { name: 'Ngừng bán Gói 01', exact: true });
  await opener.click(); await expect(page.getByRole('button', { name: 'Xác nhận', exact: true })).toBeFocused(); await page.keyboard.press('Escape'); await expect(opener).toBeFocused(); expect(writes).toHaveLength(0);
  await opener.click(); await page.getByRole('button', { name: 'Hủy', exact: true }).click(); await expect(opener).toBeFocused(); expect(writes).toHaveLength(0);
  await opener.click(); await page.getByRole('button', { name: 'Xác nhận', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Hủy', exact: true })).toBeDisabled(); await expect(page.getByRole('combobox', { name: 'Trạng thái bán', exact: true })).toBeDisabled();
  await page.keyboard.press('Escape'); await expect(page.getByRole('region', { name: 'Xác nhận trạng thái gói' })).toBeVisible();
  release(); await expect(page.getByRole('status').filter({ hasText: 'Đã ngừng bán gói Gói 01.' })).toBeVisible();
  await expect(catalog(page).getByText('Chưa có gói tập phù hợp.')).toBeVisible(); expect(writes).toHaveLength(1);
});

test('Same status activation remains repeatable under concurrent change', async ({ page }) => {
  const { rows, writes } = await setupPackages(page, { rows: [plan(2)] });
  await page.goto(`/admin/gyms/${gymA}/packages`); await page.getByRole('button', { name: 'Mở bán Gói 02', exact: true }).click();
  rows[0].status = 'ACTIVE'; await page.getByRole('button', { name: 'Xác nhận', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Đã mở bán gói Gói 02.' })).toBeVisible(); expect(writes[0].body).toBeNull();
});

for (const width of [375, 768, 1024, 1440]) test(`Responsive catalog/editor ${width}px, keyboard and axe`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 }); const row = plan(); row.package_name = 'Tên_gói_rất_dài_'.repeat(15); row.description = 'Mô tả dài '.repeat(100);
  await setupPackages(page, { rows: [row, plan(2)] }); await page.goto(`/admin/gyms/${gymA}/packages`);
  await expect(page.getByText('Trang 1 / 1 · 2 kết quả')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: `Sửa gói ${row.package_name}`, exact: true }).click();
  await expect(page.getByLabel('Tên gói tập', { exact: true })).toBeFocused();
  expect(await page.getByLabel('Tên gói tập', { exact: true }).evaluate(element => getComputedStyle(element).outlineStyle)).toBe('solid');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  if (width === 375 || width === 1440) expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
  await page.screenshot({ path: `/tmp/multi-gym-r20-packages-stress-${width}.png`, fullPage: true });
  await page.keyboard.press('Escape'); await expect(page.getByRole('button', { name: `Sửa gói ${row.package_name}`, exact: true })).toBeFocused();
});

test('Mock previews use normal content only', async ({ page }) => {
  await setupPackages(page, { rows: [plan(), plan(2), plan(3)] }); await page.goto(`/admin/gyms/${gymA}/packages`);
  await expect(page.getByText('Trang 1 / 1 · 3 kết quả')).toBeVisible();
  await page.getByRole('heading', { name: 'Quản lý gói tập', exact: true }).evaluate(element => element.blur());
  for (const [width, size] of [[1440, 'desktop'], [375, 'mobile']] as const) { await page.setViewportSize({ width, height: 1000 }); await page.screenshot({ path: `/tmp/multi-gym-r20-packages-${size}.png`, fullPage: true }); }
});
