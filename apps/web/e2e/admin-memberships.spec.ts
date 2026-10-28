import { test, expect, type Page, type Route, request } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { AdminMembership } from '../src/types/admin-membership.types';
const gymA = '10000000-0000-4000-8000-000000000001', gymB = '10000000-0000-4000-8000-000000000002';
const userId = '30000000-0000-4000-8000-000000000001';
const card = (index: number, gymId = gymA): AdminMembership => ({
  membership_id: `20000000-0000-4000-8000-${String(index + (gymId === gymB ? 100 : 0)).padStart(12, '0')}`,
  user_id: userId, gym_id: gymId, package_id: '40000000-0000-4000-8000-000000000001', payment_id: null,
  purchase_price: index === 1 ? '0.00' : index === 2 ? '999999999999.99' : '12.34',
  start_date: '2020-01-01', end_date: '2021-01-01', status: (['PENDING', 'ACTIVE', 'EXPIRED', 'CANCELLED'] as const)[(index - 1) % 4],
  created_at: '2020-01-01T00:00:00Z', updated_at: '2020-01-01T17:00:00Z',
  customer: { user_id: userId, full_name: index === 1 ? null : index === 2 ? ' ' : 'Hội viên ' + 'tên dài '.repeat(10) },
  gym: { gym_id: gymId, gym_name: gymId === gymA ? 'Gym A' : 'Gym B' }, package: { package_id: '40000000-0000-4000-8000-000000000001', package_name: 'Gói lịch sử' },
});
type Options = { role?: string; guest?: boolean; accountStatus?: string; mustChange?: boolean; inactiveGym?: boolean; rows?: AdminMembership[]; error?: () => number; gymError?: () => number; read?: (route: Route, url: URL) => Promise<void> };
const setup = async (page: Page, options: Options = {}) => {
  const reads: URL[] = [], writes: string[] = [];
  await page.route('**/api/v1/**', async route => {
    const req = route.request(), url = new URL(req.url());
    if (req.method() !== 'GET') { writes.push(`${req.method()} ${url.pathname}`); return route.fulfill({ status: 405, json: { success: false, error: { code: 'READ_ONLY', message: 'Chỉ đọc' } } }); }
    if (url.pathname.endsWith('/auth/me')) return route.fulfill(options.guest
      ? { status: 401, json: { success: false, error: { code: 'UNAUTHORIZED', message: 'Hết phiên' } } }
      : { json: { success: true, data: { user_id: 'admin', roles: [options.role || 'ADMIN'], status: options.accountStatus || 'ACTIVE', must_change_password: options.mustChange || false, profile: { full_name: 'Admin fixture' }, active_gym_assignments: [] } } });
    reads.push(url);
    if (url.pathname.endsWith('/admin/gyms')) {
      const status = options.gymError?.() || 0;
      if (status) return route.fulfill({ status, json: { success: false, error: { code: 'READ_ERROR', message: 'Đọc Gym thất bại' } } });
      return route.fulfill({ json: { success: true, data: [gymA, gymB].map(id => ({ gym_id: id, gym_name: id === gymA ? 'Gym A' : 'Gym B', address: 'Địa chỉ cơ sở', status: options.inactiveGym ? 'INACTIVE' : 'ACTIVE' })), pagination: { page: 1, pageSize: 100, totalItems: 2, totalPages: 1, hasNextPage: false, hasPreviousPage: false } } });
    }
    if (url.pathname.endsWith('/memberships')) {
      if (options.read) return options.read(route, url);
      const status = options.error?.() || 0;
      if (status === -1) return route.abort('failed');
      if (status) return route.fulfill({ status, json: { success: false, error: { code: 'READ_ERROR', message: 'Đọc thẻ thất bại' } } });
      const rows = url.pathname.includes(gymB) ? [card(1, gymB)] : options.rows || Array.from({ length: 25 }, (_, i) => card(i + 1));
      const index = Number(url.searchParams.get('page'));
      return route.fulfill({ json: { success: true, data: rows.slice((index - 1) * 20, index * 20), pagination: { page: index, pageSize: 20, totalItems: rows.length, totalPages: Math.ceil(rows.length / 20), hasNextPage: index * 20 < rows.length, hasPreviousPage: index > 1 } } });
    }
    return route.fulfill({ status: 404, json: { success: false, error: { code: 'NOT_FOUND', message: 'Không tìm thấy' } } });
  });
  return { reads, writes };
};
const list = (page: Page) => page.getByRole('region', { name: 'Danh sách thẻ hội viên', exact: true });
const info = (page: Page) => page.getByRole('button', { name: /^Xem thông tin thẻ / });
test.use({ timezoneId: 'America/Los_Angeles' });

