import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { ApiClientError } from '../services/api-client.js';

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validate form inputs inline / before submit
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      newErrors.email = 'Email không được để trống.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      newErrors.email = 'Email không đúng định dạng.';
    }

    if (!password) {
      newErrors.password = 'Mật khẩu không được để trống.';
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

    try {
      const session = await login({
        email: email.trim().toLowerCase(),
        password,
      });

      // If must_change_password is true, route to /change-password immediately
      if (session.must_change_password) {
        navigate('/change-password', { replace: true });
        return;
      }

      // Otherwise redirect to previous requested route or home
      const destination = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/';
      navigate(destination, { replace: true });
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        if (err.code === 'INVALID_CREDENTIALS') {
          setErrors({ general: 'Email hoặc mật khẩu không chính xác.' });
        } else if (err.code === 'ACCOUNT_DEACTIVATED') {
          setErrors({ general: 'Tài khoản của bạn đã bị vô hiệu hóa hoặc tạm khóa. Vui lòng liên hệ quản trị viên.' });
        } else if (err.code === 'VALIDATION_ERROR') {
          const fieldErrors: FormErrors = {};
          if (err.details && Array.isArray(err.details)) {
            for (const detail of err.details) {
              if (detail.field === 'email') fieldErrors.email = detail.message;
              else if (detail.field === 'password') fieldErrors.password = detail.message;
            }
          }
          setErrors({
            ...fieldErrors,
            general: err.message || 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.',
          });
        } else {
          setErrors({ general: err.message || 'Đã xảy ra lỗi trong quá trình đăng nhập.' });
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
      <h1 className="auth-title">Đăng nhập</h1>
      <p className="auth-subtitle" style={{ marginBottom: 'var(--space-6)' }}>
        Nhập thông tin đăng nhập để tiếp tục
      </p>

      {errors.general && (
        <div
          className="alert-banner alert-error"
          role="alert"
          aria-live="polite"
          style={{ marginBottom: 'var(--space-5)' }}
          data-testid="login-error-alert"
        >
          {errors.general}
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        <div className="form-group">
          <label htmlFor="login-email" className="form-label">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            name="email"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "login-email-error" : undefined}
            autoComplete="email"
            required
            disabled={isSubmitting}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
            }}
            onBlur={() => {
              if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
                setErrors((prev) => ({ ...prev, email: 'Email không đúng định dạng.' }));
              }
            }}
            className={`form-input ${errors.email ? 'has-error' : ''}`}
            placeholder="name@example.com"
          />
          {errors.email && (
            <span className="form-error" role="alert" id="login-email-error">
              {errors.email}
            </span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="login-password" className="form-label">
            Mật khẩu
          </label>
          <input
            id="login-password"
            type="password"
            name="password"
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? "login-password-error" : undefined}
            autoComplete="current-password"
            required
            disabled={isSubmitting}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
            }}
            className={`form-input ${errors.password ? 'has-error' : ''}`}
            placeholder="••••••••"
          />
          {errors.password && (
            <span className="form-error" role="alert" id="login-password-error">
              {errors.password}
            </span>
          )}
        </div>

        <button
          type="submit"
          className="btn-primary"
          disabled={isSubmitting}
          data-testid="login-submit-btn"
        >
          {isSubmitting ? (
            <>
              <span className="spinner" aria-hidden="true" />
              Đang xử lý...
            </>
          ) : (
            'Đăng nhập'
          )}
        </button>
      </form>

      <div className="auth-footer">
        Chưa có tài khoản?
        <Link to="/register">Đăng ký ngay</Link>
      </div>
    </div>
  );
};

export default LoginPage;
