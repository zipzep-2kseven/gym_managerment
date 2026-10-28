import { AdminUsersPage } from '../pages/admin/AdminUsersPage';
import { ReviewModerationPage } from '../pages/review/ReviewModerationPage';
import { TrainerProfilePage } from '../pages/trainer-profile/TrainerProfilePage';
import { GalleryPage } from '../pages/gallery/GalleryPage';
import { ConsultationPage } from '../pages/consultation/ConsultationPage';
import { ConsultationInboxPage } from '../pages/consultation/ConsultationInboxPage';
import { ReportsPage } from '../pages/report/ReportsPage';
import { RegisterPtPage } from '../pages/pt/RegisterPtPage';
import { PtWorkspacePage } from '../pages/pt/PtWorkspacePage';
import React from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
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
import { ManagerLayout } from '../layouts/ManagerLayout';
import { ManagerDashboardPage } from '../pages/dashboard/ManagerDashboardPage';
import { AdminGymsPage, CreateGymPage, AdminGymPage, EditGymPage } from '../pages/gym/AdminGymsPage';
import { AdminLayout } from '../layouts/AdminLayout';
import { AdminDashboardPage } from '../pages/dashboard/AdminDashboardPage';
import { PTLayout } from '../layouts/PTLayout';
import { PTDashboardPage } from '../pages/dashboard/PTDashboardPage';
import { CustomerLayout } from '../layouts/CustomerLayout';
import { CustomerDashboardPage } from '../pages/dashboard/CustomerDashboardPage';
import { useAuth } from '../hooks/useAuth';
import { ManagedTrainersPage, AssignTrainerPage } from '../pages/gym/ManagedTrainersPage';
import { RequireRole } from '../components/guards/RequireRole';
import { GymScopeGuard } from '../components/guards/GymScopeGuard';

import { PublicPackagesPage, PublicPackagePage } from '../pages/package/PublicPackagesPage';
import { ManagedPackagesPage } from '../pages/package/ManagedPackagesPage';

import { CheckoutPage } from '../pages/payment/CheckoutPage';
import { PaymentHistoryPage, MembershipsPage } from '../pages/payment/PaymentHistoryPage';

const PtOrCustomerWorkspace: React.FC = () => {
  const { user } = useAuth();
  if (user?.roles.includes('PT')) {
    return (
      <PTLayout>
        <PtWorkspacePage mode="mine" />
      </PTLayout>
    );
  }
  if (user?.roles.includes('CUSTOMER')) {
    return (
      <CustomerLayout>
        <PtWorkspacePage mode="mine" />
      </CustomerLayout>
    );
  }
  return (
    <div className="gym-shell">
      <header className="gym-header">
        <Link className="gym-brand" to="/">MULTI<span>GYM</span></Link>
        <nav className="gym-actions gap-4" aria-label="Điều hướng chính">
          <Link to="/profile">{user?.profile?.full_name || 'Hồ sơ cá nhân'}</Link>
        </nav>
      </header>
      <main id="gym-main" tabIndex={-1} className="gym-main">
        <PtWorkspacePage mode="mine" />
      </main>
    </div>
  );
};

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
        <Route path="/gyms/:gymId/packages" element={<PublicPackagesPage />} />
        <Route path="/gyms/:gymId/packages/:packageId" element={<PublicPackagePage />} />
        <Route path="/gyms/:gymId/consultation" element={<ConsultationPage />} />
        <Route element={<RequireAuth />}>
          <Route element={<RequireRole roles={['CUSTOMER']} />}>
            <Route path="/gyms/:gymId/packages/:packageId/checkout" element={<CheckoutPage />} />
          </Route>
          <Route element={<RequireRole roles={['CUSTOMER', 'MANAGER']} />}>
            <Route path="/gyms/:gymId/pt-register" element={<RegisterPtPage />} />
          </Route>
        </Route>
      </Route>

      {/* Customer Workspace Layout */}
      <Route element={<RequireAuth />}>
        <Route element={<RequireRole roles={['CUSTOMER']} />}>
          <Route element={<CustomerLayout />}>
            <Route path="/dashboard" element={<CustomerDashboardPage />} />
            <Route path="/memberships" element={<MembershipsPage />} />
            <Route path="/payments" element={<PaymentHistoryPage />} />
            <Route path="/reports" element={<ReportsPage />} />
          </Route>
        </Route>
      </Route>

      {/* PT Workspace Layout */}
      <Route element={<RequireAuth />}>
        <Route element={<RequireRole roles={['PT']} />}>
          <Route element={<PTLayout />}>
            <Route path="/pt" element={<Navigate to="/pt/dashboard" replace />} />
            <Route path="/pt/dashboard" element={<PTDashboardPage />} />
            <Route path="/pt/profile" element={<TrainerProfilePage />} />
          </Route>
        </Route>
      </Route>

      {/* Shared PT & Customer Personal Training Workspace */}
      <Route element={<RequireAuth />}>
        <Route path="/my-pt" element={<PtOrCustomerWorkspace />} />
      </Route>

      {/* Admin Workspace Layout */}
      <Route element={<RequireAuth />}>
        <Route element={<RequireRole roles={['ADMIN']} />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/reviews" element={<ReviewModerationPage />} />
            <Route path="/admin/gyms" element={<AdminGymsPage />} />
            <Route path="/admin/gyms/:gymId" element={<AdminGymPage />} />
            <Route path="/admin/gyms/:gymId/:tab" element={<AdminGymPage />} />
            <Route path="/admin/gyms/:gymId/edit" element={<EditGymPage />} />
            <Route path="/admin/managers" element={<Navigate to="/admin/gyms" replace />} />
            <Route path="/admin/roles" element={<Navigate to="/admin/users" replace />} />
            <Route path="/admin/*" element={<Navigate to="/admin/gyms" replace />} />
            <Route path="/admin/gyms/create" element={<CreateGymPage />} />
          </Route>
        </Route>
      </Route>

      {/* Manager Workspace Layout */}
      <Route element={<RequireAuth />}>
        <Route element={<RequireRole roles={['MANAGER']} />}>
          <Route element={<GymScopeGuard />}>
            <Route element={<ManagerLayout />}>
              <Route path="/manager" element={<Navigate to="/manager/dashboard" replace />} />
              <Route path="/manager/dashboard" element={<ManagerDashboardPage />} />
              <Route path="/manager/consultations" element={<ConsultationInboxPage />} />
              <Route path="/manager/gallery" element={<GalleryPage />} />
              <Route path="/manager/reports" element={<ReportsPage mode="manager" />} />
              <Route path="/manager/pt" element={<PtWorkspacePage mode="manager" />} />
              <Route path="/manager/packages" element={<ManagedPackagesPage />} />
              <Route path="/manager/gym" element={<ManagerGymPage />} />
              <Route path="/manager/trainers/:trainerId/profile" element={<TrainerProfilePage manager />} />
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
