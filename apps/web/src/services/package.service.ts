import { apiClient, ApiClientError } from './api-client';
import type { ListQuery } from '../types/gym.types';
import type { GymPackage, PackageInput } from '../types/package.types';
const path = (gymId: string) => `/gyms/${encodeURIComponent(gymId)}`;
export const packageService = {
  list: (gymId: string, query: ListQuery, managed: boolean, signal?: AbortSignal) =>
    apiClient.list<GymPackage>(`${path(gymId)}/${managed ? 'management/' : ''}packages`, { params: { ...query }, signal }),
  detail: (gymId: string, id: string, signal?: AbortSignal) =>
    apiClient.get<GymPackage>(`${path(gymId)}/packages/${encodeURIComponent(id)}`, { signal }),
  currentManaged: async (gymId: string, id: string, signal?: AbortSignal): Promise<GymPackage> => {
    // Public detail cannot read inactive packages or an inactive Gym.
    for (let page = 1; page <= 100000; page++) {
      const result = await packageService.list(gymId, { page, pageSize: 100, sortBy: 'created_at', sortOrder: 'asc' }, true, signal);
      const row = result.data.find(item => item.package_id === id && item.gym_id === gymId);
      if (row) return row;
      if (!result.pagination.hasNextPage) break;
      if (page === 100000) throw new Error('Catalog quá lớn để đọc lại tự động. Chưa xác định được kết quả; cần kiểm tra gói tập.');
    }
    throw new ApiClientError(404, 'PACKAGE_NOT_FOUND', 'Gói tập không còn khả dụng trong Gym đã chọn.');
  },
  create: (gymId: string, body: PackageInput) => apiClient.post<GymPackage>(`${path(gymId)}/packages`, body),
  update: (gymId: string, id: string, body: Partial<PackageInput>) =>
    apiClient.patch<GymPackage>(`${path(gymId)}/packages/${encodeURIComponent(id)}`, body),
  status: (gymId: string, id: string, active: boolean) =>
    apiClient.patch<GymPackage>(`${path(gymId)}/packages/${encodeURIComponent(id)}/${active ? 'activate' : 'deactivate'}`),
};
