import { test, expect, request } from '@playwright/test';
import type { IncidentReport } from '../src/services/report.service';

test('Real API/DB Admin selector pages only Gyms, then scoped history/photos and correct processing without evidence rewrites', async ({ page }) => {
  await page.goto('/login'); await page.getByLabel('Email', { exact: true }).fill('admin@gym03.test'); await page.locator('input[name=password]').fill('BrowserFixture@123'); await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click(); await expect(page).toHaveURL('http://127.0.0.1:3104/');
  const base = 'http://127.0.0.1:4103/api/v1';
  const gyms = (await (await page.request.get(`${base}/admin/gyms?page=1&pageSize=100`)).json()).data;
  const gymA = gyms.find((row: { gym_name: string }) => row.gym_name === 'Report Gym 01').gym_id;
  const gymB = gyms.find((row: { gym_name: string }) => row.gym_name === 'Report Gym 02').gym_id;
  const before: IncidentReport[] = (await (await page.request.get(`${base}/gyms/${gymA}/reports?page=1&pageSize=100`)).json()).data;
  const events: { method: string; path: string }[] = [];
  page.on('request', req => { const url = new URL(req.url()); if (url.pathname.startsWith('/api/v1')) events.push({ method: req.method(), path: url.pathname }); });
  await page.goto('/admin/reports'); await expect(page.getByText('16 Gym phù hợp', { exact: true })).toBeVisible();
  await expect(page.locator('main').getByRole('link', { name: /^Xem báo cáo sự cố tại / })).toHaveCount(12);
  await page.getByRole('button', { name: 'Trang sau', exact: true }).click(); await expect(page.locator('main').getByRole('link', { name: /^Xem báo cáo sự cố tại / })).toHaveCount(4);
  expect(events.every(event => event.method === 'GET' && (event.path.endsWith('/admin/gyms') || event.path.endsWith('/auth/me')))).toBe(true);
  await page.getByLabel('Tên hoặc địa chỉ Gym', { exact: true }).fill('Report Gym 01'); await page.keyboard.press('Enter');
  await page.locator('main').getByRole('link', { name: 'Xem báo cáo sự cố tại Report Gym 01', exact: true }).click();
  await expect(page.getByText('25 báo cáo phù hợp', { exact: true })).toBeVisible(); await expect(page.getByRole('article')).toHaveCount(20);
  const first = await page.locator('.admin-report-id').allTextContents();
  await page.getByRole('button', { name: 'Trang sau', exact: true }).click(); await expect(page.getByRole('article')).toHaveCount(5);
  const second = await page.locator('.admin-report-id').allTextContents();
  expect([...first, ...second].map(value => value.replace('ID báo cáo: ', ''))).toEqual(before.map(row => row.report_id));
  await page.getByRole('button', { name: 'Trang trước', exact: true }).click();
  // The first inserted report's UUID may be on either page under the stable ID tie-break.
  const photographed = before.find(row => row.has_image)!;
  const imagePage = before.indexOf(photographed) < 20 ? 1 : 2;
  if (imagePage === 2) await page.getByRole('button', { name: 'Trang sau', exact: true }).click();
  await expect.poll(() => page.getByAltText('Ảnh do người gửi cung cấp').evaluate((node: HTMLImageElement) => node.naturalWidth)).toBeGreaterThan(0);
  const pending = before.find(row => row.status === 'PENDING')!;
  await page.getByRole('combobox', { name: 'Trạng thái báo cáo', exact: true }).selectOption('PENDING');
  const target = page.getByRole('article', { name: `Báo cáo ${pending.report_id}`, exact: true });
  await target.getByRole('button', { name: 'Tiếp nhận', exact: true }).click();
  await expect(page.getByText(`Đã lưu báo cáo ${pending.report_id}: Đang xử lý.`, { exact: true })).toBeVisible();
  await page.getByRole('combobox', { name: 'Trạng thái báo cáo', exact: true }).selectOption('IN_PROGRESS');
  await target.getByRole('button', { name: 'Giải quyết', exact: true }).click(); await target.getByLabel('Kết quả xử lý').fill('Admin đã kiểm tra và sửa sự cố'); await target.getByRole('button', { name: 'Lưu kết quả', exact: true }).click();
  await expect(page.getByText(`Đã lưu báo cáo ${pending.report_id}: Đã giải quyết.`, { exact: true })).toBeVisible();
  const after: IncidentReport[] = (await (await page.request.get(`${base}/gyms/${gymA}/reports?page=1&pageSize=100`)).json()).data;
  const changed = after.find(row => row.report_id === pending.report_id)!;
  expect(changed.status).toBe('RESOLVED'); expect(changed.resolution_note).toBe('Admin đã kiểm tra và sửa sự cố'); expect(changed.content).toBe(pending.content); expect(changed.has_image).toBe(pending.has_image);
  expect(after.filter(row => row.report_id !== pending.report_id)).toEqual(before.filter(row => row.report_id !== pending.report_id));
  await page.goto(`/admin/gyms/${gymB}/reports`); await expect(page.getByRole('region', { name: 'Cơ sở đang chọn' })).toContainText('Ngừng hoạt động');
  await expect(page.getByRole('article')).toContainText('Báo cáo Report Gym 02 lịch sử');
  await page.getByRole('button', { name: 'Từ chối', exact: true }).click(); await page.getByLabel('Lý do từ chối').fill('Báo cáo lịch sử đã được đối chiếu'); await page.getByRole('button', { name: 'Lưu kết quả', exact: true }).click();
  await expect(page.getByRole('article')).toContainText('Lý do từ chối: Báo cáo lịch sử đã được đối chiếu');
  expect(events.filter(event => event.method !== 'GET').map(event => event.path.split('/').at(-1))).toEqual(['investigate', 'resolve', 'reject']);
  expect(events.some(event => /memberships|payments|equipment/.test(event.path))).toBe(false);
  const actor = await request.newContext();
  try {
    expect((await actor.get(`${base}/admin/gyms`)).status()).toBe(401);
    expect((await actor.get(`${base}/reports/${photographed.report_id}/image`)).status()).toBe(401);
    for (const role of ['customer', 'pt', 'manager']) {
      expect((await actor.post(`${base}/auth/login`, { data: { email: `${role}@gym03.test`, password: 'BrowserFixture@123' } })).status()).toBe(200);
      expect((await actor.get(`${base}/admin/gyms`)).status()).toBe(403);
      expect((await actor.patch(`${base}/gyms/${gymA}/reports/${pending.report_id}/reject`, { data: { resolution_note: 'Trái quyền' } })).status()).toBe(403);
    }
  } finally { await actor.dispose(); }
});
