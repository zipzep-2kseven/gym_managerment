import { test, expect } from '@playwright/test';
import type { Appointment, Registration } from '../src/types/pt.types';
const api = 'http://127.0.0.1:4103/api/v1';

test('Real Admin reads independent pages, cannot edit appointments, ends registration after PT resolves obligation and reads inactive history', async ({ page, playwright }) => {
  await page.goto('/login'); await page.locator('input[name="email"]').fill('admin@gym03.test');
  await page.locator('input[name="password"]').fill('BrowserFixture@123');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click(); await expect(page).toHaveURL('http://127.0.0.1:3104/');
  const gyms = (await (await page.request.get(`${api}/admin/gyms`)).json()).data as { gym_id: string; gym_name: string }[];
  const gymId = gyms.find(gym => gym.gym_name === 'Browser Gym')!.gym_id, base = `${api}/gyms/${gymId}`;
  const rows = (await (await page.request.get(`${base}/pt-registrations`)).json()).data as Registration[];
  const row = rows.find(item => item.status === 'ACTIVE')!;
  const appointments = (await (await page.request.get(`${base}/pt-appointments`)).json()).data as Appointment[];
  const open = appointments.find(item => item.status === 'PENDING')!;
  await page.goto(`/admin/gyms/${gymId}/pt`);
  const regs = page.getByRole('region', { name: 'Đăng ký PT', exact: true }), apts = page.getByRole('region', { name: 'Lịch tập', exact: true });
  await expect(regs).toContainText('25 đăng ký'); await expect(apts).toContainText('24 lịch tập');
  await regs.getByRole('button', { name: 'Trang sau' }).click(); await expect(regs.getByRole('article')).toHaveCount(5);
  await expect(apts.getByRole('article')).toHaveCount(20);
  await regs.getByRole('button', { name: 'Trang trước' }).click();
  await regs.getByRole('button', { name: 'Kết thúc đăng ký / đổi PT' }).click();
  await page.getByLabel('Lý do', { exact: true }).fill('Đổi PT R22');
  const conflict = page.waitForResponse(response => response.request().method() === 'PATCH' && response.url().endsWith('/cancel'));
  await page.getByRole('button', { name: 'Xác nhận kết thúc' }).click(); expect((await conflict).status()).toBe(409);
  await expect(page.getByLabel('Lý do', { exact: true })).toHaveValue('Đổi PT R22');
  for (const [action, data] of [['confirm', {}], ['complete', {}], ['cancel', { note: 'Admin denied' }], ['reschedule', { start_time: '2099-01-01T02:00:00Z', end_time: '2099-01-01T03:00:00Z' }]] as const) {
    expect((await page.request.patch(`${base}/pt-appointments/${open.appointment_id}/${action}`, { data })).status()).toBe(403);
  }
  const pt = await playwright.request.newContext();
  try {
    expect((await pt.post(`${api}/auth/login`, { data: { email: 'pt@gym03.test', password: 'BrowserFixture@123' } })).status()).toBe(200);
    expect((await pt.patch(`${base}/pt-appointments/${open.appointment_id}/cancel`, { data: { note: 'PT đã xử lý lịch mở' } })).status()).toBe(200);
  } finally { await pt.dispose(); }
  await page.getByRole('button', { name: 'Đọc lại kết quả' }).click();
  await page.getByRole('button', { name: 'Dùng trạng thái vừa đọc' }).click();
  await page.getByRole('button', { name: 'Xác nhận kết thúc' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Máy chủ đã xác nhận' })).toBeVisible();
  await page.getByRole('button', { name: 'Đọc lại kết quả' }).click();
  await expect(page.getByRole('region', { name: 'Kết thúc đăng ký PT', exact: true })).toContainText('Trạng thái hiện tại: CANCELLED');
  await page.getByRole('button', { name: 'Đóng', exact: true }).click();
  const ended = (await (await page.request.get(`${base}/pt-registrations`)).json()).data as Registration[];
  expect(ended.find(item => item.registration_id === row.registration_id)).toMatchObject({ status: 'CANCELLED', note: 'Đổi PT R22' });
  expect((await page.request.patch(`${base}/status`, { data: { status: 'INACTIVE' } })).status()).toBe(200);
  await page.getByRole('button', { name: 'Làm mới danh sách' }).click();
  await expect(page.getByRole('region', { name: 'Cơ sở đang chọn' })).toContainText('lịch sử đăng ký và lịch tập vẫn được tra cứu');
  await expect(regs).toContainText('25 đăng ký'); await expect(apts).toContainText('24 lịch tập');
  expect((await page.request.get(`${base}/pt-appointments`)).status()).toBe(200);
});
