import { SimpleDiagnosticDashboard } from "../components/SimpleDiagnosticDashboard";
import { AppSidebar } from "../components/AppSidebar";
import { SidebarProvider, SidebarInset } from "../components/ui/sidebar";


export default function Diagnostics() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SimpleDiagnosticDashboard />
      </SidebarInset>
    </SidebarProvider>
  );
}