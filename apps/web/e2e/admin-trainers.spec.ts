import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const gymA = '10000000-0000-4000-8000-000000000001';
const gymB = '10000000-0000-4000-8000-000000000002';
const trainer = (index: number) => ({ gym_trainer_id: `20000000-0000-4000-8000-${String(index).padStart(12, '0')}`, gym_id: gymA, user_id: `30000000-0000-4000-8000-${String(index).padStart(12, '0')}`, specialization: index === 1 ? null : 'Sức mạnh ' + 'dài '.repeat(30), bio: null, experience_years: index === 1 ? null : 0, status: index % 2 ? 'ACTIVE' : 'INACTIVE', availability: 'NOT_ACCEPTING', joined_at: '2026-10-11T17:00:00Z', created_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-01T00:00:00Z' });
const gyms = [{ gym_id: gymA, gym_name: 'Gym A', status: 'ACTIVE', address: 'Địa chỉ A' }, { gym_id: gymB, gym_name: 'Gym B', status: 'INACTIVE', address: 'Địa chỉ B' }];
const setup = async (page: Page, options: { role?: string; error?: () => number } = {}) => {
  const reads: URL[] = [], writes: string[] = [];
  await page.route('**/api/v1/**', async route => {
    const url = new URL(route.request().url());
    if (!['GET', 'OPTIONS'].includes(route.request().method())) writes.push(url.pathname);
    if (url.pathname.endsWith('/auth/me')) return route.fulfill({ json: { success: true, data: { user_id: 'admin', roles: [options.role || 'ADMIN'], status: 'ACTIVE', must_change_password: false, profile: { full_name: 'Admin kiểm thử' }, active_gym_assignments: [] } } });
    if (url.pathname.endsWith('/admin/gyms')) return route.fulfill({ json: { success: true, data: gyms, pagination: { page: 1, pageSize: 100, totalItems: 2, totalPages: 1, hasNextPage: false, hasPreviousPage: false } } });
    if (url.pathname.endsWith('/management/trainers')) {
      reads.push(url);
      const error = options.error?.() || 0;
      if (error) return route.fulfill({ status: error, json: { success: false, error: { code: error === 403 ? 'INSUFFICIENT_ROLE' : 'SERVER_ERROR', message: 'Lỗi đọc roster' } } });
      const pageIndex = Number(url.searchParams.get('page'));
      const data = url.pathname.includes(gymB) ? [{ ...trainer(9), gym_id: gymB, specialization: 'PT riêng Gym B' }] : pageIndex === 2 ? [trainer(21)] : [trainer(1), trainer(2)];
      return route.fulfill({ json: { success: true, data, pagination: { page: pageIndex, pageSize: 20, totalItems: 21, totalPages: 2, hasNextPage: pageIndex === 1, hasPreviousPage: pageIndex > 1 } } });
    }
    return route.fulfill({ status: 404, json: { success: false, error: { code: 'NOT_FOUND', message: 'Không tìm thấy' } } });
  });
  return { reads, writes };
};

test('Admin enters scoped roster, uses metadata/filter/sort paging and keeps keyboard focus', async ({ page }) => {
  const { reads, writes } = await setup(page);
  await page.goto(`/admin/gyms/${gymA}`);
  await page.locator('main').getByRole('link', { name: 'Phân công PT', exact: true }).click();
  await expect(page.getByText('21 phân công phù hợp')).toBeVisible();
  await expect(page.locator('aside .management-nav-link.is-active')).toHaveCount(1);
  await page.getByRole('button', { name: 'Thu gọn menu bên', exact: true }).click();
  await expect(page.locator('aside').getByRole('link', { name: 'Phân công PT', exact: true }).locator('svg')).toBeVisible();
  await page.getByRole('button', { name: 'Mở rộng menu bên', exact: true }).click();
  expect(reads.at(-1)?.searchParams.get('pageSize')).toBe('20');
  expect(reads.at(-1)?.searchParams.get('sortBy')).toBe('created_at');
  expect(reads.at(-1)?.searchParams.get('sortOrder')).toBe('desc');
  await expect(page.getByText('Chưa cập nhật chuyên môn')).toBeVisible();
  await expect(page.getByText('Chưa cập nhật', { exact: true })).toBeVisible();
  await expect(page.getByText('0 năm', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Trang sau', exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  const input = page.getByLabel('Chuyên môn hoặc tiểu sử');
  const before = reads.length;
  await input.fill('literal%_');
  expect(reads.length).toBe(before);
  await input.press('Enter');
  await expect(input).toBeFocused();
  await expect.poll(() => reads.at(-1)?.searchParams.get('search')).toBe('literal%_');
  expect(reads.at(-1)?.searchParams.get('page')).toBe('1');
  await page.getByRole('combobox', { name: 'Trạng thái phân công', exact: true }).selectOption('INACTIVE');
  await expect.poll(() => reads.at(-1)?.searchParams.get('status')).toBe('INACTIVE');
  await page.getByRole('combobox', { name: 'Sắp xếp theo', exact: true }).selectOption('joined_at');
  await page.getByRole('combobox', { name: 'Thứ tự', exact: true }).selectOption('asc');
  await expect.poll(() => reads.at(-1)?.searchParams.get('sortOrder')).toBe('asc');
  expect(reads.at(-1)?.searchParams.get('sortBy')).toBe('joined_at');
  expect(writes).toEqual([]);
});

test('Switch Gym resets scope; INACTIVE Gym allows stopping PT without Manager profile controls', async ({ page }) => {
  const { reads, writes } = await setup(page);
  await page.goto(`/admin/gyms/${gymA}/trainers`);
  await expect(page.getByText('21 phân công phù hợp')).toBeVisible();
  await page.locator('aside').getByRole('link', { name: '← Danh sách cơ sở', exact: true }).click();
  await page.getByRole('link', { name: 'Sửa thông tin Gym B', exact: true }).click();
  await page.locator('main').getByRole('link', { name: 'Phân công PT', exact: true }).click();
  await expect(page.getByText('PT riêng Gym B')).toBeVisible();
  await expect(page.getByText('Chưa cập nhật chuyên môn')).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Cơ sở đang chọn' })).toContainText('Gym B');
  expect(reads.at(-1)?.pathname).toContain(gymB);
  await expect(page.getByRole('button', { name: /Cấp tài khoản|Kích hoạt PT|Lưu thay đổi/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Ngừng PT', exact: true })).toBeVisible();
  expect(writes).toEqual([]);
});

test('Initial and cached read failures remain distinct; keyboard retry recovers one roster', async ({ page }) => {
  let error = 500;
  await setup(page, { error: () => error });
  await page.goto(`/admin/gyms/${gymA}/trainers`);
  const list = page.getByRole('region', { name: 'Danh sách phân công PT' });
  await expect(list.getByText('Không thể tải dữ liệu.')).toBeVisible();
  error = 0;
  await list.getByRole('button', { name: 'Thử lại', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(list.getByText('21 phân công phù hợp')).toBeVisible();
  await expect(list.getByRole('button', { name: 'Làm mới danh sách', exact: true })).toBeFocused();
  error = 500;
  await list.getByRole('button', { name: 'Làm mới danh sách', exact: true }).click();
  await expect(list.getByText('Làm mới thất bại. Dữ liệu cũ có thể đã thay đổi.')).toBeVisible();
  await expect(list.getByText('21 phân công phù hợp')).toBeVisible();
});

for (const role of ['CUSTOMER', 'MANAGER', 'PT']) test(`Direct ${role} access is denied without a roster request`, async ({ page }) => {
  const { reads } = await setup(page, { role });
  await page.goto(`/admin/gyms/${gymA}/trainers`);
  await expect(page.getByRole('heading', { name: 'Không có quyền truy cập' })).toBeVisible();
  expect(reads).toEqual([]);
});

test('Invalid Gym UUID never requests private Gym or roster data', async ({ page }) => {
  const { reads } = await setup(page);
  const gymReads: string[] = [];
  page.on('request', request => { if (request.url().includes('/api/v1/admin/gyms')) gymReads.push(request.url()); });
  await page.goto('/admin/gyms/invalid/trainers?sortBy=email&status=OTHER&page=-1');
  await expect(page.getByRole('heading', { name: 'Cơ sở không hợp lệ' })).toBeVisible();
  expect(reads).toEqual([]); expect(gymReads).toEqual([]);
});

test('Expired roster session delegates to the auth guard and arrives at login', async ({ page }) => {
  let expired = false;
  await setup(page, { error: () => expired ? 401 : 0 });
  await page.goto(`/admin/gyms/${gymA}/trainers`);
  await expect(page.getByText('21 phân công phù hợp')).toBeVisible();
  expired = true;
  await page.route('**/api/v1/auth/me', async route => route.fulfill({ status: 401, json: { success: false, error: { code: 'UNAUTHORIZED', message: 'Phiên hết hạn' } } }));
  await page.getByRole('button', { name: 'Làm mới danh sách', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('region', { name: 'Danh sách phân công PT' })).toHaveCount(0);
});

test('Access loss hides cached rows; retry does not leak private content', async ({ page }) => {
  let error = 0;
  await setup(page, { error: () => error });
  await page.goto(`/admin/gyms/${gymA}/trainers`);
  await expect(page.getByText('21 phân công phù hợp')).toBeVisible();
  error = 403;
  const denied = page.waitForResponse(response => response.url().includes('/management/trainers') && response.status() === 403);
  await page.getByRole('region', { name: 'Danh sách phân công PT' }).getByRole('button', { name: 'Làm mới danh sách', exact: true }).click();
  await denied;
  await expect(page.getByText('21 phân công phù hợp')).toHaveCount(0);
});

test('Responsive long IDs/text and axe at mobile/desktop', async ({ page }) => {
  await setup(page);
  await page.goto(`/admin/gyms/${gymA}/trainers`);
  await expect(page.getByText('21 phân công phù hợp')).toBeVisible();
  for (const width of [375,768,1024,1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if ([375,1440].includes(width)) expect((await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
  }
  await page.screenshot({ path: '/tmp/multi-gym-r13-trainers-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 375, height: 900 });
  await page.screenshot({ path: '/tmp/multi-gym-r13-trainers-mobile.png', fullPage: true });
});

test('Real API/DB: Admin reads roster metadata and Manager cannot enter Admin route', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill('admin@gym03.test');
  await page.locator('input[name=password]').fill('BrowserFixture@123');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL('http://127.0.0.1:3104/');
  await page.goto('/admin/gyms');
  await page.getByRole('link', { name: 'Sửa thông tin Browser Gym' }).click();
  const id = new URL(page.url()).pathname.split('/').pop();
  await page.locator('main').getByRole('link', { name: 'Phân công PT', exact: true }).click();
  await expect(page.getByText('1 phân công phù hợp')).toBeVisible();
  await expect(page.getByText('Sức mạnh', { exact: true })).toBeVisible();
  const response = await page.request.get(`http://127.0.0.1:4103/api/v1/gyms/${id}/management/trainers?page=1&pageSize=20`);
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.pagination.totalItems).toBe(1);
  expect(body.data[0]).not.toHaveProperty('profile');
  await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill('manager@gym03.test');
  await page.locator('input[name=password]').fill('BrowserFixture@123');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL('http://127.0.0.1:3104/');
  await page.goto(`/admin/gyms/${id}/trainers`);
  await expect(page.getByRole('heading', { name: 'Không có quyền truy cập' })).toBeVisible();
});

test('Pending roster becomes a confirmed empty list without showing a zero before response', async ({ page }) => {
  await setup(page);
  let release = () => {};
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/v1/gyms/*/management/trainers*', async route => {
    await gate;
    await route.fulfill({ json: { success: true, data: [], pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false } } });
  });
  await page.goto(`/admin/gyms/${gymA}/trainers`);
  const list = page.getByRole('region', { name: 'Danh sách phân công PT' });
  await expect(list).toHaveAttribute('aria-busy', 'true');
  await expect(list.getByText('0 phân công phù hợp')).toHaveCount(0);
  release();
  await expect(list.getByText('0 phân công phù hợp')).toBeVisible();
  await expect(list.getByText('Chưa có phân công PT phù hợp.', { exact: false })).toBeVisible();
});
