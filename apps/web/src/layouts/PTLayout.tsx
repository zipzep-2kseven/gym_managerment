import React, { useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { ManagementShell } from './ManagementShell';
import type { NavigationGroup } from '../types/navigation.types';

interface PTLayoutProps {
  children?: React.ReactNode;
}

export const PTLayout: React.FC<PTLayoutProps> = ({ children }) => {
  const { user } = useAuth();

  const ptAssignment = user?.active_gym_assignments.find(a => a.assignment_type === 'PT');
  const gymName = ptAssignment?.gym_name || 'HLV Độc Lập';

  const groups: NavigationGroup[] = useMemo(() => {
    return [
      {
        id: 'overview',
        items: [
          {
            id: 'dashboard',
            label: 'Tổng quan',
            path: '/pt/dashboard',
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
        id: 'training',
        title: 'LÀM VIỆC & HUẤN LUYỆN',
        items: [
          {
            id: 'my-pt',
            label: 'Lịch dạy & Học viên',
            path: '/my-pt',
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
            id: 'pt-profile',
            label: 'Hồ sơ Huấn luyện viên',
            path: '/pt/profile',
            icon: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
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
            id: 'explore-gyms',
            label: 'Khám phá phòng Gym',
            path: '/gyms',
            icon: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
            ),
          },
        ],
      },
    ];
  }, []);

  return (
    <ManagementShell
      groups={groups}
      scopeTitle={gymName}
      roleBadge="Huấn luyện viên"
    >
      {children}
    </ManagementShell>
  );
};
