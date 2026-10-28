import React from 'react';
import '../admin.css';
import { ManagementShell } from './ManagementShell';
import type { NavigationGroup } from '../types/navigation.types';

const icon = (path: React.ReactNode) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{path}</svg>;
const groups: NavigationGroup[] = [{
  id: 'admin',
  items: [
    { id: 'dashboard', label: 'Tổng quan', path: '/admin/dashboard', exact: true,
      icon: icon(<><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></>) },
    { id: 'gyms', label: 'Quản lý phòng Gym', path: '/admin/gyms',
      icon: icon(<><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></>) },
    { id: 'users', label: 'Quản lý tài khoản', path: '/admin/users',
      icon: icon(<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></>) },
    { id: 'reviews', label: 'Kiểm duyệt đánh giá', path: '/admin/reviews',
      icon: icon(<polygon points="12 2 15 8 22 9 17 14 18 21 12 18 6 21 7 14 2 9 9 8 12 2" />) },
  ],
}];

export const AdminLayout: React.FC = () => <ManagementShell
  className="admin-workspace" groups={groups} scopeTitle="Toàn hệ thống" roleBadge="Quản trị viên"
/>;
