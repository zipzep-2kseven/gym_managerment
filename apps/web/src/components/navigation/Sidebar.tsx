import React, { useEffect, useRef } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import type { NavigationGroup } from '../../types/navigation.types';
import { useDrawerFocus } from './useDrawerFocus';

interface SidebarProps {
  groups: NavigationGroup[];
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  scopeTitle?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  groups,
  collapsed,
  mobileOpen,
  onCloseMobile,
  scopeTitle,
}) => {
  const location = useLocation();
  const sidebarRef = useRef<HTMLElement>(null);
  const prevPathRef = useRef(location.pathname);
  useDrawerFocus(sidebarRef, mobileOpen, onCloseMobile);

  // Close mobile drawer on route change
  useEffect(() => {
    if (prevPathRef.current !== location.pathname) {
      prevPathRef.current = location.pathname;
      if (mobileOpen) {
        onCloseMobile();
      }
    }
  }, [location.pathname, mobileOpen, onCloseMobile]);

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      <div
        className={`management-backdrop ${mobileOpen ? 'is-visible' : ''}`}
        onClick={onCloseMobile}
        aria-hidden="true"
      />

      <aside
        ref={sidebarRef}
        tabIndex={-1}
        aria-label="Điều hướng quản trị"
        className={`management-sidebar ${collapsed ? 'is-collapsed' : ''} ${mobileOpen ? 'is-mobile-open' : ''}`}
      >
        <div className="management-sidebar-header">
          <Link to="/" className="management-brand-link gym-brand" title="Về trang chủ MultiGym">
            MULTI<span>GYM</span>
          </Link>
          {mobileOpen && (
            <button
              type="button"
              className="management-topbar-toggle"
              onClick={onCloseMobile}
              aria-label="Đóng thanh điều hướng"
              style={{ color: '#FFFFFF', borderColor: 'rgba(255, 255, 255, 0.2)' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        {scopeTitle && !collapsed && (
          <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94A3B8', marginBottom: '2px' }}>
              Phạm vi quản lý
            </div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#F1F5F9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {scopeTitle}
            </div>
          </div>
        )}

        <nav className="management-sidebar-nav" aria-label="Menu chức năng">
          {groups.map(group => (
            <div key={group.id} className="management-nav-group">
              {group.title && !collapsed && (
                <div className="management-nav-group-title">{group.title}</div>
              )}
              <ul className="management-nav-list">
                {group.items.map(item => {
                  const isActive = item.exact
                    ? location.pathname === item.path
                    : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);

                  return (
                    <li key={item.id}>
                      <NavLink
                        to={item.path}
                        end={item.exact}
                        className={({ isActive: navActive }) =>
                          `management-nav-link ${navActive || isActive ? 'is-active' : ''}`
                        }
                        title={collapsed ? item.label : undefined}
                        aria-label={collapsed ? item.label : undefined}
                      >
                        {item.icon && <span className="management-nav-icon" aria-hidden="true">{item.icon}</span>}
                        {!collapsed && <span className="management-nav-label">{item.label}</span>}
                        {!collapsed && item.badge !== undefined && (
                          <span className="management-nav-badge">{item.badge}</span>
                        )}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
};
