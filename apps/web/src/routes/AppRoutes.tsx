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
import { HomePagePlaceholder } from '../pages/HomePagePlaceholder.js';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Landing / Home route */}
      <Route path="/" element={<HomePagePlaceholder />} />

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
