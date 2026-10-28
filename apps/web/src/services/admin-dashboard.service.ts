import { apiClient } from './api-client';
export interface AdminDashboardSummary {
  total_gyms: number;
  active_gyms: number;
  total_accounts: number;
  month_revenue: string;
  month: string;
  daily_revenue: { date: string; amount: string }[];
  as_of: string;
  timezone: string;
}
export const adminDashboardService = {
  summary: (signal?: AbortSignal) => apiClient.get<AdminDashboardSummary>('/admin/dashboard', { signal }),
};
