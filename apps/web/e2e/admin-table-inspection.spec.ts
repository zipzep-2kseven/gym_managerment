import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const gym = '10000000-0000-4000-8000-000000000001';
const ok = (data: unknown) => ({ success: true, data });
const paged = (data: unknown[]) => ({ ...ok(data), pagination: { page: 1, pageSize: 20, totalItems: data.length, totalPages: 1, hasPreviousPage: false, hasNextPage: false } });
const fixture = async (page: Page) => {
  const reads: string[] = [], errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  let suspended = false;
  const row = () => ({ user_id: gym, email: 'customer@example.test', phone: '0901234567', status: suspended ? 'SUSPENDED' : 'ACTIVE', roles: ['CUSTOMER'],
    profile: { full_name: 'Nguyễn Minh Anh' }, active_gym_assignments: [], must_change_password: false, email_verified_at: null,
    created_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-01T00:00:00Z' });
  await page.route('**/api/v1/**', route => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname;
    if (path.endsWith('/auth/me')) return route.fulfill({ json: ok({ user_id: 'admin', email: 'admin@example.test', roles: ['ADMIN'], status: 'ACTIVE', must_change_password: false, profile: { full_name: 'Admin' }, active_gym_assignments: [] }) });
    if (path.includes('/inspection/')) {
      const resource = path.split('/').pop()!; reads.push(resource);
      const entries: Record<string, unknown> = {
        trainers: { full_name: 'PT Minh', email: 'pt@example.test', specialization: 'Yoga', status: 'ACTIVE', bio: 'Huấn luyện cá nhân' },
        schedules: { trainer_name: 'PT Minh', day_of_week: 'MONDAY', start_time: '08:00', end_time: '17:00', status: 'ACTIVE' },
        social: { trainer_name: 'PT Minh', platform: 'WEBSITE', url: 'https://example.test' },
        packages: { package_name: 'Gói tháng', duration_days: 30, price: '300000', status: 'ACTIVE' },
        memberships: { full_name: 'Nguyễn Minh Anh', email: 'customer@example.test', package_name: 'Gói tháng', end_date: '2099-12-31', status: 'ACTIVE' },
        payments: { full_name: 'Nguyễn Minh Anh', package_name: 'Gói tháng', amount: '300000', status: 'SUCCESS', paid_at: null },
        consultations: { full_name: 'Khách tư vấn', phone: '0901234567', preferred_contact: 'Buổi sáng', status: 'PENDING' },
        appointments: { customer_name: 'Nguyễn Minh Anh', trainer_name: 'PT Minh', start_time: '2026-11-01T08:00:00Z', end_time: '2026-11-01T09:00:00Z', status: 'PENDING' },
        registrations: { customer_name: 'Nguyễn Minh Anh', trainer_name: 'PT Minh', package_name: 'Gói tháng', status: 'ACTIVE' },
        equipment: { equipment_code: 'MAY-01', equipment_type: 'Máy chạy bộ', condition: 'GOOD', status: 'ACTIVE' },
        images: { caption: 'Khu tập chính', display_order: 0 },
        reports: { title: 'Sự cố máy chạy', full_name: 'Nguyễn Minh Anh', content: 'Máy phát tiếng ồn', status: 'IN_PROGRESS', has_image: false, resolution_note: 'Đang kiểm tra', created_at: '2026-10-01T00:00:00Z' },
        'gym-reviews': { full_name: 'Nguyễn Minh Anh', rating: 5, comment: 'Phòng tập tốt', status: 'VISIBLE' },
        'trainer-reviews': { full_name: 'Nguyễn Minh Anh', trainer_name: 'PT Minh', rating: 4, comment: 'Hướng dẫn tốt', status: 'VISIBLE' },
      };
      return route.fulfill({ json: paged([{ id: gym, ...entries[resource] as object }]) });
    }
    if (path.endsWith('/managers')) return route.fulfill({ json: ok([]) });
    if (path.endsWith('/admin/gyms')) return route.fulfill({ json: paged([{ gym_id: gym, gym_name: 'Gym Quận 1', address: '123 Nguyễn Văn Cừ, TP.HCM', manager: { user_id: gym, full_name: 'Manager An', email: 'manager@example.test' }, status: 'ACTIVE' }]) });
    if (path.includes('/admin/users')) {
      if (request.method() === 'PATCH') { suspended = !suspended; return route.fulfill({ json: ok(row()) }); }
      return route.fulfill({ json: ok({ items: [row()], total: 1, page: 1, page_size: 20 }) });
    }
    if (path.includes('/admin/reviews')) return route.fulfill({ json: ok({ items: [], total: 0, page: 1, page_size: 10 }) });
    return route.fulfill({ status: 404, json: { success: false, error: { code: 'NOT_FOUND', message: path } } });
  });
  return { reads, errors };
};

test('Account table has compact actions, details drawer and confirmed status change', async ({ page }) => {
  const { errors } = await fixture(page);
  await page.goto('/admin/users');
  await expect(page.getByRole('table')).toContainText('Nguyễn Minh Anh');
  await expect(page.getByRole('columnheader', { name: 'Ngày đăng ký' })).toBeVisible();
  const open = page.getByRole('button', { name: 'Xem tài khoản customer@example.test' });
  await open.click();
  await expect(page.getByRole('dialog')).toContainText('0901234567');
  await page.keyboard.press('Escape'); await expect(open).toBeFocused();
  await page.getByRole('button', { name: 'Khóa tạm tài khoản', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Thẻ hội viên');
  await page.getByRole('button', { name: 'Xác nhận', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Mở lại tài khoản', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('Every Gym tab and subgroup reads its own data, supports details, and exposes no operation forms', async ({ page }) => {
  const { reads, errors } = await fixture(page);
  await page.goto(`/admin/gyms/${gym}`);
  await expect(page.getByRole('navigation', { name: 'Thông tin phòng Gym' })).toBeVisible();
  expect(reads).toEqual([]);
  for (const [tab, resources] of [
    ['staff', ['trainers', 'schedules', 'social']], ['members', ['packages', 'memberships', 'payments', 'consultations']],
    ['pt', ['appointments', 'registrations']], ['facilities', ['equipment', 'images']], ['reports', ['reports']], ['reviews', ['gym-reviews', 'trainer-reviews']],
  ] as const) {
    for (const resource of resources) {
      await page.goto(`/admin/gyms/${gym}/${tab}?view=${resource}`);
      await expect(page.getByRole('table')).toBeVisible();
      await expect.poll(() => reads.at(-1)).toBe(resource);
      await page.getByRole('table').getByRole('button').first().click();
      await expect(page.getByRole('dialog')).toBeVisible();
      if (resource === 'reports') await expect(page.getByRole('dialog')).toContainText('Đang kiểm tra');
      await page.keyboard.press('Escape');
      for (const label of ['Tiếp nhận', 'Giải quyết', 'Từ chối', 'Tạo gói tập', 'Upload ảnh', 'Đổi lịch']) {
        await expect(page.getByRole('button', { name: label, exact: true })).toHaveCount(0);
      }
    }
  }
  await page.reload(); await expect(page.getByRole('table')).toBeVisible();
  expect(errors).toEqual([]);
});

test('Gym review link opens moderation with Gym and target filters', async ({ page }) => {
  await fixture(page);
  await page.goto(`/admin/gyms/${gym}/reviews?view=trainer-reviews`);
  await page.getByRole('link', { name: 'Mở kiểm duyệt' }).click();
  await expect(page).toHaveURL(new RegExp(`gym_id=${gym}&kind=trainer`));
  await expect(page.getByLabel('Loại đánh giá')).toHaveValue('trainer');
  await expect(page.getByRole('heading', { name: 'Kiểm duyệt đánh giá', exact: true })).toBeVisible();
});

for (const width of [1440, 375]) test(`Tables and Gym inspection remain accessible at ${width}px`, async ({ page }) => {
  const { errors } = await fixture(page);
  await page.setViewportSize({ width, height: 1000 });
  for (const [name, path] of [['accounts', '/admin/users'], ['gyms', '/admin/gyms'], ['inspection', `/admin/gyms/${gym}/reports`]]) {
    await page.goto(path); await expect(page.getByRole('table')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    await page.screenshot({ path: `../../docs/design/admin-workspace/previews/table-${name}-${width}.png`, fullPage: true });
  }
  expect(errors).toEqual([]);
});
