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

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    console.log('useAuth: Starting authentication check...');
    try {
      // First check localStorage for user data
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          console.log('useAuth: Found stored user data:', userData.email);
          setUser(userData);
        } catch (e) {
          console.log('useAuth: Invalid stored user data, removing...');
          localStorage.removeItem('user');
        }
      }

      // Then verify with server
      console.log('useAuth: Verifying with server...');
      const response = await fetch('/api/auth/user', {
        credentials: 'include'
      });

      if (response.ok) {
        const userData = await response.json();
        console.log('useAuth: Server verification successful:', userData.email);
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
      } else {
        console.log('useAuth: Server verification failed, status:', response.status);
        setUser(null);
        localStorage.removeItem('user');
      }
    } catch (error) {
      console.error('useAuth: Auth check failed:', error);
      setUser(null);
      localStorage.removeItem('user');
    } finally {
      console.log('useAuth: Authentication check completed, setting isLoading to false');
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      setUser(null);
      localStorage.removeItem('user');
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout failed:', error);
      // Force logout locally even if server request fails
      setUser(null);
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
  };

  return { user, isLoading, logout, checkAuth };
}