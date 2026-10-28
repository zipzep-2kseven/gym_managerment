import { expect, type Page, type Route } from '@playwright/test';
import type { IncidentReport } from '../src/services/report.service';
export const gymA = '10000000-0000-4000-8000-000000000001', gymB = '10000000-0000-4000-8000-000000000002';
export const report = (index = 1, gymId = gymA, status = 'PENDING'): IncidentReport => ({
  report_id: `20000000-0000-4000-8000-${String(index + (gymId === gymB ? 100 : 0)).padStart(12, '0')}`,
  gym_id: gymId, gym_name: gymId === gymA ? 'Gym 01' : 'Gym 02', content: `${gymId === gymA ? 'Gym 01' : 'Gym 02'}: Nội dung báo cáo ${index}`,
  status, has_image: index === 1, resolution_note: null, created_at: '2020-01-01T17:00:00Z', updated_at: '2020-01-01T17:00:00Z', resolved_at: null,
});
export type Options = {
  role?: string; actorId?: string; guest?: boolean; accountStatus?: string; mustChange?: boolean; long?: boolean; emptyGyms?: boolean;
  rows?: IncidentReport[]; gymError?: () => number; readError?: () => number;
  read?: (route: Route, url: URL) => Promise<void>; write?: (route: Route, row: IncidentReport, action: string) => Promise<void>;
};
export const paged = (rows: unknown[], page: number, size: number) => ({ success: true, data: rows.slice((page - 1) * size, page * size), pagination: {
  page, pageSize: size, totalItems: rows.length, totalPages: Math.ceil(rows.length / size), hasNextPage: page * size < rows.length, hasPreviousPage: page > 1,
} });
export const fail = (route: Route, status: number) => status === -1 ? route.abort('failed') : route.fulfill({ status, json: { success: false, error: { code: 'TEST_ERROR', message: 'Yêu cầu thử nghiệm thất bại' } } });
export const setupReports = async (page: Page, options: Options = {}) => {
  const reads: URL[] = [], writes: { method: string; path: string; body: unknown }[] = [];
  const rows = options.rows || Array.from({ length: 25 }, (_, i) => report(i + 1, gymA, ['PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'][i % 4]));
  const other = [report(1, gymB)];
  await page.route('**/api/v1/**', async route => {
    const req = route.request(), url = new URL(req.url()), path = url.pathname;
    if (path.endsWith('/auth/me')) return options.guest ? fail(route, 401) : route.fulfill({ json: { success: true, data: {
      user_id: options.actorId || 'admin', roles: [options.role || 'ADMIN'], status: options.accountStatus || 'ACTIVE', must_change_password: options.mustChange || false,
      profile: { full_name: 'Admin fixture' }, active_gym_assignments: [],
    } } });
    if (req.method() !== 'GET') {
      writes.push({ method: req.method(), path, body: req.postDataJSON() });
      const row = [...rows, ...other].find(row => path.includes(row.report_id));
      if (!row || req.method() !== 'PATCH') return fail(route, 405);
      const action = path.split('/').at(-1)!;
      if (options.write) return options.write(route, row, action);
      row.status = action === 'investigate' ? 'IN_PROGRESS' : action === 'resolve' ? 'RESOLVED' : 'REJECTED';
      row.resolution_note = req.postDataJSON().resolution_note || null;
      return route.fulfill({ json: { success: true, data: row } });
    }
    reads.push(url);
    if (path.endsWith('/admin/gyms')) {
      const error = options.gymError?.(); if (error) return fail(route, error);
      let gyms = options.emptyGyms ? [] : Array.from({ length: 15 }, (_, i) => ({
        gym_id: `10000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`, gym_name: `Gym ${String(i + 1).padStart(2, '0')}${i === 14 ? ' %_\\' : ''}` + (options.long ? ' tên dài'.repeat(12) : ''),
        address: options.long ? 'Địa chỉ dài '.repeat(20) : `Địa chỉ ${i + 1}`, status: i % 2 ? 'INACTIVE' : 'ACTIVE',
      }));
      const search = url.searchParams.get('search')?.toLowerCase(); if (search) gyms = gyms.filter(row => `${row.gym_name} ${row.address}`.toLowerCase().includes(search));
      const status = url.searchParams.get('status'); if (status) gyms = gyms.filter(row => row.status === status);
      return route.fulfill({ json: paged(gyms, Number(url.searchParams.get('page')) || 1, Number(url.searchParams.get('pageSize')) || 12) });
    }
    if (/\/reports\/[^/]+\/image$/.test(path)) return route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jL1sAAAAASUVORK5CYII=', 'base64') });
    if (path.endsWith('/reports')) {
      const error = options.readError?.(); if (error) return fail(route, error);
      if (options.read) return options.read(route, url);
      let data = path.includes(gymB) ? other : rows;
      const status = url.searchParams.get('status'); if (status) data = data.filter(row => row.status === status);
      return route.fulfill({ json: paged(data, Number(url.searchParams.get('page')) || 1, 20) });
    }
    return fail(route, 404);
  });
  return { reads, writes, rows, other };
};
export const reportsRegion = (page: Page) => page.getByRole('region', { name: 'Danh sách báo cáo', exact: true });
export const switchGym = async (page: Page, id = gymB) => {
  await page.evaluate(id => { history.pushState({ key: 'report-switch' }, '', `/admin/gyms/${id}/reports`); dispatchEvent(new PopStateEvent('popstate')); }, id);
  await expect(page.getByRole('region', { name: 'Cơ sở đang chọn' })).toContainText(id === gymA ? 'Gym 01' : 'Gym 02');
};
