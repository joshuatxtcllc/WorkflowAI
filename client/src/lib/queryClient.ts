import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('authToken');

  // Add timeout to prevent infinite loading
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
    credentials: 'include',
    signal: controller.signal,
  };

  if (config.method !== 'GET' && config.method !== 'HEAD' && options.body) {
    config.body = options.body;
  }

  try {
    console.log(`API Request: ${options.method || 'GET'} ${url}`);
    console.log('Request config:', { 
      headers: config.headers,
      hasBody: !!config.body,
      signal: !!config.signal
    });

    const response = await fetch(url, config);
    clearTimeout(timeoutId);

    console.log(`API Response: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      let errorData: any = {};
      try {
        const responseText = await response.text();
        console.log('Raw error response:', responseText);
        
        if (responseText) {
          try {
            errorData = JSON.parse(responseText);
          } catch {
            errorData = { message: responseText };
          }
        }
      } catch (parseError) {
        console.error('Error parsing response:', parseError);
      }

      console.log('API Request failed:', errorData.message || 'Unknown error', errorData);
      let errorMessage = `${response.status}: ${response.statusText}`;

      if (errorData.message) {
        errorMessage = errorData.message;
      } else if (errorData.error) {
        errorMessage = errorData.error;
      }

      const error = new Error(errorMessage);
      (error as any).status = response.status;
      (error as any).response = response;
      throw error;
    }

    const data = await response.json();
    console.log('API Response data:', Array.isArray(data) ? `Array(${data.length})` : typeof data);
    return data;
  } catch (error) {
    clearTimeout(timeoutId);

    console.error('API Request error:', error);
    
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timed out - please check your connection');
    }

    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Network error - please check your connection');
    }

    throw error;
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
      refetchOnReconnect: false,
      refetchOnMount: false,
      staleTime: Infinity,
      gcTime: Infinity,
      retry: false,
      enabled: true,
      networkMode: 'online',
    },
    mutations: {
      retry: false,
    },
  },
});