import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useGymMutation } from '../../hooks/useGym';
import { useListFilters } from '../../hooks/useListFilters';
import { gymService } from '../../services/gym.service';
import type { Status } from '../../types/gym.types';
import { ConfirmAction, MutationError, Pager, QueryState, StatusBadge } from '../../components/gym/GymUi';
import { PageHeader } from '../../components/management/PageHeader';
import { GymForm } from '../../components/gym/GymForm';
export const AdminGymsPage = () => {
  const { user } = useAuth();
  const { query, setFilter } = useListFilters('gym_name', true);
  const gyms = useQuery({ queryKey: ['gyms', 'admin', user?.user_id, query], queryFn: () => gymService.gyms(query, true) });
  const status = useGymMutation(({ id, value }: { id: string; value: Status }) => gymService.status(id, value));
  return <><PageHeader title="Cơ sở toàn hệ thống" subtitle="Tra cứu cơ sở và quản lý thông tin hoạt động." action={<div className="gym-actions"><Link className="btn-primary" to="/admin/gyms/create">Tạo Gym</Link><Link className="btn-secondary" to="/admin/managers">Bổ nhiệm Manager</Link><button className="btn-secondary" onClick={() => void gyms.refetch()}>Tải lại danh sách</button></div>} />
    <form className="gym-toolbar" onSubmit={e => { e.preventDefault(); setFilter('search', String(new FormData(e.currentTarget).get('search') || '')); }}><label className="form-group">Tìm Gym<input className="form-input" name="search" defaultValue={query.search} /></label><button className="btn-primary">Tìm kiếm</button><label className="form-group">Trạng thái<select className="form-input" value={query.status || ''} onChange={e => { setFilter('status', e.target.value); }}><option value="">Tất cả</option><option value="ACTIVE">Hoạt động</option><option value="INACTIVE">Ngừng hoạt động</option></select></label></form>
    <MutationError error={status.error} /><QueryState pending={gyms.isPending} error={gyms.error} retry={gyms.refetch} />
    {gyms.data && !gyms.isError && <><p>{gyms.data.pagination.totalItems} cơ sở phù hợp</p>{gyms.data.data.map(gym => <article className="gym-management-row" key={gym.gym_id}><div><h2>{gym.gym_name}</h2><p>{gym.address}</p><StatusBadge status={gym.status} /></div><div className="gym-actions"><Link className="btn-secondary" to={`/admin/gyms/${gym.gym_id}`}>Sửa thông tin {gym.gym_name}</Link><ConfirmAction label={gym.status === 'ACTIVE' ? `Ngừng Gym ${gym.gym_name}` : `Kích hoạt Gym ${gym.gym_name}`} pending={status.isPending} onConfirm={() => status.mutate({ id: gym.gym_id, value: gym.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' })} /></div></article>)}{!gyms.data.data.length && <p>Chưa có Gym phù hợp.</p>}<Pager pagination={gyms.data.pagination} onPage={page => { setFilter('page', String(page)); }} /></>}
  </>;
};
export const CreateGymPage = () => <><PageHeader title="Tạo cơ sở mới" subtitle="Tạo cơ sở cùng tài khoản và phân công Manager trong một lần lưu." action={<Link className="btn-secondary" to="/admin/gyms">Danh sách Gym</Link>} /><GymForm /></>;

export const AdminGymPage = () => {
  const { gymId = '' } = useParams();
  const { user } = useAuth();
  const gym = useQuery({ queryKey: ['gyms', 'admin', user?.user_id, gymId], queryFn: ({ signal }) => gymService.adminGym(gymId, signal) });
  const mutation = useGymMutation((value: Status) => gymService.status(gymId, value));
  return <><PageHeader title="Cập nhật cơ sở" subtitle="Chỉnh sửa thông tin và giám sát hoạt động tại cơ sở đang chọn." action={<Link className="btn-secondary" to="/admin/gyms">Danh sách Gym</Link>} />
    <QueryState pending={gym.isPending} error={gym.error} retry={gym.refetch} />
    {gym.data && !gym.isError && <>
      <section className="admin-scope" aria-label="Cơ sở đang chọn"><h2>{gym.data.gym_name}</h2><StatusBadge status={gym.data.status} /><p>{gym.data.address}</p>
        <div className="gym-actions"><Link className="btn-secondary" to={`/admin/gyms/${gymId}/gallery`}>Ảnh phòng Gym</Link><Link className="btn-secondary" to={`/admin/gyms/${gymId}/packages`}>Quản lý gói tập</Link><Link className="btn-secondary" to={`/admin/gyms/${gymId}/reports`}>Báo cáo sự cố</Link><Link className="btn-secondary" to={`/admin/gyms/${gymId}/pt`}>Giám sát PT và lịch tập</Link></div>
      </section>
      <div className="admin-columns"><GymForm key={gym.data.gym_id} gym={gym.data} /><section className="management-card"><h2>Trạng thái cơ sở</h2><p>Ngừng hoạt động yêu cầu cơ sở không còn nghĩa vụ đang mở. Thông tin và lịch sử cơ sở được giữ nguyên.</p><MutationError error={mutation.error} /><ConfirmAction label={gym.data.status === 'ACTIVE' ? 'Ngừng Gym' : 'Kích hoạt Gym'} pending={mutation.isPending} onConfirm={() => mutation.mutate(gym.data.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE')} /></section></div>
    </>}
  </>;
};
