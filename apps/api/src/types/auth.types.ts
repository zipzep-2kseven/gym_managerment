export interface JwtPayload {
  sub: string;
  email: string;
  roles: string[];
  iat?: number;
  exp?: number;
}

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

export interface LoginResult {
  token: string;
  session: UserSession;
}

export interface UserProfileView {
  phone: string | null;
  profile: UserProfileDto | null;
}
