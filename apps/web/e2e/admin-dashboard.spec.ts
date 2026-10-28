import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const gymId1 = '10000000-0000-4000-8000-000000000001';
const gymId2 = '10000000-0000-4000-8000-000000000002';
const userId = '30000000-0000-4000-8000-000000000001';

const summary = { total_gyms: 5, active_gyms: 4, total_accounts: 1248, month_revenue: '125000000.00', month: '2026-10', as_of: '2026-10-15T05:00:00Z', timezone: 'Asia/Ho_Chi_Minh', daily_revenue: Array.from({ length: 7 }, (_, i) => ({ date: `2026-10-${String(i + 9).padStart(2, '0')}`, amount: String([50000000, 75000000, 95000000, 65000000, 105000000, 80000000, 125000000][i]) })) };

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

    if (path.endsWith('/admin/dashboard')) return route.fulfill({ json: ok(summary) });

    if (path.endsWith('/managers')) return route.fulfill({ json: ok([]) });

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
              { user_id: 'u1', email: 'user1@example.com', roles: ['CUSTOMER'], status: 'ACTIVE', created_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-01T00:00:00Z', active_gym_assignments: [], profile: null },
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

test.describe('Admin overview and navigation', () => {
  test('Navigation remains usable at drawer and desktop breakpoints', async ({ page }) => {
    await setupAdminMocks(page);
    await page.goto('/admin/dashboard');
    const topbar = page.locator('header.management-topbar');
    const sidebar = page.locator('aside.management-sidebar');
    const backdrop = page.locator('.management-backdrop');

    for (const width of [375, 767, 768, 900, 1023, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      if (width < 1024) {
        const menu = topbar.getByRole('button', { name: 'Mở menu', exact: true });
        await expect(menu).toBeVisible();
        await menu.click();
        await expect(topbar.getByRole('button', { name: 'Đóng menu', exact: true })).toHaveAttribute('aria-expanded', 'true');
        await expect(sidebar.getByRole('link', { name: 'Quản lý phòng Gym', exact: true })).toBeInViewport();
        await expect(backdrop).toBeVisible();
        await sidebar.getByRole('button', { name: 'Đóng thanh điều hướng' }).click();
        await expect(menu).toHaveAttribute('aria-expanded', 'false');
        await expect(backdrop).not.toBeVisible();
      } else {
        await expect(topbar.getByRole('button', { name: 'Mở menu', exact: true })).not.toBeVisible();
        await expect(topbar.getByRole('button', { name: 'Thu gọn menu bên' })).toBeVisible();
        await expect(sidebar.getByRole('link', { name: 'Quản lý phòng Gym', exact: true })).toBeInViewport();
      }
    }

    // A desktop collapse must not shrink the tablet drawer to an icon rail.
    await topbar.getByRole('button', { name: 'Thu gọn menu bên' }).click();
    await page.setViewportSize({ width: 900, height: 900 });
    await topbar.getByRole('button', { name: 'Mở menu', exact: true }).click();
    await expect(sidebar).toHaveCSS('width', '248px');
    await expect(sidebar.getByRole('link', { name: 'Quản lý phòng Gym', exact: true })).toContainText('Quản lý phòng Gym');

    // Leaving drawer mode clears its overlay and open state.
    await page.setViewportSize({ width: 1024, height: 900 });
    await expect(backdrop).not.toBeVisible();
    await expect(topbar.locator('button[aria-label="Mở menu"]')).toHaveAttribute('aria-expanded', 'false');
    await page.setViewportSize({ width: 900, height: 900 });
    await expect(topbar.getByRole('button', { name: 'Mở menu', exact: true })).toHaveAttribute('aria-expanded', 'false');
    await expect(backdrop).not.toBeVisible();
  });

  for (const width of [375, 900]) {
    test(`Drawer keyboard and focus lifecycle at ${width}px`, async ({ page }) => {
      await setupAdminMocks(page);
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/admin/dashboard');
      const sidebar = page.locator('aside.management-sidebar');
      const menu = page.locator('header.management-topbar').getByRole('button', { name: 'Mở menu', exact: true });
      await menu.focus();
      await page.keyboard.press('Shift+Tab');
      await expect(page.locator('.skip-link')).toBeFocused();

      await page.evaluate(() => { document.body.style.overflow = 'auto'; });
      await menu.focus();
      await page.keyboard.press('Enter');
      const close = sidebar.getByRole('button', { name: 'Đóng thanh điều hướng' });
      await expect(close).toBeFocused();
      await expect(sidebar).toHaveAttribute('role', 'dialog');
      await expect(sidebar).toHaveAttribute('aria-modal', 'true');
      await expect(page.locator('.management-content-wrapper')).toHaveAttribute('inert', '');
      await expect(page.locator('.skip-link')).toHaveAttribute('inert', '');
      await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');

      const first = sidebar.locator('a').first();
      const last = sidebar.locator('a').last();
      await last.focus();
      await page.keyboard.press('Tab');
      await expect(first).toBeFocused();
      await page.keyboard.press('Shift+Tab');
      await expect(last).toBeFocused();
      await page.locator('.management-user-profile-link').evaluate((element: HTMLElement) => element.focus());
      await expect(last).toBeFocused();
      const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      expect(accessibility.violations).toEqual([]);

      await page.keyboard.press('Escape');
      await expect(menu).toBeFocused();
      await expect(sidebar).toHaveAttribute('inert', '');
      await expect(page.locator('.management-content-wrapper')).not.toHaveAttribute('inert', '');
      await expect(page.locator('body')).toHaveCSS('overflow', 'auto');

      await menu.click();
      await close.click();
      await expect(menu).toBeFocused();
      await menu.click();
      await page.locator('.management-backdrop').click({ position: { x: width - 10, y: 300 } });
      await expect(menu).toBeFocused();

      await menu.click();
      await sidebar.getByRole('link', { name: 'Quản lý phòng Gym', exact: true }).click();
      await expect(page).toHaveURL(/\/admin\/gyms$/);
      await expect(menu).toBeFocused();
      await expect(page.locator('.management-content-wrapper')).not.toHaveAttribute('inert', '');
    });
  }

  test('Drawer releases focus and background on desktop transition and unmount', async ({ page }) => {
    await setupAdminMocks(page);
    await page.setViewportSize({ width: 900, height: 900 });
    await page.goto('/admin/dashboard');
    const sidebar = page.locator('aside.management-sidebar');
    await page.getByRole('button', { name: 'Mở menu', exact: true }).click();
    await page.setViewportSize({ width: 1024, height: 900 });
    await expect(page.getByRole('button', { name: 'Thu gọn menu bên' })).toBeFocused();
    await expect(sidebar).not.toHaveAttribute('inert', '');
    await expect(sidebar).not.toHaveAttribute('aria-modal', 'true');
    await expect(page.locator('.management-content-wrapper')).not.toHaveAttribute('inert', '');
    await page.setViewportSize({ width: 900, height: 900 });
    await expect(sidebar).toHaveAttribute('inert', '');
    await page.getByRole('button', { name: 'Mở menu', exact: true }).click();
    await sidebar.getByTitle('Về trang chủ MultiGym').click();
    await expect(page).toHaveURL(url => url.pathname === '/');
    await expect(page.locator('.management-shell')).toHaveCount(0);
    await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
  });

  test('Customer cannot access Admin Workspace', async ({ page }) => {
    await setupAdminMocks(page, { role: 'CUSTOMER' });

    await page.goto('/admin/dashboard');

    // Should not render admin dashboard
    await expect(page.getByRole('heading', { level: 1, name: 'Tổng quan hệ thống' })).toHaveCount(0);
  });
});

test.describe('Admin facility management cleanup', () => {
  test('Table shows Manager and compact actions; delete requires confirmation and preserves errors', async ({ page }) => {
    await setupAdminMocks(page);
    let deleted = false, allowDelete = false, deleteCalls = 0;
    const gym = { gym_id: gymId1, gym_name: 'Gym Trung Tâm', address: '123 Nguyễn Huệ, Quận 1', status: 'ACTIVE',
      manager: { user_id: userId, full_name: 'Nguyễn Minh Anh', email: 'manager@example.test' } };
    await page.route('**/api/v1/admin/gyms**', route => route.fulfill({ json: paged(deleted ? [] : [gym]) }));
    await page.route(`**/api/v1/gyms/${gymId1}`, route => {
      if (route.request().method() === 'DELETE') {
        deleteCalls++; deleted = allowDelete;
        return route.fulfill(allowDelete ? { json: ok(gym) } : { status: 409, json: { success: false, error: {
          code: 'GYM_HAS_LINKED_DATA', message: 'Phòng Gym có dữ liệu liên kết nên không thể xóa.' } } });
      }
      return route.fulfill({ json: ok(gym) });
    });
    await page.goto('/admin/gyms');
    const table = page.getByRole('table');
    for (const name of ['Tên phòng tập', 'Địa chỉ', 'Manager phụ trách', 'Trạng thái', 'Thao tác']) {
      await expect(table.getByRole('columnheader', { name, exact: true })).toBeVisible();
    }
    await expect(table).toContainText('Nguyễn Minh Anh');
    await expect(page.getByRole('link', { name: 'Bổ nhiệm Manager', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Xóa Gym Trung Tâm' }).click();
    expect(deleteCalls).toBe(0);
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('button', { name: 'Hủy', exact: true })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Xóa Gym Trung Tâm' })).toBeFocused();
    await page.getByRole('button', { name: 'Xóa Gym Trung Tâm' }).click();
    await dialog.getByRole('button', { name: 'Xác nhận xóa' }).click();
    await expect(dialog.getByRole('alert')).toContainText('không thể xóa');
    await expect(table).toContainText('Gym Trung Tâm');
    allowDelete = true;
    await dialog.getByRole('button', { name: 'Xác nhận xóa' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(table).toContainText('Chưa có phòng Gym phù hợp');
  });

  test('Manager appointment belongs to Gym details; picker submits selected account then revoke updates it', async ({ page }) => {
    await setupAdminMocks(page);
    let assigned = false;
    const assignment = { gym_manager_id: gymId2, gym_id: gymId1, user_id: userId, full_name: 'Manager Mới',
      email: 'manager@example.test', status: 'ACTIVE', assigned_at: '2026-10-14T00:00:00Z' };
    await page.route(`**/api/v1/gyms/${gymId1}/managers`, route => route.fulfill({ json: ok(assigned ? [assignment] : []) }));
    await page.route('**/api/v1/admin/users**', route => route.fulfill({ json: ok({ items: [
      { user_id: userId, email: 'manager@example.test', profile: { full_name: 'Manager Mới' }, roles: ['MANAGER'],
        status: 'ACTIVE', must_change_password: false, active_gym_assignments: [] },
    ], total: 1, page: 1, page_size: 20 }) }));
    await page.route(`**/api/v1/gyms/${gymId1}/managers/assign`, route => {
      expect(route.request().postDataJSON()).toEqual({ user_id: userId }); assigned = true;
      return route.fulfill({ json: ok(assignment) });
    });
    await page.route(`**/api/v1/gyms/${gymId1}/managers/${gymId2}/revoke`, route => {
      assigned = false; return route.fulfill({ json: ok({ ...assignment, status: 'INACTIVE' }) });
    });
    await page.goto(`/admin/gyms/${gymId1}/staff`);
    await expect(page.getByRole('button', { name: 'Lưu phân công' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Bổ nhiệm Manager', exact: true }).click();
    await page.getByLabel('Tài khoản Manager', { exact: true }).selectOption(userId);
    await expect(page.getByLabel('User ID', { exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Lưu phân công', exact: true }).click();
    await expect(page.locator('.admin-manager-current')).toContainText('Manager Mới');
    await page.getByRole('button', { name: 'Đóng form bổ nhiệm' }).click();
    await page.getByRole('button', { name: 'Thu hồi phân công' }).click();
    await page.getByRole('button', { name: 'Xác nhận', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Bổ nhiệm Manager', exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Tổng quan', exact: true }).last().click();
    await page.getByRole('link', { name: 'Sửa thông tin', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/gyms/${gymId1}/edit$`));
    await expect(page.getByRole('button', { name: 'Lưu thay đổi' })).toBeVisible();
  });

  test('Legacy operational routes return to facility list', async ({ page }) => {
    await setupAdminMocks(page);
    for (const path of ['/admin/reports', '/admin/managers']) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/admin\/gyms$/);
      await expect(page.getByRole('heading', { level: 1, name: 'Quản lý phòng Gym' })).toBeVisible();
    }
  });

  test('Facility table and details remain accessible at desktop and mobile sizes', async ({ page }) => {
    await setupAdminMocks(page);
    for (const width of [1440, 375]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const path of ['/admin/gyms', `/admin/gyms/${gymId1}`]) {
        await page.goto(path);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        if (path === '/admin/gyms') await expect(page.getByRole('table')).toBeVisible();
        else await expect(page.getByRole('navigation', { name: 'Thông tin phòng Gym' })).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
        expect(audit.violations).toEqual([]);
        await page.screenshot({ path: `../../docs/design/admin-workspace/previews/cleanup-${path === '/admin/gyms' ? 'list' : 'detail'}-${width}.png`, fullPage: true });
      }
    }
  });
});

test.describe('Admin revenue overview', () => {
  test('Three metrics, correct chart, daily selection and direct links', async ({ page }) => {
    await setupAdminMocks(page);
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/dashboard$/);
    await expect(page.getByRole('heading', { name: 'Tổng quan hệ thống' })).toBeVisible();
    await expect(page.locator('.management-metric-card')).toHaveCount(3);
    await expect(page.getByRole('article', { name: 'Tổng phòng Gym' })).toContainText('4 phòng đang hoạt động');
    await expect(page.getByRole('article', { name: 'Tổng tài khoản' })).toContainText('1.248');
    await expect(page.getByRole('article', { name: 'Doanh thu tháng này' })).toContainText('125.000.000');
    await expect(page.getByRole('group', { name: /Biểu đồ doanh thu theo ngày/ })).toBeVisible();
    await expect(page.locator('.admin-revenue-plot [role=button]')).toHaveCount(7);
    await page.locator('.admin-revenue-plot [role=button]').first().focus();
    await expect(page.locator('.admin-revenue-selection')).toContainText('2026-10-09');
    await expect(page.locator('.management-metric-title a').first()).toHaveAttribute('href', '/admin/gyms');
    await page.locator('.admin-revenue-plot .revenue-point').first().hover();
    await expect(page.getByRole('tooltip')).toContainText('09/10/2026');
    await expect(page.getByRole('tooltip')).toContainText('50.000.000');
    await page.getByRole('heading', { name: 'Tổng quan hệ thống' }).hover();
    await expect(page.getByRole('tooltip')).toHaveCount(0);
    await page.getByRole('article', { name: 'Tổng tài khoản' }).click();
    await expect(page).toHaveURL(/\/admin\/users$/);
    await page.goto('/admin/dashboard');
    await page.getByRole('article', { name: 'Tổng phòng Gym' }).click();
    await expect(page).toHaveURL(/\/admin\/gyms$/);
  });
  test('Zero revenue is a real value and failed refresh retains snapshot until retry', async ({ page }) => {
    await setupAdminMocks(page);
    let failing = false;
    await page.route('**/api/v1/admin/dashboard', route => failing
      ? route.fulfill({ status: 500, json: { success: false, error: { code: 'ERROR', message: 'Failure' } } })
      : route.fulfill({ json: ok({ ...summary, month_revenue: '0', daily_revenue: summary.daily_revenue.map(day => ({ ...day, amount: '0' })) }) }));
    await page.goto('/admin/dashboard');
    await expect(page.getByText('Chưa có thanh toán thành công trong 7 ngày này.')).toBeVisible();
    failing = true;
    await page.getByRole('button', { name: 'Làm mới tổng quan' }).click();
    await expect(page.getByText('Làm mới thất bại. Dữ liệu cũ có thể đã thay đổi.')).toBeVisible();
    await expect(page.locator('.admin-revenue-plot [role=button]')).toHaveCount(7);
    failing = false;
    await page.getByRole('button', { name: 'Thử lại', exact: true }).click();
    await expect(page.getByText('Làm mới thất bại. Dữ liệu cũ có thể đã thay đổi.')).not.toBeVisible();
  });
  test('Initial error has unavailable values, recoverable without navigation', async ({ page }) => {
    await setupAdminMocks(page);
    await page.route('**/api/v1/admin/dashboard', route => route.fulfill({ status: 500, json: { success: false, error: { message: 'Failure' } } }));
    await page.goto('/admin/dashboard');
    await expect(page.getByText('Không thể tải dữ liệu.', { exact: true })).toBeVisible();
    await expect(page.locator('.management-metric-value').first()).toHaveText('—');
    await expect(page.getByRole('img')).toHaveCount(0);
  });
  for (const width of [375, 1440]) test(`Overview fits ${width}px with accessible chart`, async ({ page }) => {
    await setupAdminMocks(page); await page.setViewportSize({ width, height: 1000 });
    await page.goto('/admin/dashboard');
    await expect(page.locator('.admin-revenue-plot [role=button]')).toHaveCount(7);
    const cards = await page.locator('.management-metric-card').evaluateAll(elements => elements.map(element => {
      const { x, y, bottom } = element.getBoundingClientRect(); return { x, y, bottom };
    }));
    if (width === 375) {
      expect(cards[1].y).toBeGreaterThan(cards[0].bottom);
      expect(cards[2].y).toBeGreaterThan(cards[1].bottom);
    } else {
      expect(cards.every(card => card.y === cards[0].y)).toBe(true);
      expect(cards[1].x).toBeGreaterThan(cards[0].x);
      expect(cards[2].x).toBeGreaterThan(cards[1].x);
    }
    expect((await page.locator('.admin-revenue-panel').boundingBox())!.y).toBeGreaterThan(cards[2].bottom);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    await page.screenshot({ path: `../../docs/design/admin-workspace/previews/overview-${width}.png`, fullPage: true });
  });
});

for (const status of [401, 403]) test(`Access ${status} removes the entire cached overview`, async ({ page }) => {
  await setupAdminMocks(page);
  await page.goto('/admin/dashboard');
  await expect(page.locator('.management-metric-card')).toHaveCount(3);
  await expect(page.locator('.management-metric-value').first()).toHaveText('5');
  await page.route('**/api/v1/admin/dashboard', route => route.fulfill({ status,
    json: { success: false, error: { code: 'FORBIDDEN', message: 'Access changed' } } }));
  await page.getByRole('button', { name: 'Làm mới tổng quan', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.locator('.management-metric-card')).toHaveCount(0);
  await expect(page.locator('.admin-revenue-panel')).toHaveCount(0);
});
