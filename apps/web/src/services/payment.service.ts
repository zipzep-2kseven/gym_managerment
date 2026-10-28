import { apiClient } from './api-client';
export interface DemoPayment {
  payment_id: string; gym_id: string; package_id: string; amount: string; payment_method: string;
  payment_status: string; created_at: string; demo: boolean;
}
export interface Membership {
  membership_id: string; gym_id: string; package_id: string; payment_id: string | null;
  purchase_price: string; start_date: string; end_date: string; status: string; demo: boolean;
}
export interface CheckoutResult { payment: DemoPayment; membership: Membership; demo: boolean; replayed: boolean }
export const paymentService = {
  checkout: (gymId: string, packageId: string, method: string, key: string) => apiClient.post<CheckoutResult>(`/gyms/${encodeURIComponent(gymId)}/payments`,
    { package_id: packageId, payment_method: method }, { headers: { 'Idempotency-Key': key } }),
  payments: (page: number, signal?: AbortSignal) => apiClient.list<DemoPayment>('/payments/me', { params: { page, pageSize: 12 }, signal }),
  memberships: (page: number, signal?: AbortSignal) => apiClient.list<Membership>('/memberships/me', { params: { page, pageSize: 12 }, signal }),
};
