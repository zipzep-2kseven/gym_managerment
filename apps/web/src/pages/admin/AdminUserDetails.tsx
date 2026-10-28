import { Link } from 'react-router-dom';
import { AdminDialog } from '../../components/admin/AdminDialog';
import { accountStatusLabel, type AdminUser } from '../../services/admin-user.service';
export const AdminUserDetails = ({ row, onClose }: { row: AdminUser; onClose: () => void }) => <AdminDialog title="Chi tiết tài khoản" drawer onClose={onClose}>
  <dl className="admin-gym-facts">
    <dt>Họ tên</dt><dd>{row.profile?.full_name || 'Chưa cập nhật'}</dd>
    <dt>Email</dt><dd>{row.email}</dd><dt>Điện thoại</dt><dd>{row.phone || 'Chưa cập nhật'}</dd>
    <dt>Vai trò</dt><dd>{row.roles.join(', ') || 'Chưa có vai trò'}</dd>
    <dt>Trạng thái</dt><dd>{accountStatusLabel[row.status]}</dd>
    <dt>Xác thực email</dt><dd>{row.email_verified_at ? 'Đã xác thực' : 'Chưa xác thực'}</dd>
    <dt>Mật khẩu</dt><dd>{row.must_change_password ? 'Cần đổi mật khẩu tạm' : 'Không yêu cầu đổi mật khẩu'}</dd>
    <dt>Ngày đăng ký</dt><dd>{new Date(row.created_at).toLocaleString('vi-VN', { timeZone: 'Asia/Bangkok' })}</dd>
  </dl>
  <h3>Phân công đang hoạt động</h3>
  {row.active_gym_assignments.length ? <ul>{row.active_gym_assignments.map(a => <li key={`${a.gym_id}-${a.assignment_type}`}>
    <Link to={`/admin/gyms/${a.gym_id}/staff`}>{a.gym_name}</Link> · {a.assignment_type === 'MANAGER' ? 'Manager' : 'PT'}
  </li>)}</ul> : <p>Không có phân công nội bộ Gym.</p>}
</AdminDialog>;
