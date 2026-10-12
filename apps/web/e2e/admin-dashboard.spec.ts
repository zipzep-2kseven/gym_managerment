import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const gymId1 = '10000000-0000-4000-8000-000000000001';
const gymId2 = '10000000-0000-4000-8000-000000000002';
const userId = '30000000-0000-4000-8000-000000000001';

const ok = (data: unknown) => ({ success: true, data });
const paged = (data: unknown[], page = 1, total = data.length) => ({
  success: true,
  data,
  pagination: {
    page,
    pageSize: 20,
    totalItems: total,
    totalPages: Math.ceil(total / 20) || 1,
    hasNextPage: false,
    hasPreviousPage: false,
  },
});

const setupAdminMocks = async (
  page: Page,
  options: {
    failUsers?: boolean;
    failReviews?: boolean;
    role?: 'ADMIN' | 'CUSTOMER';
  } = {}
) => {
  const currentRole = options.role ?? 'ADMIN';

  await page.route('**/api/v1/**', async route => {
    const url = new URL(route.request().url());
    const path = url.pathname;

    if (path.endsWith('/auth/me')) {
      return route.fulfill({
        json: ok({
          user_id: userId,
          email: `${currentRole.toLowerCase()}@example.com`,
          roles: [currentRole],
          status: 'ACTIVE',
          must_change_password: false,
          profile: { full_name: 'Quản Trị Viên Sàn' },
          active_gym_assignments: [],
        }),
      });
    }

    // Single gym detail query (for scoped layout)
    if (path === `/api/v1/gyms/${gymId1}` || path === `/api/v1/admin/gyms/${gymId1}`) {
      return route.fulfill({
        json: ok({
          gym_id: gymId1,
          gym_name: 'Gym Hoàn Kiếm Central',
          address: '1 Phố Tràng Tiền, Hoàn Kiếm, Hà Nội',
          phone: '02439999999',
          status: 'ACTIVE',
        }),
      });
    }

    // Gyms list query
    if (path.includes('/gyms')) {
      return route.fulfill({
        json: paged([
          {
            gym_id: gymId1,
            gym_name: 'Gym Hoàn Kiếm Central',
            address: '1 Phố Tràng Tiền, Hoàn Kiếm, Hà Nội',
            status: 'ACTIVE',
          },
          {
            gym_id: gymId2,
            gym_name: 'Gym Cầu Giấy Premium',
            address: '123 Cầu Giấy, Hà Nội',
            status: 'ACTIVE',
          },
        ], 1, 2),
      });
    }

    // Admin users count query
    if (path.includes('/admin/users')) {
      if (options.failUsers) {
        return route.fulfill({ status: 500, json: { success: false, error: { message: 'Lỗi tải tài khoản' } } });
      }
      return route.fulfill({
        json: {
          success: true,
          data: {
            items: [
              { user_id: 'u1', email: 'user1@example.com', roles: ['CUSTOMER'], status: 'ACTIVE' },
            ],
            total: 42,
            page: 1,
            page_size: 20,
          },
        },
      });
    }

    // Reviews moderation count query
    if (path.includes('/admin/reviews')) {
      if (options.failReviews) {
        return route.fulfill({ status: 500, json: { success: false, error: { message: 'Lỗi tải đánh giá' } } });
      }
      return route.fulfill({
        json: {
          success: true,
          data: {
            items: [],
            total: 18,
            page: 1,
            page_size: 10,
          },
        },
      });
    }

    return route.continue();
  });
};

