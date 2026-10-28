import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { useGym } from '../../hooks/useGym';
import { useAuth } from '../../hooks/useAuth';
import { MutationError, QueryState } from '../../components/gym/GymUi';
import { consultationService } from '../../services/consultation.service';
import { ApiClientError } from '../../services/api-client';

const ConsultationForm = ({ gymId }: { gymId: string }) => {
  const { user } = useAuth(), dirty = useRef(false);
  const [name, setName] = useState(user?.profile?.full_name || ''), [phone, setPhone] = useState(user?.phone || '');
  const [content, setContent] = useState(''), [preferred, setPreferred] = useState('');
  const success = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!dirty.current) { setName(user?.profile?.full_name || ''); setPhone(user?.phone || ''); }
  }, [user?.user_id, user?.profile?.full_name, user?.phone]);
  const mutation = useMutation({ mutationFn: () => consultationService.create(gymId, {
    full_name: name.trim(), phone: phone.trim(), ...(content.trim() ? { content: content.trim() } : {}),
    ...(preferred.trim() ? { preferred_contact: preferred.trim() } : {}),
  }), retry: false, gcTime: 0 });
  useEffect(() => { if (mutation.isSuccess) success.current?.focus(); }, [mutation.isSuccess]);
  if (mutation.isSuccess) return <div ref={success} tabIndex={-1} role="status" className="gym-panel">
    <h2>Đã gửi yêu cầu tư vấn</h2><p>{mutation.data.message}</p><Link to={`/gyms/${gymId}`}>Về trang Gym</Link>
  </div>;
  return <form className="gym-panel" onSubmit={e => { e.preventDefault(); if (!mutation.isPending && name.trim().length >= 2 && phone.trim()) mutation.mutate(); }}>
    <fieldset disabled={mutation.isPending} className="gym-fieldset"><legend>Thông tin liên hệ</legend>
      <label className="form-group">Họ tên<input className="form-input" autoComplete="name" required minLength={2} maxLength={100} value={name} onChange={e => { dirty.current = true; setName(e.target.value); }} /></label>
      <label className="form-group">Số điện thoại<input className="form-input" type="tel" autoComplete="tel" required maxLength={20} value={phone} onChange={e => { dirty.current = true; setPhone(e.target.value); }} /></label>
      <label className="form-group">Bạn muốn tư vấn về gì? (không bắt buộc)<textarea className="form-textarea" maxLength={2000} value={content} onChange={e => setContent(e.target.value)} placeholder="Ví dụ: gói tập, tập thử hoặc tập cùng PT." /></label>
      <label className="form-group">Thời gian tiện liên hệ (không bắt buộc)<input className="form-input" maxLength={200} value={preferred} onChange={e => setPreferred(e.target.value)} placeholder="Ví dụ: sau 18h các ngày trong tuần." /></label>
      <p>Gym sẽ liên hệ để trao đổi. Thời gian bạn ghi là nguyện vọng, chưa phải lịch hẹn được xác nhận.</p>
      <button className="btn-primary" disabled={!name.trim() || !phone.trim() || mutation.isPending}>{mutation.isPending ? 'Đang gửi…' : 'Gửi yêu cầu tư vấn'}</button>
    </fieldset>
    <MutationError error={mutation.error} />
    {mutation.error instanceof ApiClientError && mutation.error.statusCode === 0 && <p role="alert">Chưa xác định kết quả gửi. Hãy liên hệ Gym để kiểm tra trước khi gửi lại.</p>}
    {mutation.error instanceof ApiClientError && mutation.error.statusCode === 401 && <p><Link to="/login">Đăng nhập lại</Link> để kiểm tra phiên và gửi yêu cầu.</p>}
  </form>;
};
export const ConsultationPage = () => {
  const { gymId = '' } = useParams(), gym = useGym(gymId);
  if (!gym.data || gym.isError) return <QueryState pending={gym.isPending} error={gym.error} retry={gym.refetch} />;
  return <><Link to={`/gyms/${gymId}`}>Về trang Gym</Link><h1>Đăng ký tư vấn</h1><p>{gym.data.gym_name} · {gym.data.address}</p>
    <p>Để lại thông tin để Gym liên hệ. Bạn không cần tài khoản hoặc thẻ hội viên.</p><ConsultationForm key={gymId} gymId={gymId} /></>;
};
