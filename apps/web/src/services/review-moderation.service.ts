import { ApiClientError, apiClient } from './api-client';
export interface ModeratedReview { review_id: string; kind: 'gym' | 'trainer'; rating: number; comment: string | null; status: 'VISIBLE' | 'HIDDEN'; created_at: string;
  gym: {gym_id: string; gym_name: string; status: string}; trainer: {gym_trainer_id: string; full_name: string | null; status: string} | null;
  author: {user_id: string; full_name: string}; moderation: {hidden_by: string; moderator_name: string; hidden_at: string; hidden_reason: string} | null }
export interface ModerationFilters {kind: 'gym' | 'trainer'; gym_id?: string; status?: 'VISIBLE' | 'HIDDEN'; page: number}
export interface ModerationList {items: ModeratedReview[]; total: number; page: number; page_size: number}
const list = (query: ModerationFilters, signal?: AbortSignal) => apiClient.get<ModerationList>('/admin/reviews', {signal, params: {...query, pageSize: 10}});
export const reviewModerationService = {
  list,
  // No detail endpoint exists. Read the same kind/Gym without the status filter:
  // a committed hide may have left the currently displayed VISIBLE collection.
  current: async (row: ModeratedReview, signal?: AbortSignal): Promise<ModeratedReview> => {
    for (let page = 1; page <= 100000; page++) {
      const result = await list({ kind: row.kind, gym_id: row.gym.gym_id, page }, signal);
      const found = result.items.find(item => item.kind === row.kind && item.review_id === row.review_id);
      if (found) return found;
      if (page * result.page_size >= result.total) break;
    }
    throw new ApiClientError(404, 'REVIEW_NOT_FOUND', 'Không tìm thấy đánh giá trong phạm vi đã chọn. Chưa thể xác minh kết quả xử lý.');
  },
  hide: (row: ModeratedReview, reason: string) => apiClient.patch<ModeratedReview>(`/admin/reviews/${row.kind}/${row.review_id}/hide`, {hidden_reason: reason.trim()}),
};
