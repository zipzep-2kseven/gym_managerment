import { test, expect, type Page, type Route } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { Registration, Appointment } from '../src/types/pt.types';
const gym = '10000000-0000-4000-8000-000000000001';
const otherGym = '10000000-0000-4000-8000-000000000002';
const reg = (i: number): Registration => ({ registration_id: `20000000-0000-4000-8000-${String(i).padStart(12, '0')}`, membership_id: 'card', gym_trainer_id: 'trainer', status: 'ACTIVE', note: 'Ghi chú đăng ký',
  customer: { user_id: 'customer', full_name: null }, trainer: { user_id: 'trainer', gym_trainer_id: 'trainer', full_name: 'PT ' + 'tên dài '.repeat(12) },
  gym: { gym_id: gym, gym_name: 'Gym A' }, membership: { membership_id: 'card', gym_id: gym, user_id: 'customer', start_date: '2026-10-01', end_date: '2026-12-01', status: 'ACTIVE' } });
const apt = (i: number): Appointment => ({ appointment_id: `30000000-0000-4000-8000-${String(i).padStart(12, '0')}`, registration_id: reg(i).registration_id, registration: reg(i), start_time: '2026-10-20T02:00:00Z', end_time: '2026-10-20T03:00:00Z', status: (['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'] as const)[(i - 1) % 4], note: 'Ghi chú buổi tập' });
const setup = async (page: Page, options: { rows?: Registration[]; write?: (route: Route) => Promise<void>; readError?: () => number; role?: string } = {}) => {
  const reads: URL[] = [], writes: string[] = [];
  const rows = options.rows || Array.from({ length: 25 }, (_, i) => reg(i + 1));
  await page.route('**/api/v1/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/auth/me')) return route.fulfill({ json: { success: true, data: { user_id: 'admin', roles: [options.role || 'ADMIN'], status: 'ACTIVE', must_change_password: false, profile: { full_name: 'Admin' }, active_gym_assignments: [] } } });
    if (route.request().method() !== 'GET') { writes.push(url.pathname); return options.write ? options.write(route) : route.fulfill({ json: { success: true, data: { ...rows[0], status: 'CANCELLED' } } }); }
    reads.push(url);
    if (url.pathname.endsWith('/admin/gyms')) return route.fulfill({ json: { success: true, data: [gym, otherGym].map(id => ({ gym_id: id, gym_name: id === gym ? 'Gym A' : 'Gym B', address: 'Địa chỉ cơ sở', status: 'INACTIVE' })), pagination: { page: 1, pageSize: 100, totalItems: 2, totalPages: 1 } } });
    const code = options.readError?.() || 0;
    if (code) return route.fulfill({ status: code, json: { success: false, error: { code: 'READ_ERROR', message: 'Không có quyền truy cập' } } });
    const list = url.pathname.includes('pt-registrations') ? rows : Array.from({ length: 23 }, (_, i) => apt(i + 1));
    const index = Number(url.searchParams.get('page')) || 1;
    return route.fulfill({ json: { success: true, data: list.slice((index - 1) * 20, index * 20), pagination: { page: index, pageSize: 20, totalItems: list.length, totalPages: Math.ceil(list.length / 20), hasNextPage: index * 20 < list.length, hasPreviousPage: index > 1 } } });
  });
  return { rows, reads, writes };
};
const registrations = (page: Page) => page.getByRole('region', { name: 'Đăng ký PT', exact: true });
const appointments = (page: Page) => page.getByRole('region', { name: 'Lịch tập', exact: true });
const end = (page: Page) => registrations(page).getByRole('button', { name: 'Kết thúc đăng ký / đổi PT' }).first();
const form = (page: Page) => page.getByRole('region', { name: 'Kết thúc đăng ký PT', exact: true });
test.use({ timezoneId: 'America/Los_Angeles' });

