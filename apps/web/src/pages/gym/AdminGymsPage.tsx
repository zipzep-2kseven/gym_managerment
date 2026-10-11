import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useGymMutation } from '../../hooks/useGym';
import { useListFilters } from '../../hooks/useListFilters';
import { gymService } from '../../services/gym.service';
import type { Status } from '../../types/gym.types';
import { ConfirmAction, MutationError, Pager, QueryState, StatusBadge } from '../../components/gym/GymUi';
import { GymForm } from '../../components/gym/GymForm';
export const AdminGymsPage = () => {
  const { user } = useAuth();
  const { query, setFilter } = useListFilters('gym_name', true);
  const gyms = useQuery({ queryKey: ['gyms', 'admin', user?.user_id, query], queryFn: () => gymService.gyms(query, true) });
  const status = useGymMutation(({ id, value }: { id: string; value: Status }) => gymService.status(id, value));
  return <><div className="gym-heading"><h1>Cơ sở toàn hệ thống</h1><Link className="btn-primary" to="/admin/gyms/create">Tạo Gym</Link></div><Link to="/admin/managers">Bổ nhiệm Manager</Link>
    <form className="gym-toolbar" onSubmit={e => { e.preventDefault(); setFilter('search', String(new FormData(e.currentTarget).get('search') || '')); }}><label className="form-group">Tìm Gym<input className="form-input" name="search" defaultValue={query.search} /></label><button className="btn-primary">Tìm kiếm</button><label className="form-group">Trạng thái<select className="form-input" value={query.status || ''} onChange={e => { setFilter('status', e.target.value); }}><option value="">Tất cả</option><option value="ACTIVE">Hoạt động</option><option value="INACTIVE">Ngừng hoạt động</option></select></label></form>
    <MutationError error={status.error} /><QueryState pending={gyms.isPending} error={gyms.error} retry={gyms.refetch} />
    {gyms.data && !gyms.isError && <>{gyms.data.data.map(gym => <article className="gym-management-row" key={gym.gym_id}><div><h2>{gym.gym_name}</h2><p>{gym.address}</p><StatusBadge status={gym.status} /></div><div className="gym-actions"><Link className="btn-secondary" to={`/admin/gyms/${gym.gym_id}`}>Sửa thông tin {gym.gym_name}</Link><ConfirmAction label={gym.status === 'ACTIVE' ? `Ngừng Gym ${gym.gym_name}` : `Kích hoạt Gym ${gym.gym_name}`} pending={status.isPending} onConfirm={() => status.mutate({ id: gym.gym_id, value: gym.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' })} /></div></article>)}{!gyms.data.data.length && <p>Chưa có Gym phù hợp.</p>}<Pager pagination={gyms.data.pagination} onPage={page => { setFilter('page', String(page)); }} /></>}
  </>;
};
export const CreateGymPage = () => <><Link to="/admin/gyms">Danh sách Gym</Link><h1>Tạo cơ sở mới</h1><GymForm /></>;

export const AdminGymPage = () => {
  const { gymId = '' } = useParams();
  const { user } = useAuth();
  const gym = useQuery({ queryKey: ['gyms', 'admin', user?.user_id, gymId], queryFn: ({ signal }) => gymService.adminGym(gymId, signal) });
  const mutation = useGymMutation((value: Status) => gymService.status(gymId, value));
  return <><Link to="/admin/gyms">Danh sách Gym</Link><h1>Cập nhật cơ sở</h1><Link to={`/admin/gyms/${gymId}/gallery`}>Ảnh phòng Gym</Link><Link to={`/admin/gyms/${gymId}/packages`}>Quản lý gói tập</Link><Link to={`/admin/gyms/${gymId}/reports`}>Báo cáo sự cố</Link><Link to={`/admin/gyms/${gymId}/pt`}>Giám sát PT và lịch tập</Link><QueryState pending={gym.isPending} error={gym.error} retry={gym.refetch} />
    {gym.data && !gym.isError && <><StatusBadge status={gym.data.status} /><MutationError error={mutation.error} /><ConfirmAction label={gym.data.status === 'ACTIVE' ? 'Ngừng Gym' : 'Kích hoạt Gym'} pending={mutation.isPending} onConfirm={() => mutation.mutate(gym.data.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE')} /><GymForm key={gym.data.gym_id} gym={gym.data} /></>}
  </>;
};
