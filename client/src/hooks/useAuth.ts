import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const token = localStorage.getItem("authToken");
  
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      if (!token) return null;
      
      const response = await fetch("/api/auth/user", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        // Only clear auth if it's actually unauthorized, not just a network error
        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem("authToken");
          localStorage.removeItem("user");
        }
        return null;
      }
      
      return response.json();
    },
    retry: false,
    enabled: !!token,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user && !!token,
    logout: () => {
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");
      window.location.reload();
    },
  };
}
