import { apiClient } from './api-client';
import type { AdminMembership } from '../types/admin-membership.types';

export const adminMembershipService = {
  list: (gymId: string, page: number, signal?: AbortSignal) => apiClient.list<AdminMembership>(
    `/gyms/${encodeURIComponent(gymId)}/memberships`, { params: { page, pageSize: 20 }, signal }),
};
