import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useManagerDashboard } from '../../hooks/useManagerDashboard';
import { PageHeader } from '../../components/management/PageHeader';
import { SummaryMetric } from '../../components/management/SummaryMetric';
import { appointmentStates } from '../pt/calendar-time';

const formatDateTime = (isoString: string) => {
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(isoString));
  } catch {
    return isoString;
  }
};

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

export const ManagerDashboardPage: React.FC = () => {
  const { user } = useAuth();

  const managerAssignment = useMemo(() => {
    return user?.active_gym_assignments?.find(item => item.assignment_type === 'MANAGER');
  }, [user]);

  const gymId = managerAssignment?.gym_id;
  const gymName = managerAssignment?.gym_name || 'Cơ sở';

  const {
    consultationsQuery,
    reportsQuery,
    appointmentsQuery,
    packagesQuery,
    trainersQuery,
  } = useManagerDashboard(gymId);

  const pendingConsultationsCount = consultationsQuery.data?.pagination?.totalItems ?? null;
  const pendingReportsCount = reportsQuery.data?.pagination?.totalItems ?? null;
  const activePackagesCount = packagesQuery.data?.pagination?.totalItems ?? null;
  const activeTrainersCount = trainersQuery.data?.pagination?.totalItems ?? null;

  const recentAppointments = appointmentsQuery.data?.data?.slice(0, 5) || [];
  const recentConsultations = consultationsQuery.data?.data?.slice(0, 3) || [];
  const recentReports = reportsQuery.data?.data?.slice(0, 3) || [];

  return (
    <div>
      <PageHeader
        title={`Tổng quan ${gymName}`}
        subtitle={
          <>
            <span>{formatCurrentDate()}</span>
            <span>·</span>
            <span className="management-status-pill">Đang hoạt động</span>
          </>
        }
        action={
          <Link to="/manager/pt" className="btn-primary">
            Mở lịch tập
          </Link>
        }
      />

      {/* 4 Summary Metrics */}
      <section className="management-metrics-grid" aria-label="Chỉ số tổng quan">
        <SummaryMetric
          title="Tư vấn chờ liên hệ"
          value={pendingConsultationsCount}
          actionText="Xem danh sách tư vấn"
          to="/manager/consultations?status=PENDING"
          isLoading={consultationsQuery.isLoading}
          isError={consultationsQuery.isError}
          onRetry={() => void consultationsQuery.refetch()}
        />

        <SummaryMetric
          title="Sự cố chờ xử lý"
          value={pendingReportsCount}
          actionText="Xử lý báo cáo"
          to="/manager/reports?status=PENDING"
          isLoading={reportsQuery.isLoading}
          isError={reportsQuery.isError}
          onRetry={() => void reportsQuery.refetch()}
        />

        <SummaryMetric
          title="Gói tập đang bán"
          value={activePackagesCount}
          actionText="Quản lý gói tập"
          to="/manager/packages"
          isLoading={packagesQuery.isLoading}
          isError={packagesQuery.isError}
          onRetry={() => void packagesQuery.refetch()}
        />

        <SummaryMetric
          title="Huấn luyện viên hoạt động"
          value={activeTrainersCount}
          actionText="Quản lý PT"
          to="/manager/trainers"
          isLoading={trainersQuery.isLoading}
          isError={trainersQuery.isError}
          onRetry={() => void trainersQuery.refetch()}
        />
      </section>

      {/* Dashboard Main Content Grid */}
      <div className="management-dashboard-grid">
        {/* Left Column: Lịch hẹn vận hành */}
        <div className="management-card">
          <div className="management-card-header">
            <h2 className="management-card-title">Lịch hẹn vận hành gần nhất</h2>
            <Link to="/manager/pt" className="management-metric-action">
              <span>Xem toàn bộ lịch</span>
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
              <span>Không thể tải danh sách lịch hẹn gần nhất.</span>
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
              <p>Chưa có buổi hẹn nào được lên lịch tại cơ sở.</p>
              <Link to="/manager/pt" className="btn-secondary" style={{ display: 'inline-block', marginTop: '8px' }}>
                Đi tới lịch tập
              </Link>
            </div>
          )}

          {!appointmentsQuery.isLoading && !appointmentsQuery.isError && recentAppointments.length > 0 && (
            <div className="management-item-list">
              {recentAppointments.map(appt => {
                const statusLabel = appointmentStates?.[appt.status] || appt.status;
                const badgeClass =
                  appt.status === 'PENDING'
                    ? 'management-badge-pending'
                    : appt.status === 'CONFIRMED'
                    ? 'management-badge-confirmed'
                    : 'management-badge-info';

                return (
                  <div key={appt.appointment_id} className="management-item-row">
                    <div className="management-item-info">
                      <div className="management-item-primary">
                        Học viên: {appt.registration?.customer?.full_name || 'Hội viên'} · PT:{' '}
                        {appt.registration?.trainer?.full_name || 'Chưa rõ'}
                      </div>
                      <div className="management-item-secondary">
                        {formatDateTime(appt.start_time)} – {formatDateTime(appt.end_time)}
                      </div>
                    </div>
                    <span className={`management-item-badge ${badgeClass}`}>
                      {statusLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Việc cần xử lý ngay & Lối tắt */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Việc cần xử lý ngay */}
          <div className="management-card">
            <div className="management-card-header">
              <h2 className="management-card-title">Việc cần xử lý ngay</h2>
            </div>

            <div className="management-item-list">
              {recentConsultations.length === 0 && recentReports.length === 0 ? (
                <div className="management-empty-state" style={{ padding: '16px' }}>
                  Hiện không có yêu cầu tư vấn hoặc sự cố tồn đọng.
                </div>
              ) : (
                <>
                  {recentConsultations.map(consult => (
                    <div key={consult.consultation_request_id} className="management-item-row">
                      <div className="management-item-info">
                        <div className="management-item-primary">
                          Tư vấn: {consult.full_name} ({consult.phone})
                        </div>
                        <div className="management-item-secondary">
                          {consult.content || 'Yêu cầu tư vấn mới'}
                        </div>
                      </div>
                      <Link
                        to="/manager/consultations"
                        className="btn-secondary"
                        style={{ fontSize: '12px', padding: '4px 10px', minHeight: 'auto' }}
                      >
                        Liên hệ
                      </Link>
                    </div>
                  ))}

                  {recentReports.map(report => (
                    <div key={report.report_id} className="management-item-row">
                      <div className="management-item-info">
                        <div className="management-item-primary">
                          Sự cố: {report.content}
                        </div>
                        <div className="management-item-secondary">
                          Gửi ngày {formatDateTime(report.created_at)}
                        </div>
                      </div>
                      <Link
                        to="/manager/reports"
                        className="btn-secondary"
                        style={{ fontSize: '12px', padding: '4px 10px', minHeight: 'auto' }}
                      >
                        Tiếp nhận
                      </Link>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Lối tắt tác vụ */}
          <div className="management-card">
            <div className="management-card-header">
              <h2 className="management-card-title">Lối tắt tác vụ</h2>
            </div>

            <div className="management-quick-links">
              <Link to="/manager/gym" className="management-quick-link">
                <span>Cập nhật thông tin phòng tập</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
              <Link to="/manager/gallery" className="management-quick-link">
                <span>Quản lý thư viện ảnh</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
              <Link to="/manager/trainers/assign" className="management-quick-link">
                <span>Tiếp nhận huấn luyện viên mới</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
              {gymId && (
                <Link to={`/gyms/${gymId}`} className="management-quick-link">
                  <span>Xem trang công khai của cơ sở</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
