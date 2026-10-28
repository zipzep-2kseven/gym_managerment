import { test, expect, type Page } from '@playwright/test';
import type { GymPackage } from '../src/types/package.types';

const api = 'http://127.0.0.1:4103/api/v1';
const createGym = async (page: Page, suffix: string) => {
  await page.goto('/login'); await page.locator('input[name="email"]').fill('admin@gym03.test');
  await page.locator('input[name="password"]').fill('BrowserFixture@123'); await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL('http://127.0.0.1:3104/'); await page.goto('/admin/gyms/create');
  await page.getByLabel('Tên phòng Gym', { exact: true }).fill(`R20 ${suffix}`); await page.getByLabel('Địa chỉ', { exact: true }).fill('Địa chỉ kiểm thử R20');
  await page.getByLabel('Họ và tên Manager', { exact: true }).fill('Manager R20'); await page.getByLabel('Email đăng nhập Manager', { exact: true }).fill(`r20-${suffix}@gym03.test`);
  const response = page.waitForResponse(response => response.request().method() === 'POST' && response.url().endsWith('/gyms'));
  await page.getByRole('button', { name: 'Tạo cơ sở và Manager', exact: true }).click(); const result = await response; expect(result.status()).toBe(201);
  const { data } = await result.json() as { data: { gym_id: string } };
  await expect(page.getByRole('status').filter({ hasText: `Đã tạo R20 ${suffix}` })).toBeVisible(); return data.gym_id;
};

test('Real Admin inactive catalog paging, private edit/status, repeatable action and wrong Gym', async ({ page, browser }) => {
  const gymId = await createGym(page, 'catalog'); let last: GymPackage | undefined;
  for (let index = 1; index <= 25; index++) {
    const response = await page.request.post(`${api}/gyms/${gymId}/packages`, { data: { package_name: `Gói ${String(index).padStart(2, '0')}`, duration_days: 30,
      price: index === 25 ? '999999999999.99' : '0', description: null } }); expect(response.status()).toBe(201); last = (await response.json()).data;
  }
  expect((await page.request.patch(`${api}/gyms/${gymId}/status`, { data: { status: 'INACTIVE' } })).status()).toBe(200);
  await page.goto(`/admin/gyms/${gymId}/packages?page=3&status=ACTIVE`);
  await expect(page.getByText('Trang 3 / 3 · 25 kết quả')).toBeVisible(); await expect(page.getByText('999.999.999.999,99 VND', { exact: true })).toBeVisible();
  await expect(page.getByText(`R20 catalog · Gym ngừng hoạt động`)).toBeVisible();
  await page.getByRole('button', { name: 'Ngừng bán Gói 25', exact: true }).click(); await page.getByRole('button', { name: 'Xác nhận', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Đã ngừng bán gói Gói 25.' })).toBeVisible(); await expect(page.getByText('Trang 2 / 2 · 24 kết quả')).toBeVisible();
  await page.getByRole('combobox', { name: 'Trạng thái bán', exact: true }).selectOption('INACTIVE'); await expect(page.getByText('Trang 1 / 1 · 1 kết quả')).toBeVisible();
  await page.getByRole('button', { name: 'Sửa gói Gói 25', exact: true }).click(); await page.getByLabel('Giá (VND)').fill('0'); await page.getByLabel('Mô tả', { exact: true }).fill('Lịch sử được giữ');
  const changed = page.waitForRequest(request => request.method() === 'PATCH' && request.url().endsWith(last!.package_id));
  await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click(); expect((await changed).postDataJSON()).toEqual({ price: '0.00', description: 'Lịch sử được giữ' });
  await expect(page.getByRole('status').filter({ hasText: 'Thay đổi đã được lưu.' })).toBeVisible(); await page.getByRole('button', { name: 'Đóng biểu mẫu', exact: true }).click();
  await page.getByRole('button', { name: 'Mở bán Gói 25', exact: true }).click(); await page.getByRole('button', { name: 'Xác nhận', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Đã mở bán gói Gói 25.' })).toBeVisible(); await expect(page.getByText('Chưa có gói tập phù hợp.')).toBeVisible();
  expect((await page.request.patch(`${api}/gyms/${gymId}/packages/${last!.package_id}/activate`)).status()).toBe(200);
  const gyms = (await (await page.request.get(`${api}/admin/gyms`)).json()).data as { gym_id: string; gym_name: string }[];
  const other = gyms.find(gym => gym.gym_name === 'Browser Gym')!;
  expect((await page.request.patch(`${api}/gyms/${other.gym_id}/packages/${last!.package_id}`, { data: { price: '1' } })).status()).toBe(404);
  const guest = await browser.newContext();
  try { expect((await guest.request.get(`${api}/gyms/${gymId}/packages`)).status()).toBe(404); }
  finally { await guest.close(); }
});

test('Real Admin concurrent edits preserve omitted fields and same-field last write wins', async ({ page }) => {
  const gymId = await createGym(page, 'concurrent');
  const response = await page.request.post(`${api}/gyms/${gymId}/packages`, { data: { package_name: 'Gói đồng thời', duration_days: 30, price: '10', description: 'Mô tả ban đầu' } }); expect(response.status()).toBe(201);
  const row = (await response.json()).data as GymPackage, path = `${api}/gyms/${gymId}/packages/${row.package_id}`;
  await page.goto(`/admin/gyms/${gymId}/packages`); await page.getByRole('button', { name: 'Sửa gói Gói đồng thời', exact: true }).click();
  expect((await page.request.patch(path, { data: { package_name: 'Tên người khác', duration_days: 60, price: '20' } })).status()).toBe(200);
  await expect(page.getByLabel('Tên gói tập', { exact: true })).toHaveValue('Gói đồng thời'); await page.getByLabel('Giá (VND)').fill('42.42'); await page.getByLabel('Mô tả', { exact: true }).fill('');
  const request = page.waitForRequest(request => request.method() === 'PATCH' && request.url() === path);
  await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click(); expect((await request).postDataJSON()).toEqual({ price: '42.42', description: null });
  await expect(page.getByRole('status').filter({ hasText: 'Thay đổi đã được lưu.' })).toBeVisible();
  const result = (await (await page.request.get(`${api}/gyms/${gymId}/management/packages`)).json()).data as GymPackage[];
  expect(result[0]).toMatchObject({ package_name: 'Tên người khác', duration_days: 60, price: '42.42', description: null });
  await page.getByRole('button', { name: 'Đóng biểu mẫu', exact: true }).click(); await page.getByRole('button', { name: 'Ngừng bán Tên người khác', exact: true }).click();
  expect((await page.request.patch(`${path}/deactivate`)).status()).toBe(200);
  await page.getByRole('button', { name: 'Xác nhận', exact: true }).click(); await expect(page.getByRole('status').filter({ hasText: 'Đã ngừng bán gói Tên người khác.' })).toBeVisible();
});
