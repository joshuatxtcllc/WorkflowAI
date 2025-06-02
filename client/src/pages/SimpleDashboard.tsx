import { useState } from 'react';
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

export default function SimpleDashboard() {
  return (
    <SidebarProvider>
      <div className="min-h-screen bg-gray-950 text-white flex">
        <AppSidebar />
        <div className="flex-1 p-8">
          <h1 className="text-3xl font-bold">Jay's Frames Dashboard</h1>
          <p className="mt-4">Basic dashboard structure loaded successfully.</p>
        </div>
      </div>
    </SidebarProvider>
  );
}