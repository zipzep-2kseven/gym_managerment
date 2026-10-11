import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { QueryState } from '../../components/gym/GymUi';
import { reviewModerationService, type ModerationFilters } from '../../services/review-moderation.service';
import { HideReviewForm } from './HideReviewForm';
import { ReviewGymFilter } from './ReviewGymFilter';
const time = (value: string) => new Intl.DateTimeFormat('vi-VN', {dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh'}).format(new Date(value));
export const ReviewModerationPage = () => {
  const {user} = useAuth(), cache = useQueryClient(), [filters, setFilters] = useState<ModerationFilters>({kind: 'gym', page: 1}), [saved, setSaved] = useState(false);
  const query = useQuery({queryKey: ['review-moderation', user?.user_id, filters], queryFn: ({signal}) => reviewModerationService.list(filters, signal), refetchOnWindowFocus: false});
  const change = (value: Partial<ModerationFilters>) => {setFilters({...filters, ...value, page: 1}); setSaved(false);};
  const done = async () => {setSaved(true); setFilters(current => ({...current, page: 1})); await Promise.all([cache.invalidateQueries({queryKey: ['review-moderation']}), cache.invalidateQueries({queryKey: ['reviews']})]);};
  return <><Link to="/admin/gyms">Quản trị Gym</Link><h1>Quản lý đánh giá</h1><p>Chỉ ẩn nội dung vi phạm như xúc phạm, spam, tiết lộ thông tin riêng hoặc không liên quan. Đánh giá thấp và góp ý về dịch vụ vẫn được giữ.</p>
    <div className="gym-toolbar"><label className="form-group">Loại đánh giá<select className="form-input" value={filters.kind} onChange={e => change({kind: e.target.value as 'gym' | 'trainer'})}><option value="gym">Phòng Gym</option><option value="trainer">Huấn luyện viên</option></select></label><label className="form-group">Trạng thái đánh giá<select className="form-input" value={filters.status || ''} onChange={e => change({status: (e.target.value || undefined) as ModerationFilters['status']})}><option value="">Tất cả</option><option value="VISIBLE">Công khai</option><option value="HIDDEN">Đã ẩn</option></select></label></div>
    <ReviewGymFilter value={filters.gym_id || ''} change={gym => change({gym_id: gym || undefined})} /><button className="btn-secondary" onClick={() => void query.refetch()}>Tải lại danh sách</button>
    {saved && <p role="status">Đã ẩn đánh giá và lưu lịch sử xử lý.</p>}<QueryState pending={query.isPending} error={query.error} retry={query.refetch} />
    {query.data && !query.isError && <><p>{query.data.total} đánh giá phù hợp</p>{query.data.items.map(row => <article className="gym-panel review-moderation-entry" key={`${row.kind}-${row.review_id}`}>
      <h2>{row.trainer?.full_name || (row.kind === 'trainer' ? 'Huấn luyện viên' : row.gym.gym_name)}</h2><p>{row.gym.gym_name}{row.gym.status === 'INACTIVE' ? ' · Gym ngừng hoạt động' : ''}{row.trainer?.status === 'INACTIVE' ? ' · PT ngừng hoạt động' : ''}</p>
      <p><strong>{row.author.full_name}</strong> · {row.rating}/5 sao · {time(row.created_at)} · {row.status === 'VISIBLE' ? 'Công khai' : 'Đã ẩn'}</p><p className="gym-preserve">{row.comment || 'Không có nhận xét.'}</p>
      {row.moderation ? <div><h3>Lịch sử ẩn</h3><p>{row.moderation.moderator_name} · {time(row.moderation.hidden_at)}</p><p className="gym-preserve">{row.moderation.hidden_reason}</p></div> : <HideReviewForm row={row} done={done} />}
    </article>)}{!query.data.items.length && <p>Không có đánh giá phù hợp.</p>}
      {query.data.total > 10 && <nav className="gym-actions" aria-label="Phân trang đánh giá quản trị"><button className="btn-secondary" disabled={filters.page === 1} onClick={() => setFilters({...filters, page: filters.page - 1})}>Trang trước</button><span>Trang {filters.page} / {Math.ceil(query.data.total / 10)}</span><button className="btn-secondary" disabled={filters.page * 10 >= query.data.total} onClick={() => setFilters({...filters, page: filters.page + 1})}>Trang sau</button></nav>}</>}
  </>;
};
