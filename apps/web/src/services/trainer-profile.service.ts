import { apiClient } from './api-client';
export const platforms = ['FACEBOOK', 'INSTAGRAM', 'YOUTUBE', 'TIKTOK', 'WEBSITE'] as const;
export interface TrainerLink { platform: string; url: string }
export interface TrainerProfile { gym_id: string; gym_trainer_id: string; bio: string | null; specialization: string | null; experience_years: number | null;
  availability: 'ACCEPTING' | 'ALMOST_FULL' | 'NOT_ACCEPTING'; status: string; updated_at: string; profile: { full_name: string; avatar_url: string | null } | null;
  social_links: TrainerLink[] }
export const trainerProfileService = {
  mine: (signal?: AbortSignal) => apiClient.get<TrainerProfile>('/trainer-profile/me', { signal }),
  saveMine: (row: TrainerProfile, bio: string, social_links: TrainerLink[]) => apiClient.request<TrainerProfile>('/trainer-profile/me', { method: 'PUT', body: JSON.stringify({ expected_updated_at: row.updated_at, bio: bio.trim(), social_links }) }),
  managed: (gym: string, id: string, signal?: AbortSignal) => apiClient.get<TrainerProfile>(`/gyms/${gym}/management/trainers/${id}/profile`, { signal }),
  saveManaged: (row: TrainerProfile, specialization: string, experience_years: number | null) => apiClient.patch<TrainerProfile>(`/gyms/${row.gym_id}/management/trainers/${row.gym_trainer_id}/profile`, { expected_updated_at: row.updated_at, specialization: specialization.trim(), experience_years }),
};
