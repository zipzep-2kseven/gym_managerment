import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { APP_NAME } from '@multi-gym/shared';

export const HomePagePlaceholder: React.FC = () => {
  const { user, isAuthenticated, logout, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner-dark" />
        <p>Đang tải thông tin hệ thống...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 'var(--space-8) var(--space-4)' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-8)' }}>
        <div>
          <div className="auth-brand-badge">{APP_NAME}</div>
          <h1 style={{ fontSize: '1.75rem', margin: 'var(--space-2) 0 0 0', color: 'var(--color-navy-900)' }}>
            Hệ Thống Quản Lý Thể Thao Đa Chi Nhánh
          </h1>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {isAuthenticated ? (
            <>
              <Link to="/profile" className="btn-secondary" style={{ textDecoration: 'none' }}>
                Hồ sơ cá nhân
              </Link>
              <button
                type="button"
                onClick={() => void logout()}
                className="btn-secondary"
              >
                Đăng xuất
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-secondary" style={{ textDecoration: 'none' }}>
                Đăng nhập
              </Link>
              <Link
                to="/register"
                className="btn-primary"
                style={{ width: 'auto', padding: '8px 16px', textDecoration: 'none', fontSize: '0.875rem' }}
              >
                Đăng ký
              </Link>
            </>
          )}
        </div>
      </header>

      <main style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-8)' }}>
        {isAuthenticated ? (
          <div>
            <h2 style={{ fontSize: '1.25rem', marginTop: 0, color: 'var(--color-navy-900)' }}>
              Xin chào, {user?.profile?.full_name || user?.email}!
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
              Bạn đang đăng nhập với vai trò: <strong>{user?.roles?.join(', ')}</strong>
            </p>

            {user?.must_change_password && (
              <div
                className="alert-banner"
                style={{
                  backgroundColor: 'var(--color-warning-bg)',
                  border: '1px solid #fef08a',
                  color: 'var(--color-warning-text)',
                  marginBottom: 'var(--space-4)',
                }}
              >
                Tài khoản của bạn yêu cầu đổi mật khẩu.
                <Link to="/change-password" style={{ marginLeft: 8, fontWeight: 600 }}>
                  Đổi mật khẩu ngay
                </Link>
              </div>
            )}

            <div style={{ padding: 'var(--space-4)', backgroundColor: 'var(--color-neutral-bg)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}>
              Phiên đăng nhập của bạn được quản lý bảo mật qua cookie HttpOnly. Giao diện bảng điều khiển chi tiết sẽ được phát triển trong các giai đoạn tiếp theo.
            </div>
          </div>
        ) : (
          <div>
            <h2 style={{ fontSize: '1.25rem', marginTop: 0, color: 'var(--color-navy-900)' }}>
              Chào mừng đến với Multi-Gym Platform
            </h2>
            <p style={{ color: 'var(--color-text-secondary)' }}>
              Nền tảng quản lý hội viên, huấn luyện viên cá nhân và lịch tập thể hình chuyên nghiệp.
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-6)' }}>
              <Link
                to="/login"
                className="btn-primary"
                style={{ width: 'auto', textDecoration: 'none' }}
              >
                Đăng nhập tài khoản
              </Link>
              <Link
                to="/register"
                className="btn-secondary"
                style={{ textDecoration: 'none' }}
              >
                Đăng ký hội viên mới
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default HomePagePlaceholder;
