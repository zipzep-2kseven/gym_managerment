import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, NavLink, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { gymService } from '../../services/gym.service';
import { PageHeader } from '../../components/management/PageHeader';
import { QueryState, StatusBadge } from '../../components/gym/GymUi';
import { AdminGymManagers } from '../../components/gym/AdminGymManagers';
import { SafeImage } from '../../components/gym/GymUi';
import { AdminGymInspectionTable } from './AdminGymInspectionTable';
import { gymSections, resourceLabels } from './gym-inspection-catalog';
import type { Gym } from '../../types/gym.types';
const Overview = ({ gym }: { gym: Gym }) => <section className="management-card">
  <div className="management-card-header"><h2>Thông tin phòng Gym</h2><Link className="btn-secondary" to={`/admin/gyms/${gym.gym_id}/edit`}>Sửa thông tin</Link></div>
  {gym.logo_url && <SafeImage url={gym.logo_url} alt={`Logo ${gym.gym_name}`} />}
  <dl className="admin-gym-facts">
    <dt>Trạng thái</dt><dd><StatusBadge status={gym.status} /></dd>
    <dt>Địa chỉ</dt><dd>{gym.address}</dd><dt>Điện thoại</dt><dd>{gym.phone || 'Chưa cập nhật'}</dd>
    <dt>Email</dt><dd>{gym.email || 'Chưa cập nhật'}</dd>
    <dt>Giờ mở cửa</dt><dd>{gym.opening_time?.slice(0, 5) || 'Chưa cập nhật'} – {gym.closing_time?.slice(0, 5) || 'Chưa cập nhật'}</dd>
    <dt>Vị trí</dt><dd>{gym.latitude && gym.longitude ? `${gym.latitude}, ${gym.longitude}` : 'Chưa cập nhật'}</dd>
    <dt>Mô tả</dt><dd>{gym.description || 'Chưa cập nhật'}</dd>
    <dt>Ngày tạo</dt><dd>{gym.created_at ? new Date(gym.created_at).toLocaleDateString('vi-VN', { timeZone: 'Asia/Bangkok' }) : 'Chưa cập nhật'}</dd>
    <dt>Cập nhật</dt><dd>{gym.updated_at ? new Date(gym.updated_at).toLocaleDateString('vi-VN', { timeZone: 'Asia/Bangkok' }) : 'Chưa cập nhật'}</dd>
  </dl>
</section>;
export const AdminGymPage = () => {
  const { gymId = '', tab } = useParams();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const gym = useQuery({ queryKey: ['gyms', 'admin', user?.user_id, gymId], queryFn: ({ signal }) => gymService.adminGym(gymId, signal) });
  const tabs = useRef<HTMLElement>(null);
  useEffect(() => { tabs.current?.querySelector('.active')?.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }, [tab, gym.data?.gym_id]);
  const section = tab ? gymSections[tab as keyof typeof gymSections] : null;
  const legacy: Record<string, string> = { trainers: 'staff', memberships: 'members?view=memberships', packages: 'members?view=packages', gallery: 'facilities?view=images' };
  if (tab && !section) return <Navigate to={`/admin/gyms/${gymId}${legacy[tab] ? `/${legacy[tab]}` : ''}`} replace />;
  const resources: readonly string[] = section?.resources || [];
  const resource = resources.includes(params.get('view') || '') ? params.get('view')! : resources[0];
  return <div className="admin-gym-inspection">
    <nav className="admin-breadcrumb" aria-label="Đường dẫn"><Link to="/admin/gyms">Danh sách phòng Gym</Link><span aria-hidden="true">/</span><span>{gym.data?.gym_name || 'Chi tiết phòng Gym'}</span></nav>
    <PageHeader title={gym.data?.gym_name || 'Chi tiết phòng Gym'} />
    <QueryState pending={gym.isPending} error={gym.error} retry={gym.refetch} />
    {gym.data && !gym.isError && <>
      <nav ref={tabs} className="admin-gym-tabs" aria-label="Thông tin phòng Gym">
        <NavLink end to={`/admin/gyms/${gymId}`}>Tổng quan</NavLink>
        {Object.entries(gymSections).map(([key, item]) => <NavLink key={key} to={`/admin/gyms/${gymId}/${key}`}>{item.label}</NavLink>)}
      </nav>
      {!section ? <Overview gym={gym.data} /> : <>
        {tab === 'staff' && <AdminGymManagers key={gymId} gymId={gymId} active={gym.data.status === 'ACTIVE'} />}
        {resources.length > 1 && <label className="admin-inspection-switch">Nhóm thông tin<select className="form-input" value={resource} onChange={event => setParams({ view: event.target.value })}>
          {resources.map(key => <option key={key} value={key}>{resourceLabels[key]}</option>)}
        </select></label>}
        <AdminGymInspectionTable key={`${gymId}-${resource}`} gymId={gymId} resource={resource} />
      </>}
    </>}
  </div>;
};
