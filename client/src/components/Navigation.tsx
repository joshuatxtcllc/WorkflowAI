import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  Home, 
  Package, 
  Users, 
  BarChart3, 
  Calendar,
  Clock, 
  ShoppingCart, 
  Network, 
  Bell,
  Settings,
  Zap
} from 'lucide-react';
import { useLocation } from 'wouter';

interface NavigationProps {
  className?: string;
}

export function Navigation({ className = '' }: NavigationProps) {
  const [location, setLocation] = useLocation();

  const navigationItems = [
    { name: 'Dashboard', path: '/', icon: Home },
    { name: 'Orders', path: '/orders', icon: Package },
    { name: 'Customers', path: '/customers', icon: Users },
    { name: 'Analytics', path: '/analytics', icon: BarChart3 },
    { name: 'Schedule', path: '/schedule', icon: Calendar },
    { name: 'Time Tracking', path: '/time-tracking', icon: Clock },
    { name: 'Vendor Orders', path: '/vendor-orders', icon: ShoppingCart },
    { name: 'Hub Connection', path: '/hub-connection', icon: Network },
    { name: 'Quick Wins', path: '/quick-wins', icon: Zap },
    { name: 'Notifications', path: '/notifications', icon: Bell },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  const isActive = (path: string) => {
    if (path === '/') {
      return location === '/';
    }
    return location.startsWith(path);
  };

  return (
    <nav className={`bg-gray-900 border-b border-gray-800 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-jade-400 font-bold text-xl">JAY'S FRAMES</span>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                {navigationItems.slice(0, 6).map((item) => {
                  const Icon = item.icon;
                  return (
                    <Button
                      key={item.path}
                      variant={isActive(item.path) ? "default" : "ghost"}
                      className={`flex items-center gap-2 text-sm ${
                        isActive(item.path) 
                          ? 'bg-jade-600 text-white' 
                          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                      }`}
                      onClick={() => setLocation(item.path)}
                    >
                      <Icon className="w-4 h-4" />
                      {item.name}
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="hidden md:block">
            <div className="ml-4 flex items-center space-x-4">
              {navigationItems.slice(6).map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.path}
                    variant="ghost"
                    size="sm"
                    className={`flex items-center gap-2 ${
                      isActive(item.path) 
                        ? 'bg-jade-600 text-white' 
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                    onClick={() => setLocation(item.path)}
                  >
                    <Icon className="w-4 h-4" />
                    {item.name}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-300 hover:bg-gray-700"
              onClick={() => {/* Mobile menu toggle logic */}}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden">
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-gray-800">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.path}
                variant="ghost"
                className={`w-full justify-start flex items-center gap-2 ${
                  isActive(item.path) 
                    ? 'bg-jade-600 text-white' 
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
                onClick={() => setLocation(item.path)}
              >
                <Icon className="w-4 h-4" />
                {item.name}
              </Button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}