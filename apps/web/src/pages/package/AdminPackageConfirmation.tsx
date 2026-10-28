import { useEffect, useRef } from 'react';
import type { GymPackage } from '../../types/package.types';

export const AdminPackageConfirmation = ({ row, locked, pending, send, close }: {
  row: GymPackage; locked: boolean; pending: boolean; send: () => void; close: () => void;
}) => {
  const root = useRef<HTMLElement>(null);
  useEffect(() => { root.current?.querySelector<HTMLButtonElement>('button')?.focus(); }, []);
  return <section ref={root} className="gym-panel admin-package-confirm" aria-label="Xác nhận trạng thái gói">
    <h2>{row.status === 'ACTIVE' ? 'Ngừng bán' : 'Mở bán'} {row.package_name}?</h2>
    <p>{row.status === 'ACTIVE' ? 'Gói sẽ ẩn khỏi catalog công khai. Các thẻ đã mua vẫn được giữ nguyên.' : 'Gói sẽ có trạng thái đang bán. Gym ngừng hoạt động vẫn bị ẩn khỏi danh sách công khai.'}</p>
    <div className="gym-actions"><button className="btn-primary" disabled={locked} onClick={send}>{pending ? 'Đang lưu…' : 'Xác nhận'}</button><button className="btn-secondary" disabled={locked} onClick={close}>Hủy</button></div>
  </section>;
};
