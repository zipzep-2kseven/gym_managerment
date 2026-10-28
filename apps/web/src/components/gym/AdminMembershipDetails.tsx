import { useEffect, useRef } from 'react';
import type { AdminMembership } from '../../types/admin-membership.types';

// Format decimal text directly so the numeric(14,2) snapshot retains both decimal digits.
export const formatMembershipPrice = (value: string) => {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value);
  if (!match) return 'Chưa có dữ liệu giá';
  return `${match[1].replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${(match[2] || '').padEnd(2, '0')} ₫`;
};
export const formatMembershipDate = (value: string) => {
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
};
const formatTimestamp = (value: string) => new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short',
}).format(new Date(value));

export const AdminMembershipDetails = ({ row, onClose }: { row: AdminMembership; onClose: () => void }) => {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented && heading.current?.parentElement?.contains(document.activeElement)) {
        event.preventDefault(); onClose();
      }
    };
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [onClose]);
  return <section className="admin-membership-details" id={`membership-details-${row.membership_id}`} aria-labelledby={`membership-heading-${row.membership_id}`}>
    <h3 ref={heading} tabIndex={-1} id={`membership-heading-${row.membership_id}`}>Thông tin thẻ {row.membership_id}</h3>
    <dl>
      <div><dt>Gym ID</dt><dd>{row.gym_id}</dd></div>
      <div><dt>Package ID</dt><dd>{row.package_id}</dd></div>
      <div><dt>Giá lúc mua</dt><dd>{formatMembershipPrice(row.purchase_price)}</dd></div>
      <div><dt>Liên kết thanh toán</dt><dd>{row.payment_id || 'Không có liên kết thanh toán trong dữ liệu'}</dd></div>
      <div><dt>Tạo lúc (giờ Việt Nam)</dt><dd><time dateTime={row.created_at}>{formatTimestamp(row.created_at)}</time></dd></div>
      <div><dt>Cập nhật lúc (giờ Việt Nam)</dt><dd><time dateTime={row.updated_at}>{formatTimestamp(row.updated_at)}</time></dd></div>
    </dl>
    <p>Giá lúc mua và liên kết thanh toán là thông tin của thẻ. Không xác nhận trạng thái thanh toán hoặc điều kiện đăng ký PT.</p>
    <button className="btn-secondary" type="button" onClick={onClose}>Đóng thông tin thẻ</button>
  </section>;
};
