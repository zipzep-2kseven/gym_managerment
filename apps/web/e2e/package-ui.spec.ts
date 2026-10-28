import { test, expect, type Page } from '@playwright/test';
const gymId = '10000000-0000-4000-8000-000000000001';
const gymB = '10000000-0000-4000-8000-000000000002';
const id = '20000000-0000-4000-8000-000000000001';
const item = { package_id: id, gym_id: gymId, package_name: 'Gói sức khỏe', description: 'Tập luyện mỗi ngày.',
  price: '999999999999.99', duration_days: 30, status: 'ACTIVE', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' };
const ok = (data: unknown) => ({ success: true, data });
const failed = (code: string, message: string, details: unknown = null) => ({ success: false, error: { code, message, details } });
const paged = (data: unknown[], page = 1, total = data.length) => ({ ...ok(data), pagination: {
  page, pageSize: 12, totalItems: total, totalPages: Math.ceil(total / 12), hasNextPage: page < Math.ceil(total / 12), hasPreviousPage: page > 1 } });
const setup = async (page: Page, role = 'GUEST', forced = false, assigned = true) => {
  await page.route('**/api/v1/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/auth/me')) return route.fulfill(role === 'GUEST' ? { status: 401, json: failed('UNAUTHENTICATED', 'Cần đăng nhập') } : { json: ok({
      user_id: 'actor', email: 'actor@example.test', roles: [role], status: 'ACTIVE', must_change_password: forced,
      profile: { full_name: 'Người dùng' }, active_gym_assignments: role === 'MANAGER' && assigned ? [{ gym_id: gymId, gym_name: 'Gym A', assignment_type: 'MANAGER' }] : [] }) });
    if (path.endsWith('/admin/gyms')) return route.fulfill({ json: paged([
      { gym_id: gymId, gym_name: 'Gym A', status: 'ACTIVE' }, { gym_id: gymB, gym_name: 'Gym B', status: 'INACTIVE' }]) });
    if (path.endsWith('/packages')) return route.fulfill({ json: paged([item]) });
    if (path.endsWith(`/packages/${id}`)) return route.fulfill({ json: ok(item) });
    return route.fulfill({ status: 404, json: failed('NOT_FOUND', 'Không tìm thấy') });
  });
};

