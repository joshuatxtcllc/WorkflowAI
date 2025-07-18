import React from 'react';
import { Button } from './ui/button';
import { useLocation } from 'wouter';
import { useAuth } from '../hooks/useAuth';
import { SidebarTrigger, useSidebar } from './ui/sidebar';
import { useIsMobile } from '../hooks/use-mobile';
import { Menu } from 'lucide-react';

// Safe wrapper for SidebarTrigger that only renders when sidebar context is available
function SafeSidebarTrigger() {
  try {
    const { toggleSidebar } = useSidebar();
    return <SidebarTrigger />;
  } catch (error) {
    // If sidebar context is not available, render a simple menu button
    return (
      <Button variant="ghost" size="sm" className="p-2">
        <Menu className="h-4 w-4" />
      </Button>
    );
  }
}

export function Header() {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const { isMobile } = useIsMobile();

  const handleLogout = async () => {
    await logout();
    setLocation('/login');
  };

  if (isMobile) {
    return (
      <header className="mobile-header">
        <div className="flex items-center justify-between w-full">
          <h1 className="text-jade-400 font-bold text-lg">JAY'S FRAMES</h1>

          {user && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-300 hidden sm:inline">
                {user.firstName}
              </span>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleLogout}
                className="text-gray-300 hover:text-white min-h-[44px] min-w-[44px] p-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </Button>
            </div>
          )}
        </div>
      </header>
    );
  }

  return (
    <header className="bg-gray-900 border-b border-gray-800 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SafeSidebarTrigger />
          <h1 className="text-jade-400 font-bold text-xl">JAY'S FRAMES</h1>
        </div>

        <div className="flex items-center gap-4">
          {user && (
            <>
              <span className="text-sm text-gray-300">
                Welcome, {user.firstName}
              </span>
              <Button 
                variant="ghost" 
                onClick={handleLogout}
                className="text-gray-300 hover:text-white"
              >
                Logout
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}