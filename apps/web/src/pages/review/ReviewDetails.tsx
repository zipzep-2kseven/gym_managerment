import { AdminDialog } from '../../components/admin/AdminDialog';
import type { ModeratedReview } from '../../services/review-moderation.service';
import { reviewTime } from './AdminReviewRow';
export const ReviewDetails = ({ row, close }: { row: ModeratedReview; close: () => void }) => <AdminDialog title="Chi tiết đánh giá" drawer onClose={close}>
  <dl className="admin-gym-facts">
    <dt>Người đánh giá</dt><dd>{row.author.full_name || 'Hội viên'}</dd>
    <dt>Phòng Gym</dt><dd>{row.gym.gym_name}</dd>
    {row.kind === 'trainer' && <><dt>Huấn luyện viên</dt><dd>{row.trainer?.full_name || 'Huấn luyện viên'}</dd></>}
    <dt>Số sao</dt><dd>{row.rating}/5 sao</dd><dt>Ngày gửi</dt><dd>{reviewTime(row.created_at)}</dd>
    <dt>Trạng thái</dt><dd>{row.status === 'VISIBLE' ? 'Công khai' : 'Đã ẩn'}</dd>
  </dl>
  <h3>Nội dung đánh giá</h3><p className="gym-preserve">{row.comment || 'Không có nhận xét.'}</p>
  {row.status === 'HIDDEN' && <section className="admin-review-audit" aria-label="Lịch sử ẩn"><h3>Lịch sử ẩn</h3>
    {row.moderation ? <><p>{row.moderation.moderator_name} · {reviewTime(row.moderation.hidden_at)}</p><p className="gym-preserve">{row.moderation.hidden_reason}</p></> : <p>Chưa có thông tin xử lý. Tải lại danh sách để kiểm tra.</p>}
  </section>}
</AdminDialog>;
