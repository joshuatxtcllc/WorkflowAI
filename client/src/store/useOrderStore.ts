import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { OrderWithDetails, WorkloadAnalysis, AIMessage } from '@shared/schema';

interface OrderFilters {
  status?: string;
  priority?: string;
  customerName?: string;
  trackingId?: string;
  dueDateRange?: {
    start: Date;
    end: Date;
  };
}

interface OrderSort {
  field: 'dueDate' | 'createdAt' | 'priority' | 'customerName' | 'price';
  direction: 'asc' | 'desc';
}

interface UIState {
  selectedOrderId?: string;
  isOrderDetailsOpen: boolean;
  isNewOrderModalOpen: boolean;
  isAIAssistantOpen: boolean;
  isMobileMenuOpen: boolean;
  kanbanViewMode: 'compact' | 'detailed';
}

interface OrderStore {
  // Data state
  orders: OrderWithDetails[];
  filteredOrders: OrderWithDetails[];
  workloadAnalysis?: WorkloadAnalysis;
  aiMessages: AIMessage[];

  // UI state
  ui: UIState;
  filters: OrderFilters;
  sort: OrderSort;

  // Loading states
  isLoading: boolean;
  isUpdatingOrder: boolean;
  isGeneratingAI: boolean;

  // Error states
  error?: string;

  // Actions
  setOrders: (orders: OrderWithDetails[]) => void;
  addOrder: (order: OrderWithDetails) => void;
  updateOrder: (id: string, updates: Partial<OrderWithDetails>) => void;
  removeOrder: (id: string) => void;

  setWorkloadAnalysis: (analysis: WorkloadAnalysis) => void;
  addAIMessage: (message: AIMessage) => void;
  clearAIMessages: () => void;

  // Filtering and sorting
  setFilters: (filters: Partial<OrderFilters>) => void;
  setSort: (sort: OrderSort) => void;
  applyFiltersAndSort: () => void;

  // UI actions
  setSelectedOrder: (id?: string) => void;
  toggleOrderDetails: () => void;
  toggleNewOrderModal: () => void;
  toggleAIAssistant: () => void;
  toggleMobileMenu: () => void;
  setKanbanViewMode: (mode: 'compact' | 'detailed') => void;
  setUI: (updates: Partial<UIState>) => void;
  setSelectedOrderId: (id: string) => void;

  // Loading actions
  setLoading: (loading: boolean) => void;
  setUpdatingOrder: (updating: boolean) => void;
  setGeneratingAI: (generating: boolean) => void;
  setError: (error?: string) => void;

  // Computed values
  getOrdersByStatus: (status: string) => OrderWithDetails[];
  getUrgentOrders: () => OrderWithDetails[];
  getOverdueOrders: () => OrderWithDetails[];
  getTotalWorkloadHours: () => number;
  getOrderStatistics: () => {
    total: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    averageHours: number;
    totalRevenue: number;
  };
}

