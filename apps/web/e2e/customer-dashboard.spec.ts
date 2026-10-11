import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const gymId = '10000000-0000-4000-8000-000000000001';
const customerUserId = '50000000-0000-4000-8000-000000000001';

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

const setupCustomerMocks = async (
  page: Page,
  options: {
    authenticated?: boolean;
    failPayments?: boolean;
  } = {}
) => {
  const isAuth = options.authenticated ?? true;

  await page.route('**/api/v1/**', async route => {
    const url = new URL(route.request().url());
    const path = url.pathname;

    if (path.endsWith('/auth/me')) {
      if (!isAuth) {
        return route.fulfill({ status: 401, json: { success: false, error: { message: 'Chưa đăng nhập' } } });
      }
      return route.fulfill({
        json: ok({
          user_id: customerUserId,
          email: 'customer@example.com',
          roles: ['CUSTOMER'],
          status: 'ACTIVE',
          must_change_password: false,
          profile: { full_name: 'Trần Văn Khách' },
          active_gym_assignments: [],
        }),
      });
    }

    if (path.includes('/memberships')) {
      return route.fulfill({
        json: paged([
          {
            membership_id: 'mem-001',
            gym_id: gymId,
            package_id: 'pkg-001',
            purchase_price: '500000',
            start_date: '2026-10-01',
            end_date: '2026-11-01',
            status: 'ACTIVE',
            demo: false,
          },
        ], 1, 1),
      });
    }

    if (path.includes('/pt-appointments')) {
      return route.fulfill({
        json: paged([
          {
            appointment_id: 'apt-c01',
            start_time: '2026-10-15T15:00:00Z',
            end_time: '2026-10-15T16:30:00Z',
            status: 'CONFIRMED',
            registration: {
              registration_id: 'reg-c01',
              customer: { user_id: customerUserId, full_name: 'Trần Văn Khách' },
              trainer: { user_id: 'pt-1', full_name: 'HLV Hoàng Nam' },
              gym: { gym_id: gymId, gym_name: 'Gym Hoàn Kiếm Central' },
              membership: { start_date: '2026-10-01', end_date: '2026-11-01' },
            },
          },
        ], 1, 2),
      });
    }

    if (path.includes('/pt-registrations')) {
      return route.fulfill({
        json: paged([], 1, 0),
      });
    }

    if (path.includes('/payments')) {
      if (options.failPayments) {
        return route.fulfill({ status: 500, json: { success: false, error: { message: 'Lỗi nạp thanh toán' } } });
      }
      return route.fulfill({
        json: paged([
          {
            payment_id: 'pay-001',
            gym_id: gymId,
            package_id: 'pkg-001',
            amount: '500000',
            payment_method: 'DEMO',
            payment_status: 'SUCCESS',
            created_at: '2026-10-01T10:00:00Z',
            demo: true,
          },
        ], 1, 3),
      });
    }

    if (path.includes('/reports')) {
      return route.fulfill({
        json: paged([], 1, 0),
      });
    }

    return route.continue();
  });
};