test('Gym detail/sidebar entry shows card totals, all statuses and only paging with stable URL', async ({ page }) => {
  const { reads, writes } = await setup(page, { inactiveGym: true });
  await page.goto(`/admin/gyms/${gymA}`);
  await page.locator('main').getByRole('link', { name: 'Thẻ hội viên', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Thẻ hội viên tại Gym' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Cơ sở đang chọn' })).toContainText('Gym A');
  await expect(page.getByText('bạn vẫn có thể tra cứu lịch sử thẻ.', { exact: false })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Đường dẫn' })).toContainText('Gym A');
  await expect(list(page).getByText('25 thẻ hội viên', { exact: true })).toBeVisible();
  await expect(info(page)).toHaveCount(20);
  for (const label of ['Chờ kích hoạt', 'Hoạt động', 'Hết hạn', 'Đã hủy']) await expect(list(page).getByText(label, { exact: true }).first()).toBeVisible();
  await expect(list(page).getByText(`User ID: ${userId}`, { exact: true })).toHaveCount(20);
  expect(await page.locator('aside a[aria-current=page]').getAttribute('href')).toBe(`/admin/gyms/${gymA}/memberships`);
  await page.getByRole('button', { name: 'Trang sau', exact: true }).click();
  await expect(page).toHaveURL(/\?page=2$/);
  await expect(info(page)).toHaveCount(5);
  await page.reload();
  await expect(info(page)).toHaveCount(5);
  await page.goBack();
  await expect(info(page)).toHaveCount(20);
  const requests = reads.filter(url => url.pathname.endsWith('/memberships'));
  expect(requests.map(url => url.searchParams.get('page'))).toContain('2');
  for (const url of requests) { expect([...url.searchParams.keys()].sort()).toEqual(['page', 'pageSize']); expect(url.searchParams.get('pageSize')).toBe('20'); }
  await expect(page.getByRole('textbox')).toHaveCount(0); await expect(page.getByRole('combobox')).toHaveCount(0);
  expect(writes).toEqual([]);
});

