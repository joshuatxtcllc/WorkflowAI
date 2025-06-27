import { DiagnosticDashboard } from "@/components/DiagnosticDashboard";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import Header from "@/components/Header";

export default function Diagnostics() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header />
        <main className="flex-1 p-6">
          <DiagnosticDashboard />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}