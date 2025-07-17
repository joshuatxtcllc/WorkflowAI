
import React from 'react';
import { useLocation } from 'wouter';
import { Badge } from './ui/badge';
import { 
  Home, 
  Package, 
  BarChart3, 
  Users, 
  Bell
} from 'lucide-react';
import { useIsMobile } from '../hooks/use-mobile';

interface MobileBottomNavProps {
  unreadNotifications?: number;
}

export function MobileBottomNav({ unreadNotifications = 0 }: MobileBottomNavProps) {
  const [location, navigate] = useLocation();
  const { isMobile } = useIsMobile();

  if (!isMobile) return null;

  const handleNavigation = (path: string) => {
    // Haptic feedback for mobile devices
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
    navigate(path);
  };

  const bottomNavItems = [
    { icon: Home, label: 'Dashboard', path: '/' },
    { icon: Package, label: 'Orders', path: '/orders' },
    { icon: BarChart3, label: 'Analytics', path: '/analytics' },
    { icon: Users, label: 'Customers', path: '/customers' },
    { icon: Bell, label: 'Alerts', path: '/notifications', badge: unreadNotifications },
  ];

  const isActive = (path: string) => {
    return location === path || (path !== '/' && location.startsWith(path));
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900/98 backdrop-blur-md border-t border-gray-800 z-[999]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-center justify-around px-2 py-2">
        {bottomNavItems.map((item) => (
          <button
            key={item.path}
            onClick={() => handleNavigation(item.path)}
            className={`
              flex flex-col items-center justify-center p-2 rounded-xl min-w-[60px] min-h-[52px] relative
              ${isActive(item.path) 
                ? 'text-jade-400 bg-jade-500/20 shadow-lg scale-105' 
                : 'text-gray-400 hover:text-gray-300 active:scale-95'
              }
              transition-all duration-200 ease-out touch-manipulation
            `}
            role="tab"
            aria-selected={isActive(item.path)}
            aria-label={`Navigate to ${item.label}`}
          >
            <item.icon className="h-4 w-4 mb-1" />
            <span className="text-[10px] font-medium leading-tight">{item.label}</span>
            {item.badge && item.badge > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-3 w-3 flex items-center justify-center text-[8px] p-0 min-w-[12px]"
              >
                {item.badge > 9 ? '9+' : item.badge}
              </Badge>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
