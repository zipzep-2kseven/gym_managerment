export type MembershipStatus = 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';

// FEAT-MEM-003 private Gym list projection, distinct from Customer demo cards.
export interface AdminMembership {
  membership_id: string;
  user_id: string;
  gym_id: string;
  package_id: string;
  payment_id: string | null;
  purchase_price: string;
  start_date: string;
  end_date: string;
  status: MembershipStatus;
  created_at: string;
  updated_at: string;
  customer: { user_id: string; full_name: string | null };
  gym: { gym_id: string; gym_name: string };
  package: { package_id: string; package_name: string };
}
