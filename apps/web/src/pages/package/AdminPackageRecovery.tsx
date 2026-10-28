import { useState } from 'react';
import type { useAdminPackageAction } from '../../hooks/useAdminPackageAction';
import { displayPackagePrice } from '../../components/package/PackageSummary';

export const AdminPackageRecovery = ({ action, catalogReady, accept }: { action: ReturnType<typeof useAdminPackageAction>; catalogReady: boolean; accept: () => void }) => {
  const [reviewed, setReviewed] = useState(false);
  if (!action.uncertain) return null;
  const create = action.uncertain.kind === 'create';
  return <section className="gym-panel admin-package-recovery" aria-label="Kiểm tra kết quả gói tập">
    <h2>{action.receipt ? 'Đã lưu, cần đọc lại catalog' : 'Chưa xác định được kết quả'}</h2>
    <p>{action.receipt ? 'Máy chủ đã xác nhận lưu. Không gửi lại thao tác vì danh sách chưa tải được.'
      : 'Yêu cầu có thể đã được lưu. Đọc lại dữ liệu trước khi thực hiện thao tác mới.'}</p>
    {create && <p>Tên gói không duy nhất. Catalog không chứng minh gói nào do yêu cầu vừa gửi tạo ra. Kiểm tra các trang phù hợp; biểu mẫu này sẽ không gửi lại yêu cầu tạo.</p>}
    <button className="btn-secondary" disabled={action.pending || action.reading || !!action.accessError} onClick={() => { setReviewed(false); void action.recover(); }}>
      {action.reading ? 'Đang đọc lại…' : 'Đọc lại kết quả'}</button>
    {action.checked && <>
      {action.current && <div className="admin-package-readback"><h3>Dữ liệu hiện tại</h3><p>{action.current.package_name} · {displayPackagePrice(action.current.price)} VND · {action.current.duration_days} ngày</p>
        <p>{action.current.status === 'ACTIVE' ? 'Đang bán' : 'Ngừng bán'}</p><p className="gym-preserve">{action.current.description || 'Chưa có mô tả.'}</p></div>}
      {create && <label className="admin-package-check"><input type="checkbox" checked={reviewed} onChange={event => setReviewed(event.target.checked)} />{action.receipt ? 'Tôi đã kiểm tra catalog sau khi tạo gói.' : 'Tôi đã kiểm tra catalog và hiểu rằng kết quả tạo chưa được xác định.'}</label>}
      <button className="btn-secondary" disabled={action.reading || !catalogReady || (create && !reviewed)} onClick={accept}>{create ? 'Đóng sau khi kiểm tra catalog' : 'Dùng dữ liệu vừa đọc'}</button>
    </>}
  </section>;
};
