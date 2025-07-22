import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchInterval: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      staleTime: Infinity,
      gcTime: Infinity,
      retry: false,
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
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

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