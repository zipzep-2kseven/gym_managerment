import { Link } from 'react-router-dom';
import { useAdminDashboard } from '../../hooks/useAdminDashboard';
import { PageHeader } from '../../components/management/PageHeader';
import { DashboardQueryFeedback } from '../../components/management/DashboardQueryFeedback';
import { AdminRevenueChart, formatRevenue } from '../../components/management/AdminRevenueChart';
import { ApiClientError } from '../../services/api-client';

export const AdminDashboardPage = () => {
  const { summaryQuery: query } = useAdminDashboard();
  const data = query.data;
  const error = query.error;
  if (error instanceof ApiClientError && [401, 403].includes(error.statusCode)) {
    const expired = error.statusCode === 401;
    return <div className="management-error-card" role="alert">
      <h1>{expired ? 'Phiên đăng nhập đã hết hạn' : 'Không có quyền truy cập tổng quan'}</h1>
      <p>{expired ? 'Đăng nhập lại để xem dữ liệu quản trị.' : 'Quyền truy cập dữ liệu quản trị đã thay đổi.'}</p>
      <Link className="btn-primary" to={expired ? '/login' : '/'}>{expired ? 'Đăng nhập lại' : 'Về trang chủ'}</Link>
    </div>;
  }
  const count = (value: number | undefined) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
    ? value.toLocaleString('vi-VN') : '—';
  return <div className="admin-dashboard">
    <PageHeader title="Tổng quan hệ thống" subtitle="Theo dõi phòng Gym, tài khoản và doanh thu toàn hệ thống."
      action={<button type="button" className="btn-secondary" disabled={query.isFetching}
        onClick={() => void query.refetch({ cancelRefetch: false })}>{query.isFetching ? 'Đang tải tổng quan…' : 'Làm mới tổng quan'}</button>} />
    <div className="admin-dashboard-context">
      <span>{data ? `Dữ liệu đến ${new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(data.as_of))}` : 'Toàn hệ thống'}</span>
    </div>
    <DashboardQueryFeedback showTimestamp={false} query={query} retry={() => void query.refetch()} />
    <section className="management-metrics-grid" aria-label="Chỉ số hệ thống" aria-busy={query.isFetching}>
      <article className="management-metric-card admin-metric-linked" aria-label="Tổng phòng Gym">
        <h2 className="management-metric-title"><Link to="/admin/gyms">Tổng phòng Gym</Link></h2>
        <div className="management-metric-value">{query.isPending ? '…' : count(data?.total_gyms)}</div>
        <p className="admin-metric-description">{data ? `${count(data.active_gyms)} phòng đang hoạt động` : 'Bao gồm mọi trạng thái hoạt động.'}</p>
      </article>
      <article className="management-metric-card admin-metric-linked" aria-label="Tổng tài khoản">
        <h2 className="management-metric-title"><Link to="/admin/users">Tổng tài khoản</Link></h2>
        <div className="management-metric-value">{query.isPending ? '…' : count(data?.total_accounts)}</div>
        <p className="admin-metric-description">Tài khoản đã đăng ký, gồm tất cả vai trò.</p>
      </article>
      <article className="management-metric-card admin-revenue-metric" aria-label="Doanh thu tháng này">
        <h2 className="management-metric-title">Doanh thu tháng này{data ? ` · ${data.month.slice(5)}/${data.month.slice(0, 4)}` : ''}</h2>
        <div className="management-metric-value">{query.isPending ? '…' : data ? formatRevenue(data.month_revenue) : '—'}</div>
        <p className="admin-metric-description">Thanh toán thành công, loại khoản đã hoàn tiền.</p>
      </article>
    </section>
    {data ? <AdminRevenueChart days={data.daily_revenue} /> : <section className="admin-revenue-panel" aria-busy={query.isPending}>
      <h2>Doanh thu 7 ngày gần nhất</h2><p>{query.isPending ? 'Đang tải biểu đồ…' : 'Chưa tải được dữ liệu biểu đồ.'}</p>
    </section>}
  </div>;
};