test('Independent paging, source totals, inactive Gym and read-only appointments in Vietnam time', async ({ page }) => {
  const { reads, writes } = await setup(page);
  await page.goto(`/admin/gyms/${gym}/pt`);
  await expect(page.getByRole('region', { name: 'Cơ sở đang chọn' })).toContainText('Gym A');
  await expect(registrations(page).getByText('25 đăng ký', { exact: true })).toBeVisible();
  await expect(appointments(page).getByText('23 lịch tập', { exact: true })).toBeVisible();
  await expect(appointments(page).getByRole('article').first().locator('time').first()).toHaveAttribute('datetime', '2026-10-20T02:00:00Z');
  await expect(appointments(page).getByRole('article').first().locator('time').first()).toContainText('09:00');
  await registrations(page).getByRole('button', { name: 'Trang sau' }).click();
  await expect(registrations(page).getByRole('article')).toHaveCount(5);
  await expect(appointments(page).getByRole('article')).toHaveCount(20);
  await appointments(page).getByRole('button', { name: 'Trang sau' }).click();
  await expect(appointments(page).getByRole('article')).toHaveCount(3);
  for (const name of ['Đặt lịch tập', 'Dời lịch', 'Hủy lịch', 'Xác nhận lịch', 'Hoàn thành buổi tập', 'Lưu trạng thái nhận học viên']) await expect(page.getByRole('button', { name, exact: true })).toHaveCount(0);
  expect(reads.filter(url => url.pathname.includes('pt-')).every(url => url.searchParams.get('pageSize') === '20')).toBe(true);
  expect(writes).toEqual([]);
});
test('Escape and close return focus; whitespace reason sends nothing', async ({ page }) => {
  const { writes } = await setup(page, { rows: [reg(1)] });
  await page.goto(`/admin/gyms/${gym}/pt`); await end(page).click();
  await expect(page.getByLabel('Lý do', { exact: true })).toBeFocused();
  await page.getByLabel('Lý do', { exact: true }).fill('  ');
  await expect(page.getByRole('button', { name: 'Xác nhận kết thúc', exact: true })).toBeDisabled();
  await page.keyboard.press('Escape'); await expect(end(page)).toBeFocused(); expect(writes).toEqual([]);
});
test('Pending cancellation locks both pagers and prevents duplicate writes; receipt requires readback', async ({ page }) => {
  let release = () => {}; const gate = new Promise<void>(resolve => { release = resolve; });
  const rows = [reg(1)];
  const { writes } = await setup(page, { rows, write: async route => { await gate; rows[0] = { ...rows[0], status: 'CANCELLED', note: 'Đổi PT' }; await route.fulfill({ json: { success: true, data: rows[0] } }); } });
  await page.goto(`/admin/gyms/${gym}/pt`); await end(page).click(); await page.getByLabel('Lý do', { exact: true }).fill('Đổi PT');
  await page.getByRole('button', { name: 'Xác nhận kết thúc', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Đang gửi…' })).toBeDisabled();
  await expect(appointments(page).getByRole('button', { name: 'Trang sau' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Làm mới danh sách' })).toBeDisabled();
  release(); await expect(form(page)).toContainText('Máy chủ đã xác nhận');
  await page.getByRole('button', { name: 'Đọc lại kết quả' }).click(); await expect(form(page)).toContainText('Trạng thái hiện tại: CANCELLED');
  await page.getByRole('button', { name: 'Đóng', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Làm mới danh sách' })).toBeFocused(); expect(writes).toHaveLength(1);
});
test('409 obligation preserves reason, reads current state, then needs explicit fresh confirmation', async ({ page }) => {
  const { writes } = await setup(page, { rows: [reg(1)], write: route => route.fulfill({ status: 409, json: { success: false, error: { code: 'REGISTRATION_HAS_OPEN_APPOINTMENTS', message: 'Cần xử lý các lịch đang mở' } } }) });
  await page.goto(`/admin/gyms/${gym}/pt`); await end(page).click(); await page.getByLabel('Lý do', { exact: true }).fill('Giữ bản nháp');
  await page.getByRole('button', { name: 'Xác nhận kết thúc' }).click(); await expect(page.getByRole('alert')).toContainText('lịch đang mở');
  await expect(page.getByLabel('Lý do', { exact: true })).toHaveValue('Giữ bản nháp');
  await expect(page.getByRole('button', { name: 'Xác nhận kết thúc' })).toBeDisabled();
  await page.getByRole('button', { name: 'Đọc lại kết quả' }).click(); await expect(form(page)).toContainText('ACTIVE');
  await page.getByRole('button', { name: 'Dùng trạng thái vừa đọc' }).click();
  await expect(page.getByRole('button', { name: 'Xác nhận kết thúc' })).toBeEnabled(); expect(writes).toHaveLength(1);
});
test('Lost response after commit reads terminal state and never retries the write', async ({ page }) => {
  const rows = [reg(1)]; const { writes } = await setup(page, { rows, write: async route => { rows[0] = { ...rows[0], status: 'CANCELLED' }; await route.abort('failed'); } });
  await page.goto(`/admin/gyms/${gym}/pt`); await end(page).click(); await page.getByLabel('Lý do', { exact: true }).fill('Đổi PT');
  await page.getByRole('button', { name: 'Xác nhận kết thúc' }).click(); await expect(page.getByRole('button', { name: 'Đọc lại kết quả' })).toBeEnabled();
  await page.getByRole('button', { name: 'Đọc lại kết quả' }).click(); await expect(form(page)).toContainText('CANCELLED');
  await expect(page.getByRole('button', { name: 'Dùng trạng thái vừa đọc' })).toHaveCount(0); expect(writes).toHaveLength(1);
});
test('Refetch permission loss hides cached registrations and appointments', async ({ page }) => {
  let code = 0; await setup(page, { readError: () => code });
  await page.goto(`/admin/gyms/${gym}/pt`); await expect(registrations(page).getByRole('article')).toHaveCount(20);
  code = 403; await page.getByRole('button', { name: 'Làm mới danh sách' }).click();
  await expect(page.getByRole('alert')).toBeVisible(); await expect(page.getByRole('article')).toHaveCount(0);
});
test('Invalid Gym triggers no scoped request; switching Gym resets both pages', async ({ page }) => {
  const { reads } = await setup(page); await page.goto('/admin/gyms/invalid/pt');
  await expect(page.getByRole('heading', { name: 'Cơ sở không hợp lệ' })).toBeVisible(); expect(reads.filter(url => url.pathname.includes('pt-'))).toHaveLength(0);
  await page.goto(`/admin/gyms/${gym}/pt`); await registrations(page).getByRole('button', { name: 'Trang sau' }).click();
  await page.goto(`/admin/gyms/${otherGym}/pt`); await expect(registrations(page).getByRole('article')).toHaveCount(20);
  expect(reads.filter(url => url.pathname.includes(otherGym) && url.pathname.includes('pt-')).every(url => url.searchParams.get('page') === '1')).toBe(true);
});
test('Responsive layout and accessible confirmation with long labels', async ({ page }) => {
  await setup(page, { rows: [reg(1)] }); await page.goto(`/admin/gyms/${gym}/pt`); await expect(end(page)).toBeEnabled();
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if ([375, 1440].includes(width)) await page.screenshot({ path: `../../docs/design/admin-frontend/previews/pt-workspace-${width === 375 ? 'mobile' : 'desktop'}.png`, fullPage: true });
  }
  await end(page).click();
  expect((await new AxeBuilder({ page }).include('main').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
});

test('Shrinking registration list recovers its page without moving appointments', async ({ page }) => {
  const { rows } = await setup(page);
  await page.goto(`/admin/gyms/${gym}/pt`);
  await registrations(page).getByRole('button', { name: 'Trang sau' }).click();
  await appointments(page).getByRole('button', { name: 'Trang sau' }).click();
  await expect(appointments(page).getByRole('article')).toHaveCount(3);
  rows.splice(1);
  await page.getByRole('button', { name: 'Làm mới danh sách' }).click();
  await expect(registrations(page).getByRole('article')).toHaveCount(1);
  await expect(page.getByRole('status').filter({ hasText: 'trang trước không còn dữ liệu' })).toContainText('Đăng ký PT');
  await expect(appointments(page).getByRole('article')).toHaveCount(3);
});

test('Uncertain write searches beyond the displayed page by registration ID', async ({ page }) => {
  const rows = Array.from({ length: 25 }, (_, i) => reg(i + 1));
  const { writes, reads } = await setup(page, { rows, write: async route => {
    const moved = { ...rows.shift()!, status: 'CANCELLED' as const }; rows.push(moved); await route.abort('failed');
  } });
  await page.goto(`/admin/gyms/${gym}/pt`); await end(page).click();
  await page.getByLabel('Lý do', { exact: true }).fill('Đổi PT');
  await page.getByRole('button', { name: 'Xác nhận kết thúc' }).click();
  await page.getByRole('button', { name: 'Đọc lại kết quả' }).click();
  await expect(form(page)).toContainText('Trạng thái hiện tại: CANCELLED');
  expect(reads.some(url => url.pathname.includes('pt-registrations') && url.searchParams.get('page') === '2')).toBe(true);
  await expect(page.getByRole('button', { name: 'Dùng trạng thái vừa đọc' })).toHaveCount(0);
  expect(writes).toHaveLength(1);
});

test('Successful receipt survives failed readback and preserves reason until retry succeeds', async ({ page }) => {
  let code = 0; const rows = [reg(1)];
  const { writes } = await setup(page, { rows, readError: () => code, write: async route => {
    rows[0] = { ...rows[0], status: 'CANCELLED' }; code = 500;
    await route.fulfill({ json: { success: true, data: rows[0] } });
  } });
  await page.goto(`/admin/gyms/${gym}/pt`); await end(page).click();
  await page.getByLabel('Lý do', { exact: true }).fill('Giữ lý do');
  await page.getByRole('button', { name: 'Xác nhận kết thúc' }).click();
  await expect(form(page)).toContainText('Máy chủ đã xác nhận');
  await page.getByRole('button', { name: 'Đọc lại kết quả' }).click();
  await expect(form(page).getByRole('alert')).toBeVisible();
  await expect(page.getByLabel('Lý do', { exact: true })).toHaveValue('Giữ lý do');
  await expect(form(page).getByRole('button', { name: 'Đóng', exact: true })).toBeDisabled();
  code = 0; await page.getByRole('button', { name: 'Đọc lại kết quả' }).click();
  await expect(form(page)).toContainText('Trạng thái hiện tại: CANCELLED');
  await expect(form(page).getByRole('button', { name: 'Đóng', exact: true })).toBeEnabled();
  expect(writes).toHaveLength(1);
});

for (const status of [401, 403]) test(`Write permission loss ${status} removes scoped data and confirmation`, async ({ page }) => {
  await setup(page, { rows: [reg(1)], write: route => route.fulfill({ status, json: { success: false, error: { code: 'FORBIDDEN', message: 'Quyền đã thay đổi' } } }) });
  await page.goto(`/admin/gyms/${gym}/pt`); await end(page).click();
  await page.getByLabel('Lý do', { exact: true }).fill('Đổi PT');
  await page.getByRole('button', { name: 'Xác nhận kết thúc' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(0); await expect(form(page)).toHaveCount(0);
});

test('Terminal registrations have no end action and empty lists recover explicitly', async ({ page }) => {
  const { rows, writes } = await setup(page, { rows: [{ ...reg(1), status: 'COMPLETED' }, { ...reg(2), status: 'CANCELLED' }] });
  await page.goto(`/admin/gyms/${gym}/pt`); await expect(registrations(page).getByRole('article')).toHaveCount(2);
  await expect(end(page)).toHaveCount(0);
  rows.splice(0); await page.getByRole('button', { name: 'Làm mới danh sách' }).click();
  await expect(registrations(page)).toContainText('Chưa có đăng ký PT.'); expect(writes).toEqual([]);
});

test('Rapid readback clicks issue one scan and lock recovery controls until the result arrives', async ({ page }) => {
  await setup(page, { rows: [reg(1)], write: route => route.abort('failed') });
  await page.goto(`/admin/gyms/${gym}/pt`); await end(page).click();
  await page.getByLabel('Lý do', { exact: true }).fill('Đổi PT');
  await page.getByRole('button', { name: 'Xác nhận kết thúc' }).click();
  await expect(page.getByRole('button', { name: 'Đọc lại kết quả' })).toBeEnabled();
  let release = () => {}; const gate = new Promise<void>(resolve => { release = resolve; }); let scans = 0;
  await page.route('**/pt-registrations?**', async route => {
    scans++; await gate;
    await route.fulfill({ json: { success: true, data: [reg(1)], pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false } } });
  });
  await page.getByRole('button', { name: 'Đọc lại kết quả' }).evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
  try {
    await expect.poll(() => scans).toBe(1);
    await expect(form(page).getByRole('button', { name: 'Đóng', exact: true })).toBeDisabled();
    await expect(form(page).getByRole('button', { name: 'Đang đọc lại…' })).toBeDisabled();
  } finally { release(); }
  await expect(form(page)).toContainText('Trạng thái hiện tại: ACTIVE');
});
