import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ApiClientError } from '../../services/api-client';
import { useAuth } from '../../hooks/useAuth';
import { useManagerGymId } from '../gym/ManagerGymPage';
import { PackageQueryState } from '../../components/package/PackageQueryState';
import { MutationError } from '../../components/gym/GymUi';
import { GalleryPhoto } from '../../components/gym/GymGallery';
import { galleryService, type GalleryImage } from '../../services/gallery.service';
import { GalleryUploadForm } from './GalleryUploadForm';
const GalleryCaptionForm = ({ row, disabled, save }: { row: GalleryImage; disabled: boolean; save: (caption: string) => void }) => {
  const [caption, setCaption] = useState(row.caption || '');
  return <form onSubmit={e => { e.preventDefault(); if (!disabled) save(caption); }}>
    <label className="form-group">Chú thích ảnh<input className="form-input" maxLength={200} value={caption} disabled={disabled} onChange={e => setCaption(e.target.value)} /></label>
    <button className="btn-secondary" disabled={disabled || caption.trim() === (row.caption || '')}>Lưu chú thích</button>
  </form>;
};
export const GalleryPage = ({ admin = false }: { admin?: boolean }) => {
  const { gymId } = useParams(), managerGym = useManagerGymId(), gym = admin ? gymId || '' : managerGym;
  const { user, refreshSession } = useAuth(), cache = useQueryClient();
  const query = useQuery({ queryKey: ['gallery', 'internal', user?.user_id, gym], queryFn: ({ signal }) => galleryService.list(gym, true, signal), enabled: !!gym });
  const done = () => cache.invalidateQueries({ queryKey: ['gallery'] });
  const mutation = useMutation({ mutationFn: async (action: { kind: 'caption'; row: GalleryImage; caption: string } | { kind: 'delete'; row: GalleryImage } | { kind: 'order'; rows: GalleryImage[]; next: GalleryImage[] }): Promise<unknown> => {
    if (action.kind === 'caption') return galleryService.caption(action.row, action.caption);
    if (action.kind === 'delete') return galleryService.remove(action.row);
    return galleryService.reorder(gym, action.rows, action.next);
  }, onSuccess: done, retry: false, onError: async error => { if (error instanceof ApiClientError && [401, 403].includes(error.statusCode)) await refreshSession(); } });
  const move = (index: number, step: number) => {
    const rows = query.data!; const next = [...rows]; [next[index], next[index + step]] = [next[index + step], next[index]];
    mutation.mutate({ kind: 'order', rows, next });
  };
  return <><Link to={admin ? `/admin/gyms/${gym}` : '/manager/gym'}>Về quản lý Gym</Link><h1>Ảnh giới thiệu phòng Gym</h1>
    <p>Ảnh đầu tiên là ảnh đại diện gallery. Logo được quản lý riêng. Khách chỉ xem ảnh khi Gym đang hoạt động.</p>
    <PackageQueryState pending={query.isPending} error={query.error} retry={query.refetch} />
    {query.data && !query.isError && <><GalleryUploadForm key={gym} gym={gym} count={query.data.length} done={done} />
      <div className="gym-actions"><button className="btn-secondary" disabled={mutation.isPending} onClick={() => { mutation.reset(); void query.refetch(); }}>Làm mới ảnh</button></div><MutationError error={mutation.error} />
      {!query.data.length && <p>Chưa có ảnh giới thiệu phòng tập.</p>}<div className="gallery-management-grid">{query.data.map((row, index, rows) => <article className="gym-panel" key={row.image_id}>
        <h2>Ảnh {index + 1}{index === 0 ? ' · Đại diện gallery' : ''}</h2><GalleryPhoto row={row} internal />
        <GalleryCaptionForm key={row.updated_at} row={row} disabled={mutation.isPending} save={caption => mutation.mutate({ kind: 'caption', row, caption })} />
        <div className="gym-actions"><button className="btn-secondary" disabled={mutation.isPending || index === 0} onClick={() => move(index, -1)}>Lên</button>
          <button className="btn-secondary" disabled={mutation.isPending || index === rows.length - 1} onClick={() => move(index, 1)}>Xuống</button>
          <button className="btn-secondary" disabled={mutation.isPending} onClick={() => { if (window.confirm('Xóa ảnh này khỏi gallery?')) mutation.mutate({ kind: 'delete', row }); }}>Xóa ảnh</button></div>
      </article>)}</div></>}
  </>;
};
