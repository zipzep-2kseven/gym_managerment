import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { hide, openHide, openAudit, review, setupReviews, type ReviewOptions } from './review-moderation-fixtures';

test('Review paging is independent from the searchable Gym dropdown and selected Gym survives search', async ({ page }) => {
  const { reads, writes } = await setupReviews(page);
  await page.goto('/admin/reviews'); await expect(page.getByRole('heading', { name: 'Kiểm duyệt đánh giá', exact: true })).toBeFocused();
  const pager = page.getByRole('navigation', { name: 'Phân trang đánh giá quản trị', exact: true });
  await expect(page.locator('.admin-review-row')).toHaveCount(10); await pager.getByRole('button', { name: 'Trang sau', exact: true }).click();
  await expect(pager).toContainText('Trang 2 / 3');
  await page.getByRole('button', { name: /^Lọc theo Gym:/ }).click();
  const picker = page.getByRole('dialog', { name: 'Bộ chọn Gym', exact: true });
  await picker.getByRole('button', { name: 'Tải thêm Gym', exact: true }).click();
  await expect(pager).toContainText('Trang 2 / 3');
  await picker.getByRole('button', { name: 'Gym 12', exact: false }).click();
  await expect(page.getByText('Không có đánh giá phù hợp.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Lọc theo Gym: Gym 12', exact: true })).toBeVisible();
  await page.getByRole('button', { name: /^Lọc theo Gym:/ }).click();
  await picker.getByLabel('Tìm phòng Gym', { exact: true }).fill('%_\\');
  await expect.poll(() => reads.some(url => url.pathname.endsWith('/admin/gyms') && url.searchParams.get('search') === '%_\\')).toBe(true);
  await expect(picker.getByRole('button', { name: /Gym 17/ })).toBeVisible();
  await picker.getByRole('button', { name: 'Đóng bộ chọn Gym', exact: true }).click();
  await page.getByLabel('Loại đánh giá', { exact: true }).selectOption('trainer');
  await expect(page.getByRole('table')).toContainText('PT ngừng hoạt động');
  expect(reads.filter(url => url.pathname.endsWith('/admin/reviews')).every(url => url.searchParams.get('pageSize') === '10')).toBe(true);
  expect(reads.some(url => url.pathname.endsWith('/admin/gyms') && url.searchParams.get('search') === '%_\\')).toBe(true); expect(writes).toEqual([]);
});

