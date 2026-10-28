import { test, expect, type Page, type Route } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const gymA = '10000000-0000-4000-8000-000000000001';
const gymB = '10000000-0000-4000-8000-000000000002';
const userId = '30000000-0000-4000-8000-000000000001';
const setup = async (page: Page, options: { role?: string; inactive?: boolean; write?: (route: Route) => Promise<void>; existing?: boolean; readError?: () => boolean } = {}) => {
  const writes: { path: string; body: Record<string, unknown> }[] = [], reads: string[] = [];
  await page.route('**/api/v1/**', async route => {
    const request = route.request(), url = new URL(request.url());
    if (request.method() === 'POST') {
      writes.push({ path: url.pathname, body: request.postDataJSON() });
      if (options.write) return options.write(route);
      return route.fulfill({ status: 201, json: { success: true, data: url.pathname.endsWith('/provision') ? { temporary_password: 'OneTime!123', user: { email: 'newpt@test.com' }, assignment: { gym_id: gymA } } : { gym_id: gymA, user_id: userId } } });
    }
    if (url.pathname.endsWith('/auth/me')) return route.fulfill({ json: { success: true, data: { user_id: 'admin', roles: [options.role || 'ADMIN'], status: 'ACTIVE', must_change_password: false, profile: { full_name: 'Admin kiểm thử' }, active_gym_assignments: [] } } });
    if (url.pathname.endsWith('/admin/gyms')) return route.fulfill({ json: { success: true, data: [gymA, gymB].map(id => ({ gym_id: id, gym_name: id === gymA ? 'Gym A' : 'Gym B', address: 'Địa chỉ cơ sở', status: options.inactive ? 'INACTIVE' : 'ACTIVE' })), pagination: { page: 1, pageSize: 100, totalItems: 2, totalPages: 1, hasNextPage: false, hasPreviousPage: false } } });
    reads.push(url.pathname);
    if (options.readError?.()) return route.fulfill({ status: 500, json: { success: false, error: { code: 'SERVER_ERROR', message: 'Lỗi đọc đối soát' } } });
    if (url.pathname.endsWith('/admin/users')) return route.fulfill({ json: { success: true, data: { items: options.existing ? [{ user_id: userId, email: 'newpt@test.com' }] : [], total: options.existing ? 1 : 0, page: 1, page_size: 20 } } });
    if (url.pathname.endsWith('/management/trainers')) return route.fulfill({ json: { success: true, data: options.existing ? [{ user_id: userId, status: 'ACTIVE' }] : [], pagination: { page: 1, pageSize: 100, totalItems: options.existing ? 1 : 0, totalPages: 1, hasNextPage: false, hasPreviousPage: false } } });
    return route.fulfill({ status: 404, json: { success: false, error: { code: 'NOT_FOUND', message: 'Không tìm thấy' } } });
  });
  return { writes, reads };
};
const provision = async (page: Page) => {
  await page.getByLabel('Cách tiếp nhận').selectOption('provision');
  await page.getByLabel('Họ và tên', { exact: true }).fill('PT mới');
  await page.getByLabel('Email', { exact: true }).fill('newpt@test.com');
};

