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
    const response = await apiRequest('GET', '/api/customers');
    return response.json();
  },

  create: async (customer: InsertCustomer): Promise<Customer> => {
    const response = await apiRequest('POST', '/api/customers', customer);
    return response.json();
  },

  update: async (id: string, customer: Partial<InsertCustomer>): Promise<Customer> => {
    const response = await apiRequest('PATCH', `/api/customers/${id}`, customer);
    return response.json();
  },
};

// Order API
export const orderApi = {
  getAll: async (): Promise<OrderWithDetails[]> => {
    const response = await apiRequest('GET', '/api/orders');
    return response.json();
  },

  getById: async (id: string): Promise<OrderWithDetails> => {
    const response = await apiRequest('GET', `/api/orders/${id}`);
    return response.json();
  },

  create: async (order: InsertOrder): Promise<OrderWithDetails> => {
    const response = await apiRequest('POST', '/api/orders', order);
    return response.json();
  },

  updateStatus: async (id: string, status: string): Promise<OrderWithDetails> => {
    const response = await apiRequest('PATCH', `/api/orders/${id}/status`, { status });
    return response.json();
  },

  update: async (id: string, order: Partial<InsertOrder>): Promise<OrderWithDetails> => {
    const response = await apiRequest('PATCH', `/api/orders/${id}`, order);
    return response.json();
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
    const response = await apiRequest('GET', `/api/orders/${orderId}/materials`);
    return response.json();
  },

  create: async (orderId: string, material: Omit<InsertMaterial, 'orderId'>): Promise<Material> => {
    const response = await apiRequest('POST', `/api/orders/${orderId}/materials`, material);
    return response.json();
  },

  update: async (id: string, material: Partial<InsertMaterial>): Promise<Material> => {
    const response = await apiRequest('PATCH', `/api/materials/${id}`, material);
    return response.json();
  },
};

// AI API
export const aiApi = {
  getAnalysis: async (): Promise<WorkloadAnalysis> => {
    const response = await apiRequest('GET', '/api/ai/analysis');
    return response.json();
  },

  chat: async (message: string): Promise<{ response: string }> => {
    const response = await apiRequest('POST', '/api/ai/chat', { message });
    return response.json();
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
    const response = await apiRequest('GET', '/api/analytics/workload');
    return response.json();
  },
};

// Auth API
export const authApi = {
  getUser: async () => {
    const response = await apiRequest('GET', '/api/auth/user');
    return response.json();
  },

  login: () => {
    window.location.href = '/api/login';
  },

  logout: () => {
    window.location.href = '/api/logout';
  },
};
