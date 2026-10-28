import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { ApiClientError } from '../services/api-client.js';

interface FormErrors {
  current_password?: string;
  new_password?: string;
  confirm_password?: string;
  general?: string;
}

export const ChangePasswordPage: React.FC = () => {
  const { user, changePassword, logout } = useAuth();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [errors, setErrors] = useState<FormErrors>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!currentPassword) {
      newErrors.current_password = 'Mật khẩu hiện tại không được để trống.';
    }

    if (!newPassword) {
      newErrors.new_password = 'Mật khẩu mới không được để trống.';
    } else {
      if (newPassword.length < 8 || newPassword.length > 128) {
        newErrors.new_password = 'Mật khẩu mới phải có từ 8 đến 128 ký tự.';
      } else if (!/[A-Z]/.test(newPassword)) {
        newErrors.new_password = 'Mật khẩu mới phải chứa ít nhất 1 chữ cái viết hoa.';
      } else if (!/[0-9]/.test(newPassword)) {
        newErrors.new_password = 'Mật khẩu mới phải chứa ít nhất 1 chữ số.';
      }
    }

    if (!confirmPassword) {
      newErrors.confirm_password = 'Vui lòng xác nhận mật khẩu mới.';
    } else if (newPassword && newPassword !== confirmPassword) {
      newErrors.confirm_password = 'Xác nhận mật khẩu mới không khớp.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm() || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});
    setSuccessMessage(null);

    try {
      await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });

      setSuccessMessage('Đổi mật khẩu thành công! Tài khoản của bạn đã được cập nhật.');
      // Clear password inputs
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        if (err.code === 'INVALID_CREDENTIALS') {
          setErrors({
            current_password: 'Mật khẩu hiện tại không chính xác.',
            general: 'Mật khẩu hiện tại không chính xác. Vui lòng thử lại.',
          });
        } else if (err.code === 'VALIDATION_ERROR') {
          const fieldErrors: FormErrors = {};
          if (err.details && Array.isArray(err.details)) {
            for (const detail of err.details) {
              if (detail.field === 'current_password') fieldErrors.current_password = detail.message;
              else if (detail.field === 'new_password') fieldErrors.new_password = detail.message;
              else if (detail.field === 'confirm_password')
                fieldErrors.confirm_password = detail.message;
            }
          }
          setErrors({
            ...fieldErrors,
            general: err.message || 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.',
          });
        } else if (err.code === 'ACCOUNT_DEACTIVATED') {
          setErrors({ general: 'Tài khoản của bạn đã bị vô hiệu hóa hoặc tạm khóa.' });
        } else {
          setErrors({ general: err.message || 'Đã xảy ra lỗi khi đổi mật khẩu.' });
        }
      } else {
        setErrors({ general: 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className="auth-title">
        {user?.must_change_password ? 'Đổi mật khẩu bắt buộc' : 'Đổi mật khẩu'}
      </h1>
      <p className="auth-subtitle" style={{ marginBottom: 'var(--space-6)' }}>
        {user?.must_change_password
          ? 'Hệ thống yêu cầu bạn đổi mật khẩu để tiếp tục sử dụng dịch vụ.'
          : 'Nhập mật khẩu hiện tại và thiết lập mật khẩu mới cho tài khoản.'}
      </p>

      {successMessage ? (
        <div style={{ textAlign: 'center' }}>
          <div
            className="alert-banner alert-success"
            role="alert"
            style={{ marginBottom: 'var(--space-6)' }}
            data-testid="change-password-success-alert"
          >
            {successMessage}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <button
              type="button"
              onClick={() => navigate('/profile', { replace: true })}
              className="btn-primary"
            >
              Xem hồ sơ cá nhân
            </button>
            <button
              type="button"
              onClick={() => navigate('/', { replace: true })}
              className="btn-secondary"
            >
              Về trang chủ
            </button>
          </div>
        </div>
      ) : (
        <>
          {errors.general && (
            <div
              className="alert-banner alert-error"
              role="alert"
              aria-live="polite"
              style={{ marginBottom: 'var(--space-5)' }}
              data-testid="change-password-error-alert"
            >
              {errors.general}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            <div className="form-group">
              <label htmlFor="cp-current-password" className="form-label">
                Mật khẩu hiện tại
              </label>
              <div className="password-input-wrapper">
                <input
                  id="cp-current-password"
                  type={showCurrent ? 'text' : 'password'}
                  name="current_password"
                  aria-invalid={!!errors.current_password}
                  aria-describedby={errors.current_password ? "changepassword-current_password-error" : undefined}
                  autoComplete="current-password"
                  required
                  disabled={isSubmitting}
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value);
                    if (errors.current_password)
                      setErrors((prev) => ({ ...prev, current_password: undefined }));
                  }}
                  className={`form-input ${errors.current_password ? 'has-error' : ''}`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent((prev) => !prev)}
                  className="password-toggle-btn"
                  aria-label={showCurrent ? 'Ẩn mật khẩu hiện tại' : 'Hiện mật khẩu hiện tại'}
                >
                  {showCurrent ? 'Ẩn' : 'Hiện'}
                </button>
              </div>
              {errors.current_password && (
                <span className="form-error" role="alert" id="changepassword-current_password-error">
                  {errors.current_password}
                </span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="cp-new-password" className="form-label">
                Mật khẩu mới
              </label>
              <div className="password-input-wrapper">
                <input
                  id="cp-new-password"
                  type={showNew ? 'text' : 'password'}
                  name="new_password"
                  aria-invalid={!!errors.new_password}
                  aria-describedby={errors.new_password ? "changepassword-new_password-error" : undefined}
                  autoComplete="new-password"
                  required
                  disabled={isSubmitting}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (errors.new_password)
                      setErrors((prev) => ({ ...prev, new_password: undefined }));
                  }}
                  className={`form-input ${errors.new_password ? 'has-error' : ''}`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowNew((prev) => !prev)}
                  className="password-toggle-btn"
                  aria-label={showNew ? 'Ẩn mật khẩu mới' : 'Hiện mật khẩu mới'}
                >
                  {showNew ? 'Ẩn' : 'Hiện'}
                </button>
              </div>
              <span className="form-helper">Từ 8-128 ký tự, ít nhất 1 chữ hoa và 1 chữ số</span>
              {errors.new_password && (
                <span className="form-error" role="alert" id="changepassword-new_password-error">
                  {errors.new_password}
                </span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="cp-confirm-password" className="form-label">
                Xác nhận mật khẩu mới
              </label>
              <div className="password-input-wrapper">
                <input
                  id="cp-confirm-password"
                  type={showConfirm ? 'text' : 'password'}
                  name="confirm_password"
                  aria-invalid={!!errors.confirm_password}
                  aria-describedby={errors.confirm_password ? "changepassword-confirm_password-error" : undefined}
                  autoComplete="new-password"
                  required
                  disabled={isSubmitting}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errors.confirm_password)
                      setErrors((prev) => ({ ...prev, confirm_password: undefined }));
                  }}
                  className={`form-input ${errors.confirm_password ? 'has-error' : ''}`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((prev) => !prev)}
                  className="password-toggle-btn"
                  aria-label={showConfirm ? 'Ẩn xác nhận mật khẩu' : 'Hiện xác nhận mật khẩu'}
                >
                  {showConfirm ? 'Ẩn' : 'Hiện'}
                </button>
              </div>
              {errors.confirm_password && (
                <span className="form-error" role="alert" id="changepassword-confirm_password-error">
                  {errors.confirm_password}
                </span>
              )}
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
              data-testid="change-password-submit-btn"
            >
              {isSubmitting ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  Đang đổi mật khẩu...
                </>
              ) : (
                'Cập nhật mật khẩu'
              )}
            </button>
          </form>

          <div className="auth-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Link to="/profile">Quay lại hồ sơ</Link>
            <button
              type="button"
              onClick={() => void logout()}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              Đăng xuất
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ChangePasswordPage;
