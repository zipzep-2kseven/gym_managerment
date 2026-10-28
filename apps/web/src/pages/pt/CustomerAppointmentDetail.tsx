import { useEffect, useId, useRef, useState } from 'react';
import type { Appointment } from '../../types/pt.types';
import { AppointmentForm, ReasonForm } from './PtForms';
import { ptService } from '../../services/pt.service';
import { appointmentStates } from './calendar-time';
export const CustomerAppointmentDetail = ({ row, close, canChange }: { row: Appointment; close: () => void; canChange: boolean }) => {
  const dialog = useRef<HTMLDialogElement>(null); const heading = useId();
  const [action, setAction] = useState<'view' | 'reschedule' | 'cancel'>('view');
  const change = canChange && ['PENDING', 'CONFIRMED'].includes(row.status) && Date.parse(row.start_time) > Date.now();
  useEffect(() => { const el = dialog.current; const previous = document.activeElement; el?.showModal();
    return () => { el?.close(); if (previous instanceof HTMLElement && previous.isConnected) previous.focus(); };
  }, []);
  const time = (v: string) => new Date(v).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  return <dialog ref={dialog} className="pt-calendar-detail" aria-labelledby={heading} onCancel={e => { e.preventDefault(); if (action === 'view') close(); }}>
    <div className="gym-heading"><h2 id={heading}>Chi tiết buổi tập</h2>{action === 'view' && <button className="btn-secondary" onClick={close}>Đóng chi tiết</button>}</div>
    <p><strong>{row.registration.trainer.full_name || 'Huấn luyện viên'}</strong> · {row.registration.gym.gym_name}</p>
    <p>{time(row.start_time)} – {time(row.end_time)} (giờ Việt Nam)</p><span className="badge badge-role">{appointmentStates[row.status]}</span>
    {row.note && <p className="gym-preserve">{row.note}</p>}
    {action === 'view' && <>{change ? <div className="gym-actions"><button className="btn-secondary" onClick={() => setAction('reschedule')}>Dời lịch</button><button className="btn-secondary" onClick={() => setAction('cancel')}>Hủy lịch</button></div> : <p>Chỉ có thể dời hoặc hủy buổi đang chờ xác nhận/đã xác nhận và chưa bắt đầu. Liên hệ PT hoặc Manager nếu cần hỗ trợ.</p>}</>}
    {action === 'reschedule' && <AppointmentForm registration={row.registration} appointment={row} close={() => setAction('view')} />}
    {action === 'cancel' && <ReasonForm title="Hủy lịch tập" run={note => ptService.action(row, 'cancel', { note })} close={() => setAction('view')} />}
  </dialog>;
};
