
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
      url: "#",
      icon: Home,
    },
    {
      title: "Orders",
      url: "#",
      icon: Package,
      items: [
        {
          title: "All Orders",
          url: "#",
        },
        {
          title: "Pending",
          url: "#",
        },
        {
          title: "In Progress",
          url: "#",
        },
        {
          title: "Ready for Pickup",
          url: "#",
        },
        {
          title: "Completed",
          url: "#",
        },
      ],
    },
    {
      title: "Customers",
      url: "#",
      icon: Users,
      items: [
        {
          title: "All Customers",
          url: "#",
        },
        {
          title: "Add New Customer",
          url: "#",
        },
      ],
    },
    {
      title: "Analytics",
      url: "#",
      icon: BarChart3,
      items: [
        {
          title: "Workload Analysis",
          url: "#",
        },
        {
          title: "Performance Reports",
          url: "#",
        },
        {
          title: "Time Tracking",
          url: "#",
        },
      ],
    },
    {
      title: "Schedule",
      url: "#",
      icon: Calendar,
    },
    {
      title: "Time Tracking",
      url: "#",
      icon: Clock,
    },
    {
      title: "Vendor Orders",
      url: "/vendor-orders",
      icon: ShoppingCart,
    },
    {
      title: "Hub Connection",
      url: "/hub-connection",
      icon: Network,
    },
    {
      title: "Progress Tracking",
      url: "/progress",
      icon: Trophy,
    },
    {
      title: "Notifications",
      url: "#",
      icon: Bell,
    },
    {
      title: "Reports",
      url: "#",
      icon: FileText,
      items: [
        {
          title: "Daily Reports",
          url: "#",
        },
        {
          title: "Weekly Summary",
          url: "#",
        },
        {
          title: "Monthly Overview",
          url: "#",
        },
      ],
    },
    {
      title: "Billing",
      url: "#",
      icon: CreditCard,
      items: [
        {
          title: "Invoices",
          url: "#",
        },
        {
          title: "Payments",
          url: "#",
        },
        {
          title: "Payment History",
          url: "#",
        },
      ],
    },
  ],
  settings: [
    {
      title: "General",
      url: "#",
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
    
    // Handle URL navigation first
    if (url && url !== "#") {
      navigate(url);
      return;
    }
    
    // Handle different navigation actions
    switch (itemTitle) {
      case "Dashboard":
        navigate("/");
        break;
      case "Vendor Orders":
        navigate("/vendor-orders");
        break;
      case "Hub Connection":
        navigate("/hub-connection");
        break;
      case "All Orders":
      case "Orders":
        // Could implement filtering logic here
        console.log("Navigate to orders view");
        break;
      case "Customers":
        // Could show customers section
        console.log("Navigate to customers view");
        break;
      case "Analytics":
        // Could highlight analytics section
        const analyticsSection = document.querySelector('[data-section="analytics"]');
        if (analyticsSection) {
          analyticsSection.scrollIntoView({ behavior: 'smooth' });
        }
        break;
      case "Schedule":
        console.log("Navigate to schedule view");
        break;
      case "Time Tracking":
        console.log("Navigate to time tracking view");
        break;
      case "Notifications":
        console.log("Navigate to notifications view");
        break;
      case "Reports":
        console.log("Navigate to reports view");
        break;
      case "Billing":
        console.log("Navigate to billing view");
        break;
      case "Settings":
        console.log("Navigate to settings view");
        break;
      default:
        console.log(`Navigate to ${itemTitle}`);
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