test('A pending provision response for the previous Gym cannot populate the new Gym form', async ({ page }) => {
  let release = () => {};
  const gate = new Promise<void>(resolve => { release = resolve; });
  const { writes } = await setup(page, { write: async route => {
    await gate;
    await route.fulfill({ status: 201, json: { success: true, data: { temporary_password: 'OneTime!123', user: { email: 'newpt@test.com' }, assignment: { gym_id: gymA } } } });
  } });
  await page.goto(`/admin/gyms/${gymA}/trainers/assign`);
  await provision(page);
  await page.getByRole('button', { name: 'Cấp tài khoản', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Đang gửi…', exact: true })).toBeDisabled();
  await page.evaluate(id => {
    history.pushState({ key: 'pending-intake-switch' }, '', `/admin/gyms/${id}/trainers/assign`);
    dispatchEvent(new PopStateEvent('popstate'));
  }, gymB);
  await expect(page.getByRole('region', { name: 'Cơ sở đang chọn' })).toContainText('Gym B');
  const completed = page.waitForResponse(response => response.url().endsWith(`/gyms/${gymA}/trainers/provision`));
  release(); await completed;
  await expect(page.getByLabel('User ID', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Mật khẩu tạm')).toHaveCount(0);
  await expect(page.getByText('Phân công đã được lưu.', { exact: false })).toHaveCount(0);
  expect(writes).toHaveLength(1); expect(writes[0].path).toContain(gymA);
});

for (const status of [401, 403]) test(`Gym refresh HTTP ${status} clears cached intake and credentials even if session still says Admin`, async ({ page }) => {
  await setup(page);
  await page.goto(`/admin/gyms/${gymA}/trainers/assign`);
  await provision(page);
  await page.getByRole('button', { name: 'Cấp tài khoản', exact: true }).click();
  await expect(page.getByLabel('Mật khẩu tạm')).toBeVisible();
  await page.route('**/api/v1/admin/gyms*', async route => route.fulfill({ status, json: { success: false, error: { code: 'ACCESS_LOST', message: 'Quyền đọc đã mất' } } }));
  const refreshed = page.waitForResponse(response => response.url().includes('/api/v1/admin/gyms') && response.status() === status);
  await page.evaluate(() => dispatchEvent(new Event('visibilitychange')));
  await refreshed;
  await expect(page.getByRole('form', { name: 'Thông tin tiếp nhận PT' })).toHaveCount(0);
  await expect(page.getByLabel('Mật khẩu tạm')).toHaveCount(0);
});

test('SPA Gym switch clears a provisioned credential and returning cannot restore it', async ({ page }) => {
  await setup(page);
  await page.goto(`/admin/gyms/${gymA}/trainers/assign`);
  await provision(page);
  await page.getByRole('button', { name: 'Cấp tài khoản', exact: true }).click();
  await expect(page.getByLabel('Mật khẩu tạm')).toBeVisible();
  await page.evaluate(id => {
    history.pushState({ key: 'intake-switch' }, '', `/admin/gyms/${id}/trainers/assign`);
    dispatchEvent(new PopStateEvent('popstate'));
  }, gymB);
  await expect(page.getByRole('region', { name: 'Cơ sở đang chọn' })).toContainText('Gym B');
  await expect(page.getByLabel('Mật khẩu tạm')).toHaveCount(0);
  await expect(page.getByLabel('User ID', { exact: true })).toHaveValue('');
  await page.goBack();
  await expect(page.getByRole('region', { name: 'Cơ sở đang chọn' })).toContainText('Gym A');
  await expect(page.getByLabel('Mật khẩu tạm')).toHaveCount(0);
  await expect(page.getByLabel('User ID', { exact: true })).toHaveValue('');
});

test('Recovery scans account pages using exact case-insensitive email rather than the first search match', async ({ page }) => {
  const { writes } = await setup(page, { existing: true, write: async route => route.abort('failed') });
  const pages: string[] = [];
  await page.route('**/api/v1/admin/users*', async route => {
    const url = new URL(route.request().url()), index = url.searchParams.get('page');
    pages.push(index!); expect(url.searchParams.get('search')).toBe('newpt@test.com');
    await route.fulfill({ json: { success: true, data: { items: index === '2' ? [{ user_id: userId, email: 'NEWPT@test.com' }] : [{ user_id: 'wrong', email: 'other@test.com' }], page: Number(index), page_size: 20, total: 21 } } });
  });
  await page.goto(`/admin/gyms/${gymA}/trainers/assign`);
  await provision(page);
  await page.getByRole('button', { name: 'Cấp tài khoản', exact: true }).click();
  await page.getByRole('button', { name: 'Đối soát kết quả', exact: true }).click();
  await expect(page.getByText('Phân công đã được lưu.', { exact: false })).toBeVisible();
  await expect(page.getByLabel('Mật khẩu tạm')).toHaveCount(0);
  expect(pages).toEqual(['1', '2']); expect(writes).toHaveLength(1);
});

test('Leaving before submit sends no write', async ({ page }) => {
  const { writes } = await setup(page);
  await page.goto(`/admin/gyms/${gymA}/trainers/assign`);
  await provision(page);
  await page.getByRole('link', { name: 'Quay lại danh sách PT', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/gyms/${gymA}/trainers$`));
  expect(writes).toEqual([]);
});

test('Successful provision keeps its one-time credential when the subsequent Gym refresh fails', async ({ page }) => {
  let failRead = false;
  const { writes } = await setup(page, { write: async route => {
    failRead = true;
    await route.fulfill({ status: 201, json: { success: true, data: { temporary_password: 'OneTime!123', user: { email: 'newpt@test.com' }, assignment: { gym_id: gymA } } } });
  } });
  await page.route('**/api/v1/admin/gyms*', async route => {
    if (failRead) return route.fulfill({ status: 500, json: { success: false, error: { code: 'SERVER_ERROR', message: 'Không đọc được cơ sở' } } });
    await route.fulfill({ json: { success: true, data: [{ gym_id: gymA, gym_name: 'Gym A', address: 'Địa chỉ', status: 'ACTIVE' }], pagination: { page: 1, pageSize: 100, totalItems: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false } } });
  });
  await page.goto(`/admin/gyms/${gymA}/trainers/assign`);
  await provision(page);
  await page.getByRole('button', { name: 'Cấp tài khoản', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Không đọc được cơ sở');
  await expect(page.getByLabel('Mật khẩu tạm', { exact: true })).toHaveText('OneTime!123');
  await expect(page.getByText('Phân công đã được lưu.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cấp tài khoản', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Đã bàn giao, ẩn mật khẩu', exact: true }).click();
  await expect(page.getByLabel('Mật khẩu tạm', { exact: true })).toHaveCount(0);
  expect(writes).toHaveLength(1);
});

test('Assign sends strict scoped payload, validates UUID and locks after success', async ({ page }) => {
  const { writes } = await setup(page);
  await page.goto(`/admin/gyms/${gymA}/trainers/assign`);
  await page.getByLabel('User ID', { exact: true }).fill('invalid');
  await page.getByRole('button', { name: 'Lưu phân công', exact: true }).click();
  expect(writes).toEqual([]);
  await page.getByLabel('User ID', { exact: true }).fill(userId);
  await page.getByLabel('Chuyên môn', { exact: true }).fill(' Sức mạnh ');
  await page.getByLabel('Số năm kinh nghiệm', { exact: true }).fill('0');
  await page.getByRole('button', { name: 'Lưu phân công', exact: true }).click();
  await expect(page.getByText('Phân công đã được lưu.', { exact: true })).toBeFocused();
  expect(writes).toEqual([{ path: `/api/v1/gyms/${gymA}/trainers`, body: { user_id: userId, specialization: 'Sức mạnh', experience_years: 0 } }]);
  await expect(page.getByRole('button', { name: 'Lưu phân công', exact: true })).toBeDisabled();
});

test('Provision pending blocks double submit/mode/cancel; one-time credential hides and is not stored', async ({ page }) => {
  let release = () => {};
  const gate = new Promise<void>(resolve => { release = resolve; });
  const { writes } = await setup(page, { write: async route => { await gate; await route.fulfill({ status: 201, json: { success: true, data: { temporary_password: 'OneTime!123', user: { email: 'newpt@test.com' }, assignment: { gym_id: gymA } } } }); } });
  await page.goto(`/admin/gyms/${gymA}/trainers/assign`);
  await provision(page);
  await page.getByRole('button', { name: 'Cấp tài khoản', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Đang gửi…', exact: true })).toBeDisabled();
  await expect(page.getByLabel('Cách tiếp nhận')).toBeDisabled();
  await expect(page.getByRole('link', { name: 'Quay lại danh sách PT', exact: true })).toHaveCount(0);
  await page.getByRole('form', { name: 'Thông tin tiếp nhận PT' }).evaluate(form => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
  expect(writes).toHaveLength(1);
  release();
  await expect(page.getByLabel('Mật khẩu tạm', { exact: true })).toHaveText('OneTime!123');
  expect(writes[0].body).toEqual({ full_name: 'PT mới', email: 'newpt@test.com' });
  expect(await page.evaluate(() => JSON.stringify([localStorage, sessionStorage]))).not.toContain('OneTime!123');
  await page.getByRole('button', { name: 'Đã bàn giao, ẩn mật khẩu', exact: true }).click();
  await expect(page.getByLabel('Mật khẩu tạm', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Cấp tài khoản', exact: true })).toBeDisabled();
});

test('Mode and Gym navigation clear inputs, credentials and success state', async ({ page }) => {
  await setup(page);
  await page.goto(`/admin/gyms/${gymA}/trainers/assign`);
  await provision(page);
  await page.getByRole('button', { name: 'Cấp tài khoản', exact: true }).click();
  await expect(page.getByLabel('Mật khẩu tạm')).toBeVisible();
  await page.getByLabel('Cách tiếp nhận').selectOption('assign');
  await expect(page.getByLabel('Mật khẩu tạm')).toHaveCount(0);
  await expect(page.getByLabel('User ID', { exact: true })).toHaveValue('');
  await provision(page);
  await page.getByRole('button', { name: 'Cấp tài khoản', exact: true }).click();
  await expect(page.getByLabel('Mật khẩu tạm')).toBeVisible();
  await page.getByRole('link', { name: 'Xem danh sách PT', exact: true }).click();
  await expect(page.getByLabel('Mật khẩu tạm')).toHaveCount(0);
  await page.goto(`/admin/gyms/${gymB}/trainers/assign`);
  await expect(page.getByRole('region', { name: 'Cơ sở đang chọn' })).toContainText('Gym B');
  await expect(page.getByLabel('User ID', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Mật khẩu tạm')).toHaveCount(0);
});

for (const status of [400, 404, 409]) test(`HTTP ${status} preserves input and never retries POST`, async ({ page }) => {
  const { writes } = await setup(page, { write: async route => { await route.fulfill({ status, json: { success: false, error: { code: status === 409 ? 'ASSIGNMENT_ALREADY_EXISTS' : 'INVALID_TARGET', message: 'Không thể gán PT' } } }); } });
  await page.goto(`/admin/gyms/${gymA}/trainers/assign`);
  await page.getByLabel('User ID', { exact: true }).fill(userId);
  await page.getByRole('button', { name: 'Lưu phân công', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Không thể gán PT');
  await expect(page.getByLabel('User ID', { exact: true })).toHaveValue(userId);
  await expect(page.getByRole('button', { name: 'Lưu phân công', exact: true })).toBeEnabled();
  expect(writes).toHaveLength(1);
});

for (const network of [false, true]) test(`Unknown ${network ? 'network' : '500'} result requires read before retry; failed reads stay locked`, async ({ page }) => {
  let readError = true;
  const { writes, reads } = await setup(page, { readError: () => readError, write: async route => {
    if (network) await route.abort('failed');
    else await route.fulfill({ status: 500, json: { success: false, error: { code: 'SERVER_ERROR', message: 'Lỗi lưu' } } });
  } });
  await page.goto(`/admin/gyms/${gymA}/trainers/assign`);
  await provision(page);
  await page.getByRole('button', { name: 'Cấp tài khoản', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Cấp tài khoản', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Đối soát kết quả', exact: true }).click();
  await expect(page.getByText('Lỗi đọc đối soát', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cấp tài khoản', exact: true })).toBeDisabled();
  readError = false;
  await page.getByRole('button', { name: 'Đối soát kết quả', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Cấp tài khoản', exact: true })).toBeEnabled();
  expect(reads).toContain('/api/v1/admin/users');
  expect(reads).toContain(`/api/v1/gyms/${gymA}/management/trainers`);
  expect(writes).toHaveLength(1);
});

test('Committed provision with lost response is reconciled without a second POST or password recovery', async ({ page }) => {
  const { writes } = await setup(page, { existing: true, write: async route => { await route.abort('failed'); } });
  await page.goto(`/admin/gyms/${gymA}/trainers/assign`);
  await provision(page);
  await page.getByRole('button', { name: 'Cấp tài khoản', exact: true }).click();
  await page.getByRole('button', { name: 'Đối soát kết quả', exact: true }).click();
  await expect(page.getByText('Không thể lấy lại mật khẩu tạm từ kết quả đối soát.', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cấp tài khoản', exact: true })).toBeDisabled();
  await expect(page.getByLabel('Mật khẩu tạm')).toHaveCount(0);
  expect(writes).toHaveLength(1);
});

test('INACTIVE Gym disables intake and invalid UUID never reads private data', async ({ page }) => {
  const { writes, reads } = await setup(page, { inactive: true });
  await page.goto(`/admin/gyms/${gymA}/trainers/assign`);
  await expect(page.getByText('Cơ sở đang ngừng hoạt động.', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Lưu phân công', exact: true })).toBeDisabled();
  await page.goto('/admin/gyms/invalid/trainers/assign');
  await expect(page.getByRole('heading', { name: 'Cơ sở không hợp lệ' })).toBeVisible();
  expect(writes).toEqual([]); expect(reads).toEqual([]);
});

for (const role of ['CUSTOMER', 'MANAGER', 'PT']) test(`${role} cannot enter Admin intake`, async ({ page }) => {
  const { writes, reads } = await setup(page, { role });
  await page.goto(`/admin/gyms/${gymA}/trainers/assign`);
  await expect(page.getByRole('heading', { name: 'Không có quyền truy cập' })).toBeVisible();
  expect(writes).toEqual([]); expect(reads).toEqual([]);
});

test('Intake and credentials remain accessible without overflow at four widths', async ({ page }) => {
  await setup(page);
  await page.goto(`/admin/gyms/${gymA}/trainers/assign`);
  await provision(page);
  await page.getByRole('button', { name: 'Cấp tài khoản', exact: true }).click();
  await expect(page.getByLabel('Mật khẩu tạm')).toBeVisible();
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if ([375, 1440].includes(width)) expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
  }
  await page.screenshot({ path: '/tmp/multi-gym-r14-intake-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 375, height: 1000 });
  await page.screenshot({ path: '/tmp/multi-gym-r14-intake-mobile.png', fullPage: true });
});

test('Real API/DB: Admin provisions PT, verifies password gate, then assigns account to another Gym', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill('admin@gym03.test');
  await page.locator('input[name=password]').fill('BrowserFixture@123');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL('http://127.0.0.1:3104/');
  const base = 'http://127.0.0.1:4103/api/v1';
  const makeGym = async (name: string) => {
    const response = await page.request.post(`${base}/gyms`, { data: { gym_name: name, address: 'Địa chỉ intake fixture' } });
    expect(response.status()).toBe(201);
    return (await response.json()).data.gym_id as string;
  };
  const id = await makeGym('Intake Gym A'), otherId = await makeGym('Intake Gym B');
  await page.goto(`/admin/gyms/${id}/trainers`);
  await page.getByRole('link', { name: 'Tiếp nhận PT', exact: true }).click();
  await provision(page);
  await page.getByLabel('Số năm kinh nghiệm', { exact: true }).fill('0');
  await page.getByRole('button', { name: 'Cấp tài khoản', exact: true }).click();
  const password = page.getByLabel('Mật khẩu tạm', { exact: true });
  await expect(password).toBeVisible();
  const temporaryPassword = (await password.textContent())!;
  const roster = await page.request.get(`${base}/gyms/${id}/management/trainers`);
  expect(roster.status()).toBe(200);
  const assignment = (await roster.json()).data[0];
  expect(assignment.status).toBe('ACTIVE'); expect(assignment.availability).toBe('NOT_ACCEPTING'); expect(assignment.experience_years).toBe(0);
  // Use a separate HTTP cookie jar so the browser remains authenticated as Admin.
  const { request } = await import('@playwright/test');
  const pt = await request.newContext();
  try {
    const login = await pt.post(`${base}/auth/login`, { data: { email: 'newpt@test.com', password: temporaryPassword } });
    expect(login.status()).toBe(200);
    const me = await pt.get(`${base}/auth/me`);
    const account = (await me.json()).data;
    expect(account.must_change_password).toBe(true); expect(account.roles).toContain('PT');
    const gated = await pt.get(`${base}/gyms/${id}/management/trainers`);
    expect((await gated.json()).error.code).toBe('PASSWORD_CHANGE_REQUIRED');
  } finally { await pt.dispose(); }
  // Prepare a free existing ACTIVE PT account through the existing lifecycle API.
  const stop = await page.request.patch(`${base}/gyms/${id}/trainers/${assignment.gym_trainer_id}/status`, { data: { status: 'INACTIVE' } });
  expect(stop.status()).toBe(200);
  await page.getByRole('button', { name: 'Đã bàn giao, ẩn mật khẩu', exact: true }).click();
  await page.goto(`/admin/gyms/${otherId}/trainers/assign`);
  await page.getByLabel('User ID', { exact: true }).fill(assignment.user_id);
  await page.getByLabel('Chuyên môn', { exact: true }).fill('PT Gym B');
  await page.getByRole('button', { name: 'Lưu phân công', exact: true }).click();
  await expect(page.getByText('Phân công đã được lưu.', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Xem danh sách PT', exact: true }).click();
  await expect(page.getByText('PT Gym B', { exact: true })).toBeVisible();
  await expect(page.getByText('1 phân công phù hợp')).toBeVisible();
  // Server remains authoritative when the Gym changes after the form's GET.
  await page.goto(`/admin/gyms/${id}/trainers/assign`);
  await provision(page);
  await page.getByLabel('Email', { exact: true }).fill('blockedpt@test.com');
  const deactivate = await page.request.patch(`${base}/gyms/${id}/status`, { data: { status: 'INACTIVE' } });
  expect(deactivate.status()).toBe(200);
  const rejected = page.waitForResponse(response => response.url().endsWith(`/gyms/${id}/trainers/provision`) && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Cấp tài khoản', exact: true }).click();
  const rejectedResponse = await rejected;
  expect(rejectedResponse.status()).toBe(409);
  expect((await rejectedResponse.json()).error.code).toBe('GYM_INACTIVE');
  await expect(page.getByText('Cơ sở đang ngừng hoạt động.', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cấp tài khoản', exact: true })).toBeDisabled();
  const accounts = await page.request.get(`${base}/admin/users?search=blockedpt%40test.com&page=1&pageSize=20`);
  expect((await accounts.json()).data.total).toBe(0);
});

for (const status of [401, 403]) test(`HTTP ${status} rechecks session and removes intake on lost access`, async ({ page }) => {
  const { writes } = await setup(page, { write: async route => {
    await page.route('**/api/v1/auth/me', async auth => {
      if (status === 401) return auth.fulfill({ status: 401, json: { success: false, error: { code: 'UNAUTHORIZED', message: 'Phiên hết hạn' } } });
      return auth.fulfill({ json: { success: true, data: { user_id: 'admin', roles: ['CUSTOMER'], status: 'ACTIVE', must_change_password: false, profile: { full_name: 'Đã mất quyền' }, active_gym_assignments: [] } } });
    });
    await route.fulfill({ status, json: { success: false, error: { code: 'UNAUTHORIZED', message: 'Không còn quyền lưu' } } });
  } });
  await page.goto(`/admin/gyms/${gymA}/trainers/assign`);
  await page.getByLabel('User ID', { exact: true }).fill(userId);
  await page.getByRole('button', { name: 'Lưu phân công', exact: true }).click();
  await expect(page.getByRole('form', { name: 'Thông tin tiếp nhận PT' })).toHaveCount(0);
  if (status === 401) await expect(page).toHaveURL(/\/login/);
  else await expect(page.getByRole('heading', { name: 'Không có quyền truy cập' })).toBeVisible();
  expect(writes).toHaveLength(1);
});

test('Recovery reads later roster pages; account-only outcome stays locked', async ({ page }) => {
  const { writes } = await setup(page, { existing: true, write: async route => { await route.abort('failed'); } });
  let includeAssignment = false;
  const pages: string[] = [];
  await page.route('**/api/v1/gyms/*/management/trainers*', async route => {
    const pageIndex = new URL(route.request().url()).searchParams.get('page'); pages.push(pageIndex!);
    await route.fulfill({ json: { success: true, data: includeAssignment && pageIndex === '2' ? [{ user_id: userId, status: 'ACTIVE' }] : [], pagination: { page: Number(pageIndex), pageSize: 100, totalItems: 101, totalPages: 2, hasNextPage: pageIndex === '1', hasPreviousPage: pageIndex === '2' } } });
  });
  await page.goto(`/admin/gyms/${gymA}/trainers/assign`);
  await provision(page);
  await page.getByRole('button', { name: 'Cấp tài khoản', exact: true }).click();
  await page.getByRole('button', { name: 'Đối soát kết quả', exact: true }).click();
  await expect(page.getByText('Tài khoản đã tồn tại nhưng chưa thấy phân công', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cấp tài khoản', exact: true })).toBeDisabled();
  expect(pages).toEqual(['1', '2']);
  includeAssignment = true;
  await page.getByRole('button', { name: 'Đối soát kết quả', exact: true }).click();
  await expect(page.getByText('Phân công đã được lưu.', { exact: false })).toBeVisible();
  expect(writes).toHaveLength(1);
});

test('Logout clears one-time credentials and returning to intake starts a new form', async ({ page }) => {
  await setup(page);
  await page.goto(`/admin/gyms/${gymA}/trainers/assign`);
  await provision(page);
  await page.getByRole('button', { name: 'Cấp tài khoản', exact: true }).click();
  await expect(page.getByLabel('Mật khẩu tạm')).toBeVisible();
  await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByLabel('Mật khẩu tạm')).toHaveCount(0);
  await page.goto(`/admin/gyms/${gymA}/trainers/assign`);
  await expect(page.getByLabel('User ID', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Mật khẩu tạm')).toHaveCount(0);
});

test('An INACTIVE pair found during reconciliation is not treated as an ACTIVE success or recreated', async ({ page }) => {
  const { writes } = await setup(page, { write: async route => { await route.abort('failed'); } });
  await page.route('**/api/v1/gyms/*/management/trainers*', async route => {
    await route.fulfill({ json: { success: true, data: [{ user_id: userId, status: 'INACTIVE' }], pagination: { page: 1, pageSize: 100, totalItems: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false } } });
  });
  await page.goto(`/admin/gyms/${gymA}/trainers/assign`);
  await page.getByLabel('User ID', { exact: true }).fill(userId);
  await page.getByRole('button', { name: 'Lưu phân công', exact: true }).click();
  await page.getByRole('button', { name: 'Đối soát kết quả', exact: true }).click();
  await expect(page.getByText('Phân công hiện đang ngừng hoạt động.', { exact: false })).toBeVisible();
  await expect(page.getByText('Phân công đã được lưu.', { exact: false })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Lưu phân công', exact: true })).toBeDisabled();
  expect(writes).toHaveLength(1);
});
