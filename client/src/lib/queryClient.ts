import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(url: string, options: RequestInit = {}): Promise<any> {
  try {
    console.log(`API Request: ${options.method || 'GET'} ${url}`);
    
    const response = await fetch(url, {
      credentials: 'include',
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    console.log(`API Response: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      let errorData = null;

      // Try to get error details from response
      try {
        const text = await response.text();
        if (text) {
          try {
            errorData = JSON.parse(text);
            if (errorData.message) {
              errorMessage = errorData.message;
            } else if (errorData.error) {
              errorMessage = errorData.error;
            }
          } catch (parseError) {
            errorMessage = text || response.statusText || errorMessage;
          }
        }
      } catch (parseError) {
        console.warn('Failed to parse error response:', parseError);
        errorMessage = response.statusText || errorMessage;
      }

      console.error('API Request failed:', errorMessage, errorData);
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log('API Request successful:', result);
    return result;
  } catch (error) {
    console.error('API Request error:', error);
    // Re-throw with proper error message
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error('Network request failed');
    }
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const token = localStorage.getItem("authToken");
    const headers: Record<string, string> = {};

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(queryKey[0] as string, {
      headers,
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});