import type { Page, Route } from '@playwright/test';
import type { GymPackage } from '../src/types/package.types';
export const gymA = '10000000-0000-4000-8000-000000000001', gymB = '10000000-0000-4000-8000-000000000002';
export const plan = (index = 1, gym = gymA): GymPackage => ({ package_id: `20000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
  gym_id: gym, package_name: `Gói ${String(index).padStart(2, '0')}`, description: index === 2 ? null : `Mô tả gói ${index}`,
  price: index === 1 ? '999999999999.99' : '0.00', duration_days: 30, status: index % 2 ? 'ACTIVE' : 'INACTIVE',
  created_at: '2020-01-01T00:00:00Z', updated_at: '2020-01-01T00:00:00Z' });
export const ok = (data: unknown) => ({ success: true, data });
export const fail = (route: Route, status: number) => status === -1 ? route.abort('failed') : route.fulfill({ status,
  json: { success: false, error: { code: 'TEST_ERROR', message: 'Không thể hoàn tất yêu cầu kiểm thử.', details: [{ field: 'price', message: 'Kiểm tra giá.' }] } } });
export const paged = (data: GymPackage[], url: URL) => {
  const page = Number(url.searchParams.get('page')) || 1, pageSize = Number(url.searchParams.get('pageSize')) || 12;
  return { ...ok(data.slice((page - 1) * pageSize, page * pageSize)), pagination: { page, pageSize, totalItems: data.length,
    totalPages: Math.ceil(data.length / pageSize), hasNextPage: page * pageSize < data.length, hasPreviousPage: page > 1 } };
};
export type PackageOptions = { rows?: GymPackage[]; role?: string; actor?: string; guest?: boolean; forced?: boolean;
  readError?: () => number; gymError?: () => number; read?: (route: Route, url: URL) => Promise<void>;
  write?: (route: Route, row?: GymPackage) => Promise<void> };
export const setupPackages = async (page: Page, options: PackageOptions = {}) => {
  const rows = options.rows || Array.from({ length: 25 }, (_, index) => plan(index + 1));
  const reads: URL[] = [], writes: { path: string; body: unknown }[] = [];
  await page.route('**/api/v1/**', async route => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname;
    if (path.endsWith('/auth/me')) return options.guest ? fail(route, 401) : route.fulfill({ json: ok({ user_id: options.actor || 'admin', roles: [options.role || 'ADMIN'], status: 'ACTIVE', must_change_password: options.forced || false, profile: { full_name: 'Admin kiểm thử' }, active_gym_assignments: [] }) });
    if (request.method() !== 'GET') {
      writes.push({ path, body: request.postData() ? request.postDataJSON() : null });
      const row = rows.find(item => path.includes(item.package_id));
      if (options.write) return options.write(route, row);
      if (request.method() === 'POST') {
        const created = { ...plan(rows.length + 1), ...request.postDataJSON(), status: 'ACTIVE' }; rows.push(created);
        return route.fulfill({ status: 201, json: ok(created) });
      }
      if (!row) return fail(route, 404);
      if (path.endsWith('/activate') || path.endsWith('/deactivate')) row.status = path.endsWith('/activate') ? 'ACTIVE' : 'INACTIVE';
      else Object.assign(row, request.postDataJSON());
      return route.fulfill({ json: ok(row) });
    }
    reads.push(url);
    if (path.endsWith('/admin/gyms')) {
      const error = options.gymError?.(); if (error) return fail(route, error);
      return route.fulfill({ json: { ...ok([{ gym_id: gymA, gym_name: 'Gym A', status: 'INACTIVE' }, { gym_id: gymB, gym_name: 'Gym B', status: 'ACTIVE' }]),
        pagination: { page: 1, pageSize: 100, totalItems: 2, totalPages: 1, hasNextPage: false, hasPreviousPage: false } } });
    }
    if (!path.includes('/management/packages')) return fail(route, 404);
    const error = options.readError?.(); if (error) return fail(route, error);
    if (options.read) return options.read(route, url);
    const search = (url.searchParams.get('search') || '').toLowerCase();
    const result = rows.filter(item => path.includes(item.gym_id) && (!url.searchParams.get('status') || item.status === url.searchParams.get('status')) && `${item.package_name} ${item.description || ''}`.toLowerCase().includes(search));
    return route.fulfill({ json: paged(result, url) });
  });
  return { rows, reads, writes };
};
export const catalog = (page: Page) => page.getByRole('region', { name: 'Catalog gói tập', exact: true });
export const editFirst = async (page: Page) => { await page.getByRole('button', { name: 'Sửa gói Gói 01', exact: true }).click(); };
