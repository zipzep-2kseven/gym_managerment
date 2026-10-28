import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { ptService } from '../services/pt.service';
import { trainerProfileService } from '../services/trainer-profile.service';

export const usePtDashboard = () => {
  const { user } = useAuth();
  const isPt = user?.roles?.includes('PT');

  const appointmentsQuery = useQuery({
    queryKey: ['pt', 'dashboard', user?.user_id, 'appointments'],
    queryFn: ({ signal }) => ptService.appointments(1, undefined, signal),
    enabled: !!isPt,
    refetchOnWindowFocus: false,
  });

  const registrationsQuery = useQuery({
    queryKey: ['pt', 'dashboard', user?.user_id, 'registrations'],
    queryFn: ({ signal }) => ptService.registrations(1, undefined, signal),
    enabled: !!isPt,
    refetchOnWindowFocus: false,
  });

  const profileQuery = useQuery({
    queryKey: ['pt', 'dashboard', user?.user_id, 'profile'],
    queryFn: ({ signal }) => trainerProfileService.mine(signal),
    enabled: !!isPt,
    refetchOnWindowFocus: false,
  });

  return {
    appointmentsQuery,
    registrationsQuery,
    profileQuery,
  };
};
