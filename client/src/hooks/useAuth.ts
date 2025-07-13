import { useQuery } from '@tanstack/react-query';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role?: string;
}

export function useAuth() {
  const { data: user, isLoading, error, refetch } = useQuery<User>({
    queryKey: ['/api/auth/user'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/auth/user', {
          credentials: 'include',
        });

        if (!response.ok) {
          // Clear any stale localStorage data
          localStorage.removeItem('user');
          throw new Error('Not authenticated');
        }

        const userData = await response.json();
        // Store user data in localStorage for consistency
        localStorage.setItem('user', JSON.stringify(userData));
        return userData;
      } catch (error) {
        // Clear localStorage on any auth error
        localStorage.removeItem('user');
        throw error;
      }
    },
    retry: 1, // Allow one retry
    retryDelay: 1000, // Wait 1 second before retry
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    networkMode: 'online', // Only run when online
  });

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('user');
      window.location.href = '/';
    }
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user && !error,
    error,
    logout,
    refetch
  };
}