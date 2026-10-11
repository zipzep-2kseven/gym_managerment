import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const gymId = '10000000-0000-4000-8000-000000000001';
const userId = '30000000-0000-4000-8000-000000000001';
const trainerId = '20000000-0000-4000-8000-000000000001';

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

const setup = async (page: Page, options: { failConsultations?: boolean } = {}) => {
  await page.route('**/api/v1/**', async route => {
    const url = new URL(route.request().url());
    const path = url.pathname;

    if (path.endsWith('/auth/me')) {
      return route.fulfill({
        json: ok({
          user_id: userId,
          email: 'manager@example.com',
          roles: ['MANAGER'],
          status: 'ACTIVE',
          must_change_password: false,
          profile: { full_name: 'Quản Lý An' },
          active_gym_assignments: [
            { gym_id: gymId, gym_name: 'Gym Bình An', assignment_type: 'MANAGER' },
          ],
        }),
      });
    }

    if (path.includes('/consultation-requests')) {
      if (options.failConsultations) {
        return route.fulfill({ status: 500, json: { success: false, error: { message: 'Lỗi máy chủ' } } });
      }
      return route.fulfill({
        json: paged([
          {
            consultation_request_id: 'c1',
            gym_id: gymId,
            full_name: 'Khách Hàng A',
            phone: '0901234567',
            content: 'Muốn tìm hiểu gói 1 tháng',
            status: 'PENDING',
            created_at: '2026-10-11T08:00:00Z',
          },
        ], 1, 5),
      });
    }

    if (path.includes('/reports')) {
      return route.fulfill({
        json: paged([
          {
            report_id: 'r1',
            gym_id: gymId,
            gym_name: 'Gym Bình An',
            content: 'Máy chạy bộ số 2 bị hỏng cáp',
            status: 'PENDING',
            has_image: false,
            created_at: '2026-10-11T09:00:00Z',
          },
        ], 1, 2),
      });
    }

    if (path.includes('/pt-appointments')) {
      return route.fulfill({
        json: paged([
          {
            appointment_id: 'apt1',
            registration_id: 'reg1',
            start_time: '2026-10-11T14:00:00Z',
            end_time: '2026-10-11T15:30:00Z',
            status: 'CONFIRMED',
            note: 'Tập bài thân trên',
            registration: {
              registration_id: 'reg1',
              customer: { user_id: 'u1', full_name: 'Lê Văn C' },
              trainer: { user_id: 'u2', gym_trainer_id: trainerId, full_name: 'HLV Trần An' },
              gym: { gym_id: gymId, gym_name: 'Gym Bình An' },
            },
          },
        ], 1, 1),
      });
    }

    if (path.includes('/management/packages')) {
      return route.fulfill({
        json: paged([
          {
            package_id: 'pkg1',
            gym_id: gymId,
            package_name: 'Gói 1 tháng',
            price: '500000',
            duration_days: 30,
            status: 'ACTIVE',
          },
        ], 1, 4),
      });
    }

    if (path.includes('/management/trainers')) {
      return route.fulfill({
        json: paged([
          {
            gym_trainer_id: trainerId,
            gym_id: gymId,
            user_id: 'u2',
            status: 'ACTIVE',
            specialization: 'Sức mạnh',
          },
        ], 1, 3),
      });
    }

    return route.fulfill({ json: ok({}) });
  });
};

test('Manager Dashboard displays authentic metrics, recent appointments, and navigation', async ({ page }) => {
  await setup(page);
  await page.goto('/manager/dashboard');

  // Verify Page Heading
  await expect(page.getByRole('heading', { level: 1, name: 'Tổng quan Gym Bình An' })).toBeVisible();
  await expect(page.getByText('Đang hoạt động')).toBeVisible();

  // Verify Summary Metrics
  await expect(page.getByText('Tư vấn chờ liên hệ')).toBeVisible();
  await expect(page.locator('.management-metric-card', { hasText: 'Tư vấn chờ liên hệ' }).locator('.management-metric-value')).toHaveText('5');
  await expect(page.getByText('Sự cố chờ xử lý')).toBeVisible();
  await expect(page.locator('.management-metric-card', { hasText: 'Sự cố chờ xử lý' }).locator('.management-metric-value')).toHaveText('2');
  await expect(page.getByText('Gói tập đang bán')).toBeVisible();
  await expect(page.locator('.management-metric-card', { hasText: 'Gói tập đang bán' }).locator('.management-metric-value')).toHaveText('4');
  await expect(page.getByText('Huấn luyện viên hoạt động')).toBeVisible();
  await expect(page.locator('.management-metric-card', { hasText: 'Huấn luyện viên hoạt động' }).locator('.management-metric-value')).toHaveText('3');

  // Verify Metric links
  const consultCard = page.locator('a.management-metric-card', { hasText: 'Tư vấn chờ liên hệ' });
  await expect(consultCard).toHaveAttribute('href', '/manager/consultations?status=PENDING');

  const reportCard = page.locator('a.management-metric-card', { hasText: 'Sự cố chờ xử lý' });
  await expect(reportCard).toHaveAttribute('href', '/manager/reports?status=PENDING');

  // Verify Recent Appointments List
  await expect(page.getByRole('heading', { name: 'Lịch hẹn vận hành gần nhất' })).toBeVisible();
  await expect(page.getByText('Học viên: Lê Văn C · PT: HLV Trần An')).toBeVisible();
  await expect(page.getByText('Đã xác nhận')).toBeVisible();

  // Verify Immediate Tasks
  await expect(page.getByText('Tư vấn: Khách Hàng A (0901234567)')).toBeVisible();
  await expect(page.getByText('Sự cố: Máy chạy bộ số 2 bị hỏng cáp')).toBeVisible();

  // Verify Quick Links
  await expect(page.getByRole('link', { name: 'Cập nhật thông tin phòng tập' })).toHaveAttribute('href', '/manager/gym');
  await expect(page.getByRole('link', { name: 'Quản lý thư viện ảnh' })).toHaveAttribute('href', '/manager/gallery');
  await expect(page.getByRole('link', { name: 'Tiếp nhận huấn luyện viên mới' })).toHaveAttribute('href', '/manager/trainers/assign');
});

