import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { galleryService, type GalleryImage } from '../../services/gallery.service';
import { ApiClientError } from '../../services/api-client';

export const AdminGalleryPhoto = ({ row, index, revision, deny }: { row: GalleryImage; index: number; revision: number; deny: (error: ApiClientError) => void }) => {
  const { user } = useAuth(), [url, setUrl] = useState(''), [decodeError, setDecodeError] = useState(false), lastDenied = useRef<Error | null>(null);
  const query = useQuery({ queryKey: ['gallery', 'file', user?.user_id, row.gym_id, row.image_id, revision],
    queryFn: ({ signal }) => galleryService.privateBytes(row, signal), retry: false, gcTime: 0, refetchOnWindowFocus: false });
  useEffect(() => {
    if (!query.data) return;
    const source = URL.createObjectURL(query.data); setUrl(source); setDecodeError(false);
    return () => URL.revokeObjectURL(source);
  }, [query.data]);
  useEffect(() => {
    if (!(query.error instanceof ApiClientError) || ![401, 403].includes(query.error.statusCode) || query.error === lastDenied.current) return;
    lastDenied.current = query.error; deny(query.error);
  }, [query.error, deny]);
  if (query.isError || decodeError) return <div className="admin-gallery-photo-fallback" role="status"><p>Không tải được ảnh {index + 1}. Chú thích và thao tác vẫn có thể sử dụng.</p>
    <button className="btn-secondary" disabled={query.isFetching} onClick={() => { setDecodeError(false); void query.refetch(); }}>Thử lại ảnh {index + 1}</button></div>;
  if (query.isPending || !url) return <div className="admin-gallery-photo-fallback" role="status">Đang tải ảnh {index + 1}…</div>;
  return <img className="gallery-photo" src={url} alt={row.caption || `Không gian phòng tập · Ảnh ${index + 1}`} onError={() => setDecodeError(true)} />;
};
