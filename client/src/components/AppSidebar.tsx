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
  X,
  Monitor,
  Zap,
  Globe,
  DollarSign
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
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarTrigger,
  useSidebar,
} from "./ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
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
  const { toggleSidebar } = useSidebar();

  const handleNavigation = (itemTitle: string, url?: string) => {
    setActiveItem(itemTitle);

    // Handle URL navigation
    if (url && url !== "#") {
      navigate(url);
    }
  };

  return (
    <Sidebar variant="sidebar" className="border-r border-gray-200 bg-white">
      <SidebarHeader>
        <div className="flex items-center justify-between gap-2 p-2">
          <div className="flex items-center gap-2">
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <Package className="size-4" />
            </div>
            <div className="text-sidebar-foreground font-semibold">
              Jay's Frames
            </div>
          </div>
          <SidebarTrigger className="h-6 w-6 hover:bg-gray-100 rounded" />
        </div>
      </SidebarHeader>
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




          <SidebarGroup>
            <SidebarGroupLabel>Management</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => handleNavigation("Customers", "/customers")}
                    className="cursor-pointer"
                    isActive={activeItem === "Customers"}
                  >
                    <Users />
                    <span>Customers</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => handleNavigation("Invoices", "/invoices")}
                    className="cursor-pointer"
                    isActive={activeItem === "Invoices"}
                  >
                    <FileText />
                    <span>Invoices</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => handleNavigation("Vendor Orders", "/vendor-orders")}
                    className="cursor-pointer"
                    isActive={activeItem === "Vendor Orders"}
                  >
                    <ShoppingCart />
                    <span>Vendor Orders</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Integrations</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => handleNavigation("POS Integration", "/pos-integration")}
                    className="cursor-pointer"
                    isActive={activeItem === "POS Integration"}
                  >
                    <Monitor />
                    <span>POS Integration</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => handleNavigation("Framers Assistant", "/framers-assistant")}
                    className="cursor-pointer"
                    isActive={activeItem === "Framers Assistant"}
                  >
                    <Zap />
                    <span>Framers Assistant</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => handleNavigation("Hub Connection", "/hub-connection")}
                    className="cursor-pointer"
                    isActive={activeItem === "Hub Connection"}
                  >
                    <Globe />
                    <span>Hub Connection</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
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
                      {(user as any)?.firstName || "User"}
                    </span>
                    <span className="truncate text-xs">
                      {(user as any)?.email || "user@example.com"}
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