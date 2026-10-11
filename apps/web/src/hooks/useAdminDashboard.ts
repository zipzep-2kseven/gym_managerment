import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { gymService } from '../services/gym.service';
import { adminUserService } from '../services/admin-user.service';
import { reviewModerationService } from '../services/review-moderation.service';

export const useAdminDashboard = () => {
  const { user } = useAuth();
  const isAdmin = user?.roles?.includes('ADMIN');

  const gymsQuery = useQuery({
    queryKey: ['admin', 'dashboard', user?.user_id, 'gyms'],
    queryFn: () => gymService.gyms({ page: 1, pageSize: 5 }, true),
    enabled: !!isAdmin,
    refetchOnWindowFocus: false,
  });

  const usersCountQuery = useQuery({
    queryKey: ['admin', 'dashboard', user?.user_id, 'users-count'],
    queryFn: ({ signal }) => adminUserService.list({ page: 1 }, signal),
    enabled: !!isAdmin,
    refetchOnWindowFocus: false,
  });

  const reviewsCountQuery = useQuery({
    queryKey: ['admin', 'dashboard', user?.user_id, 'reviews-count'],
    queryFn: ({ signal }) => reviewModerationService.list({ page: 1, kind: 'gym' }, signal),
    enabled: !!isAdmin,
    refetchOnWindowFocus: false,
  });

  return {
    gymsQuery,
    usersCountQuery,
    reviewsCountQuery,
  };
};
