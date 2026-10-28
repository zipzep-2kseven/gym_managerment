import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { reviewService } from '../../services/review.service';
import { ApiClientError } from '../../services/api-client';
import { useAuth } from '../../hooks/useAuth';
export const ReviewForm = ({ path, done }: { path: string; done: () => Promise<void> }) => {
  const [rating, setRating] = useState(''), [comment, setComment] = useState('');
  const { refreshSession } = useAuth();
  const mutation = useMutation({ mutationFn: () => reviewService.create(path, Number(rating), comment), retry: false, onSuccess: done,
    onError: async error => { if (error instanceof ApiClientError && [401, 403].includes(error.statusCode)) await refreshSession(); } });
  return <form onSubmit={e => { e.preventDefault(); if (!mutation.isPending) mutation.mutate(); }}>
    <fieldset className="gym-fieldset" disabled={mutation.isPending}><legend>Đánh giá của bạn</legend>
      <label className="form-group">Mức đánh giá<select className="form-input" value={rating} required onChange={e => setRating(e.target.value)}><option value="">Chọn số sao</option>{[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} sao</option>)}</select></label>
      <label className="form-group">Nhận xét (không bắt buộc)<textarea className="form-textarea" maxLength={2000} value={comment} onChange={e => setComment(e.target.value)} /></label>
      <p>Mỗi Gym/PT được đánh giá một lần. Nội dung sau khi gửi không thể sửa hoặc xóa. Tránh ghi thông tin riêng của bạn hoặc người khác.</p>
      <button className="btn-primary" disabled={mutation.isPending}>{mutation.isPending ? 'Đang gửi…' : 'Gửi đánh giá'}</button>
    </fieldset>
    {mutation.error && <div role="alert" className="alert-banner alert-error"><p>{mutation.error.message}</p><p>Nội dung nhập vẫn được giữ. Nếu mất kết nối hoặc đã gửi trước đó, hãy tải lại để kiểm tra kết quả trước khi gửi tiếp.</p></div>}
  </form>;
};
