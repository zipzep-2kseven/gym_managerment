import { apiClient } from './api-client';
export type ConsultationStatus = 'PENDING' | 'CONTACTED' | 'COMPLETED' | 'CANCELLED';
export interface Consultation {
  consultation_request_id: string; gym_id: string; full_name: string; phone: string;
  content: string | null; preferred_contact: string | null; processing_note: string | null;
  status: ConsultationStatus; created_at: string; updated_at: string;
}
export interface ConsultationInput { full_name: string; phone: string; content?: string; preferred_contact?: string }
export const consultationLabels: Record<ConsultationStatus, string> = {
  PENDING: 'Chờ liên hệ', CONTACTED: 'Đã liên hệ', COMPLETED: 'Hoàn thành', CANCELLED: 'Đã hủy',
};
const path = (gym: string) => `/gyms/${gym}/consultation-requests`;
export const consultationService = {
  create: (gym: string, body: ConsultationInput) => apiClient.post<{ message: string }>(path(gym), body),
  list: (gym: string, page: number, status: string, signal?: AbortSignal) => apiClient.list<Consultation>(path(gym), { params: { page, pageSize: 20, status: status || undefined }, signal }),
  update: (row: Consultation, status: ConsultationStatus, note: string) => apiClient.patch<Consultation>(`${path(row.gym_id)}/${row.consultation_request_id}`, {
    expected_status: row.status, status, processing_note: note.trim(),
  }),
};
