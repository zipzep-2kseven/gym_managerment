export interface ActiveGymAssignment {
  assignment_type: 'MANAGER' | 'PT';
  gym_id: string;
  gym_name?: string;
  gym_manager_id?: string;
  gym_trainer_id?: string;
}

export interface UserProfileDto {
  profile_id: string;
  user_id: string;
  full_name: string;
  date_of_birth: string | null;
  gender: string | null;
  address: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserSession {
  user_id: string;
  email: string;
  phone: string | null;
  email_verified_at: string | null;
  must_change_password: boolean;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  created_at: string;
  updated_at: string;
  profile: UserProfileDto | null;
  roles: string[];
  active_gym_assignments: ActiveGymAssignment[];
}

export interface UserProfileView {
  phone: string | null;
  profile: UserProfileDto | null;
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: ApiErrorDetail[] | null;
}

export interface ApiResponseSuccess<T> {
  success: true;
  data: T;
}

export interface ApiResponseError {
  success: false;
  error: ApiErrorPayload;
}

export type ApiResponse<T> = ApiResponseSuccess<T> | ApiResponseError;

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  full_name: string;
  phone?: string | null;
}

export interface ChangePasswordData {
  current_password: string;
  new_password: string;
  confirm_password?: string;
}

export interface UpdateProfileData {
  full_name?: string;
  phone?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  address?: string | null;
  avatar_url?: string | null;
}

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'forbidden' | 'error';
