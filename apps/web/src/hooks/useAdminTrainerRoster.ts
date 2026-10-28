import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from './useAuth';
import { gymService } from '../services/gym.service';
import { ApiClientError } from '../services/api-client';
import type { ListQuery } from '../types/gym.types';
import { useAdminGymContext } from './useAdminGymContext';

export const useAdminTrainerRoster = (gymId: string) => {
  const { user, refreshSession } = useAuth();
  const [params, setParams] = useSearchParams();
  const { gym, validGym, enabled } = useAdminGymContext(gymId);
  const page = Number(params.get('page'));
  const status = params.get('status');
  const sort = params.get('sortBy');
  const query: ListQuery = {
    page: Number.isSafeInteger(page) && page > 0 && page < 1000000 ? page : 1,
    pageSize: 20, search: params.get('search') || undefined,
    status: status === 'ACTIVE' || status === 'INACTIVE' ? status : undefined,
    sortBy: sort && ['created_at', 'joined_at', 'specialization'].includes(sort) ? sort : 'created_at',
    sortOrder: params.get('sortOrder') === 'asc' ? 'asc' : 'desc',
  };
  const roster = useQuery({ queryKey: ['gyms', 'admin', user?.user_id, gymId, 'trainers', query],
    queryFn: ({ signal }) => gymService.managedTrainers(gymId, query, signal), enabled: enabled && !!gym.data && !gym.isError });
  const accessError = [gym.error, roster.error].find(error => error instanceof ApiClientError && [401, 403].includes(error.statusCode));
  useEffect(() => { if (accessError) void refreshSession(); }, [accessError, refreshSession]);
  const setFilter = (key: string, value: string) => setParams(previous => {
    const next = new URLSearchParams(previous);
    if (value) next.set(key, value); else next.delete(key);
    if (key !== 'page') next.set('page', '1');
    return next;
  });
  return { gym, roster, query, validGym, accessError, setFilter };
};
