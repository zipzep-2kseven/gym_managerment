import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export const GymLayout = () => {
  const { user, isAuthenticated, logout } = useAuth();
  return <div className="gym-shell"><a className="skip-link" href="#gym-main">Đến nội dung chính</a>
    <header className="gym-header"><Link className="gym-brand" to="/">MULTI<span>GYM</span></Link><nav className="gym-actions gap-4" aria-label="Điều hướng chính">
      <Link to="/gyms">Khám phá Gym</Link>
      {user?.active_gym_assignments.find(item => item.assignment_type === 'MANAGER')?.gym_name && <span>{user.active_gym_assignments.find(item => item.assignment_type === 'MANAGER')?.gym_name}</span>}
      {user?.roles.includes('ADMIN') && <Link to="/admin/gyms">Quản trị</Link>}
      {user?.roles.includes('MANAGER') && <Link to="/manager/gym">Quản lý Gym</Link>}
      {isAuthenticated ? <><Link to="/profile">{user?.profile?.full_name || 'Hồ sơ cá nhân'}</Link><button className="btn-secondary" onClick={() => void logout()}>Đăng xuất</button></> : <><Link to="/login">Đăng nhập</Link><Link className="btn-secondary" to="/register">Đăng ký</Link></>}
    </nav></header>
    <main id="gym-main" className="gym-main"><Outlet /></main><footer className="gym-footer">Multi-Gym · Tìm không gian tập luyện phù hợp với bạn.</footer>
  </div>;
};
