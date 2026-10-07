import { test, expect, type Page } from '@playwright/test';
const gymId = '10000000-0000-4000-8000-000000000001';
const gymB = '10000000-0000-4000-8000-000000000002';
const trainerId = '20000000-0000-4000-8000-000000000001';
const userId = '30000000-0000-4000-8000-000000000001';
const gym = { gym_id: gymId, gym_name: 'Gym Bình An', address: '12 Nguyễn Trãi', description: 'Không gian tập luyện thoáng.',
  phone: '0901234567', email: 'gym@example.com', latitude: '10.7', longitude: '106.6', logo_url: null,
  opening_time: '06:00:00', closing_time: '22:00:00', status: 'ACTIVE', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' };
const trainer = { gym_trainer_id: trainerId, gym_id: gymId, specialization: 'Sức mạnh', experience_years: 4, bio: 'Tập luyện an toàn.',
  status: 'ACTIVE', availability: 'BUSY', joined_at: '2026-01-01T00:00:00Z', profile: { full_name: 'Trần An', avatar_url: null },
  social_links: [{ social_link_id: 'link', platform: 'Website', url: 'https://example.com' }],
  working_schedules: [{ schedule_id: 'slot', day_of_week: 1, start_time: '08:00:00', end_time: '12:00:00', status: 'ACTIVE' }] };
const paged = (data: unknown[], page = 1, total = data.length) => ({ success: true, data, pagination: { page, pageSize: 12, totalItems: total, totalPages: Math.ceil(total / 12), hasNextPage: page < Math.ceil(total / 12), hasPreviousPage: page > 1 } });
const ok = (data: unknown) => ({ success: true, data });
const failure = (code: string, message: string, details?: object) => ({ success: false, error: { code, message, details } });
const setup = async (page: Page, role = 'GUEST', forced = false) => {
  await page.route('**/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/auth/me')) {
      if (role === 'GUEST') return route.fulfill({ status: 401, json: failure('UNAUTHENTICATED', 'Đăng nhập để tiếp tục.') });
      return route.fulfill({ json: ok({ user_id: userId, email: 'actor@example.com', roles: [role], status: 'ACTIVE', must_change_password: forced,
        profile: { full_name: 'Người dùng' }, active_gym_assignments: role === 'MANAGER' ? [{ gym_id: gymId, gym_name: gym.gym_name, assignment_type: 'MANAGER' }] : [] }) });
    }
    if (route.request().method() !== 'GET') return route.fulfill({ json: ok(gym) });
    if (path.endsWith('/management/trainers')) return route.fulfill({ json: paged([{ ...trainer, user_id: userId, status: 'INACTIVE' }]) });
    if (path.endsWith('/managers')) return route.fulfill({ json: ok([{ gym_manager_id: trainerId, gym_id: gymId, user_id: userId, status: 'ACTIVE', assigned_at: gym.created_at }]) });
    if (path.endsWith(`/trainers/${trainerId}`)) return route.fulfill({ json: ok({ ...trainer, user_id: 'PRIVATE USER', email: 'private@secret.test', phone: 'PRIVATE PHONE' }) });
    if (path.endsWith('/trainers')) return route.fulfill({ json: paged([trainer]) });
    if (path.endsWith(`/gyms/${gymId}`)) return route.fulfill({ json: ok(gym) });
    if (path.endsWith('/gyms')) return route.fulfill({ json: paged([gym, ...(role === 'ADMIN' && path.endsWith('/admin/gyms') ? [{ ...gym, gym_id: gymB, gym_name: 'Gym Ngừng', status: 'INACTIVE' }] : [])]) });
    return route.fulfill({ status: 404, json: failure('NOT_FOUND', 'Không tìm thấy.') });
  });
};

