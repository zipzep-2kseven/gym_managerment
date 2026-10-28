import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { usePtDashboard } from '../../hooks/usePtDashboard';
import { PageHeader } from '../../components/management/PageHeader';
import { SummaryMetric } from '../../components/management/SummaryMetric';

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

const formatAppointmentTime = (dateStr: string) => {
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
};

const stateNames: Record<string, string> = {
  ACTIVE: 'Đang phụ trách',
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  COMPLETED: 'Đã hoàn thành',
  CANCELLED: 'Đã hủy',
};

export const PTDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { appointmentsQuery, registrationsQuery, profileQuery } = usePtDashboard();

  const totalAppointments = appointmentsQuery.data?.pagination?.totalItems ?? null;
  const totalRegistrations = registrationsQuery.data?.pagination?.totalItems ?? null;

  const availabilityText = profileQuery.data?.availability === 'ACCEPTING'
    ? 'Đang nhận'
    : profileQuery.data?.availability === 'ALMOST_FULL'
    ? 'Gần kín'
    : profileQuery.data?.availability === 'NOT_ACCEPTING'
    ? 'Tạm ngưng'
    : 'Chưa đặt';

  const recentAppointments = appointmentsQuery.data?.data?.slice(0, 5) || [];
  const assignedGyms = user?.active_gym_assignments.filter(a => a.assignment_type === 'PT') || [];

  return (
    <div>
      <PageHeader
        title="Tổng quan Huấn luyện viên"
        subtitle={
          <>
            <span>{formatCurrentDate()}</span>
            <span>·</span>
            <span className="management-status-pill">
              {assignedGyms.length > 0 ? assignedGyms[0].gym_name : 'HLV Độc Lập'}
            </span>
          </>
        }
        action={
          <Link to="/pt/profile" className="btn-primary">
            Cập nhật hồ sơ
          </Link>
        }
      />

      {/* Summary Metrics */}
      <section className="management-metrics-grid" aria-label="Chỉ số huấn luyện">
        <SummaryMetric
          title="Lịch hẹn huấn luyện"
          value={totalAppointments}
          actionText="Xem lịch dạy"
          to="/my-pt"
          isLoading={appointmentsQuery.isLoading}
          isError={appointmentsQuery.isError}
          onRetry={() => void appointmentsQuery.refetch()}
        />

        <SummaryMetric
          title="Học viên phụ trách"
          value={totalRegistrations}
          actionText="Danh sách học viên"
          to="/my-pt"
          isLoading={registrationsQuery.isLoading}
          isError={registrationsQuery.isError}
          onRetry={() => void registrationsQuery.refetch()}
        />

        <SummaryMetric
          title="Trạng thái nhận học viên"
          value={availabilityText}
          actionText="Chỉnh sửa hồ sơ"
          to="/pt/profile"
          isLoading={profileQuery.isLoading}
          isError={profileQuery.isError}
          onRetry={() => void profileQuery.refetch()}
        />
      </section>

      {/* Main Content Grid */}
      <div className="management-dashboard-grid">
        {/* Left Column: Recent Appointments */}
        <div className="management-card">
          <div className="management-card-header">
            <h2 className="management-card-title">Lịch hẹn gần nhất</h2>
            <Link to="/my-pt" className="management-metric-action">
              <span>Xem tất cả lịch</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
          </div>

          {appointmentsQuery.isLoading && (
            <div className="gym-skeleton" style={{ padding: '16px 0' }}>
              <span style={{ height: '56px' }} />
              <span style={{ height: '56px' }} />
            </div>
          )}

          {appointmentsQuery.isError && (
            <div className="management-error-card" role="alert">
              <span>Không thể tải danh sách lịch hẹn.</span>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => void appointmentsQuery.refetch()}
              >
                Thử lại
              </button>
            </div>
          )}

          {!appointmentsQuery.isLoading && !appointmentsQuery.isError && recentAppointments.length === 0 && (
            <div className="management-empty-state">
              <p>Chưa có lịch hẹn nào sắp tới.</p>
              <Link to="/my-pt" className="btn-secondary" style={{ display: 'inline-block', marginTop: '8px' }}>
                Kiểm tra lịch tập
              </Link>
            </div>
          )}

          {!appointmentsQuery.isLoading && !appointmentsQuery.isError && recentAppointments.length > 0 && (
            <div className="management-item-list">
              {recentAppointments.map(apt => (
                <div key={apt.appointment_id} className="management-item-row">
                  <div className="management-item-info">
                    <div className="management-item-primary">
                      Học viên: {apt.registration.customer.full_name || 'Hội viên'}
                    </div>
                    <div className="management-item-secondary">
                      {apt.registration.gym.gym_name} · {formatAppointmentTime(apt.start_time)} – {formatAppointmentTime(apt.end_time)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="badge badge-role">
                      {stateNames[apt.status] || apt.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Profile Summary & Shortcuts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Profile Overview Card */}
          <div className="management-card">
            <div className="management-card-header">
              <h2 className="management-card-title">Hồ sơ Huấn luyện viên</h2>
              <Link to="/pt/profile" className="management-metric-action">
                <span>Chỉnh sửa</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            </div>

            {profileQuery.isLoading && (
              <div className="gym-skeleton" style={{ padding: '8px 0' }}>
                <span style={{ height: '36px' }} />
              </div>
            )}

            {!profileQuery.isLoading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
                <div>
                  <strong>Chuyên môn:</strong> {profileQuery.data?.specialization || 'Chưa cập nhật'}
                </div>
                <div>
                  <strong>Kinh nghiệm:</strong> {profileQuery.data?.experience_years ? `${profileQuery.data?.experience_years} năm` : 'Chưa cập nhật'}
                </div>
                <div>
                  <strong>Tiểu sử:</strong> {profileQuery.data?.bio || 'Chưa có thông tin giới thiệu.'}
                </div>
              </div>
            )}
          </div>

          {/* Quick Shortcuts */}
          <div className="management-card">
            <div className="management-card-header">
              <h2 className="management-card-title">Lối tắt tác vụ</h2>
            </div>

            <div className="management-quick-links">
              <Link to="/my-pt" className="management-quick-link">
                <span>Quản lý lịch dạy & học viên</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
              <Link to="/pt/profile" className="management-quick-link">
                <span>Cập nhật giờ làm việc & liên kết</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
              <Link to="/gyms" className="management-quick-link">
                <span>Khám phá các phòng Gym</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
