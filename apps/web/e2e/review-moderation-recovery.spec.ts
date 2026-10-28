import { expect, test } from '@playwright/test';
import { fail, hide, openHide, openAudit, selectGym, review, setupReviews, type ReviewOptions } from './review-moderation-fixtures';

test('409 requires a fresh read before sending another hide', async ({ page }) => {
  const { writes } = await setupReviews(page, { rows: [review()], write: route => fail(route, 409) });
  await page.goto('/admin/reviews'); await openHide(page);
  await page.getByRole('button', { name: 'Xác nhận ẩn', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Xác nhận ẩn', exact: true })).toBeDisabled();
  await expect(page.getByLabel('Lý do ẩn', { exact: true })).toHaveValue('  Lý do cần giữ  ');
  expect(writes).toHaveLength(1);
});

for (const status of [-1, 404, 409, 500]) test(`Write ${status} retains reason and keeps the dialog recoverable and blocks writes until a verified read`, async ({ page }) => {
  let readError = 0; const { writes } = await setupReviews(page, { rows: [review()], write: route => fail(route, status), readError: () => readError });
  await page.goto('/admin/reviews'); await openHide(page); await page.getByRole('button', { name: 'Xác nhận ẩn', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible(); await expect(page.getByLabel('Lý do ẩn', { exact: true })).toHaveValue('  Lý do cần giữ  ');
  await expect(page.getByRole('button', { name: 'Hủy thao tác', exact: true })).toBeEnabled(); await expect(page.locator('.admin-review-toolbar select').first()).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Đọc lại đánh giá', exact: true })).toBeEnabled();
  readError = 500; await page.getByRole('button', { name: 'Đọc lại đánh giá', exact: true }).click(); await expect(page.getByRole('alert')).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Xác nhận ẩn', exact: true })).toBeDisabled(); expect(writes).toHaveLength(1);
  readError = 0; await page.getByRole('button', { name: 'Đọc lại đánh giá', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Tiếp tục', exact: true })).toBeEnabled(); await expect(page.getByLabel('Lý do ẩn', { exact: true })).toHaveValue('  Lý do cần giữ  '); expect(writes).toHaveLength(1);
});

test('400 is editable, changing reason resets confirmation; one confirmed corrected write follows', async ({ page }) => {
  let validation = true;
  const { writes } = await setupReviews(page, { rows: [review()], write: async (route, row) => validation ? fail(route, 400) : route.fulfill({ json: { success: true, data: hide(row, route.request().postDataJSON().hidden_reason) } }) });
  await page.goto('/admin/reviews'); await openHide(page); await page.getByRole('button', { name: 'Xác nhận ẩn', exact: true }).click(); await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByLabel('Lý do ẩn', { exact: true })).toBeEnabled(); await expect(page.getByRole('button', { name: 'Đọc lại đánh giá', exact: true })).toHaveCount(0);
  validation = false; await page.getByLabel('Lý do ẩn', { exact: true }).fill(' Lý do hợp lệ '); await expect(page.getByRole('button', { name: 'Xác nhận ẩn', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click(); await page.getByRole('button', { name: 'Xác nhận ẩn', exact: true }).click(); await openAudit(page); await expect(page.getByRole('region', { name: 'Lịch sử ẩn' })).toContainText('Lý do hợp lệ'); expect(writes).toHaveLength(2);
});

test('Committed hide with lost response reads same kind/Gym across pages without VISIBLE filter or another PATCH', async ({ page }) => {
  const rows = Array.from({ length: 11 }, (_, i) => review(i + 1));
  const { writes, reads } = await setupReviews(page, { rows, write: async (route, row) => { hide(row, 'Đã lưu trước khi mất phản hồi'); await route.abort('failed'); } });
  await page.goto('/admin/reviews'); await page.getByRole('combobox', { name: 'Trạng thái đánh giá', exact: true }).selectOption('VISIBLE');
  await page.getByRole('navigation', { name: 'Phân trang đánh giá quản trị' }).getByRole('button', { name: 'Trang sau', exact: true }).click();
  await openHide(page); await page.getByRole('button', { name: 'Xác nhận ẩn', exact: true }).click(); await expect(page.getByRole('alert')).toBeVisible();
  const before = reads.length; await page.getByRole('button', { name: 'Đọc lại đánh giá', exact: true }).click();
  await expect(page.getByText('Trang trước không còn dữ liệu; đã chuyển về trang 1.', { exact: true })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Đã ẩn đánh giá và lưu lịch sử xử lý.' })).toBeVisible();
  const lookups = reads.slice(before).filter(url => !url.searchParams.has('status') && url.searchParams.has('gym_id'));
  expect(lookups.map(url => url.searchParams.get('page'))).toEqual(['1', '2']); expect(lookups.every(url => url.searchParams.get('kind') === 'gym' && url.searchParams.get('gym_id') === rows[10].gym.gym_id)).toBe(true); expect(writes).toHaveLength(1);
  await page.getByRole('combobox', { name: 'Trạng thái đánh giá', exact: true }).selectOption('HIDDEN'); await openAudit(page); await expect(page.getByRole('region', { name: 'Lịch sử ẩn' })).toContainText('Đã lưu trước khi mất phản hồi');
});

test('Success receipt survives a failed list refresh; all writes remain locked until read-back', async ({ page }) => {
  let readError = 0;
  const { writes } = await setupReviews(page, { rows: [review()], readError: () => readError, write: async (route, row) => { readError = 500; await route.fulfill({ json: { success: true, data: hide(row) } }); } });
  await page.goto('/admin/reviews'); await openHide(page); await page.getByRole('button', { name: 'Xác nhận ẩn', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Đã ẩn đánh giá và lưu lịch sử xử lý.' })).toBeVisible();
  await expect(page.getByText('Làm mới thất bại. Dữ liệu cũ có thể đã thay đổi.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Xác nhận ẩn', exact: true })).toBeDisabled(); expect(writes).toHaveLength(1);
  readError = 0; await page.getByRole('button', { name: 'Đọc lại đánh giá', exact: true }).click(); await openAudit(page); await expect(page.getByRole('region', { name: 'Lịch sử ẩn' })).toContainText('Lý do đã lưu'); expect(writes).toHaveLength(1);
});

test('Missing read-back target stays locked and never tries the other review kind', async ({ page }) => {
  const rows = [review()]; const { reads, writes } = await setupReviews(page, { rows, write: async route => { rows.splice(0); await fail(route, 404); } });
  await page.goto('/admin/reviews'); await openHide(page); await page.getByRole('button', { name: 'Xác nhận ẩn', exact: true }).click(); await expect(page.getByRole('alert')).toBeVisible();
  await page.getByRole('button', { name: 'Đọc lại đánh giá', exact: true }).click(); await expect(page.getByText('Không tìm thấy đánh giá trong phạm vi đã chọn. Chưa thể xác minh kết quả xử lý.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Xác nhận ẩn', exact: true })).toBeDisabled(); expect(reads.filter(url => url.pathname.endsWith('/admin/reviews')).every(url => url.searchParams.get('kind') === 'gym')).toBe(true); expect(writes).toHaveLength(1);
});

test('Pending locks all fields/actions and a synthetic second submit still sends only once', async ({ page }) => {
  let release = () => {}; const gate = new Promise<void>(resolve => { release = resolve; });
  const { writes } = await setupReviews(page, { rows: [review(), review(2)], write: async (route, row) => { await gate; await route.fulfill({ json: { success: true, data: hide(row) } }); } });
  await page.goto('/admin/reviews'); await openHide(page); await page.getByRole('button', { name: 'Xác nhận ẩn', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Đang ẩn…', exact: true })).toBeDisabled();
  await page.locator('.admin-review-action form').evaluate(form => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  await expect(page.getByLabel('Lý do ẩn', { exact: true })).toBeDisabled(); await expect(page.getByRole('button', { name: 'Hủy thao tác', exact: true })).toBeDisabled(); await expect(page.locator('.admin-review-row button[aria-label="Ẩn đánh giá"]').last()).toBeDisabled();
  await expect(page.locator('.admin-review-toolbar button').filter({ hasText: 'Tải lại danh sách' })).toBeDisabled(); expect(writes).toHaveLength(1); release(); await openAudit(page); await expect(page.getByRole('region', { name: 'Lịch sử ẩn' })).toBeVisible(); expect(writes).toHaveLength(1);
});

for (const status of [-1, 400, 404, 500]) test(`Initial list ${status} retries deliberately; no public fallback or mutation`, async ({ page }) => {
  let error = status; const { reads, writes } = await setupReviews(page, { readError: () => error }); await page.goto('/admin/reviews');
  await expect(page.getByRole('region', { name: 'Danh sách đánh giá' }).getByText('Không thể tải dữ liệu.', { exact: true })).toBeVisible();
  error = 0; await page.getByRole('region', { name: 'Danh sách đánh giá' }).getByRole('button', { name: 'Thử lại', exact: true }).click(); await expect(page.locator('.admin-review-row')).toHaveCount(10);
  expect(reads.every(url => /\/admin\/(gyms|reviews)$/.test(url.pathname))).toBe(true); expect(writes).toEqual([]);
});

for (const status of [401, 403, 500]) test(`Cached list ${status} removes private data on access loss and marks other cached data stale`, async ({ page }) => {
  let error = 0; const { writes } = await setupReviews(page, { readError: () => error }); await page.goto('/admin/reviews'); await expect(page.locator('.admin-review-row')).toHaveCount(10);
  error = status; await page.getByRole('button', { name: 'Tải lại danh sách', exact: true }).click();
  if (status === 500) { await expect(page.getByText('Làm mới thất bại. Dữ liệu cũ có thể đã thay đổi.', { exact: true })).toBeVisible(); await expect(page.getByRole('button', { name: 'Ẩn đánh giá', exact: true }).first()).toBeDisabled(); }
  else { await expect(page.getByRole('alert')).toBeVisible(); await expect(page.locator('.admin-review-row')).toHaveCount(0); await expect(page.getByRole('dialog', { name: 'Bộ chọn Gym' })).toHaveCount(0); }
  error = 0; await page.getByRole('button', { name: 'Thử lại', exact: true }).click(); await expect(page.locator('.admin-review-row')).toHaveCount(10); expect(writes).toEqual([]);
});

for (const expired of [true, false]) test(`Write permission loss while confirmation is open rechecks ${expired ? 'expired session' : 'revoked role'}`, async ({ page }) => {
  const options: ReviewOptions = { rows: [review()], write: route => fail(route, expired ? 401 : 403) }; const { writes } = await setupReviews(page, options);
  await page.goto('/admin/reviews'); await openHide(page); if (expired) options.guest = true; else options.role = 'CUSTOMER';
  await page.getByRole('button', { name: 'Xác nhận ẩn', exact: true }).click();
  if (expired) await expect(page).toHaveURL(/\/login$/); else await expect(page.getByRole('heading', { name: 'Không có quyền truy cập', exact: true })).toBeVisible();
  await expect(page.getByLabel('Lý do ẩn')).toHaveCount(0); await expect(page.locator('.admin-review-row')).toHaveCount(0); expect(writes).toHaveLength(1);
});

test('Actor change after a session recheck resets local filter/page/reason', async ({ page }) => {
  const options: ReviewOptions = {}; await setupReviews(page, options); await page.goto('/admin/reviews');
  await page.getByRole('combobox', { name: 'Trạng thái đánh giá', exact: true }).selectOption('VISIBLE');
  await page.getByRole('navigation', { name: 'Phân trang đánh giá quản trị' }).getByRole('button', { name: 'Trang sau', exact: true }).click(); await openHide(page, 'Lý do của actor cũ');
  let once = true; options.actorId = 'admin-new'; options.readError = () => { if (once) { once = false; return 403; } return 0; };
  await page.getByRole('button', { name: 'Hủy thao tác', exact: true }).click(); await page.getByRole('button', { name: 'Tải lại danh sách', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Trạng thái đánh giá', exact: true })).toHaveValue(''); await expect(page.getByRole('navigation', { name: 'Phân trang đánh giá quản trị' })).toContainText('Trang 1 / 3'); await expect(page.getByLabel('Lý do ẩn')).toHaveCount(0);
});

test('A now-empty last review page recovers from fresh totals, then empty list remains usable', async ({ page }) => {
  const { rows } = await setupReviews(page); await page.goto('/admin/reviews'); const pager = page.getByRole('navigation', { name: 'Phân trang đánh giá quản trị' });
  await pager.getByRole('button', { name: 'Trang sau', exact: true }).click(); await pager.getByRole('button', { name: 'Trang sau', exact: true }).click(); await expect(page.locator('.admin-review-row')).toHaveCount(3);
  rows.splice(0, 5); await page.getByRole('button', { name: 'Tải lại danh sách', exact: true }).click(); await expect(pager).toContainText('Trang 2 / 2'); await expect(page.getByText('Trang trước không còn dữ liệu; đã chuyển về trang 2.', { exact: true })).toBeVisible();
  rows.splice(0); await page.getByRole('button', { name: 'Tải lại danh sách', exact: true }).click(); await expect(pager).toHaveCount(0); await expect(page.getByText('Không có đánh giá phù hợp.', { exact: true })).toBeVisible(); await expect(page.getByRole('combobox', { name: 'Loại đánh giá', exact: true })).toBeEnabled();
});

test('Gym selector failure retains chosen label and retries inside the dropdown', async ({ page }) => {
  let error = 0; const { reads } = await setupReviews(page, { gymError: () => error }); await page.goto('/admin/reviews');
  await selectGym(page, 'Gym 01'); await expect(page.locator('.admin-review-row')).toHaveCount(10);
  await page.getByRole('button', { name: /^Lọc theo Gym:/ }).click();
  const picker = page.getByRole('dialog', { name: 'Bộ chọn Gym', exact: true });
  error = 500; await picker.getByLabel('Tìm phòng Gym').fill('missing');
  await expect(picker.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Lọc theo Gym: Gym 01', exact: true })).toBeVisible();
  error = 0; await picker.getByRole('button', { name: 'Thử lại', exact: true }).click();
  await expect(picker.getByText('Không tìm thấy phòng Gym phù hợp.')).toBeVisible();
  expect(reads.filter(url => url.pathname.endsWith('/admin/reviews') && url.searchParams.has('gym_id')).every(url => url.searchParams.get('gym_id') === review().gym.gym_id)).toBe(true);
});

test('Gym selector access loss hides the entire screen and explicit retry restores permission', async ({ page }) => {
  let error = 0; await setupReviews(page, { gymError: () => error }); await page.goto('/admin/reviews'); await expect(page.locator('.admin-review-row')).toHaveCount(10);
  error = 403; await page.getByRole('button', { name: /^Lọc theo Gym:/ }).click();
  await expect(page.locator('.admin-review-row')).toHaveCount(0); await expect(page.getByRole('alert')).toBeVisible();
  error = 0; await page.getByRole('button', { name: 'Thử lại', exact: true }).click();
  await expect(page.locator('.admin-review-row')).toHaveCount(10); await expect(page.getByRole('button', { name: /^Lọc theo Gym:/ })).toBeEnabled();
});

test('Late Gym read after switching to PT is aborted and cannot render old-kind content', async ({ page }) => {
  let release = () => {}, started = () => {}; const gate = new Promise<void>(resolve => { release = resolve; }), ready = new Promise<void>(resolve => { started = resolve; });
  const gym = review(), trainer = review(1, 'trainer'); trainer.comment = 'Nội dung PT mới';
  const { writes } = await setupReviews(page, { rows: [gym, trainer], read: async (route, url) => {
    const isGym = url.searchParams.get('kind') === 'gym';
    if (isGym && url.searchParams.get('status') === 'VISIBLE') { started(); await gate; }
    await route.fulfill({ json: { success: true, data: { items: [isGym ? gym : trainer], total: 1, page: 1, page_size: 10 } } });
  } });
  let aborted = false; page.on('requestfailed', request => { const url = new URL(request.url()); if (url.pathname.endsWith('/admin/reviews') && url.searchParams.get('kind') === 'gym' && url.searchParams.get('status') === 'VISIBLE') aborted = true; });
  await page.goto('/admin/reviews'); await expect(page.locator('.admin-review-row')).toContainText('Nội dung đánh giá 1');
  await page.getByRole('combobox', { name: 'Trạng thái đánh giá', exact: true }).selectOption('VISIBLE'); await ready;
  await page.getByRole('combobox', { name: 'Loại đánh giá', exact: true }).selectOption('trainer'); await expect(page.locator('.admin-review-row')).toContainText('Nội dung PT mới'); release();
  await expect.poll(() => aborted).toBe(true); await expect(page.getByText('Nội dung đánh giá 1', { exact: true })).toHaveCount(0); expect(writes).toEqual([]);
});

test('A completed write from an unmounted screen cannot place its receipt/reason in a new screen', async ({ page }) => {
  let release = () => {}; const gate = new Promise<void>(resolve => { release = resolve; });
  const { writes } = await setupReviews(page, { rows: [review()], write: async (route, row) => { await gate; await route.fulfill({ json: { success: true, data: hide(row) } }); } });
  await page.goto('/admin/reviews'); await openHide(page, 'Lý do ở màn trước'); await page.getByRole('button', { name: 'Xác nhận ẩn', exact: true }).click(); await expect(page.getByRole('button', { name: 'Đang ẩn…' })).toBeDisabled();
  await page.evaluate(() => { history.pushState(null, '', '/admin/gyms'); window.dispatchEvent(new PopStateEvent('popstate')); }); await page.locator('aside').getByRole('link', { name: 'Kiểm duyệt đánh giá', exact: true }).click(); await expect(page.locator('.admin-review-row')).toBeVisible();
  const response = page.waitForResponse(result => result.request().method() === 'PATCH' && result.url().endsWith('/hide')); release(); await response;
  await expect(page.getByRole('status').filter({ hasText: 'Đã ẩn đánh giá và lưu lịch sử xử lý.' })).toHaveCount(0); await expect(page.getByLabel('Lý do ẩn')).toHaveCount(0); expect(writes).toHaveLength(1);
  await page.getByRole('button', { name: 'Tải lại danh sách', exact: true }).click(); await openAudit(page); await expect(page.getByRole('region', { name: 'Lịch sử ẩn' })).toBeVisible();
});


test('A successful hide on a later page preserves its dialog reason when the list refresh fails', async ({ page }) => {
  let readError = 0;
  const rows = Array.from({ length: 11 }, (_, i) => review(i + 1));
  const { writes } = await setupReviews(page, { rows, readError: () => readError,
    write: async (route, row) => { readError = 500; await route.fulfill({ json: { success: true, data: hide(row) } }); } });
  await page.goto('/admin/reviews');
  await page.getByRole('navigation', { name: 'Phân trang đánh giá quản trị' }).getByRole('button', { name: 'Trang sau', exact: true }).click();
  await openHide(page, 'Lý do tại trang hai'); await page.getByRole('button', { name: 'Xác nhận ẩn', exact: true }).click();
  await expect(page.getByLabel('Lý do ẩn', { exact: true })).toHaveValue('Lý do tại trang hai');
  await expect(page.getByRole('button', { name: 'Xác nhận ẩn', exact: true })).toBeDisabled();
  readError = 0; await page.getByRole('button', { name: 'Đọc lại đánh giá', exact: true }).click();
  await expect(page.getByLabel('Lý do ẩn', { exact: true })).toHaveCount(0); expect(writes).toHaveLength(1);
});
