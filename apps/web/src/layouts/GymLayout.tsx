import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export const GymLayout = () => {
  const { user, isAuthenticated, logout } = useAuth();
  return <div className="gym-shell"><a className="skip-link" href="#gym-main">Đến nội dung chính</a>
    <header className="gym-header"><Link className="gym-brand" to="/">MULTI<span>GYM</span></Link><nav className="gym-actions gap-4" aria-label="Điều hướng chính">
      <Link to="/gyms">Khám phá Gym</Link>
      {user?.active_gym_assignments.find(item => item.assignment_type === 'MANAGER')?.gym_name && <span>{user.active_gym_assignments.find(item => item.assignment_type === 'MANAGER')?.gym_name}</span>}
      {user?.roles.includes('PT') && <><Link to="/pt/dashboard">Tổng quan</Link><Link to="/pt/profile">Hồ sơ PT</Link></>}
      {user?.roles.includes('CUSTOMER') && <><Link to="/dashboard">Tổng quan</Link><Link to="/reports">Báo cáo sự cố</Link></>}
      {user?.roles.includes('MANAGER') && <Link to="/manager/dashboard">Tổng quan</Link>}
      {user?.roles.includes('MANAGER') && <Link to="/manager/consultations">Yêu cầu tư vấn</Link>}
      {user?.roles.includes('MANAGER') && <Link to="/manager/reports">Xử lý báo cáo</Link>}
      {user?.roles.includes('CUSTOMER') && <Link to="/memberships">Thẻ hội viên</Link>}
      {user?.roles.some(r => ['CUSTOMER', 'PT'].includes(r)) && <Link to="/my-pt">PT và lịch tập</Link>}
      {user?.roles.includes('MANAGER') && <Link to="/manager/pt">Quản lý lịch tập</Link>}
      {user?.roles.includes('ADMIN') && <><Link to="/admin/dashboard">Tổng quan</Link><Link to="/admin/gyms">Quản trị</Link><Link to="/admin/reviews">Quản lý đánh giá</Link><Link to="/admin/users">Quản lý tài khoản</Link></>}
      {user?.roles.includes('MANAGER') && <Link to="/manager/gym">Quản lý Gym</Link>}
      {isAuthenticated ? <><Link to="/profile">{user?.profile?.full_name || 'Hồ sơ cá nhân'}</Link><button className="btn-secondary" onClick={() => void logout()}>Đăng xuất</button></> : <><Link to="/login">Đăng nhập</Link><Link className="btn-secondary" to="/register">Đăng ký</Link></>}
    </nav></header>
    <main id="gym-main" tabIndex={-1} className="gym-main"><Outlet /></main><footer className="gym-footer">Multi-Gym · Tìm không gian tập luyện phù hợp với bạn.</footer>
  </div>;
};
