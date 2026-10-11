import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { ApiClientError } from '../../services/api-client';
import { reviewModerationService, type ModeratedReview } from '../../services/review-moderation.service';
export const HideReviewForm = ({row, done}: {row: ModeratedReview; done: () => Promise<void>}) => {
  const [open, setOpen] = useState(false), [confirm, setConfirm] = useState(false), [reason, setReason] = useState('');
  const {refreshSession} = useAuth();
  const mutation = useMutation({mutationFn: () => reviewModerationService.hide(row, reason), retry: false, onSuccess: done, onError: async error => {if (error instanceof ApiClientError && [401, 403].includes(error.statusCode)) await refreshSession();}});
  if (!open) return <button className="btn-secondary" onClick={() => setOpen(true)}>Ẩn đánh giá</button>;
  return <form onSubmit={e => {e.preventDefault(); if (mutation.isPending) return; if (!confirm) setConfirm(true); else mutation.mutate();}}>
    <fieldset className="gym-fieldset" disabled={mutation.isPending}><legend>Ẩn đánh giá vi phạm</legend><label className="form-group">Lý do ẩn<textarea className="form-textarea" required maxLength={1000} value={reason} onChange={e => {setReason(e.target.value); setConfirm(false);}} /></label>
      {confirm && <p>Ẩn đánh giá khỏi trang công khai và điểm trung bình? Nội dung gốc được giữ; thao tác này không có chức năng khôi phục.</p>}
      <div className="gym-actions"><button className="btn-primary" disabled={mutation.isPending || !reason.trim()}>{mutation.isPending ? 'Đang ẩn…' : confirm ? 'Xác nhận ẩn' : 'Tiếp tục'}</button><button type="button" className="btn-secondary" disabled={mutation.isPending} onClick={() => {setOpen(false); setConfirm(false); mutation.reset();}}>Hủy thao tác</button></div>
    </fieldset>
    {mutation.error && <div role="alert" className="alert-banner alert-error"><p>{mutation.error.message}</p><p>Lý do đã nhập vẫn được giữ. Tải lại danh sách để kiểm tra kết quả nếu mất mạng hoặc đánh giá đã được xử lý.</p></div>}
  </form>;
};
