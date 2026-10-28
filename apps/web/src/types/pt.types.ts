export type Availability = 'ACCEPTING' | 'ALMOST_FULL' | 'NOT_ACCEPTING';
export interface Registration {
  registration_id: string; membership_id: string; gym_trainer_id: string;
  status: 'ACTIVE' | 'CANCELLED' | 'COMPLETED'; note: string | null;
  membership: { membership_id: string; user_id: string; gym_id: string; start_date: string; end_date: string; status: string };
  customer: { user_id: string; full_name: string | null }; trainer: { user_id: string; gym_trainer_id: string; full_name: string | null };
  gym: { gym_id: string; gym_name: string };
}
export interface Appointment {
  appointment_id: string; registration_id: string; start_time: string; end_time: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'; note: string | null; registration: Registration;
}
