import React from 'react';
import { useAuth } from '../hooks/useAuth.js';

export const ChangePasswordPlaceholder: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div style={{ textAlign: 'center' }}>
      <h1 className="auth-title">Đổi mật khẩu bắt buộc</h1>
      <p className="auth-subtitle" style={{ marginBottom: 'var(--space-6)' }}>
        Tài khoản <strong>{user?.email}</strong> cần đổi mật khẩu để tiếp tục sử dụng hệ thống.
      </p>

      <div
        className="alert-banner"
        style={{
          backgroundColor: 'var(--color-warning-bg)',
          border: '1px solid #fef08a',
          color: 'var(--color-warning-text)',
          marginBottom: 'var(--space-6)',
        }}
      >
        Tính năng Đổi mật khẩu chi tiết sẽ được hoàn thiện trong giai đoạn tiếp theo (AUTH-03 Phase C).
      </div>

      <button
        type="button"
        onClick={() => void logout()}
        className="btn-secondary"
        style={{ width: '100%' }}
      >
        Đăng xuất
      </button>
    </div>
  );
};

export default ChangePasswordPlaceholder;
