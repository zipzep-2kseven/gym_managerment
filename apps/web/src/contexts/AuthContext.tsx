import { useQueryClient } from '@tanstack/react-query';
import React, { createContext, useEffect, useState, useCallback } from 'react';
import {
  UserSession,
  LoginCredentials,
  RegisterData,
  ChangePasswordData,
  AuthStatus,
} from '../types/auth.types.js';
import { authService } from '../services/auth.service.js';
import { ApiClientError } from '../services/api-client.js';

export interface AuthContextType {
  user: UserSession | null;
  status: AuthStatus;
  isLoading: boolean;
  isAuthenticated: boolean;
  isForbidden: boolean;
  mustChangePassword: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<UserSession>;
  register: (data: RegisterData) => Promise<UserSession>;
  logout: () => Promise<void>;
  changePassword: (data: ChangePasswordData) => Promise<void>;
  refreshSession: () => Promise<UserSession | null>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<UserSession | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [error, setError] = useState<string | null>(null);

  const refreshSession = useCallback(async (): Promise<UserSession | null> => {
    try {
      const session = await authService.getCurrentUser();
      if (session.status === 'INACTIVE' || session.status === 'SUSPENDED') {
        setUser(session);
        setStatus('forbidden');
        setError('Tài khoản đã bị vô hiệu hóa hoặc tạm khóa.');
        return session;
      }

      setUser(session);
      setStatus('authenticated');
      setError(null);
      return session;
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.statusCode === 401 || err.code === 'UNAUTHENTICATED') {
          setUser(null);
          setStatus('unauthenticated');
          setError(null);
          return null;
        }

        if (err.statusCode === 403 || err.code === 'FORBIDDEN' || err.code === 'ACCOUNT_DEACTIVATED' || err.code === 'USER_DEACTIVATED') {
          setUser(null);
          setStatus('forbidden');
          setError(err.message);
          return null;
        }
      }

      setUser(null);
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Không thể tải phiên làm việc.');
      return null;
    }
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const login = useCallback(async (credentials: LoginCredentials): Promise<UserSession> => {
    setError(null);
    try {
      const session = await authService.login(credentials);
      queryClient.clear();
      if (session.status === 'INACTIVE' || session.status === 'SUSPENDED') {
        setUser(session);
        setStatus('forbidden');
        setError('Tài khoản đã bị vô hiệu hóa hoặc tạm khóa.');
      } else {
        setUser(session);
        setStatus('authenticated');
        setError(null);
      }
      return session;
    } catch (err) {
      if (err instanceof ApiClientError && (err.statusCode === 403 || err.code === 'USER_DEACTIVATED')) {
        setStatus('forbidden');
      }
      setError(err instanceof Error ? err.message : 'Đăng nhập thất bại.');
      throw err;
    }
  }, [queryClient]);

  const register = useCallback(async (data: RegisterData): Promise<UserSession> => {
    setError(null);
    try {
      const session = await authService.register(data);
      queryClient.clear();
      setUser(session);
      setStatus('authenticated');
      setError(null);
      return session;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đăng ký thất bại.');
      throw err;
    }
  }, [queryClient]);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await authService.logout();
    } finally {
      queryClient.clear();
      setUser(null);
      setStatus('unauthenticated');
      setError(null);
    }
  }, [queryClient]);

  const changePassword = useCallback(
    async (data: ChangePasswordData): Promise<void> => {
      await authService.changePassword(data);
      await refreshSession();
    },
    [refreshSession]
  );

  const value: AuthContextType = {
    user,
    status,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
    isForbidden: status === 'forbidden',
    mustChangePassword: Boolean(user?.must_change_password),
    error,
    login,
    register,
    logout,
    changePassword,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
