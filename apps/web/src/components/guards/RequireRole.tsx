import { Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
export const RequireRole = ({ roles }: { roles: string[] }) => {
  const { user } = useAuth();
  if (!roles.some(role => user?.roles.includes(role))) return <div role="alert" className="gym-panel"><h1>Không có quyền truy cập</h1><p>Vai trò hiện tại không được sử dụng chức năng này.</p></div>;
  return <Outlet />;
};
