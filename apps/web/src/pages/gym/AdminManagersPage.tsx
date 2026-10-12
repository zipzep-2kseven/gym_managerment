import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useGymMutation } from '../../hooks/useGym';
import { useListFilters } from '../../hooks/useListFilters';
import { gymService } from '../../services/gym.service';
import { PageHeader } from '../../components/management/PageHeader';
import { StaffForm } from '../../components/gym/StaffForm';
import { ConfirmAction, MutationError, Pager, QueryState, StatusBadge } from '../../components/gym/GymUi';
export const AdminManagersPage = () => {
  const { user } = useAuth();
  const { query, setFilter } = useListFilters('gym_name', true);
  const [gymId, setGymId] = useState('');
  const gyms = useQuery({ queryKey: ['gyms', 'admin', user?.user_id, query], queryFn: () => gymService.gyms(query, true) });
  const managers = useQuery({ queryKey: ['gyms', 'admin', user?.user_id, gymId, 'managers'], queryFn: () => gymService.managers(gymId), enabled: !!gymId });
  const revoke = useGymMutation((id: string) => gymService.revokeManager(gymId, id));
  return <><PageHeader title="Phân công Manager" subtitle="Chọn cơ sở để xem phân công và bổ nhiệm Manager." action={<Link className="btn-secondary" to="/admin/gyms">Danh sách Gym</Link>} />
    <form className="gym-toolbar" onSubmit={e => { e.preventDefault(); setGymId(''); setFilter('search', String(new FormData(e.currentTarget).get('search') || '')); }}><label className="form-group">Tìm Gym<input className="form-input" name="search" defaultValue={query.search} /></label><button className="btn-primary">Tìm kiếm</button></form>
    <QueryState pending={gyms.isPending} error={gyms.error} retry={gyms.refetch} />{gyms.data && !gyms.isError && <><label className="form-group">Chọn Gym<select className="form-input" value={gymId} onChange={e => { setGymId(e.target.value); revoke.reset(); }}><option value="">Chọn một cơ sở</option>{gyms.data.data.map(gym => <option key={gym.gym_id} value={gym.gym_id}>{gym.gym_name} ({gym.status})</option>)}</select></label><Pager pagination={gyms.data.pagination} onPage={page => { setGymId(''); setFilter('page', String(page)); }} /></>}
    {gymId && !gyms.isError && <>
      <section className="admin-scope" aria-label="Cơ sở đang chọn"><h2>{gyms.data?.data.find(g => g.gym_id === gymId)?.gym_name}</h2><p>Phân công chỉ áp dụng tại cơ sở này. Trạng thái bên dưới là trạng thái phân công.</p><Link className="btn-secondary" to={`/admin/gyms/${gymId}`}>Thông tin cơ sở</Link><button className="btn-secondary" onClick={() => void managers.refetch()}>Tải lại phân công</button></section>
      <QueryState pending={managers.isPending} error={managers.error} retry={managers.refetch} /><MutationError error={revoke.error} />
      {managers.data && !managers.isError && <div className="admin-columns">
        <StaffForm key={gymId} gymId={gymId} kind="MANAGER" blocked={managers.data.some(m => m.status === 'ACTIVE')} />
        <section className="management-card"><h2>Phân công Manager</h2>{!managers.data.length && <p>Chưa có phân công Manager.</p>}{managers.data.map(manager => <article className="gym-management-row" key={manager.gym_manager_id}><div><p>User ID: {manager.user_id}</p><StatusBadge status={manager.status} /><p>Bổ nhiệm gần nhất: {new Date(manager.assigned_at).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</p></div>{manager.status === 'ACTIVE' && <ConfirmAction label="Thu hồi phân công" pending={revoke.isPending} onConfirm={() => revoke.mutate(manager.gym_manager_id)} />}</article>)}</section>
      </div>}
    </>}
  </>;
};
