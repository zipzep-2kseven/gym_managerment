import { useCallback, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from './useAuth';
import { useAdminGymContext } from './useAdminGymContext';
import { adminMembershipService } from '../services/admin-membership.service';
import { ApiClientError } from '../services/api-client';

export const useAdminMemberships = (gymId: string) => {
  const { refreshSession } = useAuth();
  const [params, setParams] = useSearchParams();
  const { gym, validGym, enabled, actorId } = useAdminGymContext(gymId);
  const scope = `${actorId}:${gymId}`;
  const previousScope = useRef(scope);
  const changedScope = previousScope.current !== scope;
  const rawPage = params.get('page') || '1';
  const page = !changedScope && /^[1-9]\d*$/.test(rawPage) && Number(rawPage) <= 1000000 ? Number(rawPage) : 1;
  useEffect(() => {
    if (previousScope.current !== scope) {
      previousScope.current = scope;
      setParams({ page: '1' }, { replace: true });
      return;
    }
    const canonical = new URLSearchParams();
    if (params.has('page')) canonical.set('page', String(page));
    if (params.toString() !== canonical.toString()) setParams(canonical, { replace: true });
  }, [scope, params, page, setParams]);
  const list = useQuery({ queryKey: ['gyms', 'admin', actorId, gymId, 'memberships', { page, pageSize: 20 }],
    queryFn: ({ signal }) => adminMembershipService.list(gymId, page, signal),
    enabled: enabled && !!gym.data && !gym.isError });
  const accessError = [gym.error, list.error].find(error => error instanceof ApiClientError && [401, 403].includes(error.statusCode));
  useEffect(() => { if (accessError) void refreshSession(); }, [accessError, refreshSession]);
  const setPage = useCallback((next: number) => setParams({ page: String(next) }), [setParams]);
  return { gym, list, page, validGym, accessError, setPage, actorId };
};
