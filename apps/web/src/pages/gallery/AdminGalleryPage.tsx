import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useAdminGymContext } from '../../hooks/useAdminGymContext';
import { useAdminGallery } from '../../hooks/useAdminGallery';
import { PageHeader } from '../../components/management/PageHeader';
import { DashboardQueryFeedback } from '../../components/management/DashboardQueryFeedback';
import { MutationError, QueryState } from '../../components/gym/GymUi';
import { ApiClientError } from '../../services/api-client';
import type { GalleryImage } from '../../services/gallery.service';
import { AdminGalleryUpload } from './AdminGalleryUpload';
import { AdminGalleryRow } from './AdminGalleryRow';
import { AdminGalleryEditor, AdminGalleryDelete } from './AdminGalleryEditor';
import { AdminGalleryRecovery } from './AdminGalleryRecovery';

type Selection = { kind: 'caption' | 'delete'; row: GalleryImage };
export const AdminGalleryPage = () => {
  const { gymId = '' } = useParams(), { user } = useAuth();
  return <AdminGalleryCatalog key={`${user?.user_id}:${gymId}`} gymId={gymId} />;
};
const AdminGalleryCatalog = ({ gymId }: { gymId: string }) => {
  const { gym, enabled, validGym } = useAdminGymContext(gymId);
  const action = useAdminGallery(gymId, enabled && !!gym.data && !gym.isError), { query } = action;
  const [selection, setSelection] = useState<Selection | null>(null), [uploadRevision, setUploadRevision] = useState(0);
  const [, setFocusRevision] = useState(0);
  const root = useRef<HTMLElement>(null), opener = useRef(''), restore = useRef(false);
  const focusOpener = () => {
    const target = Array.from(root.current?.querySelectorAll<HTMLElement>('[data-gallery-opener]') || []).find(el => el.dataset.galleryOpener === opener.current && !el.hasAttribute('disabled'));
    const id = opener.current.split('-').slice(1).join('-');
    const heading = Array.from(root.current?.querySelectorAll<HTMLElement>('[data-gallery-heading]') || []).find(el => el.dataset.galleryHeading === id);
    (target || heading || root.current?.querySelector<HTMLElement>('h1'))?.focus();
  };
  const close = () => { if (!action.locked) { setSelection(null); restore.current = true; } };
  useEffect(() => { const h = root.current?.querySelector<HTMLElement>('h1'); if (h) { h.tabIndex = -1; h.focus(); } }, []);
  useEffect(() => { if (!selection && !action.locked && restore.current) { restore.current = false; focusOpener(); } });
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !selection || action.locked || !root.current?.contains(document.activeElement)) return;
      event.preventDefault(); setSelection(null); restore.current = true;
    };
    document.addEventListener('keydown', escape); return () => document.removeEventListener('keydown', escape);
  }, [selection, action.locked]);
  useEffect(() => {
    if (selection && selection.kind === action.receipt?.kind && !action.locked) { setSelection(null); restore.current = true; }
  }, [selection, action.receipt, action.locked]);
  const open = (kind: Selection['kind'], row: GalleryImage) => { action.reset(); opener.current = `${kind}-${row.image_id}`; setSelection({ kind, row: { ...row } }); };
  const accept = () => {
    if (action.unknownUpload) setUploadRevision(value => value + 1);
    action.accept();
    if (selection?.kind === 'caption') {
      const current = query.data?.find(row => row.image_id === selection.row.image_id);
      if (current) { setSelection({ kind: 'caption', row: { ...current } }); return; }
    }
    setSelection(null); restore.current = true;
  };
  const move = (index: number, delta: number) => {
    const rows = query.data; if (!rows) return;
    const next = [...rows]; [next[index], next[index + delta]] = [next[index + delta], next[index]];
    opener.current = `${delta < 0 ? 'up' : 'down'}-${rows[index].image_id}`;
    void action.send({ kind: 'order', rows: [...rows], next }).then(saved => { if (saved) { restore.current = true; setFocusRevision(value => value + 1); } });
  };
  const gymDenied = gym.error instanceof ApiClientError && [401, 403].includes(gym.error.statusCode);
  const access = action.denied || (gym.isError && (!gym.data || gymDenied) ? gym.error : null);
  const contextBlocked = gym.isError || gym.isFetching;
  const readBlocked = contextBlocked || query.isError || query.isFetching || !query.data;
  const blocked = !!selection || action.locked || readBlocked;
  return <section ref={root} className="admin-gallery">
    <Link to={`/admin/gyms/${gymId}`}>Về quản lý Gym</Link>
    <PageHeader title="Ảnh giới thiệu phòng Gym" subtitle={gym.data ? `${gym.data.gym_name} · ${gym.data.status === 'ACTIVE' ? 'Gym đang hoạt động' : 'Gym ngừng hoạt động'} · ${query.data?.length || 0}/10 ảnh` : 'Gallery theo cơ sở'}
      action={<button className="btn-secondary" disabled={!!access || !validGym || blocked} onClick={() => { action.reset(); void query.refetch(); }}>Làm mới ảnh</button>} />
    {!validGym ? <p role="alert">Mã Gym không hợp lệ.</p> : access ? <QueryState pending={false} error={access} retry={() => void (action.denied ? query.refetch() : gym.refetch())} redirectOnUnauthorized={false} />
      : gym.isPending ? <QueryState pending error={null} retry={() => void gym.refetch()} /> : <>
        {gym.isError && <p>Thông tin Gym chưa được làm mới. Bản nháp được giữ lại; tải lại thông tin trước khi lưu.</p>}
        <DashboardQueryFeedback query={{ ...gym, dataUpdatedAt: gym.isError ? gym.dataUpdatedAt : 0 }} retry={() => void gym.refetch()} />
        <p className="admin-gallery-policy">Ảnh đầu tiên đại diện gallery. Logo Gym được quản lý riêng. Gallery chỉ hiển thị công khai khi Gym đang hoạt động.</p>
        {gym.data?.status === 'INACTIVE' && <p className="admin-gallery-policy">Gym đang ngừng hoạt động. Bạn vẫn quản lý ảnh nội bộ; thêm hoặc sửa ảnh không kích hoạt Gym.</p>}
        {action.receipt && <p role="status" className="alert-banner alert-success">{action.receipt.message}</p>}
        <MutationError error={action.error} />
        <AdminGalleryRecovery action={action} ready={!readBlocked} accept={accept} />
        {selection?.kind === 'caption' && <AdminGalleryEditor key={selection.row.image_id} row={selection.row} blocked={action.locked || readBlocked} pending={action.pending || action.reading} close={close}
          save={caption => void action.send({ kind: 'caption', row: selection.row, caption })} />}
        {selection?.kind === 'delete' && <AdminGalleryDelete row={selection.row} blocked={action.locked || readBlocked} pending={action.pending} close={close} remove={() => void action.send({ kind: 'delete', row: selection.row })} />}
        <AdminGalleryUpload key={uploadRevision} action={action} count={query.data?.length || 0} blocked={!!selection || readBlocked} />
        <section className="admin-gallery-catalog" aria-label="Gallery nội bộ">
          <DashboardQueryFeedback query={query} retry={() => { if (action.uncertain) void action.recover(); else void query.refetch(); }} />
          {query.data && <div className="admin-gallery-grid">{query.data.map((row, index) => <AdminGalleryRow key={row.image_id} row={row} index={index} count={query.data.length} action={action} blocked={blocked} open={open} move={move} />)}</div>}
          {query.data?.length === 0 && <p className="admin-gallery-empty">Chưa có ảnh giới thiệu. Thêm ảnh để khách hàng xem không gian tập luyện.</p>}
        </section>
      </>}
  </section>;
};
