import { AvailabilityForm } from '../pt/PtForms';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { gymService } from '../../services/gym.service';
import { useAuth } from '../../hooks/useAuth';
import { useGymMutation } from '../../hooks/useGym';
import { useListFilters } from '../../hooks/useListFilters';
import { useManagerGymId } from './ManagerGymPage';
import { ConfirmAction, MutationError, Pager, QueryState, StatusBadge } from '../../components/gym/GymUi';
import { StaffForm } from '../../components/gym/StaffForm';
import { availabilityLabel } from './PublicTrainersPage';
import type { Status } from '../../types/gym.types';
export const ManagedTrainersPage = () => {
  const gymId = useManagerGymId();
  const { user } = useAuth();
  const { query, setFilter } = useListFilters('specialization', true);
  const trainers = useQuery({ queryKey: ['gyms', 'management', user?.user_id, gymId, 'trainers', query], queryFn: () => gymService.managedTrainers(gymId, query) });
  const mutation = useGymMutation(({ id, status }: { id: string; status: Status }) => gymService.trainerStatus(gymId, id, status));
  return <><div className="gym-heading"><h1>Huấn luyện viên tại Gym</h1><Link className="btn-primary" to="/manager/trainers/assign">Tiếp nhận PT</Link></div><Link to="/manager/gym">Thông tin Gym</Link>
    <form className="gym-toolbar" onSubmit={e => { e.preventDefault(); setFilter('search', String(new FormData(e.currentTarget).get('search') || '')); }}><label className="form-group">Chuyên môn hoặc tiểu sử<input className="form-input" name="search" defaultValue={query.search} /></label><button className="btn-primary">Tìm kiếm</button><label className="form-group">Trạng thái<select className="form-input" value={query.status || ''} onChange={e => setFilter('status', e.target.value)}><option value="">Tất cả</option><option value="ACTIVE">Hoạt động</option><option value="INACTIVE">Ngừng hoạt động</option></select></label></form>
    <MutationError error={mutation.error} /><QueryState pending={trainers.isPending} error={trainers.error} retry={trainers.refetch} />{trainers.data && !trainers.isError && <>{trainers.data.data.map(pt => <article className="gym-management-row" key={pt.gym_trainer_id}><div><h2>{pt.specialization || 'Huấn luyện viên'}</h2><p>User ID: {pt.user_id}</p><Link to={`/manager/trainers/${pt.gym_trainer_id}/profile`}>Hồ sơ và giờ làm việc</Link><p>{pt.experience_years ?? 'Chưa cập nhật'} năm kinh nghiệm · {availabilityLabel[pt.availability]}</p><StatusBadge status={pt.status} />{pt.status === 'ACTIVE' && <AvailabilityForm key={`${pt.gym_trainer_id}-${pt.availability}`} gymId={gymId} trainerId={pt.gym_trainer_id} value={pt.availability} />}</div><ConfirmAction pending={mutation.isPending} label={pt.status === 'ACTIVE' ? 'Ngừng PT' : 'Kích hoạt PT'} onConfirm={() => mutation.mutate({ id: pt.gym_trainer_id, status: pt.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' })} /></article>)}{!trainers.data.data.length && <p>Chưa có PT phù hợp.</p>}<Pager pagination={trainers.data.pagination} onPage={page => setFilter('page', String(page))} /></>}
  </>;
};
export const AssignTrainerPage = () => {
  const gymId = useManagerGymId();
  return <><Link to="/manager/trainers">Danh sách PT</Link><h1>Tiếp nhận huấn luyện viên</h1><StaffForm key={gymId} gymId={gymId} kind="PT" /></>;
};