test('Guest public list/detail displays exact decimal and honest checkout status', async ({ page }) => {
  await setup(page);
  await page.goto(`/gyms/${gymId}/packages`);
  await expect(page.getByText('999.999.999.999,99 VND')).toBeVisible();
  await page.getByRole('link', { name: 'Xem gói Gói sức khỏe' }).click();
  await expect(page.getByRole('heading', { name: 'Gói sức khỏe', level: 1 })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('Thanh toán mô phỏng để demo');
  await expect(page.getByRole('button', { name: /thanh toán/i })).toHaveCount(0);
  expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
});

test('Search, numeric sort, order and paging use allowlisted public query', async ({ page }) => {
  await setup(page);
  await page.route('**/api/v1/gyms/*/packages?**', route => route.fulfill({ json: paged([item], Number(new URL(route.request().url()).searchParams.get('page')), 25) }));
  await page.goto(`/gyms/${gymId}/packages?page=2&status=INACTIVE&sortBy=evil`);
  await expect(page.getByText('Trang 2 / 3 · 25 kết quả')).toBeVisible();
  await page.getByLabel('Tên hoặc mô tả gói tập').fill('Sức');
  const request = page.waitForRequest(r => r.url().includes('search=') && r.url().includes('/packages?'));
  await page.getByRole('button', { name: 'Tìm gói tập' }).click();
  const query = new URL((await request).url()).searchParams;
  expect(query.get('page')).toBe('1'); expect(query.get('status')).toBeNull(); expect(query.get('sortBy')).toBe('package_name');
  await page.getByLabel('Sắp xếp theo').selectOption('price');
  await page.getByLabel('Thứ tự').selectOption('desc');
  await expect(page.getByText('Trang 1 / 3 · 25 kết quả')).toBeVisible();
  const next = page.waitForRequest(r => r.url().includes('page=2') && r.url().includes('sortBy=price') && r.url().includes('sortOrder=desc'));
  await page.getByRole('button', { name: 'Trang sau' }).click(); await next;
});

test('Loading, network error, retry and empty catalog', async ({ page }) => {
  await setup(page); let release = () => {}; const gate = new Promise<void>(resolve => { release = resolve; }); let failing = true;
  await page.route('**/api/v1/gyms/*/packages?**', async route => { if (failing) { await gate; return route.abort(); } return route.fulfill({ json: paged([]) }); });
  await page.goto(`/gyms/${gymId}/packages`);
  await expect(page.getByRole('status', { name: 'Đang tải dữ liệu' })).toBeVisible(); release();
  await expect(page.getByRole('alert')).toBeVisible(); failing = false; await page.getByRole('button', { name: 'Thử lại' }).click();
  await expect(page.getByText('Chưa có gói tập phù hợp.')).toBeVisible();
});

test('Hidden package or wrong Gym 404 removes stale detail', async ({ page }) => {
  await setup(page);
  await page.route(`**/api/v1/gyms/${gymB}/packages/${id}`, route => route.fulfill({ status: 404, json: failed('NOT_FOUND', 'Không tìm thấy') }));
  await page.goto(`/gyms/${gymB}/packages/${id}`);
  await expect(page.getByRole('alert')).toContainText('tài nguyên không còn khả dụng');
  await expect(page.getByText('999.999.999.999,99 VND')).toHaveCount(0);
});

for (const role of ['GUEST', 'CUSTOMER', 'PT', 'MANAGER']) test(`${role} blocked from Admin catalog without private request`, async ({ page }) => {
  await setup(page, role); let calls = 0;
  await page.route('**/api/v1/gyms/*/management/packages?**', route => { calls++; return route.fulfill({ json: paged([item]) }); });
  await page.goto(`/admin/gyms/${gymB}/packages`);
  if (role === 'GUEST') await expect(page).toHaveURL(/\/login/);
  else await expect(page.getByRole('heading', { name: 'Không có quyền truy cập' })).toBeVisible();
  expect(calls).toBe(0);
});

test('Manager requires assignment and password change', async ({ page }) => {
  await setup(page, 'MANAGER', false, false); await page.goto('/manager/packages');
  await expect(page.getByRole('heading', { name: 'Chưa có phân công Gym' })).toBeVisible();
  await setup(page, 'MANAGER', true); await page.reload(); await expect(page).toHaveURL(/\/change-password/);
});

test('Manager create validates form, allowlisted decimal POST and duplicate submission', async ({ page }) => {
  await setup(page, 'MANAGER'); let posts = 0; let release = () => {}; const gate = new Promise<void>(r => { release = r; });
  await page.route(`**/api/v1/gyms/${gymId}/packages`, async route => {
    posts++; expect(route.request().postDataJSON()).toEqual({ package_name: 'Gói mới', duration_days: 90, price: '12.50', description: null });
    await gate; await route.fulfill({ status: 201, json: ok(item) });
  });
  await page.goto('/manager/packages'); await page.getByRole('button', { name: 'Tạo gói mới' }).click();
  await page.getByLabel('Tên gói tập', { exact: true }).fill('Gói mới'); await page.getByLabel('Thời hạn (ngày)').fill('90');
  for (const price of ['-1', '1e3', '12.123', '1,2', '1000000000000']) {
    await page.getByLabel('Giá (VND)').fill(price); await page.getByRole('button', { name: 'Tạo gói tập', exact: true }).click(); expect(posts).toBe(0);
  }
  await page.getByLabel('Giá (VND)').fill('00012.5'); await page.getByRole('button', { name: 'Tạo gói tập', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Đang lưu…' })).toBeDisabled(); release();
  await expect(page.getByRole('status')).toContainText('Gói tập đã được tạo');
  await expect(page.getByRole('button', { name: 'Tạo gói tập', exact: true })).toBeDisabled(); expect(posts).toBe(1);
});

test('Edit keeps snapshot after refetch and patches only changed fields including null description', async ({ page }) => {
  await setup(page, 'MANAGER'); const bodies: unknown[] = [];
  await page.route(`**/api/v1/gyms/${gymId}/packages/${id}`, route => { bodies.push(route.request().postDataJSON()); return route.fulfill({ json: ok(item) }); });
  await page.goto('/manager/packages'); await page.getByRole('button', { name: 'Sửa gói Gói sức khỏe' }).click();
  await page.getByLabel('Giá (VND)').fill('0'); await page.getByLabel('Mô tả', { exact: true }).fill('');
  await page.getByRole('button', { name: 'Lưu thay đổi' }).click(); await expect(page.getByRole('status')).toContainText('Thay đổi đã được lưu');
  expect(bodies).toEqual([{ price: '0.00', description: null }]);
  await page.getByLabel('Tên gói tập', { exact: true }).fill('Tên mới'); await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
  await expect(page.getByRole('status')).toContainText('Thay đổi đã được lưu'); expect(bodies[1]).toEqual({ package_name: 'Tên mới' });
});

test('Admin INACTIVE catalog uses scoped management endpoint and status confirmation', async ({ page }) => {
  await setup(page, 'ADMIN'); let active = false; let writes = 0;
  await page.route(`**/api/v1/gyms/${gymB}/management/packages?**`, route => route.fulfill({ json: paged(active && new URL(route.request().url()).searchParams.get('status') === 'INACTIVE' ? [] : [{ ...item, gym_id: gymB, status: active ? 'ACTIVE' : 'INACTIVE' }]) }));
  await page.route(`**/api/v1/gyms/${gymB}/packages/${id}/activate`, route => { writes++; expect(route.request().postData()).toBeNull(); active = true; return route.fulfill({ json: ok({ ...item, gym_id: gymB }) }); });
  await page.goto(`/admin/gyms/${gymB}/packages?status=INACTIVE`);
  await expect(page.getByRole('article').getByText('Ngừng bán', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Mở bán Gói sức khỏe' }).click(); await page.getByRole('button', { name: 'Hủy', exact: true }).click(); expect(writes).toBe(0);
  await page.getByRole('button', { name: 'Mở bán Gói sức khỏe' }).click(); await page.getByRole('button', { name: 'Xác nhận', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Đã mở bán gói' })).toBeVisible();
  await expect(page.getByText('Chưa có gói tập phù hợp.')).toBeVisible();
  await page.getByRole('combobox', { name: 'Trạng thái bán', exact: true }).selectOption('');
  await expect(page.getByRole('article').getByText('Đang bán', { exact: true })).toBeVisible(); expect(writes).toBe(1);
});

for (const status of [400, 403, 409]) test(`Write ${status} keeps form and shows server error`, async ({ page }) => {
  await setup(page, 'MANAGER');
  await page.route(`**/api/v1/gyms/${gymId}/packages/${id}`, route => route.fulfill({ status, json: failed('WRITE_ERROR', 'Không thể lưu gói tập.', [{ field: 'price', message: 'Kiểm tra giá.' }]) }));
  await page.goto('/manager/packages'); await page.getByRole('button', { name: 'Sửa gói Gói sức khỏe' }).click();
  await page.getByLabel('Giá (VND)').fill('100'); await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
  await expect(page.getByRole('alert')).toContainText('Không thể lưu gói tập'); await expect(page.getByLabel('Giá (VND)')).toHaveValue('100');
});

test('Revoked scope hides cached management records on retry', async ({ page }) => {
  await setup(page, 'MANAGER'); await page.goto('/manager/packages'); await expect(page.getByRole('article')).toBeVisible();
  await page.route('**/api/v1/gyms/*/management/packages?**', route => route.fulfill({ status: 403, json: failed('FORBIDDEN', 'Quyền đã thu hồi') }));
  await page.getByLabel('Trạng thái bán').selectOption('INACTIVE'); await expect(page.getByRole('alert')).toBeVisible(); await expect(page.getByRole('article')).toHaveCount(0);
});

for (const width of [375, 768, 1024, 1440]) test(`Responsive catalog and form ${width}px with keyboard focus`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 }); await setup(page, 'MANAGER'); await page.goto('/manager/packages');
  await page.getByRole('button', { name: 'Tạo gói mới' }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByLabel('Tên gói tập', { exact: true }).focus();
  expect(await page.getByLabel('Tên gói tập', { exact: true }).evaluate(el => getComputedStyle(el).outlineStyle)).toBe('solid');
  await page.screenshot({ path: `/tmp/pkg02-${width}.png`, fullPage: true });
});

test('Manager route ignores attempted Gym substitution from URL', async ({ page }) => {
  await setup(page, 'MANAGER');
  const requests: string[] = [];
  await page.route('**/api/v1/gyms/*/management/packages?**', route => { requests.push(route.request().url()); return route.fulfill({ json: paged([item]) }); });
  await page.goto(`/manager/packages?gymId=${gymB}`); await expect(page.getByRole('article')).toBeVisible();
  expect(requests.length).toBeGreaterThan(0); expect(requests.every(url => new URL(url).pathname.includes(gymId))).toBe(true);
});

test('Expired private session 401 returns to login', async ({ page }) => {
  await setup(page, 'MANAGER'); await page.goto('/manager/packages');
  await expect(page.getByRole('article')).toBeVisible();
  await page.route('**/api/v1/gyms/*/management/packages?**', route => route.fulfill({ status: 401, json: failed('UNAUTHENTICATED', 'Phiên hết hạn') }));
  await page.route('**/api/v1/auth/me', route => route.fulfill({ status: 401, json: failed('UNAUTHENTICATED', 'Phiên hết hạn') }));
  await page.getByLabel('Trạng thái bán').selectOption('INACTIVE');
  await expect(page).toHaveURL(/\/login/);
});

test('Form blocks empty name, fractional/zero/overflow duration without POST', async ({ page }) => {
  await setup(page, 'MANAGER'); let posts = 0;
  await page.route(`**/api/v1/gyms/${gymId}/packages`, route => { posts++; return route.fulfill({ json: ok(item) }); });
  await page.goto('/manager/packages'); await page.getByRole('button', { name: 'Tạo gói mới' }).click();
  await page.getByLabel('Giá (VND)').fill('0'); await page.getByLabel('Tên gói tập', { exact: true }).fill('   ');
  await page.getByLabel('Thời hạn (ngày)').fill('30'); await page.getByRole('button', { name: 'Tạo gói tập', exact: true }).click(); expect(posts).toBe(0);
  await page.getByLabel('Tên gói tập', { exact: true }).fill('Hợp lệ');
  for (const value of ['0', '1.5', '2147483648']) {
    await page.getByLabel('Thời hạn (ngày)').fill(value); await page.getByRole('button', { name: 'Tạo gói tập', exact: true }).click(); expect(posts).toBe(0);
  }
});
