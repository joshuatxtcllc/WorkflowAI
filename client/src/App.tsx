import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Dashboard from "@/pages/Dashboard";
import QuickWins from "@/pages/QuickWins";
import VendorOrders from "@/pages/VendorOrders";
import Login from "@/pages/Login";
import CustomerPortal from "@/components/CustomerPortal";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading ? (
        <Route path="*" component={() => <div className="min-h-screen bg-gray-950 flex items-center justify-center"><div className="text-white">Loading...</div></div>} />
      ) : !isAuthenticated ? (
        <>
          <Route path="/" component={Login} />
          <Route path="/track" component={CustomerPortal} />
          <Route path="/track/:trackingId" component={CustomerPortal} />
          <Route component={Login} />
        </>
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/quick-wins" component={QuickWins} />
          <Route path="/vendor-orders" component={VendorOrders} />
          <Route path="/track" component={CustomerPortal} />
          <Route path="/track/:trackingId" component={CustomerPortal} />
          <Route component={NotFound} />
        </>
      )}
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-gray-950 text-white">
          <Toaster />
          <Router />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
