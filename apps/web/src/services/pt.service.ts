import { apiClient } from './api-client';
import type { Registration, Appointment, Availability } from '../types/pt.types';
export interface PtMembershipChoice { membership_id: string; gym_id: string; start_date: string; end_date: string; status: string; customer?: { full_name: string | null }; package?: { package_name: string } }
export const ptService = {
  calendarAppointments: async (signal?: AbortSignal): Promise<Appointment[]> => {
    const rows = new Map<string, Appointment>();
    let page = 1;
    while (true) {
      const result = await apiClient.list<Appointment>('/pt-appointments/me', { params: { page, pageSize: 100 }, signal });
      for (const row of result.data) rows.set(row.appointment_id, row);
      if (!result.pagination.hasNextPage) return [...rows.values()];
      page++;
    }
  },
  memberships: (gymId: string, page: number, signal?: AbortSignal) => apiClient.list<PtMembershipChoice>(`/gyms/${gymId}/memberships`, { params: { page, pageSize: 20 }, signal }),
  registrations: (page: number, gymId?: string, signal?: AbortSignal) => apiClient.list<Registration>(gymId ? `/gyms/${gymId}/pt-registrations` : '/pt-registrations/me', { params: { page, pageSize: 20 }, signal }),
  currentRegistration: async (gymId: string, registrationId: string, signal?: AbortSignal): Promise<Registration | null> => {
    let page = 1;
    while (true) {
      const result = await ptService.registrations(page, gymId, signal);
      const current = result.data.find(row => row.registration_id === registrationId);
      if (current) return current;
      if (!result.pagination.hasNextPage) return null;
      page++;
    }
  },
  appointments: (page: number, gymId?: string, signal?: AbortSignal) => apiClient.list<Appointment>(gymId ? `/gyms/${gymId}/pt-appointments` : '/pt-appointments/me', { params: { page, pageSize: 20 }, signal }),
  register: (gymId: string, body: { membership_id: string; gym_trainer_id: string; note?: string }) => apiClient.post<Registration>(`/gyms/${gymId}/pt-registrations`, body),
  cancelRegistration: (row: Registration, note: string) => apiClient.patch<Registration>(`/gyms/${row.gym.gym_id}/pt-registrations/${row.registration_id}/cancel`, { note }),
  createAppointment: (row: Registration, body: { start_time: string; end_time: string; note?: string }) => apiClient.post<Appointment>(`/gyms/${row.gym.gym_id}/pt-appointments`, { registration_id: row.registration_id, ...body }),
  action: (row: Appointment, action: 'confirm' | 'reschedule' | 'cancel' | 'complete', body: { start_time?: string; end_time?: string; note?: string }) => apiClient.patch<Appointment>(`/gyms/${row.registration.gym.gym_id}/pt-appointments/${row.appointment_id}/${action}`, body),
  availability: (gymId: string, trainerId: string, availability: Availability) => apiClient.patch(`/gyms/${gymId}/trainers/${trainerId}/availability`, { availability }),
};
