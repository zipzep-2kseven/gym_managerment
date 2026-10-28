import { test, expect } from '@playwright/test';
import { catalog, editFirst, gymA, plan, setupPackages } from './admin-package-fixtures';

test('Cached Gym context refresh failure preserves draft and locks writes until retry', async ({ page }) => {
  let failure = 0; await setupPackages(page, { rows: [plan()], gymError: () => failure });
  await page.goto(`/admin/gyms/${gymA}/packages`); await editFirst(page); await page.getByLabel('Mô tả', { exact: true }).fill('Bản nháp cần giữ');
  failure = 500; const failed = page.waitForResponse(response => response.url().includes('/admin/gyms') && response.status() === 500);
  await page.evaluate(() => window.dispatchEvent(new Event('visibilitychange'))); await failed;
  await expect(page.getByLabel('Mô tả', { exact: true })).toHaveValue('Bản nháp cần giữ');
  await expect(page.getByRole('button', { name: 'Lưu thay đổi', exact: true })).toBeDisabled();
  await expect(page.getByText('Làm mới thất bại. Dữ liệu cũ có thể đã thay đổi.', { exact: true })).toBeVisible();
  failure = 0; await page.getByRole('button', { name: 'Thử lại', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Lưu thay đổi', exact: true })).toBeEnabled(); await expect(page.getByLabel('Mô tả', { exact: true })).toHaveValue('Bản nháp cần giữ');
});

test('Successful create keeps fields and submit locked until explicit close', async ({ page }) => {
  const { writes } = await setupPackages(page, { rows: [] }); await page.goto(`/admin/gyms/${gymA}/packages`);
  await page.getByRole('button', { name: 'Tạo gói mới', exact: true }).click(); await page.getByLabel('Tên gói tập', { exact: true }).fill('Gói tạo thành công');
  await page.getByLabel('Thời hạn (ngày)').fill('30'); await page.getByLabel('Giá (VND)').fill('999999999999.99'); await page.getByRole('button', { name: 'Tạo gói tập', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Gói tập đã được tạo.' })).toBeVisible(); await expect(page.getByRole('button', { name: 'Tạo gói tập', exact: true })).toBeDisabled();
  await expect(page.getByLabel('Tên gói tập', { exact: true })).toBeDisabled(); await expect(catalog(page).getByText('999.999.999.999,99 VND', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Đóng biểu mẫu', exact: true }).click(); await expect(page.getByRole('button', { name: 'Tạo gói mới', exact: true })).toBeFocused(); expect(writes).toHaveLength(1);
});
