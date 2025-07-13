
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();

  if (!isMobile) return null;

  const bottomNavItems = [
    { icon: Home, label: 'Dashboard', path: '/' },
    { icon: Package, label: 'Orders', path: '/orders' },
    { icon: BarChart3, label: 'Analytics', path: '/analytics' },
    { icon: Users, label: 'Customers', path: '/customers' },
    { icon: Bell, label: 'Alerts', path: '/notifications', badge: unreadNotifications },
  ];

  const isActive = (path: string) => {
    return location.pathname === path || (path !== '/' && location.pathname.startsWith(path));
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 z-50 safe-area-pb">
      <div className="flex items-center justify-around px-2 py-2">
        {bottomNavItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`
              flex flex-col items-center justify-center p-2 rounded-lg min-w-[60px] min-h-[52px] relative
              ${isActive(item.path) 
                ? 'text-jade-400 bg-jade-500/10' 
                : 'text-gray-400 hover:text-gray-300'
              }
              transition-colors duration-200
            `}
          >
            <item.icon className="h-5 w-5 mb-1" />
            <span className="text-xs font-medium">{item.label}</span>
            {item.badge && item.badge > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center text-xs p-0"
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
