import { Link } from 'react-router-dom';
import type { UseQueryResult } from '@tanstack/react-query';
import type { Gym, PageResult } from '../../types/gym.types';
import { StatusBadge } from '../gym/GymUi';
import { DashboardQueryFeedback } from './DashboardQueryFeedback';

export const AdminGymOverview = ({ query }: { query: UseQueryResult<PageResult<Gym>> }) => {
  const hasData = Array.isArray(query.data?.data);
  const gyms = hasData ? query.data!.data.slice(0, 5) : [];
  return (
    <section className="management-card admin-gym-overview" aria-labelledby="admin-gyms-heading" aria-busy={query.isFetching}>
      <div className="management-card-header">
        <div>
          <h2 className="management-card-title" id="admin-gyms-heading">Cơ sở trong hệ thống</h2>
          <p className="admin-panel-description">Thông tin và tình trạng hoạt động của các cơ sở.</p>
        </div>
        <Link to="/admin/gyms" className="management-metric-action">Xem tất cả cơ sở</Link>
      </div>
      {query.isPending && <div className="gym-skeleton admin-gym-skeleton" aria-hidden="true"><span /><span /></div>}
      {!query.isPending && !query.isError && !hasData && (
        <div className="management-empty-state">Chưa có dữ liệu danh sách cơ sở.</div>
      )}
      {!query.isPending && !query.isError && hasData && !gyms.length && (
        <div className="management-empty-state">
          <p>Chưa có cơ sở nào trong hệ thống.</p>
          <Link to="/admin/gyms/create" className="btn-primary">Tạo cơ sở đầu tiên</Link>
        </div>
      )}
      {!query.isPending && gyms.length > 0 && <>
        <div className="admin-gym-columns" aria-hidden="true"><span>Cơ sở</span><span>Trạng thái</span><span /></div>
        <ul className="management-item-list" aria-label="Danh sách cơ sở tổng quan">
          {gyms.map(gym => <li key={gym.gym_id} className="management-item-row">
            <div className="management-item-info">
              <div className="management-item-primary">{gym.gym_name}</div>
              <div className="management-item-secondary">{gym.address}</div>
            </div>
            <StatusBadge status={gym.status} />
            <Link to={`/admin/gyms/${gym.gym_id}`} className="admin-gym-detail" aria-label={`Xem chi tiết ${gym.gym_name}`}>Chi tiết <span aria-hidden="true">→</span></Link>
          </li>)}
        </ul>
        <p className="admin-gym-list-note">Hiển thị tối đa 5 cơ sở. Mở danh sách đầy đủ để tìm kiếm và lọc.</p>
      </>}
      <DashboardQueryFeedback query={query} retry={() => void query.refetch()} />
    </section>
  );
};
