import type { ModeratedReview } from '../../services/review-moderation.service';
import { ActionIcon } from '../../components/admin/ActionIcon';
export const reviewTime = (value: string) => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Bangkok' }).format(new Date(value));
export const AdminReviewRow = ({ row, blocked, view, hide }: {
  row: ModeratedReview; blocked: boolean; view: () => void; hide: () => void;
}) => <tr className="admin-review-row">
  <th scope="row"><span className="admin-review-comment">{row.author.full_name || 'Hội viên'}</span></th>
  <td><strong className="admin-review-target">{row.kind === 'trainer' ? row.trainer?.full_name || 'Huấn luyện viên' : row.gym.gym_name}</strong>
    {row.kind === 'trainer' && <span className="admin-review-target-sub">{row.gym.gym_name}</span>}
    {(row.gym.status === 'INACTIVE' || row.trainer?.status === 'INACTIVE') && <small className="admin-review-target-sub">{[row.gym.status === 'INACTIVE' ? 'Gym ngừng hoạt động' : '', row.trainer?.status === 'INACTIVE' ? 'PT ngừng hoạt động' : ''].filter(Boolean).join(' · ')}</small>}
  </td>
  <td><span className="admin-review-rating"><span aria-hidden="true">★ </span>{row.rating}/5 sao</span></td>
  <td><span className="admin-review-comment">{row.comment || 'Không có nhận xét.'}</span></td>
  <td><time dateTime={row.created_at}>{reviewTime(row.created_at)}</time></td>
  <td><span className={`admin-status ${row.status === 'VISIBLE' ? 'is-active' : 'is-inactive'}`}>{row.status === 'VISIBLE' ? 'Công khai' : 'Đã ẩn'}</span></td>
  <td><div className="admin-gym-row-actions"><button type="button" title="Xem chi tiết" aria-label="Xem chi tiết" onClick={view}><ActionIcon kind="view" /></button>
    {row.status === 'VISIBLE' && <button type="button" title="Ẩn đánh giá" aria-label="Ẩn đánh giá" disabled={blocked} onClick={hide}><ActionIcon kind="hide" /></button>}
  </div></td>
</tr>;
