import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { gymService } from '../services/gym.service';
import { ApiClientError } from '../services/api-client';
import { useAuth } from './useAuth';
import { useNavigate } from 'react-router-dom';

export const useGym = (id: string) => useQuery({ queryKey: ['gyms', 'public', id], queryFn: () => gymService.gym(id), enabled: !!id });
export const useGymMutation = <T,>(action: (input: T) => Promise<unknown>) => {
  const client = useQueryClient();
  const { refreshSession } = useAuth();
  const navigate = useNavigate();
  return useMutation({ mutationFn: action, retry: false,
    onSuccess: async () => { await client.invalidateQueries({ queryKey: ['gyms'] }); },
    onError: async (error) => {
      if (!(error instanceof ApiClientError)) return;
      if (error.code === 'PASSWORD_CHANGE_REQUIRED') navigate('/change-password');
      if (error.statusCode === 401 || error.statusCode === 403) await refreshSession();
    },
  });
};
