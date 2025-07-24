import { useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role?: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    // Prevent multiple auth checks
    if (authChecked) return;

    const checkAuth = async () => {
      console.log('useAuth: Starting authentication check...');

      try {
        // Check if user data exists in localStorage
        const storedUser = localStorage.getItem('auth_user');
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          console.log('useAuth: Found stored user data:', userData.email);
          setUser(userData);

          // Verify with server (with timeout)
          console.log('useAuth: Verifying with server...');
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);

          try {
            const response = await fetch('/api/auth/user', {
              credentials: 'include',
              signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (response.ok) {
              const serverUser = await response.json();
              console.log('useAuth: Server verification successful:', serverUser.email);
              setUser(serverUser);
              localStorage.setItem('auth_user', JSON.stringify(serverUser));
            } else {
              console.log('useAuth: Server verification failed, using stored data');
              // Keep the stored user data if server check fails
            }
          } catch (fetchError) {
            clearTimeout(timeoutId);
            console.log('useAuth: Server verification timeout/error, using stored data');
            // Keep the stored user data if server check fails
          }
        } else {
          console.log('useAuth: No stored user data found');
          setUser(null);
        }
      } catch (error) {
        console.error('useAuth: Authentication check failed:', error);
        localStorage.removeItem('auth_user');
        setUser(null);
      } finally {
        console.log('useAuth: Authentication check completed, setting isLoading to false');
        setIsLoading(false);
        setAuthChecked(true);
      }
    };

    checkAuth();
  }, [authChecked]);

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      setUser(null);
      localStorage.removeItem('auth_user');
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout failed:', error);
      // Force logout locally even if server request fails
      setUser(null);
      localStorage.removeItem('auth_user');
      window.location.href = '/login';
    }
  };

  return { user, isLoading, logout };
}