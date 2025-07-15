import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from './components/ui/toaster';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SidebarProvider } from './components/ui/sidebar';
import { useMobile } from './hooks/use-mobile';
import { useAuth } from './hooks/useAuth';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import Customers from './pages/Customers';
import Analytics from './pages/Analytics';
import QuickWins from './pages/QuickWins';
import RelaunchPlan from './pages/RelaunchPlan';
import TwilioManagement from './pages/TwilioManagement';
import POSIntegration from './pages/POSIntegration';
import FramersAssistantIntegration from './pages/FramersAssistantIntegration';
import HubConnection from './pages/HubConnection';
import Invoices from './pages/Invoices';
import VendorOrders from './pages/VendorOrders';
import Diagnostics from './pages/Diagnostics';
import Workflow from './pages/Workflow';
import Schedule from './pages/Schedule';
import TimeTracking from './pages/TimeTracking';
import Progress from './pages/Progress';
import ShopFloor from './pages/ShopFloor';
import Reports from './pages/Reports';
import Notifications from './pages/Notifications';
import AdminPortal from './pages/AdminPortal';
import PaymentSuccess from './pages/PaymentSuccess';
import NotFound from './pages/not-found';

// Components
import { AppSidebar } from './components/AppSidebar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { MobilePullToRefresh } from './components/MobilePullToRefresh';

import { queryClient } from './lib/queryClient';

function App() {
  const isMobile = useMobile();

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <Router>
          <div className="flex flex-col min-h-screen bg-background">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/payment-success" element={<PaymentSuccess />} />
              <Route path="/*" element={<AuthenticatedApp isMobile={isMobile} />} />
            </Routes>
          </div>
          <Toaster />
        </Router>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

function AuthenticatedApp({ isMobile }: { isMobile: boolean }) {
  const { user, isLoading } = useAuth();

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <SidebarProvider>
      <div className="flex flex-1">
        {!isMobile && <AppSidebar />}
        <main className="flex-1 flex flex-col">
          {isMobile && <MobilePullToRefresh />}
          <div className="flex-1 p-4">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/quick-wins" element={<QuickWins />} />
              <Route path="/relaunch" element={<RelaunchPlan />} />
              <Route path="/twilio" element={<TwilioManagement />} />
              <Route path="/pos" element={<POSIntegration />} />
              <Route path="/framers-assistant" element={<FramersAssistantIntegration />} />
              <Route path="/hub" element={<HubConnection />} />
              <Route path="/invoices" element={<Invoices />} />
              <Route path="/vendor-orders" element={<VendorOrders />} />
              <Route path="/diagnostics" element={<Diagnostics />} />
              <Route path="/workflow" element={<Workflow />} />
              <Route path="/schedule" element={<Schedule />} />
              <Route path="/time" element={<TimeTracking />} />
              <Route path="/progress" element={<Progress />} />
              <Route path="/shop-floor" element={<ShopFloor />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/admin" element={<AdminPortal />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </main>
        {isMobile && <MobileBottomNav />}
      </div>
    </SidebarProvider>
  );
}