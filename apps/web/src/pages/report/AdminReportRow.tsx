import { useEffect, useRef } from 'react';
import { useAdminReportAction } from '../../hooks/useAdminReportAction';
import type { IncidentReport } from '../../services/report.service';
import type { ApiClientError } from '../../services/api-client';
import { MutationError } from '../../components/gym/GymUi';
import { ReportPhoto } from './ReportPhoto';

export const reportStatusLabels: Record<string, string> = { PENDING: 'Chờ xử lý', IN_PROGRESS: 'Đang xử lý', RESOLVED: 'Đã giải quyết', REJECTED: 'Từ chối' };
export const AdminReportRow = ({ row, blocked, read, onBusy, onDenied, onSaved, imageVersion }: {
  row: IncidentReport; blocked: boolean; read: () => Promise<boolean>; onBusy: (busy: boolean) => void; onDenied: (error: ApiClientError) => void; onSaved: (row: IncidentReport) => void; imageVersion: number;
}) => {
  const state = useAdminReportAction({ row, read, onBusy, onDenied, onSaved });
  const { action, setAction } = state;
  const locked = blocked || state.mutation.isPending || state.needsRead || state.reading;
  const openReports = ['PENDING', 'IN_PROGRESS'].includes(row.status);
  const root = useRef<HTMLElement>(null), opener = useRef<'resolve' | 'reject' | null>(null);
  const receipt = useRef<HTMLParagraphElement>(null), note = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (action) note.current?.focus();
    else if (opener.current) { root.current?.querySelector<HTMLButtonElement>(`[data-report-action="${opener.current}"]`)?.focus(); opener.current = null; }
  }, [action]);
  useEffect(() => { if (state.receipt) receipt.current?.focus(); }, [state.receipt]);
  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && action && !locked && root.current?.contains(document.activeElement)) {
        event.preventDefault(); setAction(null);
      }
    };
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [locked, action, setAction]);
  const close = () => { setAction(null); };
  return <article ref={root} className="gym-panel admin-report-row" aria-label={`Báo cáo ${row.report_id}`}>
    <h2>{row.gym_name} · <span className={`admin-report-status is-${row.status.toLowerCase()}`}>{reportStatusLabels[row.status]}</span></h2>
    <p className="admin-report-id">ID báo cáo: {row.report_id}</p>
    <time dateTime={row.created_at}>{new Date(row.created_at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</time>
    <p className="gym-preserve">{row.content}</p>
    {row.has_image && <ReportPhoto key={`${row.report_id}:${imageVersion}`} id={row.report_id} />}
    {row.resolution_note && <p className="gym-preserve"><strong>{row.status === 'REJECTED' ? 'Lý do từ chối: ' : 'Kết quả xử lý: '}</strong>{row.resolution_note}</p>}
    {state.receipt && <p ref={receipt} tabIndex={-1} role="status">Đã lưu trạng thái: {reportStatusLabels[state.receipt]}.</p>}
    <MutationError error={state.mutation.error} />
    {state.needsRead && <div role="status"><p>Đọc lại báo cáo trước khi thao tác tiếp; yêu cầu trước có thể đã được lưu.</p><button type="button" className="btn-secondary" disabled={blocked || state.reading} onClick={() => void state.reconcile()}>Đọc lại báo cáo</button></div>}
    {openReports && (!state.action ? <div className="gym-actions">
      {row.status === 'PENDING' ? <button type="button" className="btn-primary" disabled={locked} onClick={() => state.send('investigate', blocked)}>Tiếp nhận</button> : <button type="button" data-report-action="resolve" className="btn-primary" disabled={locked} onClick={() => { opener.current = 'resolve'; state.mutation.reset(); setAction('resolve'); }}>Giải quyết</button>}
      <button type="button" data-report-action="reject" className="btn-secondary" disabled={locked} onClick={() => { opener.current = 'reject'; state.mutation.reset(); setAction('reject'); }}>Từ chối</button>
    </div> : <form onSubmit={event => { event.preventDefault(); state.send(state.action!, blocked); }}>
      <label className="form-group">{state.action === 'resolve' ? 'Kết quả xử lý' : 'Lý do từ chối'}<textarea ref={note} className="form-textarea" required maxLength={2000} value={state.note} disabled={locked} onChange={event => state.setNote(event.target.value)} /></label>
      <div className="gym-actions"><button className="btn-primary" disabled={locked || !state.note.trim()}>Lưu kết quả</button><button type="button" className="btn-secondary" disabled={locked} onClick={close}>Đóng</button></div>
    </form>)}
  </article>;
};
