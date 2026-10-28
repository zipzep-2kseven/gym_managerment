import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from './useAuth';
import { useListFilters } from './useListFilters';
import { gymService } from '../services/gym.service';
import { ApiClientError } from '../services/api-client';

export const useAdminReportGyms = () => {
  const { user, refreshSession } = useAuth();
  const { query: raw, setFilter } = useListFilters('gym_name', true);
  const [params, setParams] = useSearchParams();
  const query = { ...raw, search: raw.search?.trim() || undefined };
  const canonical = new URLSearchParams();
  if (query.search) canonical.set('search', query.search);
  if (query.status) canonical.set('status', query.status);
  if (params.has('page')) canonical.set('page', String(query.page));
  if (params.has('sortBy')) canonical.set('sortBy', query.sortBy!);
  if (params.has('sortOrder')) canonical.set('sortOrder', query.sortOrder!);
  const canonicalText = canonical.toString();
  useEffect(() => {
    if (params.toString() !== canonicalText) setParams(canonicalText, { replace: true });
  }, [params, canonicalText, setParams]);
  const list = useQuery({ queryKey: ['gyms', 'admin', user?.user_id, 'report-entry', query],
    queryFn: ({ signal }) => gymService.gyms(query, true, signal), enabled: !!user?.roles.includes('ADMIN') });
  const accessError = list.error instanceof ApiClientError && [401, 403].includes(list.error.statusCode) ? list.error : null;
  useEffect(() => { if (accessError) void refreshSession(); }, [accessError, refreshSession]);
  return { list, query, setFilter, accessError };
};
