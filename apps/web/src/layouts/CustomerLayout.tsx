import React, { useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { ManagementShell } from './ManagementShell';
import type { NavigationGroup } from '../types/navigation.types';

interface CustomerLayoutProps {
  children?: React.ReactNode;
}

export const CustomerLayout: React.FC<CustomerLayoutProps> = ({ children }) => {
  const { user } = useAuth();

  const customerName = user?.profile?.full_name || 'Hội viên';

  const groups: NavigationGroup[] = useMemo(() => {
    return [
      {
        id: 'overview',
        items: [
          {
            id: 'dashboard',
            label: 'Tổng quan',
            path: '/dashboard',
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
        id: 'activity',
        title: 'HỘI VIÊN & TẬP LUYỆN',
        items: [
          {
            id: 'memberships',
            label: 'Thẻ hội viên của tôi',
            path: '/memberships',
            icon: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
            ),
          },
          {
            id: 'my-pt',
            label: 'Lịch tập & HLV của tôi',
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
            id: 'payments',
            label: 'Lịch sử giao dịch',
            path: '/payments',
            icon: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            ),
          },
          {
            id: 'reports',
            label: 'Báo cáo sự cố',
            path: '/reports',
            icon: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              </svg>
            ),
          },
        ],
      },
      {
        id: 'discovery',
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
      scopeTitle={customerName}
      roleBadge="Hội viên"
    >
      {children}
    </ManagementShell>
  );
};
