import { ApiClientError, apiClient } from './api-client';
import type { ManagedGym, Gym, GymInput, Trainer, ManagedTrainer, ManagerAssignment, PageResult, ListQuery, Status, ProvisionResult, CreateGymWithManagerInput, CreateGymWithManagerResult } from '../types/gym.types';

const segment = (id: string) => encodeURIComponent(id);
const gymPath = (id: string) => `/gyms/${segment(id)}`;
export const gymService = {
  gyms: (query: ListQuery, admin = false, signal?: AbortSignal) => apiClient.list<ManagedGym>(admin ? '/admin/gyms' : '/gyms', { params: { ...query }, signal }),
  // There is no private Gym-detail endpoint in GYM-02. Locate it through
  // the approved paginated Admin list, including INACTIVE facilities.
  adminGym: async (id: string, signal?: AbortSignal): Promise<ManagedGym> => {
    let page = 1;
    while (true) {
      const result = await apiClient.list<ManagedGym>('/admin/gyms', { params: { page, pageSize: 100, sortBy: 'gym_name', sortOrder: 'asc' }, signal });
      const gym = result.data.find(item => item.gym_id === id);
      if (gym) return gym;
      if (!result.pagination.hasNextPage) throw new ApiClientError(404, 'NOT_FOUND', 'Không tìm thấy Gym.');
      page++;
    }
  },
  gym: (id: string) => apiClient.get<Gym>(gymPath(id)),
  trainers: (id: string, query: ListQuery) => apiClient.list<Trainer>(`${gymPath(id)}/trainers`, { params: { ...query } }),
  trainer: (id: string, trainerId: string) => apiClient.get<Trainer>(`${gymPath(id)}/trainers/${segment(trainerId)}`),
  managedTrainers: (id: string, query: ListQuery, signal?: AbortSignal): Promise<PageResult<ManagedTrainer>> => apiClient.list(`${gymPath(id)}/management/trainers`, { params: { ...query }, signal }),
  createWithManager: (body: CreateGymWithManagerInput) => apiClient.post<CreateGymWithManagerResult>('/gyms', body),
  create: (body: GymInput) => apiClient.post<Gym>('/gyms', body),
  update: (id: string, body: Partial<GymInput>) => apiClient.patch<Gym>(gymPath(id), body),
  remove: (id: string) => apiClient.delete<Gym>(gymPath(id)),
  status: (id: string, status: Status) => apiClient.patch<Gym>(`${gymPath(id)}/status`, { status }),
  trainerStatus: (id: string, trainerId: string, status: Status) => apiClient.patch(`${gymPath(id)}/trainers/${segment(trainerId)}/status`, { status }),
  assignTrainer: (id: string, body: object) => apiClient.post(`${gymPath(id)}/trainers`, body),
  provisionTrainer: (id: string, body: object) => apiClient.post<ProvisionResult>(`${gymPath(id)}/trainers/provision`, body),
  managers: (id: string) => apiClient.get<ManagerAssignment[]>(`${gymPath(id)}/managers`),
  assignManager: (id: string, user_id: string) => apiClient.post(`${gymPath(id)}/managers/assign`, { user_id }),
  provisionManager: (id: string, body: object) => apiClient.post<ProvisionResult>('/admin/managers/provision', { ...body, gym_id: id }),
  revokeManager: (id: string, assignmentId: string) => apiClient.post(`${gymPath(id)}/managers/${segment(assignmentId)}/revoke`, {}),
};
