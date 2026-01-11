import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, GlobalStyles } from '@mui/material';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import theme from './theme';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/layout/Layout';

// Pages
import HomePage from './pages/customer/HomePage';
import LoginPage from './pages/customer/LoginPage';
import RegisterPage from './pages/customer/RegisterPage';
import RegistrationSuccessPage from './pages/customer/RegistrationSuccessPage';
import EmailVerificationPage from './pages/customer/EmailVerificationPage';
import ForgotPasswordPage from './pages/customer/ForgotPasswordPage';
import PasswordResetPage from './pages/customer/PasswordResetPage';
import RoomsPage from './pages/customer/RoomsPage';
import ReservationsPage from './pages/customer/ReservationsPage';
import ProfilePage from './pages/customer/ProfilePage';
import DayPassPage from './pages/customer/DayPassPage';
import EventsPage from './pages/customer/EventsPage';
import GalleryPage from './pages/customer/GalleryPage';
import ContactPage from './pages/customer/ContactPage';
import ReservationSummaryPage from './pages/customer/ReservationSummaryPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import RoomsManagement from './pages/admin/RoomsManagement';
import AmenitiesManagement from './pages/admin/AmenitiesManagement';
import ReservationManagement from './pages/admin/ReservationManagement';
import UsersManagement from './pages/admin/UsersManagement';
import EventTypesManagement from './pages/admin/EventTypesManagement';
import PriceManagement from './pages/admin/PriceManagement';
import ScheduleSummary from './pages/admin/ScheduleSummary';
import Accommodations from './pages/admin/Accommodations';
import MediaManagement from './pages/admin/MediaManagement';
import RolesManagement from './pages/admin/RolesManagement';
import Revenue from './pages/admin/Revenue';
import Commissions from './pages/admin/Commissions';
import WristbandControl from './pages/admin/WristbandControl';
import ProtectedRoute from './components/common/ProtectedRoute';

const globalStyles = (
  <GlobalStyles
    styles={{
      '*': {
        boxSizing: 'border-box',
        margin: 0,
        padding: 0,
      },
      html: {
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
        height: '100%',
        width: '100%',
      },
      body: {
        height: '100%',
        width: '100%',
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      },
      '#root': {
        height: '100%',
        width: '100%',
      },
      '.swiper-pagination-bullet': {
        backgroundColor: 'rgba(255, 255, 255, 0.5) !important',
      },
      '.swiper-pagination-bullet-active': {
        backgroundColor: '#F4A460 !important',
      },
    }}
  />
);

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {globalStyles}
      <AuthProvider>
        <Router>
          <Routes>
            {/* Admin routes without main layout (they use AdminLayout internally) */}
            <Route path="/admin" element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/rooms" element={
              <ProtectedRoute requiredPermission={["admin.rooms", "admin.accommodations"]}>
                <RoomsManagement />
              </ProtectedRoute>
            } />
            <Route path="/admin/amenities" element={
              <ProtectedRoute requiredPermission="admin.amenities">
                <AmenitiesManagement />
              </ProtectedRoute>
            } />
            <Route path="/admin/reservations" element={
              <ProtectedRoute requiredPermission="admin.reservations">
                <ReservationManagement />
              </ProtectedRoute>
            } />
            <Route path="/admin/pricing" element={
              <ProtectedRoute requiredPermission="admin.pricing">
                <PriceManagement />
              </ProtectedRoute>
            } />
            <Route path="/admin/media" element={
              <ProtectedRoute requiredPermission="admin.media">
                <MediaManagement />
              </ProtectedRoute>
            } />
            <Route path="/admin/schedule" element={
              <ProtectedRoute requiredPermission="admin.schedule">
                <ScheduleSummary />
              </ProtectedRoute>
            } />
            <Route path="/admin/revenue" element={
              <ProtectedRoute requiredPermission="admin.revenue">
                <Revenue />
              </ProtectedRoute>
            } />
              <Route path="/admin/wristbands" element={<WristbandControl />} />
            <Route path="/admin/commissions" element={
              <ProtectedRoute requiredPermission="admin.commissions">
                <Commissions />
              </ProtectedRoute>
            } />
            <Route path="/admin/accommodations" element={
              <ProtectedRoute requiredPermission="admin.accommodations">
                <Accommodations />
              </ProtectedRoute>
            } />
            <Route path="/admin/roles" element={
              <ProtectedRoute requiredPermission="admin.roles">
                <RolesManagement />
              </ProtectedRoute>
            } />
            <Route path="/admin/users" element={
              <ProtectedRoute requiredPermission="admin.users">
                <UsersManagement />
              </ProtectedRoute>
            } />
            <Route path="/admin/event-types" element={
              <ProtectedRoute requiredPermission="admin.eventTypes">
                <EventTypesManagement />
              </ProtectedRoute>
            } />

            {/* All other routes use the main layout */}
            <Route path="/*" element={
              <Layout>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/rooms" element={<RoomsPage />} />
                  <Route path="/gallery" element={<GalleryPage />} />
                  <Route path="/events" element={<EventsPage />} />
                  <Route path="/contact" element={<ContactPage />} />
                  <Route path="/daypass" element={<DayPassPage />} />

                  {/* Public reservation summary pages */}
                  <Route path="/reservation/:confirmationToken" element={<ReservationSummaryPage />} />
                  <Route path="/reservation/code/:reservationCode" element={<ReservationSummaryPage />} />

                  {/* Protected routes that require authentication */}
                  <Route path="/reservations" element={
                    <ProtectedRoute>
                      <ReservationsPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/profile" element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  } />

                  {/* Auth pages (redirect if already logged in) */}
                  <Route path="/login" element={
                    <ProtectedRoute requireAuth={false}>
                      <LoginPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/register" element={
                    <ProtectedRoute requireAuth={false}>
                      <RegisterPage />
                    </ProtectedRoute>
                  } />

                  {/* Public auth-related pages */}
                  <Route path="/registration-success" element={<RegistrationSuccessPage />} />
                  <Route path="/verify-email" element={<EmailVerificationPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="/reset-password" element={<PasswordResetPage />} />
                </Routes>
              </Layout>
            } />
          </Routes>
          <ToastContainer
            position="top-right"
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="light"
          />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