test('Guest directory, detail, two CTAs and public PT projection', async ({ page }) => {
  await setup(page);
  await page.goto('/gyms');
  await page.getByRole('link', { name: gym.gym_name, exact: true }).click();
  await expect(page.getByRole('heading', { name: gym.gym_name })).toBeVisible();
  await expect(page.getByText('06:00 / 22:00')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Đăng ký ngay' })).toHaveAttribute('href', `/gyms/${gymId}/packages`);
  await expect(page.getByRole('link', { name: 'Đặt lịch tư vấn' })).toHaveAttribute('href', `/gyms/${gymId}/consultation`);
  await page.getByRole('link', { name: 'Khám phá đội ngũ PT' }).click();
  await page.getByRole('link', { name: 'Trần An' }).click();
  await expect(page.getByText('Thứ hai: 08:00–12:00')).toBeVisible();
  await expect(page.getByText('4 năm kinh nghiệm · Đang bận')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Website' })).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(page.locator('body')).not.toContainText('PRIVATE');
  await expect(page.locator('body')).not.toContainText('private@secret.test');
});

test('Directory search resets pagination and reads top-level pagination envelope', async ({ page }) => {
  await setup(page);
  await page.route('**/api/v1/gyms?**', route => {
    const params = new URL(route.request().url()).searchParams;
    return route.fulfill({ json: paged([gym], Number(params.get('page')), 25) });
  });
  await page.goto('/gyms?page=2');
  await expect(page.getByText('Trang 2 / 3 · 25 kết quả')).toBeVisible();
  const request = page.waitForRequest(req => req.url().includes('/gyms?') && new URL(req.url()).searchParams.get('search') === 'Bình');
  await page.getByLabel('Tên Gym hoặc địa chỉ').fill('Bình');
  await page.getByRole('button', { name: 'Tìm phòng tập' }).click();
  expect(new URL((await request).url()).searchParams.get('page')).toBe('1');
  await expect(page.getByText('Trang 1 / 3 · 25 kết quả')).toBeVisible();
});

test('Loading, empty, network error and retry', async ({ page }) => {
  await setup(page);
  let resolve: () => void = () => {};
  const gate = new Promise<void>(r => { resolve = r; });
  let calls = 0;
  await page.route('**/api/v1/gyms?**', async route => {
    calls++;
    if (calls === 1) { await gate; return route.abort(); }
    return route.fulfill({ json: paged([]) });
  });
  await page.goto('/gyms');
  await expect(page.getByRole('status', { name: 'Đang tải dữ liệu' })).toBeVisible();
  resolve();
  await expect(page.getByRole('alert')).toBeVisible();
  await page.getByRole('button', { name: 'Thử lại' }).click();
  await expect(page.getByText('Chưa có Gym phù hợp.', { exact: false })).toBeVisible();
});

test('Inactive or nonexistent Gym shows safe error', async ({ page }) => {
  await setup(page);
  await page.goto(`/gyms/${gymB}`);
  await expect(page.getByRole('alert')).toContainText('tài nguyên không còn khả dụng');
  await expect(page.getByRole('link', { name: 'Đăng ký ngay' })).toHaveCount(0);
});

for (const role of ['GUEST', 'CUSTOMER', 'PT', 'MANAGER']) {
  test(`${role} cannot use Admin routes`, async ({ page }) => {
    await setup(page, role);
    let calls = 0;
    await page.route('**/api/v1/admin/gyms?**', route => { calls++; return route.fulfill({ json: paged([]) }); });
    await page.goto('/admin/gyms');
    if (role === 'GUEST') await expect(page).toHaveURL(/\/login/);
    else await expect(page.getByRole('heading', { name: 'Không có quyền truy cập' })).toBeVisible();
    expect(calls).toBe(0);
  });
}

test('Forced password change guards management', async ({ page }) => {
  await setup(page, 'MANAGER', true);
  await page.goto('/manager/trainers');
  await expect(page).toHaveURL(/\/change-password/);
});

test('Manager edit sends partial allowlisted PATCH to assigned Gym only', async ({ page }) => {
  await setup(page, 'MANAGER');
  await page.goto('/manager/gym');
  await page.getByLabel('Tên phòng Gym', { exact: true }).fill('Gym Mới');
  const request = page.waitForRequest(req => req.method() === 'PATCH');
  await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
  const actual = await request;
  expect(actual.url()).toContain(`/gyms/${gymId}`);
  expect(actual.postDataJSON()).toEqual({ gym_name: 'Gym Mới' });
});

test('Manager roster uses internal endpoint and shows INACTIVE', async ({ page }) => {
  await setup(page, 'MANAGER');
  await page.goto('/manager/trainers');
  await expect(page.getByRole('article').getByText('Ngừng hoạt động', { exact: true })).toBeVisible();
  const request = page.waitForRequest(req => req.url().includes('/management/trainers') && req.url().includes('status=INACTIVE'));
  await page.getByLabel('Trạng thái').selectOption('INACTIVE');
  expect((await request).url()).toContain(`/gyms/${gymId}/management/trainers`);
});

test('Admin creates allowlisted Gym without account or status and prevents duplicate submit', async ({ page }) => {
  await setup(page, 'ADMIN');
  let posts = 0;
  let resolve: () => void = () => {};
  const gate = new Promise<void>(r => { resolve = r; });
  await page.route('**/api/v1/gyms', async route => {
    posts++;
    expect(route.request().postDataJSON()).toEqual({ gym_name: 'Gym Mới', address: 'Địa chỉ mới', phone: null, email: null, latitude: null, longitude: null, logo_url: null, opening_time: null, closing_time: null, description: null });
    await gate; await route.fulfill({ json: ok(gym), status: 201 });
  });
  await page.goto('/admin/gyms/create');
  await page.getByLabel('Tên phòng Gym', { exact: true }).fill('Gym Mới');
  await page.getByLabel('Địa chỉ', { exact: true }).fill('Địa chỉ mới');
  await page.getByRole('button', { name: 'Tạo Gym', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Đang lưu…' })).toBeDisabled();
  resolve();
  await expect(page.getByRole('status')).toContainText('Thông tin đã được lưu');
  expect(posts).toBe(1);
});

test('Admin inactive Gym editable using internal list; status conflict shows obligation counts', async ({ page }) => {
  await setup(page, 'ADMIN');
  await page.route(`**/api/v1/gyms/${gymId}/status`, route => route.fulfill({ status: 409, json: failure('GYM_HAS_OPEN_OBLIGATIONS', 'Gym có nghĩa vụ đang mở.', { payments: 2, memberships: 3, registrations: 1, appointments: 4 }) }));
  await page.goto('/admin/gyms');
  await page.getByRole('link', { name: 'Sửa thông tin Gym Ngừng' }).click();
  await expect(page.getByLabel('Tên phòng Gym', { exact: true })).toHaveValue('Gym Ngừng');
  await page.reload();
  await expect(page.getByLabel('Tên phòng Gym', { exact: true })).toHaveValue('Gym Ngừng');
  await page.getByRole('link', { name: 'Danh sách Gym', exact: true }).click();
  await page.getByRole('button', { name: 'Ngừng Gym Gym Bình An' }).click();
  await page.getByRole('button', { name: 'Xác nhận', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Thanh toán: 2');
  await expect(page.getByRole('alert')).toContainText('Lịch hẹn: 4');
});

test('PT provisioning uses new fields and temporary password can be dismissed', async ({ page }) => {
  await setup(page, 'MANAGER');
  await page.route(`**/api/v1/gyms/${gymId}/trainers/provision`, async route => {
    expect(route.request().postDataJSON()).toEqual({ full_name: 'Nguyễn PT', email: 'pt@example.com', specialization: 'Sức mạnh', experience_years: 0, bio: 'Tiểu sử PT' });
    await route.fulfill({ status: 201, json: ok({ temporary_password: 'test-only-credential', user: { email: 'pt@example.com' }, assignment: { gym_id: gymId } }) });
  });
  await page.goto('/manager/trainers/assign');
  await page.getByLabel('Cách tiếp nhận').selectOption('provision');
  await page.getByLabel('Họ và tên').fill('Nguyễn PT');
  await page.getByLabel('Email', { exact: true }).fill('pt@example.com');
  await page.getByLabel('Chuyên môn', { exact: true }).fill('Sức mạnh');
  await page.getByLabel('Số năm kinh nghiệm').fill('0');
  await page.getByLabel('Tiểu sử').fill('Tiểu sử PT');
  await page.getByRole('button', { name: 'Cấp tài khoản', exact: true }).click();
  await expect(page.getByLabel('Mật khẩu tạm', { exact: true })).toHaveText('test-only-credential');
  expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
  await page.getByRole('button', { name: 'Đã bàn giao, ẩn mật khẩu' }).click();
  await expect(page.locator('body')).not.toContainText('test-only-credential');
});

test('Manager assignment uses selected Gym; switching clears form and credential', async ({ page }) => {
  await setup(page, 'ADMIN');
  await page.goto('/admin/managers');
  await page.getByLabel('Chọn Gym').selectOption(gymId);
  await page.getByLabel('User ID', { exact: true }).fill(userId);
  const request = page.waitForRequest(req => req.url().endsWith(`/gyms/${gymId}/managers/assign`));
  await page.getByRole('button', { name: 'Lưu phân công' }).click();
  expect((await request).postDataJSON()).toEqual({ user_id: userId });
  await page.getByLabel('Chọn Gym').selectOption(gymB);
  await expect(page.getByLabel('User ID', { exact: true })).toHaveValue('');
  await expect(page.getByText(`Phòng Gym: ${gymB}`)).toBeVisible();
});

for (const width of [375, 768, 1024, 1440]) {
  test(`Responsive public and Admin forms at ${width}px; keyboard focus`, async ({ page }) => {
    await setup(page, 'ADMIN');
    await page.setViewportSize({ width, height: 900 });
    for (const path of ['/gyms', `/gyms/${gymId}`, `/gyms/${gymId}/trainers/${trainerId}`, '/admin/gyms/create', '/admin/managers']) {
      await page.goto(path);
      await expect(page.getByRole('heading').first()).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      if ([375, 1440].includes(width)) await page.screenshot({ path: `/tmp/gym03-${width}-${path.replaceAll('/', '_')}.png`, fullPage: true });
    }
    await page.goto('/gyms');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Đến nội dung chính' })).toBeFocused();
    expect(await page.getByRole('link', { name: 'Đến nội dung chính' }).evaluate(el => getComputedStyle(el).outlineStyle)).toBe('solid');
  });
}


test('Revoked Manager read hides records; missing assignment blocks scope', async ({ page }) => {
  await setup(page, 'MANAGER');
  await page.route('**/api/v1/gyms/*/management/trainers?**', route => route.fulfill({ status: 403, json: failure('GYM_SCOPE_FORBIDDEN', 'Không có quyền.') }));
  await page.goto('/manager/trainers');
  await expect(page.getByRole('alert')).toContainText('Không có quyền truy cập');
  await expect(page.getByRole('article')).toHaveCount(0);
  await page.route('**/api/v1/auth/me', route => route.fulfill({ json: ok({ user_id: userId, roles: ['MANAGER'], status: 'ACTIVE', must_change_password: false, active_gym_assignments: [] }) }));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Chưa có phân công Gym' })).toBeVisible();
});

test('Gym form clears nullable field and browser rejects out-of-range coordinates', async ({ page }) => {
  await setup(page, 'MANAGER');
  await page.goto('/manager/gym');
  await page.getByLabel('Vĩ độ', { exact: true }).fill('91');
  let writes = 0;
  page.on('request', req => { if (req.method() === 'PATCH') writes++; });
  await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
  expect(await page.getByLabel('Vĩ độ', { exact: true }).evaluate((el: HTMLInputElement) => el.validity.rangeOverflow)).toBe(true);
  expect(writes).toBe(0);
  await page.getByLabel('Vĩ độ', { exact: true }).fill('10.7');
  await page.getByLabel('Điện thoại', { exact: true }).fill('');
  const request = page.waitForRequest(req => req.method() === 'PATCH');
  await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
  expect((await request).postDataJSON()).toEqual({ phone: null });
});

test('Assign existing PT sends user_id and new profile fields without supplying Gym in body', async ({ page }) => {
  await setup(page, 'MANAGER');
  await page.goto('/manager/trainers/assign');
  await page.getByLabel('User ID', { exact: true }).fill(userId);
  await page.getByLabel('Chuyên môn', { exact: true }).fill('Sức mạnh');
  await page.getByLabel('Số năm kinh nghiệm').fill('3');
  await page.getByLabel('Tiểu sử').fill('Tiểu sử');
  const request = page.waitForRequest(req => req.method() === 'POST');
  await page.getByRole('button', { name: 'Lưu phân công' }).click();
  expect((await request).postDataJSON()).toEqual({ user_id: userId, specialization: 'Sức mạnh', experience_years: 3, bio: 'Tiểu sử' });
});

test('Unavailable APIs have honest CTA destinations', async ({ page }) => {
  await setup(page);
  await page.goto(`/gyms/${gymId}/consultation`);
  await expect(page.getByText('Chức năng này chưa được triển khai.', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Gửi yêu cầu' })).toHaveCount(0);
});
