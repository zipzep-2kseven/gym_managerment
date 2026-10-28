import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAdminTrainerRoster } from '../../hooks/useAdminTrainerRoster';
import { PageHeader } from '../../components/management/PageHeader';
import { DashboardQueryFeedback } from '../../components/management/DashboardQueryFeedback';
import { Pager, QueryState, StatusBadge } from '../../components/gym/GymUi';
import { AdminTrainerLifecycle } from '../../components/gym/AdminTrainerLifecycle';
import { useAuth } from '../../hooks/useAuth';
import type { ManagedTrainer } from '../../types/gym.types';

const availability = { ACCEPTING: 'Đang nhận học viên', ALMOST_FULL: 'Gần kín lịch', NOT_ACCEPTING: 'Chưa nhận học viên' };
export const AdminTrainersPage = () => {
  const { gymId = '' } = useParams();
  const { user } = useAuth();
  const { gym, roster, query, validGym, accessError, setFilter } = useAdminTrainerRoster(gymId);
  const [selected, setSelected] = useState<{ trainer: ManagedTrainer; gymId: string; actorId?: string } | null>(null);
  const [notice, setNotice] = useState<{ message: string; gymId: string; actorId?: string } | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null), refresh = useRef<HTMLButtonElement>(null), feedback = useRef<HTMLParagraphElement>(null);
  const current = selected?.gymId === gymId && selected.actorId === user?.user_id ? selected : null;
  const [search, setSearch] = useState(query.search || '');
  useEffect(() => { setSelected(null); setNotice(null); opener.current = null; }, [gymId, user?.user_id]);
  useEffect(() => { setSearch(query.search || ''); }, [gymId, query.search]);
  useEffect(() => { if (notice?.gymId === gymId && notice.actorId === user?.user_id) feedback.current?.focus(); }, [notice, gymId, user?.user_id]);
  useEffect(() => {
    const data = roster.data;
    if (!roster.isFetching && !roster.isError && data && !data.data.length && query.page > Math.max(1, data.pagination.totalPages)) setFilter('page', String(Math.max(1, data.pagination.totalPages)));
  }, [roster.data, roster.isFetching, roster.isError, query.page, setFilter]);
  const close = () => {
    setSelected(null);
    queueMicrotask(() => {
      const button = opener.current;
      (button?.isConnected && !button.disabled ? button : refresh.current)?.focus();
    });
  };
  if (!validGym) return <section role="alert" className="gym-panel"><h1>Cơ sở không hợp lệ</h1><Link to="/admin/gyms">Danh sách cơ sở</Link></section>;
  if (accessError) return <QueryState pending={false} error={accessError} retry={() => { void gym.refetch(); void roster.refetch(); }} redirectOnUnauthorized={false} />;
  return <div className="admin-trainers">
    <PageHeader title="Phân công PT tại cơ sở" subtitle="Tra cứu phân công và tình trạng nhận học viên của PT trong cơ sở đang chọn." action={<div className="gym-actions"><Link className="btn-secondary" to={`/admin/gyms/${gymId}`}>Thông tin cơ sở</Link>{gym.data?.status === 'ACTIVE' && !gym.isError && <Link className="btn-primary" to={`/admin/gyms/${gymId}/trainers/assign`}>Tiếp nhận PT</Link>}</div>} />
    <QueryState pending={gym.isPending} error={gym.error} retry={gym.refetch} redirectOnUnauthorized={false} />
    {notice?.gymId === gymId && notice.actorId === user?.user_id && <p ref={feedback} tabIndex={-1} role="status">{notice.message}</p>}
    {current && <AdminTrainerLifecycle key={`${user?.user_id}:${gymId}:${current.trainer.gym_trainer_id}`} gymId={gymId} trainer={current.trainer} onClose={close} onSaved={message => { setSelected(null); setNotice({ message, gymId, actorId: user?.user_id }); }} onReload={async () => {
      const [scope, list] = await Promise.all([gym.refetch(), roster.refetch()]);
      return !scope.isError && !list.isError;
    }} />}
    {gym.data && !gym.isError && <>
      <section className="admin-scope" aria-label="Cơ sở đang chọn"><h2>{gym.data.gym_name}</h2><StatusBadge status={gym.data.status} /><p>{gym.data.address}</p><p>Trạng thái phân công PT khác với trạng thái tài khoản. Tình trạng nhận học viên chỉ dùng để tham khảo.</p></section>
      <form className="gym-toolbar admin-trainer-filters" onSubmit={event => { event.preventDefault(); setFilter('search', search); }}>
        <label className="form-group">Chuyên môn hoặc tiểu sử<input className="form-input" name="search" value={search} onChange={event => setSearch(event.target.value)} /></label><button className="btn-primary">Tìm kiếm</button>
        <label className="form-group">Trạng thái phân công<select className="form-input" value={query.status || ''} onChange={event => setFilter('status', event.target.value)}><option value="">Tất cả</option><option value="ACTIVE">Hoạt động</option><option value="INACTIVE">Ngừng hoạt động</option></select></label>
        <label className="form-group">Sắp xếp theo<select className="form-input" value={query.sortBy} onChange={event => setFilter('sortBy', event.target.value)}><option value="created_at">Ngày tạo phân công</option><option value="joined_at">Ngày tham gia</option><option value="specialization">Chuyên môn</option></select></label>
        <label className="form-group">Thứ tự<select className="form-input" value={query.sortOrder} onChange={event => setFilter('sortOrder', event.target.value)}><option value="desc">Giảm dần</option><option value="asc">Tăng dần</option></select></label>
      </form>
      <section className="management-card" aria-label="Danh sách phân công PT" aria-busy={roster.isFetching}>
        <button ref={refresh} className="btn-secondary" disabled={roster.isFetching || !!current} onClick={() => { void gym.refetch(); void roster.refetch(); }}>Làm mới danh sách</button>
        {roster.isPending && <QueryState pending error={null} retry={roster.refetch} />}
        <DashboardQueryFeedback query={roster} retry={() => void roster.refetch()} />
        {roster.data && <><p>{roster.data.pagination.totalItems} phân công phù hợp</p>
          <ul className="admin-trainer-list">{roster.data.data.map(trainer => <li key={trainer.gym_trainer_id}>
            <div><h2>{trainer.specialization || 'Chưa cập nhật chuyên môn'}</h2><p>User ID: {trainer.user_id}</p><p>{trainer.bio || 'Chưa cập nhật tiểu sử'}</p></div>
            <dl><div><dt>Trạng thái phân công</dt><dd><StatusBadge status={trainer.status} /></dd></div><div><dt>Nhận học viên</dt><dd>{availability[trainer.availability]}</dd></div><div><dt>Kinh nghiệm</dt><dd>{trainer.experience_years === null ? 'Chưa cập nhật' : `${trainer.experience_years} năm`}</dd></div><div><dt>Ngày tham gia</dt><dd><time dateTime={trainer.joined_at}>{new Date(trainer.joined_at).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</time></dd></div></dl>
            <div className="gym-actions"><button className="btn-secondary" disabled={!!current || roster.isFetching || roster.isError || (trainer.status === 'INACTIVE' && gym.data.status !== 'ACTIVE')} onClick={event => {
              opener.current = event.currentTarget; setNotice(null); setSelected({ trainer, gymId, actorId: user?.user_id });
            }}>{trainer.status === 'ACTIVE' ? 'Ngừng PT' : 'Kích hoạt PT'}</button>{trainer.status === 'INACTIVE' && gym.data.status !== 'ACTIVE' && <span>Cơ sở ngừng hoạt động, chưa thể kích hoạt.</span>}</div>
          </li>)}</ul>
          {!roster.data.data.length && <p>Chưa có phân công PT phù hợp. Hãy kiểm tra bộ lọc hoặc chọn cơ sở khác.</p>}
          <Pager pagination={roster.data.pagination} onPage={page => setFilter('page', String(page))} />
        </>}
      </section>
    </>}
  </div>;
};
