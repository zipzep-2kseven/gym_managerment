import type { GymPackage } from '../../types/package.types';
// Keep the decimal text intact; display grouping never rounds money through Number.
export const displayPackagePrice = (price: string) => {
  const [whole, fraction = '00'] = price.split('.');
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${fraction}`;
};
export const PackageSummary = ({ item, managed = false, showName = true }: { item: GymPackage; managed?: boolean; showName?: boolean }) => <>
  {showName && <h2>{item.package_name}</h2>}
  <p className="package-price">{displayPackagePrice(item.price)} <span>VND</span></p>
  <p>Thời hạn: {item.duration_days} ngày</p>
  <p className="gym-preserve">{item.description || 'Chưa có mô tả cho gói tập này.'}</p>
  {managed && <span className="badge badge-role">{item.status === 'ACTIVE' ? 'Đang bán' : 'Ngừng bán'}</span>}
</>;
