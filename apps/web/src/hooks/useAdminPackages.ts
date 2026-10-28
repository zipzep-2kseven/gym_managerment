import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useListFilters } from './useListFilters';
import { useAdminPackageAction } from './useAdminPackageAction';
import { useAuth } from './useAuth';
import { ApiClientError } from '../services/api-client';
import { packageService } from '../services/package.service';

export const useAdminPackages = (gymId: string, enabled: boolean) => {
  const { user, refreshSession } = useAuth(), cache = useQueryClient();
  const { query: filters, setFilter } = useListFilters('package_name', true);
  const [params, setParams] = useSearchParams();
  const canonical = new URLSearchParams({ page: String(filters.page), sortBy: filters.sortBy!, sortOrder: filters.sortOrder! });
  if (filters.search) canonical.set('search', filters.search);
  if (filters.status) canonical.set('status', filters.status);
  const url = canonical.toString(), incoming = params.toString();
  useEffect(() => { if (incoming !== url) setParams(url, { replace: true }); }, [incoming, url, setParams]);
  const key = ['packages', gymId, user?.user_id, 'list', filters];
  const query = useQuery({ queryKey: key, queryFn: ({ signal }) => packageService.list(gymId, filters, true, signal),
    enabled, retry: false, refetchOnWindowFocus: false });
  const readList = () => cache.fetchQuery({ queryKey: key,
    queryFn: ({ signal }) => packageService.list(gymId, filters, true, signal), staleTime: 0, retry: false });
  const action = useAdminPackageAction(gymId, readList);
  const denied = action.accessError || (query.error instanceof ApiClientError && [401, 403].includes(query.error.statusCode) ? query.error : null);
  useEffect(() => { if (denied) void refreshSession(); }, [denied, refreshSession]);
  useEffect(() => {
    if (!enabled || !query.data || query.isFetching || query.isError || action.locked) return;
    const { page, totalPages } = query.data.pagination;
    if (!query.data.data.length && page > Math.max(1, totalPages)) setFilter('page', String(Math.max(1, totalPages)));
  }, [enabled, query.data, query.isFetching, query.isError, action.locked, setFilter]);
  return { query, filters, setFilter, action, denied };
};
