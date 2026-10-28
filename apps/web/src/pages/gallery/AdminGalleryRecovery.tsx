import { useState } from 'react';
import type { useAdminGallery } from '../../hooks/useAdminGallery';

export const AdminGalleryRecovery = ({ action, ready, accept }: { action: ReturnType<typeof useAdminGallery>; ready: boolean; accept: () => void }) => {
  const [reviewed, setReviewed] = useState(false);
  if (!action.uncertain) return null;
  const targetId = 'row' in action.uncertain ? action.uncertain.row.image_id : null;
  const current = targetId ? action.query.data?.find(row => row.image_id === targetId) : undefined;
  return <section className="gym-panel admin-gallery-recovery" aria-label="Kiểm tra kết quả gallery">
    <h2>{action.receipt ? 'Đã lưu, cần đọc lại gallery' : 'Cần kiểm tra kết quả'}</h2>
    <p>{action.receipt ? 'Máy chủ đã xác nhận lưu. Đọc lại danh sách trước khi thao tác tiếp.' : 'Dữ liệu có thể đã thay đổi. Đọc lại gallery trước khi thực hiện thao tác mới.'}</p>
    {action.unknownUpload && <p>Gallery không chứng minh ảnh nào do yêu cầu vừa gửi tạo ra. Không tự gửi lại ảnh; kiểm tra danh sách rồi chọn ảnh lại nếu muốn tạo một yêu cầu mới.</p>}
    <button className="btn-secondary" disabled={action.pending || action.reading || !!action.denied} onClick={() => { setReviewed(false); void action.recover(); }}>{action.reading ? 'Đang đọc lại…' : 'Đọc lại gallery'}</button>
    {action.checked && <>
      <p>Dữ liệu vừa đọc: {action.query.data?.length || 0}/10 ảnh.</p>
      {targetId && <p className="gym-preserve">{current ? `Chú thích hiện tại: ${current.caption || 'Chưa có chú thích.'}` : 'Ảnh không còn trong gallery hiện tại.'}</p>}
      {action.unknownUpload && <label className="admin-gallery-check"><input type="checkbox" checked={reviewed} onChange={event => setReviewed(event.target.checked)} />Tôi đã kiểm tra gallery và hiểu rằng kết quả tải ảnh chưa được xác định.</label>}
      <button className="btn-secondary" disabled={!ready || action.reading || (action.unknownUpload && !reviewed)} onClick={accept}>{action.unknownUpload ? 'Đóng sau khi kiểm tra gallery' : 'Dùng dữ liệu vừa đọc'}</button>
    </>}
  </section>;
};
