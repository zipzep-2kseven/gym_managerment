import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAdminTrainerIntake } from '../../hooks/useAdminTrainerIntake';
import { StaffFields } from './StaffFields';
import { MutationError } from './GymUi';

export const AdminTrainerIntakeForm = ({ gymId, blocked, blockedReason }: { gymId: string; blocked: boolean; blockedReason?: string }) => {
  const intake = useAdminTrainerIntake(gymId);
  const feedback = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (intake.saved || intake.uncertain) feedback.current?.focus(); }, [intake.saved, intake.uncertain]);
  const pending = intake.mutation.isPending || intake.recovery.isFetching;
  return <form className="gym-panel admin-trainer-intake" aria-label="Thông tin tiếp nhận PT" aria-busy={pending} onSubmit={event => {
    event.preventDefault();
    if (!blocked && !pending) intake.submit(event.currentTarget);
  }}>
    <h2>Thông tin tiếp nhận</h2>
    <p>Gán tài khoản đang hoạt động có vai trò PT, hoặc cấp tài khoản PT mới cho cơ sở này.</p>
    {blocked && <p className="alert-banner alert-info">{blockedReason || 'Cơ sở đang ngừng hoạt động. Không thể gán hoặc cấp tài khoản PT.'}</p>}
    <label className="form-group">Cách tiếp nhận<select className="form-input" value={intake.mode} disabled={pending || blocked || intake.uncertain} onChange={event => intake.changeMode(event.target.value)}>
      <option value="assign">Gán tài khoản có sẵn</option><option value="provision">Cấp tài khoản mới</option>
    </select></label>
    <MutationError error={intake.mutation.error} />
    {intake.mutation.error && <p>Giữ nguyên thông tin để kiểm tra. Phân công đã tồn tại cần được tra cứu trong danh sách PT; tài khoản cần có vai trò PT và đang hoạt động.</p>}
    {intake.uncertain && <div className="alert-banner alert-info">
      <p ref={feedback} tabIndex={-1} role="status">Chưa xác định được kết quả lưu. Đọc lại phân công và tài khoản trước khi gửi lại.</p>
      <button type="button" className="btn-secondary" disabled={pending} onClick={() => void intake.reconcile()}>{intake.recovery.isFetching ? 'Đang đối soát…' : 'Đối soát kết quả'}</button>
      <MutationError error={intake.recovery.error} />
      {intake.recovery.data === 'account-only' && <p>Tài khoản đã tồn tại nhưng chưa thấy phân công tại cơ sở. Hãy kiểm tra tài khoản trước khi tiếp tục; không cấp lại.</p>}
      {intake.recovery.data === 'inactive' && <p>Phân công hiện đang ngừng hoạt động. Kiểm tra danh sách PT; không gán lại hoặc tự kích hoạt phân công.</p>}
    </div>}
    {!intake.uncertain && intake.recovery.data === 'absent' && !intake.saved && <p role="status">Chưa thấy kết quả sau khi đối soát. Kiểm tra thông tin rồi chủ động gửi lại nếu cần.</p>}
    {intake.saved && <p ref={feedback} tabIndex={-1} role="status">Phân công đã được lưu. {intake.mode === 'provision' && intake.recovery.data === 'assigned' && 'Không thể lấy lại mật khẩu tạm từ kết quả đối soát.'}</p>}
    {intake.credential && <section className="gym-credentials" aria-label="Bàn giao tài khoản PT">
      <h3>Bàn giao tài khoản</h3><p>Email: {intake.credential.user.email}</p>
      <p>Mật khẩu tạm chỉ hiển thị trong lần cấp này. PT phải đổi mật khẩu khi đăng nhập lần đầu; phân công mới chưa nhận học viên.</p>
      <output aria-label="Mật khẩu tạm">{intake.credential.temporary_password}</output>
      <button type="button" className="btn-secondary" onClick={() => { intake.hideCredential(); feedback.current?.focus(); }}>Đã bàn giao, ẩn mật khẩu</button>
    </section>}
    <fieldset className="gym-fieldset" disabled={pending || blocked || intake.saved || intake.uncertain}>
      <StaffFields key={intake.mode} mode={intake.mode} kind="PT" />
      <button className="btn-primary">{intake.mutation.isPending ? 'Đang gửi…' : intake.mode === 'assign' ? 'Lưu phân công' : 'Cấp tài khoản'}</button>
    </fieldset>
    <div className="gym-actions">
      {pending ? <button type="button" className="btn-secondary" disabled>Đang xử lý, vui lòng chờ</button> : <Link className="btn-secondary" to={`/admin/gyms/${gymId}/trainers`}>{intake.saved ? 'Xem danh sách PT' : 'Quay lại danh sách PT'}</Link>}
      {intake.uncertain && <Link className="btn-secondary" to="/admin/users">Tra cứu tài khoản</Link>}
    </div>
  </form>;
};
