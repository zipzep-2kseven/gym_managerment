import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { authService } from '../services/auth.service.js';
import { ApiClientError } from '../services/api-client.js';
import { APP_NAME } from '@multi-gym/shared';

interface FormErrors {
  full_name?: string;
  phone?: string;
  date_of_birth?: string;
  gender?: string;
  address?: string;
  avatar_url?: string;
  general?: string;
}

const PHONE_REGEX = /^(?:\+84|0)[35789]\d{8}$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const ProfilePage: React.FC = () => {
  const { user, refreshSession, logout } = useAuth();

  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [address, setAddress] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  const [errors, setErrors] = useState<FormErrors>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load profile data from GET /api/v1/users/me/profile
  const loadProfile = useCallback(async () => {
    setIsLoadingProfile(true);
    setFetchError(null);
    try {
      const data = await authService.getProfile();
      setPhone(data.phone || '');
      if (data.profile) {
        setFullName(data.profile.full_name || '');
        setDateOfBirth(data.profile.date_of_birth || '');
        setGender(data.profile.gender || '');
        setAddress(data.profile.address || '');
        setAvatarUrl(data.profile.avatar_url || '');
      } else {
        // Profile is null, use fallback from user session if present
        setFullName(user?.profile?.full_name || '');
      }
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setFetchError(err.message || 'Không thể tải thông tin hồ sơ.');
      } else {
        setFetchError('Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại.');
      }
    } finally {
      setIsLoadingProfile(false);
    }
  }, [user]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    const trimmedName = fullName.trim();
    if (!trimmedName) {
      newErrors.full_name = 'Họ và tên là bắt buộc.';
    } else if (trimmedName.length < 2 || trimmedName.length > 100) {
      newErrors.full_name = 'Họ và tên phải có từ 2 đến 100 ký tự.';
    }

    const trimmedPhone = phone.trim();
    if (trimmedPhone && !PHONE_REGEX.test(trimmedPhone)) {
      newErrors.phone = 'Số điện thoại không đúng định dạng (VD: 0912345678 hoặc +84912345678).';
    }

    const trimmedDob = dateOfBirth.trim();
    if (trimmedDob) {
      if (!DATE_REGEX.test(trimmedDob)) {
        newErrors.date_of_birth = 'Ngày sinh phải có định dạng YYYY-MM-DD.';
      } else {
        const d = new Date(trimmedDob);
        if (isNaN(d.getTime())) {
          newErrors.date_of_birth = 'Ngày sinh không hợp lệ.';
        }
      }
    }

    const trimmedGender = gender.trim();
    if (trimmedGender && trimmedGender.length > 50) {
      newErrors.gender = 'Giới tính tối đa 50 ký tự.';
    }

    const trimmedAddress = address.trim();
    if (trimmedAddress && trimmedAddress.length > 500) {
      newErrors.address = 'Địa chỉ tối đa 500 ký tự.';
    }

    const trimmedAvatar = avatarUrl.trim();
    if (trimmedAvatar) {
      if (trimmedAvatar.length > 2048) {
        newErrors.avatar_url = 'Đường dẫn ảnh đại diện tối đa 2048 ký tự.';
      } else {
        try {
          new URL(trimmedAvatar);
        } catch {
          newErrors.avatar_url = 'Đường dẫn ảnh đại diện không đúng định dạng URL.';
        }
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
    setSuccessMessage(null);

    try {
      const updated = await authService.updateProfile({
        full_name: fullName.trim(),
        phone: phone.trim() ? phone.trim() : null,
        date_of_birth: dateOfBirth.trim() ? dateOfBirth.trim() : null,
        gender: gender.trim() ? gender.trim() : null,
        address: address.trim() ? address.trim() : null,
        avatar_url: avatarUrl.trim() ? avatarUrl.trim() : null,
      });

      // Synchronize session in AuthContext
      await refreshSession();

      // Update local state with confirmed backend projection
      setPhone(updated.phone || '');
      if (updated.profile) {
        setFullName(updated.profile.full_name || '');
        setDateOfBirth(updated.profile.date_of_birth || '');
        setGender(updated.profile.gender || '');
        setAddress(updated.profile.address || '');
        setAvatarUrl(updated.profile.avatar_url || '');
      }

      setSuccessMessage('Cập nhật hồ sơ thành công.');
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        if (err.code === 'PHONE_ALREADY_EXISTS') {
          setErrors({
            phone: 'Số điện thoại này đã được sử dụng bởi tài khoản khác.',
            general: 'Số điện thoại đã được đăng ký trong hệ thống.',
          });
        } else if (err.code === 'VALIDATION_ERROR') {
          const fieldErrors: FormErrors = {};
          if (err.details && Array.isArray(err.details)) {
            for (const detail of err.details) {
              if (detail.field === 'full_name') fieldErrors.full_name = detail.message;
              else if (detail.field === 'phone') fieldErrors.phone = detail.message;
              else if (detail.field === 'date_of_birth') fieldErrors.date_of_birth = detail.message;
              else if (detail.field === 'gender') fieldErrors.gender = detail.message;
              else if (detail.field === 'address') fieldErrors.address = detail.message;
              else if (detail.field === 'avatar_url') fieldErrors.avatar_url = detail.message;
            }
          }
          setErrors({
            ...fieldErrors,
            general: err.message || 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.',
          });
        } else {
          setErrors({ general: err.message || 'Đã xảy ra lỗi khi lưu thông tin.' });
        }
      } else {
        setErrors({ general: 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingProfile) {
    return (
      <div className="loading-screen" data-testid="profile-loading">
        <div className="loading-spinner-dark" />
        <p>Đang tải thông tin hồ sơ...</p>
      </div>
    );
  }

  return (
    <div className="profile-container">
      {/* Navigation Header */}
      <header className="profile-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'var(--space-6)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <div className="auth-brand-badge">{APP_NAME}</div>
          </Link>
          <span style={{ color: 'var(--color-border-strong)' }}>/</span>
          <h1 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--color-navy-900)' }}>
            Hồ sơ cá nhân
          </h1>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <Link to="/" className="btn-secondary" style={{ textDecoration: 'none' }}>
            Trang chủ
          </Link>
          <button type="button" onClick={() => void logout()} className="btn-secondary">
            Đăng xuất
          </button>
        </div>
      </header>

      <main>
      {fetchError && (
        <div
          className="alert-banner alert-error"
          role="alert"
          style={{ marginBottom: 'var(--space-6)' }}
        >
          <span>{fetchError}</span>
          <button
            type="button"
            onClick={() => void loadProfile()}
            style={{
              marginTop: 'var(--space-2)',
              width: 'fit-content',
              padding: '4px 12px',
              cursor: 'pointer',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-crimson-600)',
              backgroundColor: 'transparent',
              color: 'var(--color-crimson-700)',
              fontWeight: 600,
              fontSize: '0.75rem',
            }}
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Account Info (Read-only System Session Data) */}
      <section className="profile-card">
        <h2 className="profile-section-title">Thông tin tài khoản</h2>
        <p className="profile-section-desc">Thông tin định danh hệ thống (chỉ đọc theo phiên)</p>

        <div className="form-readonly-box">
          <div className="readonly-item">
            <span className="readonly-label">Email tài khoản</span>
            <span className="readonly-value">{user?.email}</span>
          </div>
          <div className="readonly-item">
            <span className="readonly-label">Vai trò hệ thống</span>
            <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
              {user?.roles?.map((role) => (
                <span key={role} className="badge badge-role">
                  {role}
                </span>
              ))}
            </div>
          </div>
          <div className="readonly-item">
            <span className="readonly-label">Trạng thái tài khoản</span>
            <span className="badge badge-active">{user?.status}</span>
          </div>
          <div className="readonly-item">
            <span className="readonly-label">Xác thực Email</span>
            <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
              {user?.email_verified_at
                ? `Đã xác thực (${new Date(user.email_verified_at).toLocaleDateString('vi-VN')})`
                : 'Chưa xác thực'}
            </span>
          </div>
        </div>
      </section>

      {/* Profile Form (Editable) */}
      <section className="profile-card">
        <h2 className="profile-section-title">Thông tin cá nhân</h2>
        <p className="profile-section-desc">
          Cập nhật thông tin hồ sơ của bạn trên Multi-Gym Platform
        </p>

        {successMessage && (
          <div
            className="alert-banner alert-success"
            role="alert"
            style={{ marginBottom: 'var(--space-5)' }}
            data-testid="profile-success-alert"
          >
            {successMessage}
          </div>
        )}

        {errors.general && (
          <div
            className="alert-banner alert-error"
            role="alert"
            style={{ marginBottom: 'var(--space-5)' }}
            data-testid="profile-error-alert"
          >
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="form-group">
            <label htmlFor="profile-fullname" className="form-label">
              Họ và tên
            </label>
            <input
              id="profile-fullname"
              type="text"
              name="full_name"
              aria-invalid={!!errors.full_name}
              aria-describedby={errors.full_name ? "profile-full_name-error" : undefined}
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
              <span className="form-error" role="alert" id="profile-full_name-error">
                {errors.full_name}
              </span>
            )}
          </div>

          <div className="profile-grid-2">
            <div className="form-group">
              <label htmlFor="profile-phone" className="form-label">
                <span>Số điện thoại</span>
                <span className="form-label-optional">(Tùy chọn)</span>
              </label>
              <input
                id="profile-phone"
                type="tel"
                name="phone"
                aria-invalid={!!errors.phone}
                aria-describedby={errors.phone ? "profile-phone-error" : undefined}
                disabled={isSubmitting}
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
                }}
                className={`form-input ${errors.phone ? 'has-error' : ''}`}
                placeholder="0912345678"
              />
              <span className="form-helper">Định dạng: 03x, 05x, 07x, 08x, 09x</span>
              {errors.phone && (
                <span className="form-error" role="alert" id="profile-phone-error">
                  {errors.phone}
                </span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="profile-dob" className="form-label">
                <span>Ngày sinh</span>
                <span className="form-label-optional">(Tùy chọn)</span>
              </label>
              <input
                id="profile-dob"
                type="date"
                name="date_of_birth"
                aria-invalid={!!errors.date_of_birth}
                aria-describedby={errors.date_of_birth ? "profile-date_of_birth-error" : undefined}
                disabled={isSubmitting}
                value={dateOfBirth}
                onChange={(e) => {
                  setDateOfBirth(e.target.value);
                  if (errors.date_of_birth)
                    setErrors((prev) => ({ ...prev, date_of_birth: undefined }));
                }}
                className={`form-input ${errors.date_of_birth ? 'has-error' : ''}`}
              />
              {errors.date_of_birth && (
                <span className="form-error" role="alert" id="profile-date_of_birth-error">
                  {errors.date_of_birth}
                </span>
              )}
            </div>
          </div>

          <div className="profile-grid-2">
            <div className="form-group">
              <label htmlFor="profile-gender" className="form-label">
                <span>Giới tính</span>
                <span className="form-label-optional">(Tùy chọn)</span>
              </label>
              <input
                id="profile-gender"
                type="text"
                name="gender"
                aria-invalid={!!errors.gender}
                aria-describedby={errors.gender ? "profile-gender-error" : undefined}
                disabled={isSubmitting}
                value={gender}
                onChange={(e) => {
                  setGender(e.target.value);
                  if (errors.gender) setErrors((prev) => ({ ...prev, gender: undefined }));
                }}
                className={`form-input ${errors.gender ? 'has-error' : ''}`}
                placeholder="Nam / Nữ / Khác"
                maxLength={50}
              />
              {errors.gender && (
                <span className="form-error" role="alert" id="profile-gender-error">
                  {errors.gender}
                </span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="profile-avatar" className="form-label">
                <span>Ảnh đại diện (URL)</span>
                <span className="form-label-optional">(Tùy chọn)</span>
              </label>
              <input
                id="profile-avatar"
                type="url"
                name="avatar_url"
                aria-invalid={!!errors.avatar_url}
                aria-describedby={errors.avatar_url ? "profile-avatar_url-error" : undefined}
                disabled={isSubmitting}
                value={avatarUrl}
                onChange={(e) => {
                  setAvatarUrl(e.target.value);
                  if (errors.avatar_url)
                    setErrors((prev) => ({ ...prev, avatar_url: undefined }));
                }}
                className={`form-input ${errors.avatar_url ? 'has-error' : ''}`}
                placeholder="https://example.com/avatar.jpg"
              />
              {errors.avatar_url && (
                <span className="form-error" role="alert" id="profile-avatar_url-error">
                  {errors.avatar_url}
                </span>
              )}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="profile-address" className="form-label">
              <span>Địa chỉ</span>
              <span className="form-label-optional">(Tùy chọn)</span>
            </label>
            <textarea
              id="profile-address"
              name="address"
              aria-invalid={!!errors.address}
              aria-describedby={errors.address ? "profile-address-error" : undefined}
              disabled={isSubmitting}
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                if (errors.address) setErrors((prev) => ({ ...prev, address: undefined }));
              }}
              className={`form-textarea ${errors.address ? 'has-error' : ''}`}
              placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố"
              maxLength={500}
            />
            {errors.address && (
              <span className="form-error" role="alert" id="profile-address-error">
                {errors.address}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
              style={{ width: 'auto', minWidth: '160px' }}
              data-testid="profile-submit-btn"
            >
              {isSubmitting ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  Đang lưu...
                </>
              ) : (
                'Lưu thay đổi'
              )}
            </button>
          </div>
        </form>
      </section>

      {/* Security & Password Change Shortcut */}
      <section className="profile-card">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 'var(--space-4)',
          }}
        >
          <div>
            <h2 className="profile-section-title" style={{ marginBottom: 4 }}>
              Bảo mật & Mật khẩu
            </h2>
            <p className="profile-section-desc" style={{ marginBottom: 0 }}>
              Đổi mật khẩu định kỳ để nâng cao tính bảo mật cho tài khoản của bạn
            </p>
          </div>

          <Link
            to="/change-password"
            className="btn-secondary"
            style={{ textDecoration: 'none', whiteSpace: 'nowrap' }}
          >
            Đổi mật khẩu
          </Link>
        </div>
      </section>
      </main>
    </div>
  );
};

export default ProfilePage;
