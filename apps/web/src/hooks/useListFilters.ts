import { useSearchParams } from 'react-router-dom';
import type { ListQuery } from '../types/gym.types';
export const useListFilters = (defaultSort: string, management = false) => {
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('page'));
  const allowed = defaultSort === 'package_name' ? ['package_name', 'price', 'duration_days', 'created_at'] : defaultSort === 'full_name' ? ['full_name', 'joined_at', 'created_at'] : defaultSort === 'specialization' ? ['specialization', 'joined_at', 'created_at'] : ['gym_name', 'address', 'created_at'];
  const sort = params.get('sortBy') || defaultSort;
  const status = params.get('status');
  const query: ListQuery = { page: Number.isSafeInteger(page) && page > 0 && page < 1000000 ? page : 1, pageSize: 12,
    search: params.get('search') || undefined, sortBy: allowed.includes(sort) ? sort : defaultSort,
    sortOrder: params.get('sortOrder') === 'desc' ? 'desc' : 'asc',
    status: management && (status === 'ACTIVE' || status === 'INACTIVE') ? status : undefined };
  const setFilter = (key: string, value: string) => setParams(previous => {
    const next = new URLSearchParams(previous);
    if (value) next.set(key, value); else next.delete(key);
    if (key !== 'page') next.set('page', '1');
    return next;
  });
  return { query, setFilter };
};
