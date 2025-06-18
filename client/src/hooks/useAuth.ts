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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // First check localStorage for user data
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        try {
          const userData = JSON.parse(savedUser);
          setUser(userData);
        } catch (error) {
          console.error('Error parsing saved user data:', error);
          localStorage.removeItem('user');
        }
      }

      // Then verify with server (session-based)
      const response = await fetch('/api/auth/user', {
        credentials: 'include', // Include cookies for session
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        // Update localStorage with latest user data
        localStorage.setItem('user', JSON.stringify(userData));
      } else {
        // Clear user data if session is invalid
        localStorage.removeItem('user');
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      // Keep localStorage user data but mark as potentially stale
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        try {
          const userData = JSON.parse(savedUser);
          setUser(userData);
        } catch {
          localStorage.removeItem('user');
          setUser(null);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { 
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('user');
      setUser(null);
      window.location.href = '/';
    }
  };

  return { user, loading, logout, checkAuth };
}