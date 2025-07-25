import { useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role?: string;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>({ 
    id: '1', 
    name: 'System User', 
    email: 'admin@jaysframes.com' 
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Auto-authenticate for development
    setUser({ id: '1', name: 'System User', email: 'admin@jaysframes.com' });
    setIsLoading(false);
  }, []);

  const checkAuth = async () => {
    // Always return authenticated for development
    setUser({ id: '1', name: 'System User', email: 'admin@jaysframes.com' });
    setIsLoading(false);
  };

  const login = async (email: string, password: string) => {
    // Always succeed for development
    setUser({ id: '1', name: 'System User', email: 'admin@jaysframes.com' });
    return { success: true };
  };

  const logout = async () => {
    // Keep user logged in for development
    setUser({ id: '1', name: 'System User', email: 'admin@jaysframes.com' });
  };

  return { user, isLoading, login, logout, checkAuth };
};