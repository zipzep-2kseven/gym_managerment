import { useSearchParams } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { ApiClientError } from '../services/api-client';
import { reviewModerationService, type ModeratedReview, type ModerationFilters } from '../services/review-moderation.service';

export const useAdminReviewModeration = () => {
  const { user, refreshSession } = useAuth(), cache = useQueryClient();
  const [params] = useSearchParams();
  const [filters, setFilters] = useState<ModerationFilters>(() => ({ kind: params.get('kind') === 'trainer' ? 'trainer' : 'gym', page: 1,
    ...(/^[0-9a-f-]{36}$/i.test(params.get('gym_id') || '') ? { gym_id: params.get('gym_id')! } : {}) }));
  const [receipt, setReceipt] = useState<ModeratedReview | null>(null), [uncertain, setUncertain] = useState<ModeratedReview | null>(null);
  const [accessError, setAccessError] = useState<ApiClientError | null>(null), [readError, setReadError] = useState<Error | null>(null);
  const [writeError, setWriteError] = useState<{ row: ModeratedReview; error: Error } | null>(null);
  const [reading, setReading] = useState(false), [revision, setRevision] = useState(0), [recovered, setRecovered] = useState<number | null>(null);
  const sending = useRef(false), readingRef = useRef(false), mounted = useRef(true);
  const prefix = ['review-moderation', user?.user_id];
  const query = useQuery({ queryKey: [...prefix, filters], queryFn: ({ signal }) => reviewModerationService.list(filters, signal), refetchOnWindowFocus: false });
  const denied = accessError || (query.error instanceof ApiClientError && [401, 403].includes(query.error.statusCode) ? query.error : null);
  useEffect(() => { if (denied) void refreshSession(); }, [denied, refreshSession]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const recordError = (error: Error) => {
    if (error instanceof ApiClientError && [401, 403].includes(error.statusCode)) setAccessError(error);
  };
  const readList = async (next = filters) => {
    await cache.invalidateQueries({ queryKey: prefix, refetchType: 'none' });
    return cache.fetchQuery({ queryKey: [...prefix, next], queryFn: ({ signal }) => reviewModerationService.list(next, signal), staleTime: 0, retry: false });
  };
  const mutation = useMutation({ mutationFn: ({ row, reason }: { row: ModeratedReview; reason: string }) => reviewModerationService.hide(row, reason), retry: false,
    onSuccess: async result => {
      await cache.invalidateQueries({ queryKey: ['reviews'], refetchType: 'none' });
      if (!mounted.current) { await cache.invalidateQueries({ queryKey: prefix, refetchType: 'none' }); return; }
      setReceipt(result); setUncertain(result); setWriteError(null);
      const next = { ...filters, page: 1 }; setFilters(next); setRecovered(null);
      try { await readList(next); if (mounted.current) { setUncertain(null); setRevision(value => value + 1); } }
      catch (error) { if (mounted.current && error instanceof Error) { setReadError(error); recordError(error); } }
    },
    onError: (error, variables) => {
      if (!mounted.current) return;
      setWriteError({ row: variables.row, error }); recordError(error);
      if (!(error instanceof ApiClientError && error.statusCode === 400)) setUncertain(variables.row);
    },
    onSettled: () => { sending.current = false; },
  });
  const busy = mutation.isPending || reading;
  const blocked = busy || !!uncertain || !!denied || query.isFetching || query.isError;
  useEffect(() => {
    const data = query.data;
    if (!busy && !uncertain && !query.isFetching && !query.isError && data && !data.items.length && filters.page > Math.max(1, Math.ceil(data.total / data.page_size))) {
      const page = Math.max(1, Math.ceil(data.total / data.page_size)); setRecovered(page); setFilters(current => ({ ...current, page }));
    }
  }, [busy, uncertain, query.data, query.isFetching, query.isError, filters.page]);
  const reload = async () => {
    if (sending.current || readingRef.current) return;
    readingRef.current = true; setReading(true); setReadError(null);
    try {
      const current = uncertain ? await cache.fetchQuery({ queryKey: [...prefix, 'read-back', uncertain.kind, uncertain.review_id], queryFn: ({ signal }) => reviewModerationService.current(uncertain, signal), staleTime: 0, retry: false }) : null;
      if (current?.status === 'HIDDEN') {
        await cache.invalidateQueries({ queryKey: ['reviews'], refetchType: 'none' });
        if (mounted.current) setReceipt(current);
      }
      await readList();
      if (accessError) cache.removeQueries({ queryKey: ['gyms', 'admin', 'review-filter', user?.user_id] });
      if (mounted.current) { setUncertain(null); setAccessError(null); setWriteError(null); setRevision(value => value + 1); }
    } catch (error) { if (mounted.current && error instanceof Error) { setReadError(error); recordError(error); } }
    finally { readingRef.current = false; if (mounted.current) setReading(false); }
  };
  const send = (row: ModeratedReview, reason: string) => {
    if (blocked || sending.current || readingRef.current || row.status !== 'VISIBLE' || !reason.trim() || reason.trim().length > 1000) return;
    sending.current = true; setReceipt(null); setReadError(null); setWriteError(null); mutation.mutate({ row, reason });
  };
  const change = (value: Partial<ModerationFilters>) => {
    if (busy || uncertain || sending.current) return;
    setFilters(current => ({ ...current, ...value, page: value.page || 1 })); setReceipt(null); setWriteError(null); setReadError(null); setRecovered(null);
  };
  return { filters, query, receipt, uncertain, denied, readError, writeError, reading, revision, recovered, busy, blocked, pendingRow: mutation.isPending ? mutation.variables?.row : null, send, reload, change, setAccessError };
};
