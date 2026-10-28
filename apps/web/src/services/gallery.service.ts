import { apiClient, ApiClientError } from './api-client';
import type { PhotoUpload } from './photo-upload';
export interface GalleryImage { image_id: string; gym_id: string; caption: string | null; display_order: number; updated_at: string }
const path = (gym: string) => `/gyms/${gym}/images`;
const privateBytes = async (row: GalleryImage, signal?: AbortSignal): Promise<Blob> => {
  let response: Response;
  try { response = await fetch(galleryService.image(row, true), { credentials: 'include', signal, cache: 'no-store' }); }
  catch (error) {
    if (signal?.aborted) throw error;
    throw new ApiClientError(0, 'NETWORK_ERROR', 'Không tải được ảnh. Kiểm tra kết nối rồi thử lại.');
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new ApiClientError(response.status, payload?.error?.code || 'IMAGE_ERROR', payload?.error?.message || 'Không tải được ảnh phòng tập.');
  }
  const blob = await response.blob();
  if (!['image/jpeg', 'image/png'].includes(blob.type)) throw new Error('Ảnh trả về không hợp lệ.');
  return blob;
};
export const galleryService = {
  privateBytes,
  list: (gym: string, internal = false, signal?: AbortSignal) => apiClient.get<GalleryImage[]>(internal ? `/gyms/${gym}/management/images` : path(gym), { signal }),
  upload: (gym: string, image: PhotoUpload, caption: string) => apiClient.post<GalleryImage>(path(gym), { image, caption: caption.trim() }),
  caption: (row: GalleryImage, caption: string) => apiClient.patch<GalleryImage>(`${path(row.gym_id)}/${row.image_id}`, { caption: caption.trim(), expected_updated_at: row.updated_at }),
  reorder: (gym: string, current: GalleryImage[], next: GalleryImage[]) => apiClient.patch<GalleryImage[]>(`${path(gym)}/order`, { expected_image_ids: current.map(r => r.image_id), image_ids: next.map(r => r.image_id) }),
  remove: (row: GalleryImage) => apiClient.request<{ message: string }>(`${path(row.gym_id)}/${row.image_id}`, { method: 'DELETE' }),
  image: (row: GalleryImage, internal = false) => `${(import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000').replace(/\/+$/, '').replace(/\/api\/v1$/, '')}/api/v1/gyms/${row.gym_id}/${internal ? 'management/' : ''}images/${row.image_id}/file`,
};
