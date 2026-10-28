import { Link, useParams } from 'react-router-dom';
import { useAdminGymContext } from '../../hooks/useAdminGymContext';
import { PageHeader } from '../../components/management/PageHeader';
import { QueryState, StatusBadge } from '../../components/gym/GymUi';
import { AdminTrainerIntakeForm } from '../../components/gym/AdminTrainerIntakeForm';
import { ApiClientError } from '../../services/api-client';

export const AdminTrainerIntakePage = () => {
  const { gymId = '' } = useParams();
  const { gym, validGym, actorId } = useAdminGymContext(gymId);
  const accessLost = gym.error instanceof ApiClientError && [401, 403].includes(gym.error.statusCode);
  if (!validGym) return <section role="alert" className="gym-panel"><h1>Cơ sở không hợp lệ</h1><Link to="/admin/gyms">Danh sách cơ sở</Link></section>;
  return <div>
    <PageHeader title="Tiếp nhận PT tại cơ sở" subtitle="Chọn cách tiếp nhận và bàn giao tài khoản cho PT." />
    <QueryState pending={gym.isPending} error={gym.error} retry={gym.refetch} redirectOnUnauthorized={false} />
    {gym.data && !accessLost && <>
      <section className="admin-scope" aria-label="Cơ sở đang chọn"><h2>{gym.data.gym_name}</h2><StatusBadge status={gym.data.status} /><p>{gym.data.address}</p><p>Gym ID: {gymId}</p></section>
      <AdminTrainerIntakeForm key={`${actorId}:${gymId}`} gymId={gymId} blocked={gym.isError || gym.data.status !== 'ACTIVE'} blockedReason={gym.isError ? 'Không thể xác nhận cơ sở. Đọc lại trước khi tiếp nhận thêm PT.' : undefined} />
    </>}
  </div>;
};
