import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';

export interface RequirePasswordChangeProps {
  children?: React.ReactNode;
  loadingFallback?: React.ReactNode;
}

export const RequirePasswordChange: React.FC<RequirePasswordChangeProps> = ({
  children,
  loadingFallback = (
    <div className="loading-screen" data-testid="auth-loading">
      <div className="loading-spinner-dark" />
      <p>Đang tải...</p>
    </div>
  ),
}) => {
  const { status, isAuthenticated, isForbidden, refreshSession } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <>{loadingFallback}</>;
  }

  if (isForbidden) {
    return (
      <div className="profile-container" style={{ textAlign: 'center', padding: '3rem 1.5rem' }} data-testid="account-deactivated">
        <div className="profile-card" style={{ maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.75rem', color: '#ef4444' }}>
            Tài khoản không khả dụng
          </h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '1.5rem' }}>
            Tài khoản của bạn đã bị vô hiệu hóa hoặc tạm khóa. Vui lòng liên hệ quản trị viên.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="profile-container" style={{ textAlign: 'center', padding: '3rem 1.5rem' }} data-testid="auth-error">
        <div className="profile-card" style={{ maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔌</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.75rem', color: '#f59e0b' }}>
            Lỗi kết nối máy chủ
          </h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '1.5rem' }}>
            Không thể tải thông tin phiên làm việc. Vui lòng kiểm tra lại kết nối mạng.
          </p>
          <button type="button" className="btn btn-secondary" onClick={() => void refreshSession()}>
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Authenticated users (whether forced via must_change_password or voluntary) can proceed to change password
  return children ? <>{children}</> : <Outlet />;
};
