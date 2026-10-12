import React from 'react';
import { Link } from 'react-router-dom';
import { useAdminDashboard } from '../../hooks/useAdminDashboard';
import { PageHeader } from '../../components/management/PageHeader';
import { SummaryMetric } from '../../components/management/SummaryMetric';
import { StatusBadge } from '../../components/gym/GymUi';

const formatCurrentDate = () => {
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date());
  } catch {
    return new Date().toLocaleDateString();
  }
};

export const AdminDashboardPage: React.FC = () => {
  const { gymsQuery, usersCountQuery, reviewsCountQuery } = useAdminDashboard();

  const totalGyms = gymsQuery.data?.pagination?.totalItems ?? null;
  const totalUsers = usersCountQuery.data?.total ?? null;
  const totalReviews = reviewsCountQuery.data?.total ?? null;

  const recentGyms = gymsQuery.data?.data?.slice(0, 5) || [];

  return (
    <div className="admin-dashboard">
      <p className="admin-eyebrow">KHÔNG GIAN QUẢN TRỊ</p>
      <PageHeader
        title="Tổng quan ban quản trị"
        subtitle={
          <>
            <span>{formatCurrentDate()}</span>
            <span>·</span>
            <span className="management-status-pill">Toàn hệ thống</span>
          </>
        }
        action={
          <Link to="/admin/gyms/create" className="btn-primary">
            Tạo cơ sở mới
          </Link>
        }
      />

      {/* Summary Metrics */}
      <section className="management-metrics-grid" aria-label="Chỉ số hệ thống">
        <SummaryMetric
          title="Tổng số cơ sở"
          value={totalGyms}
          actionText="Quản lý cơ sở"
          to="/admin/gyms"
          isLoading={gymsQuery.isLoading}
          isError={gymsQuery.isError}
          onRetry={() => void gymsQuery.refetch()}
        />

        <SummaryMetric
          title="Tài khoản toàn sàn"
          value={totalUsers}
          actionText="Quản lý tài khoản"
          to="/admin/users"
          isLoading={usersCountQuery.isLoading}
          isError={usersCountQuery.isError}
          onRetry={() => void usersCountQuery.refetch()}
        />

        <SummaryMetric
          title="Đánh giá Gym toàn sàn"
          value={totalReviews}
          actionText="Kiểm duyệt đánh giá"
          to="/admin/reviews"
          isLoading={reviewsCountQuery.isLoading}
          isError={reviewsCountQuery.isError}
          onRetry={() => void reviewsCountQuery.refetch()}
        />
      </section>

      {/* Main Content Grid */}
      <div className="management-dashboard-grid">
        {/* Left Column: Recent Gym Facilities */}
        <div className="management-card">
          <div className="management-card-header">
            <h2 className="management-card-title">Cơ sở trong hệ thống</h2>
            <Link to="/admin/gyms" className="management-metric-action">
              <span>Xem tất cả cơ sở</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
          </div>

          {gymsQuery.isLoading && (
            <div className="gym-skeleton" style={{ padding: '16px 0' }}>
              <span style={{ height: '56px' }} />
              <span style={{ height: '56px' }} />
            </div>
          )}

          {gymsQuery.isError && (
            <div className="management-error-card" role="alert">
              <span>Không thể tải danh sách cơ sở.</span>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => void gymsQuery.refetch()}
              >
                Thử lại
              </button>
            </div>
          )}

          {!gymsQuery.isLoading && !gymsQuery.isError && recentGyms.length === 0 && (
            <div className="management-empty-state">
              <p>Chưa có cơ sở nào trong hệ thống.</p>
              <Link to="/admin/gyms/create" className="btn-primary" style={{ display: 'inline-block', marginTop: '8px' }}>
                Tạo cơ sở đầu tiên
              </Link>
            </div>
          )}

          {!gymsQuery.isLoading && !gymsQuery.isError && recentGyms.length > 0 && (
            <div className="management-item-list">
              {recentGyms.map(gym => (
                <div key={gym.gym_id} className="management-item-row">
                  <div className="management-item-info">
                    <div className="management-item-primary">{gym.gym_name}</div>
                    <div className="management-item-secondary">{gym.address}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <StatusBadge status={gym.status} />
                    <Link
                      to={`/admin/gyms/${gym.gym_id}`}
                      className="btn-secondary"
                    >
                      Chi tiết
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Quick Admin Shortcuts */}
        <div className="management-card">
          <div className="management-card-header">
            <h2 className="management-card-title">Lối tắt tác vụ</h2>
          </div>

          <div className="management-quick-links">
            <Link to="/admin/gyms/create" className="management-quick-link">
              <span>Tạo phòng Gym mới</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
            <Link to="/admin/managers" className="management-quick-link">
              <span>Bổ nhiệm Quản lý phòng Gym</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
            <Link to="/admin/users" className="management-quick-link">
              <span>Quản lý tài khoản toàn sàn</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
            <Link to="/admin/reviews" className="management-quick-link">
              <span>Kiểm duyệt đánh giá</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
            <Link to="/admin/roles" className="management-quick-link">
              <span>Xem vai trò hệ thống</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
