import { Navigate, Route, Routes } from 'react-router-dom'

import {
  RequireEstablishment,
  RequireGuest,
  RequireOnboarding,
  RootRedirect,
} from '@/components/RouteGuards'
import Login from '@/pages/auth/Login'
import Signup from '@/pages/auth/Signup'
import ForgotPassword from '@/pages/auth/ForgotPassword'
import ResetPassword from '@/pages/auth/ResetPassword'
import Onboarding from '@/pages/Onboarding'
import AppLayout from '@/pages/app/AppLayout'
import OnboardingWizard from '@/pages/app/OnboardingWizard'
import Dashboard from '@/pages/app/Dashboard'
import BuilderPage from '@/pages/app/BuilderPage'
import ReportPage from '@/pages/app/ReportPage'
import ExportPage from '@/pages/app/ExportPage'
import TimeSlotsPage from '@/pages/app/setup/TimeSlotsPage'
import RoomsPage from '@/pages/app/setup/RoomsPage'
import LevelsPage from '@/pages/app/setup/LevelsPage'
import SubjectsPage from '@/pages/app/setup/SubjectsPage'
import TeachersPage from '@/pages/app/setup/TeachersPage'
import CurriculumPage from '@/pages/app/setup/CurriculumPage'
import SettingsPage from '@/pages/app/setup/SettingsPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />

      <Route element={<RequireGuest />}>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
      </Route>

      {/* Pas de garde ici : le lien de reinitialisation etablit une session
          "recovery" que RequireGuest renverrait immediatement vers le
          dashboard/onboarding. */}
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route element={<RequireOnboarding />}>
        <Route path="/onboarding" element={<Onboarding />} />
      </Route>

      <Route element={<RequireEstablishment />}>
        <Route path="/app/:establishmentId" element={<AppLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="onboarding-wizard" element={<OnboardingWizard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="builder" element={<BuilderPage />} />
          <Route path="report" element={<ReportPage />} />
          <Route path="export" element={<ExportPage />} />
          <Route path="setup/time-slots" element={<TimeSlotsPage />} />
          <Route path="setup/rooms" element={<RoomsPage />} />
          <Route path="setup/levels" element={<LevelsPage />} />
          <Route path="setup/subjects" element={<SubjectsPage />} />
          <Route path="setup/teachers" element={<TeachersPage />} />
          <Route path="setup/curriculum" element={<CurriculumPage />} />
          <Route path="setup/settings" element={<SettingsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
