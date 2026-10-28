import { ActionIcon } from '../../components/admin/ActionIcon';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useGymMutation } from '../../hooks/useGym';
import { useListFilters } from '../../hooks/useListFilters';
import { gymService } from '../../services/gym.service';
import type { Gym, Status } from '../../types/gym.types';
import { ConfirmAction, MutationError, Pager, QueryState, StatusBadge } from '../../components/gym/GymUi';
import { PageHeader } from '../../components/management/PageHeader';
import { GymForm } from '../../components/gym/GymForm';
export { AdminGymPage } from './AdminGymInspectionPage';
import { DeleteGymDialog } from '../../components/gym/DeleteGymDialog';

export const AdminGymsPage = () => {
  const { user } = useAuth();
  const { query, setFilter } = useListFilters('gym_name', true);
  const [deleting, setDeleting] = useState<Gym | null>(null);
  const gyms = useQuery({ queryKey: ['gyms', 'admin', user?.user_id, query], queryFn: () => gymService.gyms(query, true) });
  const remove = useGymMutation((id: string) => gymService.remove(id));
  return <div className="admin-gyms-page">
    <PageHeader title="Quản lý phòng Gym" />
    <section className="admin-list-panel">
      <form className="admin-list-toolbar" onSubmit={event => { event.preventDefault(); setFilter('search', String(new FormData(event.currentTarget).get('search') || '')); }}>
        <Link aria-label="Thêm phòng Gym" className="btn-primary admin-list-create" to="/admin/gyms/create">+ Thêm phòng Gym</Link>
        <label className="form-group">Tìm phòng Gym<input className="form-input" name="search" placeholder="Tên phòng tập hoặc địa chỉ" defaultValue={query.search} /></label>
        <button className="admin-icon-action" aria-label="Tìm kiếm" title="Tìm kiếm"><ActionIcon kind="search" /></button>
        <label className="form-group">Trạng thái<select className="form-input" value={query.status || ''} onChange={event => setFilter('status', event.target.value)}>
          <option value="">Tất cả</option><option value="ACTIVE">Hoạt động</option><option value="INACTIVE">Ngừng hoạt động</option>
        </select></label>
      </form>
      <QueryState pending={gyms.isPending} error={gyms.error} retry={gyms.refetch} />
      {gyms.data && !gyms.isError && <>
        {/* Scroll region needs keyboard focus so narrow screens can scroll the table. */}
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
        <div className="admin-gym-table-scroll" role="region" aria-label="Bảng phòng Gym" tabIndex={0}>
          <table className="admin-gym-table">
            <caption>{gyms.data.pagination.totalItems} phòng Gym phù hợp</caption>
            <thead><tr><th scope="col">Tên phòng tập</th><th scope="col">Địa chỉ</th><th scope="col">Manager phụ trách</th><th scope="col">Trạng thái</th><th scope="col">Thao tác</th></tr></thead>
            <tbody>{gyms.data.data.map(gym => <tr key={gym.gym_id}>
              <th scope="row"><Link to={`/admin/gyms/${gym.gym_id}`}>{gym.gym_name}</Link></th>
              <td>{gym.address}</td>
              <td>{gym.manager ? <><strong>{gym.manager.full_name || gym.manager.email}</strong>{gym.manager.full_name && <span className="admin-gym-manager-email">{gym.manager.email}</span>}</> : <span className="admin-gym-unassigned">Chưa bổ nhiệm</span>}</td>
              <td><StatusBadge status={gym.status} /></td>
              <td><div className="admin-gym-row-actions">
                <Link to={`/admin/gyms/${gym.gym_id}`} aria-label={`Xem ${gym.gym_name}`} title="Xem chi tiết"><ActionIcon kind="view" /></Link>
                <Link to={`/admin/gyms/${gym.gym_id}/edit`} aria-label={`Sửa ${gym.gym_name}`} title="Sửa thông tin"><ActionIcon kind="edit" /></Link>
                <button type="button" title="Xóa phòng Gym" aria-label={`Xóa ${gym.gym_name}`} onClick={() => { remove.reset(); setDeleting(gym); }}><ActionIcon kind="delete" /></button>
              </div></td>
            </tr>)}{!gyms.data.data.length && <tr><td colSpan={5} className="admin-gym-empty">Chưa có phòng Gym phù hợp. Hãy thử tìm kiếm hoặc trạng thái khác.</td></tr>}</tbody>
          </table>
        </div>
        {gyms.data.pagination.totalPages > 1 && <Pager pagination={gyms.data.pagination} onPage={page => setFilter('page', String(page))} />}
      </>}
    </section>
    {deleting && <DeleteGymDialog gym={deleting} pending={remove.isPending} error={remove.error}
      onClose={() => setDeleting(null)} onDelete={() => remove.mutate(deleting.gym_id, { onSuccess: () => setDeleting(null) })} />}
  </div>;
};

export const CreateGymPage = () => <><PageHeader title="Thêm phòng Gym" subtitle="Tạo phòng Gym và bổ nhiệm Manager phụ trách."
  action={<Link className="btn-secondary" to="/admin/gyms">Danh sách phòng Gym</Link>} /><GymForm /></>;

const useAdminGym = () => {
  const { gymId = '' } = useParams();
  const { user } = useAuth();
  const gym = useQuery({ queryKey: ['gyms', 'admin', user?.user_id, gymId], queryFn: ({ signal }) => gymService.adminGym(gymId, signal) });
  return { gymId, gym };
};

export const EditGymPage = () => {
  const { gymId, gym } = useAdminGym();
  const mutation = useGymMutation((value: Status) => gymService.status(gymId, value));
  return <><PageHeader title="Chỉnh sửa phòng Gym" subtitle={gym.data?.gym_name}
    action={<Link className="btn-secondary" to={`/admin/gyms/${gymId}`}>Về chi tiết phòng Gym</Link>} />
    <QueryState pending={gym.isPending} error={gym.error} retry={gym.refetch} />
    {gym.data && !gym.isError && <div className="admin-gym-detail-grid">
      <GymForm key={gymId} gym={gym.data} />
      <section className="management-card"><h2>Trạng thái hoạt động</h2><StatusBadge status={gym.data.status} />
        <p>Ngừng hoạt động yêu cầu phòng Gym không còn nghĩa vụ đang mở. Thông tin và lịch sử được giữ lại.</p>
        <MutationError error={mutation.error} /><ConfirmAction label={gym.data.status === 'ACTIVE' ? 'Ngừng hoạt động' : 'Kích hoạt phòng Gym'} pending={mutation.isPending} onConfirm={() => mutation.mutate(gym.data!.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE')} />
      </section>
    </div>}
  </>;
};
