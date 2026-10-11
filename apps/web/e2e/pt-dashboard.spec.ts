import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const gymId = '10000000-0000-4000-8000-000000000001';
const ptUserId = '20000000-0000-4000-8000-000000000001';
const trainerId = '40000000-0000-4000-8000-000000000001';

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

const setupPtMocks = async (
  page: Page,
  options: {
    role?: 'PT' | 'CUSTOMER';
    failAppointments?: boolean;
  } = {}
) => {
  const currentRole = options.role ?? 'PT';

  await page.route('**/api/v1/**', async route => {
    const url = new URL(route.request().url());
    const path = url.pathname;

    if (path.endsWith('/auth/me')) {
      return route.fulfill({
        json: ok({
          user_id: ptUserId,
          email: `${currentRole.toLowerCase()}@example.com`,
          roles: [currentRole],
          status: 'ACTIVE',
          must_change_password: false,
          profile: { full_name: 'HLV Nguyễn Văn Thể' },
          active_gym_assignments: [
            { gym_id: gymId, gym_name: 'Gym Hoàn Kiếm Central', assignment_type: 'PT', gym_trainer_id: trainerId },
          ],
        }),
      });
    }

    if (path.includes('/pt-appointments')) {
      if (options.failAppointments) {
        return route.fulfill({ status: 500, json: { success: false, error: { message: 'Lỗi lịch hẹn' } } });
      }
      return route.fulfill({
        json: paged([
          {
            appointment_id: 'apt-001',
            start_time: '2026-10-12T09:00:00Z',
            end_time: '2026-10-12T10:30:00Z',
            status: 'CONFIRMED',
            registration: {
              registration_id: 'reg-001',
              customer: { user_id: 'c1', full_name: 'Lê Văn Học' },
              trainer: { user_id: ptUserId, full_name: 'HLV Nguyễn Văn Thể' },
              gym: { gym_id: gymId, gym_name: 'Gym Hoàn Kiếm Central' },
              membership: { start_date: '2026-01-01', end_date: '2026-12-31' },
            },
          },
        ], 1, 6),
      });
    }

    if (path.includes('/pt-registrations')) {
      return route.fulfill({
        json: paged([
          {
            registration_id: 'reg-001',
            status: 'ACTIVE',
            customer: { user_id: 'c1', full_name: 'Lê Văn Học' },
            trainer: { user_id: ptUserId, full_name: 'HLV Nguyễn Văn Thể' },
            gym: { gym_id: gymId, gym_name: 'Gym Hoàn Kiếm Central' },
            membership: { start_date: '2026-01-01', end_date: '2026-12-31' },
          },
        ], 1, 4),
      });
    }

    if (path.includes('/trainer-profile')) {
      return route.fulfill({
        json: ok({
          gym_id: gymId,
          gym_trainer_id: trainerId,
          bio: 'HLV 5 năm kinh nghiệm thể hình và dinh dưỡng.',
          specialization: 'Tăng cơ giảm mỡ',
          experience_years: 5,
          availability: 'ACCEPTING',
          status: 'ACTIVE',
          updated_at: '2026-10-01T00:00:00Z',
          social_links: [],
          working_schedules: [],
        }),
      });
    }

    return route.continue();
  });
};

