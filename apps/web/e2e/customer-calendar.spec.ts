import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const registration = (gym: string) => ({ registration_id: `reg-${gym}`, status: 'ACTIVE', membership: { start_date: '2026-01-01', end_date: '2027-12-31' }, customer: { user_id: 'customer', full_name: 'Hội viên' }, trainer: { user_id: `trainer-${gym}`, full_name: `PT ${gym}` }, gym: { gym_id: gym, gym_name: `Gym ${gym}` } });
const appointment = (id: string, gym: string, start: string, end: string, status = 'PENDING') => ({ appointment_id: id, registration_id: `reg-${gym}`, start_time: start, end_time: end, status, note: null as string | null, registration: registration(gym) });
async function fixture(page: Page) {
  await page.clock.setFixedTime(new Date('2026-10-09T01:00:00Z'));
  const state = { rows: [appointment('older', 'A', '2026-09-01T09:00:00+07:00', '2026-09-01T10:00:00+07:00', 'COMPLETED'), appointment('current', 'B', '2026-10-10T09:00:00+07:00', '2026-10-10T10:00:00+07:00', 'CONFIRMED'), appointment('midnight', 'A', '2026-10-10T23:30:00+07:00', '2026-10-11T00:00:00+07:00'), appointment('cross', 'A', '2026-10-11T23:30:00+07:00', '2026-10-12T00:30:00+07:00')], reads: [] as number[], writes: [] as { path: string; body: any }[], failure: false };
  await page.route('**/api/v1/**', async route => {
    const req = route.request(), url = new URL(req.url());
    if (url.pathname.endsWith('/auth/me')) return route.fulfill({ json: { success: true, data: { user_id: 'customer', roles: ['CUSTOMER'], status: 'ACTIVE', must_change_password: false, active_gym_assignments: [] } } });
    if (req.method() === 'PATCH') {
      const body = req.postDataJSON(); state.writes.push({ path: url.pathname, body });
      const row = state.rows.find(a => url.pathname.includes(`/${a.appointment_id}/`))!;
      if (url.pathname.endsWith('/cancel')) { row.status = 'CANCELLED'; row.note = body.note; }
      else { row.start_time = body.start_time; row.end_time = body.end_time; row.status = 'PENDING'; }
      return route.fulfill({ json: { success: true, data: row } });
    }
    if (url.pathname.endsWith('/pt-appointments/me')) {
      const pageNum = Number(url.searchParams.get('page')); state.reads.push(pageNum);
      expect(url.searchParams.get('pageSize')).toBe('100');
      if (state.failure && pageNum === 2) return route.fulfill({ status: 503, json: { success: false, error: { code: 'UNAVAILABLE', message: 'Không tải được trang lịch tiếp theo' } } });
      return route.fulfill({ json: { success: true, data: pageNum === 1 ? state.rows.slice(0, 1) : state.rows.slice(1), pagination: { page: pageNum, hasNextPage: pageNum === 1, totalPages: 2, totalItems: state.rows.length } } });
    }
    return route.fulfill({ json: { success: true, data: [], pagination: { page: 1, hasNextPage: false, totalPages: 0, totalItems: 0 } } });
  });
  await page.goto('/my-pt'); await expect(page.getByRole('article')).toHaveCount(4);
  return state;
}
test('All pages, Vietnam day/week, half-open midnight and Gym/status filters', async ({ page }) => {
  const state = await fixture(page); expect(state.reads).toContain(2); expect(state.reads.slice(-2)).toEqual([1, 2]);
  await page.getByRole('button', { name: 'Tuần', exact: true }).click();
  await expect(page.locator('.pt-calendar-day')).toHaveCount(7);
  await expect(page.locator('.pt-calendar-day').first()).toContainText('05/10');
  await expect(page.locator('.pt-calendar-day').last()).toContainText('11/10');
  await expect(page.getByRole('article')).toHaveCount(3);
  await expect(page.locator('.pt-calendar-day').last().getByRole('article')).toHaveCount(1);
  await page.getByLabel('Gym', { exact: true }).selectOption('B'); await expect(page.getByRole('article')).toHaveCount(1);
  await expect(page.getByRole('article')).toContainText('09:00');
  await page.getByLabel('Trạng thái lịch').selectOption('CANCELLED'); await expect(page.getByRole('article')).toHaveCount(0);
  await page.getByLabel('Trạng thái lịch').selectOption(''); await page.getByLabel('Gym', { exact: true }).selectOption('');
  await page.getByRole('button', { name: 'Tuần sau', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(1); await expect(page.getByRole('article')).toContainText('Tiếp từ hôm trước');
  await page.getByRole('button', { name: 'Ngày', exact: true }).click();
  await page.getByLabel('Ngày xem lịch').fill('2026-10-11'); await expect(page.getByRole('article')).toHaveCount(1);
  await expect(page.getByRole('article')).toContainText('Qua ngày sau');
  await page.getByRole('button', { name: 'Ngày sau', exact: true }).click(); await expect(page.getByRole('article')).toContainText('00:30');
});
test('Customer detail, reschedule back to pending, reason required to cancel, Escape focus restore', async ({ page }) => {
  const state = await fixture(page); const event = page.getByRole('button', { name: /^Xem buổi tập PT B/ });
  await event.click(); const dialog = page.getByRole('dialog'); await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Đóng chi tiết' })).toBeFocused();
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
  await page.keyboard.press('Shift+Tab');
  // Native modal permits browser chrome focus (BODY); background controls stay inert.
  expect(await page.evaluate(() => document.activeElement === document.body || !!document.activeElement?.closest('dialog'))).toBe(true);
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Đóng chi tiết' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Dời lịch', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Hủy lịch', exact: true })).toBeFocused();
  await page.locator('.gym-brand').evaluate(element => (element as HTMLElement).focus());
  await expect(dialog.getByRole('button', { name: 'Hủy lịch', exact: true })).toBeFocused();
  await expect(dialog.getByRole('button', { name: 'Xác nhận lịch', exact: true })).toHaveCount(0);
  await expect(dialog.getByRole('button', { name: 'Hoàn thành', exact: true })).toHaveCount(0);
  await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0); await expect(event).toBeFocused();
  await event.click(); await dialog.getByRole('button', { name: 'Dời lịch', exact: true }).click();
  await expect(dialog.getByLabel('Bắt đầu', { exact: true })).toHaveValue('2026-10-10T09:00');
  await dialog.getByLabel('Bắt đầu', { exact: true }).fill('2026-10-12T14:00'); await dialog.getByLabel('Kết thúc', { exact: true }).fill('2026-10-12T15:00');
  await dialog.getByRole('button', { name: 'Gửi yêu cầu lịch', exact: true }).click(); await expect(dialog).toContainText('Chờ xác nhận');
  expect(state.writes[0]).toEqual({ path: '/api/v1/gyms/B/pt-appointments/current/reschedule', body: { start_time: '2026-10-12T14:00:00+07:00', end_time: '2026-10-12T15:00:00+07:00' } });
  await dialog.getByRole('button', { name: 'Hủy lịch', exact: true }).click(); await expect(dialog.getByRole('button', { name: 'Xác nhận', exact: true })).toBeDisabled();
  await dialog.getByLabel('Lý do').fill('Bận công việc'); await dialog.getByRole('button', { name: 'Xác nhận', exact: true }).click();
  await expect(dialog).toContainText('Đã hủy'); await expect(dialog.getByRole('button', { name: 'Dời lịch', exact: true })).toHaveCount(0);
  expect(state.writes[1]).toEqual({ path: '/api/v1/gyms/B/pt-appointments/current/cancel', body: { note: 'Bận công việc' } });
  await dialog.getByRole('button', { name: 'Đóng chi tiết' }).click();
  await page.getByRole('button', { name: /^Xem buổi tập PT A.*hoàn thành/ }).click(); await expect(dialog.getByRole('button', { name: 'Hủy lịch', exact: true })).toHaveCount(0);
});
test('Responsive week/detail and no partial calendar on later-page failure', async ({ page }) => {
  const state = await fixture(page); await page.getByRole('button', { name: 'Tuần', exact: true }).click();
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if ([375, 1440].includes(width)) await page.screenshot({ path: `/tmp/customer-calendar-${width}.png`, fullPage: true });
    await page.getByRole('button', { name: /^Xem buổi tập PT B/ }).click(); await expect(page.getByRole('dialog')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('dialog').getByRole('button', { name: 'Đóng chi tiết' }).click();
  }
  state.failure = true; await page.getByRole('button', { name: 'Làm mới lịch', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Không tải được trang lịch tiếp theo', { timeout: 20000 });
  await expect(page.getByRole('article')).toHaveCount(0);
  state.failure = false; await page.getByRole('button', { name: /Thử lại/ }).click(); await expect(page.getByRole('article')).toHaveCount(3);
});
test('Pending cancellation prevents duplicate writes and keeps conflict visible', async ({ page }) => {
  await fixture(page); let calls = 0; let release = () => {}; const gate = new Promise<void>(r => { release = r; });
  await page.route('**/pt-appointments/current/cancel', async route => { calls++; await gate; return route.fulfill({ status: 409, json: { success: false, error: { code: 'APPOINTMENT_NOT_OPEN', message: 'Buổi tập đã được xử lý. Vui lòng tải lại lịch.' } } }); });
  await page.getByRole('button', { name: /^Xem buổi tập PT B/ }).click(); const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Hủy lịch', exact: true }).click(); await dialog.getByLabel('Lý do').fill('Bận');
  await dialog.getByRole('button', { name: 'Xác nhận', exact: true }).click(); await expect(dialog.getByRole('button', { name: 'Xác nhận', exact: true })).toBeDisabled();
  await expect(dialog.getByLabel('Lý do')).toBeDisabled(); await page.keyboard.press('Escape'); await expect(dialog).toBeVisible(); expect(calls).toBe(1);
  release(); await expect(dialog.getByRole('alert')).toContainText('Buổi tập đã được xử lý'); await expect(dialog.getByRole('button', { name: 'Đóng', exact: true })).toBeEnabled();
});
