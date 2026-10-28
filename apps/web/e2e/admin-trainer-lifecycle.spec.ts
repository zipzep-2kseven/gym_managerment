import { test, expect, type Page, type Route, request } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const gymId = '10000000-0000-4000-8000-000000000001';
const trainerId = '20000000-0000-4000-8000-000000000001';
const userId = '30000000-0000-4000-8000-000000000001';
const setup = async (page: Page, options: { inactiveGym?: boolean; inactiveTrainer?: boolean; accountStatus?: string; roles?: string[]; otherGym?: boolean; obligations?: boolean; write?: (route: Route) => Promise<void> } = {}) => {
  let status = options.inactiveTrainer ? 'INACTIVE' : 'ACTIVE';
  let readError = false, obligations = !!options.obligations;
  const writes: Record<string, unknown>[] = [], reads: URL[] = [];
  const row = () => ({ gym_trainer_id: trainerId, gym_id: gymId, user_id: userId, status, specialization: 'Sức mạnh', bio: null, experience_years: 0, availability: 'NOT_ACCEPTING', joined_at: '2026-10-01T00:00:00Z', created_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-01T00:00:00Z' });
  const registration = { registration_id: 'reg', gym_trainer_id: trainerId, status: 'ACTIVE' };
  const pagination = (data: unknown[], pageIndex = 1) => ({ page: pageIndex, pageSize: 20, totalItems: data.length, totalPages: data.length ? 1 : 0, hasNextPage: false, hasPreviousPage: false });
  await page.route('**/api/v1/**', async route => {
    const req = route.request(), url = new URL(req.url());
    if (req.method() === 'PATCH') {
      writes.push({ path: url.pathname, body: req.postDataJSON() });
      if (options.write) return options.write(route);
      status = req.postDataJSON().status;
      return route.fulfill({ json: { success: true, data: row() } });
    }
    if (url.pathname.endsWith('/auth/me')) return route.fulfill({ json: { success: true, data: { user_id: 'admin', roles: ['ADMIN'], status: 'ACTIVE', must_change_password: false, active_gym_assignments: [] } } });
    reads.push(url);
    if (readError) return route.fulfill({ status: 500, json: { success: false, error: { code: 'SERVER_ERROR', message: 'Đọc thất bại' } } });
    if (url.pathname.endsWith('/admin/gyms')) return route.fulfill({ json: { success: true, data: [{ gym_id: gymId, gym_name: 'Gym Lifecycle', address: 'Địa chỉ mẫu', status: options.inactiveGym ? 'INACTIVE' : 'ACTIVE' }], pagination: pagination([1]) } });
    if (url.pathname.endsWith('/admin/users')) return route.fulfill({ json: { success: true, data: { items: [{ user_id: userId, status: options.accountStatus || 'ACTIVE', roles: options.roles || ['PT'], active_gym_assignments: options.otherGym ? [{ gym_id: 'other', assignment_type: 'PT' }] : [] }], page: 1, page_size: 20, total: 1 } } });
    let data: unknown[] = [];
    if (url.pathname.endsWith('/management/trainers')) {
      data = !url.searchParams.get('status') || url.searchParams.get('status') === status ? [row()] : [];
    }
    if (obligations && url.pathname.endsWith('/pt-registrations')) data = [registration];
    if (obligations && url.pathname.endsWith('/pt-appointments')) data = [{ appointment_id: 'apt', status: 'CONFIRMED', start_time: '2020-01-01T00:00:00Z', registration }];
    return route.fulfill({ json: { success: true, data, pagination: pagination(data, Number(url.searchParams.get('page')) || 1) } });
  });
  return { writes, reads, setReadError: (value: boolean) => { readError = value; }, clearObligations: () => { obligations = false; }, setStatus: (value: string) => { status = value; } };
};
const open = async (page: Page, active = true) => {
  await page.goto(`/admin/gyms/${gymId}/trainers`);
  await page.getByRole('button', { name: active ? 'Ngừng PT' : 'Kích hoạt PT', exact: true }).click();
  await expect(page.getByRole('heading', { name: active ? 'Xác nhận ngừng phân công PT' : 'Xác nhận kích hoạt phân công PT' })).toBeFocused();
};

test('Real API/DB: duplicate INACTIVE pair is preserved, explicit activation reuses it and late Gym shutdown rejects activation', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill('admin@gym03.test');
  await page.locator('input[name=password]').fill('BrowserFixture@123');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL('http://127.0.0.1:3104/');
  const base = 'http://127.0.0.1:4103/api/v1';
  const created = await page.request.post(`${base}/gyms`, { data: { gym_name: 'Acceptance Gym R16', address: 'Cơ sở nghiệm thu PT' } });
  expect(created.status()).toBe(201);
  const id = (await created.json()).data.gym_id;
  const provisioned = await page.request.post(`${base}/gyms/${id}/trainers/provision`, { data: { full_name: 'PT nghiệm thu R16', email: 'r16-acceptance@test.com', specialization: 'Giữ chuyên môn R16', experience_years: 0, bio: 'Giữ tiểu sử R16' } });
  expect(provisioned.status()).toBe(201);
  const before = (await (await page.request.get(`${base}/gyms/${id}/management/trainers`)).json()).data[0];
  const accountBefore = (await (await page.request.get(`${base}/admin/users?search=r16-acceptance%40test.com&page=1&pageSize=20`)).json()).data.items[0];
  const statusPath = `${base}/gyms/${id}/trainers/${before.gym_trainer_id}/status`;
  expect((await page.request.patch(statusPath, { data: { status: 'INACTIVE' } })).status()).toBe(200);
  await page.goto(`/admin/gyms/${id}/trainers/assign`);
  await page.getByLabel('User ID', { exact: true }).fill(before.user_id);
  await page.getByLabel('Tiểu sử', { exact: true }).fill('Không được ghi đè');
  const duplicate = page.waitForResponse(response => response.url().endsWith(`/gyms/${id}/trainers`) && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Lưu phân công', exact: true }).click();
  const rejected = await duplicate;
  expect(rejected.status()).toBe(409); expect((await rejected.json()).error.code).toBe('ASSIGNMENT_ALREADY_EXISTS');
  await expect(page.getByRole('alert')).toBeVisible();
  const inactive = (await (await page.request.get(`${base}/gyms/${id}/management/trainers`)).json()).data;
  expect(inactive).toHaveLength(1); expect(inactive[0].status).toBe('INACTIVE'); expect(inactive[0].bio).toBe(before.bio);
  await page.getByRole('link', { name: 'Quay lại danh sách PT', exact: true }).click();
  await page.getByRole('button', { name: 'Kích hoạt PT', exact: true }).click();
  await page.getByRole('button', { name: 'Xác nhận kích hoạt PT', exact: true }).click();
  await expect(page.getByText('Đã kích hoạt phân công PT.', { exact: false })).toBeVisible();
  const after = (await (await page.request.get(`${base}/gyms/${id}/management/trainers`)).json()).data[0];
  for (const key of ['gym_trainer_id', 'user_id', 'joined_at', 'created_at', 'bio', 'specialization', 'availability', 'experience_years']) expect(after[key]).toBe(before[key]);
  const accountAfter = (await (await page.request.get(`${base}/admin/users?search=r16-acceptance%40test.com&page=1&pageSize=20`)).json()).data.items[0];
  for (const key of ['status', 'roles', 'must_change_password', 'profile']) expect(accountAfter[key]).toEqual(accountBefore[key]);
  expect((await page.request.patch(`${base}/gyms/${id}/trainers/${before.gym_trainer_id}/availability`, { data: { availability: 'ACCEPTING' } })).status()).toBe(403);
  const guest = await request.newContext();
  try {
    expect((await guest.patch(statusPath, { data: { status: 'INACTIVE' } })).status()).toBe(401);
    expect((await guest.post(`${base}/auth/login`, { data: { email: 'manager@gym03.test', password: 'BrowserFixture@123' } })).status()).toBe(200);
    expect((await guest.patch(statusPath, { data: { status: 'INACTIVE' } })).status()).toBe(403);
  } finally { await guest.dispose(); }
  expect((await page.request.patch(statusPath, { data: { status: 'INACTIVE' } })).status()).toBe(200);
  await page.reload();
  await page.getByRole('button', { name: 'Kích hoạt PT', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Xác nhận kích hoạt PT', exact: true })).toBeEnabled();
  expect((await page.request.patch(`${base}/gyms/${id}/status`, { data: { status: 'INACTIVE' } })).status()).toBe(200);
  const late = page.waitForResponse(response => response.url() === statusPath && response.request().method() === 'PATCH');
  await page.getByRole('button', { name: 'Xác nhận kích hoạt PT', exact: true }).click();
  const lateResponse = await late;
  expect(lateResponse.status()).toBe(409); expect((await lateResponse.json()).error.code).toBe('GYM_INACTIVE');
  await page.getByRole('button', { name: 'Đọc lại điều kiện', exact: true }).click();
  await expect(page.getByText('Cơ sở đang ngừng hoạt động. Không thể kích hoạt PT.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Xác nhận kích hoạt PT', exact: true })).toBeDisabled();
});

for (const status of [400, 404, 500]) test(`Lifecycle HTTP ${status} keeps context and requires successful reads before a deliberate retry`, async ({ page }) => {
  const fixture = await setup(page, { write: async route => route.fulfill({ status, json: { success: false, error: { code: 'WRITE_REJECTED', message: 'Không lưu được trạng thái' } } }) });
  await open(page);
  await page.getByRole('button', { name: 'Xác nhận ngừng PT', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Không lưu được trạng thái');
  await expect(page.getByRole('region', { name: 'Xác nhận ngừng phân công PT' })).toContainText(userId);
  await expect(page.getByRole('button', { name: 'Xác nhận ngừng PT', exact: true })).toBeDisabled();
  expect(fixture.writes).toHaveLength(1);
  fixture.setReadError(true);
  await page.getByRole('button', { name: 'Đọc lại điều kiện', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Xác nhận ngừng PT', exact: true })).toBeDisabled();
  fixture.setReadError(false);
  await page.getByRole('button', { name: 'Đọc lại điều kiện', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Xác nhận ngừng PT', exact: true })).toBeEnabled();
  expect(fixture.writes).toHaveLength(1);
});

for (const phase of ['read', 'write']) for (const status of [401, 403]) test(`Lifecycle ${phase} HTTP ${status} rechecks lost Admin access and removes controls`, async ({ page }) => {
  const loseAccess = async (route: Route) => {
    await page.route('**/api/v1/auth/me', async auth => auth.fulfill(status === 401
      ? { status: 401, json: { success: false, error: { code: 'UNAUTHORIZED', message: 'Phiên hết hạn' } } }
      : { json: { success: true, data: { user_id: 'admin', roles: ['CUSTOMER'], status: 'ACTIVE', must_change_password: false, active_gym_assignments: [] } } }));
    await route.fulfill({ status, json: { success: false, error: { code: 'ACCESS_LOST', message: 'Không còn quyền' } } });
  };
  const { writes } = await setup(page, { write: loseAccess });
  if (phase === 'read') await page.route('**/api/v1/gyms/*/pt-registrations*', loseAccess);
  if (phase === 'read') {
    await page.goto(`/admin/gyms/${gymId}/trainers`);
    await page.getByRole('button', { name: 'Ngừng PT', exact: true }).click();
  } else {
    await open(page);
    await page.getByRole('button', { name: 'Xác nhận ngừng PT', exact: true }).click();
  }
  await expect(page.getByRole('heading', { name: 'Xác nhận ngừng phân công PT' })).toHaveCount(0);
  if (status === 401) await expect(page).toHaveURL(/\/login/);
  else await expect(page.getByRole('heading', { name: 'Không có quyền truy cập' })).toBeVisible();
  expect(writes).toHaveLength(phase === 'write' ? 1 : 0);
});

test('Activation scans later account pages without filtering out a revoked PT role', async ({ page }) => {
  const { writes } = await setup(page, { inactiveTrainer: true });
  const pages: string[] = [];
  await page.route('**/api/v1/admin/users*', async route => {
    const url = new URL(route.request().url()), index = url.searchParams.get('page');
    pages.push(index!); expect(url.searchParams.has('role')).toBe(false);
    await route.fulfill({ json: { success: true, data: { items: index === '2' ? [{ user_id: userId, status: 'ACTIVE', roles: ['CUSTOMER'], active_gym_assignments: [] }] : [], page: Number(index), page_size: 20, total: 21 } } });
  });
  await open(page, false);
  await expect(page.getByText('Tài khoản không còn vai trò PT.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Xác nhận kích hoạt PT', exact: true })).toBeDisabled();
  expect(pages).toEqual(['1', '2']); expect(writes).toEqual([]);
});

for (const change of ['gym', 'role']) test(`A ${change} change after activation preflight is rejected by the server and a fresh read blocks retry`, async ({ page }) => {
  const options = { inactiveTrainer: true, inactiveGym: false, roles: ['PT'], write: async (route: Route) => {
    if (change === 'gym') options.inactiveGym = true;
    else options.roles = ['CUSTOMER'];
    await route.fulfill({ status: change === 'gym' ? 409 : 403, json: { success: false, error: { code: change === 'gym' ? 'GYM_INACTIVE' : 'INSUFFICIENT_ROLE', message: 'Điều kiện đã thay đổi' } } });
  } };
  const { writes } = await setup(page, options);
  await open(page, false);
  await page.getByRole('button', { name: 'Xác nhận kích hoạt PT', exact: true }).click();
  await expect(page.getByText('Cần đọc lại điều kiện', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Đọc lại điều kiện', exact: true }).click();
  await expect(page.getByText(change === 'gym' ? 'Cơ sở đang ngừng hoạt động. Không thể kích hoạt PT.' : 'Tài khoản không còn vai trò PT.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Xác nhận kích hoạt PT', exact: true })).toBeDisabled();
  expect(writes).toHaveLength(1);
});

test('Confirmation identifies Gym/User/assignment, cancel restores focus and sends no write', async ({ page }) => {
  const { writes } = await setup(page);
  await open(page);
  const panel = page.getByRole('region', { name: 'Xác nhận ngừng phân công PT' });
  await expect(panel).toContainText(gymId); await expect(panel).toContainText(trainerId); await expect(panel).toContainText(userId);
  await page.getByRole('button', { name: 'Hủy', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Ngừng PT', exact: true })).toBeFocused();
  expect(writes).toEqual([]);
});

test('Pending blocks duplicate confirm/cancel and success preserves availability', async ({ page }) => {
  let release = () => {};
  const gate = new Promise<void>(resolve => { release = resolve; });
  const { writes } = await setup(page, { write: async route => { await gate; await route.fulfill({ json: { success: true, data: {} } }); } });
  await open(page);
  const button = page.getByRole('button', { name: 'Xác nhận ngừng PT', exact: true });
  await expect(button).toBeEnabled(); await button.click();
  await expect(page.getByRole('button', { name: 'Đang lưu…', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Hủy', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Đang lưu…', exact: true }).evaluate(node => node.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  expect(writes).toEqual([{ path: `/api/v1/gyms/${gymId}/trainers/${trainerId}/status`, body: { status: 'INACTIVE' } }]);
  release();
  await expect(page.getByText('Đã ngừng phân công PT.', { exact: false })).toBeFocused();
  await expect(page.getByText('Chưa nhận học viên', { exact: true })).toBeVisible();
});

test('Open registrations and overdue confirmed appointments block stopping until a fresh read', async ({ page }) => {
  const fixture = await setup(page, { obligations: true });
  await open(page);
  await expect(page.getByText('Đăng ký PT đang mở: 1 · Lịch hẹn đang mở: 1', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Xác nhận ngừng PT', exact: true })).toBeDisabled();
  fixture.clearObligations();
  await page.getByRole('button', { name: 'Đọc lại điều kiện', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Xác nhận ngừng PT', exact: true })).toBeEnabled();
  expect(fixture.writes).toEqual([]);
});

for (const options of [{ accountStatus: 'SUSPENDED' }, { roles: ['CUSTOMER'] }, { otherGym: true }]) test(`Activation blocks invalid account state ${JSON.stringify(options)}`, async ({ page }) => {
  const { writes } = await setup(page, { inactiveTrainer: true, ...options });
  await open(page, false);
  await expect(page.getByRole('button', { name: 'Xác nhận kích hoạt PT', exact: true })).toBeDisabled();
  await expect(page.getByRole('region', { name: 'Xác nhận kích hoạt phân công PT' }).getByRole('status')).toBeVisible();
  expect(writes).toEqual([]);
});

test('Activation succeeds with strict status body and no availability/profile write', async ({ page }) => {
  const { writes } = await setup(page, { inactiveTrainer: true });
  await open(page, false);
  await page.getByRole('button', { name: 'Xác nhận kích hoạt PT', exact: true }).click();
  await expect(page.getByText('Đã kích hoạt phân công PT.', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ngừng PT', exact: true })).toBeVisible();
  expect(writes).toEqual([{ path: `/api/v1/gyms/${gymId}/trainers/${trainerId}/status`, body: { status: 'ACTIVE' } }]);
});

test('INACTIVE Gym blocks activating, but stopping an active assignment remains available', async ({ page }) => {
  await setup(page, { inactiveGym: true, inactiveTrainer: true });
  await page.goto(`/admin/gyms/${gymId}/trainers`);
  await expect(page.getByRole('button', { name: 'Kích hoạt PT', exact: true })).toBeDisabled();
  await setup(page, { inactiveGym: true });
  await open(page);
  await expect(page.getByRole('button', { name: 'Xác nhận ngừng PT', exact: true })).toBeEnabled();
});

for (const network of [false, true]) test(`Conflict/unknown ${network ? 'network' : '409'} requires successful reads before a second confirmation`, async ({ page }) => {
  const fixture = await setup(page, { write: async route => {
    if (network) return route.abort('failed');
    await route.fulfill({ status: 409, json: { success: false, error: { code: 'TRAINER_HAS_OPEN_OBLIGATIONS', message: 'Nghĩa vụ mới phát sinh', details: { registrations: 2, appointments: 3 } } } });
  } });
  await open(page);
  await page.getByRole('button', { name: 'Xác nhận ngừng PT', exact: true }).click();
  await expect(page.getByText('Cần đọc lại điều kiện', { exact: false })).toBeVisible();
  if (!network) { await expect(page.getByRole('alert')).toContainText('Đăng ký PT: 2'); await expect(page.getByRole('alert')).toContainText('Lịch hẹn: 3'); }
  fixture.setReadError(true);
  await page.getByRole('button', { name: 'Đọc lại điều kiện', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Xác nhận ngừng PT', exact: true })).toBeDisabled();
  fixture.setReadError(false);
  await page.getByRole('button', { name: 'Đọc lại điều kiện', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Xác nhận ngừng PT', exact: true })).toBeEnabled();
  expect(fixture.writes).toHaveLength(1);
});

test('Removing the last matching row recovers a now-invalid page after mutation', async ({ page }) => {
  const fixture = await setup(page);
  const base = '20000000-0000-4000-8000-';
  await page.route('**/api/v1/gyms/*/management/trainers*', async route => {
    const url = new URL(route.request().url()), isPreflight = url.searchParams.get('pageSize') === '100';
    const mutated = fixture.writes.length > 0;
    const row = { gym_trainer_id: trainerId, gym_id: gymId, user_id: userId, status: 'ACTIVE', specialization: 'Trang cuối', availability: 'NOT_ACCEPTING', experience_years: 0, joined_at: '2026-10-01T00:00:00Z' };
    const data = isPreflight ? [row] : url.searchParams.get('page') === '2' ? (mutated ? [] : [row]) : [{ ...row, gym_trainer_id: base + '000000000002' }];
    await route.fulfill({ json: { success: true, data, pagination: { page: Number(url.searchParams.get('page')), pageSize: isPreflight ? 100 : 20, totalItems: mutated ? 20 : 21, totalPages: mutated ? 1 : 2, hasNextPage: !mutated, hasPreviousPage: true } } });
  });
  await page.goto(`/admin/gyms/${gymId}/trainers?page=2&status=ACTIVE`);
  await page.getByRole('button', { name: 'Ngừng PT', exact: true }).click();
  await page.getByRole('button', { name: 'Xác nhận ngừng PT', exact: true }).click();
  await expect(page).toHaveURL(/page=1/);
  await expect(page.getByText('Đã ngừng phân công PT.', { exact: false })).toBeVisible();
});

test('Confirmation wraps long IDs and passes axe on mobile/desktop', async ({ page }) => {
  await setup(page); await open(page);
  await expect(page.getByRole('button', { name: 'Xác nhận ngừng PT', exact: true })).toBeEnabled();
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if ([375, 1440].includes(width)) expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
  }
  await page.screenshot({ path: '/tmp/multi-gym-r15-lifecycle-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 375, height: 1000 });
  await page.screenshot({ path: '/tmp/multi-gym-r15-lifecycle-mobile.png', fullPage: true });
});

test('Real API/DB: read obligations, resolve via allowed actors, stop/reactivate and preserve history', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill('admin@gym03.test');
  await page.locator('input[name=password]').fill('BrowserFixture@123');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL('http://127.0.0.1:3104/');
  const base = 'http://127.0.0.1:4103/api/v1';
  const gyms = await (await page.request.get(`${base}/admin/gyms`)).json();
  const gym = gyms.data.find((row: { gym_name: string }) => row.gym_name === 'Lifecycle Gym').gym_id;
  const before = (await (await page.request.get(`${base}/gyms/${gym}/management/trainers`)).json()).data[0];
  await page.goto(`/admin/gyms/${gym}/trainers`);
  await page.getByRole('button', { name: 'Ngừng PT', exact: true }).click();
  await expect(page.getByText('Đăng ký PT đang mở: 1 · Lịch hẹn đang mở: 1', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Xác nhận ngừng PT', exact: true })).toBeDisabled();
  const registrations = (await (await page.request.get(`${base}/gyms/${gym}/pt-registrations`)).json()).data;
  const appointments = (await (await page.request.get(`${base}/gyms/${gym}/pt-appointments`)).json()).data;
  const blocked = await page.request.patch(`${base}/gyms/${gym}/trainers/${before.gym_trainer_id}/status`, { data: { status: 'INACTIVE' } });
  expect(blocked.status()).toBe(409); expect((await blocked.json()).error.details.appointments).toBe(1);
  const pt = await request.newContext();
  try {
    expect((await pt.post(`${base}/auth/login`, { data: { email: 'lifecyclept@gym03.test', password: 'BrowserFixture@123' } })).status()).toBe(200);
    const cancelled = await pt.patch(`${base}/gyms/${gym}/pt-appointments/${appointments[0].appointment_id}/cancel`, { data: { note: 'Fixture đóng nghĩa vụ trước lifecycle' } });
    expect(cancelled.status()).toBe(200);
  } finally { await pt.dispose(); }
  const end = await page.request.patch(`${base}/gyms/${gym}/pt-registrations/${registrations[0].registration_id}/cancel`, { data: { note: 'Fixture kết thúc đăng ký' } });
  expect(end.status()).toBe(200);
  await page.getByRole('button', { name: 'Đọc lại điều kiện', exact: true }).click();
  await page.getByRole('button', { name: 'Xác nhận ngừng PT', exact: true }).click();
  await expect(page.getByText('Đã ngừng phân công PT.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Kích hoạt PT', exact: true }).click();
  await page.getByRole('button', { name: 'Xác nhận kích hoạt PT', exact: true }).click();
  await expect(page.getByText('Đã kích hoạt phân công PT.', { exact: false })).toBeVisible();
  const after = (await (await page.request.get(`${base}/gyms/${gym}/management/trainers`)).json()).data[0];
  for (const key of ['gym_trainer_id', 'user_id', 'joined_at', 'specialization', 'availability']) expect(after[key]).toBe(before[key]);
  expect(after.status).toBe('ACTIVE');
  const history = (await (await page.request.get(`${base}/gyms/${gym}/pt-appointments`)).json()).data;
  expect(history[0].appointment_id).toBe(appointments[0].appointment_id); expect(history[0].status).toBe('CANCELLED');
});

test('A committed status change with lost response is read back without repeating PATCH', async ({ page }) => {
  const fixture = await setup(page, { write: async route => { fixture.setStatus('INACTIVE'); await route.abort('failed'); } });
  await open(page);
  await page.getByRole('button', { name: 'Xác nhận ngừng PT', exact: true }).click();
  await expect(page.getByText('Cần đọc lại điều kiện', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Đọc lại điều kiện', exact: true }).click();
  await expect(page.getByText('Phân công đã ở trạng thái yêu cầu.', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Xác nhận ngừng PT', exact: true })).toBeDisabled();
  expect(fixture.writes).toHaveLength(1);
});

test('Successful PATCH remains visible if the following Gym and roster refreshes fail', async ({ page }) => {
  const fixture = await setup(page, { write: async route => {
    fixture.setReadError(true);
    await route.fulfill({ json: { success: true, data: {} } });
  } });
  await open(page);
  await page.getByRole('button', { name: 'Xác nhận ngừng PT', exact: true }).click();
  await expect(page.getByText('Đã ngừng phân công PT.', { exact: false })).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('Đọc thất bại');
  expect(fixture.writes).toHaveLength(1);
});

test('Preflight counts all pages and does not exclude overdue PENDING appointments', async ({ page }) => {
  await setup(page);
  const pages: string[] = [];
  for (const resource of ['pt-registrations', 'pt-appointments']) await page.route(`**/api/v1/gyms/*/${resource}*`, async route => {
    const pageIndex = new URL(route.request().url()).searchParams.get('page'); pages.push(`${resource}:${pageIndex}`);
    const reg = { registration_id: 'reg2', gym_trainer_id: trainerId, status: 'ACTIVE' };
    await route.fulfill({ json: { success: true, data: pageIndex === '2' ? [resource === 'pt-registrations' ? reg : { appointment_id: 'apt2', status: 'PENDING', start_time: '2020-01-01T00:00:00Z', registration: reg }] : [], pagination: { page: Number(pageIndex), pageSize: 20, totalItems: 21, totalPages: 2, hasNextPage: pageIndex === '1', hasPreviousPage: pageIndex === '2' } } });
  });
  await open(page);
  await expect(page.getByText('Đăng ký PT đang mở: 1 · Lịch hẹn đang mở: 1', { exact: false })).toBeVisible();
  expect(pages).toEqual(['pt-registrations:1', 'pt-registrations:2', 'pt-appointments:1', 'pt-appointments:2']);
  await page.getByRole('heading', { name: 'Xác nhận ngừng phân công PT' }).press('Escape');
  await expect(page.getByRole('button', { name: 'Ngừng PT', exact: true })).toBeFocused();
});

test('Changing Gym within the SPA and returning does not resurrect an old confirmation', async ({ page }) => {
  await setup(page);
  const other = '10000000-0000-4000-8000-000000000002';
  await page.route('**/api/v1/admin/gyms*', async route => {
    await route.fulfill({ json: { success: true, data: [gymId, other].map(id => ({ gym_id: id, gym_name: id === gymId ? 'Gym Lifecycle' : 'Gym khác', address: 'Địa chỉ mẫu', status: 'ACTIVE' })), pagination: { page: 1, pageSize: 100, totalItems: 2, totalPages: 1, hasNextPage: false, hasPreviousPage: false } } });
  });
  await open(page);
  await page.evaluate(id => {
    history.pushState({ key: 'gym-switch' }, '', `/admin/gyms/${id}/trainers`);
    dispatchEvent(new PopStateEvent('popstate'));
  }, other);
  await expect(page.getByRole('region', { name: 'Cơ sở đang chọn' })).toContainText('Gym khác');
  await expect(page.getByRole('heading', { name: 'Xác nhận ngừng phân công PT' })).toHaveCount(0);
  await page.goBack();
  await expect(page.getByRole('region', { name: 'Cơ sở đang chọn' })).toContainText('Gym Lifecycle');
  await expect(page.getByRole('heading', { name: 'Xác nhận ngừng phân công PT' })).toHaveCount(0);
});
