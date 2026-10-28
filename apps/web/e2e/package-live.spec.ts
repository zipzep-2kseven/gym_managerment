import { test, expect, type Page } from '@playwright/test';
const login = async (page: Page, role: string) => {
  await page.goto('/login');
  await page.locator('input[name="email"]').fill(`${role}@gym03.test`);
  await page.locator('input[name="password"]').fill('BrowserFixture@123');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click(); await expect(page).toHaveURL('http://127.0.0.1:3104/');
};

test('Real Manager create/edit/deactivate/reactivate and Guest visibility', async ({ page, browser }) => {
  await login(page, 'manager'); await page.goto('/manager/packages');
  await expect(page.getByText('Chưa có gói tập phù hợp.')).toBeVisible();
  await page.getByRole('button', { name: 'Tạo gói mới' }).click();
  await page.getByLabel('Tên gói tập', { exact: true }).fill('Browser Package');
  await page.getByLabel('Thời hạn (ngày)').fill('30'); await page.getByLabel('Giá (VND)').fill('123456.78');
  const created = page.waitForResponse(r => r.request().method() === 'POST' && r.url().endsWith('/packages'));
  await page.getByRole('button', { name: 'Tạo gói tập', exact: true }).click();
  const response = await created; expect(response.status()).toBe(201);
  const { data } = await response.json() as { data: { gym_id: string; package_id: string } };
  await expect(page.getByRole('status')).toContainText('Gói tập đã được tạo');
  await page.getByRole('button', { name: 'Đóng biểu mẫu' }).click();
  const guest = await browser.newContext(); const publicPage = await guest.newPage();
  try {
    await publicPage.goto(`/gyms/${data.gym_id}/packages`); await publicPage.getByRole('link', { name: 'Xem gói Browser Package' }).click();
    await expect(publicPage.getByText('123.456,78 VND')).toBeVisible();
    await page.getByRole('button', { name: 'Sửa gói Browser Package' }).click();
    await page.getByLabel('Giá (VND)').fill('0'); await page.getByLabel('Mô tả', { exact: true }).fill('Cập nhật qua browser');
    const changed = page.waitForRequest(r => r.method() === 'PATCH');
    await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
    expect((await changed).postDataJSON()).toEqual({ price: '0.00', description: 'Cập nhật qua browser' });
    await expect(page.getByRole('status')).toContainText('Thay đổi đã được lưu'); await page.getByRole('button', { name: 'Đóng biểu mẫu' }).click();
    await publicPage.reload(); await expect(publicPage.getByText('0,00 VND')).toBeVisible();
    await page.getByRole('button', { name: 'Ngừng bán Browser Package' }).click(); await page.getByRole('button', { name: 'Xác nhận', exact: true }).click();
    await expect(page.getByRole('article').getByText('Ngừng bán', { exact: true })).toBeVisible();
    await publicPage.reload(); await expect(publicPage.getByRole('alert')).toContainText('tài nguyên không còn khả dụng');
    await page.getByRole('button', { name: 'Mở bán Browser Package' }).click(); await page.getByRole('button', { name: 'Xác nhận', exact: true }).click();
    await expect(page.getByRole('article').getByText('Đang bán', { exact: true })).toBeVisible();
    await publicPage.reload(); await expect(publicPage.getByRole('heading', { name: 'Browser Package', level: 1 })).toBeVisible();
  } finally { await guest.close(); }
});

test('Real Admin manages INACTIVE Gym catalog; Manager cross-Gym requests rejected', async ({ page }) => {
  await login(page, 'admin'); await page.goto('/admin/gyms/create');
  await page.getByLabel('Tên phòng Gym', { exact: true }).fill('Package Inactive Gym'); await page.getByLabel('Địa chỉ', { exact: true }).fill('Địa chỉ kiểm thử');
  await page.getByLabel('Họ và tên Manager', { exact: true }).fill('Manager Package');
  await page.getByLabel('Email đăng nhập Manager', { exact: true }).fill('package.manager@gym03.test');
  await page.getByRole('button', { name: 'Tạo cơ sở và Manager', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Đã tạo Package Inactive Gym' })).toContainText('và tài khoản Manager');
  await page.getByRole('link', { name: 'Danh sách Gym', exact: true }).click(); await page.getByRole('link', { name: 'Sửa thông tin Package Inactive Gym' }).click();
  const gymId = new URL(page.url()).pathname.split('/').pop()!;
  await page.getByRole('button', { name: 'Ngừng Gym', exact: true }).click(); await page.getByRole('button', { name: 'Xác nhận', exact: true }).click();
  await expect(page.locator('.badge')).toContainText('Ngừng hoạt động'); await page.getByRole('link', { name: 'Quản lý gói tập' }).click();
  await page.getByRole('button', { name: 'Tạo gói mới' }).click(); await page.getByLabel('Tên gói tập', { exact: true }).fill('Private Package');
  await page.getByLabel('Thời hạn (ngày)').fill('60'); await page.getByLabel('Giá (VND)').fill('999999999999.99');
  await page.getByRole('button', { name: 'Tạo gói tập', exact: true }).click(); await expect(page.getByRole('status').filter({ hasText: 'Gói tập đã được tạo' })).toBeVisible();
  await page.reload(); await expect(page.getByText('999.999.999.999,99 VND')).toBeVisible();
  await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click(); await login(page, 'manager');
  for (const method of ['get', 'post'] as const) {
    const response = await page.request[method](`http://127.0.0.1:4103/api/v1/gyms/${gymId}/${method === 'get' ? 'management/' : ''}packages`, method === 'post' ? { data: { package_name: 'Attack', duration_days: 1, price: '0' } } : {});
    expect(response.status()).toBe(403);
  }
  await page.goto(`/admin/gyms/${gymId}/packages`); await expect(page.getByRole('heading', { name: 'Không có quyền truy cập' })).toBeVisible();
});
