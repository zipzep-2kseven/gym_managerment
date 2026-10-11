import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface TopbarProps {
  onToggleMobileMenu: () => void;
  onToggleCollapse: () => void;
  collapsed: boolean;
  mobileOpen: boolean;
  scopeTitle?: string;
  roleBadge?: string;
}

export const Topbar: React.FC<TopbarProps> = ({
  onToggleMobileMenu,
  onToggleCollapse,
  collapsed,
  mobileOpen,
  scopeTitle,
  roleBadge,
}) => {
  const { user, logout } = useAuth();

  return (
    <header className="management-topbar" aria-label="Thanh điều hướng trên cùng">
      <div className="management-topbar-left">
        {/* Mobile menu toggle */}
        <button
          type="button"
          className="management-topbar-toggle md:hidden"
          onClick={onToggleMobileMenu}
          aria-label={mobileOpen ? 'Đóng menu' : 'Mở menu'}
          aria-expanded={mobileOpen}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        {/* Desktop collapse toggle */}
        <button
          type="button"
          className="management-topbar-toggle hidden md:inline-flex"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Mở rộng menu bên' : 'Thu gọn menu bên'}
          aria-expanded={!collapsed}
          title={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {collapsed ? (
              <>
                <polyline points="13 17 18 12 13 7" />
                <polyline points="6 17 11 12 6 7" />
              </>
            ) : (
              <>
                <polyline points="11 17 6 12 11 7" />
                <polyline points="18 17 13 12 18 7" />
              </>
            )}
          </svg>
        </button>

        {/* Scope Context */}
        <div className="management-topbar-context">
          {roleBadge && <span className="management-scope-badge">{roleBadge}</span>}
          {scopeTitle && <span className="management-scope-name">{scopeTitle}</span>}
        </div>
      </div>

      <div className="management-topbar-right">
        <Link
          to="/profile"
          className="management-user-profile-link"
          title="Xem hồ sơ cá nhân"
        >
          {user?.profile?.full_name || 'Hồ sơ cá nhân'}
        </Link>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => void logout()}
        >
          Đăng xuất
        </button>
      </div>
    </header>
  );
};
