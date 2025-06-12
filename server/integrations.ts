import { Request, Response } from 'express';
import { storage } from './storage';

// SMS Notification System Integration
export class SMSIntegration {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = process.env.SMS_API_URL || '';
    this.apiKey = process.env.SMS_API_KEY || '';
  }

  async sendOrderNotification(orderId: string, message: string, phoneNumber: string) {
    if (!this.baseUrl || !this.apiKey) {
      console.log('SMS integration not configured - missing API credentials');
      return { success: false, error: 'SMS credentials not configured' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          to: phoneNumber,
          message: message,
          orderId: orderId,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`SMS API error: ${response.status}`);
      }

      const result = await response.json();
      console.log(`SMS sent successfully for order ${orderId}`);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('SMS send error:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  // Webhook handler for SMS status updates
  async handleWebhook(req: Request, res: Response) {
    try {
      const { messageId, status, orderId, timestamp } = req.body;
      
      console.log(`SMS webhook received: Order ${orderId}, Status ${status}`);
      
      // Update order with SMS status if needed
      if (orderId) {
        // You can add SMS status tracking to your order schema if needed
        console.log(`SMS ${status} for order ${orderId} at ${timestamp}`);
      }

      res.status(200).json({ received: true });
    } catch (error) {
      console.error('SMS webhook error:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  }
}

// POS System Integration
export class POSIntegration {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    // Configure for external POS system integration
    this.baseUrl = process.env.POS_API_URL || '';
    this.apiKey = process.env.POS_API_KEY || '';
    
    console.log('POS Integration initialized:');
    console.log('- External POS URL:', this.baseUrl || 'Not configured');
    console.log('- API Key configured:', this.apiKey ? `Yes (${this.apiKey.length} chars)` : 'No');
    
    if (!this.baseUrl) {
      console.log('- Status: Waiting for external POS system configuration');
      console.log('- This frame shop system is ready to receive orders from external POS');
    } else {
      console.log('- Status: Ready to connect to external POS system');
    }
  }

  async syncOrder(orderId: string) {
    if (!this.baseUrl || !this.apiKey) {
      console.log('POS integration not configured - missing API credentials');
      return { success: false, error: 'POS credentials not configured' };
    }

    try {
      const order = await storage.getOrder(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      const customer = await storage.getCustomer(order.customerId);
      if (!customer) {
        throw new Error('Customer not found');
      }

      const posData = {
        orderId: order.trackingId,
        customerName: customer.name,
        customerPhone: customer.phone,
        orderType: order.orderType,
        totalPrice: order.price,
        status: order.status,
        dueDate: order.dueDate,
        materials: order.materials,
        notes: order.notes,
        lastUpdated: new Date().toISOString()
      };

      const response = await fetch(`${this.baseUrl}/api/kanban/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(posData)
      });

      if (!response.ok) {
        throw new Error(`POS API error: ${response.status}`);
      }

      const result = await response.json();
      console.log(`Order ${orderId} synced to POS successfully`);
      return { success: true, posOrderId: result.id };
    } catch (error) {
      console.error('POS sync error:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  // Webhook handler for POS updates
  async handleWebhook(req: Request, res: Response) {
    try {
      const { orderId, status, paymentStatus, timestamp } = req.body;
      
      console.log(`POS webhook received: Order ${orderId}, Status ${status}`);
      
      // Find order by tracking ID and update
      const orders = await storage.getAllOrders();
      const order = orders.find(o => o.trackingId === orderId);
      
      if (order) {
        // Update payment or status based on POS data
        if (paymentStatus) {
          console.log(`Payment status updated for order ${orderId}: ${paymentStatus}`);
        }
        console.log(`POS status update processed for order ${orderId}`);
      }

      res.status(200).json({ received: true });
    } catch (error) {
      console.error('POS webhook error:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  }

  // Fetch new orders from external POS system
  async fetchNewOrders() {
    if (!this.baseUrl) {
      return { 
        success: false, 
        connected: false,
        needsApiKey: false,
        authenticated: false,
        error: 'External POS system not configured', 
        message: 'Frame shop system ready to receive orders from external POS - configure POS_API_URL to connect'
      };
    }

    try {
      // Create a controller for timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      // Check connection first with health endpoint  
      const healthResponse = await fetch(`${this.baseUrl}/api/kanban/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Frame-Shop-Integration/1.0'
        },
        signal: controller.signal
      });
      
      console.log('Health check response:', healthResponse.status, healthResponse.statusText);

      clearTimeout(timeoutId);

      if (!healthResponse.ok) {
        if (healthResponse.status === 503) {
          return { success: false, error: 'POS system temporarily unavailable', retryable: true };
        }
        throw new Error(`POS system unreachable: ${healthResponse.status}`);
      }

      // If API key is available, fetch orders
      if (this.apiKey) {
        const ordersController = new AbortController();
        const ordersTimeoutId = setTimeout(() => ordersController.abort(), 5000);

        // Try different authentication methods
        let ordersResponse;
        
        // Use Bearer token authentication as specified by the API
        console.log(`Attempting Bearer token authentication with API key: ${this.apiKey.substring(0, 8)}...`);
        
        ordersResponse = await fetch(`${this.baseUrl}/api/kanban/orders`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            'User-Agent': 'Frame-Shop-Integration/1.0'
          },
          signal: ordersController.signal
        });

        console.log(`Authentication result: ${ordersResponse.status} ${ordersResponse.statusText}`);

        clearTimeout(ordersTimeoutId);

        if (ordersResponse.ok) {
          const newOrders = await ordersResponse.json();
          console.log(`Successfully fetched ${newOrders.length} orders from Kanban API`);
          return { success: true, orders: newOrders, connected: true, authenticated: true };
        } else {
          console.log(`Orders fetch failed: ${ordersResponse.status} - ${ordersResponse.statusText}`);
          
          // Try to get more details about the authentication requirements
          try {
            const responseText = await ordersResponse.text();
            console.log('API response body:', responseText);
          } catch (e) {
            console.log('Could not read response body');
          }
          
          return { success: true, connected: true, needsApiKey: false, authError: true, 
                   error: `Authentication failed: ${ordersResponse.status} ${ordersResponse.statusText}` };
        }
      }

      console.log('POS system connected but API key needed for order sync');
      return { success: true, connected: true, needsApiKey: true };
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        console.error('POS request timeout');
        return { success: false, error: 'Request timeout' };
      }
      console.error('POS fetch error:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  // Import new orders from POS into Kanban system
  async importNewPOSOrders(posOrders: any[]): Promise<any[]> {
    const { storage } = await import('./storage');
    const newOrders = [];

    for (const posOrder of posOrders) {
      try {
        // Check for existing order by tracking ID to avoid duplicates
        const existingOrder = await storage.getOrderByTrackingId(`POS-${posOrder.id}`);
        if (existingOrder) {
          continue; // Skip duplicates
        }

        // Convert POS order format to Kanban order format
        const customer = await storage.upsertCustomer({
          name: posOrder.customerName || posOrder.customer?.name || 'POS Customer',
          phone: posOrder.phone || posOrder.customer?.phone || '',
          email: posOrder.email || posOrder.customer?.email || '',
        });

        const kanbanOrder = await storage.createOrder({
          trackingId: `POS-${posOrder.id}`,
          customerId: customer.id,
          description: posOrder.description || posOrder.items?.map((i: any) => i.name).join(', ') || 'New POS Order',
          orderType: this.mapPOSOrderType(posOrder.type || posOrder.orderType || 'frame'),
          status: 'ORDER_PROCESSED',
          dueDate: new Date(posOrder.dueDate || Date.now() + 7 * 24 * 60 * 60 * 1000),
          estimatedHours: posOrder.estimatedHours || 2,
          price: posOrder.total || posOrder.price || 0,
          priority: 'MEDIUM',
          notes: `Imported from POS: ${posOrder.notes || posOrder.id || ''}`
        });

        newOrders.push(kanbanOrder);
        console.log(`Imported POS order ${posOrder.id} as Kanban order ${kanbanOrder.id}`);
      } catch (error) {
        console.error(`Failed to import POS order ${posOrder.id}:`, error);
      }
    }

    return newOrders;
  }

  private mapPOSOrderType(posType: string): 'FRAME' | 'MAT' | 'SHADOWBOX' {
    const type = posType?.toLowerCase();
    if (type?.includes('shadow')) return 'SHADOWBOX';
    if (type?.includes('mat')) return 'MAT';
    return 'FRAME';
  }

  // Real-time order synchronization with retry logic
  async startRealTimeSync() {
    console.log('Starting real-time POS synchronization...');
    
    // Check initial connection (non-blocking)
    const connectionTest = await this.fetchNewOrders();
    if (!connectionTest.success) {
      console.log('POS connection failed:', connectionTest.error);
      console.log('Will continue attempting to connect during periodic sync...');
    } else {
      console.log('POS connection established successfully');
    }

    // Set up periodic sync with retry logic (every 30 seconds)
    setInterval(async () => {
      try {
        const result = await this.fetchNewOrders();
        if (result.success && result.orders && result.orders.length > 0) {
          console.log(`Processing ${result.orders.length} new orders from POS`);
          const importedOrders = await this.importNewPOSOrders(result.orders);
          if (importedOrders.length > 0) {
            console.log(`Successfully imported ${importedOrders.length} new orders into Kanban workflow`);
          }
        } else if (!result.success && (result.error?.includes('503') || result.error?.includes('timeout'))) {
          // Silent handling of temporary errors
        } else if (!result.success && !result.retryable) {
          console.log('POS sync check:', result.error || 'Connection issue');
        }
      } catch (error) {
        // Only log unexpected errors, not known temporary issues
        const errorMessage = (error as Error).message;
        if (!errorMessage.includes('503') && !errorMessage.includes('timeout') && !errorMessage.includes('AbortError')) {
          console.error('Real-time sync error:', error);
        }
      }
    }, 30000);

    return true;
  }
}

// Central Dashboard Hub Integration
export class DashboardIntegration {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = process.env.DASHBOARD_API_URL || '';
    this.apiKey = process.env.DASHBOARD_API_KEY || 'kanban_admin_key_2025_full_access';
  }

  async syncMetrics() {
    if (!this.baseUrl || !this.apiKey) {
      console.log('Dashboard integration not configured - missing API credentials');
      return { success: false, error: 'Dashboard credentials not configured' };
    }

    try {
      const orders = await storage.getAllOrders();
      const customers = await storage.getCustomers();
      
      const metrics = {
        totalOrders: orders.length,
        activeOrders: orders.filter(o => o.status !== 'PICKED_UP').length,
        totalRevenue: orders.reduce((sum, o) => sum + (o.totalPrice || 0), 0),
        averageOrderValue: orders.length > 0 ? orders.reduce((sum, o) => sum + (o.totalPrice || 0), 0) / orders.length : 0,
        totalCustomers: customers.length,
        ordersByStatus: {
          ORDER_PROCESSED: orders.filter(o => o.status === 'ORDER_PROCESSED').length,
          MATERIALS_ORDERED: orders.filter(o => o.status === 'MATERIALS_ORDERED').length,
          MATERIALS_ARRIVED: orders.filter(o => o.status === 'MATERIALS_ARRIVED').length,
          FRAME_CUT: orders.filter(o => o.status === 'FRAME_CUT').length,
          MAT_CUT: orders.filter(o => o.status === 'MAT_CUT').length,
          PREPPED: orders.filter(o => o.status === 'PREPPED').length,
          COMPLETED: orders.filter(o => o.status === 'COMPLETED').length,
          PICKED_UP: orders.filter(o => o.status === 'PICKED_UP').length
        },
        lastUpdated: new Date().toISOString(),
        source: 'Frame Shop Management System'
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(`${this.baseUrl}/api/metrics/frame-shop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey
        },
        body: JSON.stringify(metrics),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 503) {
          console.log('Dashboard service temporarily unavailable (503), will retry later');
          return { success: false, error: 'Dashboard service unavailable', retryable: true };
        }
        throw new Error(`Dashboard API error: ${response.status}`);
      }

      const result = await response.json();
      console.log('Metrics synced to dashboard successfully');
      return { success: true, syncId: result.id };
    } catch (error) {
      console.error('🚨 CRITICAL: Dashboard sync error:', error);
      console.error('📊 Business metrics sync FAILED at:', new Date().toISOString());
      return { success: false, error: (error as Error).message };
    }
  }

  async sendOrderUpdate(orderId: string, updateType: string, details: any) {
    if (!this.baseUrl || !this.apiKey) {
      return { success: false, error: 'Dashboard credentials not configured' };
    }

    try {
      const updateData = {
        orderId,
        updateType,
        details,
        timestamp: new Date().toISOString(),
        source: 'Frame Shop Management'
      };

      const response = await fetch(`${this.baseUrl}/api/events/order-update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        throw new Error(`Dashboard API error: ${response.status}`);
      }

      return { success: true };
    } catch (error) {
      console.error('Dashboard update error:', error);
      return { success: false, error: (error as Error).message };
    }
  }
}

// Initialize integrations
export const smsIntegration = new SMSIntegration();
export const posIntegration = new POSIntegration();
export const dashboardIntegration = new DashboardIntegration();

// Auto-sync function for dashboard metrics (can be called periodically)
export async function autoSyncMetrics() {
  console.log('Auto-syncing metrics to dashboard...');
  const result = await dashboardIntegration.syncMetrics();
  return result;
}