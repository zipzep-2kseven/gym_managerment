import { expect, type Page, type Route } from '@playwright/test';
import type { GalleryImage } from '../src/services/gallery.service';
export const gymA = '10000000-0000-4000-8000-000000000001', gymB = '10000000-0000-4000-8000-000000000002';
export const image = (index = 1, gym = gymA): GalleryImage => ({ image_id: `30000000-0000-4000-8000-${String(index).padStart(12, '0')}`, gym_id: gym,
  caption: index === 2 ? null : `Không gian tập ${index}`, display_order: index - 1, updated_at: '2020-01-01T00:00:00Z' });
export const ok = (data: unknown) => ({ success: true, data });
export const fail = (route: Route, status: number, code = 'TEST_ERROR') => status === -1 ? route.abort('failed') : route.fulfill({ status,
  json: { success: false, error: { code, message: `Lỗi kiểm thử ${status}.` } } });
export const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1cAAAAASUVORK5CYII=', 'base64');
type Options = { rows?: GalleryImage[]; actor?: string; role?: string; readError?: () => number; gymError?: () => number; fileError?: () => number;
  read?: (route: Route) => Promise<void>; file?: (route: Route) => Promise<void>; write?: (route: Route, row?: GalleryImage) => Promise<void> };
export const setupGallery = async (page: Page, options: Options = {}) => {
  const rows = options.rows || [image(1), image(2)], reads: URL[] = [], files: URL[] = [], writes: { method: string; path: string; body: any }[] = [];
  await page.route('**/api/v1/**', async route => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname;
    if (path.endsWith('/auth/me')) return route.fulfill({ json: ok({ user_id: options.actor || 'admin', roles: [options.role || 'ADMIN'], status: 'ACTIVE', must_change_password: false, profile: { full_name: 'Admin kiểm thử' }, active_gym_assignments: [] }) });
    if (path.endsWith('/admin/gyms')) {
      const error = options.gymError?.(); if (error) return fail(route, error);
      return route.fulfill({ json: { ...ok([{ gym_id: gymA, gym_name: 'Gym A', status: 'INACTIVE' }, { gym_id: gymB, gym_name: 'Gym B', status: 'ACTIVE' }]), pagination: { page: 1, pageSize: 100, totalItems: 2, totalPages: 1, hasNextPage: false, hasPreviousPage: false } } });
    }
    if (request.method() !== 'GET') {
      writes.push({ method: request.method(), path, body: request.postData() ? request.postDataJSON() : null });
      const row = rows.find(item => path.includes(item.image_id)); if (options.write) return options.write(route, row);
      if (request.method() === 'POST') { const created = { ...image(rows.length + 1, path.includes(gymB) ? gymB : gymA), caption: request.postDataJSON().caption || null }; rows.push(created); return route.fulfill({ status: 201, json: ok(created) }); }
      if (path.endsWith('/order')) { const ids: string[] = request.postDataJSON().image_ids; rows.sort((a, b) => ids.indexOf(a.image_id) - ids.indexOf(b.image_id)); rows.forEach((item, i) => { item.display_order = i; }); return route.fulfill({ json: ok(rows) }); }
      if (!row) return fail(route, 404);
      if (request.method() === 'DELETE') { rows.splice(rows.indexOf(row), 1); return route.fulfill({ json: ok({ message: 'Đã xóa ảnh.' }) }); }
      row.caption = request.postDataJSON().caption || null; row.updated_at = '2026-10-12T00:00:00Z'; return route.fulfill({ json: ok(row) });
    }
    if (path.endsWith('/file')) { files.push(url); const error = options.fileError?.(); if (error) return fail(route, error); if (options.file) return options.file(route); return route.fulfill({ contentType: 'image/png', body: png }); }
    if (!path.endsWith('/management/images')) return fail(route, 404);
    reads.push(url); const error = options.readError?.(); if (error) return fail(route, error); if (options.read) return options.read(route);
    return route.fulfill({ json: ok(rows.filter(row => path.includes(row.gym_id))) });
  });
  return { rows, reads, files, writes };
};
export const openGallery = (page: Page, gym = gymA) => page.goto(`/admin/gyms/${gym}/gallery`);
export const card = (page: Page, index = 0) => page.getByRole('article').nth(index);
export const choosePhoto = async (page: Page) => {
  const data = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 2000; c.height = 1000; const ctx = c.getContext('2d')!; ctx.fillStyle = '#274060'; ctx.fillRect(0, 0, c.width, c.height); return c.toDataURL('image/png').split(',')[1]; });
  await page.getByLabel('Ảnh phòng tập', { exact: true }).setInputFiles({ name: 'gym.png', mimeType: 'image/png', buffer: Buffer.from(data, 'base64') });
  await expect(page.getByAltText('Ảnh phòng tập sẽ thêm')).toBeVisible();
  await expect.poll(() => page.getByAltText('Ảnh phòng tập sẽ thêm').evaluate((el: HTMLImageElement) => el.naturalWidth)).toBe(1600);
};
export const edit = async (page: Page, index = 0) => { await card(page, index).getByRole('button', { name: `Sửa chú thích ảnh ${index + 1}`, exact: true }).click(); };
