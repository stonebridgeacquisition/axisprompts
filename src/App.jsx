import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import DashboardLayout from './components/layout/DashboardLayout';
import DashboardHome from './pages/dashboard/Home';
import CRM from './pages/dashboard/CRM';
import Finance from './pages/dashboard/Finance';
import AdminNotifications from './pages/dashboard/Notifications';

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


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />

        <Route path="/app/login" element={<Login />} />
        <Route path="/onboarding" element={<Onboarding />} />

        {/* Admin Dashboard Routes */}
        <Route path="/app" element={<DashboardLayout />}>
          <Route index element={<DashboardHome />} />
          <Route path="crm" element={<CRM />} />
          <Route path="finance" element={<Finance />} />
          <Route path="notifications" element={<AdminNotifications />} />
          <Route path="setup/:id" element={<SetupDashboard />} />
          <Route path="client/:id" element={<ClientDetails />} />
        </Route>

        {/* Client Dashboard Routes */}
        <Route path="/client/:slug" element={<ClientLayout />}>
          <Route index element={<ClientOrders />} />
          <Route path="menu" element={<ClientMenu />} />
          <Route path="finance" element={<ClientFinance />} />
          <Route path="settings" element={<ClientSettings />} />
          <Route path="subscription" element={<Subscription />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
