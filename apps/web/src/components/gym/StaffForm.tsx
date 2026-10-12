import { useState } from 'react';
import { gymService } from '../../services/gym.service';
import { useGymMutation } from '../../hooks/useGym';
import type { ProvisionResult } from '../../types/gym.types';
import { MutationError } from './GymUi';

export const StaffForm = ({ gymId, kind, blocked = false }: { gymId: string; kind: 'MANAGER' | 'PT'; blocked?: boolean }) => {
  const [mode, setMode] = useState('assign');
  const [credential, setCredential] = useState<ProvisionResult | null>(null);
  const [saved, setSaved] = useState(false);
  const mutation = useGymMutation(async (body: Record<string, string | number>) => {
    if (kind === 'MANAGER') return mode === 'assign' ? gymService.assignManager(gymId, String(body.user_id)) : gymService.provisionManager(gymId, body);
    return mode === 'assign' ? gymService.assignTrainer(gymId, body) : gymService.provisionTrainer(gymId, body);
  });
  return <form className="gym-panel" onSubmit={e => {
    e.preventDefault();
    if (mutation.isPending || blocked) return;
    setCredential(null); setSaved(false);
    const form = new FormData(e.currentTarget);
    const body: Record<string, string | number> = {};
    for (const [key, value] of form.entries()) {
      if (String(value).trim()) body[key] = key === 'experience_years' ? Number(value) : String(value).trim();
    }
    mutation.mutate(body, { onSuccess: result => {
      setSaved(true);
      if (result && typeof result === 'object' && 'temporary_password' in result) setCredential(result as ProvisionResult);
      mutation.reset(); // Credentials stay only in this mounted form; clear mutation cache immediately.
    } });
  }}><h2>{kind === 'MANAGER' ? 'Bổ nhiệm Manager' : 'Tiếp nhận PT'}</h2><p>Phòng Gym: {gymId}</p>{blocked && <p className="alert-banner alert-info">Cơ sở đã có Manager đang được phân công. Thu hồi phân công hiện tại trước khi bổ nhiệm người khác.</p>}<label className="form-group">Cách tiếp nhận<select className="form-input" value={mode} disabled={mutation.isPending || blocked} onChange={e => { setMode(e.target.value); setCredential(null); setSaved(false); mutation.reset(); }}><option value="assign">Gán tài khoản có sẵn</option><option value="provision">Cấp tài khoản mới</option></select></label>
    <MutationError error={mutation.error} />{saved && <p role="status">Phân công đã được lưu.</p>}
    {credential && <div className="gym-credentials"><p>Mật khẩu tạm chỉ hiển thị trong lần cấp này. Hãy bàn giao cho {credential.user.email}.</p><output aria-label="Mật khẩu tạm">{credential.temporary_password}</output><button type="button" className="btn-secondary" onClick={() => setCredential(null)}>Đã bàn giao, ẩn mật khẩu</button></div>}
    <fieldset className="gym-fieldset" disabled={mutation.isPending || blocked}><div className="gym-form-grid" key={mode}>{mode === 'assign' ? <label className="form-group">User ID<input className="form-input" name="user_id" required pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}" /></label> : <><label className="form-group">Họ và tên<input className="form-input" name="full_name" required minLength={2} maxLength={100} /></label><label className="form-group">Email<input className="form-input" name="email" type="email" required maxLength={254} /></label><label className="form-group">Điện thoại<input className="form-input" name="phone" type="tel" pattern="(\+84|0)[35789][0-9]{8}" /></label></>}
      {kind === 'PT' && <><label className="form-group">Chuyên môn<input className="form-input" name="specialization" /></label><label className="form-group">Số năm kinh nghiệm<input className="form-input" name="experience_years" type="number" min={0} max={2147483647} step={1} /></label><label className="form-group">Tiểu sử<textarea className="form-textarea" name="bio" /></label></>}</div><button className="btn-primary">{mutation.isPending ? 'Đang gửi…' : mode === 'assign' ? 'Lưu phân công' : 'Cấp tài khoản'}</button></fieldset>
  </form>;
};
