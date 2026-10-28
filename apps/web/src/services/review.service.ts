import { apiClient } from './api-client';
export interface OwnReview { review_id: string; rating: number; comment: string | null; status: string; created_at: string }
export interface PublicReview { review_id: string; rating: number; comment: string | null; created_at: string; author_name: string }
export interface ReviewList { items: PublicReview[]; page: number; page_size: number; total: number; average_rating: number | null }
export interface ReviewEligibility { eligible: boolean; reason: string | null; review: OwnReview | null }
export const reviewPath = (gym: string, trainer?: string) => trainer ? `/gyms/${gym}/trainers/${trainer}/reviews` : `/gyms/${gym}/reviews`;
export const reviewService = {
  list: (path: string, page: number, signal?: AbortSignal) => apiClient.get<ReviewList>(path, { signal, params: { page, pageSize: 10 } }),
  mine: (path: string, signal?: AbortSignal) => apiClient.get<ReviewEligibility>(`${path}/me`, { signal }),
  create: (path: string, rating: number, comment: string) => apiClient.post<OwnReview>(path, { rating, comment: comment.trim() || null }),
};
