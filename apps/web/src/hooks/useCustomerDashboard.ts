import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { paymentService } from '../services/payment.service';
import { ptService } from '../services/pt.service';
import { reportService } from '../services/report.service';

export const useCustomerDashboard = () => {
  const { user } = useAuth();
  const isCustomer = user?.roles?.includes('CUSTOMER');

  const membershipsQuery = useQuery({
    queryKey: ['customer', 'dashboard', user?.user_id, 'memberships'],
    queryFn: ({ signal }) => paymentService.memberships(1, signal),
    enabled: !!isCustomer,
    refetchOnWindowFocus: false,
  });

  const appointmentsQuery = useQuery({
    queryKey: ['customer', 'dashboard', user?.user_id, 'appointments'],
    queryFn: ({ signal }) => ptService.appointments(1, undefined, signal),
    enabled: !!isCustomer,
    refetchOnWindowFocus: false,
  });

  const paymentsQuery = useQuery({
    queryKey: ['customer', 'dashboard', user?.user_id, 'payments'],
    queryFn: ({ signal }) => paymentService.payments(1, signal),
    enabled: !!isCustomer,
    refetchOnWindowFocus: false,
  });

  const reportsQuery = useQuery({
    queryKey: ['customer', 'dashboard', user?.user_id, 'reports'],
    queryFn: ({ signal }) => reportService.list(1, '', undefined, signal),
    enabled: !!isCustomer,
    refetchOnWindowFocus: false,
  });

  return {
    membershipsQuery,
    appointmentsQuery,
    paymentsQuery,
    reportsQuery,
  };
};
