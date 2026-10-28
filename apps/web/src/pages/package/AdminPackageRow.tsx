import type { GymPackage } from '../../types/package.types';
import { displayPackagePrice } from '../../components/package/PackageSummary';

export const AdminPackageRow = ({ item, blocked, open }: { item: GymPackage; blocked: boolean; open: (kind: 'edit' | 'status', row: GymPackage) => void }) =>
  <article className="admin-package-row" aria-label={`Gói tập ${item.package_name}`}>
    <div className="admin-package-heading"><div><h2>{item.package_name}</h2><p className="gym-preserve">{item.description || 'Chưa có mô tả cho gói tập này.'}</p></div>
      <span className="admin-package-status">{item.status === 'ACTIVE' ? 'Đang bán' : 'Ngừng bán'}</span></div>
    <div className="admin-package-details"><p><strong>{displayPackagePrice(item.price)} VND</strong><span>Giá catalog</span></p><p><strong>{item.duration_days} ngày</strong><span>Thời hạn</span></p></div>
    <div className="gym-actions"><button className="btn-secondary" data-package-opener={`edit-${item.package_id}`} disabled={blocked} onClick={() => open('edit', item)}>Sửa gói {item.package_name}</button>
      <button className="btn-secondary" data-package-opener={`status-${item.package_id}`} disabled={blocked} onClick={() => open('status', item)}>{item.status === 'ACTIVE' ? 'Ngừng bán' : 'Mở bán'} {item.package_name}</button></div>
  </article>;
