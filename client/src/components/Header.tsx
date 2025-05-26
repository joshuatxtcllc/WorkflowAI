import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useQuery } from "@tanstack/react-query";
import { Frame, Plus, Settings, BarChart3, Clock, TrendingUp, DollarSign } from "lucide-react";

export default function Header() {
  const { data: workloadMetrics } = useQuery({
    queryKey: ["/api/analytics/workload"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  return (
    <header className="relative z-10 bg-gray-900/90 backdrop-blur-sm border-b border-gray-800">
      <div className="max-w-[1920px] mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-4">
            <SidebarTrigger className="text-white hover:bg-gray-800 p-2 rounded-md border border-gray-700 hover:border-gray-600 transition-colors" />
            <div className="w-12 h-12 bg-gradient-to-br from-jade-500 to-jade-600 rounded-xl flex items-center justify-center">
              <Frame className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-mono tracking-wider text-jade-400">JAY'S FRAMES</h1>
              <p className="text-sm text-gray-400">Smart Production Management</p>
            </div>
          </div>

          {/* Stats Overview - Desktop */}
          <div className="hidden lg:flex items-center gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-jade-400 flex items-center gap-1">
                <BarChart3 className="w-5 h-5" />
                {workloadMetrics?.totalOrders || 0}
              </div>
              <div className="text-xs text-gray-400">Active Orders</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-400 flex items-center gap-1">
                <Clock className="w-5 h-5" />
                {workloadMetrics?.totalHours || 0}h
              </div>
              <div className="text-xs text-gray-400">Total Hours</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400 flex items-center gap-1">
                <TrendingUp className="w-5 h-5" />
                {workloadMetrics?.efficiency || 85}%
              </div>
              <div className="text-xs text-gray-400">Efficiency</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400 flex items-center gap-1">
                <DollarSign className="w-5 h-5" />
                ${workloadMetrics?.totalValue?.toLocaleString() || '0'}
              </div>
              <div className="text-xs text-gray-400">Total Value</div>
            </div>
          </div>

          {/* Stats Overview - Mobile Compact */}
          <div className="flex lg:hidden items-center gap-3 text-sm">
            <div className="flex items-center gap-1">
              <BarChart3 className="w-4 h-4 text-jade-400" />
              <span className="font-bold text-jade-400">{workloadMetrics?.totalOrders || 0}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4 text-orange-400" />
              <span className="font-bold text-orange-400">{workloadMetrics?.totalHours || 0}h</span>
            </div>
            <div className="flex items-center gap-1">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              <span className="font-bold text-blue-400">{workloadMetrics?.efficiency || 85}%</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 lg:gap-4">
            <Button className="bg-jade-500 hover:bg-jade-400 text-black font-semibold text-sm lg:text-base px-3 lg:px-4 h-9 lg:h-10">
              <Plus className="w-4 h-4 mr-1 lg:mr-2" />
              <span className="hidden sm:inline">New Order</span>
              <span className="sm:hidden">New</span>
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 lg:h-10 lg:w-10">
              <Settings className="w-4 h-4 lg:w-5 lg:h-5" />
            </Button>
            <Button variant="ghost" onClick={() => window.location.href = "/api/logout"} className="text-sm lg:text-base px-2 lg:px-4 h-9 lg:h-10">
              <span className="hidden sm:inline">Logout</span>
              <span className="sm:hidden">Exit</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}