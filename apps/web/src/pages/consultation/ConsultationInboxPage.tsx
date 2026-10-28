import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { consultationLabels, consultationService, type Consultation, type ConsultationStatus } from '../../services/consultation.service';
import { useManagerGymId } from '../gym/ManagerGymPage';
import { useAuth } from '../../hooks/useAuth';
import { ApiClientError } from '../../services/api-client';
import { MutationError, Pager } from '../../components/gym/GymUi';
import { PackageQueryState } from '../../components/package/PackageQueryState';

const ConsultationActions = ({ row, done }: { row: Consultation; done: () => Promise<void> }) => {
  const [note, setNote] = useState(row.processing_note || ''), { refreshSession } = useAuth();
  const mutation = useMutation({ mutationFn: (status: ConsultationStatus) => consultationService.update(row, status, note), retry: false,
    onSuccess: done, onError: async error => { if (error instanceof ApiClientError && [401, 403].includes(error.statusCode)) await refreshSession(); } });
  if (['COMPLETED', 'CANCELLED'].includes(row.status)) return null;
  return <><label className="form-group">Ghi chú xử lý<textarea className="form-textarea" maxLength={2000} value={note} disabled={mutation.isPending} onChange={e => setNote(e.target.value)} placeholder="Kết quả trao đổi hoặc lý do hủy." /></label>
    <p>Hủy yêu cầu cần ghi lý do. Hoàn thành khi đã xử lý xong nhu cầu tư vấn.</p>
    <MutationError error={mutation.error} /><div className="gym-actions">
      <button className="btn-primary" disabled={mutation.isPending} onClick={() => mutation.mutate(row.status === 'PENDING' ? 'CONTACTED' : 'COMPLETED')}>{row.status === 'PENDING' ? 'Đánh dấu đã liên hệ' : 'Hoàn thành tư vấn'}</button>
      <button className="btn-secondary" disabled={mutation.isPending || note.trim() === (row.processing_note || '')} onClick={() => mutation.mutate(row.status)}>Lưu ghi chú</button>
      <button className="btn-secondary" disabled={mutation.isPending || !note.trim()} onClick={() => { if (window.confirm('Hủy yêu cầu tư vấn với lý do đã ghi?')) mutation.mutate('CANCELLED'); }}>Hủy yêu cầu</button>
    </div></>;
};
export const ConsultationInboxPage = () => {
  const gym = useManagerGymId(), { user } = useAuth(), cache = useQueryClient();
  const [page, setPage] = useState(1), [status, setStatus] = useState('');
  const result = useQuery({ queryKey: ['consultations', user?.user_id, gym, page, status],
    queryFn: ({ signal }) => consultationService.list(gym, page, status, signal), enabled: !!gym });
  return <><h1>Yêu cầu tư vấn</h1><p>Liên hệ khách và ghi nhận kết quả trao đổi tại Gym của bạn.</p>
    <div className="gym-toolbar"><label className="form-group">Trạng thái tư vấn<select className="form-input" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}><option value="">Tất cả</option>{Object.entries(consultationLabels).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label><button className="btn-secondary" onClick={() => void result.refetch()}>Làm mới danh sách</button></div>
    <PackageQueryState pending={result.isPending} error={result.error} retry={result.refetch} />
    {result.data && !result.isError && <>{result.data.data.map(row => <article className="gym-panel" key={row.consultation_request_id}>
      <h2>{row.full_name} · {consultationLabels[row.status]}</h2><p><a href={`tel:${row.phone.replace(/[^+0-9]/g, '')}`}>Gọi {row.phone}</a></p>
      <p>Gửi lúc {new Date(row.created_at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</p>
      {row.preferred_contact && <p className="gym-preserve">Tiện liên hệ: {row.preferred_contact}</p>}
      <p className="gym-preserve">{row.content || 'Khách chưa ghi nội dung tư vấn.'}</p>
      {row.processing_note && <p className="gym-preserve"><strong>Ghi chú xử lý: </strong>{row.processing_note}</p>}
      <ConsultationActions key={`${row.consultation_request_id}:${row.updated_at}`} row={row} done={() => cache.invalidateQueries({ queryKey: ['consultations'] })} />
    </article>)}{!result.data.data.length && <p>Chưa có yêu cầu tư vấn phù hợp.</p>}<Pager pagination={result.data.pagination} onPage={setPage} /></>}
  </>;
};