export const useOrderStore = create<OrderStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      orders: [],
      filteredOrders: [],
      aiMessages: [],
      ui: {
        isOrderDetailsOpen: false,
        isNewOrderModalOpen: false,
        isAIAssistantOpen: false,
        isMobileMenuOpen: false,
        kanbanViewMode: 'detailed',
      },
      filters: {},
      sort: {
        field: 'dueDate',
        direction: 'asc',
      },
      isLoading: false,
      isUpdatingOrder: false,
      isGeneratingAI: false,

      // Data actions
      setOrders: (orders) => {
        set({ orders });
        get().applyFiltersAndSort();
      },

      addOrder: (order) => {
        const orders = [...get().orders, order];
        set({ orders });
        get().applyFiltersAndSort();
      },

      updateOrder: (id, updates) => {
        const orders = get().orders.map((order) =>
          order.id === id ? { ...order, ...updates } : order
        );
        set({ orders });
        get().applyFiltersAndSort();
      },

      removeOrder: (id) => {
        const orders = get().orders.filter((order) => order.id !== id);
        set({ orders });
        get().applyFiltersAndSort();
      },

      setWorkloadAnalysis: (workloadAnalysis) => {
        set({ workloadAnalysis });
      },

      addAIMessage: (message) => {
        const aiMessages = [...get().aiMessages, message];
        set({ aiMessages });
      },

      clearAIMessages: () => {
        set({ aiMessages: [] });
      },

      // Filtering and sorting actions
      setFilters: (newFilters) => {
        const filters = { ...get().filters, ...newFilters };
        set({ filters });
        get().applyFiltersAndSort();
      },

      setSort: (sort) => {
        set({ sort });
        get().applyFiltersAndSort();
      },

      applyFiltersAndSort: () => {
        const { orders, filters, sort } = get();
        let filtered = [...orders];

        // Apply filters
        if (filters.status) {
          filtered = filtered.filter((order) => order.status === filters.status);
        }

        if (filters.priority) {
          filtered = filtered.filter((order) => order.priority === filters.priority);
        }

        if (filters.customerName) {
          const searchTerm = filters.customerName.toLowerCase();
          filtered = filtered.filter((order) =>
            order.customer.name.toLowerCase().includes(searchTerm)
          );
        }

        if (filters.trackingId) {
          const searchTerm = filters.trackingId.toLowerCase();
          filtered = filtered.filter((order) =>
            order.trackingId.toLowerCase().includes(searchTerm)
          );
        }

        if (filters.dueDateRange) {
          const { start, end } = filters.dueDateRange;
          filtered = filtered.filter((order) => {
            const dueDate = new Date(order.dueDate);
            return dueDate >= start && dueDate <= end;
          });
        }

        // Apply sorting
        filtered.sort((a, b) => {
          let aValue: any;
          let bValue: any;

          switch (sort.field) {
            case 'dueDate':
              aValue = new Date(a.dueDate);
              bValue = new Date(b.dueDate);
              break;
            case 'createdAt':
              aValue = new Date(a.createdAt);
              bValue = new Date(b.createdAt);
              break;
            case 'customerName':
              aValue = a.customer.name;
              bValue = b.customer.name;
              break;
            case 'priority':
              const priorityOrder = { LOW: 1, MEDIUM: 2, HIGH: 3, URGENT: 4 };
              aValue = priorityOrder[a.priority as keyof typeof priorityOrder];
              bValue = priorityOrder[b.priority as keyof typeof priorityOrder];
              break;
            case 'price':
              aValue = a.price;
              bValue = b.price;
              break;
            default:
              aValue = a.dueDate;
              bValue = b.dueDate;
          }

          if (aValue < bValue) return sort.direction === 'asc' ? -1 : 1;
          if (aValue > bValue) return sort.direction === 'asc' ? 1 : -1;
          return 0;
        });

        set({ filteredOrders: filtered });
      },

      // UI actions
      setSelectedOrder: (selectedOrderId) => {
        set({
          ui: {
            ...get().ui,
            selectedOrderId,
          },
        });
      },

      toggleOrderDetails: () => {
        set({
          ui: {
            ...get().ui,
            isOrderDetailsOpen: !get().ui.isOrderDetailsOpen,
          },
        });
      },

      toggleNewOrderModal: () => {
        set({
          ui: {
            ...get().ui,
            isNewOrderModalOpen: !get().ui.isNewOrderModalOpen,
          },
        });
      },

      toggleAIAssistant: () => {
        set({
          ui: {
            ...get().ui,
            isAIAssistantOpen: !get().ui.isAIAssistantOpen,
          },
        });
      },

      toggleMobileMenu: () => {
        set({
          ui: {
            ...get().ui,
            isMobileMenuOpen: !get().ui.isMobileMenuOpen,
          },
        });
      },

      setKanbanViewMode: (kanbanViewMode) => {
        set({
          ui: {
            ...get().ui,
            kanbanViewMode,
          },
        });
      },

      // UI state actions
      setUI: (updates) => {
        set((state) => ({
          ui: { ...state.ui, ...updates }
        }));
      },

      setSelectedOrderId: (id) => {
        set({ selectedOrderId: id });
      },

      // Loading actions
      setLoading: (isLoading) => set({ isLoading }),
      setUpdatingOrder: (isUpdatingOrder) => set({ isUpdatingOrder }),
      setGeneratingAI: (isGeneratingAI) => set({ isGeneratingAI }),
      setError: (error) => set({ error }),

      // Computed values
      getOrdersByStatus: (status) => {
        return get().filteredOrders.filter((order) => order.status === status);
      },

      getUrgentOrders: () => {
        const now = new Date();
        const urgentThreshold = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

        return get().filteredOrders.filter(
          (order) =>
            order.priority === 'URGENT' ||
            (new Date(order.dueDate) <= urgentThreshold &&
              !['COMPLETED', 'PICKED_UP'].includes(order.status))
        );
      },

      getOverdueOrders: () => {
        const now = new Date();
        return get().filteredOrders.filter(
          (order) =>
            new Date(order.dueDate) < now &&
            !['COMPLETED', 'PICKED_UP'].includes(order.status)
        );
      },

      getTotalWorkloadHours: () => {
        return get().filteredOrders
          .filter((order) => !['COMPLETED', 'PICKED_UP'].includes(order.status))
          .reduce((total, order) => total + order.estimatedHours, 0);
      },

      getOrderStatistics: () => {
        const orders = get().filteredOrders;
        const total = orders.length;

        const byStatus = orders.reduce((acc, order) => {
          acc[order.status] = (acc[order.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const byPriority = orders.reduce((acc, order) => {
          acc[order.priority] = (acc[order.priority] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const averageHours =
          total > 0
            ? orders.reduce((sum, order) => sum + order.estimatedHours, 0) / total
            : 0;

        const totalRevenue = orders.reduce((sum, order) => sum + order.price, 0);

        return {
          total,
          byStatus,
          byPriority,
          averageHours: Math.round(averageHours * 10) / 10,
          totalRevenue,
        };
      },
    }),
    {
      name: 'order-store',
    }
  )
);