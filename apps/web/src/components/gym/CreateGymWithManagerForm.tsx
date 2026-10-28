import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useGymMutation } from '../../hooks/useGym';
import { gymService } from '../../services/gym.service';
import { ApiClientError } from '../../services/api-client';
import type { CreateGymWithManagerInput, CreateGymWithManagerResult } from '../../types/gym.types';
import { MutationError } from './GymUi';
import { GymFields, gymFields } from './GymFields';

export const CreateGymWithManagerForm = () => {
  const formRef = useRef<HTMLFormElement>(null);
  const resultRef = useRef<HTMLElement>(null);
  const [created, setCreated] = useState<{ gymId: string; gymName: string; email: string; password: string | null } | null>(null);
  useEffect(() => { if (created?.gymId) resultRef.current?.focus(); }, [created?.gymId]);
  const mutation = useGymMutation((body: CreateGymWithManagerInput) => gymService.createWithManager(body), { gcTime: 0, affectsAccounts: true });
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (mutation.isPending || created) return;
    const form = new FormData(event.currentTarget);
    const text = (name: string) => String(form.get(name) || '').trim();
    const body = { ...Object.fromEntries(gymFields.map(([name]) => [name, text(name) || null])),
      description: String(form.get('description') || '') || null,
      manager: { full_name: text('manager_full_name'), email: text('manager_email'), phone: text('manager_phone') || null },
    } as CreateGymWithManagerInput;
    mutation.mutate(body, { onSuccess: value => {
      const result = value as CreateGymWithManagerResult;
      // Only mounted form state retains the handoff credential; no Query/WebStorage persistence.
      setCreated({ gymId: result.gym_id, gymName: result.gym_name, email: result.manager.user.email, password: result.manager.temporary_password });
      mutation.reset();
    } });
  };
  return <form ref={formRef} className="gym-panel" onSubmit={submit}>
    <MutationError error={mutation.error} />
    {mutation.error instanceof ApiClientError && mutation.error.statusCode === 0 && <p role="alert">Chưa xác định kết quả tạo cơ sở. Hãy kiểm tra danh sách Gym và phân công Manager trước khi gửi lại.</p>}
    {created && <section ref={resultRef} tabIndex={-1} aria-label="Kết quả tạo cơ sở"><p className="alert-banner alert-success" role="status">Đã tạo {created.gymName} và tài khoản Manager {created.email}.</p>
      {created.password && <div className="gym-credentials"><p>Mật khẩu tạm chỉ hiển thị trong lần tạo này. Hãy bàn giao cho {created.email}. Manager phải đổi mật khẩu khi đăng nhập lần đầu.</p><output aria-label="Mật khẩu tạm">{created.password}</output><button type="button" className="btn-secondary" onClick={() => setCreated({ ...created, password: null })}>Đã bàn giao, ẩn mật khẩu</button></div>}
      <div className="gym-actions"><Link className="btn-secondary" to={`/admin/gyms/${created.gymId}`}>Xem cơ sở vừa tạo</Link><button type="button" className="btn-secondary" onClick={() => { setCreated(null); mutation.reset(); formRef.current?.reset(); }}>Tạo cơ sở khác</button></div>
    </section>}
    <fieldset disabled={mutation.isPending || !!created} className="gym-fieldset">
      <h2>Thông tin phòng Gym</h2><GymFields />
      <h2>Thông tin Manager</h2><p>Email dùng để đăng nhập. Hệ thống sinh mật khẩu tạm sau khi tạo thành công.</p>
      <div className="gym-form-grid"><label className="form-group">Họ và tên Manager<input className="form-input" name="manager_full_name" required minLength={2} maxLength={100} autoComplete="off" /></label>
        <label className="form-group">Email đăng nhập Manager<input className="form-input" name="manager_email" type="email" required maxLength={254} autoComplete="off" /></label>
        <label className="form-group">Điện thoại Manager<input className="form-input" name="manager_phone" type="tel" pattern="(\+84|0)[35789][0-9]{8}" autoComplete="off" /></label></div>
      <button className="btn-primary" type="submit">{mutation.isPending ? 'Đang lưu…' : 'Tạo cơ sở và Manager'}</button>
    </fieldset>
  </form>;
};
