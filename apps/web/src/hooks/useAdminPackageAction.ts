import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { packageService } from '../services/package.service';
import { ApiClientError } from '../services/api-client';
import type { GymPackage, PackageInput } from '../types/package.types';

export type PackageAction = { kind: 'create'; input: PackageInput } |
  { kind: 'update'; row: GymPackage; input: Partial<PackageInput> } |
  { kind: 'status'; row: GymPackage; active: boolean };
export const useAdminPackageAction = (gymId: string, readList: () => Promise<unknown>) => {
  const cache = useQueryClient(), { user, refreshSession } = useAuth();
  const [receipt, setReceipt] = useState<{ action: PackageAction; row: GymPackage } | null>(null);
  const [uncertain, setUncertain] = useState<PackageAction | null>(null), [current, setCurrent] = useState<GymPackage | null>(null);
  const [error, setError] = useState<Error | null>(null), [accessError, setAccessError] = useState<ApiClientError | null>(null);
  const [reading, setReading] = useState(false), [checked, setChecked] = useState(false);
  const sending = useRef(false), readingRef = useRef(false), mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const recordError = (failure: Error) => {
    setError(failure);
    if (failure instanceof ApiClientError && [401, 403].includes(failure.statusCode)) {
      setAccessError(failure); void refreshSession();
    }
  };
  const mutation = useMutation({ retry: false, mutationFn: async (action: PackageAction) => {
    const row = await (action.kind === 'create' ? packageService.create(gymId, action.input)
      : action.kind === 'update' ? packageService.update(gymId, action.row.package_id, action.input)
      : packageService.status(gymId, action.row.package_id, action.active));
    if (!row || row.gym_id !== gymId || (action.kind !== 'create' && row.package_id !== action.row.package_id))
      throw new Error('Phản hồi không xác định được gói tập đã gửi. Cần đọc lại catalog.');
    return row;
  } });
  const invalidate = () => cache.invalidateQueries({ queryKey: ['packages', gymId], refetchType: 'none' });
  const send = async (action: PackageAction): Promise<GymPackage | null> => {
    if (sending.current || readingRef.current || uncertain || accessError) return null;
    sending.current = true; setError(null); setReceipt(null); setChecked(false); setCurrent(null);
    let result: GymPackage;
    try { result = await mutation.mutateAsync(action); }
    catch (failure) {
      await invalidate();
      if (mounted.current && failure instanceof Error) {
        recordError(failure);
        if (!(failure instanceof ApiClientError && failure.statusCode === 400)) setUncertain(action);
      }
      sending.current = false; return null;
    }
    await invalidate();
    if (!mounted.current) { sending.current = false; return result; }
    setReceipt({ action, row: result }); setUncertain(action); setReading(true);
    try { await readList(); if (mounted.current) setUncertain(null); }
    catch (failure) { if (mounted.current && failure instanceof Error) recordError(failure); }
    finally { sending.current = false; if (mounted.current) setReading(false); }
    return result;
  };
  const recover = async () => {
    if (!uncertain || sending.current || readingRef.current || accessError) return;
    readingRef.current = true; setReading(true); setError(null); setChecked(false); setCurrent(null);
    try {
      const row = uncertain.kind === 'create' ? null : await cache.fetchQuery({
        queryKey: ['packages', gymId, user?.user_id, 'admin-readback', uncertain.row.package_id],
        queryFn: ({ signal }) => packageService.currentManaged(gymId, uncertain.row.package_id, signal), staleTime: 0, retry: false });
      await invalidate(); await readList();
      if (mounted.current) { setCurrent(row); setChecked(true); }
    } catch (failure) { if (mounted.current && failure instanceof Error) recordError(failure); }
    finally { readingRef.current = false; if (mounted.current) setReading(false); }
  };
  const acceptRead = () => { if (checked && !reading) { setUncertain(null); setError(null); setChecked(false); } };
  const reset = () => { if (!uncertain && !sending.current && !readingRef.current) { setReceipt(null); setError(null); setCurrent(null); setChecked(false); mutation.reset(); } };
  return { receipt, uncertain, current, checked, reading, pending: mutation.isPending, error, accessError,
    locked: mutation.isPending || reading || !!uncertain, send, recover, acceptRead, reset };
};