test.describe('PT Workspace & Dashboard E2E', () => {
  test('Redirects /pt to /pt/dashboard and renders KPI metrics, recent appointments, and profile', async ({ page }) => {
    await setupPtMocks(page);

    await page.goto('/pt');
    await expect(page).toHaveURL(/\/pt\/dashboard/);

    // Header
    await expect(page.getByRole('heading', { level: 1, name: 'Tổng quan Huấn luyện viên' })).toBeVisible();
    await expect(page.locator('.management-status-pill').filter({ hasText: 'Gym Hoàn Kiếm Central' })).toBeVisible();

    // Summary Metrics
    const aptMetric = page.locator('a.management-metric-card').filter({ hasText: 'Lịch hẹn huấn luyện' });
    await expect(aptMetric.locator('.management-metric-value')).toHaveText('6');
    await expect(aptMetric).toHaveAttribute('href', '/my-pt');

    const regMetric = page.locator('a.management-metric-card').filter({ hasText: 'Học viên phụ trách' });
    await expect(regMetric.locator('.management-metric-value')).toHaveText('4');
    await expect(regMetric).toHaveAttribute('href', '/my-pt');

    const availMetric = page.locator('a.management-metric-card').filter({ hasText: 'Trạng thái nhận học viên' });
    await expect(availMetric.locator('.management-metric-value')).toHaveText('Đang nhận');
    await expect(availMetric).toHaveAttribute('href', '/pt/profile');

    // Recent Appointments
    await expect(page.getByRole('heading', { level: 2, name: 'Lịch hẹn gần nhất' })).toBeVisible();
    await expect(page.getByText('Học viên: Lê Văn Học')).toBeVisible();
    await expect(page.getByText('Đã xác nhận')).toBeVisible();

    // Profile summary
    await expect(page.getByRole('heading', { level: 2, name: 'Hồ sơ Huấn luyện viên' })).toBeVisible();
    await expect(page.getByText('Tăng cơ giảm mỡ')).toBeVisible();
    await expect(page.getByText('Kinh nghiệm: 5 năm')).toBeVisible();

    // Shortcuts
    await expect(page.getByRole('heading', { level: 2, name: 'Lối tắt tác vụ' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Quản lý lịch dạy & học viên' })).toBeVisible();
  });

  test('Partial failure isolation: error in appointments shows retry while other cards work', async ({ page }) => {
    let shouldFail = true;
    await setupPtMocks(page);

    await page.route('**/api/v1/pt-appointments**', async route => {
      if (shouldFail) {
        return route.fulfill({ status: 500, json: { success: false, error: { message: 'Lỗi' } } });
      }
      return route.fulfill({
        json: paged([], 1, 6),
      });
    });

    await page.goto('/pt/dashboard');

    // Other metrics succeed
    await expect(page.locator('a.management-metric-card').filter({ hasText: 'Học viên phụ trách' }).locator('.management-metric-value')).toHaveText('4');
    await expect(page.locator('a.management-metric-card').filter({ hasText: 'Trạng thái nhận học viên' }).locator('.management-metric-value')).toHaveText('Đang nhận');

    // Appointments metric has retry button
    const aptMetric = page.locator('a.management-metric-card').filter({ hasText: 'Lịch hẹn huấn luyện' });
    await expect(aptMetric.getByRole('button', { name: 'Thử lại' })).toBeVisible();

    // Retry succeeds
    shouldFail = false;
    await aptMetric.getByRole('button', { name: 'Thử lại' }).click();
    await expect(aptMetric.locator('.management-metric-value')).toHaveText('6');
  });

  test('Seamless navigation: Sidebar links to /my-pt and /pt/profile retain PTLayout', async ({ page }) => {
    await setupPtMocks(page);

    await page.goto('/pt/dashboard');

    const sidebar = page.locator('aside.management-sidebar');
    await expect(sidebar.getByRole('link', { name: 'Tổng quan' })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Lịch dạy & Học viên' })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Hồ sơ Huấn luyện viên' })).toBeVisible();

    const topbar = page.locator('header.management-topbar');
    await expect(topbar.getByText('Huấn luyện viên', { exact: true })).toBeVisible();

    // Navigate to /my-pt
    await sidebar.getByRole('link', { name: 'Lịch dạy & Học viên' }).click();
    await expect(page).toHaveURL(/\/my-pt$/);

    // Sidebar should still be visible in PTLayout
    await expect(sidebar.getByRole('link', { name: 'Tổng quan' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'PT và lịch tập của tôi' })).toBeVisible();
  });

  test('Responsive design and WCAG AA Accessibility audit for PT Dashboard', async ({ page }) => {
    await setupPtMocks(page);

    await page.goto('/pt/dashboard');
    await expect(page.getByRole('heading', { level: 1, name: 'Tổng quan Huấn luyện viên' })).toBeVisible();

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

  test('Customer cannot access PT Workspace', async ({ page }) => {
    await setupPtMocks(page, { role: 'CUSTOMER' });

    await page.goto('/pt/dashboard');
    await expect(page.getByRole('heading', { level: 1, name: 'Tổng quan Huấn luyện viên' })).toHaveCount(0);
  });
});
