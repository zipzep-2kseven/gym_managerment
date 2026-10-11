import { apiClient } from './api-client';
export interface ModeratedReview { review_id: string; kind: 'gym' | 'trainer'; rating: number; comment: string | null; status: 'VISIBLE' | 'HIDDEN'; created_at: string;
  gym: {gym_id: string; gym_name: string; status: string}; trainer: {gym_trainer_id: string; full_name: string | null; status: string} | null;
  author: {user_id: string; full_name: string}; moderation: {hidden_by: string; moderator_name: string; hidden_at: string; hidden_reason: string} | null }
export interface ModerationFilters {kind: 'gym' | 'trainer'; gym_id?: string; status?: 'VISIBLE' | 'HIDDEN'; page: number}
export interface ModerationList {items: ModeratedReview[]; total: number; page: number; page_size: number}
export const reviewModerationService = {
  list: (query: ModerationFilters, signal?: AbortSignal) => apiClient.get<ModerationList>('/admin/reviews', {signal, params: {...query, pageSize: 10}}),
  hide: (row: ModeratedReview, reason: string) => apiClient.patch<ModeratedReview>(`/admin/reviews/${row.kind}/${row.review_id}/hide`, {hidden_reason: reason.trim()}),
};
