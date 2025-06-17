import { apiRequest } from './queryClient';
import type { 
  OrderWithDetails, 
  Customer, 
  InsertCustomer, 
  InsertOrder, 
  Material,
  InsertMaterial,
  WorkloadAnalysis 
} from '@shared/schema';

// Customer API
export const customerApi = {
  getAll: async (): Promise<Customer[]> => {
    return await apiRequest('GET', '/api/customers');
  },

  create: async (customer: InsertCustomer): Promise<Customer> => {
    return await apiRequest('POST', '/api/customers', customer);
  },

  update: async (id: string, customer: Partial<InsertCustomer>): Promise<Customer> => {
    return await apiRequest('PATCH', `/api/customers/${id}`, customer);
  },
};

// Order API
export const orderApi = {
  getAll: async (): Promise<OrderWithDetails[]> => {
    return await apiRequest('GET', '/api/orders');
  },

  getById: async (id: string): Promise<OrderWithDetails> => {
    return await apiRequest('GET', `/api/orders/${id}`);
  },

  create: async (order: InsertOrder): Promise<OrderWithDetails> => {
    return await apiRequest('POST', '/api/orders', order);
  },

  updateStatus: async (id: string, status: string): Promise<OrderWithDetails> => {
    return await apiRequest('PATCH', `/api/orders/${id}/status`, { status });
  },

  update: async (id: string, order: Partial<InsertOrder>): Promise<OrderWithDetails> => {
    return await apiRequest('PATCH', `/api/orders/${id}`, order);
  },

  // Customer tracking (no auth required)
  trackByTrackingId: async (trackingId: string): Promise<OrderWithDetails> => {
    const response = await fetch(`/api/customer/track/${trackingId}`);
    if (!response.ok) {
      throw new Error(`${response.status}: ${response.statusText}`);
    }
    return response.json();
  },

  trackByEmail: async (email: string): Promise<OrderWithDetails[]> => {
    const response = await fetch(`/api/customer/orders/${email}`);
    if (!response.ok) {
      throw new Error(`${response.status}: ${response.statusText}`);
    }
    return response.json();
  },
};

// Material API
export const materialApi = {
  getByOrderId: async (orderId: string): Promise<Material[]> => {
    return await apiRequest('GET', `/api/orders/${orderId}/materials`);
  },

  create: async (orderId: string, material: Omit<InsertMaterial, 'orderId'>): Promise<Material> => {
    return await apiRequest('POST', `/api/orders/${orderId}/materials`, material);
  },

  update: async (id: string, material: Partial<InsertMaterial>): Promise<Material> => {
    return await apiRequest('PATCH', `/api/materials/${id}`, material);
  },
};

// AI API
export const aiApi = {
  getAnalysis: async (): Promise<WorkloadAnalysis> => {
    return await apiRequest('GET', '/api/ai/analysis');
  },

  chat: async (message: string): Promise<{ response: string }> => {
    return await apiRequest('POST', '/api/ai/chat', { message });
  },
};

// Analytics API
export const analyticsApi = {
  getWorkloadMetrics: async (): Promise<{
    totalOrders: number;
    totalHours: number;
    averageComplexity: number;
    onTimePercentage: number;
  }> => {
    return await apiRequest('GET', '/api/analytics/workload');
  },
};

// Auth API
export const authApi = {
  getUser: async () => {
    const response = await apiRequest('GET', '/api/auth/user');
    return response.json();
  },

  login: async (email: string, password: string) => {
    const response = await apiRequest('POST', '/api/auth/login', { email, password });
    return response.json();
  },

  register: async (email: string, password: string, firstName: string, lastName: string) => {
    const response = await apiRequest('POST', '/api/auth/register', { email, password, firstName, lastName });
    return response.json();
  },

  logout: async () => {
    const response = await apiRequest('POST', '/api/auth/logout');
    window.location.href = '/';
    return response.json();
  },
};

// Remove duplicate - using apiRequest from queryClient instead