test.describe('Customer Workspace & Dashboard E2E', () => {
  test('Renders Customer Dashboard with authentic metrics, active memberships, and quick shortcuts', async ({ page }) => {
    await setupCustomerMocks(page);

    await page.goto('/dashboard');

    // Header
    await expect(page.getByRole('heading', { level: 1, name: 'Tổng quan hội viên' })).toBeVisible();
    await expect(page.locator('.management-status-pill').filter({ hasText: 'Hội viên MultiGym' })).toBeVisible();

    // Summary Metrics
    const memMetric = page.locator('a.management-metric-card').filter({ hasText: 'Thẻ hội viên sở hữu' });
    await expect(memMetric.locator('.management-metric-value')).toHaveText('1');
    await expect(memMetric).toHaveAttribute('href', '/memberships');

    const aptMetric = page.locator('a.management-metric-card').filter({ hasText: 'Lịch tập sắp tới' });
    await expect(aptMetric.locator('.management-metric-value')).toHaveText('2');
    await expect(aptMetric).toHaveAttribute('href', '/my-pt');

    const payMetric = page.locator('a.management-metric-card').filter({ hasText: 'Giao dịch thanh toán' });
    await expect(payMetric.locator('.management-metric-value')).toHaveText('3');
    await expect(payMetric).toHaveAttribute('href', '/payments');

    // Recent Memberships
    await expect(page.getByRole('heading', { level: 2, name: 'Thẻ hội viên của bạn' })).toBeVisible();
    await expect(page.getByText('Thời hạn: 2026-10-01 đến 2026-11-01')).toBeVisible();
    await expect(page.getByText('Đang hoạt động')).toBeVisible();

    // Recent Appointments
    await expect(page.getByRole('heading', { level: 2, name: 'Lịch tập sắp tới' })).toBeVisible();
    await expect(page.getByText('HLV: HLV Hoàng Nam')).toBeVisible();

    // Shortcuts
    await expect(page.getByRole('heading', { level: 2, name: 'Lối tắt tác vụ' })).toBeVisible();
    const shortcuts = page.locator('.management-quick-links');
    await expect(shortcuts.getByRole('link', { name: 'Lịch tập & Đặt hẹn PT' })).toBeVisible();
    await expect(shortcuts.getByRole('link', { name: 'Thẻ hội viên của tôi' })).toBeVisible();
  });

  test('Partial failure isolation: payments query error shows retry and does not crash other cards', async ({ page }) => {
    let shouldFail = true;
    await setupCustomerMocks(page);

    await page.route('**/api/v1/payments**', async route => {
      if (shouldFail) {
        return route.fulfill({ status: 500, json: { success: false, error: { message: 'Lỗi' } } });
      }
      return route.fulfill({
        json: paged([], 1, 3),
      });
    });

    await page.goto('/dashboard');

    // Other metrics succeed
    await expect(page.locator('a.management-metric-card').filter({ hasText: 'Thẻ hội viên sở hữu' }).locator('.management-metric-value')).toHaveText('1');
    await expect(page.locator('a.management-metric-card').filter({ hasText: 'Lịch tập sắp tới' }).locator('.management-metric-value')).toHaveText('2');

    // Payments card shows retry button
    const payMetric = page.locator('a.management-metric-card').filter({ hasText: 'Giao dịch thanh toán' });
    await expect(payMetric.getByRole('button', { name: 'Thử lại' })).toBeVisible();

    // Retry succeeds
    shouldFail = false;
    await payMetric.getByRole('button', { name: 'Thử lại' }).click();
    await expect(payMetric.locator('.management-metric-value')).toHaveText('3');
  });

  test('Seamless navigation: CustomerLayout wraps /dashboard, /memberships, and /my-pt smoothly', async ({ page }) => {
    await setupCustomerMocks(page);

    await page.goto('/dashboard');

    const sidebar = page.locator('aside.management-sidebar');
    await expect(sidebar.getByRole('link', { name: 'Tổng quan' })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Thẻ hội viên của tôi' })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Lịch tập & HLV của tôi' })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Lịch sử giao dịch' })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Báo cáo sự cố' })).toBeVisible();

    const topbar = page.locator('header.management-topbar');
    await expect(topbar.getByText('Hội viên', { exact: true })).toBeVisible();

    // Navigate to /memberships
    await sidebar.getByRole('link', { name: 'Thẻ hội viên của tôi' }).click();
    await expect(page).toHaveURL(/\/memberships$/);
    await expect(sidebar.getByRole('link', { name: 'Tổng quan' })).toBeVisible();

    // Navigate to /my-pt
    await sidebar.getByRole('link', { name: 'Lịch tập & HLV của tôi' }).click();
    await expect(page).toHaveURL(/\/my-pt$/);
    await expect(sidebar.getByRole('link', { name: 'Tổng quan' })).toBeVisible();
  });

  test('Responsive design and WCAG AA Accessibility audit for Customer Dashboard', async ({ page }) => {
    await setupCustomerMocks(page);

    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { level: 1, name: 'Tổng quan hội viên' })).toBeVisible();

    const viewports = [375, 768, 1024, 1440];

    for (const width of viewports) {
      await page.setViewportSize({ width, height: 900 });

      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }));
      expect(overflow.scrollWidth, `Overflow detected at ${width}px`).toBeLessThanOrEqual(overflow.innerWidth + 1);

      if (width === 375 || width === 1440) {
        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          .analyze();
        expect(results.violations, `Axe violations at ${width}px`).toEqual([]);
      }
    }

    // Mobile drawer toggle
    await page.setViewportSize({ width: 375, height: 900 });
    const menuBtn = page.getByRole('button', { name: 'Mở menu' });
    await expect(menuBtn).toBeVisible();
    await menuBtn.click();

    const closeBtn = page.getByRole('button', { name: 'Đóng thanh điều hướng' });
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();
    await expect(closeBtn).not.toBeVisible();
  });

  test('Guest cannot access Customer Dashboard', async ({ page }) => {
    await setupCustomerMocks(page, { authenticated: false });

    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { level: 1, name: 'Tổng quan hội viên' })).toHaveCount(0);
  });
});
