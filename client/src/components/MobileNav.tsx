
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';
import { Badge } from './ui/badge';
import { 
  Menu, 
  Home, 
  BarChart3, 
  Users, 
  Settings, 
  Package, 
  Calendar,
  FileText,
  Activity,
  Bell,
  X
} from 'lucide-react';

interface MobileNavProps {
  unreadNotifications?: number;
}

export function MobileNav({ unreadNotifications = 0 }: MobileNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = React.useState(false);

  const navigationItems = [
    { icon: Home, label: 'Dashboard', path: '/' },
    { icon: Package, label: 'Orders', path: '/orders' },
    { icon: BarChart3, label: 'Analytics', path: '/analytics' },
    { icon: Users, label: 'Customers', path: '/customers' },
    { icon: FileText, label: 'Invoices', path: '/invoices' },
    { icon: Calendar, label: 'Schedule', path: '/schedule' },
    { icon: Activity, label: 'Diagnostics', path: '/diagnostics' },
    { icon: Bell, label: 'Notifications', path: '/notifications', badge: unreadNotifications },
    { icon: Settings, label: 'Settings', path: '/admin' },
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  const isActive = (path: string) => {
    return location.pathname === path || (path !== '/' && location.pathname.startsWith(path));
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="lg:hidden min-h-[44px] min-w-[44px] relative"
        >
          <Menu className="h-6 w-6" />
          {unreadNotifications > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs p-0"
            >
              {unreadNotifications > 9 ? '9+' : unreadNotifications}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 bg-gray-900 border-gray-800 p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-800">
            <h2 className="text-lg font-semibold text-white">Jay's Frames</h2>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setOpen(false)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Navigation Items */}
          <div className="flex-1 overflow-auto p-4">
            <div className="space-y-2">
              {navigationItems.map((item) => (
                <Button
                  key={item.path}
                  variant={isActive(item.path) ? "secondary" : "ghost"}
                  className={`
                    w-full justify-start min-h-[44px] text-left
                    ${isActive(item.path) 
                      ? 'bg-jade-500/10 text-jade-400 border-jade-500/20' 
                      : 'text-gray-300 hover:text-white hover:bg-gray-800'
                    }
                  `}
                  onClick={() => handleNavigation(item.path)}
                >
                  <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {item.badge && item.badge > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="ml-2 h-5 px-2 text-xs"
                    >
                      {item.badge > 9 ? '9+' : item.badge}
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-800">
            <div className="text-xs text-gray-500 text-center">
              Jay's Frames v2.0
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
