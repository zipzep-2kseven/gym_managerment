import type { PageResult } from '../../types/gym.types';
import type { PtMembershipChoice } from '../../services/pt.service';
import { paymentService } from '../../services/payment.service';
import { useId, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { gymService } from '../../services/gym.service';
import { ptService } from '../../services/pt.service';
import { useAuth } from '../../hooks/useAuth';
import { PackageQueryState } from '../../components/package/PackageQueryState';
import { MutationError, Pager } from '../../components/gym/GymUi';
import { availabilityNames, usePtMutation } from './PtForms';
export const RegisterPtPage = () => {
  const trainerInputId = useId(); const membershipInputId = useId();
  const { gymId = '' } = useParams(); const [params] = useSearchParams(); const { user } = useAuth();
  const manager = user?.roles.includes('MANAGER');
  const [member, setMember] = useState(params.get('membership') || ''); const [trainer, setTrainer] = useState('');
  const [membershipPage, setMembershipPage] = useState(1);
  const members = useQuery<PageResult<PtMembershipChoice>>({ queryKey: ['pt', user?.user_id, gymId, 'membership-choice', membershipPage, manager], queryFn: ({ signal }) => manager ? ptService.memberships(gymId, membershipPage, signal) : paymentService.memberships(membershipPage, signal) });
  const day = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const choices = members.data?.data.filter(m => m.gym_id === gymId && m.status === 'ACTIVE' && m.start_date <= day && m.end_date >= day) ?? [];
  const [note, setNote] = useState(''); const [agreed, setAgreed] = useState(false); const [page, setPage] = useState(1);
  const trainers = useQuery({ queryKey: ['gyms', 'public', gymId, 'trainers', page], queryFn: () => gymService.trainers(gymId, { page, pageSize: 20, sortBy: 'full_name', sortOrder: 'asc' }) });
  const mutation = usePtMutation((body: { membership_id: string; gym_trainer_id: string; note?: string }) => ptService.register(gymId, body));
  return <><Link to="/memberships">Thẻ hội viên</Link><h1>Đăng ký tập với PT</h1><p>Chọn PT tại Gym của thẻ sau khi đã trao đổi và thống nhất. Không phát sinh thanh toán PT trên hệ thống.</p>
    <PackageQueryState pending={trainers.isPending} error={trainers.error} retry={trainers.refetch} />
    <PackageQueryState pending={members.isPending} error={members.error} retry={members.refetch} />
    {mutation.isSuccess ? <section className="gym-panel" role="status"><h2>Đã đăng ký PT</h2><Link className="btn-primary" to={manager ? '/manager/pt' : '/my-pt'}>Xem đăng ký và đặt lịch</Link></section> : trainers.data && !trainers.isError && members.data && !members.isError && <form className="gym-panel gym-form" onSubmit={e => { e.preventDefault(); if (!mutation.isPending) mutation.mutate({ membership_id: member, gym_trainer_id: trainer, ...(note.trim() ? { note: note.trim() } : {}) }); }}>
      <fieldset disabled={mutation.isPending} className="border-0 m-0 p-0 min-w-0"><label className="form-group" htmlFor={membershipInputId}>Thẻ hội viên</label><select id={membershipInputId} className="form-input" required value={member} onChange={e => setMember(e.target.value)}><option value="">Chọn thẻ còn hạn tại Gym</option>
      {!!params.get('membership') && !choices.some(m => m.membership_id === params.get('membership')) && !manager && <option value={params.get('membership')!}>Thẻ đã chọn từ danh sách hội viên</option>}
      {choices.map(m => <option key={m.membership_id} value={m.membership_id}>{'customer' in m && m.customer ? m.customer.full_name || 'Hội viên' : 'Thẻ hội viên'} · {'package' in m && m.package ? m.package.package_name : 'Gói tập'} · {m.start_date} đến {m.end_date}</option>)}</select>
      <label className="form-group" htmlFor={trainerInputId}>Huấn luyện viên</label><select id={trainerInputId} className="form-input" required value={trainer} onChange={e => setTrainer(e.target.value)}><option value="">Chọn PT</option>{trainers.data.data.map(pt => <option key={pt.gym_trainer_id} value={pt.gym_trainer_id} disabled={pt.availability === 'NOT_ACCEPTING'}>{pt.profile?.full_name || 'Huấn luyện viên'} · {availabilityNames[pt.availability]}</option>)}</select>
      <label className="form-group">Ghi chú<textarea className="form-input" maxLength={2000} value={note} onChange={e => setNote(e.target.value)} /></label>
      <label className="gym-actions"><input type="checkbox" required checked={agreed} onChange={e => setAgreed(e.target.checked)} />Tôi xác nhận hội viên và PT đã trao đổi, thống nhất việc tập luyện.</label></fieldset>
      <MutationError error={mutation.error} /><button className="btn-primary" disabled={mutation.isPending || !agreed || !trainer}>Đăng ký PT</button>
    </form>}
    {members.data && !mutation.isSuccess && <><p>Trang thẻ hội viên</p><Pager pagination={members.data.pagination} onPage={n => { if (!mutation.isPending) { setMembershipPage(n); setMember(''); } }} /></>}
    {trainers.data && <Pager pagination={trainers.data.pagination} onPage={n => { setPage(n); setTrainer(''); }} />}
  </>;
};
