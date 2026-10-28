import { useState } from 'react';
import { usePackageMutation } from '../../hooks/usePackages';
import { packageService } from '../../services/package.service';
import type { GymPackage, PackageInput } from '../../types/package.types';
import { MutationError } from '../gym/GymUi';
import { normalizePackagePrice } from './package-input';
export const PackageForm = ({ gymId, item, onClose }: { gymId: string; item?: GymPackage; onClose: () => void }) => {
  const [initial] = useState(item);
  const [baseline, setBaseline] = useState<Partial<PackageInput>>(item ?? {});
  const [saved, setSaved] = useState(false);
  const mutation = usePackageMutation(gymId, (body: Partial<PackageInput>) => initial
    ? packageService.update(gymId, initial.package_id, body) : packageService.create(gymId, body as PackageInput));
  return <form className="gym-panel" onChange={() => { setSaved(false); mutation.reset(); }} onSubmit={e => {
    e.preventDefault();
    if (mutation.isPending || saved && !initial) return;
    const form = new FormData(e.currentTarget);
    const input: PackageInput = { package_name: String(form.get('package_name')).trim(),
      duration_days: Number(form.get('duration_days')), price: normalizePackagePrice(String(form.get('price'))),
      description: String(form.get('description') || '') || null };
    const body = initial ? Object.fromEntries(Object.entries(input).filter(([key, value]) => baseline[key as keyof PackageInput] !== value)) : input;
    if (!Object.keys(body).length) { setSaved(true); return; }
    mutation.mutate(body, { onSuccess: () => { setBaseline(input); setSaved(true); } });
  }}>
    <h2>{initial ? `Sửa gói: ${initial.package_name}` : 'Tạo gói tập'}</h2>
    <MutationError error={mutation.error} />
    {saved && <p role="status" className="alert-banner alert-success">{initial ? 'Thay đổi đã được lưu.' : 'Gói tập đã được tạo.'}</p>}
    <fieldset disabled={mutation.isPending || saved && !initial} className="gym-fieldset">
      <label className="form-group">Tên gói tập<input className="form-input" name="package_name" defaultValue={initial?.package_name} required pattern=".*\S.*" /></label>
      <div className="gym-form-grid">
        <label className="form-group">Thời hạn (ngày)<input className="form-input" name="duration_days" type="number" min="1" max="2147483647" step="1" defaultValue={initial?.duration_days} required /></label>
        <label className="form-group">Giá (VND)<input className="form-input" name="price" type="text" inputMode="decimal" pattern="[0-9]{1,12}(\.[0-9]{1,2})?" defaultValue={initial?.price} required aria-describedby="package-price-help" /></label>
      </div>
      <p id="package-price-help">Nhập số không âm, dùng dấu chấm cho phần thập phân; tối đa 2 chữ số lẻ. Ví dụ: 500000.50</p>
      <div className="form-group"><label htmlFor="package-description">Mô tả</label><textarea id="package-description" className="form-textarea" name="description" defaultValue={initial?.description || ''} /></div>
      <button className="btn-primary" type="submit">{mutation.isPending ? 'Đang lưu…' : initial ? 'Lưu thay đổi' : 'Tạo gói tập'}</button>
    </fieldset>
    <button type="button" className="btn-secondary mt-4" disabled={mutation.isPending} onClick={onClose}>Đóng biểu mẫu</button>
    <p>Đổi giá hoặc thời hạn không thay đổi thông tin các giao dịch và thẻ hội viên đã mua.</p>
  </form>;
};
