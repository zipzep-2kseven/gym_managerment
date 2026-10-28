import { useEffect, useId, useRef, useState } from 'react';
import type { ModeratedReview } from '../../services/review-moderation.service';
import { MutationError } from '../../components/gym/GymUi';
export const HideReviewForm = ({ row, blocked, pending, error, revision, send, reason, setReason, close, busy }: {
  row: ModeratedReview; blocked: boolean; pending: boolean; error: Error | null; revision: number;
  send: (row: ModeratedReview, reason: string) => void; reason: string; setReason: (value: string) => void; close: () => void; busy: boolean;
}) => {
  const [confirm, setConfirm] = useState(false);
  const reasonId = useId(), input = useRef<HTMLTextAreaElement>(null), confirmation = useRef<HTMLParagraphElement>(null);
  useEffect(() => { const frame = requestAnimationFrame(() => input.current?.focus()); return () => cancelAnimationFrame(frame); }, []);
  useEffect(() => { if (confirm) confirmation.current?.focus(); }, [confirm]);
  useEffect(() => { setConfirm(false); }, [revision]);
  return <div className="admin-review-action"><form onSubmit={event => {
    event.preventDefault(); if (blocked || !reason.trim()) return; if (!confirm) setConfirm(true); else send(row, reason);
  }}>
    <p>Chỉ ẩn nội dung vi phạm. Đánh giá ít sao hoặc góp ý về dịch vụ vẫn được giữ.</p>
    <fieldset className="gym-fieldset" disabled={blocked}><legend className="sr-only">Ẩn đánh giá vi phạm</legend>
      <div className="form-group"><label htmlFor={reasonId}>Lý do ẩn</label><textarea id={reasonId} ref={input} className="form-textarea" required maxLength={1000} value={reason} onChange={event => { setReason(event.target.value); setConfirm(false); }} /></div>
      {confirm && <p ref={confirmation} tabIndex={-1}>Ẩn đánh giá khỏi trang công khai và điểm trung bình? Nội dung gốc được giữ; thao tác này không có chức năng khôi phục.</p>}
      <button className="btn-primary" disabled={blocked || !reason.trim()}>{pending ? 'Đang ẩn…' : confirm ? 'Xác nhận ẩn' : 'Tiếp tục'}</button>
    </fieldset>
    <button type="button" className="btn-secondary" disabled={busy} onClick={close}>Hủy thao tác</button>
  </form><MutationError error={error} /></div>;
};
