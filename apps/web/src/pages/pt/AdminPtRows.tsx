import type { Appointment, Registration } from '../../types/pt.types';
const labels = { ACTIVE: 'Đang phụ trách', PENDING: 'Chờ xác nhận', CONFIRMED: 'Đã xác nhận', COMPLETED: 'Đã hoàn thành', CANCELLED: 'Đã hủy' };
const name = (value: string | null, fallback: string) => value?.trim() || fallback;
const time = (value: string) => new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
export const AdminRegistrationRow = ({ row, disabled, open }: { row: Registration; disabled: boolean; open: (row: Registration, button: HTMLButtonElement) => void }) => <article className="gym-management-row admin-pt-row">
  <div><h3>{name(row.customer.full_name, 'Hội viên chưa có tên')} · {name(row.trainer.full_name, 'PT chưa có tên')}</h3>
    <span className="badge badge-role">{labels[row.status]}</span><p>Đăng ký: {row.registration_id}</p><p>Thẻ: {row.membership_id}</p>
    <p>Thời hạn thẻ: <time dateTime={row.membership.start_date}>{row.membership.start_date}</time> – <time dateTime={row.membership.end_date}>{row.membership.end_date}</time></p>
    {row.note && <p className="gym-preserve">Ghi chú: {row.note}</p>}
  </div>{row.status === 'ACTIVE' && <button className="btn-secondary" disabled={disabled} onClick={event => open(row, event.currentTarget)}>Kết thúc đăng ký / đổi PT</button>}
</article>;
export const AdminAppointmentRow = ({ row }: { row: Appointment }) => <article className="gym-management-row admin-pt-row">
  <div><h3>{name(row.registration.customer.full_name, 'Hội viên chưa có tên')} · {name(row.registration.trainer.full_name, 'PT chưa có tên')}</h3>
    <span className="badge badge-role">{labels[row.status]}</span><p><time dateTime={row.start_time}>{time(row.start_time)}</time> – <time dateTime={row.end_time}>{time(row.end_time)}</time></p>
    <p>Lịch: {row.appointment_id}</p><p>Đăng ký: {row.registration_id}</p>{row.note && <p className="gym-preserve">Ghi chú: {row.note}</p>}
  </div>
</article>;
