import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import DashboardLayout from './components/layout/DashboardLayout';
import DashboardHome from './pages/dashboard/Home';
import CRM from './pages/dashboard/CRM';
import Finance from './pages/dashboard/Finance';
import AdminNotifications from './pages/dashboard/Notifications';
import Evaluations from './pages/admin/Evaluations';

import Login from './pages/dashboard/Login';
import SetupDashboard from './pages/dashboard/SetupDashboard';
import ClientDetails from './pages/dashboard/ClientDetails';
import Onboarding from './pages/onboarding/Onboarding';

import ClientLayout from './components/layout/ClientLayout';
import ClientOrders from './pages/client/Orders';
import ClientMenu from './pages/client/Menu';
import ClientFinance from './pages/client/Finance';
import ClientSettings from './pages/client/Settings';
import Subscription from './pages/client/Subscription';

import ProtectedRoute from './components/auth/ProtectedRoute';
import PaymentSuccess from './pages/PaymentSuccess';


import ClientLogin from './pages/auth/ClientLogin';
import ClientSignup from './pages/auth/ClientSignup';
import ClientForgotPassword from './pages/auth/ClientForgotPassword';
import ClientProtectedRoute from './components/auth/ClientProtectedRoute';


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />

        {/* SWIFT ORDER AI ADMIN (Internal) */}
        <Route path="/admin/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/admin" element={<DashboardLayout />}>
            <Route index element={<DashboardHome />} />
            <Route path="crm" element={<CRM />} />
            <Route path="finance" element={<Finance />} />
            <Route path="evaluations" element={<Evaluations />} />
            <Route path="notifications" element={<AdminNotifications />} />
            <Route path="settings" element={<SetupDashboard />} />
            <Route path="client/:id" element={<ClientDetails />} />
          </Route>
        </Route>

        {/* CLIENT DASHBOARD (External) */}
        {/* Client Auth - Now Slug-Based */}
        <Route path="/client/:slug/login" element={<ClientLogin />} />
        <Route path="/client/:slug/signup" element={<ClientSignup />} />
        <Route path="/client/:slug/forgot-password" element={<ClientForgotPassword />} />

        {/* Protected Client Dashboard */}
        <Route element={<ClientProtectedRoute />}>
          <Route path="/client/:slug" element={<ClientLayout />}>
            <Route index element={<ClientOrders />} />
            <Route path="menu" element={<ClientMenu />} />
            <Route path="finance" element={<ClientFinance />} />
            <Route path="settings" element={<ClientSettings />} />
            <Route path="subscription" element={<Subscription />} />
          </Route>
        </Route>

        {/* LEGACY / COMPATIBILITY REDIRECTS (Optional) */}
        <Route path="/app" element={<Navigate to="/admin" replace />} />
        <Route path="/app/admin-login" element={<Login />} />
        <Route path="/login" element={<ClientLogin />} />
        <Route path="/signup" element={<ClientSignup />} />
      </Routes>
    </Router>
  );
}

export default App;
