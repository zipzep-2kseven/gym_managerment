import { apiClient } from './api-client';
import type { ListQuery } from '../types/gym.types';
import type { GymPackage, PackageInput } from '../types/package.types';
const path = (gymId: string) => `/gyms/${encodeURIComponent(gymId)}`;
export const packageService = {
  list: (gymId: string, query: ListQuery, managed: boolean, signal?: AbortSignal) =>
    apiClient.list<GymPackage>(`${path(gymId)}/${managed ? 'management/' : ''}packages`, { params: { ...query }, signal }),
  detail: (gymId: string, id: string, signal?: AbortSignal) =>
    apiClient.get<GymPackage>(`${path(gymId)}/packages/${encodeURIComponent(id)}`, { signal }),
  create: (gymId: string, body: PackageInput) => apiClient.post<GymPackage>(`${path(gymId)}/packages`, body),
  update: (gymId: string, id: string, body: Partial<PackageInput>) =>
    apiClient.patch<GymPackage>(`${path(gymId)}/packages/${encodeURIComponent(id)}`, body),
  status: (gymId: string, id: string, active: boolean) =>
    apiClient.patch<GymPackage>(`${path(gymId)}/packages/${encodeURIComponent(id)}/${active ? 'activate' : 'deactivate'}`),
};
