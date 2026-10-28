import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ptService } from '../../services/pt.service';
import { ApiClientError } from '../../services/api-client';
import { MutationError } from '../../components/gym/GymUi';
import type { Registration } from '../../types/pt.types';

export const AdminRegistrationEnd = ({ row, blocked, ready, close, denied, onBusy }: {
  row: Registration; blocked: boolean; ready: boolean; close: () => void; denied: (error: ApiClientError) => void; onBusy: (value: boolean) => void;
}) => {
  const cache = useQueryClient();
  const [note, setNote] = useState(''), [needsRead, setNeedsRead] = useState(false);
  const [receipt, setReceipt] = useState(false), [reading, setReading] = useState(false);
  const [current, setCurrent] = useState<Registration | null>(null), [checked, setChecked] = useState(false);
  const [readError, setReadError] = useState<Error | null>(null);
  const sending = useRef(false), reason = useRef<HTMLTextAreaElement>(null);
  const form = useRef<HTMLFormElement>(null), readController = useRef<AbortController | null>(null);
  useEffect(() => () => { readController.current?.abort(); }, []);
  useEffect(() => { reason.current?.focus(); }, []);
  const recover = async () => {
    if (readController.current || sending.current || blocked) return;
    const controller = new AbortController(); readController.current = controller; onBusy(true);
    setReading(true); setChecked(false); setReadError(null);
    try {
      // No single-registration GET exists. Search all pages by immutable ID;
      // absence on the displayed page is never treated as a successful cancel.
      const found = await ptService.currentRegistration(row.gym.gym_id, row.registration_id, controller.signal);
      if (controller.signal.aborted) return;
      setCurrent(found || null); setChecked(true);
      await cache.invalidateQueries({ queryKey: ['pt'] });
    } catch (error) {
      if (controller.signal.aborted) return;
      setReadError(error instanceof Error ? error : new Error('Không thể đọc lại đăng ký.'));
      if (error instanceof ApiClientError && [401, 403].includes(error.statusCode)) denied(error);
    } finally {
      readController.current = null;
      if (!controller.signal.aborted) { setReading(false); onBusy(false); }
    }
  };
  const mutation = useMutation({ mutationFn: () => ptService.cancelRegistration(row, note.trim()), retry: false,
    onSuccess: async result => {
      setReceipt(true); setCurrent(result); setNeedsRead(true);
      await cache.invalidateQueries({ queryKey: ['pt'] });
    },
    onError: error => {
      setNeedsRead(!(error instanceof ApiClientError && error.statusCode === 400));
      if (error instanceof ApiClientError && [401, 403].includes(error.statusCode)) denied(error);
    }, onSettled: () => { sending.current = false; onBusy(false); },
  });
  const busy = mutation.isPending || reading;
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || busy || needsRead || !form.current?.contains(document.activeElement)) return;
      event.preventDefault(); close();
    };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [busy, needsRead, close]);
  const canRetry = checked && current?.status === 'ACTIVE' && !receipt;
  return <section className="gym-panel admin-pt-confirm" aria-label="Kết thúc đăng ký PT">
    <h2>Kết thúc đăng ký PT</h2><p>{row.customer.full_name?.trim() || 'Hội viên'} · {row.trainer.full_name?.trim() || 'PT'}</p><p>Đăng ký: {row.registration_id}</p>
    <p>Cần xử lý hết lịch đang mở. Sau khi kết thúc, tạo đăng ký mới ở luồng tiếp nhận phù hợp để đổi PT; lịch sử cũ được giữ nguyên.</p>
    <form ref={form} onSubmit={event => {
      event.preventDefault();
      if (blocked || !ready || busy || sending.current || needsRead || !note.trim()) return;
      sending.current = true; onBusy(true); mutation.mutate();
    }}>
      <div className="form-group"><label htmlFor="admin-registration-end-reason">Lý do</label><textarea id="admin-registration-end-reason" ref={reason} className="form-input" required maxLength={2000} value={note} disabled={busy || blocked || receipt} onChange={event => setNote(event.target.value)} /></div>
      <MutationError error={mutation.error} /><MutationError error={readError} />
      {receipt && <p role="status">Máy chủ đã xác nhận kết thúc đăng ký. Đọc lại danh sách trước khi đóng.</p>}
      {needsRead && <div className="admin-pt-recovery"><p>Đọc lại trạng thái trước thao tác tiếp theo. Lý do đã nhập vẫn được giữ.</p>
        <button type="button" className="btn-secondary" disabled={busy || blocked} onClick={() => void recover()}>{reading ? 'Đang đọc lại…' : 'Đọc lại kết quả'}</button>
        {checked && <><p role="status">{current ? `Trạng thái hiện tại: ${current.status}.` : 'Không tìm thấy đăng ký; chưa thể xác định kết quả. Kiểm tra lại phạm vi và danh sách.'}</p>
          {canRetry && <button type="button" className="btn-secondary" disabled={busy || blocked} onClick={() => { setNeedsRead(false); setChecked(false); mutation.reset(); reason.current?.focus(); }}>Dùng trạng thái vừa đọc</button>}
        </>}
      </div>}
      <div className="gym-actions"><button className="btn-primary" disabled={busy || blocked || !ready || needsRead || !note.trim()}>{mutation.isPending ? 'Đang gửi…' : 'Xác nhận kết thúc'}</button>
        <button type="button" className="btn-secondary" disabled={busy || (needsRead && !checked)} onClick={close}>Đóng</button></div>
    </form>
  </section>;
};
