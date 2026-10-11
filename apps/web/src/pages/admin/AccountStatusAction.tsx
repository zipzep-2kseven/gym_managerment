import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { ApiClientError } from '../../services/api-client';
import { adminUserService, type AdminUser } from '../../services/admin-user.service';
export const AccountStatusAction = ({row, done}: {row: AdminUser; done: () => Promise<void>}) => {
  const [confirm, setConfirm] = useState(false), {refreshSession} = useAuth();
  const next = row.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
  const label = next === 'SUSPENDED' ? 'Khóa tạm tài khoản' : 'Mở lại tài khoản';
  const mutation = useMutation({mutationFn: () => adminUserService.status(row, next), retry: false,
    onSuccess: async () => {setConfirm(false); await done();},
    onError: async error => {if (error instanceof ApiClientError && [401,403].includes(error.statusCode)) await refreshSession();},
  });
  if (row.roles.includes('ADMIN')) return <p>Tài khoản Admin được bảo vệ.</p>;
  if (!confirm) return <button className="btn-secondary" onClick={() => {mutation.reset(); setConfirm(true);}}>{label}</button>;
  return <div className="account-confirm">
    <p><strong>{label} cho {row.profile?.full_name || row.email}?</strong></p>
    <p>{next === 'SUSPENDED' ? 'Người dùng sẽ không thể truy cập tài khoản. Thẻ hội viên, lịch tập và phân công hiện có vẫn được giữ.' : 'Người dùng có thể đăng nhập lại; trạng thái thẻ, lịch tập và yêu cầu đổi mật khẩu được giữ nguyên.'}</p>
    {next === 'SUSPENDED' && row.active_gym_assignments.some(a => a.assignment_type === 'MANAGER') && <p>Nếu cần người tiếp quản Gym, hãy bổ nhiệm Manager tại màn quản trị Gym.</p>}
    <div className="gym-actions"><button className="btn-primary" disabled={mutation.isPending || mutation.isError} onClick={() => mutation.mutate()}>{mutation.isPending ? 'Đang lưu…' : 'Xác nhận'}</button><button className="btn-secondary" disabled={mutation.isPending} onClick={() => {setConfirm(false); mutation.reset();}}>Hủy thao tác</button></div>
    {mutation.error && <div role="alert" className="alert-banner alert-error"><p>{mutation.error.message}</p><p>Tải lại danh sách để kiểm tra trạng thái trước khi thử lại.</p></div>}
  </div>;
};
