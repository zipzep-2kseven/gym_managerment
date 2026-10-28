import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { ApiClientError } from '../services/api-client.js';

interface FormErrors {
  full_name?: string;
  email?: string;
  phone?: string;
  password?: string;
  general?: string;
}

const PHONE_REGEX = /^(?:\+84|0)[35789]\d{8}$/;

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    const trimmedName = fullName.trim();
    if (!trimmedName) {
      newErrors.full_name = 'Họ và tên là bắt buộc.';
    } else if (trimmedName.length < 2 || trimmedName.length > 100) {
      newErrors.full_name = 'Họ và tên phải có từ 2 đến 100 ký tự.';
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      newErrors.email = 'Email là bắt buộc.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      newErrors.email = 'Email không đúng định dạng.';
    }

    const trimmedPhone = phone.trim();
    if (trimmedPhone && !PHONE_REGEX.test(trimmedPhone)) {
      newErrors.phone = 'Số điện thoại không đúng định dạng (VD: 0912345678 hoặc +84912345678).';
    }

    if (!password) {
      newErrors.password = 'Mật khẩu là bắt buộc.';
    } else {
      if (password.length < 8 || password.length > 128) {
        newErrors.password = 'Mật khẩu phải có từ 8 đến 128 ký tự.';
      } else if (!/[A-Z]/.test(password)) {
        newErrors.password = 'Mật khẩu phải chứa ít nhất 1 chữ cái viết hoa.';
      } else if (!/[0-9]/.test(password)) {
        newErrors.password = 'Mật khẩu phải chứa ít nhất 1 chữ số.';
      }
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
      await register({
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: phone.trim() ? phone.trim() : null,
      });

      // After successful registration, session is set and user is authenticated
      navigate('/', { replace: true });
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        if (err.code === 'EMAIL_ALREADY_EXISTS') {
          setErrors({
            email: 'Email này đã được sử dụng trong hệ thống.',
            general: 'Email này đã được sử dụng. Vui lòng chọn email khác hoặc đăng nhập.',
          });
        } else if (err.code === 'PHONE_ALREADY_EXISTS') {
          setErrors({
            phone: 'Số điện thoại này đã được sử dụng trong hệ thống.',
            general: 'Số điện thoại này đã được đăng ký. Vui lòng sử dụng số khác.',
          });
        } else if (err.code === 'VALIDATION_ERROR') {
          const fieldErrors: FormErrors = {};
          if (err.details && Array.isArray(err.details)) {
            for (const detail of err.details) {
              if (detail.field === 'full_name') fieldErrors.full_name = detail.message;
              else if (detail.field === 'email') fieldErrors.email = detail.message;
              else if (detail.field === 'password') fieldErrors.password = detail.message;
              else if (detail.field === 'phone') fieldErrors.phone = detail.message;
            }
          }
          setErrors({
            ...fieldErrors,
            general: err.message || 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.',
          });
        } else {
          setErrors({ general: err.message || 'Đã xảy ra lỗi trong quá trình đăng ký.' });
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
      <h1 className="auth-title">Đăng ký tài khoản</h1>
      <p className="auth-subtitle" style={{ marginBottom: 'var(--space-6)' }}>
        Tạo tài khoản hội viên Multi-Gym Platform
      </p>

      {errors.general && (
        <div
          className="alert-banner alert-error"
          role="alert"
          aria-live="polite"
          style={{ marginBottom: 'var(--space-5)' }}
          data-testid="register-error-alert"
        >
          {errors.general}
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        <div className="form-group">
          <label htmlFor="register-fullname" className="form-label">
            Họ và tên
          </label>
          <input
            id="register-fullname"
            type="text"
            name="full_name"
            aria-invalid={!!errors.full_name}
            aria-describedby={errors.full_name ? "register-full_name-error" : undefined}
            autoComplete="name"
            required
            disabled={isSubmitting}
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              if (errors.full_name) setErrors((prev) => ({ ...prev, full_name: undefined }));
            }}
            className={`form-input ${errors.full_name ? 'has-error' : ''}`}
            placeholder="Nguyễn Văn A"
          />
          {errors.full_name && (
            <span className="form-error" role="alert" id="register-full_name-error">
              {errors.full_name}
            </span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="register-email" className="form-label">
            Email
          </label>
          <input
            id="register-email"
            type="email"
            name="email"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "register-email-error" : undefined}
            autoComplete="email"
            required
            disabled={isSubmitting}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
            }}
            className={`form-input ${errors.email ? 'has-error' : ''}`}
            placeholder="name@example.com"
          />
          {errors.email && (
            <span className="form-error" role="alert" id="register-email-error">
              {errors.email}
            </span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="register-phone" className="form-label">
            <span>Số điện thoại</span>
            <span className="form-label-optional">(Tùy chọn)</span>
          </label>
          <input
            id="register-phone"
            type="tel"
            name="phone"
            aria-invalid={!!errors.phone}
            aria-describedby={errors.phone ? "register-phone-error" : undefined}
            autoComplete="tel"
            disabled={isSubmitting}
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
            }}
            className={`form-input ${errors.phone ? 'has-error' : ''}`}
            placeholder="0912345678"
          />
          <span className="form-helper">Định dạng Việt Nam: 03x, 05x, 07x, 08x, 09x</span>
          {errors.phone && (
            <span className="form-error" role="alert" id="register-phone-error">
              {errors.phone}
            </span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="register-password" className="form-label">
            Mật khẩu
          </label>
          <input
            id="register-password"
            type="password"
            name="password"
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? "register-password-error" : undefined}
            autoComplete="new-password"
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
          <span className="form-helper">Từ 8-128 ký tự, ít nhất 1 chữ hoa và 1 chữ số</span>
          {errors.password && (
            <span className="form-error" role="alert" id="register-password-error">
              {errors.password}
            </span>
          )}
        </div>

        <button
          type="submit"
          className="btn-primary"
          disabled={isSubmitting}
          data-testid="register-submit-btn"
        >
          {isSubmitting ? (
            <>
              <span className="spinner" aria-hidden="true" />
              Đang tạo tài khoản...
            </>
          ) : (
            'Đăng ký'
          )}
        </button>
      </form>

      <div className="auth-footer">
        Đã có tài khoản?
        <Link to="/login">Đăng nhập ngay</Link>
      </div>
    </div>
  );
};

export default RegisterPage;
