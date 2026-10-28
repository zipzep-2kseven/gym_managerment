import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { useGymMutation } from '../../hooks/useGym';
import { gymService } from '../../services/gym.service';
import { StaffForm } from './StaffForm';
import { ConfirmAction, MutationError, QueryState } from './GymUi';

export const AdminGymManagers = ({ gymId, active }: { gymId: string; active: boolean }) => {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const managers = useQuery({ queryKey: ['gyms', 'admin', user?.user_id, gymId, 'managers'],
    queryFn: () => gymService.managers(gymId) });
  const revoke = useGymMutation((id: string) => gymService.revokeManager(gymId, id), { affectsAccounts: true });
  const current = managers.data?.find(manager => manager.status === 'ACTIVE');
  const history = managers.data?.filter(manager => manager.status !== 'ACTIVE') ?? [];
  return <section className="management-card admin-gym-managers" aria-labelledby="gym-manager-title">
    <h2 id="gym-manager-title">Manager phụ trách</h2>
    <QueryState pending={managers.isPending} error={managers.error} retry={managers.refetch} />
    <MutationError error={revoke.error} />
    {managers.data && !managers.isError && <>
      {current ? <div className="admin-manager-current">
        <div><strong>{current.full_name || current.email || 'Manager hiện tại'}</strong>
          {current.email && <p>{current.email}</p>}
          <p>Bổ nhiệm: {new Date(current.assigned_at).toLocaleDateString('vi-VN', { timeZone: 'Asia/Bangkok' })}</p>
        </div>
        <ConfirmAction label="Thu hồi phân công" pending={revoke.isPending} onConfirm={() => revoke.mutate(current.gym_manager_id)} />
      </div> : <><p>Chưa có Manager phụ trách.</p>
        {active && !showForm && <button className="btn-primary" onClick={() => setShowForm(true)}>Bổ nhiệm Manager</button>}
      </>}
      {!active && !current && <p>Hãy kích hoạt phòng Gym trước khi bổ nhiệm Manager.</p>}
      {showForm && <div className="admin-manager-form">
        <StaffForm gymId={gymId} kind="MANAGER" blocked={!!current || !active} />
        <button className="btn-secondary" onClick={() => setShowForm(false)}>Đóng form bổ nhiệm</button>
      </div>}
      {history.length > 0 && <details className="admin-manager-history"><summary>Lịch sử phân công ({history.length})</summary>
        <ul>{history.map(manager => <li key={manager.gym_manager_id}>
          <strong>{manager.full_name || manager.email || 'Manager'}</strong>
          <span>{manager.email} · Đã thu hồi · {new Date(manager.assigned_at).toLocaleDateString('vi-VN', { timeZone: 'Asia/Bangkok' })}</span>
        </li>)}</ul>
      </details>}
    </>}
  </section>;
};
