import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const api = 'http://127.0.0.1:4103/api/v1';
test('QA-02 route accessibility and responsive widths for every role', async ({ page, context }) => {
  const gymResponse = await context.request.get(`${api}/gyms`);
  const gymBody = await gymResponse.json();
  const gym = gymBody.data[0].gym_id;
  const trainersBody = await (await context.request.get(`${api}/gyms/${gym}/trainers`)).json();
  const trainer = trainersBody.data[0].gym_trainer_id;
  const packagesBody = await (await context.request.get(`${api}/gyms/${gym}/packages`)).json();
  const pkg = packagesBody.data[0].package_id;
  const publicRoutes = ['/gyms', `/gyms/${gym}`, `/gyms/${gym}/trainers`, `/gyms/${gym}/trainers/${trainer}`, `/gyms/${gym}/packages`, `/gyms/${gym}/packages/${pkg}`, `/gyms/${gym}/consultation`, '/login', '/register'];
  const roles = [
    { role: '', routes: publicRoutes },
    { role: 'customer', routes: ['/dashboard', '/profile', '/change-password', '/payments', '/memberships', '/reports', '/my-pt', `/gyms/${gym}/pt-register`, `/gyms/${gym}/packages/${pkg}/checkout`] },
    { role: 'pt', routes: ['/pt/dashboard', '/pt/profile', '/my-pt'] },
    { role: 'manager', routes: ['/manager/dashboard', '/manager/gym', '/manager/trainers', '/manager/trainers/assign', `/manager/trainers/${trainer}/profile`, '/manager/packages', '/manager/gallery', '/manager/reports', '/manager/consultations', '/manager/pt'] },
    { role: 'admin', routes: ['/admin/dashboard', '/admin/roles', '/admin/users', '/admin/reviews', '/admin/gyms', '/admin/gyms/create', `/admin/gyms/${gym}`, `/admin/gyms/${gym}/packages`, `/admin/gyms/${gym}/gallery`, `/admin/gyms/${gym}/reports`, `/admin/gyms/${gym}/pt`, '/admin/managers'] },
  ];
  const failures: unknown[] = [];
  for (const { role, routes } of roles) {
    await context.clearCookies();
    if (role) {
      const login = await context.request.post(`${api}/auth/login`, { data: { email: `${role}@gym03.test`, password: 'BrowserFixture@123' } });
      expect(login.ok()).toBeTruthy();
    }
    for (const route of routes) {
      await page.goto(route);
      await expect(page.locator('h1'), route).toBeVisible();
      console.log(`Audit ${role || 'guest'} ${route}`);
      await expect(page.locator('.gym-skeleton')).toHaveCount(0);
      for (const width of [375, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        const overflow = await page.evaluate(() => ({ actual: document.documentElement.scrollWidth, viewport: innerWidth }));
        if (overflow.actual > overflow.viewport + 1) failures.push({ role, route, width, overflow });
      }
      for (const width of [375, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
        if (results.violations.length) failures.push({ role, route, width, violations: results.violations.map(({ id, nodes }) => ({ id, nodes: nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })) });
      }
      if (['/gyms', '/manager/gym', '/profile'].includes(route)) {
        await mkdir('.qa-artifacts', { recursive: true });
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.screenshot({ path: `.qa-artifacts/${role || 'guest'}-1440.png`, fullPage: true });
        await page.setViewportSize({ width: 375, height: 900 });
        await page.screenshot({ path: `.qa-artifacts/${role || 'guest'}-375.png`, fullPage: true });
      }
    }
  }
  await mkdir('.qa-artifacts', { recursive: true });
  await writeFile('.qa-artifacts/accessibility-results.json', JSON.stringify(failures, null, 2));
  expect(failures, 'See .qa-artifacts/accessibility-results.json').toEqual([]);
});

test('QA-02 keyboard skip navigation and auth input labels', async ({ page }) => {
  await page.goto('/gyms');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Đến nội dung chính' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#gym-main')).toBeFocused();
  await page.goto('/login');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page.getByLabel('Email')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByLabel('Email')).toHaveAttribute('aria-describedby', 'login-email-error');
  await expect(page.locator('#login-email-error')).toBeVisible();
  await page.getByLabel('Email').fill('missing@example.com');
  await page.getByLabel('Mật khẩu', { exact: true }).fill('WrongPassword@123');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('alert')).toContainText('Email hoặc mật khẩu không chính xác');
  await expect(page.getByRole('button', { name: 'Đăng nhập', exact: true })).toBeEnabled();
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
});

test('QA-02 loading, empty, error and retry remain accessible', async ({ page }) => {
  let release = () => {};
  const gate = new Promise<void>(resolve => { release = resolve; });
  let fail = false;
  await page.route('**/api/v1/gyms?*', async route => {
    await gate;
    return fail ? route.fulfill({ status: 503, json: { success: false, error: { code: 'UNAVAILABLE', message: 'Không tải được danh sách Gym' } } })
      : route.fulfill({ json: { success: true, data: [], pagination: { page: 1, totalPages: 0, totalItems: 0, hasNextPage: false, hasPreviousPage: false } } });
  });
  const audit = async () => expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
  await page.goto('/gyms');
  await expect(page.getByRole('status', { name: 'Đang tải dữ liệu' })).toBeVisible();
  await audit(); release();
  await expect(page.getByText('Chưa có Gym phù hợp.', { exact: false })).toBeVisible();
  await audit(); fail = true;
  await page.getByLabel('Tên Gym hoặc địa chỉ').fill('missing');
  await page.getByRole('button', { name: 'Tìm phòng tập' }).click();
  await expect(page.getByRole('alert')).toContainText('Không tải được danh sách Gym', { timeout: 20000 });
  await audit(); fail = false;
  await page.getByRole('button', { name: 'Thử lại', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByText('Chưa có Gym phù hợp.', { exact: false })).toBeVisible();
});