test('Filter changes reset review page and drafts; hidden history is in the details drawer', async ({ page }) => {
  const { rows } = await setupReviews(page);
  await page.goto('/admin/reviews'); const pager = page.getByRole('navigation', { name: 'Phân trang đánh giá quản trị' });
  await pager.getByRole('button', { name: 'Trang sau', exact: true }).click(); await openHide(page, 'Lý do chưa gửi');
  await page.getByRole('button', { name: 'Hủy thao tác', exact: true }).click();
  await page.getByLabel('Trạng thái đánh giá', { exact: true }).selectOption('HIDDEN');
  await expect(page.getByLabel('Lý do ẩn')).toHaveCount(0); await expect(pager).toHaveCount(0);
  hide(rows[0]); await page.getByRole('button', { name: 'Tải lại danh sách', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Ẩn đánh giá', exact: true })).toHaveCount(0);
  await openAudit(page); await expect(page.getByRole('region', { name: 'Lịch sử ẩn' })).toContainText('Lý do đã lưu');
  await page.keyboard.press('Escape'); await page.reload();
  await expect(page.getByLabel('Trạng thái đánh giá')).toHaveValue(''); await expect(pager).toContainText('Trang 1 / 3');
});

test('Keyboard focus, trimmed reason, confirmation reset and cancellation without writes', async ({ page }) => {
  const { writes } = await setupReviews(page, { rows: [review()] }); await page.goto('/admin/reviews');
  const opener = page.getByRole('button', { name: 'Ẩn đánh giá', exact: true }); await opener.focus(); await page.keyboard.press('Enter');
  const reason = page.getByLabel('Lý do ẩn', { exact: true }); await expect(reason).toBeFocused();
  await reason.fill('   '); await expect(page.getByRole('button', { name: 'Tiếp tục', exact: true })).toBeDisabled();
  await reason.fill('  Lý do mới  '); await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await expect(page.getByText('Ẩn đánh giá khỏi trang công khai và điểm trung bình?', { exact: false })).toBeFocused();
  await reason.fill('  Lý do đã sửa  '); await expect(page.getByRole('button', { name: 'Xác nhận ẩn', exact: true })).toHaveCount(0);
  await page.keyboard.press('Escape'); await expect(opener).toBeFocused(); expect(writes).toEqual([]);
  await opener.click(); await expect(reason).toHaveValue('  Lý do đã sửa  '); await page.getByRole('button', { name: 'Hủy thao tác', exact: true }).click(); await expect(opener).toBeFocused();
  await opener.click(); await expect(reason).toHaveAttribute('maxlength', '1000'); await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await page.getByRole('button', { name: 'Xác nhận ẩn', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Đã ẩn đánh giá và lưu lịch sử xử lý.' })).toBeFocused();
  await openAudit(page); await expect(page.getByRole('region', { name: 'Lịch sử ẩn', exact: true })).toContainText('Lý do đã sửa');
  expect(writes).toEqual([{ path: `/api/v1/admin/reviews/gym/${review().review_id}/hide`, body: { hidden_reason: 'Lý do đã sửa' } }]);
});

test('Table, drawer, policy and hide dialog handle long text at desktop/mobile and pass axe', async ({ page }) => {
  const row = review(1, 'trainer'); row.trainer!.full_name = 'Tên huấn luyện viên dài '.repeat(12); row.comment = 'Nội dung dài '.repeat(150); row.author.full_name = 'Tên hội viên dài '.repeat(12);
  const other = hide(review(2, 'trainer'), 'Lý do dài '.repeat(90)); await setupReviews(page, { rows: [row, other] });
  await page.goto('/admin/reviews'); await page.getByLabel('Loại đánh giá').selectOption('trainer');
  await expect(page.getByText('Không có nhận xét.', { exact: true })).toBeVisible();
  for (const width of [375, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const mode of ['table', 'drawer', 'hide', 'policy']) {
      if (mode === 'drawer') await openAudit(page);
      if (mode === 'hide') await openHide(page, 'Lý do kiểm duyệt '.repeat(35));
      if (mode === 'policy') await page.getByRole('button', { name: 'Nguyên tắc kiểm duyệt', exact: true }).click();
      const overflow = await page.evaluate(() => ({ width: innerWidth, total: document.documentElement.scrollWidth, nodes: Array.from(document.querySelectorAll<HTMLElement>('body *')).filter(node => node.getBoundingClientRect().right > innerWidth && (!node.closest('.admin-gym-table-scroll') || getComputedStyle(node).position === 'absolute')).map(node => ({ class: node.className, width: node.getBoundingClientRect().width, right: node.getBoundingClientRect().right })).slice(0, 12) }));
      expect(overflow.total, JSON.stringify({ mode, ...overflow })).toBeLessThanOrEqual(width);
      expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
      await page.screenshot({ path: `../../docs/design/admin-workspace/previews/review-stress-${mode}-${width}.png`, fullPage: true });
      if (mode !== 'table') await page.keyboard.press('Escape');
    }
  }
  expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
});

for (const role of ['CUSTOMER', 'PT', 'MANAGER']) test(`${role} is denied before querying moderation or Gym selector`, async ({ page }) => {
  const { reads, writes } = await setupReviews(page, { role }); await page.goto('/admin/reviews');
  await expect(page.getByRole('heading', { name: 'Không có quyền truy cập', exact: true })).toBeVisible(); expect(reads).toEqual([]); expect(writes).toEqual([]);
});
test('Guest, temporary password and suspended accounts never fetch private reviews', async ({ page }) => {
  const options: ReviewOptions = { guest: true }; const { reads } = await setupReviews(page, options);
  await page.goto('/admin/reviews'); await expect(page).toHaveURL(/\/login$/);
  options.guest = false; options.mustChange = true; await page.goto('/admin/reviews'); await expect(page).toHaveURL(/\/change-password$/);
  options.mustChange = false; options.accountStatus = 'SUSPENDED'; await page.goto('/admin/reviews'); await expect(page.getByTestId('account-deactivated')).toBeVisible(); expect(reads).toEqual([]);
});


test('Compact moderation table, Gym picker and contextual dialogs use the shared Admin layout', async ({ page }) => {
  const rows = [review(1), review(2), hide(review(3), 'Nội dung tiết lộ thông tin riêng.')];
  rows[0].author.full_name = 'Nguyễn Minh Anh'; rows[0].comment = 'Phòng tập sạch, mong bổ sung thêm khung giờ buổi sáng.';
  rows[1].author.full_name = 'Trần Bảo'; rows[2].author.full_name = 'Lê Thanh';
  rows.forEach(row => { row.gym.gym_name = 'Gym Quận 1'; row.gym.status = 'ACTIVE'; });
  await setupReviews(page, { rows }); await page.goto('/admin/reviews');
  await expect(page.getByRole('columnheader')).toHaveCount(7);
  for (const width of [1440, 375]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const mode of ['table', 'drawer', 'hide', 'picker']) {
      if (mode === 'drawer') await openAudit(page);
      if (mode === 'hide') await openHide(page, 'Nội dung tiết lộ thông tin riêng.');
      if (mode === 'picker') { await page.getByRole('button', { name: /^Lọc theo Gym:/ }).click(); await expect(page.getByRole('dialog').getByRole('button', { name: 'Gym 01', exact: true })).toBeVisible(); }
      expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
      await page.screenshot({ path: `../../docs/design/admin-workspace/previews/review-${mode}-${width}.png`, fullPage: true });
      if (mode !== 'table') await page.keyboard.press('Escape');
    }
  }
});
