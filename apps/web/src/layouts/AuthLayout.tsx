import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { APP_NAME } from '@multi-gym/shared';

export const AuthLayout: React.FC = () => {
  return (
    <div className="auth-layout-container">
      <header className="auth-header">
        <Link to="/" style={{ textDecoration: 'none' }}>
          <div className="auth-brand-badge">{APP_NAME}</div>
        </Link>
        <p className="auth-subtitle">Hệ thống quản lý chuỗi phòng tập chuyên nghiệp</p>
      </header>

      <main className="auth-card">
        <Outlet />
      </main>
    </div>
  );
};

export default AuthLayout;
