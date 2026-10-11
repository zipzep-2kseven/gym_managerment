import { apiClient, ApiClientError } from './api-client';
import { gymService } from './gym.service';
import { vietnamDay } from '../pages/pt/calendar-time';
export interface IncidentReport { report_id: string; gym_id: string; gym_name: string; content: string; status: string;
  has_image: boolean; resolution_note: string | null; created_at: string; updated_at: string; resolved_at: string | null }
export interface ReportImage { mime_type: 'image/jpeg' | 'image/png'; data: string }
export const reportService = {
  gyms: async (signal?: AbortSignal) => {
    const ids = new Set<string>(); let page = 1; const today = vietnamDay();
    while (true) {
      const result = await apiClient.list<{ gym_id: string; status: string; start_date: string; end_date: string }>('/memberships/me', { params: { page, pageSize: 100 }, signal });
      result.data.filter(m => m.status === 'ACTIVE' && m.start_date <= today && m.end_date >= today).forEach(m => ids.add(m.gym_id));
      if (!result.pagination.hasNextPage) break; page++;
    }
    const gyms = await Promise.all([...ids].map(async id => { try { return await gymService.gym(id); } catch (error) { if (error instanceof ApiClientError && error.statusCode === 404) return null; throw error; } }));
    return gyms.filter(g => g !== null);
  },
  list: (page: number, status: string, gymId?: string, signal?: AbortSignal) => apiClient.list<IncidentReport>(gymId ? `/gyms/${encodeURIComponent(gymId)}/reports` : '/reports/me', { params: { page, pageSize: 20, ...(status ? { status } : {}) }, signal }),
  create: (gymId: string, content: string, image?: ReportImage) => apiClient.post<IncidentReport>(`/gyms/${encodeURIComponent(gymId)}/reports`, { content, ...(image ? { image } : {}) }),
  change: (row: IncidentReport, action: 'investigate' | 'resolve' | 'reject', resolution_note?: string) => apiClient.patch<IncidentReport>(`/gyms/${encodeURIComponent(row.gym_id)}/reports/${row.report_id}/${action}`, resolution_note ? { resolution_note } : {}),
  image: (id: string) => `${(import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000').replace(/\/+$/, '').replace(/\/api\/v1$/, '')}/api/v1/reports/${id}/image`,
};
export { readGymPhoto as readReportPhoto } from './photo-upload';
