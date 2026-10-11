import { useId, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { ptService } from '../../services/pt.service';
import { PackageQueryState } from '../../components/package/PackageQueryState';
import { CustomerAppointmentDetail } from './CustomerAppointmentDetail';
import { vietnamDay, shiftDay, weekStart, intersectsDay, calendarDate, calendarTime, appointmentStates } from './calendar-time';
import type { Appointment } from '../../types/pt.types';
export const CustomerCalendar = ({ disabled = false }: { disabled?: boolean }) => {
  const { user } = useAuth(); const prefix = useId();
  const [view, setView] = useState<'list' | 'day' | 'week'>('list');
  const [day, setDay] = useState(vietnamDay()); const [gym, setGym] = useState(''); const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const result = useQuery({ queryKey: ['pt', user?.user_id, 'customer-calendar'], queryFn: ({ signal }) => ptService.calendarAppointments(signal) });
  const rows = (result.data ?? []).filter(a => a.registration.customer.user_id === user?.user_id);
  const gyms = [...new Map(rows.map(a => [a.registration.gym.gym_id, a.registration.gym.gym_name])).entries()].sort((a, b) => a[1].localeCompare(b[1], 'vi'));
  const effectiveGym = gyms.some(([id]) => id === gym) ? gym : '';
  const filtered = rows.filter(a => (!effectiveGym || a.registration.gym.gym_id === effectiveGym) && (!status || a.status === status));
  const days = view === 'week' ? Array.from({ length: 7 }, (_, i) => shiftDay(weekStart(day), i)) : [day];
  const selectedRow = rows.find(a => a.appointment_id === selected);
  const event = (a: Appointment, segment?: string) => <article key={a.appointment_id} className={`pt-calendar-event pt-event-${a.status.toLowerCase()}`}>
    <button className="pt-event-button" disabled={disabled} onClick={() => setSelected(a.appointment_id)} aria-label={`Xem buổi tập ${a.registration.trainer.full_name || 'PT'}, ${calendarDate(vietnamDay(a.start_time))}, ${calendarTime(a.start_time)}, ${appointmentStates[a.status]}`}>
      <strong>{segment && vietnamDay(a.start_time) < segment ? 'Tiếp từ hôm trước' : calendarTime(a.start_time)} – {segment && Date.parse(a.end_time) > Date.parse(`${shiftDay(segment, 1)}T00:00:00+07:00`) ? 'Qua ngày sau' : calendarTime(a.end_time)}</strong>
      {view === 'list' && <span>{calendarDate(vietnamDay(a.start_time))} → {calendarDate(vietnamDay(a.end_time))}</span>}
      <span>{a.registration.trainer.full_name || 'Huấn luyện viên'}</span><span>{a.registration.gym.gym_name}</span><span className="pt-event-status">{appointmentStates[a.status]}</span>
    </button>
  </article>;
  return <section aria-label="Lịch tập hội viên"><div className="gym-heading"><h2>Lịch tập của tôi</h2><button className="btn-secondary" disabled={result.isFetching} onClick={() => void result.refetch()}>Làm mới lịch</button></div>
    <div className="gym-actions" role="group" aria-label="Kiểu xem lịch">{([['list', 'Danh sách'], ['day', 'Ngày'], ['week', 'Tuần']] as const).map(([key, label]) => <button key={key} className={view === key ? 'btn-primary' : 'btn-secondary'} aria-pressed={view === key} onClick={() => setView(key)}>{label}</button>)}</div>
    <div className="pt-calendar-toolbar"><div className="form-group"><label htmlFor={`${prefix}-gym`}>Gym</label><select id={`${prefix}-gym`} className="form-input" value={effectiveGym} onChange={e => setGym(e.target.value)}><option value="">Tất cả Gym</option>{gyms.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></div>
      <div className="form-group"><label htmlFor={`${prefix}-status`}>Trạng thái lịch</label><select id={`${prefix}-status`} className="form-input" value={status} onChange={e => setStatus(e.target.value)}><option value="">Tất cả trạng thái</option>{Object.entries(appointmentStates).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
      {view !== 'list' && <div className="form-group"><label htmlFor={`${prefix}-date`}>Ngày xem lịch</label><input id={`${prefix}-date`} className="form-input" type="date" value={day} min="0001-01-08" max="9999-12-24" onChange={e => { if (e.target.validity.valid && e.target.value) setDay(e.target.value); }} /></div>}
    </div>
    {view !== 'list' && <nav className="gym-actions" aria-label="Đổi ngày lịch"><button className="btn-secondary" disabled={day <= '0001-01-15'} onClick={() => setDay(shiftDay(day, view === 'week' ? -7 : -1))}>{view === 'week' ? 'Tuần trước' : 'Ngày trước'}</button><button className="btn-secondary" onClick={() => setDay(vietnamDay())}>Hôm nay</button><button className="btn-secondary" disabled={day >= '9999-12-17'} onClick={() => setDay(shiftDay(day, view === 'week' ? 7 : 1))}>{view === 'week' ? 'Tuần sau' : 'Ngày sau'}</button></nav>}
    <p>Giờ Việt Nam (UTC+7). Chọn buổi tập để xem chi tiết. Lịch chờ xác nhận cũng giữ chỗ.</p>
    <PackageQueryState pending={result.isPending} error={result.error} retry={result.refetch} />
    {result.data && !result.isError && <>{view === 'list' ? <div className="pt-calendar-list">{[...filtered].sort((a, b) => Date.parse(b.start_time) - Date.parse(a.start_time)).map(a => event(a))}{!filtered.length && <p>Không có buổi tập phù hợp với bộ lọc.</p>}</div> : <div className={`pt-calendar-grid pt-calendar-${view}`}>{days.map(d => { const appointments = filtered.filter(a => intersectsDay(a.start_time, a.end_time, d)).sort((a, b) => Date.parse(a.start_time) - Date.parse(b.start_time)); return <section key={d} className="pt-calendar-day" aria-label={calendarDate(d)}><h3>{calendarDate(d)}{d === vietnamDay() && <span className="pt-today">Hôm nay</span>}</h3>{appointments.map(a => event(a, d))}{!appointments.length && <p className="pt-calendar-empty">Không có lịch</p>}</section>; })}</div>}
      {selectedRow && <CustomerAppointmentDetail key={selectedRow.appointment_id} row={selectedRow} canChange={!disabled} close={() => setSelected(null)} />}
    </>}
  </section>;
};
