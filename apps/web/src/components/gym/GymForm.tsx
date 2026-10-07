import { useState } from 'react';
import { useGymMutation } from '../../hooks/useGym';
import { gymService } from '../../services/gym.service';
import type { Gym, GymInput } from '../../types/gym.types';
import { MutationError } from './GymUi';
const fields = [
  ['gym_name', 'Tên phòng Gym', 'text'], ['address', 'Địa chỉ', 'text'], ['phone', 'Điện thoại', 'tel'],
  ['email', 'Email', 'email'], ['latitude', 'Vĩ độ', 'number'], ['longitude', 'Kinh độ', 'number'],
  ['logo_url', 'URL logo', 'url'], ['opening_time', 'Giờ mở cửa', 'time'], ['closing_time', 'Giờ đóng cửa', 'time'],
] as const;
export const GymForm = ({ gym: currentGym, onSaved }: { gym?: Gym; onSaved?: () => void }) => {
  // Keep the editing snapshot stable across background refetches. Only changed
  // fields are patched, so remote edits to other fields are preserved.
  const [gym] = useState(currentGym);
  const [baseline, setBaseline] = useState<Partial<GymInput>>(currentGym ?? {});
  const [saved, setSaved] = useState(false);
  const mutation = useGymMutation((body: Partial<GymInput>) => gym ? gymService.update(gym.gym_id, body) : gymService.create(body as GymInput));
  return <form className="gym-panel" onChange={() => setSaved(false)} onSubmit={event => {
    event.preventDefault();
    if (mutation.isPending) return;
    const form = new FormData(event.currentTarget);
    const input = Object.fromEntries([...fields.map(([name]) => [name, String(form.get(name) || '').trim() || null]), ['description', String(form.get('description') || '') || null]]) as unknown as GymInput;
    const body = gym ? Object.fromEntries(Object.entries(input).filter(([key, value]) => {
      const old = baseline[key as keyof GymInput];
      return key.endsWith('_time') ? (old?.slice(0, 5) || null) !== value : old !== value;
    })) : input;
    if (!Object.keys(body).length) { setSaved(true); return; }
    mutation.mutate(body, { onSuccess: () => { setBaseline(input); setSaved(true); onSaved?.(); } });
  }}><h2>{gym ? 'Thông tin phòng Gym' : 'Tạo phòng Gym'}</h2><MutationError error={mutation.error} />{saved && <p className="alert-banner alert-success" role="status">Thông tin đã được lưu.</p>}
    <fieldset disabled={mutation.isPending} className="gym-fieldset"><div className="gym-form-grid">{fields.map(([name, label, type]) => <label className="form-group" key={name}>{label}<input className="form-input" name={name} type={type} defaultValue={gym?.[name]?.slice(0, type === 'time' ? 5 : undefined) || ''} required={name === 'gym_name' || name === 'address'} maxLength={name === 'phone' ? 20 : name === 'email' ? 254 : undefined} step={type === 'number' ? 'any' : undefined} min={name === 'latitude' ? -90 : name === 'longitude' ? -180 : undefined} max={name === 'latitude' ? 90 : name === 'longitude' ? 180 : undefined} pattern={type === 'url' ? 'https?://.+' : undefined} /></label>)}</div><label className="form-group">Mô tả<textarea className="form-textarea" name="description" defaultValue={gym?.description || ''} /></label><button className="btn-primary" type="submit">{mutation.isPending ? 'Đang lưu…' : gym ? 'Lưu thay đổi' : 'Tạo Gym'}</button></fieldset>
  </form>;
};
