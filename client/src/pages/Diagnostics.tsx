import { SimpleDiagnosticDashboard } from "../components/SimpleDiagnosticDashboard";
import { AppSidebar } from "../components/AppSidebar";
import { SidebarProvider, SidebarInset } from "../components/ui/sidebar";
import Header from "../components/Header";

export default function Diagnostics() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header />
        <SimpleDiagnosticDashboard />
      </SidebarInset>
    </SidebarProvider>
  );
}