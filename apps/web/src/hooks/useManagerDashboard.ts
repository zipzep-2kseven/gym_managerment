import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { consultationService } from '../services/consultation.service';
import { reportService } from '../services/report.service';
import { ptService } from '../services/pt.service';
import { packageService } from '../services/package.service';
import { gymService } from '../services/gym.service';

export const useManagerDashboard = (gymId?: string) => {
  const { user } = useAuth();

  const consultationsQuery = useQuery({
    queryKey: ['manager', 'dashboard', user?.user_id, gymId, 'consultations'],
    queryFn: ({ signal }) => consultationService.list(gymId!, 1, 'PENDING', signal),
    enabled: !!gymId,
    refetchOnWindowFocus: false,
  });

  const reportsQuery = useQuery({
    queryKey: ['manager', 'dashboard', user?.user_id, gymId, 'reports'],
    queryFn: ({ signal }) => reportService.list(1, 'PENDING', gymId, signal),
    enabled: !!gymId,
    refetchOnWindowFocus: false,
  });

  const appointmentsQuery = useQuery({
    queryKey: ['manager', 'dashboard', user?.user_id, gymId, 'appointments'],
    queryFn: ({ signal }) => ptService.appointments(1, gymId, signal),
    enabled: !!gymId,
    refetchOnWindowFocus: false,
  });

  const packagesQuery = useQuery({
    queryKey: ['manager', 'dashboard', user?.user_id, gymId, 'packages'],
    queryFn: ({ signal }) =>
      packageService.list(gymId!, { page: 1, pageSize: 1, status: 'ACTIVE' }, true, signal),
    enabled: !!gymId,
    refetchOnWindowFocus: false,
  });

  const trainersQuery = useQuery({
    queryKey: ['manager', 'dashboard', user?.user_id, gymId, 'trainers'],
    queryFn: () => gymService.managedTrainers(gymId!, { page: 1, pageSize: 1, status: 'ACTIVE' }),
    enabled: !!gymId,
    refetchOnWindowFocus: false,
  });

  return {
    consultationsQuery,
    reportsQuery,
    appointmentsQuery,
    packagesQuery,
    trainersQuery,
  };
};
