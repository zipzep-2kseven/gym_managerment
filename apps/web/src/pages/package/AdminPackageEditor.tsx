import { useEffect, useId, useRef, useState } from 'react';
import type { GymPackage, PackageInput } from '../../types/package.types';
import { changedPackageFields, packageInputFromForm } from '../../components/package/package-input';
import type { PackageAction } from '../../hooks/useAdminPackageAction';

export const AdminPackageEditor = ({ item, locked, pending, saved, close, send }: {
  item?: GymPackage; locked: boolean; pending: boolean; saved: boolean; close: () => void; send: (action: PackageAction) => Promise<GymPackage | null>;
}) => {
  const [baseline, setBaseline] = useState<Partial<PackageInput>>(item || {}), [notice, setNotice] = useState(false);
  const form = useRef<HTMLFormElement>(null), id = useId();
  useEffect(() => { form.current?.querySelector<HTMLInputElement>('input')?.focus(); }, []);
  return <form ref={form} className="gym-panel admin-package-editor" aria-label={item ? `Sửa gói ${item.package_name}` : 'Tạo gói tập'}
    onChange={() => setNotice(false)} onSubmit={async event => {
      event.preventDefault(); if (locked || (!item && saved)) return;
      const input = packageInputFromForm(event.currentTarget), body = item ? changedPackageFields(input, baseline) : input;
      if (!Object.keys(body).length) { setNotice(true); return; }
      const result = await send(item ? { kind: 'update', row: item, input: body } : { kind: 'create', input });
      if (result) setBaseline(input);
    }}>
    <h2>{item ? `Sửa gói: ${item.package_name}` : 'Tạo gói tập'}</h2>
    {item && <p className="admin-package-policy">Biểu mẫu giữ dữ liệu lúc mở. Nếu hai người sửa cùng trường, lần lưu sau sẽ thay thế lần trước. Đóng rồi mở lại để lấy dữ liệu mới.</p>}
    {notice && <p role="status">Không có thay đổi mới.</p>}
    <fieldset className="gym-fieldset" disabled={locked || (!item && saved)}>
      <label className="form-group">Tên gói tập<input className="form-input" name="package_name" defaultValue={item?.package_name} required pattern=".*\S.*" /></label>
      <div className="gym-form-grid">
        <label className="form-group">Thời hạn (ngày)<input className="form-input" name="duration_days" type="number" min="1" max="2147483647" step="1" defaultValue={item?.duration_days} required /></label>
        <label className="form-group">Giá (VND)<input className="form-input" name="price" type="text" inputMode="decimal" pattern="[0-9]{1,12}(\.[0-9]{1,2})?" defaultValue={item?.price} required aria-describedby={`${id}-price`} /></label>
      </div>
      <p id={`${id}-price`}>Giá không âm, tối đa 999999999999.99. Dùng dấu chấm và tối đa 2 chữ số lẻ, ví dụ 500000.50.</p>
      <div className="form-group"><label htmlFor={`${id}-description`}>Mô tả</label><textarea id={`${id}-description`} className="form-textarea" name="description" defaultValue={item?.description || ''} /></div>
      <button className="btn-primary" type="submit">{pending ? 'Đang chờ kết quả…' : item ? 'Lưu thay đổi' : 'Tạo gói tập'}</button>
    </fieldset>
    <button type="button" className="btn-secondary" disabled={locked} onClick={close}>Đóng biểu mẫu</button>
  </form>;
};
