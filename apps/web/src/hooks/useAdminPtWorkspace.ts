import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAdminGymContext } from './useAdminGymContext';
import { useAuth } from './useAuth';
import { ptService } from '../services/pt.service';
import { ApiClientError } from '../services/api-client';

export const useAdminPtWorkspace = (gymId: string) => {
  const context = useAdminGymContext(gymId);
  const { refreshSession } = useAuth();
  const [regPage, setRegPage] = useState(1), [aptPage, setAptPage] = useState(1);
  const [recovered, setRecovered] = useState<string | null>(null);
  const enabled = context.enabled && !!context.gym.data && !context.gym.isError;
  const regs = useQuery({ queryKey: ['pt', context.actorId, gymId, 'admin-registrations', regPage],
    queryFn: ({ signal }) => ptService.registrations(regPage, gymId, signal), enabled });
  const apts = useQuery({ queryKey: ['pt', context.actorId, gymId, 'admin-appointments', aptPage],
    queryFn: ({ signal }) => ptService.appointments(aptPage, gymId, signal), enabled });
  const accessError = [context.gym.error, regs.error, apts.error].find(error => error instanceof ApiClientError && [401, 403].includes(error.statusCode));
  useEffect(() => { if (accessError) void refreshSession(); }, [accessError, refreshSession]);
  useEffect(() => {
    if (!regs.isFetching && !regs.isError && regs.data && regPage > Math.max(1, regs.data.pagination.totalPages)) {
      setRegPage(Math.max(1, regs.data.pagination.totalPages)); setRecovered('Đăng ký PT');
    }
  }, [regs.data, regs.isFetching, regs.isError, regPage]);
  useEffect(() => {
    if (!apts.isFetching && !apts.isError && apts.data && aptPage > Math.max(1, apts.data.pagination.totalPages)) {
      setAptPage(Math.max(1, apts.data.pagination.totalPages)); setRecovered('Lịch tập');
    }
  }, [apts.data, apts.isFetching, apts.isError, aptPage]);
  return { ...context, regs, apts, accessError, recovered, setRegPage, setAptPage };
};
