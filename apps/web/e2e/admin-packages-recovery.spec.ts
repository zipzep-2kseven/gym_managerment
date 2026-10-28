import { test, expect } from '@playwright/test';
import { catalog, editFirst, fail, gymA, gymB, ok, plan, setupPackages, type PackageOptions } from './admin-package-fixtures';

for (const status of [400, 404, 409, 500, -1]) test(`Edit ${status} preserves draft and requires appropriate recovery`, async ({ page }) => {
  let failure = status;
  const { writes } = await setupPackages(page, { rows: [plan()], write: async (route, row) => {
    if (failure) return fail(route, failure); Object.assign(row!, route.request().postDataJSON()); return route.fulfill({ json: ok(row) });
  } });
  await page.goto(`/admin/gyms/${gymA}/packages`); await editFirst(page); await page.getByLabel('Giá (VND)').fill('123');
  await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click(); await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByLabel('Giá (VND)')).toHaveValue('123'); expect(writes).toHaveLength(1);
  if (status !== 400) {
    await expect(page.getByRole('button', { name: 'Đóng biểu mẫu', exact: true })).toBeDisabled(); await page.keyboard.press('Escape');
    await expect(page.getByRole('form', { name: 'Sửa gói Gói 01', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Đọc lại kết quả', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Dữ liệu hiện tại' })).toBeVisible();
    await expect(page.getByLabel('Giá (VND)')).toHaveValue('123');
    await page.getByRole('button', { name: 'Dùng dữ liệu vừa đọc', exact: true }).click(); await expect(page.getByLabel('Giá (VND)')).toHaveValue('999999999999.99');
  }
  failure = 0; await page.getByLabel('Giá (VND)').fill('456'); await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Thay đổi đã được lưu.' })).toBeVisible(); expect(writes).toHaveLength(2);
});

