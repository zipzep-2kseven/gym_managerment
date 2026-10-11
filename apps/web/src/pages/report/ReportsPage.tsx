import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { reportService, type IncidentReport } from '../../services/report.service';
import { ReportCreateForm } from './ReportCreateForm';
import { useManagerGymId } from '../gym/ManagerGymPage';
import { PackageQueryState } from '../../components/package/PackageQueryState';
import { MutationError, Pager } from '../../components/gym/GymUi';
import { ApiClientError } from '../../services/api-client';
const labels: Record<string, string> = { PENDING: 'Chờ xử lý', IN_PROGRESS: 'Đang xử lý', RESOLVED: 'Đã giải quyết', REJECTED: 'Từ chối' };
const ReportPhoto = ({ id }: { id: string }) => {
  const [failed, setFailed] = useState(false);
  return failed ? <p role="status">Không tải được ảnh. Hãy làm mới trang hoặc kiểm tra phiên đăng nhập.</p> : <img crossOrigin="use-credentials" className="report-photo" src={reportService.image(id)} alt="Ảnh do người gửi cung cấp" loading="lazy" onError={() => setFailed(true)} />;
};
const ReportAction = ({ row, done }: { row: IncidentReport; done: () => Promise<void> }) => {
  const [action, setAction] = useState<'resolve' | 'reject' | null>(null), [note, setNote] = useState('');
  const { refreshSession } = useAuth();
  const mutation = useMutation({ mutationFn: (kind: 'investigate' | 'resolve' | 'reject') => reportService.change(row, kind, kind === 'investigate' ? undefined : note.trim()), retry: false,
    onSuccess: async () => { await done(); setAction(null); setNote(''); }, onError: async error => { if (error instanceof ApiClientError && [401, 403].includes(error.statusCode)) await refreshSession(); } });
  if (!['PENDING', 'IN_PROGRESS'].includes(row.status)) return null;
  return <><MutationError error={mutation.error} />{!action ? <div className="gym-actions">
    {row.status === 'PENDING' ? <button className="btn-primary" disabled={mutation.isPending} onClick={() => mutation.mutate('investigate')}>Tiếp nhận</button> : <button className="btn-primary" onClick={() => setAction('resolve')}>Giải quyết</button>}
    <button className="btn-secondary" disabled={mutation.isPending} onClick={() => { mutation.reset(); setAction('reject'); }}>Từ chối</button>
  </div> : <form onSubmit={e => { e.preventDefault(); if (note.trim() && !mutation.isPending) mutation.mutate(action); }}>
    <label className="form-group">{action === 'resolve' ? 'Kết quả xử lý' : 'Lý do từ chối'}<textarea className="form-textarea" required maxLength={2000} value={note} disabled={mutation.isPending} onChange={e => setNote(e.target.value)} /></label>
    <div className="gym-actions"><button className="btn-primary" disabled={mutation.isPending || !note.trim()}>Lưu kết quả</button><button className="btn-secondary" type="button" disabled={mutation.isPending} onClick={() => { mutation.reset(); setAction(null); }}>Đóng</button></div>
  </form>}</>;
};
export const ReportsPage = ({ mode = 'customer' }: { mode?: 'customer' | 'manager' | 'admin' }) => {
  const { user } = useAuth(), cache = useQueryClient(), managerGym = useManagerGymId(), { gymId } = useParams();
  const scope = mode === 'manager' ? managerGym : mode === 'admin' ? gymId : undefined;
  const [page, setPage] = useState(1), [status, setStatus] = useState('');
  const result = useQuery({ queryKey: ['reports', user?.user_id, mode, scope, page, status], queryFn: ({ signal }) => reportService.list(page, status, scope, signal), enabled: mode === 'customer' || !!scope });
  return <><h1>{mode === 'customer' ? 'Báo cáo sự cố của tôi' : 'Báo cáo sự cố tại Gym'}</h1>{mode === 'customer' && <ReportCreateForm />}
    <div className="gym-toolbar"><label className="form-group">Trạng thái báo cáo<select className="form-input" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}><option value="">Tất cả</option>{Object.entries(labels).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></label><button className="btn-secondary" onClick={() => void result.refetch()}>Làm mới báo cáo</button></div>
    <PackageQueryState pending={result.isPending} error={result.error} retry={result.refetch} />
    {result.data && !result.isError && <>{result.data.data.map(row => <article className="gym-panel" key={row.report_id}><h2>{row.gym_name} · {labels[row.status]}</h2>
      <p>{new Date(row.created_at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</p><p className="gym-preserve">{row.content}</p>
      {row.has_image && <ReportPhoto id={row.report_id} />}{row.resolution_note && <p className="gym-preserve"><strong>{row.status === 'REJECTED' ? 'Lý do từ chối: ' : 'Kết quả xử lý: '}</strong>{row.resolution_note}</p>}
      {mode !== 'customer' && <ReportAction row={row} done={() => cache.invalidateQueries({ queryKey: ['reports'] })} />}
    </article>)}{!result.data.data.length && <p>Chưa có báo cáo phù hợp.</p>}<Pager pagination={result.data.pagination} onPage={setPage} /></>}
  </>;
};
