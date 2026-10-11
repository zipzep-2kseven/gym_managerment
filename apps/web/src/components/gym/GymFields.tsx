import type { Gym } from '../../types/gym.types';
export const gymFields = [
  ['gym_name', 'Tên phòng Gym', 'text'], ['address', 'Địa chỉ', 'text'], ['phone', 'Điện thoại', 'tel'],
  ['email', 'Email', 'email'], ['latitude', 'Vĩ độ', 'number'], ['longitude', 'Kinh độ', 'number'],
  ['logo_url', 'URL logo', 'url'], ['opening_time', 'Giờ mở cửa', 'time'], ['closing_time', 'Giờ đóng cửa', 'time'],
] as const;
export const GymFields = ({ gym }: { gym?: Gym }) => <><div className="gym-form-grid">{gymFields.map(([name, label, type]) => <label className="form-group" key={name}>{label}<input className="form-input" name={name} type={type} defaultValue={gym?.[name]?.slice(0, type === 'time' ? 5 : undefined) || ''} required={name === 'gym_name' || name === 'address'} maxLength={name === 'phone' ? 20 : name === 'email' ? 254 : undefined} step={type === 'number' ? 'any' : undefined} min={name === 'latitude' ? -90 : name === 'longitude' ? -180 : undefined} max={name === 'latitude' ? 90 : name === 'longitude' ? 180 : undefined} pattern={type === 'url' ? 'https?://.+' : undefined} /></label>)}</div><label className="form-group">Mô tả<textarea className="form-textarea" name="description" defaultValue={gym?.description || ''} /></label></>;
