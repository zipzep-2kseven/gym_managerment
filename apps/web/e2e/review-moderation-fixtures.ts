import { type Page, type Route } from '@playwright/test';
import type { ModeratedReview } from '../src/services/review-moderation.service';
export const gymId = (index = 1) => `10000000-0000-4000-8000-${String(index).padStart(12, '0')}`;
export const review = (index = 1, kind: 'gym' | 'trainer' = 'gym', gym = gymId()): ModeratedReview => ({
  review_id: `20000000-0000-4000-8000-${String(index + (kind === 'trainer' ? 100 : 0)).padStart(12, '0')}`,
  kind, rating: index % 5 + 1, comment: index === 2 ? null : `Nội dung đánh giá ${index}`, status: 'VISIBLE', created_at: '2020-01-01T17:00:00Z',
  gym: { gym_id: gym, gym_name: `Gym ${gym.slice(-2)}`, status: 'INACTIVE' },
  trainer: kind === 'trainer' ? { gym_trainer_id: 'trainer-fixture', full_name: null, status: 'INACTIVE' } : null,
  author: { user_id: 'customer-fixture', full_name: 'Hội viên kiểm thử' }, moderation: null,
});
export const hide = (row: ModeratedReview, reason = 'Lý do đã lưu') => {
  row.status = 'HIDDEN'; row.moderation = { hidden_by: 'admin', moderator_name: 'Admin kiểm thử', hidden_at: '2020-01-02T17:00:00Z', hidden_reason: reason }; return row;
};
export const fail = (route: Route, status: number) => status === -1 ? route.abort('failed') : route.fulfill({ status, json: { success: false, error: { code: 'TEST_ERROR', message: 'Yêu cầu kiểm thử thất bại' } } });
export type ReviewOptions = {
  rows?: ModeratedReview[]; role?: string; actorId?: string; guest?: boolean; mustChange?: boolean; accountStatus?: string;
  readError?: () => number; gymError?: () => number; read?: (route: Route, url: URL) => Promise<void>;
  write?: (route: Route, row: ModeratedReview) => Promise<void>;
};
export const setupReviews = async (page: Page, options: ReviewOptions = {}) => {
  const reads: URL[] = [], writes: { path: string; body: unknown }[] = [];
  const rows = options.rows || [...Array.from({ length: 23 }, (_, i) => review(i + 1)), review(1, 'trainer', gymId(12))];
  const gyms = Array.from({ length: 17 }, (_, i) => ({ gym_id: gymId(i + 1), gym_name: `Gym ${String(i + 1).padStart(2, '0')}${i === 16 ? ' %_\\' : ''}`, status: i % 2 ? 'INACTIVE' : 'ACTIVE' }));
  await page.route('**/api/v1/**', async route => {
    const req = route.request(), url = new URL(req.url()), path = url.pathname;
    if (path.endsWith('/auth/me')) return options.guest ? fail(route, 401) : route.fulfill({ json: { success: true, data: { user_id: options.actorId || 'admin', roles: [options.role || 'ADMIN'], status: options.accountStatus || 'ACTIVE', must_change_password: options.mustChange || false, profile: { full_name: 'Admin kiểm thử' }, active_gym_assignments: [] } } });
    if (req.method() === 'PATCH') {
      writes.push({ path, body: req.postDataJSON() });
      const row = rows.find(row => path.endsWith(`/${row.kind}/${row.review_id}/hide`));
      if (!row) return fail(route, 404);
      if (options.write) return options.write(route, row);
      return route.fulfill({ json: { success: true, data: hide(row, req.postDataJSON().hidden_reason) } });
    }
    if (req.method() !== 'GET') return fail(route, 405);
    reads.push(url);
    const current = Number(url.searchParams.get('page')) || 1, size = Number(url.searchParams.get('pageSize')) || 10;
    if (path.endsWith('/admin/gyms')) {
      const error = options.gymError?.(); if (error) return fail(route, error);
      const search = url.searchParams.get('search')?.toLowerCase() || '';
      const data = gyms.filter(gym => gym.gym_name.toLowerCase().includes(search));
      return route.fulfill({ json: { success: true, data: data.slice((current - 1) * size, current * size), pagination: { page: current, pageSize: size, totalItems: data.length, totalPages: Math.ceil(data.length / size), hasNextPage: current * size < data.length, hasPreviousPage: current > 1 } } });
    }
    if (path.endsWith('/admin/reviews')) {
      const error = options.readError?.(); if (error) return fail(route, error);
      if (options.read) return options.read(route, url);
      const data = rows.filter(row => row.kind === (url.searchParams.get('kind') || 'gym') && (!url.searchParams.get('gym_id') || row.gym.gym_id === url.searchParams.get('gym_id')) && (!url.searchParams.get('status') || row.status === url.searchParams.get('status')));
      return route.fulfill({ json: { success: true, data: { items: data.slice((current - 1) * size, current * size), total: data.length, page: current, page_size: size } } });
    }
    return fail(route, 404);
  });
  return { reads, writes, rows };
};
export const openHide = async (page: Page, reason = '  Lý do cần giữ  ') => {
  await page.getByRole('button', { name: 'Ẩn đánh giá', exact: true }).first().click();
  await page.getByLabel('Lý do ẩn', { exact: true }).fill(reason);
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
};

export const openAudit = async (page: Page, comment?: string) => {
  const row = page.locator('.admin-review-row').filter({ hasText: comment || 'Đã ẩn' }).first();
  await row.getByRole('button', { name: 'Xem chi tiết', exact: true }).click();
};
export const selectGym = async (page: Page, label: string) => {
  await page.getByRole('button', { name: /^Lọc theo Gym:/ }).click();
  const picker = page.getByRole('dialog', { name: 'Bộ chọn Gym', exact: true });
  await picker.getByLabel('Tìm phòng Gym', { exact: true }).fill(label);
  await picker.getByRole('button', { name: label, exact: false }).first().click();
};
