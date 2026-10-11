import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';
import { packageService } from '../services/package.service';
import { ApiClientError } from '../services/api-client';
import type { ListQuery } from '../types/gym.types';
export const usePackages = (gymId: string, query: ListQuery, managed = false) => {
  const { user } = useAuth();
  return useQuery({ queryKey: ['packages', gymId, managed ? user?.user_id : 'public', 'list', query],
    queryFn: ({ signal }) => packageService.list(gymId, query, managed, signal), enabled: !!gymId });
};
export const usePackage = (gymId: string, id: string) => useQuery({
  queryKey: ['packages', gymId, 'public', id],
  queryFn: ({ signal }) => packageService.detail(gymId, id, signal), enabled: !!gymId && !!id,
});
export const usePackageMutation = <T,>(gymId: string, action: (input: T) => Promise<unknown>) => {
  const client = useQueryClient();
  const { refreshSession } = useAuth();
  const navigate = useNavigate();
  return useMutation({ mutationFn: action, retry: false,
    onSuccess: async () => { await client.invalidateQueries({ queryKey: ['packages', gymId] }); },
    onError: async error => {
      if (!(error instanceof ApiClientError)) return;
      if (error.code === 'PASSWORD_CHANGE_REQUIRED') navigate('/change-password');
      if ([401, 403].includes(error.statusCode)) await refreshSession();
    },
  });
};
