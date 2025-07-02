import {
  Calendar,
  Home,
  Package,
  Users,
  Settings,
  BarChart3,
  Clock,
  Bell,
  FileText,
  CreditCard,
  ChevronUp,
  User2,
  ShoppingCart,
  Network,
  Trophy,
  Link,
  Activity,
  Rocket,
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery } from "@tanstack/react-query";

// Menu items data
const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/",
      icon: Home,
    },
    {
      title: "Orders",
      url: "/orders",
      icon: Package,
      items: [
        {
          title: "All Orders",
          url: "/orders",
        },
        {
          title: "Pending",
          url: "/orders?status=pending",
        },
        {
          title: "In Progress",
          url: "/orders?status=in-progress",
        },
        {
          title: "Ready for Pickup",
          url: "/orders?status=ready",
        },
        {
          title: "Completed",
          url: "/orders?status=completed",
        },
      ],
    },
    {
      title: "Customers",
      url: "/customers",
      icon: Users,
    },
    {
      title: "Analytics",
      url: "/analytics",
      icon: BarChart3,
      items: [
        {
          title: "Workload Analysis",
          url: "/analytics/workload",
        },
        {
          title: "Time Tracking",
          url: "/time-tracking",
        },
      ],
    },
    {
      title: "Schedule",
      url: "/schedule",
      icon: Calendar,
    },
    {
      title: "Vendor Orders",
      url: "/vendor-orders",
      icon: ShoppingCart,
    },
    {
      title: "Integrations",
      url: "/hub-connection",
      icon: Network,
      items: [
        {
          title: "Hub Connection",
          url: "/hub-connection",
        },
        {
          title: "POS Integration",
          url: "/pos-integration",
        },
      ],
    },
    {
      title: "Progress Tracking",
      url: "/progress",
      icon: Trophy,
    },
    {
      title: "Reports",
      url: "/reports",
      icon: FileText,
      items: [
        {
          title: "Daily Reports",
          url: "/reports/daily",
        },
        {
          title: "Weekly Summary",
          url: "/reports/weekly",
        },
        {
          title: "Monthly Overview",
          url: "/reports/monthly",
        },
      ],
    },
    {
      title: "Notifications",
      url: "/notifications",
      icon: Bell,
    },
    {
      title: "System Diagnostics",
      url: "/diagnostics",
      icon: Activity,
    },
    {
      title: "Invoices",
      url: "/invoices",
      icon: FileText,
    },
  ],
  settings: [
    {
      title: "Settings",
      url: "/settings",
      icon: Settings,
    },
  ],
};

export function AppSidebar() {
  const { data: user } = useQuery({
    queryKey: ["/api/auth/user"],
  });

  const [location, navigate] = useLocation();
  const [activeItem, setActiveItem] = useState("Dashboard");

  const handleNavigation = (itemTitle: string, url?: string) => {
    setActiveItem(itemTitle);

    // Handle URL navigation
    if (url && url !== "#") {
      navigate(url);
    }
  };

  return (
    <Sidebar variant="sidebar" className="border-r border-gray-800">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {data.navMain.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    tooltip={item.title}
                    isActive={activeItem === item.title}
                    onClick={() => handleNavigation(item.title, item.url)}
                    className="cursor-pointer"
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                  {item.items?.length ? (
                    <SidebarMenuSub>
                      {item.items.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton
                            onClick={() => handleNavigation(subItem.title, subItem.url)}
                            className="cursor-pointer"
                            isActive={activeItem === subItem.title}
                          >
                            <span>{subItem.title}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  ) : null}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              {data.settings.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    size="sm"
                    onClick={() => handleNavigation(item.title, item.url)}
                    className="cursor-pointer"
                    isActive={activeItem === item.title}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    <User2 className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {user?.name || "User"}
                    </span>
                    <span className="truncate text-xs">
                      {user?.email || "user@example.com"}
                    </span>
                  </div>
                  <ChevronUp className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuItem>
                  <span>Account</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}