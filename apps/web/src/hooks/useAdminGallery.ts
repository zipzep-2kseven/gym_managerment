import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { galleryService, type GalleryImage } from '../services/gallery.service';
import type { PhotoUpload } from '../services/photo-upload';
import { ApiClientError } from '../services/api-client';

export type GalleryAction = { kind: 'upload'; photo: PhotoUpload; caption: string } |
  { kind: 'caption'; row: GalleryImage; caption: string } | { kind: 'delete'; row: GalleryImage } |
  { kind: 'order'; rows: GalleryImage[]; next: GalleryImage[] };
const confirmedMessage = (action: GalleryAction) => action.kind === 'upload' ? 'Đã thêm ảnh.' : action.kind === 'caption' ? 'Đã lưu chú thích.' : action.kind === 'order' ? 'Đã cập nhật thứ tự ảnh.' : 'Đã xóa ảnh.';
const validRow = (row: GalleryImage, gymId: string) => !!row && row.gym_id === gymId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(row.image_id) &&
  (row.caption === null || typeof row.caption === 'string') && Number.isInteger(row.display_order) && row.display_order >= 0 && Number.isFinite(Date.parse(row.updated_at));
export const useAdminGallery = (gymId: string, enabled: boolean) => {
  const { user, refreshSession } = useAuth(), cache = useQueryClient();
  const key = ['gallery', 'internal', user?.user_id, gymId];
  const list = async (signal?: AbortSignal) => {
    const rows = await galleryService.list(gymId, true, signal);
    if (!Array.isArray(rows) || rows.length > 10 || rows.some(row => !validRow(row, gymId)) || new Set(rows.map(row => row.image_id)).size !== rows.length) throw new Error('Danh sách ảnh không đúng cơ sở hoặc không hợp lệ.');
    return rows;
  };
  const query = useQuery({ queryKey: key, queryFn: ({ signal }) => list(signal), enabled, retry: false, refetchOnWindowFocus: false });
  const [receipt, setReceipt] = useState<{ kind: GalleryAction['kind']; message: string } | null>(null);
  const [uncertain, setUncertain] = useState<GalleryAction | null>(null), [unknownUpload, setUnknownUpload] = useState(false);
  const [error, setError] = useState<Error | null>(null), [accessError, setAccessError] = useState<ApiClientError | null>(null);
  const [reading, setReading] = useState(false), [checked, setChecked] = useState(false), [preparing, preparingState] = useState(false);
  const [revision, setRevision] = useState(0);
  const sending = useRef(false), readingRef = useRef(false), preparingRef = useRef(false), mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const setPreparing = useCallback((value: boolean) => { preparingRef.current = value; if (mounted.current) preparingState(value); }, []);
  const deny = useCallback((failure: ApiClientError) => { setAccessError(failure); }, []);
  const denied = accessError || (query.error instanceof ApiClientError && [401, 403].includes(query.error.statusCode) ? query.error : null);
  useEffect(() => { if (denied) void refreshSession(); }, [denied, refreshSession]);
  const recordError = (failure: Error) => {
    setError(failure);
    if (failure instanceof ApiClientError && [401, 403].includes(failure.statusCode)) deny(failure);
  };
  const invalidate = () => cache.invalidateQueries({ queryKey: ['gallery'], refetchType: 'none' });
  const readList = () => cache.fetchQuery({ queryKey: key, queryFn: ({ signal }) => list(signal), staleTime: 0, retry: false });
  const mutation = useMutation({ retry: false, gcTime: 0, mutationFn: async (action: GalleryAction) => {
    if (action.kind === 'delete') {
      const result = await galleryService.remove(action.row);
      if (!result || typeof result.message !== 'string') throw new Error('Phản hồi xóa chưa xác định. Cần đọc lại gallery.');
      return result;
    }
    if (action.kind === 'order') {
      const result = await galleryService.reorder(gymId, action.rows, action.next);
      if (!Array.isArray(result) || result.length !== action.next.length || result.some((row, index) => !validRow(row, gymId) || row.image_id !== action.next[index].image_id)) throw new Error('Phản hồi thứ tự chưa xác định. Cần đọc lại gallery.');
      return result;
    }
    const result = await (action.kind === 'upload' ? galleryService.upload(gymId, action.photo, action.caption) : galleryService.caption(action.row, action.caption));
    if (!validRow(result, gymId) || (action.kind === 'caption' && result.image_id !== action.row.image_id)) throw new Error('Phản hồi ảnh không xác định được kết quả. Cần đọc lại gallery.');
    return result;
  } });
  const send = async (action: GalleryAction): Promise<boolean> => {
    if (sending.current || readingRef.current || preparingRef.current || uncertain || denied) return false;
    sending.current = true; setError(null); setReceipt(null); setChecked(false); setUnknownUpload(false);
    try { await mutation.mutateAsync(action); }
    catch (failure) {
      await invalidate();
      if (mounted.current && failure instanceof Error) {
        recordError(failure);
        const rejected = failure instanceof ApiClientError && [400, 413, 503].includes(failure.statusCode);
        if (!rejected) { setUncertain(action); setUnknownUpload(action.kind === 'upload' && !(failure instanceof ApiClientError && [401, 403, 404, 409].includes(failure.statusCode))); }
      }
      sending.current = false; return false;
    }
    await invalidate();
    if (!mounted.current) { sending.current = false; return true; }
    setReceipt({ kind: action.kind, message: confirmedMessage(action) }); setUncertain(action); setReading(true);
    try { await readList(); if (mounted.current) { setUncertain(null); setRevision(value => value + 1); } }
    catch (failure) { if (mounted.current && failure instanceof Error) recordError(failure); }
    finally { sending.current = false; if (mounted.current) setReading(false); }
    return true;
  };
  const recover = async () => {
    if (!uncertain || sending.current || readingRef.current || preparingRef.current || denied) return;
    readingRef.current = true; setReading(true); setError(null); setChecked(false);
    try { await invalidate(); await readList(); if (mounted.current) { setChecked(true); setRevision(value => value + 1); } }
    catch (failure) { if (mounted.current && failure instanceof Error) recordError(failure); }
    finally { readingRef.current = false; if (mounted.current) setReading(false); }
  };
  const accept = () => { if (!checked || readingRef.current) return; setUncertain(null); setError(null); setChecked(false); setUnknownUpload(false); };
  const reset = () => { if (!uncertain && !sending.current && !readingRef.current) { setError(null); setReceipt(null); mutation.reset(); } };
  return { query, receipt, uncertain, unknownUpload, error, denied, reading, checked, preparing, revision,
    pending: mutation.isPending, locked: mutation.isPending || reading || preparing || !!uncertain,
    setPreparing, send, recover, accept, reset, deny };
};
