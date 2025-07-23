import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "redirect" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: true, // Enable refetch on mount
      staleTime: 0, // Always fetch fresh data
      gcTime: 0, // Don't cache indefinitely
      retry: 1,
      enabled: true,
    },
    mutations: {
      retry: false,
    },
  },
});

export async function apiRequest(url: string, options: RequestInit = {}) {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
}

function getQueryFn({ on401 }: { on401: "redirect" | "throw" }) {
  return async ({ queryKey }: { queryKey: readonly unknown[] }) => {
    const [url] = queryKey as [string];

    try {
      console.log("Making API request to:", url);
      const response = await fetch(url, {
        credentials: 'include', // Include cookies for authentication
        headers: {
          'Content-Type': 'application/json',
        },
      });
      console.log("API response status:", response.status);

      if (response.status === 401) {
        if (on401 === "redirect") {
          window.location.href = "/";
          return null;
        } else {
          throw new Error("Unauthorized");
        }
      }

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Query error:', error);
      throw error;
    }
  };
}