test('Inline detail uses current row, preserves decimal/date text and returns keyboard focus without extra API', async ({ page }) => {
  const { reads, writes } = await setup(page, { rows: [card(1), card(2)] });
  await page.goto(`/admin/gyms/${gymA}/memberships`);
  const opener = info(page).first();
  await expect(list(page).getByText('Chưa có tên hồ sơ', { exact: true })).toHaveCount(2);
  await expect(list(page).locator('time[datetime="2020-01-01"]')).toHaveText(['01/01/2020', '01/01/2020']);
  // ACTIVE is intentionally past its end_date, and is not rewritten to EXPIRED.
  await expect(list(page).getByText('Hoạt động', { exact: true })).toBeVisible();
  await opener.focus(); await page.keyboard.press('Enter');
  const heading = page.getByRole('heading', { name: `Thông tin thẻ ${card(1).membership_id}`, exact: true });
  await expect(heading).toBeFocused();
  const detail = page.getByRole('region', { name: `Thông tin thẻ ${card(1).membership_id}`, exact: true });
  await expect(detail).toContainText('0,00 ₫');
  await expect(detail).toContainText('Không có liên kết thanh toán trong dữ liệu');
  await expect(detail.locator('time[datetime="2020-01-01T17:00:00Z"]')).toContainText('00:00');
  await expect(detail.locator('time[datetime="2020-01-01T17:00:00Z"]')).toContainText('2/1/20');
  await page.keyboard.press('Escape'); await expect(opener).toBeFocused();
  await info(page).nth(1).click();
  await expect(page.getByText('999.999.999.999,99 ₫', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Đóng thông tin thẻ', exact: true }).click();
  await expect(info(page).nth(1)).toBeFocused();
  expect(reads.filter(url => url.pathname.endsWith('/memberships'))).toHaveLength(1);
  expect(reads.some(url => /payments|users|memberships\/me/.test(url.pathname))).toBe(false);
  expect(writes).toEqual([]);
});

test('Changing page and Gym clears details, resets page1 and returning never restores old expanded state', async ({ page }) => {
  const { reads } = await setup(page);
  await page.goto(`/admin/gyms/${gymA}/memberships?page=2`);
  await info(page).first().click();
  await expect(page.getByRole('heading', { name: /^Thông tin thẻ / })).toBeVisible();
  await page.getByRole('button', { name: 'Trang trước', exact: true }).click();
  await expect(info(page)).toHaveCount(20);
  await expect(page.getByRole('heading', { name: /^Thông tin thẻ / })).toHaveCount(0);
  await page.getByRole('button', { name: 'Trang sau', exact: true }).click();
  await info(page).first().click();
  await page.evaluate(id => {
    history.pushState({ key: 'membership-switch' }, '', `/admin/gyms/${id}/memberships?page=2`);
    dispatchEvent(new PopStateEvent('popstate'));
  }, gymB);
  await expect(page.getByRole('region', { name: 'Cơ sở đang chọn' })).toContainText('Gym B');
  await expect(page).toHaveURL(new RegExp(`${gymB}/memberships\\?page=1$`));
  await expect(info(page)).toHaveCount(1);
  await expect(page.getByRole('heading', { name: /^Thông tin thẻ / })).toHaveCount(0);
  expect(reads.filter(url => url.pathname.includes(gymB) && url.pathname.endsWith('/memberships')).every(url => url.searchParams.get('page') === '1')).toBe(true);
  await page.goBack();
  await expect(page.getByRole('region', { name: 'Cơ sở đang chọn' })).toContainText('Gym A');
  await expect(page).toHaveURL(new RegExp(`${gymA}/memberships\\?page=1$`));
  await expect(page.getByRole('heading', { name: /^Thông tin thẻ / })).toHaveCount(0);
});

test('Reload removes the opened snapshot and a removed row cannot return in its detail', async ({ page }) => {
  const options: Options = { rows: [card(1), card(2)] };
  await setup(page, options);
  await page.goto(`/admin/gyms/${gymA}/memberships`);
  await info(page).first().click();
  options.rows = [card(2)];
  await page.getByRole('button', { name: 'Tải lại danh sách', exact: true }).click();
  await expect(info(page)).toHaveCount(1);
  await expect(page.getByRole('heading', { name: /^Thông tin thẻ / })).toHaveCount(0);
  await expect(list(page).getByText(`Thẻ: ${card(1).membership_id}`, { exact: true })).toHaveCount(0);
});

test('Pending is distinct from total0; an out-of-range page recovers using fresh metadata', async ({ page }) => {
  let release = () => {};
  const gate = new Promise<void>(resolve => { release = resolve; });
  const pages: string[] = [];
  await setup(page, { read: async (route, url) => {
    const index = Number(url.searchParams.get('page')); pages.push(String(index));
    await gate;
    await route.fulfill({ json: { success: true, data: index === 2 ? [card(21)] : [], pagination: { page: index, pageSize: 20, totalItems: 21, totalPages: 2, hasNextPage: index < 2, hasPreviousPage: index > 1 } } });
  } });
  await page.goto(`/admin/gyms/${gymA}/memberships?page=3`);
  await expect(list(page).getByText('Đang tải dữ liệu…', { exact: true })).toBeVisible();
  await expect(list(page).getByText('0 thẻ hội viên', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Tải lại danh sách', exact: true })).toBeDisabled();
  release();
  await expect(page).toHaveURL(/\?page=2$/);
  await expect(info(page)).toHaveCount(1);
  await expect(page.getByText('Trang trước không còn dữ liệu; đã chuyển về trang 2.', { exact: true })).toBeVisible();
  expect(pages).toEqual(['3', '2']);
});

test('A genuinely empty Gym and a now-empty later page both settle on page1 without retry loops', async ({ page }) => {
  const { reads } = await setup(page, { rows: [] });
  await page.goto(`/admin/gyms/${gymA}/memberships?page=2`);
  await expect(page).toHaveURL(/\?page=1$/);
  await expect(page.getByText('Chưa có thẻ hội viên tại cơ sở này.', { exact: true })).toBeVisible();
  await expect(page.getByText('0 thẻ hội viên', { exact: true })).toBeVisible();
  expect(reads.filter(url => url.pathname.endsWith('/memberships')).map(url => url.searchParams.get('page'))).toEqual(['2', '1']);
});

for (const status of [-1, 400, 404, 409, 500]) test(`Read ${status === -1 ? 'network' : status} failure has a deliberate keyboard retry and never writes`, async ({ page }) => {
  let failure = status;
  const { writes } = await setup(page, { rows: [card(1)], error: () => failure });
  await page.goto(`/admin/gyms/${gymA}/memberships`);
  await expect(list(page).getByText('Không thể tải dữ liệu.', { exact: true })).toBeVisible();
  await expect(info(page)).toHaveCount(0);
  failure = 0;
  await list(page).getByRole('button', { name: 'Thử lại', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(info(page)).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Tải lại danh sách', exact: true })).toBeFocused();
  expect(writes).toEqual([]);
});

test('Cached read failure is marked stale, closes detail and cannot reopen information until retry succeeds', async ({ page }) => {
  let failure = false;
  await setup(page, { rows: [card(1)], error: () => failure ? 500 : 0 });
  await page.goto(`/admin/gyms/${gymA}/memberships`);
  await info(page).first().click();
  failure = true;
  await page.getByRole('button', { name: 'Tải lại danh sách', exact: true }).click();
  await expect(page.getByText('Làm mới thất bại. Dữ liệu cũ có thể đã thay đổi.', { exact: true })).toBeVisible();
  await expect(info(page).first()).toBeDisabled();
  await expect(page.getByRole('heading', { name: /^Thông tin thẻ / })).toHaveCount(0);
  failure = false;
  await list(page).getByRole('button', { name: 'Thử lại', exact: true }).click();
  await expect(info(page).first()).toBeEnabled();
});

for (const status of [401, 403]) test(`Read HTTP ${status} hides cached list/detail even while the session still says Admin`, async ({ page }) => {
  let failure = false;
  const { writes } = await setup(page, { error: () => failure ? status : 0 });
  await page.goto(`/admin/gyms/${gymA}/memberships`);
  await info(page).first().click();
  failure = true;
  await page.getByRole('button', { name: 'Tải lại danh sách', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(list(page)).toHaveCount(0); await expect(info(page)).toHaveCount(0);
  await expect(page.getByRole('heading', { name: /^Thông tin thẻ / })).toHaveCount(0);
  await page.getByRole('button', { name: 'Thử lại', exact: true }).click();
  await expect(list(page)).toHaveCount(0);
  expect(writes).toEqual([]);
});

for (const role of ['CUSTOMER', 'PT', 'MANAGER']) test(`${role} cannot enter the Admin Membership route or send private reads`, async ({ page }) => {
  const { reads } = await setup(page, { role });
  await page.goto(`/admin/gyms/${gymA}/memberships`);
  await expect(page.getByRole('heading', { name: 'Không có quyền truy cập', exact: true })).toBeVisible();
  expect(reads).toEqual([]);
});

test('Guest/password-gated/suspended actors do not read private Membership data', async ({ page }) => {
  const options: Options = { guest: true };
  const { reads } = await setup(page, options);
  await page.goto(`/admin/gyms/${gymA}/memberships`); await expect(page).toHaveURL(/\/login$/);
  options.guest = false; options.mustChange = true;
  await page.goto(`/admin/gyms/${gymA}/memberships`); await expect(page).toHaveURL(/\/change-password$/);
  options.mustChange = false; options.accountStatus = 'SUSPENDED';
  await page.goto(`/admin/gyms/${gymA}/memberships`); await expect(page.getByTestId('account-deactivated')).toBeVisible();
  expect(reads).toEqual([]);
});

for (const expired of [true, false]) test(`A ${expired ? 'expired session' : 'revoked Admin role'} leaves the workspace after rechecking auth`, async ({ page }) => {
  const options: Options = { error: () => options.guest || options.role ? expired ? 401 : 403 : 0 };
  await setup(page, options);
  await page.goto(`/admin/gyms/${gymA}/memberships`);
  await expect(info(page)).toHaveCount(20);
  if (expired) options.guest = true; else options.role = 'CUSTOMER';
  await page.getByRole('button', { name: 'Tải lại danh sách', exact: true }).click();
  if (expired) await expect(page).toHaveURL(/\/login$/);
  else await expect(page.getByRole('heading', { name: 'Không có quyền truy cập', exact: true })).toBeVisible();
  await expect(list(page)).toHaveCount(0);
});

test('Invalid Gym never queries; invalid URL page/query canonicalizes to the supported paging contract', async ({ page }) => {
  const { reads } = await setup(page);
  await page.goto('/admin/gyms/invalid/memberships');
  await expect(page.getByRole('heading', { name: 'Cơ sở không hợp lệ', exact: true })).toBeVisible();
  expect(reads).toEqual([]);
  await page.goto(`/admin/gyms/${gymA}/memberships?page=-1&status=ACTIVE&search=ignored`);
  await expect(info(page)).toHaveCount(20);
  await expect(page).toHaveURL(/\?page=1$/);
  expect(reads.filter(url => url.pathname.endsWith('/memberships')).map(url => [...url.searchParams.entries()].sort())).toEqual([[['page', '1'], ['pageSize', '20']]]);
});

test('Missing Gym and context read errors do not fall back to public or Customer cards', async ({ page }) => {
  let failure = 404;
  const { reads } = await setup(page, { gymError: () => failure });
  await page.goto(`/admin/gyms/${gymA}/memberships`);
  await expect(page.getByRole('alert')).toContainText('Không có quyền truy cập hoặc tài nguyên không còn khả dụng.');
  await expect(list(page)).toHaveCount(0);
  expect(reads.every(url => url.pathname.endsWith('/admin/gyms'))).toBe(true);
  failure = 0;
  await page.getByRole('button', { name: 'Thử lại', exact: true }).click();
  await expect(info(page)).toHaveCount(20);
});

test('Long identifiers/names and expanded info remain accessible at four widths with no write controls', async ({ page }) => {
  const { writes } = await setup(page, { rows: [card(1), card(2), card(3), card(4)] });
  await page.goto(`/admin/gyms/${gymA}/memberships`);
  await info(page).nth(1).click();
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if ([375, 1440].includes(width)) expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
  }
  await expect(list(page).getByRole('button', { name: /Tạo|Gia hạn|Hủy|Sửa|Thanh toán|Hoàn tiền|Đăng ký PT|Đặt lịch/ })).toHaveCount(0);
  expect(writes).toEqual([]);
  await page.screenshot({ path: '/tmp/multi-gym-r17-memberships-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 375, height: 1000 });
  await page.screenshot({ path: '/tmp/multi-gym-r17-memberships-mobile.png', fullPage: true });
});

test('Real API/DB: Admin reads all card states over two pages and inactive Gym history without writes', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill('admin@gym03.test');
  await page.locator('input[name=password]').fill('BrowserFixture@123');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL('http://127.0.0.1:3104/');
  const base = 'http://127.0.0.1:4103/api/v1';
  const gyms = (await (await page.request.get(`${base}/admin/gyms`)).json()).data;
  const id = gyms.find((row: { gym_name: string }) => row.gym_name === 'Membership Gym').gym_id;
  const otherId = gyms.find((row: { gym_name: string }) => row.gym_name === 'Membership Other Gym').gym_id;
  const before = (await (await page.request.get(`${base}/gyms/${id}/memberships?page=1&pageSize=100`)).json()).data;
  const observed: { method: string; path: string }[] = [];
  page.on('request', req => { const url = new URL(req.url()); if (url.pathname.startsWith('/api/v1')) observed.push({ method: req.method(), path: url.pathname }); });
  await page.goto(`/admin/gyms/${id}`);
  await page.locator('main').getByRole('link', { name: 'Thẻ hội viên', exact: true }).click();
  await expect(page.getByText('25 thẻ hội viên', { exact: true })).toBeVisible();
  await expect(info(page)).toHaveCount(20);
  const firstIds = await info(page).evaluateAll(nodes => nodes.map(node => node.textContent!.trim().replace('Xem thông tin thẻ ', '')));
  await info(page).first().click();
  await expect(page.getByRole('heading', { name: /^Thông tin thẻ / })).toBeVisible();
  await page.getByRole('button', { name: 'Trang sau', exact: true }).click();
  await expect(info(page)).toHaveCount(5);
  const secondIds = await info(page).evaluateAll(nodes => nodes.map(node => node.textContent!.trim().replace('Xem thông tin thẻ ', '')));
  expect([...firstIds, ...secondIds]).toEqual(before.map((row: AdminMembership) => row.membership_id));
  expect(new Set([...firstIds, ...secondIds]).size).toBe(25);
  await page.reload(); await expect(info(page)).toHaveCount(5);
  await page.getByRole('button', { name: 'Trang trước', exact: true }).click();
  await expect(info(page)).toHaveCount(20);
  for (const label of ['Chờ kích hoạt', 'Hoạt động', 'Hết hạn', 'Đã hủy']) await expect(list(page).getByText(label, { exact: true }).first()).toBeVisible();
  await page.goto(`/admin/gyms/${otherId}/memberships`);
  await expect(page.getByText('2 thẻ hội viên', { exact: true })).toBeVisible();
  await expect(page.getByText('bạn vẫn có thể tra cứu lịch sử thẻ.', { exact: false })).toBeVisible();
  await expect(list(page).getByText('Hết hạn', { exact: true })).toBeVisible();
  await expect(list(page).getByText('Đã hủy', { exact: true })).toBeVisible();
  const after = (await (await page.request.get(`${base}/gyms/${id}/memberships?page=1&pageSize=100`)).json()).data;
  expect(after).toEqual(before);
  expect(observed.every(req => req.method === 'GET')).toBe(true);
  expect(observed.some(req => /payments|memberships\/me|memberships\//.test(req.path))).toBe(false);
  const actor = await request.newContext();
  try {
    expect((await actor.get(`${base}/gyms/${id}/memberships`)).status()).toBe(401);
    for (const role of ['customer', 'pt', 'manager']) {
      expect((await actor.post(`${base}/auth/login`, { data: { email: `${role}@gym03.test`, password: 'BrowserFixture@123' } })).status()).toBe(200);
      expect((await actor.get(`${base}/gyms/${id}/memberships`)).status()).toBe(403);
    }
  } finally { await actor.dispose(); }
});
