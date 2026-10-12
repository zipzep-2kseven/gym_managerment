import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/navigation/Sidebar';
import { Topbar } from '../components/navigation/Topbar';
import type { NavigationGroup } from '../types/navigation.types';
import '../management.css';

interface ManagementShellProps {
  groups: NavigationGroup[];
  scopeTitle?: string;
  roleBadge?: string;
  children?: React.ReactNode;
  className?: string;
}

export const ManagementShell: React.FC<ManagementShellProps> = ({
  groups,
  scopeTitle,
  roleBadge,
  children,
  className = '',
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className={`management-shell ${className}`}>
      <a className="skip-link" href="#gym-main">
        Đến nội dung chính
      </a>

      <div className="management-layout">
        <Sidebar
          groups={groups}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed(prev => !prev)}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
          scopeTitle={scopeTitle}
        />

        <div className="management-content-wrapper">
          <Topbar
            onToggleMobileMenu={() => setMobileOpen(prev => !prev)}
            onToggleCollapse={() => setCollapsed(prev => !prev)}
            collapsed={collapsed}
            mobileOpen={mobileOpen}
            scopeTitle={scopeTitle}
            roleBadge={roleBadge}
          />

          <main id="gym-main" tabIndex={-1} className="management-main">
            {children || <Outlet />}
          </main>
        </div>
      </div>
    </div>
  );
};
