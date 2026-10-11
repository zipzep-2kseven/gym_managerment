import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import '../../api/src/config/index.js';

let pool: pg.Pool;
// Fail closed: privileged test queries may only target this run's disposable DB.
test.beforeAll(async () => {
  if (!process.env.AUTH_TEST_DB_INFO) throw new Error('Use playwright.auth.config.ts for isolated auth tests');
  const { databaseName } = JSON.parse(await readFile(process.env.AUTH_TEST_DB_INFO, 'utf8'));
  if (!/^gym03_browser_[a-f0-9]{32}$/.test(databaseName)) throw new Error('Invalid disposable database');
  const url = new URL(process.env.DATABASE_URL!);
  url.pathname = `/${databaseName}`;
  pool = new pg.Pool({ connectionString: url.toString() });
});
test.afterAll(async () => { await pool?.end(); });
async function runDbQuery(sql: string) { await pool.query(sql); }

test.describe('AUTH-03 Acceptance Tests — Authentication & Route Guards', () => {
  let customerEmail: string;
  let pwdCustomerEmail: string;
  let forcedCustomerEmail: string;
  const defaultPassword = 'Password@12345';
  const newPassword = 'NewPassword@12345';
  test.beforeEach(async ({ playwright }, info) => {
    customerEmail = `customer.${randomUUID()}@example.com`;
    pwdCustomerEmail = `password.${randomUUID()}@example.com`;
    forcedCustomerEmail = `forced.${randomUUID()}@example.com`;
    if (/TEST [148] —/.test(info.title)) {
      const request = await playwright.request.newContext({ baseURL: 'http://127.0.0.1:4103' });
      try {
        const response = await request.post('/api/v1/auth/register', { data: { full_name: 'Nguyen Van Customer', email: customerEmail, password: defaultPassword } });
        expect(response.ok()).toBeTruthy();
      } finally { await request.dispose(); }
    }
  });

  // TEST 2: INVALID LOGIN
  test('TEST 2 — Login failure with invalid credentials', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/login');

    // Fill in invalid credentials
    await page.fill('input[name="email"]', 'nonexistent@example.com');
    await page.fill('input[name="password"]', 'WrongPassword@123');
    await page.click('button[type="submit"]');

    // Verify error message is displayed
    const alert = page.locator('[role="alert"]');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText('Email hoặc mật khẩu không chính xác.');

    // Verify user remains on /login and is not authenticated
    await expect(page).toHaveURL(/\/login/);
  });

  // TEST 3: REGISTER
  test('TEST 3 — Customer registration and automatic authentication', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/register');

    // Fill registration form
    await page.fill('input[name="full_name"]', 'Nguyen Van Customer');
    await page.fill('input[name="email"]', customerEmail);
    await page.fill('input[name="password"]', defaultPassword);

    await page.click('button[type="submit"]');

    // Verify redirect away from /register upon successful registration
    await expect(page).not.toHaveURL(/\/register/);

    // Verify home page shows authenticated user greeting and logout button
    await expect(page.locator('body')).toContainText('Nguyen Van Customer');
    await expect(page.locator('button:has-text("Đăng xuất")')).toBeVisible();
  });

  // TEST 1: LOGIN
  test('TEST 1 — Login with valid credentials', async ({ page, context }) => {
    // Clear cookies to simulate fresh login
    await context.clearCookies();

    await page.goto('/login');

    await page.fill('input[name="email"]', customerEmail);
    await page.fill('input[name="password"]', defaultPassword);
    await page.click('button[type="submit"]');

    // Verify successful login redirects away from /login
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('body')).toContainText('Nguyen Van Customer');
    await expect(page.locator('button:has-text("Đăng xuất")')).toBeVisible();
  });

  // TEST 5: PROTECTED ROUTE
  test('TEST 5 — Guest access to protected route redirects to /login', async ({ page, context }) => {
    // Ensure clean guest state
    await context.clearCookies();

    // Directly attempt to access /profile
    await page.goto('/profile');

    // RequireAuth should intercept and redirect to /login
    await expect(page).toHaveURL(/\/login/);
  });

  // TEST 4: PROFILE (READ AND EDIT)
  test('TEST 4 — View and update profile information', async ({ page, context }) => {
    await context.clearCookies();

    // Login first
    await page.goto('/login');
    await page.fill('input[name="email"]', customerEmail);
    await page.fill('input[name="password"]', defaultPassword);
    await page.click('button[type="submit"]');
    await expect(page).not.toHaveURL(/\/login/);

    // Navigate to /profile
    await page.goto('/profile');
    await expect(page).toHaveURL(/\/profile/);

    // Verify email is shown as read-only info
    await expect(page.locator('body')).toContainText(customerEmail);

    // Edit profile fields
    await page.fill('input[name="full_name"]', 'Nguyen Van Customer Updated');
    await page.fill('input[name="phone"]', '+84987654321');
    await page.fill('input[name="date_of_birth"]', '1995-05-20');
    await page.fill('input[name="gender"]', 'Nam');
    await page.fill('textarea[name="address"]', '456 Le Duan, Da Nang');

    // Submit profile update
    await page.click('button[type="submit"]');

    // Verify success alert
    const successAlert = page.locator('[role="alert"]');
    await expect(successAlert).toBeVisible();
    await expect(successAlert).toContainText('Cập nhật hồ sơ thành công.');

    // Reload page to confirm persistence from backend
    await page.reload();
    await expect(page.locator('input[name="full_name"]')).toHaveValue('Nguyen Van Customer Updated');
    await expect(page.locator('input[name="phone"]')).toHaveValue('+84987654321');
    await expect(page.locator('input[name="date_of_birth"]')).toHaveValue('1995-05-20');
    await expect(page.locator('input[name="gender"]')).toHaveValue('Nam');
    await expect(page.locator('textarea[name="address"]')).toHaveValue('456 Le Duan, Da Nang');
  });

  // TEST 6: CHANGE PASSWORD (VOLUNTARY)
  test('TEST 6 — Voluntary password change and re-authentication', async ({ page, context }) => {
    await context.clearCookies();

    // Register dedicated customer for password test
    await page.goto('/register');
    await page.fill('input[name="full_name"]', 'Password Test User');
    await page.fill('input[name="email"]', pwdCustomerEmail);
    await page.fill('input[name="password"]', defaultPassword);
    await page.click('button[type="submit"]');
    await expect(page).not.toHaveURL(/\/register/);

    // Navigate to /change-password
    await page.goto('/change-password');
    await expect(page).toHaveURL(/\/change-password/);

    // Fill password change form
    await page.fill('input[name="current_password"]', defaultPassword);
    await page.fill('input[name="new_password"]', newPassword);
    await page.fill('input[name="confirm_password"]', newPassword);

    await page.click('button[type="submit"]');

    // Success feedback displayed
    const successAlert = page.locator('[role="alert"]');
    await expect(successAlert).toBeVisible();
    await expect(successAlert).toContainText('Đổi mật khẩu thành công!');

    // Logout and test login with new password
    await context.clearCookies();
    await page.goto('/login');
    await page.fill('input[name="email"]', pwdCustomerEmail);
    await page.fill('input[name="password"]', newPassword);
    await page.click('button[type="submit"]');

    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('button:has-text("Đăng xuất")')).toBeVisible();
  });

  // TEST 7: FORCED PASSWORD CHANGE (must_change_password = true)
  test('TEST 7 — Forced password change enforcement and unlock flow', async ({ page, context }) => {
    await context.clearCookies();

    // Register dedicated customer
    await page.goto('/register');
    await page.fill('input[name="full_name"]', 'Forced Password User');
    await page.fill('input[name="email"]', forcedCustomerEmail);
    await page.fill('input[name="password"]', defaultPassword);
    await page.click('button[type="submit"]');
    await expect(page).not.toHaveURL(/\/register/);

    // Set must_change_password = true in database for this customer
    await runDbQuery(`UPDATE users SET must_change_password = true WHERE email = '${forcedCustomerEmail}';`);

    // Simulate login with must_change_password = true
    await context.clearCookies();
    await page.goto('/login');
    await page.fill('input[name="email"]', forcedCustomerEmail);
    await page.fill('input[name="password"]', defaultPassword);
    await page.click('button[type="submit"]');

    // Verify user is forced to /change-password
    await expect(page).toHaveURL(/\/change-password/);
    await expect(page.locator('body')).toContainText('Đổi mật khẩu bắt buộc');

    // Attempting to navigate to /profile should redirect back to /change-password
    await page.goto('/profile');
    await expect(page).toHaveURL(/\/change-password/);

    // Change password to satisfy requirement
    await page.fill('input[name="current_password"]', defaultPassword);
    await page.fill('input[name="new_password"]', newPassword);
    await page.fill('input[name="confirm_password"]', newPassword);
    await page.click('button[type="submit"]');

    // Verify success feedback
    const successAlert = page.locator('[role="alert"]');
    await expect(successAlert).toBeVisible();
    await expect(successAlert).toContainText('Đổi mật khẩu thành công');

    // Click "Xem hồ sơ cá nhân" to proceed to /profile
    await page.click('button:has-text("Xem hồ sơ cá nhân")');
    await expect(page).toHaveURL(/\/profile/);

    // Now protected routes are freely accessible without being forced back to /change-password
    await page.reload();
    await expect(page).toHaveURL(/\/profile/);
  });

  // TEST 8: ACCOUNT DEACTIVATED / 403
  test('TEST 8 — Account deactivated / 403 handling without redirect loop', async ({ page, context }) => {
    await context.clearCookies();

    // Set status to INACTIVE in database for customerEmail
    await runDbQuery(`UPDATE users SET status = 'INACTIVE' WHERE email = '${customerEmail}';`);

    // 1. Attempt login with deactivated account
    await page.goto('/login');
    await page.fill('input[name="email"]', customerEmail);
    await page.fill('input[name="password"]', defaultPassword);
    await page.click('button[type="submit"]');

    // Form displays account deactivated error, user stays on /login
    const alert = page.locator('[role="alert"]');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText('Tài khoản của bạn đã bị vô hiệu hóa hoặc tạm khóa');
    await expect(page).toHaveURL(/\/login/);

    // 2. Test when an authenticated session becomes INACTIVE and accesses protected route
    // First reactivate temporarily to get valid session
    await runDbQuery(`UPDATE users SET status = 'ACTIVE' WHERE email = '${customerEmail}';`);
    await page.fill('input[name="email"]', customerEmail);
    await page.fill('input[name="password"]', defaultPassword);
    await page.click('button[type="submit"]');
    await expect(page).not.toHaveURL(/\/login/);

    // Now deactivate user in database while session cookie is held
    await runDbQuery(`UPDATE users SET status = 'INACTIVE' WHERE email = '${customerEmail}';`);

    // Reload /profile -> GET /api/v1/auth/me returns 403 ACCOUNT_DEACTIVATED
    await page.goto('/profile');

    // RequireAuth detects 403 / isForbidden and displays deactivated screen
    const deactivatedScreen = page.locator('[data-testid="account-deactivated"]');
    await expect(deactivatedScreen).toBeVisible();
    await expect(deactivatedScreen).toContainText('Tài khoản không khả dụng');

    // Crucial: verify no redirect loop to /login
    await expect(page).not.toHaveURL(/\/login/);
  });
});
