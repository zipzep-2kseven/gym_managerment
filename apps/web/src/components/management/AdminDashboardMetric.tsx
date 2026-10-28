import { Link } from 'react-router-dom';
import { DashboardQueryFeedback, type DashboardQuery } from './DashboardQueryFeedback';

interface AdminDashboardMetricProps {
  title: string;
  description: string;
  value: number | null;
  actionText: string;
  to: string;
  query: DashboardQuery;
  onRetry: () => void;
}

export const AdminDashboardMetric = ({ title, description, value, actionText, to, query, onRetry }: AdminDashboardMetricProps) => {
  const available = typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
  return (
    <article className="management-metric-card" aria-label={title} aria-busy={query.isFetching}>
      <h2 className="management-metric-title">{title}</h2>
      {query.isPending ? (
        <div className="gym-skeleton" aria-hidden="true"><span /></div>
      ) : available ? (
        <div className="management-metric-value">{value}</div>
      ) : !query.isError ? <p>Chưa có dữ liệu</p> : null}
      <p className="admin-metric-description">{description}</p>
      <DashboardQueryFeedback query={query} retry={onRetry} />
      <Link to={to} className="management-metric-action">{actionText}</Link>
    </article>
  );
};
