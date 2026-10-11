import { apiClient } from './api-client';
export const trainerDays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'] as const;
export const dayLabels: Record<string, string> = { MONDAY: 'Thứ hai', TUESDAY: 'Thứ ba', WEDNESDAY: 'Thứ tư', THURSDAY: 'Thứ năm', FRIDAY: 'Thứ sáu', SATURDAY: 'Thứ bảy', SUNDAY: 'Chủ nhật' };
export const platforms = ['FACEBOOK', 'INSTAGRAM', 'YOUTUBE', 'TIKTOK', 'WEBSITE'] as const;
export interface TrainerLink { platform: string; url: string }
export interface TrainerHours { day_of_week: string; start_time: string; end_time: string }
export interface TrainerProfile { gym_id: string; gym_trainer_id: string; bio: string | null; specialization: string | null; experience_years: number | null;
  availability: 'ACCEPTING' | 'ALMOST_FULL' | 'NOT_ACCEPTING'; status: string; updated_at: string; profile: { full_name: string; avatar_url: string | null } | null;
  social_links: TrainerLink[]; working_schedules: TrainerHours[] }
export const trainerProfileService = {
  mine: (signal?: AbortSignal) => apiClient.get<TrainerProfile>('/trainer-profile/me', { signal }),
  saveMine: (row: TrainerProfile, bio: string, social_links: TrainerLink[], working_schedules: TrainerHours[]) => apiClient.request<TrainerProfile>('/trainer-profile/me', { method: 'PUT', body: JSON.stringify({ expected_updated_at: row.updated_at, bio: bio.trim(), social_links, working_schedules }) }),
  managed: (gym: string, id: string, signal?: AbortSignal) => apiClient.get<TrainerProfile>(`/gyms/${gym}/management/trainers/${id}/profile`, { signal }),
  saveManaged: (row: TrainerProfile, specialization: string, experience_years: number | null) => apiClient.patch<TrainerProfile>(`/gyms/${row.gym_id}/management/trainers/${row.gym_trainer_id}/profile`, { expected_updated_at: row.updated_at, specialization: specialization.trim(), experience_years }),
};
