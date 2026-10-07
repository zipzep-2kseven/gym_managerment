export type Status = 'ACTIVE' | 'INACTIVE';
export interface Gym {
  gym_id: string; gym_name: string; address: string; description: string | null;
  phone: string | null; email: string | null; latitude: string | null; longitude: string | null;
  logo_url: string | null; opening_time: string | null; closing_time: string | null;
  status: Status; created_at: string; updated_at: string;
}
export type GymInput = Omit<Gym, 'gym_id' | 'status' | 'created_at' | 'updated_at'>;
export interface Trainer {
  gym_trainer_id: string; gym_id: string; specialization: string | null;
  experience_years: number | null; bio: string | null; status: Status;
  availability: 'AVAILABLE' | 'BUSY' | 'ON_LEAVE'; joined_at: string;
  profile: { full_name: string | null; avatar_url: string | null } | null;
  social_links: { social_link_id: string; platform: string; url: string }[];
  working_schedules: { schedule_id: string; day_of_week: number; start_time: string; end_time: string; status: Status }[];
}
export interface ManagedTrainer extends Omit<Trainer, 'profile' | 'social_links' | 'working_schedules'> { user_id: string }
export interface ManagerAssignment {
  gym_manager_id: string; gym_id: string; user_id: string; status: Status; assigned_at: string;
}
export interface Pagination {
  page: number; pageSize: number; totalItems: number; totalPages: number;
  hasNextPage: boolean; hasPreviousPage: boolean;
}
export interface PageResult<T> { data: T[]; pagination: Pagination }
export interface ListQuery { page: number; pageSize: number; search?: string; sortBy?: string; sortOrder?: string; status?: Status }
export interface ProvisionResult { temporary_password: string; user: { email: string }; assignment: { gym_id: string } }
