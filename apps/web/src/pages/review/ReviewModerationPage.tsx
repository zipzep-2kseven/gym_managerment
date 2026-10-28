import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useAdminReviewModeration } from '../../hooks/useAdminReviewModeration';
import { QueryState } from '../../components/gym/GymUi';
import { PageHeader } from '../../components/management/PageHeader';
import { DashboardQueryFeedback } from '../../components/management/DashboardQueryFeedback';
import { AdminDialog } from '../../components/admin/AdminDialog';
import type { ModeratedReview, ModerationFilters } from '../../services/review-moderation.service';
import { ReviewGymFilter } from './ReviewGymFilter';
import { AdminReviewRow } from './AdminReviewRow';
import { HideReviewForm } from './HideReviewForm';
import { ReviewDetails } from './ReviewDetails';

const keyOf = (row: ModeratedReview) => `${row.kind}:${row.review_id}`;
const AdminReviews = () => {
  const state = useAdminReviewModeration(), { filters, query } = state;
  const [details, setDetails] = useState<ModeratedReview | null>(null), [hiding, setHiding] = useState<ModeratedReview | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({}), [policy, setPolicy] = useState(false);
  const root = useRef<HTMLDivElement>(null), receipt = useRef<HTMLParagraphElement>(null);
  useEffect(() => { const heading = root.current?.querySelector('h1'); if (heading) { heading.tabIndex = -1; heading.focus(); } }, []);
  const focusedReceipt = useRef<ModeratedReview | null>(null);
  useEffect(() => {
    if (!state.receipt || hiding || focusedReceipt.current === state.receipt) return;
    const frame = requestAnimationFrame(() => { receipt.current?.focus(); focusedReceipt.current = state.receipt; });
    return () => cancelAnimationFrame(frame);
  }, [state.receipt, hiding]);
  useEffect(() => {
    if (!hiding || state.busy || state.uncertain || query.isFetching || query.isError) return;
    const current = query.data?.items.find(row => keyOf(row) === keyOf(hiding));
    if (current?.status === 'HIDDEN' || state.receipt && keyOf(state.receipt) === keyOf(hiding)) setHiding(null);
  }, [hiding, state.busy, state.uncertain, state.receipt, query.data, query.isFetching, query.isError]);
  if (state.denied) return <QueryState pending={false} error={state.denied} retry={state.reload} redirectOnUnauthorized={false} />;
  const controlsLocked = state.busy || !!state.uncertain;
  const change = (value: Partial<ModerationFilters>) => {
    if (controlsLocked) return;
    setDetails(null); setHiding(null); setDrafts({}); state.change(value);
  };
  const notices = <>
    {state.receipt && (!hiding || keyOf(hiding) === keyOf(state.receipt)) && <p ref={receipt} tabIndex={-1} role="status">Đã ẩn đánh giá và lưu lịch sử xử lý. {state.receipt.gym.gym_name}</p>}
    {state.uncertain && <div className="admin-review-recovery" role="status">
      <p>{state.receipt && keyOf(state.receipt) === keyOf(state.uncertain) ? 'Kết quả ẩn đã được xác nhận. Cần tải lại danh sách trước khi xử lý đánh giá tiếp theo.' : 'Lý do đã nhập vẫn được giữ. Kết quả xử lý chưa được xác minh; đọc lại đánh giá trước khi thao tác tiếp.'}</p>
      <button type="button" className="btn-secondary" disabled={state.busy || query.isFetching} onClick={() => void state.reload()}>Đọc lại đánh giá</button>
    </div>}
    {state.readError && <p role="alert">{state.readError.message}</p>}
  </>;
  const pageCount = query.data ? Math.max(1, Math.ceil(query.data.total / query.data.page_size)) : 1;
  return <div ref={root} className="admin-reviews">
    <PageHeader title="Kiểm duyệt đánh giá" />
    <div className="admin-list-toolbar admin-review-toolbar">
      <div className="form-group"><label htmlFor="review-kind">Loại đánh giá</label><select id="review-kind" className="form-input" disabled={controlsLocked} value={filters.kind} onChange={event => change({ kind: event.target.value as 'gym' | 'trainer' })}><option value="gym">Phòng Gym</option><option value="trainer">Huấn luyện viên</option></select></div>
      <ReviewGymFilter value={filters.gym_id || ''} change={gym => change({ gym_id: gym || undefined })} disabled={controlsLocked} onDenied={state.setAccessError} />
      <div className="form-group"><label htmlFor="review-status">Trạng thái đánh giá</label><select id="review-status" className="form-input" disabled={controlsLocked} value={filters.status || ''} onChange={event => change({ status: (event.target.value || undefined) as ModerationFilters['status'] })}><option value="">Tất cả</option><option value="VISIBLE">Công khai</option><option value="HIDDEN">Đã ẩn</option></select></div>
      <button type="button" className="admin-text-link admin-review-policy-link" onClick={() => setPolicy(true)}>Nguyên tắc kiểm duyệt</button>
      <button type="button" className="btn-secondary" disabled={state.busy || query.isFetching} onClick={() => void state.reload()}>Tải lại danh sách</button>
    </div>
    {!hiding && notices}
    {state.recovered !== null && <p role="status">Trang trước không còn dữ liệu; đã chuyển về trang {state.recovered}.</p>}
    <section className="admin-review-list" aria-label="Danh sách đánh giá" aria-busy={state.busy || query.isFetching}>
      <DashboardQueryFeedback query={query} retry={() => void state.reload()} />
      {query.data && <>
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
        <div className="admin-gym-table-scroll" role="region" aria-label="Bảng đánh giá" tabIndex={0}>
          <table className="admin-gym-table admin-review-table"><caption>{query.data.total} đánh giá phù hợp</caption>
            <thead><tr>{['Người đánh giá', 'Đối tượng được đánh giá', 'Số sao', 'Nội dung', 'Ngày gửi', 'Trạng thái', 'Thao tác'].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead>
            <tbody>{query.data.items.map(row => <AdminReviewRow key={keyOf(row)} row={row} blocked={state.blocked} view={() => setDetails(row)} hide={() => setHiding(row)} />)}</tbody>
          </table>
          {!query.data.items.length && <p className="admin-gym-empty">{query.data.total === 0 ? 'Không có đánh giá phù hợp.' : 'Trang này không còn đánh giá. Đang đọc lại trang phù hợp.'}</p>}
        </div>
        {pageCount > 1 && <nav className="gym-actions" aria-label="Phân trang đánh giá quản trị"><button type="button" className="btn-secondary" disabled={controlsLocked || query.isFetching || query.isError || filters.page === 1} onClick={() => change({ page: filters.page - 1 })}>Trang trước</button><span>Trang {filters.page} / {pageCount}</span><button type="button" className="btn-secondary" disabled={controlsLocked || query.isFetching || query.isError || filters.page >= pageCount} onClick={() => change({ page: filters.page + 1 })}>Trang sau</button></nav>}
      </>}
    </section>
    {details && <ReviewDetails row={details} close={() => setDetails(null)} />}
    {hiding && <AdminDialog title="Ẩn đánh giá vi phạm" busy={state.busy} onClose={() => setHiding(null)}>
      <p><strong>{hiding.author.full_name || 'Hội viên'}</strong> · {hiding.trainer?.full_name || hiding.gym.gym_name} · {hiding.rating}/5 sao</p>
      {/* Keyboard focus allows scrolling a long quoted review inside the dialog. */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
      <blockquote role="region" aria-label="Nội dung đánh giá cần ẩn" tabIndex={0} className="admin-review-hide-content gym-preserve">{hiding.comment || 'Không có nhận xét.'}</blockquote>
      <HideReviewForm row={hiding} blocked={state.blocked} busy={state.busy} pending={state.pendingRow?.review_id === hiding.review_id && state.pendingRow.kind === hiding.kind}
        error={state.writeError && keyOf(state.writeError.row) === keyOf(hiding) ? state.writeError.error : null} revision={state.revision} send={state.send}
        reason={drafts[keyOf(hiding)] || ''} setReason={value => setDrafts(current => ({ ...current, [keyOf(hiding)]: value }))} close={() => setHiding(null)} />
      {notices}
    </AdminDialog>}
    {policy && <AdminDialog title="Nguyên tắc kiểm duyệt" onClose={() => setPolicy(false)}>
      <p>Chỉ ẩn nội dung vi phạm như xúc phạm, spam, tiết lộ thông tin riêng hoặc không liên quan. Đánh giá thấp và góp ý về dịch vụ vẫn được giữ.</p>
      <p>Mỗi lần ẩn cần lý do và được lưu người xử lý, thời điểm cùng nội dung gốc. Hiện tại không có chức năng khôi phục đánh giá đã ẩn.</p>
    </AdminDialog>}
  </div>;
};
export const ReviewModerationPage = () => { const { user } = useAuth(); return <AdminReviews key={user?.user_id} />; };
