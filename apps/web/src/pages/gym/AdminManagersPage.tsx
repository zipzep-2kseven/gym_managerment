import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useGymMutation } from '../../hooks/useGym';
import { useListFilters } from '../../hooks/useListFilters';
import { gymService } from '../../services/gym.service';
import { StaffForm } from '../../components/gym/StaffForm';
import { ConfirmAction, MutationError, Pager, QueryState, StatusBadge } from '../../components/gym/GymUi';
export const AdminManagersPage = () => {
  const { user } = useAuth();
  const { query, setFilter } = useListFilters('gym_name', true);
  const [gymId, setGymId] = useState('');
  const gyms = useQuery({ queryKey: ['gyms', 'admin', user?.user_id, query], queryFn: () => gymService.gyms(query, true) });
  const managers = useQuery({ queryKey: ['gyms', 'admin', user?.user_id, gymId, 'managers'], queryFn: () => gymService.managers(gymId), enabled: !!gymId });
  const revoke = useGymMutation((id: string) => gymService.revokeManager(gymId, id));
  return <><Link to="/admin/gyms">Danh sách Gym</Link><h1>Phân công Manager</h1>
    <form className="gym-toolbar" onSubmit={e => { e.preventDefault(); setGymId(''); setFilter('search', String(new FormData(e.currentTarget).get('search') || '')); }}><label className="form-group">Tìm Gym<input className="form-input" name="search" defaultValue={query.search} /></label><button className="btn-primary">Tìm kiếm</button></form>
    <QueryState pending={gyms.isPending} error={gyms.error} retry={gyms.refetch} />{gyms.data && !gyms.isError && <><label className="form-group">Chọn Gym<select className="form-input" value={gymId} onChange={e => { setGymId(e.target.value); revoke.reset(); }}><option value="">Chọn một cơ sở</option>{gyms.data.data.map(gym => <option key={gym.gym_id} value={gym.gym_id}>{gym.gym_name} ({gym.status})</option>)}</select></label><Pager pagination={gyms.data.pagination} onPage={page => { setGymId(''); setFilter('page', String(page)); }} /></>}
    {gymId && !gyms.isError && <><QueryState pending={managers.isPending} error={managers.error} retry={managers.refetch} /><MutationError error={revoke.error} />{managers.data && !managers.isError && <><StaffForm key={gymId} gymId={gymId} kind="MANAGER" />{!managers.data.length && <p>Chưa có phân công Manager.</p>}{managers.data.map(manager => <article className="gym-management-row" key={manager.gym_manager_id}><div><p>User ID: {manager.user_id}</p><StatusBadge status={manager.status} /><p>Bổ nhiệm gần nhất: {new Date(manager.assigned_at).toLocaleDateString('vi-VN', { timeZone: 'Asia/Bangkok' })}</p></div>{manager.status === 'ACTIVE' && <ConfirmAction label="Thu hồi phân công" pending={revoke.isPending} onConfirm={() => revoke.mutate(manager.gym_manager_id)} />}</article>)}</>}</>}
  </>;
};
