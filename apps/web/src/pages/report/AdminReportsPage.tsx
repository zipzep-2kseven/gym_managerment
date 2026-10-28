import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { useAdminGymContext } from '../../hooks/useAdminGymContext';
import { reportService, type IncidentReport } from '../../services/report.service';
import { ApiClientError } from '../../services/api-client';
import { QueryState, Pager, StatusBadge } from '../../components/gym/GymUi';
import { PageHeader } from '../../components/management/PageHeader';
import { DashboardQueryFeedback } from '../../components/management/DashboardQueryFeedback';
import { AdminReportRow, reportStatusLabels } from './AdminReportRow';

const AdminGymReports = ({ gymId }: { gymId: string }) => {
  const { refreshSession } = useAuth(), cache = useQueryClient();
  const { gym, validGym, enabled, actorId } = useAdminGymContext(gymId);
  const [page, setPage] = useState(1), [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false), [writeAccessError, setWriteAccessError] = useState<ApiClientError | null>(null);
  const [recovered, setRecovered] = useState<number | null>(null);
  const [receipt, setReceipt] = useState<IncidentReport | null>(null);
  const receiptTarget = useRef<HTMLParagraphElement>(null);
  const mounted = useRef(true), root = useRef<HTMLDivElement>(null);
  const prefix = ['reports', actorId, 'admin', gymId];
  const list = useQuery({ queryKey: [...prefix, page, status], queryFn: ({ signal }) => reportService.list(page, status, gymId, signal), enabled: enabled && !!gym.data && !gym.isError });
  const accessError = [writeAccessError, gym.error, list.error].find(error => error instanceof ApiClientError && [401, 403].includes(error.statusCode));
  useEffect(() => { if (accessError) void refreshSession(); }, [accessError, refreshSession]);
  useEffect(() => { if (receipt) receiptTarget.current?.focus(); }, [receipt]);
  useEffect(() => {
    mounted.current = true; const heading = root.current?.querySelector('h1'); if (heading) { heading.tabIndex = -1; heading.focus(); }
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => {
    const data = list.data;
    if (!busy && !list.isFetching && !list.isError && data && !data.data.length && page > Math.max(1, data.pagination.totalPages)) {
      const target = Math.max(1, data.pagination.totalPages); setRecovered(target); setPage(target);
    }
  }, [busy, list.data, list.isFetching, list.isError, page]);
  const read = async () => {
    await cache.invalidateQueries({ queryKey: prefix, refetchType: 'none' });
    if (!mounted.current) return false;
    const fresh = await list.refetch(); return !fresh.isError;
  };
  const retryAccess = async () => {
    const [context, reports] = await Promise.all([gym.refetch(), list.refetch()]);
    if (!context.isError && !reports.isError) setWriteAccessError(null);
  };
  if (!validGym) return <section role="alert"><h1>Cơ sở không hợp lệ</h1><Link to="/admin/reports">Chọn Gym khác</Link></section>;
  if (accessError) return <QueryState pending={false} error={accessError} retry={retryAccess} redirectOnUnauthorized={false} />;
  const blocked = busy || list.isFetching || list.isError || gym.isFetching || gym.isError;
  return <div ref={root} className="admin-reports">
    <nav className="gym-actions admin-membership-breadcrumb" aria-label="Đường dẫn"><Link to="/admin/reports">Chọn Gym</Link><span aria-hidden="true">/</span><Link to={`/admin/gyms/${gymId}`}>{gym.data?.gym_name || 'Cơ sở'}</Link><span aria-hidden="true">/</span><span aria-current="page">Báo cáo sự cố</span></nav>
    <PageHeader title="Báo cáo sự cố tại Gym" subtitle="Đọc và xử lý báo cáo trong phạm vi cơ sở đang chọn." action={<Link className="btn-secondary" to="/admin/reports">Chọn Gym khác</Link>} />
    <QueryState pending={gym.isPending} error={gym.error} retry={gym.refetch} redirectOnUnauthorized={false} />
    {gym.data && (!gym.isError || !(gym.error instanceof ApiClientError && [401, 403].includes(gym.error.statusCode))) && <>
      <section className="admin-scope" aria-label="Cơ sở đang chọn"><h2>{gym.data.gym_name}</h2><StatusBadge status={gym.data.status} /><p>{gym.data.address}</p>{gym.data.status === 'INACTIVE' && <p>Cơ sở đã ngừng hoạt động; báo cáo lịch sử vẫn được tra cứu và xử lý theo quyền hiện có.</p>}</section>
      <section aria-label="Danh sách báo cáo" aria-busy={list.isFetching || busy}>
        <div className="gym-toolbar"><label className="form-group">Trạng thái báo cáo<select className="form-input" value={status} disabled={busy} onChange={event => { setStatus(event.target.value); setPage(1); setRecovered(null); }}><option value="">Tất cả</option>{Object.entries(reportStatusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><button type="button" className="btn-secondary" disabled={busy || list.isFetching} onClick={() => { void gym.refetch(); void list.refetch(); }}>Làm mới báo cáo</button></div>
        <DashboardQueryFeedback query={list} retry={() => void list.refetch()} />
        {busy && <p role="status">Đang lưu kết quả xử lý…</p>}{receipt && <p ref={receiptTarget} tabIndex={-1} role="status">Đã lưu báo cáo {receipt.report_id}: {reportStatusLabels[receipt.status]}.</p>}{recovered !== null && <p role="status">Trang trước không còn dữ liệu; đã chuyển về trang {recovered}.</p>}
        {list.data && <><p role="status">{list.data.pagination.totalItems} báo cáo phù hợp</p>{list.data.data.map(row => <AdminReportRow key={`${status}:${page}:${row.report_id}`} row={row} blocked={blocked} read={read} onBusy={setBusy} onDenied={setWriteAccessError} onSaved={setReceipt} imageVersion={list.dataUpdatedAt} />)}
          {!list.data.data.length && <p>{list.data.pagination.totalItems === 0 ? 'Chưa có báo cáo phù hợp.' : 'Trang này không còn báo cáo. Đang đọc lại trang phù hợp.'}</p>}
          <fieldset className="gym-fieldset" disabled={busy || list.isFetching}><legend className="sr-only">Chọn trang báo cáo</legend><Pager pagination={list.data.pagination} onPage={next => { setRecovered(null); setPage(next); }} /></fieldset>
        </>}
      </section>
    </>}
  </div>;
};
export const AdminReportsPage = () => {
  const { user } = useAuth(), { gymId = '' } = useParams();
  return <AdminGymReports key={`${user?.user_id}:${gymId}`} gymId={gymId} />;
};
