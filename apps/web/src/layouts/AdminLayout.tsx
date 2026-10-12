import React, { useMemo } from 'react';
import '../admin.css';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { gymService } from '../services/gym.service';
import { ManagementShell } from './ManagementShell';
import type { NavigationGroup } from '../types/navigation.types';

export const AdminLayout: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();

  // Detect if current route is within a specific Gym scope: /admin/gyms/:gymId/*
  const match = location.pathname.match(/^\/admin\/gyms\/([^/]+)/);
  const potentialGymId = match ? match[1] : null;
  const isGymScoped = potentialGymId && potentialGymId !== 'create';

  const gymQuery = useQuery({
    queryKey: ['gyms', 'admin', user?.user_id, potentialGymId],
    queryFn: ({ signal }) => gymService.adminGym(potentialGymId!, signal),
    enabled: !!isGymScoped,
    staleTime: 60000,
  });

  const gymName = gymQuery.data?.gym_name || 'Cơ sở';

  const groups: NavigationGroup[] = useMemo(() => {
    if (isGymScoped) {
      return [
        {
          id: 'scoped-facility',
          title: `GIÁM SÁT CƠ SỞ: ${gymName.toUpperCase()}`,
          items: [
            {
              id: 'back-to-gyms',
              label: '← Danh sách cơ sở',
              path: '/admin/gyms',
              exact: true,
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="12 19 5 12 12 5" />
                </svg>
              ),
            },
            {
              id: 'gym-details',
              label: 'Thông tin cơ sở',
              path: `/admin/gyms/${potentialGymId}`,
              exact: true,
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                </svg>
              ),
            },
            {
              id: 'gym-packages',
              label: 'Gói tập cơ sở',
              path: `/admin/gyms/${potentialGymId}/packages`,
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                </svg>
              ),
            },
            {
              id: 'gym-gallery',
              label: 'Ảnh Gym',
              path: `/admin/gyms/${potentialGymId}/gallery`,
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              ),
            },
            {
              id: 'gym-reports',
              label: 'Báo cáo sự cố',
              path: `/admin/gyms/${potentialGymId}/reports`,
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                </svg>
              ),
            },
            {
              id: 'gym-pt',
              label: 'Giám sát lịch PT',
              path: `/admin/gyms/${potentialGymId}/pt`,
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              ),
            },
          ],
        },
        {
          id: 'system-return',
          title: 'HỆ THỐNG',
          items: [
            {
              id: 'sys-dashboard',
              label: 'Tổng quan hệ thống',
              path: '/admin/dashboard',
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
            {
              id: 'sys-users',
              label: 'Quản lý tài khoản',
              path: '/admin/users',
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                </svg>
              ),
            },
          ],
        },
      ];
    }

    // Default: System-wide admin navigation
    return [
      {
        id: 'overview',
        items: [
          {
            id: 'dashboard',
            label: 'Tổng quan',
            path: '/admin/dashboard',
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
        id: 'facilities',
        title: 'CƠ SỞ TOÀN SÀN',
        items: [
          {
            id: 'gyms',
            label: 'Quản lý cơ sở',
            path: '/admin/gyms',
            exact: true,
            icon: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
            ),
          },
          {
            id: 'managers',
            label: 'Bổ nhiệm Manager',
            path: '/admin/managers',
            icon: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="20" y1="8" x2="20" y2="14" />
                <line x1="23" y1="11" x2="17" y2="11" />
              </svg>
            ),
          },
        ],
      },
      {
        id: 'system',
        title: 'HỆ THỐNG',
        items: [
          {
            id: 'users',
            label: 'Quản lý tài khoản',
            path: '/admin/users',
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
            id: 'roles',
            label: 'Vai trò hệ thống',
            path: '/admin/roles',
            icon: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            ),
          },
          {
            id: 'reviews',
            label: 'Kiểm duyệt đánh giá',
            path: '/admin/reviews',
            icon: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            ),
          },
        ],
      },
    ];
  }, [isGymScoped, potentialGymId, gymName]);

  return (
    <ManagementShell
      className="admin-workspace"
      groups={groups}
      scopeTitle={isGymScoped ? gymName : 'Toàn hệ thống'}
      roleBadge={isGymScoped ? 'Giám sát cơ sở' : 'Quản trị viên'}
    />
  );
};
