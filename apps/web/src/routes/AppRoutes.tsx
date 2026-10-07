import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout.js';
import { RequireAuth } from '../components/guards/RequireAuth.js';
import { RequireGuest } from '../components/guards/RequireGuest.js';
import { RequirePasswordChange } from '../components/guards/RequirePasswordChange.js';
import { LoginPage } from '../pages/LoginPage.js';
import { RegisterPage } from '../pages/RegisterPage.js';
import { ProfilePage } from '../pages/ProfilePage.js';
import { ChangePasswordPage } from '../pages/ChangePasswordPage.js';
import { GymLayout } from '../layouts/GymLayout';
import { GymDirectoryPage } from '../pages/gym/GymDirectoryPage';
import { PublicGymPage } from '../pages/gym/PublicGymPage';
import { PublicTrainersPage, PublicTrainerPage } from '../pages/gym/PublicTrainersPage';
import { ManagerGymPage } from '../pages/gym/ManagerGymPage';
import { AdminGymsPage, CreateGymPage, AdminGymPage } from '../pages/gym/AdminGymsPage';
import { AdminManagersPage } from '../pages/gym/AdminManagersPage';
import { ManagedTrainersPage, AssignTrainerPage } from '../pages/gym/ManagedTrainersPage';
import { RequireRole } from '../components/guards/RequireRole';
import { GymScopeGuard } from '../components/guards/GymScopeGuard';
import { UnavailableFeature } from '../components/gym/GymUi';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Landing / Home route */}
      <Route element={<GymLayout />}>
        <Route path="/" element={<GymDirectoryPage />} />
        <Route path="/gyms" element={<GymDirectoryPage />} />
        <Route path="/gyms/:gymId" element={<PublicGymPage />} />
        <Route path="/gyms/:gymId/trainers" element={<PublicTrainersPage />} />
        <Route path="/gyms/:gymId/trainers/:trainerId" element={<PublicTrainerPage />} />
        <Route path="/gyms/:gymId/packages" element={<UnavailableFeature title="Gói tập tại Gym" />} />
        <Route path="/gyms/:gymId/consultation" element={<UnavailableFeature title="Đặt lịch tư vấn" />} />
        <Route element={<RequireAuth />}>
          <Route element={<RequireRole roles={['ADMIN']} />}>
            <Route path="/admin/gyms" element={<AdminGymsPage />} />
            <Route path="/admin/gyms/:gymId" element={<AdminGymPage />} />
            <Route path="/admin/gyms/create" element={<CreateGymPage />} />
            <Route path="/admin/managers" element={<AdminManagersPage />} />
          </Route>
          <Route element={<RequireRole roles={['MANAGER']} />}>
            <Route element={<GymScopeGuard />}>
              <Route path="/manager/gym" element={<ManagerGymPage />} />
              <Route path="/manager/trainers" element={<ManagedTrainersPage />} />
              <Route path="/manager/trainers/assign" element={<AssignTrainerPage />} />
            </Route>
          </Route>
        </Route>
      </Route>

      {/* Guest-only authentication routes */}
      <Route element={<RequireGuest />}>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>
      </Route>

      {/* Authenticated routes */}
      <Route element={<RequireAuth />}>
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      {/* Change Password route (requires auth, handles forced must_change_password & voluntary change) */}
      <Route element={<RequirePasswordChange />}>
        <Route element={<AuthLayout />}>
          <Route path="/change-password" element={<ChangePasswordPage />} />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
