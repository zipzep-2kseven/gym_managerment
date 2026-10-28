import { useId, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { ApiClientError } from '../../services/api-client';
import { MutationError } from '../../components/gym/GymUi';
import { ptService } from '../../services/pt.service';
import type { Registration, Appointment, Availability } from '../../types/pt.types';
export const availabilityNames: Record<Availability, string> = { ACCEPTING: 'Đang nhận học viên', ALMOST_FULL: 'Sắp đủ học viên', NOT_ACCEPTING: 'Ngừng nhận học viên mới' };
export const usePtMutation = <T,>(fn: (value: T) => Promise<unknown>, done?: () => void) => {
  const cache = useQueryClient(); const { refreshSession } = useAuth();
  return useMutation({ mutationFn: fn, retry: false, onSuccess: async () => {
    await Promise.all([cache.invalidateQueries({ queryKey: ['pt'] }), cache.invalidateQueries({ queryKey: ['gyms'] }), cache.invalidateQueries({ queryKey: ['trainer-profile'] })]); done?.();
  }, onError: async error => { if (error instanceof ApiClientError && [401, 403].includes(error.statusCode)) await refreshSession(); if (error instanceof ApiClientError && error.statusCode === 0) await cache.invalidateQueries({ queryKey: ['pt'] }); } });
};
export const AvailabilityForm = ({ gymId, trainerId, value }: { gymId: string; trainerId: string; value: Availability }) => {
  const id = useId(); const [chosen, setChosen] = useState(value);
  const mutation = usePtMutation((availability: Availability) => ptService.availability(gymId, trainerId, availability));
  return <form className="gym-toolbar" onSubmit={e => { e.preventDefault(); mutation.mutate(chosen); }}>
    <label className="form-group" htmlFor={id}>Nhận học viên mới</label><select id={id} className="form-input" value={chosen} disabled={mutation.isPending} onChange={e => setChosen(e.target.value as Availability)}>
      {Object.entries(availabilityNames).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
    <button className="btn-secondary" disabled={mutation.isPending || chosen === value}>Lưu trạng thái nhận học viên</button>
    <MutationError error={mutation.error} />{mutation.isSuccess && <p role="status">Đã lưu trạng thái nhận học viên.</p>}
  </form>;
};
// The form explicitly uses Vietnam wall time, independent of the browser timezone.
export const vietnamInput = (iso: string) => new Date(Date.parse(iso) + 7 * 3600000).toISOString().slice(0, 16);
export const AppointmentForm = ({ registration, appointment, close }: { registration: Registration; appointment?: Appointment; close: () => void }) => {
  const [start, setStart] = useState(appointment ? vietnamInput(appointment.start_time) : '');
  const [end, setEnd] = useState(appointment ? vietnamInput(appointment.end_time) : '');
  const [note, setNote] = useState('');
  const mutation = usePtMutation((body: { start_time: string; end_time: string; note?: string }) => appointment ? ptService.action(appointment, 'reschedule', body) : ptService.createAppointment(registration, body), close);
  return <form className="gym-panel gym-form" onSubmit={e => { e.preventDefault(); if (!mutation.isPending) mutation.mutate({ start_time: `${start}:00+07:00`, end_time: `${end}:00+07:00`, ...(note.trim() ? { note: note.trim() } : {}) }); }}>
    <h2>{appointment ? 'Dời lịch tập' : 'Yêu cầu lịch tập'}</h2><p>Giờ Việt Nam (UTC+7). Lịch cần PT hoặc Manager xác nhận.</p>
    <fieldset disabled={mutation.isPending} className="gym-form-grid border-0 m-0 p-0 min-w-0"><label className="form-group">Bắt đầu<input type="datetime-local" className="form-input" required value={start} onChange={e => setStart(e.target.value)} /></label>
      <label className="form-group">Kết thúc<input type="datetime-local" className="form-input" required value={end} onChange={e => setEnd(e.target.value)} /></label>
      <label className="form-group">Ghi chú<textarea className="form-input" maxLength={2000} value={note} onChange={e => setNote(e.target.value)} /></label></fieldset>
    <MutationError error={mutation.error} /><div className="gym-actions"><button className="btn-primary" disabled={mutation.isPending}>{mutation.isPending ? 'Đang gửi…' : 'Gửi yêu cầu lịch'}</button><button type="button" className="btn-secondary" disabled={mutation.isPending} onClick={close}>Đóng</button></div>
  </form>;
};
export const ReasonForm = ({ title, run, close }: { title: string; run: (reason: string) => Promise<unknown>; close: () => void }) => {
  const [reason, setReason] = useState(''); const mutation = usePtMutation(run, close);
  return <form className="gym-panel" onSubmit={e => { e.preventDefault(); if (!mutation.isPending) mutation.mutate(reason.trim()); }}><h2>{title}</h2>
    <label className="form-group">Lý do<textarea className="form-input" required maxLength={2000} disabled={mutation.isPending} value={reason} onChange={e => setReason(e.target.value)} /></label>
    <MutationError error={mutation.error} /><div className="gym-actions"><button className="btn-primary" disabled={mutation.isPending || !reason.trim()}>Xác nhận</button><button type="button" className="btn-secondary" disabled={mutation.isPending} onClick={close}>Đóng</button></div></form>;
};
