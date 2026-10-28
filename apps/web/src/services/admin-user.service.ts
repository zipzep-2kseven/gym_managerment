import { apiClient } from './api-client';
export type AccountStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
export interface AdminUser {
  user_id: string; email: string; phone: string | null; status: AccountStatus;
  must_change_password: boolean; email_verified_at: string | null; created_at: string; updated_at: string;
  profile: {full_name: string; avatar_url: string | null} | null; roles: string[];
  active_gym_assignments: {gym_id: string; gym_name: string; assignment_type: 'MANAGER' | 'PT'}[];
}
export interface UserFilters { search?: string; role?: string; status?: AccountStatus; page: number }
export interface UserList { items: AdminUser[]; total: number; page: number; page_size: number }
export const accountStatusLabel: Record<AccountStatus, string> = {ACTIVE: 'Hoạt động', SUSPENDED: 'Khóa tạm', INACTIVE: 'Ngừng hoạt động'};
export interface SystemRole {role_id: string; role_name: string; description: string | null}
export const adminUserService = {
  roles: (signal?: AbortSignal) => apiClient.get<SystemRole[]>('/admin/roles',{signal}),
  list: (filters: UserFilters, signal?: AbortSignal) => apiClient.get<UserList>('/admin/users', {signal, params: {...filters, pageSize: 20}}),
  status: (row: AdminUser, status: 'ACTIVE' | 'SUSPENDED') => apiClient.patch<AdminUser>(`/admin/users/${row.user_id}/status`, {status, expected_updated_at: row.updated_at}),
};
