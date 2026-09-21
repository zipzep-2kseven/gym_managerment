import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';

export interface RequireGuestProps {
  children?: React.ReactNode;
  loadingFallback?: React.ReactNode;
}

export const RequireGuest: React.FC<RequireGuestProps> = ({
  children,
  loadingFallback = (
    <div className="loading-screen" data-testid="auth-loading">
      <div className="loading-spinner-dark" />
      <p>Đang kiểm tra phiên làm việc...</p>
    </div>
  ),
}) => {
  const { status, isAuthenticated, mustChangePassword } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <>{loadingFallback}</>;
  }

  if (isAuthenticated) {
    if (mustChangePassword) {
      return <Navigate to="/change-password" replace />;
    }
    const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/';
    return <Navigate to={from} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};
