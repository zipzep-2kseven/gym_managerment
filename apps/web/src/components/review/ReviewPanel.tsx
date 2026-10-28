import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { QueryState } from '../gym/GymUi';
import { ReviewForm } from './ReviewForm';
import { reviewPath, reviewService } from '../../services/review.service';
const date = (value: string) => new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value));
export const ReviewPanel = ({ gymId, trainerId }: { gymId: string; trainerId?: string }) => {
  const location = useLocation();
  const path = reviewPath(gymId, trainerId), { user, isLoading } = useAuth(), cache = useQueryClient();
  const [page, setPage] = useState(1), [saved, setSaved] = useState(false);
  const customer = user?.roles.includes('CUSTOMER');
  const list = useQuery({ queryKey: ['reviews', 'public', path, page], queryFn: ({ signal }) => reviewService.list(path, page, signal) });
  const own = useQuery({ queryKey: ['reviews', 'mine', user?.user_id, path], queryFn: ({ signal }) => reviewService.mine(path, signal), enabled: !!customer, refetchOnWindowFocus: false });
  const done = async () => { setSaved(true); setPage(1); await cache.invalidateQueries({ queryKey: ['reviews'] }); };
  const reload = () => { void own.refetch(); void list.refetch(); };
  return <section className="gym-panel" aria-label="Đánh giá hội viên"><h2>Đánh giá {trainerId ? 'huấn luyện viên' : 'phòng Gym'}</h2>
    {!list.data || list.isError ? <QueryState pending={list.isPending} error={list.error} retry={list.refetch} /> : <>
      <p>{list.data.total ? `${list.data.average_rating}/5 · ${list.data.total} đánh giá` : 'Chưa có đánh giá. Hãy chia sẻ trải nghiệm sau khi sử dụng dịch vụ.'}</p>
      <div>{list.data.items.map(row => <article key={row.review_id} className="review-entry"><p><strong>{row.author_name}</strong> · {row.rating}/5 sao · <time dateTime={row.created_at}>{date(row.created_at)}</time></p>{row.comment && <p className="gym-preserve">{row.comment}</p>}</article>)}</div>
      {list.data.total > 10 && <nav className="gym-actions" aria-label="Phân trang đánh giá"><button className="btn-secondary" disabled={page === 1} onClick={() => setPage(page - 1)}>Đánh giá trước</button><span>Trang {page} / {Math.ceil(list.data.total / 10)}</span><button className="btn-secondary" disabled={page * 10 >= list.data.total} onClick={() => setPage(page + 1)}>Đánh giá tiếp</button></nav>}
    </>}
    {saved && <p role="status">Đã gửi đánh giá.</p>}
    {isLoading ? <p>Đang kiểm tra phiên đăng nhập…</p> : !user ? <p><Link to="/login" state={{ from: location }}>Đăng nhập</Link> để kiểm tra điều kiện đánh giá.</p> : customer ? <>
      {!own.data || own.isError ? <QueryState pending={own.isPending} error={own.error} retry={own.refetch} /> : own.data.review ? <div><h3>Đánh giá bạn đã gửi</h3><p>{own.data.review.rating}/5 sao · {date(own.data.review.created_at)}{own.data.review.status === 'HIDDEN' ? ' · Đã ẩn khỏi danh sách công khai' : ''}</p>{own.data.review.comment && <p className="gym-preserve">{own.data.review.comment}</p>}</div> : own.data.eligible ? <ReviewForm key={path} path={path} done={done} /> : <p>{own.data.reason}</p>}
      <button className="btn-secondary" type="button" onClick={reload}>Tải lại đánh giá</button>
    </> : <p>Đánh giá dành cho Customer đã sử dụng dịch vụ.</p>}
  </section>;
};
