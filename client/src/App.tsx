import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "./components/ui/toaster";
import { TooltipProvider } from "./components/ui/tooltip";
import { useAuth } from "./hooks/useAuth";
import { ErrorBoundary } from "react-error-boundary";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "./components/ui/sidebar";
import { useIsMobile, useViewportHeight } from "./hooks/use-mobile";

import Dashboard from "./pages/Dashboard";
import QuickWins from "./pages/QuickWins";
import VendorOrders from "./pages/VendorOrders";
import Login from "./pages/Login";
import CustomerPortal from "./components/CustomerPortal";
import HubConnection from "./pages/HubConnection";
import POSIntegration from "./pages/POSIntegration";
import Progress from "./pages/Progress";
import Orders from "./pages/Orders";
import Customers from "./pages/Customers";
import Analytics from "./pages/Analytics";
import ComprehensiveAnalytics from "./pages/ComprehensiveAnalytics";
import Schedule from "./pages/Schedule";
import TimeTracking from "./pages/TimeTracking";
import Notifications from "./pages/Notifications";
import Reports from "./pages/Reports";
import AdminPortal from './pages/AdminPortal';
import Diagnostics from './pages/Diagnostics';
import Invoices from "./pages/Invoices";
import NotFound from "./pages/not-found";
import { useEffect, useState } from "react";
import RelaunchPlan from "./pages/RelaunchPlan";
import FramersAssistantIntegration from "./pages/FramersAssistantIntegration";
import LoadingScreen from "./components/LoadingScreen";
import { MobileBottomNav } from './components/MobileBottomNav';
import { AppSidebar } from "./components/AppSidebar";
import { useSidebar } from "./components/ui/sidebar";
import TwilioManagement from "./pages/TwilioManagement";
import SystemTest from "./pages/SystemTest";
import EmergencyPayments from "./pages/EmergencyPayments";
import { Header } from "./components/Header";

function AppContent() {
  const { user, isLoading } = useAuth();
  const isMobile = useIsMobile();
  const viewportHeight = useViewportHeight();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  const AppLayout = ({ children }: { children: React.ReactNode }) => {
    if (isMobile) {
      return (
        <div 
          className="mobile-app-container overflow-hidden"
          style={{ height: viewportHeight }}
        >
          <Header />
          <main 
            className="mobile-content overflow-y-auto"
            style={{ 
              height: `${viewportHeight - 140}px`,
              paddingBottom: 'env(safe-area-inset-bottom)'
            }}
          >
            <div className="mobile-container">
              {children}
            </div>
          </main>
          <MobileBottomNav />
        </div>
      );
    }

    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header />
            <main className="flex-1 overflow-y-auto p-6">
              {children}
            </main>
          </div>
        </div>
      </SidebarProvider>
    );
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Switch>
        <Route path="/" exact>
          {user ? (
            <AppLayout>
              <Dashboard />
            </AppLayout>
          ) : (
            <Login />
          )}
        </Route>
        <Route path="/login" component={Login} />
        <Route path="/customer-portal" component={CustomerPortal} />
        <Route path="/orders">
          <AppLayout>
            <Orders />
          </AppLayout>
        </Route>
        <Route path="/customers">
          <AppLayout>
            <Customers />
          </AppLayout>
        </Route>
        <Route path="/analytics">
          <AppLayout>
            <Analytics />
          </AppLayout>
        </Route>
        <Route path="/comprehensive-analytics">
          <AppLayout>
            <ComprehensiveAnalytics />
          </AppLayout>
        </Route>
        <Route path="/notifications">
          <AppLayout>
            <Notifications />
          </AppLayout>
        </Route>
         <Route path="/reports">
          <AppLayout>
            <Reports />
          </AppLayout>
        </Route>
        <Route path="/schedule">
          <AppLayout>
            <Schedule />
          </AppLayout>
        </Route>
        <Route path="/time-tracking">
          <AppLayout>
            <TimeTracking />
          </AppLayout>
        </Route>
        <Route path="/vendor-orders">
          <AppLayout>
            <VendorOrders />
          </AppLayout>
        </Route>
        <Route path="/hub">
          <AppLayout>
            <HubConnection />
          </AppLayout>
        </Route>
         <Route path="/pos">
          <AppLayout>
            <POSIntegration />
          </AppLayout>
        </Route>
        <Route path="/quick-wins">
          <AppLayout>
            <QuickWins />
          </AppLayout>
        </Route>
        <Route path="/relaunch">
          <AppLayout>
            <RelaunchPlan />
          </AppLayout>
        </Route>
        <Route path="/framers-assistant">
          <AppLayout>
            <FramersAssistantIntegration />
          </AppLayout>
        </Route>
        <Route path="/invoices">
          <AppLayout>
            <Invoices />
          </AppLayout>
        </Route>
         <Route path="/diagnostics">
          <AppLayout>
            <Diagnostics />
          </AppLayout>
        </Route>
        <Route path="/system-test">
          <AppLayout>
            <SystemTest />
          </AppLayout>
        </Route>
        <Route path="/emergency-payments">
          <AppLayout>
            <EmergencyPayments />
          </AppLayout>
        </Route>
        <Route path="/twilio">
          <AppLayout>
            <TwilioManagement />
          </AppLayout>
        </Route>
         <Route path="/admin">
          <AppLayout>
            <AdminPortal />
          </AppLayout>
        </Route>
        <Route component={NotFound} />
      </Switch>
      <Toaster />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export default App;