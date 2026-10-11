import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ManagementShell } from './ManagementShell';
import type { NavigationGroup } from '../types/navigation.types';

export const ManagerLayout: React.FC = () => {
  const { user } = useAuth();

  const managerAssignment = useMemo(() => {
    return user?.active_gym_assignments?.find(item => item.assignment_type === 'MANAGER');
  }, [user]);

  const gymId = managerAssignment?.gym_id;
  const gymName = managerAssignment?.gym_name || 'Cơ sở quản lý';

  const groups: NavigationGroup[] = useMemo(() => {
    return [
      {
        id: 'overview',
        items: [
          {
            id: 'dashboard',
            label: 'Tổng quan',
            path: '/manager/dashboard',
            exact: true,
            icon: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="9" />
                <rect x="14" y="3" width="7" height="5" />
                <rect x="14" y="12" width="7" height="9" />
                <rect x="3" y="16" width="7" height="5" />
              </svg>
            ),
          },
        ],
      },
      {
        id: 'operations',
        title: 'VẬN HÀNH',
        items: [
          {
            id: 'pt-schedule',
            label: 'Lịch tập & PT',
            path: '/manager/pt',
            icon: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            ),
          },
          {
            id: 'consultations',
            label: 'Yêu cầu tư vấn',
            path: '/manager/consultations',
            icon: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            ),
          },
          {
            id: 'reports',
            label: 'Xử lý báo cáo',
            path: '/manager/reports',
            icon: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            ),
          },
        ],
      },
      {
        id: 'facility',
        title: 'CƠ SỞ',
        items: [
          {
            id: 'packages',
            label: 'Gói tập',
            path: '/manager/packages',
            icon: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
            ),
          },
          {
            id: 'trainers',
            label: 'Quản lý PT',
            path: '/manager/trainers',
            icon: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            ),
          },
          {
            id: 'gym-info',
            label: 'Thông tin Gym',
            path: '/manager/gym',
            icon: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
            ),
          },
          {
            id: 'gallery',
            label: 'Ảnh Gym',
            path: '/manager/gallery',
            icon: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            ),
          },
          ...(gymId
            ? [
                {
                  id: 'public-gym',
                  label: 'Xem trang Gym',
                  path: `/gyms/${gymId}`,
                  icon: (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  ),
                },
              ]
            : []),
        ],
      },
    ];
  }, [gymId]);

  if (!managerAssignment) {
    return (
      <div className="gym-shell">
        <main id="gym-main" tabIndex={-1} className="gym-main">
          <div className="gym-panel" role="alert">
            <h1>Chưa có phân công phòng tập</h1>
            <p>Tài khoản của bạn chưa được bổ nhiệm quản lý cơ sở nào trong hệ thống.</p>
            <Link to="/profile" className="btn-primary">
              Quay lại hồ sơ cá nhân
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <ManagementShell
      groups={groups}
      scopeTitle={gymName}
      roleBadge="Quản lý cơ sở"
    />
  );
};
