import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { adminDashboardKeys } from './adminDashboardKeys';
import { useAuth } from './useAuth';
import { adminDashboardService } from '../services/admin-dashboard.service';
import { ApiClientError } from '../services/api-client';

export const useAdminDashboard = () => {
  const { user, refreshSession } = useAuth();
  const summaryQuery = useQuery({
    queryKey: adminDashboardKeys.summary(user?.user_id),
    queryFn: ({ signal }) => adminDashboardService.summary(signal),
    enabled: !!user?.roles?.includes('ADMIN'),
    refetchOnWindowFocus: false,
  });
  useEffect(() => {
    const error = summaryQuery.error;
    if (error instanceof ApiClientError && [401, 403].includes(error.statusCode)) void refreshSession();
  }, [summaryQuery.error, refreshSession]);
  return { summaryQuery };
};
