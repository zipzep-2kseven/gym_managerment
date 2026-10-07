import { Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
export const GymScopeGuard = () => {
  const { user } = useAuth();
  if (!user?.active_gym_assignments.some(assignment => assignment.assignment_type === 'MANAGER')) return <div className="gym-panel" role="alert"><h1>Chưa có phân công Gym</h1><p>Vui lòng liên hệ Admin để kiểm tra phân công quản lý.</p></div>;
  return <Outlet />;
};