test('ManagementShell sidebar collapse, navigation active state, and mobile drawer', async ({ page }) => {
  await setup(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/manager/dashboard');

  // Active state in sidebar
  const activeLink = page.getByRole('navigation', { name: 'Menu chức năng' }).getByRole('link', { name: 'Tổng quan' });
  await expect(activeLink).toHaveClass(/is-active/);

  // Desktop collapse
  const sidebar = page.locator('aside.management-sidebar');
  await expect(sidebar).not.toHaveClass(/is-collapsed/);
  await page.getByRole('button', { name: 'Thu gọn menu bên' }).click();
  await expect(sidebar).toHaveClass(/is-collapsed/);
  await page.getByRole('button', { name: 'Mở rộng menu bên' }).click();
  await expect(sidebar).not.toHaveClass(/is-collapsed/);

  // Responsive & Mobile drawer at 375px
  await page.setViewportSize({ width: 375, height: 900 });
  const openMenuBtn = page.getByRole('button', { name: 'Mở menu' });
  await expect(openMenuBtn).toBeVisible();

  await openMenuBtn.click();
  await expect(sidebar).toHaveClass(/is-mobile-open/);

  // Press Escape to close drawer
  await page.keyboard.press('Escape');
  await expect(sidebar).not.toHaveClass(/is-mobile-open/);
});

test('Keyboard skip link navigates to main content', async ({ page }) => {
  await setup(page);
  await page.goto('/manager/dashboard');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Đến nội dung chính' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#gym-main')).toBeFocused();
});

test('Resilience: partial failure displays error in specific card with retry while other cards function', async ({ page }) => {
  let fail = true;
  await page.route('**/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/auth/me')) {
      return route.fulfill({
        json: ok({
          user_id: userId,
          email: 'manager@example.com',
          roles: ['MANAGER'],
          status: 'ACTIVE',
          must_change_password: false,
          profile: { full_name: 'Quản Lý An' },
          active_gym_assignments: [{ gym_id: gymId, gym_name: 'Gym Bình An', assignment_type: 'MANAGER' }],
        }),
      });
    }
    if (path.includes('/consultation-requests')) {
      if (fail) return route.fulfill({ status: 500, json: { success: false, error: { message: 'Lỗi' } } });
      return route.fulfill({ json: paged([], 1, 7) });
    }
    if (path.includes('/reports')) return route.fulfill({ json: paged([], 1, 3) });
    if (path.includes('/pt-appointments')) return route.fulfill({ json: paged([]) });
    if (path.includes('/management/packages')) return route.fulfill({ json: paged([], 1, 4) });
    if (path.includes('/management/trainers')) return route.fulfill({ json: paged([], 1, 2) });
    return route.fulfill({ json: ok({}) });
  });

  await page.goto('/manager/dashboard');

  // Consultations failed: shows retry button
  await expect(page.getByText('Không thể tải')).toBeVisible();
  // Reports succeeded: shows 3
  await expect(page.getByText('3')).toBeVisible();

  // Retry after recovery
  fail = false;
  await page.getByRole('button', { name: 'Thử lại' }).click();
  await expect(page.getByText('7')).toBeVisible();
  await expect(page.getByText('Không thể tải')).toHaveCount(0);
});

test('Responsive layout and accessibility audit across viewports', async ({ page }) => {
  await setup(page);
  await page.goto('/manager/dashboard');

  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const overflow = await page.evaluate(() => ({ actual: document.documentElement.scrollWidth, viewport: innerWidth }));
    expect(overflow.actual).toBeLessThanOrEqual(overflow.viewport + 1);
  }

  // Axe accessibility audit
  for (const width of [375, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(results.violations).toEqual([]);
  }
});
