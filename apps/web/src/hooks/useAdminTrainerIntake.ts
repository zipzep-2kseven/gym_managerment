import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { useGymMutation } from './useGym';
import { gymService } from '../services/gym.service';
import { adminUserService } from '../services/admin-user.service';
import { ApiClientError } from '../services/api-client';
import type { ProvisionResult } from '../types/gym.types';

type IntakeBody = Record<string, string | number>;
const readOutcome = async (gymId: string, body: IntakeBody, signal: AbortSignal) => {
  let userId = String(body.user_id || '').toLowerCase();
  if (body.email) {
    let page = 1;
    while (true) {
      const users = await adminUserService.list({ page, search: String(body.email) }, signal);
      const account = users.items.find(user => user.email.toLowerCase() === String(body.email).toLowerCase());
      if (account) { userId = account.user_id; break; }
      if (page * users.page_size >= users.total) break;
      page++;
    }
  }
  let page = 1;
  while (true) {
    const roster = await gymService.managedTrainers(gymId, { page, pageSize: 100 }, signal);
    const assignment = roster.data.find(trainer => trainer.user_id === userId);
    if (assignment) return assignment.status === 'ACTIVE' ? 'assigned' : 'inactive';
    if (!roster.pagination.hasNextPage) break;
    page++;
  }
  return body.email && userId ? 'account-only' : 'absent';
};

export const useAdminTrainerIntake = (gymId: string) => {
  const { user, refreshSession } = useAuth();
  const client = useQueryClient();
  const [mode, setMode] = useState('assign');
  const [saved, setSaved] = useState(false);
  const [credential, setCredential] = useState<ProvisionResult | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const [submitted, setSubmitted] = useState<IntakeBody>({});
  const submitting = useRef(false);
  const mutation = useGymMutation((body: IntakeBody) => mode === 'assign'
    ? gymService.assignTrainer(gymId, body) : gymService.provisionTrainer(gymId, body), { affectsAccounts: true, gcTime: 0 });
  const recovery = useQuery({ queryKey: ['gyms', 'admin', user?.user_id, gymId, 'intake-outcome', submitted],
    queryFn: ({ signal }) => readOutcome(gymId, submitted, signal), enabled: false, retry: false, gcTime: 0 });
  useEffect(() => {
    if (recovery.error instanceof ApiClientError && [401, 403].includes(recovery.error.statusCode)) void refreshSession();
  }, [recovery.error, refreshSession]);
  const changeMode = (next: string) => {
    if (submitting.current || uncertain) return;
    setMode(next); setSaved(false); setCredential(null); setSubmitted({}); mutation.reset();
  };
  const submit = (form: HTMLFormElement) => {
    if (submitting.current || saved || uncertain) return;
    submitting.current = true;
    const values = new FormData(form), body: IntakeBody = {};
    const keys = mode === 'assign' ? ['user_id'] : ['full_name', 'email', 'phone'];
    for (const key of [...keys, 'specialization', 'experience_years', 'bio']) {
      const value = String(values.get(key) ?? '').trim();
      if (value) body[key] = key === 'experience_years' ? Number(value) : value;
    }
    setSubmitted(body);
    mutation.mutate(body, {
      onSuccess: result => {
        setSaved(true);
        if (result && typeof result === 'object' && 'temporary_password' in result) setCredential(result as ProvisionResult);
        mutation.reset(); submitting.current = false;
      },
      onError: error => {
        setUncertain(!(error instanceof ApiClientError) || error.statusCode === 0 || error.statusCode >= 500);
        if (error instanceof ApiClientError && error.code === 'GYM_INACTIVE') void client.invalidateQueries({ queryKey: ['gyms'] });
        submitting.current = false;
      },
    });
  };
  const reconcile = async () => {
    const result = await recovery.refetch();
    if (result.isError) return;
    if (result.data === 'assigned') { setSaved(true); setUncertain(false); mutation.reset(); }
    if (result.data === 'absent') { setUncertain(false); mutation.reset(); }
  };
  return { mode, changeMode, saved, credential, hideCredential: () => setCredential(null), mutation, uncertain, recovery, reconcile, submit };
};
