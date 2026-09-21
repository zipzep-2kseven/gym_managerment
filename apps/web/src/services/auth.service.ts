import { apiClient } from './api-client.js';
import {
  UserSession,
  UserProfileView,
  LoginCredentials,
  RegisterData,
  ChangePasswordData,
  UpdateProfileData,
} from '../types/auth.types.js';

export interface LogoutResponse {
  message: string;
}

export interface ChangePasswordResponse {
  message: string;
}

export const authService = {
  /**
   * Log in using email and password.
   * On success, the backend sets the HttpOnly auth_token cookie.
   * Returns UserSession projection.
   */
  async login(credentials: LoginCredentials): Promise<UserSession> {
    return apiClient.post<UserSession>('/auth/login', credentials);
  },

  /**
   * Register a new customer account.
   * On success, the backend sets the HttpOnly auth_token cookie.
   * Returns UserSession projection.
   */
  async register(data: RegisterData): Promise<UserSession> {
    return apiClient.post<UserSession>('/auth/register', data);
  },

  /**
   * Log out the current user.
   * Backend clears the HttpOnly auth_token cookie.
   */
  async logout(): Promise<LogoutResponse> {
    return apiClient.post<LogoutResponse>('/auth/logout');
  },

  /**
   * Fetch current authenticated session from GET /api/v1/auth/me.
   * Returns UserSession projection.
   */
  async getCurrentUser(): Promise<UserSession> {
    return apiClient.get<UserSession>('/auth/me');
  },

  /**
   * Change password for the current authenticated user.
   */
  async changePassword(data: ChangePasswordData): Promise<ChangePasswordResponse> {
    return apiClient.post<ChangePasswordResponse>('/auth/change-password', data);
  },

  /**
   * Fetch current user's profile from GET /api/v1/users/me/profile.
   */
  async getProfile(): Promise<UserProfileView> {
    return apiClient.get<UserProfileView>('/users/me/profile');
  },

  /**
   * Update current user's profile via PATCH /api/v1/users/me/profile.
   */
  async updateProfile(data: UpdateProfileData): Promise<UserProfileView> {
    return apiClient.patch<UserProfileView>('/users/me/profile', data);
  },
};
