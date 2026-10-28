import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { gymService } from '../services/gym.service';
import { ApiClientError } from '../services/api-client';

export const useAdminGymContext = (gymId: string) => {
  const { user, refreshSession } = useAuth();
  const validGym = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(gymId);
  const enabled = validGym && !!user?.roles.includes('ADMIN');
  const gym = useQuery({ queryKey: ['gyms', 'admin', user?.user_id, gymId],
    queryFn: ({ signal }) => gymService.adminGym(gymId, signal), enabled });
  useEffect(() => {
    if (gym.error instanceof ApiClientError && [401, 403].includes(gym.error.statusCode)) void refreshSession();
  }, [gym.error, refreshSession]);
  return { gym, validGym, enabled, actorId: user?.user_id };
};