test.describe('Admin Workspace & Dashboard E2E', () => {
  test('Redirects /admin to /admin/dashboard and renders KPI summary metrics', async ({ page }) => {
    await setupAdminMocks(page);

    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/dashboard/);

    // Page header
    await expect(page.getByRole('heading', { level: 1, name: 'Tổng quan ban quản trị' })).toBeVisible();
    await expect(page.locator('.management-status-pill').filter({ hasText: 'Toàn hệ thống' })).toBeVisible();

    // Summary Metric Cards
    const gymMetric = page.locator('a.management-metric-card').filter({ hasText: 'Tổng số cơ sở' });
    await expect(gymMetric.locator('.management-metric-value')).toHaveText('2');
    await expect(gymMetric).toHaveAttribute('href', '/admin/gyms');

    const userMetric = page.locator('a.management-metric-card').filter({ hasText: 'Tài khoản toàn sàn' });
    await expect(userMetric.locator('.management-metric-value')).toHaveText('42');
    await expect(userMetric).toHaveAttribute('href', '/admin/users');

    const reviewMetric = page.locator('a.management-metric-card').filter({ hasText: 'Đánh giá Gym toàn sàn' });
    await expect(reviewMetric.locator('.management-metric-value')).toHaveText('18');
    await expect(reviewMetric).toHaveAttribute('href', '/admin/reviews');

    // Recent Facilities list
    await expect(page.getByRole('heading', { level: 2, name: 'Cơ sở trong hệ thống' })).toBeVisible();
    await expect(page.getByText('Gym Hoàn Kiếm Central')).toBeVisible();
    await expect(page.getByText('Gym Cầu Giấy Premium')).toBeVisible();

    // Quick Shortcuts
    await expect(page.getByRole('heading', { level: 2, name: 'Lối tắt tác vụ' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Tạo phòng Gym mới' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Bổ nhiệm Quản lý phòng Gym' })).toBeVisible();
  });

  test('Partial failure isolation: users metric error shows retry and does not crash other cards', async ({ page }) => {
    let shouldFail = true;
    await setupAdminMocks(page);

    // Override users endpoint to fail first, then succeed on retry
    await page.route('**/api/v1/admin/users**', async route => {
      if (shouldFail) {
        return route.fulfill({ status: 500, json: { success: false, error: { message: 'Lỗi máy chủ' } } });
      }
      return route.fulfill({
        json: {
          success: true,
          data: { items: [], total: 42, page: 1, page_size: 20 },
        },
      });
    });

    await page.goto('/admin/dashboard');

    // Gym and Review metrics succeed
    await expect(page.locator('a.management-metric-card').filter({ hasText: 'Tổng số cơ sở' }).locator('.management-metric-value')).toHaveText('2');
    await expect(page.locator('a.management-metric-card').filter({ hasText: 'Đánh giá Gym toàn sàn' }).locator('.management-metric-value')).toHaveText('18');

    // Users metric is in error state with retry button
    const userMetric = page.locator('a.management-metric-card').filter({ hasText: 'Tài khoản toàn sàn' });
    await expect(userMetric.getByRole('button', { name: 'Thử lại' })).toBeVisible();

    // Click retry after restoring server response
    shouldFail = false;
    await userMetric.getByRole('button', { name: 'Thử lại' }).click();
    await expect(userMetric.locator('.management-metric-value')).toHaveText('42');
  });

  test('Dual-mode navigation: transitions smoothly between system-wide and facility-scoped layouts', async ({ page }) => {
    await setupAdminMocks(page);

    await page.goto('/admin/dashboard');

    // System-wide sidebar items
    const sidebar = page.locator('aside.management-sidebar');
    await expect(sidebar.getByRole('link', { name: 'Tổng quan' })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Quản lý cơ sở' })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Quản lý tài khoản' })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Vai trò hệ thống' })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Kiểm duyệt đánh giá' })).toBeVisible();

    // Topbar system badge
    const topbar = page.locator('header.management-topbar');
    await expect(topbar.getByText('Quản trị viên', { exact: true })).toBeVisible();

    // Navigate into facility-scoped page
    await page.goto(`/admin/gyms/${gymId1}`);

    // Sidebar should now show gym-scoped menu
    await expect(sidebar.getByText('GIÁM SÁT CƠ SỞ: GYM HOÀN KIẾM CENTRAL')).toBeVisible();
    await expect(sidebar.getByRole('link', { name: '← Danh sách cơ sở' })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Thông tin cơ sở' })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Gói tập cơ sở' })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Ảnh Gym' })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Báo cáo sự cố' })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Giám sát lịch PT' })).toBeVisible();

    // Topbar should reflect scoped gym
    await expect(topbar.getByText('Giám sát cơ sở', { exact: true })).toBeVisible();

    // Click "← Danh sách cơ sở" to return to system-wide navigation
    await sidebar.getByRole('link', { name: '← Danh sách cơ sở' }).click();
    await expect(page).toHaveURL(/\/admin\/gyms$/);

    // Sidebar should be back in system-wide mode
    await expect(sidebar.getByRole('link', { name: 'Tổng quan' })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Quản lý cơ sở' })).toBeVisible();
  });

  test('Responsive viewports without overflow and WCAG AA Accessibility audit', async ({ page }) => {
    await setupAdminMocks(page);

    await page.goto('/admin/dashboard');
    await expect(page.getByRole('heading', { level: 1, name: 'Tổng quan ban quản trị' })).toBeVisible();

    const viewports = [375, 768, 1024, 1440];

    for (const width of viewports) {
      await page.setViewportSize({ width, height: 900 });

      // No horizontal scrollbar overflow
      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }));
      expect(overflow.scrollWidth, `Overflow detected at ${width}px`).toBeLessThanOrEqual(overflow.innerWidth + 1);

      if (width === 375) {
        const context = await page.locator('.management-scope-badge').boundingBox();
        const account = await page.locator('.management-user-profile-link').boundingBox();
        expect(context!.x + context!.width).toBeLessThanOrEqual(account!.x);
      }
      // Run Axe accessibility audit on both mobile and desktop
      if (width === 375 || width === 1440) {
        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          .analyze();
        expect(results.violations, `Axe violations at ${width}px`).toEqual([]);
      }
    }

    await page.screenshot({ path: '../../docs/design/admin-frontend/previews/dashboard-desktop.png', fullPage: true });
    // Test mobile drawer toggle on 375px
    await page.setViewportSize({ width: 375, height: 900 });
    await page.screenshot({ path: '../../docs/design/admin-frontend/previews/dashboard-mobile.png', fullPage: true });
    const menuButton = page.getByRole('button', { name: 'Mở menu' });
    await expect(menuButton).toBeVisible();
    await menuButton.click();

    // Drawer opens
    const closeButton = page.getByRole('button', { name: 'Đóng thanh điều hướng' });
    await expect(closeButton).toBeVisible();
    await closeButton.click();
    await expect(closeButton).not.toBeVisible();
  });

  test('Customer cannot access Admin Workspace', async ({ page }) => {
    await setupAdminMocks(page, { role: 'CUSTOMER' });

    await page.goto('/admin/dashboard');

    // Should not render admin dashboard
    await expect(page.getByRole('heading', { level: 1, name: 'Tổng quan ban quản trị' })).toHaveCount(0);
  });
});
