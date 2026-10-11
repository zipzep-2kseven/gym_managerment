import React from 'react';
import { Link } from 'react-router-dom';
import { useCustomerDashboard } from '../../hooks/useCustomerDashboard';
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

const formatCurrency = (val: string | number) => {
  const n = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(n)) return val;
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
};

export const CustomerDashboardPage: React.FC = () => {
  const { membershipsQuery, appointmentsQuery, paymentsQuery } = useCustomerDashboard();

  const totalMemberships = membershipsQuery.data?.pagination?.totalItems ?? null;
  const totalAppointments = appointmentsQuery.data?.pagination?.totalItems ?? null;
  const totalPayments = paymentsQuery.data?.pagination?.totalItems ?? null;

  const recentMemberships = membershipsQuery.data?.data?.slice(0, 3) || [];
  const recentAppointments = appointmentsQuery.data?.data?.slice(0, 3) || [];

  return (
    <div>
      <PageHeader
        title="Tổng quan hội viên"
        subtitle={
          <>
            <span>{formatCurrentDate()}</span>
            <span>·</span>
            <span className="management-status-pill">Hội viên MultiGym</span>
          </>
        }
        action={
          <Link to="/gyms" className="btn-primary">
            Khám phá phòng Gym
          </Link>
        }
      />

      {/* Summary Metrics */}
      <section className="management-metrics-grid" aria-label="Chỉ số hoạt động cá nhân">
        <SummaryMetric
          title="Thẻ hội viên sở hữu"
          value={totalMemberships}
          actionText="Xem thẻ hội viên"
          to="/memberships"
          isLoading={membershipsQuery.isLoading}
          isError={membershipsQuery.isError}
          onRetry={() => void membershipsQuery.refetch()}
        />

        <SummaryMetric
          title="Lịch tập sắp tới"
          value={totalAppointments}
          actionText="Lịch tập & HLV"
          to="/my-pt"
          isLoading={appointmentsQuery.isLoading}
          isError={appointmentsQuery.isError}
          onRetry={() => void appointmentsQuery.refetch()}
        />

        <SummaryMetric
          title="Giao dịch thanh toán"
          value={totalPayments}
          actionText="Lịch sử giao dịch"
          to="/payments"
          isLoading={paymentsQuery.isLoading}
          isError={paymentsQuery.isError}
          onRetry={() => void paymentsQuery.refetch()}
        />
      </section>

      {/* Main Content Grid */}
      <div className="management-dashboard-grid">
        {/* Left Column: Memberships & Appointments */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Active Memberships Card */}
          <div className="management-card">
            <div className="management-card-header">
              <h2 className="management-card-title">Thẻ hội viên của bạn</h2>
              <Link to="/memberships" className="management-metric-action">
                <span>Xem tất cả thẻ</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            </div>

            {membershipsQuery.isLoading && (
              <div className="gym-skeleton" style={{ padding: '16px 0' }}>
                <span style={{ height: '56px' }} />
              </div>
            )}

            {membershipsQuery.isError && (
              <div className="management-error-card" role="alert">
                <span>Không thể tải danh sách thẻ hội viên.</span>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => void membershipsQuery.refetch()}
                >
                  Thử lại
                </button>
              </div>
            )}

            {!membershipsQuery.isLoading && !membershipsQuery.isError && recentMemberships.length === 0 && (
              <div className="management-empty-state">
                <p>Bạn chưa có thẻ hội viên nào.</p>
                <Link to="/gyms" className="btn-primary" style={{ display: 'inline-block', marginTop: '8px' }}>
                  Tìm gói tập ngay
                </Link>
              </div>
            )}

            {!membershipsQuery.isLoading && !membershipsQuery.isError && recentMemberships.length > 0 && (
              <div className="management-item-list">
                {recentMemberships.map(mem => (
                  <div key={mem.membership_id} className="management-item-row">
                    <div className="management-item-info">
                      <div className="management-item-primary">
                        Thời hạn: {mem.start_date} đến {mem.end_date}
                      </div>
                      <div className="management-item-secondary">
                        Giá mua: {formatCurrency(mem.purchase_price)}
                      </div>
                    </div>
                    <div>
                      <span className="badge badge-role">
                        {mem.status === 'ACTIVE' ? 'Đang hoạt động' : mem.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Appointments Card */}
          <div className="management-card">
            <div className="management-card-header">
              <h2 className="management-card-title">Lịch tập sắp tới</h2>
              <Link to="/my-pt" className="management-metric-action">
                <span>Xem lịch chi tiết</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            </div>

            {appointmentsQuery.isLoading && (
              <div className="gym-skeleton" style={{ padding: '16px 0' }}>
                <span style={{ height: '56px' }} />
              </div>
            )}

            {appointmentsQuery.isError && (
              <div className="management-error-card" role="alert">
                <span>Không thể tải lịch tập.</span>
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
                <p>Bạn chưa có lịch tập nào sắp tới.</p>
                <Link to="/my-pt" className="btn-secondary" style={{ display: 'inline-block', marginTop: '8px' }}>
                  Đặt lịch với PT
                </Link>
              </div>
            )}

            {!appointmentsQuery.isLoading && !appointmentsQuery.isError && recentAppointments.length > 0 && (
              <div className="management-item-list">
                {recentAppointments.map(apt => (
                  <div key={apt.appointment_id} className="management-item-row">
                    <div className="management-item-info">
                      <div className="management-item-primary">
                        HLV: {apt.registration.trainer.full_name || 'Huấn luyện viên'}
                      </div>
                      <div className="management-item-secondary">
                        {apt.registration.gym.gym_name} · {formatAppointmentTime(apt.start_time)} – {formatAppointmentTime(apt.end_time)}
                      </div>
                    </div>
                    <div>
                      <span className="badge badge-role">
                        {apt.status === 'CONFIRMED' ? 'Đã xác nhận' : apt.status === 'PENDING' ? 'Chờ xác nhận' : apt.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Quick Shortcuts */}
        <div className="management-card">
          <div className="management-card-header">
            <h2 className="management-card-title">Lối tắt tác vụ</h2>
          </div>

          <div className="management-quick-links">
            <Link to="/my-pt" className="management-quick-link">
              <span>Lịch tập & Đặt hẹn PT</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
            <Link to="/memberships" className="management-quick-link">
              <span>Thẻ hội viên của tôi</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
            <Link to="/gyms" className="management-quick-link">
              <span>Khám phá cơ sở & mua gói tập</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
            <Link to="/payments" className="management-quick-link">
              <span>Lịch sử thanh toán & hóa đơn</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
            <Link to="/reports" className="management-quick-link">
              <span>Gửi báo cáo sự cố cơ sở</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
            <Link to="/profile" className="management-quick-link">
              <span>Cập nhật thông tin cá nhân</span>
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