test('Committed/lost update reads same ID across internal pages without display status', async ({ page }) => {
  const rows = Array.from({ length: 102 }, (_, index) => plan(index + 1)); rows.forEach(row => { row.status = 'ACTIVE'; });
  const { reads, writes } = await setupPackages(page, { rows, write: async (route, row) => {
    Object.assign(row!, route.request().postDataJSON()); rows.push(rows.shift()!); return route.abort('failed');
  } });
  await page.goto(`/admin/gyms/${gymA}/packages?status=ACTIVE`); await editFirst(page); await page.getByLabel('Giá (VND)').fill('42');
  await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Chưa xác định được kết quả' })).toBeVisible();
  await page.getByRole('button', { name: 'Đọc lại kết quả', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Kiểm tra kết quả gói tập' })).toContainText('42,00 VND');
  expect(reads.some(url => url.searchParams.get('pageSize') === '100' && url.searchParams.get('page') === '2' && !url.searchParams.has('status'))).toBe(true);
  await page.getByRole('button', { name: 'Dùng dữ liệu vừa đọc', exact: true }).click(); await expect(page.getByLabel('Giá (VND)')).toHaveValue('42.00'); expect(writes).toHaveLength(1);
});

test('Lost status result checks inactive row privately and never repeats PATCH automatically', async ({ page }) => {
  const { writes } = await setupPackages(page, { rows: [plan()], write: async (route, row) => { row!.status = 'INACTIVE'; return route.abort('failed'); } });
  await page.goto(`/admin/gyms/${gymA}/packages?status=ACTIVE`); await page.getByRole('button', { name: 'Ngừng bán Gói 01', exact: true }).click();
  await page.getByRole('button', { name: 'Xác nhận', exact: true }).click(); await expect(page.getByRole('button', { name: 'Hủy', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Đọc lại kết quả', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Kiểm tra kết quả gói tập' }).getByText('Ngừng bán', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Dùng dữ liệu vừa đọc', exact: true }).click(); await expect(catalog(page).getByText('Chưa có gói tập phù hợp.')).toBeVisible(); expect(writes).toHaveLength(1);
});

for (const missing of [false, true]) test(`Failed or missing read-back retains lock (${missing})`, async ({ page }) => {
  let readFailure = 0; const rows = [plan()];
  await setupPackages(page, { rows, readError: () => readFailure, write: route => fail(route, 409) });
  await page.goto(`/admin/gyms/${gymA}/packages`); await editFirst(page); await page.getByLabel('Giá (VND)').fill('1');
  await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Chưa xác định được kết quả' })).toBeVisible();
  if (missing) rows.splice(0); else readFailure = 500;
  await page.getByRole('button', { name: 'Đọc lại kết quả', exact: true }).click(); await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Dùng dữ liệu vừa đọc', exact: true })).toHaveCount(0); await expect(page.getByRole('button', { name: 'Đóng biểu mẫu', exact: true })).toBeDisabled();
});

test('Lost create response never infers identity from duplicate name and requires explicit catalog review', async ({ page }) => {
  const { writes } = await setupPackages(page, { write: route => route.abort('failed') });
  await page.goto(`/admin/gyms/${gymA}/packages`); await page.getByRole('button', { name: 'Tạo gói mới', exact: true }).click();
  await page.getByLabel('Tên gói tập', { exact: true }).fill('Gói 01'); await page.getByLabel('Thời hạn (ngày)').fill('30'); await page.getByLabel('Giá (VND)').fill('999999999999.99');
  await page.getByRole('button', { name: 'Tạo gói tập', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Chưa xác định được kết quả' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Đóng biểu mẫu', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Đọc lại kết quả', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Đóng sau khi kiểm tra catalog' })).toBeDisabled(); await expect(page.getByRole('status').filter({ hasText: 'Gói tập đã được tạo.' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Trang sau', exact: true }).click(); await expect(page.getByText('Trang 2 / 3 · 25 kết quả')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tạo gói mới', exact: true })).toBeDisabled(); await expect(page.getByRole('button', { name: 'Tạo gói tập', exact: true })).toBeDisabled();
  await page.getByRole('checkbox').check(); await page.getByRole('button', { name: 'Đóng sau khi kiểm tra catalog' }).click(); expect(writes).toHaveLength(1);
  await expect(page.getByRole('form', { name: 'Tạo gói tập', exact: true })).toHaveCount(0); await expect(page.getByRole('button', { name: 'Tạo gói mới', exact: true })).toBeEnabled();
});

test('200 status receipt survives refetch failure, then recovery restores catalog', async ({ page }) => {
  let readFailure = 0;
  const { writes } = await setupPackages(page, { rows: [plan()], readError: () => readFailure,
    write: async (route, row) => { row!.status = 'INACTIVE'; readFailure = 500; return route.fulfill({ json: ok(row) }); } });
  await page.goto(`/admin/gyms/${gymA}/packages?status=ACTIVE`); await page.getByRole('button', { name: 'Ngừng bán Gói 01', exact: true }).click(); await page.getByRole('button', { name: 'Xác nhận', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Đã ngừng bán gói Gói 01.' })).toBeVisible(); await expect(page.getByRole('heading', { name: 'Đã lưu, cần đọc lại catalog' })).toBeVisible();
  readFailure = 0; await page.getByRole('button', { name: 'Đọc lại kết quả', exact: true }).click(); await page.getByRole('button', { name: 'Dùng dữ liệu vừa đọc', exact: true }).click();
  await expect(catalog(page).getByText('Chưa có gói tập phù hợp.')).toBeVisible(); expect(writes).toHaveLength(1);
});

test('Initial failure/empty and cached failure keep freshness honest and block writes', async ({ page }) => {
  let failure = 500; const { rows } = await setupPackages(page, { rows: [plan()], readError: () => failure });
  await page.goto(`/admin/gyms/${gymA}/packages`); await expect(page.getByText('Không thể tải dữ liệu.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tạo gói mới', exact: true })).toBeDisabled(); failure = 0; await page.getByRole('button', { name: 'Thử lại', exact: true }).click(); await editFirst(page);
  await page.evaluate(() => { history.pushState({}, '', location.pathname + '?sortBy=created_at'); dispatchEvent(new PopStateEvent('popstate')); });
  await expect(catalog(page).getByRole('heading', { name: 'Gói 01', exact: true })).toBeVisible();
  failure = 500; await page.evaluate(() => { history.pushState({}, '', location.pathname); dispatchEvent(new PopStateEvent('popstate')); });
  await expect(page.getByText('Làm mới thất bại. Dữ liệu cũ có thể đã thay đổi.', { exact: true })).toBeVisible(); await expect(page.getByLabel('Tên gói tập', { exact: true })).toHaveValue('Gói 01');
  await expect(page.getByRole('button', { name: 'Lưu thay đổi', exact: true })).toBeDisabled(); failure = 0; await page.getByRole('button', { name: 'Thử lại', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Lưu thay đổi', exact: true })).toBeEnabled(); await page.getByRole('button', { name: 'Đóng biểu mẫu' }).click();
  rows.splice(0); await page.evaluate(() => { history.pushState({}, '', location.pathname + '?sortBy=created_at'); dispatchEvent(new PopStateEvent('popstate')); });
  await expect(catalog(page).getByText('Chưa có gói tập phù hợp.')).toBeVisible();
});

for (const status of [401, 403]) test(`Write ${status} clears private data and checks current session`, async ({ page }) => {
  const options: PackageOptions = { rows: [plan()], write: route => fail(route, status) }; await setupPackages(page, options);
  await page.goto(`/admin/gyms/${gymA}/packages`); await editFirst(page); await page.getByLabel('Giá (VND)').fill('10');
  if (status === 401) options.guest = true; else options.role = 'CUSTOMER';
  await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
  if (status === 401) await expect(page).toHaveURL(/\/login/); else await expect(page.getByRole('heading', { name: 'Không có quyền truy cập' })).toBeVisible();
  await expect(page.getByRole('form', { name: 'Sửa gói Gói 01', exact: true })).toHaveCount(0); await expect(page.getByText('999.999.999.999,99 VND', { exact: true })).toHaveCount(0);
});

test('Actor refresh resets drafts, outcomes and private query scope', async ({ page }) => {
  const options: PackageOptions = { rows: [plan()], write: route => fail(route, 403) }; const { reads } = await setupPackages(page, options);
  await page.goto(`/admin/gyms/${gymA}/packages`); await editFirst(page); await page.getByLabel('Giá (VND)').fill('1'); options.actor = 'new-admin';
  await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Tạo gói mới', exact: true })).toBeEnabled(); await expect(page.getByRole('form', { name: 'Sửa gói Gói 01', exact: true })).toHaveCount(0);
  expect(reads.filter(url => url.pathname.includes('/management/packages')).length).toBeGreaterThanOrEqual(2);
  await editFirst(page); await expect(page.getByLabel('Giá (VND)')).toHaveValue('999999999999.99');
});

test('Late write from Gym A cannot put receipt or draft into Gym B', async ({ page }) => {
  let release = () => {}; const gate = new Promise<void>(resolve => { release = resolve; });
  await setupPackages(page, { rows: [plan(), plan(2, gymB)], write: async (route, row) => { await gate; Object.assign(row!, route.request().postDataJSON()); return route.fulfill({ json: ok(row) }); } });
  await page.goto(`/admin/gyms/${gymA}/packages`); await editFirst(page); await page.getByLabel('Giá (VND)').fill('1'); await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
  await page.evaluate(path => { history.pushState({}, '', path); dispatchEvent(new PopStateEvent('popstate')); }, `/admin/gyms/${gymB}/packages`);
  await expect(page.getByText('Gym B · Gym đang hoạt động')).toBeVisible(); release();
  await expect(catalog(page).getByRole('heading', { name: 'Gói 02', exact: true })).toBeVisible(); await expect(page.getByRole('status').filter({ hasText: 'Thay đổi đã được lưu.' })).toHaveCount(0);
  await expect(page.getByRole('form', { name: 'Sửa gói Gói 01', exact: true })).toHaveCount(0);
});

for (const role of ['GUEST', 'CUSTOMER', 'PT', 'MANAGER']) test(`${role} cannot call Admin private catalog`, async ({ page }) => {
  const { reads, writes } = await setupPackages(page, { role, guest: role === 'GUEST' }); await page.goto(`/admin/gyms/${gymA}/packages`);
  if (role === 'GUEST') await expect(page).toHaveURL(/\/login/); else await expect(page.getByRole('heading', { name: 'Không có quyền truy cập' })).toBeVisible();
  expect(reads.filter(url => url.pathname.includes('/management/packages'))).toEqual([]); expect(writes).toEqual([]);
});

test('Password gate, invalid Gym and missing Gym do not request package catalog', async ({ page }) => {
  let contextFailure = 0; const options: PackageOptions = { forced: true, gymError: () => contextFailure }; const { reads } = await setupPackages(page, options);
  await page.goto(`/admin/gyms/${gymA}/packages`); await expect(page).toHaveURL(/\/change-password/); options.forced = false;
  await page.goto('/admin/gyms/invalid/packages'); await expect(page.getByText('Mã Gym không hợp lệ.')).toBeVisible(); contextFailure = 404;
  await page.goto(`/admin/gyms/${gymB}/packages`); await expect(page.getByRole('alert')).toBeVisible(); expect(reads.filter(url => url.pathname.includes('/management/packages'))).toEqual([]);
});

test('Pending catalog read shows loading feedback and prevents writes', async ({ page }) => {
  let release = () => {}; const gate = new Promise<void>(resolve => { release = resolve; });
  const { writes } = await setupPackages(page, { read: async (route, url) => { await gate; return route.fulfill({ json: { ...ok([plan()]), pagination: { page: Number(url.searchParams.get('page')), pageSize: 12, totalItems: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false } } }); } });
  await page.goto(`/admin/gyms/${gymA}/packages`); await expect(page.getByRole('status').filter({ hasText: 'Đang tải dữ liệu…' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tạo gói mới', exact: true })).toBeDisabled(); release();
  await expect(page.getByRole('button', { name: 'Tạo gói mới', exact: true })).toBeEnabled(); expect(writes).toHaveLength(0);
});

for (const status of [401, 403]) test(`Cached GET ${status} removes content and draft before session guard`, async ({ page }) => {
  let failure = 0; const options: PackageOptions = { rows: [plan()], readError: () => failure };
  await setupPackages(page, options); await page.goto(`/admin/gyms/${gymA}/packages`); await editFirst(page);
  await page.evaluate(() => { history.pushState({}, '', location.pathname + '?sortBy=created_at'); dispatchEvent(new PopStateEvent('popstate')); });
  await expect(catalog(page).getByRole('heading', { name: 'Gói 01', exact: true })).toBeVisible();
  failure = status; if (status === 401) options.guest = true; else options.role = 'PT';
  await page.evaluate(() => { history.pushState({}, '', location.pathname); dispatchEvent(new PopStateEvent('popstate')); });
  if (status === 401) await expect(page).toHaveURL(/\/login/); else await expect(page.getByRole('heading', { name: 'Không có quyền truy cập' })).toBeVisible();
  await expect(page.getByRole('form', { name: 'Sửa gói Gói 01', exact: true })).toHaveCount(0); await expect(page.getByText('999.999.999.999,99 VND', { exact: true })).toHaveCount(0);
});

test('Late GET is aborted on Gym change and cannot overwrite the new catalog', async ({ page }) => {
  let release = () => {}; const gate = new Promise<void>(resolve => { release = resolve; }); const aborted: string[] = [];
  page.on('requestfailed', request => { if (request.url().includes(`${gymA}/management/packages`)) aborted.push(request.url()); });
  await setupPackages(page, { read: async (route, url) => {
    if (url.pathname.includes(gymA)) await gate;
    return route.fulfill({ json: { ...ok([plan(url.pathname.includes(gymA) ? 1 : 2, url.pathname.includes(gymA) ? gymA : gymB)]), pagination: { page: 1, pageSize: 12, totalItems: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false } } });
  } });
  await page.goto(`/admin/gyms/${gymA}/packages`); await expect(page.getByRole('status').filter({ hasText: 'Đang tải dữ liệu…' })).toBeVisible();
  await page.evaluate(path => { history.pushState({}, '', path); dispatchEvent(new PopStateEvent('popstate')); }, `/admin/gyms/${gymB}/packages`);
  await expect(catalog(page).getByRole('heading', { name: 'Gói 02', exact: true })).toBeVisible(); release();
  await expect(catalog(page).getByRole('heading', { name: 'Gói 01', exact: true })).toHaveCount(0); expect(aborted.length).toBeGreaterThan(0);
});
