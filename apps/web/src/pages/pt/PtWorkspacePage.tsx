import { CustomerCalendar } from './CustomerCalendar';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ptService } from '../../services/pt.service';
import { useAuth } from '../../hooks/useAuth';
import { useManagerGymId } from '../gym/ManagerGymPage';
import { PackageQueryState } from '../../components/package/PackageQueryState';
import { MutationError, Pager } from '../../components/gym/GymUi';
import { AppointmentForm, ReasonForm, AvailabilityForm, usePtMutation } from './PtForms';
import { gymService } from '../../services/gym.service';
import type { Registration, Appointment } from '../../types/pt.types';
const stateNames = { ACTIVE: 'Đang phụ trách', PENDING: 'Chờ xác nhận', CONFIRMED: 'Đã xác nhận', COMPLETED: 'Đã hoàn thành', CANCELLED: 'Đã hủy' };
const time = (value: string) => new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
export const PtWorkspacePage = ({ mode = 'mine' }: { mode?: 'mine' | 'manager' | 'admin' }) => {
  const { user } = useAuth(); const assignedGym = useManagerGymId(); const { gymId: routeGym = '' } = useParams();
  const customerCalendar = mode === 'mine' && !!user?.roles.includes('CUSTOMER') && !user.roles.includes('PT');
  const gymId = mode === 'manager' ? assignedGym : mode === 'admin' ? routeGym : undefined;
  const [regPage, setRegPage] = useState(1); const [aptPage, setAptPage] = useState(1);
  const [booking, setBooking] = useState<Registration | null>(null); const [editing, setEditing] = useState<Appointment | null>(null);
  const [cancelling, setCancelling] = useState<Appointment | null>(null); const [ending, setEnding] = useState<Registration | null>(null);
  const regs = useQuery({ queryKey: ['pt', user?.user_id, gymId, 'registrations', regPage], queryFn: ({ signal }) => ptService.registrations(regPage, gymId, signal) });
  const apts = useQuery({ enabled: !customerCalendar, queryKey: ['pt', user?.user_id, gymId, 'appointments', aptPage], queryFn: ({ signal }) => ptService.appointments(aptPage, gymId, signal) });
  const action = usePtMutation(({ row, name }: { row: Appointment; name: 'confirm' | 'complete' }) => ptService.action(row, name, {}));
  const ownAssignment = user?.active_gym_assignments.find(a => a.assignment_type === 'PT');
  const ownTrainer = useQuery({ queryKey: ['gyms', 'public', ownAssignment?.gym_id, 'trainers', ownAssignment?.gym_trainer_id], enabled: mode === 'mine' && !!ownAssignment?.gym_trainer_id,
    queryFn: () => gymService.trainer(ownAssignment!.gym_id, ownAssignment!.gym_trainer_id!) });
  const staff = (r: Registration) => mode === 'manager' || (!!user?.roles.includes('PT') && r.trainer.user_id === user.user_id);
  const canBook = (r: Registration) => mode !== 'admin' && r.status === 'ACTIVE' && (staff(r) || r.customer.user_id === user?.user_id);
  const busyForm = !!booking || !!editing || !!cancelling || !!ending;
  return <><div className="gym-heading"><h1>{mode === 'mine' ? 'PT và lịch tập của tôi' : 'Đăng ký PT và lịch tập tại Gym'}</h1>{mode === 'manager' && <Link className="btn-primary" to={`/gyms/${gymId}/pt-register`}>Đăng ký PT hộ hội viên</Link>}</div>
    <p>Lịch hiển thị theo giờ Việt Nam. Các yêu cầu chờ xác nhận giữ chỗ; PT hoặc Manager sẽ xác nhận.</p>
    {mode === 'mine' && ownAssignment && <PackageQueryState pending={ownTrainer.isPending} error={ownTrainer.error} retry={ownTrainer.refetch} />}
    {mode === 'mine' && ownTrainer.data && <section className="gym-panel"><h2>Trạng thái nhận học viên của tôi</h2><AvailabilityForm key={`${ownTrainer.data.gym_trainer_id}-${ownTrainer.data.availability}`} gymId={ownTrainer.data.gym_id} trainerId={ownTrainer.data.gym_trainer_id} value={ownTrainer.data.availability} /></section>}
    <button className="btn-secondary" onClick={() => { void regs.refetch(); if (!customerCalendar) void apts.refetch(); }}>Làm mới danh sách</button>
    <h2>Đăng ký PT</h2><PackageQueryState pending={regs.isPending} error={regs.error} retry={regs.refetch} />
    {regs.data && !regs.isError && <>{regs.data.data.map(r => <article className="gym-management-row" key={r.registration_id}><div><h3>{r.trainer.full_name || 'PT'} · {r.customer.full_name || 'Hội viên'}</h3><p>{r.gym.gym_name} · {stateNames[r.status]}</p><p>Thẻ: {r.membership.start_date} đến {r.membership.end_date}</p>{r.note && <p>{r.note}</p>}</div><div className="gym-actions">
      {canBook(r) && <button className="btn-primary" disabled={busyForm} onClick={() => setBooking(r)}>Đặt lịch tập</button>}
      {mode !== 'mine' && r.status === 'ACTIVE' && <button className="btn-secondary" disabled={busyForm} onClick={() => setEnding(r)}>Kết thúc đăng ký / đổi PT</button>}</div></article>)}
      {!regs.data.data.length && <p>Chưa có đăng ký PT.</p>}<Pager pagination={regs.data.pagination} onPage={setRegPage} /></>}
    {booking && <AppointmentForm key={booking.registration_id} registration={booking} close={() => setBooking(null)} />}
    {ending && <ReasonForm title="Kết thúc đăng ký PT" run={reason => ptService.cancelRegistration(ending, reason)} close={() => setEnding(null)} />}
    {ending && <p>Cần xử lý hết lịch đang mở. Sau khi kết thúc, tạo đăng ký mới để đổi PT; lịch sử cũ được giữ nguyên.</p>}
    {customerCalendar ? <CustomerCalendar disabled={busyForm} /> : <>
    <h2>Lịch tập</h2><MutationError error={action.error} /><PackageQueryState pending={apts.isPending} error={apts.error} retry={apts.refetch} />
    {apts.data && !apts.isError && <>{apts.data.data.map(a => { const r = a.registration; const open = ['PENDING', 'CONFIRMED'].includes(a.status); const future = Date.parse(a.start_time) > Date.now();
      return <article className="gym-management-row" key={a.appointment_id}><div><h3>{r.customer.full_name || 'Hội viên'} · {r.trainer.full_name || 'PT'}</h3><p>{r.gym.gym_name}</p><p>{time(a.start_time)} – {time(a.end_time)}</p><span className="badge badge-role">{stateNames[a.status]}</span>{a.note && <p>{a.note}</p>}</div><div className="gym-actions">
        {mode !== 'admin' && open && future && <button className="btn-secondary" disabled={busyForm || action.isPending} onClick={() => setEditing(a)}>Dời lịch</button>}
        {mode !== 'admin' && open && (future || staff(r)) && <button className="btn-secondary" disabled={busyForm || action.isPending} onClick={() => setCancelling(a)}>Hủy lịch</button>}
        {mode !== 'admin' && staff(r) && future && a.status === 'PENDING' && <button className="btn-primary" disabled={action.isPending} onClick={() => action.mutate({ row: a, name: 'confirm' })}>Xác nhận lịch</button>}
        {mode !== 'admin' && staff(r) && a.status === 'CONFIRMED' && Date.parse(a.end_time) <= Date.now() && <button className="btn-primary" disabled={action.isPending} onClick={() => action.mutate({ row: a, name: 'complete' })}>Hoàn thành buổi tập</button>}</div></article>; })}
      {!apts.data.data.length && <p>Chưa có lịch tập.</p>}<Pager pagination={apts.data.pagination} onPage={setAptPage} /></>}
    </>}
    {editing && <AppointmentForm key={editing.appointment_id} registration={editing.registration} appointment={editing} close={() => setEditing(null)} />}
    {cancelling && <ReasonForm title="Hủy lịch tập" run={reason => ptService.action(cancelling, 'cancel', { note: reason })} close={() => setCancelling(null)} />}
  </>;
};
