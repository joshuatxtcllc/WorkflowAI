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
    this.baseUrl = process.env.POS_API_URL || '';
    this.apiKey = process.env.POS_API_KEY || '';
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

      const materials = await storage.getMaterialsByOrder(orderId);

      const posData = {
        orderId: order.trackingId,
        invoiceNumber: order.invoiceNumber,
        customerInfo: {
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          address: customer.address
        },
        orderDetails: {
          orderType: order.orderType,
          status: order.status,
          priority: order.priority,
          dueDate: order.dueDate,
          createdAt: order.createdAt,
          estimatedHours: order.estimatedHours,
          actualHours: order.actualHours
        },
        artworkDetails: {
          type: order.artworkType,
          description: order.artworkDescription,
          images: order.artworkImages || [],
          location: order.artworkLocation,
          received: order.artworkReceived
        },
        specifications: {
          frameSize: order.frameSize,
          outerSize: order.outerSize,
          glassType: order.glassType,
          spacers: order.spacers,
          shadowboxWalls: order.shadowboxWalls,
          isFloat: order.isFloat,
          laborHours: order.laborHours,
          specialInstructions: order.specialInstructions
        },
        pricing: {
          basePrice: order.price,
          totalPrice: order.totalPrice,
          laborCost: order.laborCost,
          materialCost: order.materialCost,
          taxAmount: order.taxAmount
        },
        materials: materials.map(mat => ({
          id: mat.id,
          type: mat.type,
          vendor: mat.vendor,
          description: mat.description,
          quantity: mat.quantity,
          unitPrice: mat.unitPrice,
          totalPrice: mat.totalPrice,
          status: mat.status,
          arrived: mat.arrived,
          notes: mat.notes
        })),
        notes: order.notes,
        internalNotes: order.internalNotes,
        lastUpdated: new Date().toISOString()
      };

      const response = await fetch(`${this.baseUrl}/api/orders/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Source': 'FrameShop-Management'
        },
        body: JSON.stringify(posData)
      });

      if (!response.ok) {
        throw new Error(`POS API error: ${response.status}`);
      }

      const result = await response.json();
      console.log(`Order ${orderId} synced to POS successfully`);
      
      // Store POS reference ID in our system
      await storage.updateOrder(orderId, { 
        posOrderId: result.posOrderId,
        lastSyncedToPOS: new Date()
      });

      return { success: true, posOrderId: result.posOrderId };
    } catch (error) {
      console.error('POS sync error:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  async syncSalesData() {
    try {
      if (!this.baseUrl || !this.apiKey) {
        return { success: false, error: 'POS credentials not configured' };
      }

      // Get sales data from POS for revenue tracking
      const response = await fetch(`${this.baseUrl}/api/sales/export`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Source': 'FrameShop-Management'
        }
      });

      if (!response.ok) {
        throw new Error(`POS API error: ${response.status}`);
      }

      const salesData = await response.json();
      
      // Process and store sales data for analytics
      console.log(`Retrieved ${salesData.transactions?.length || 0} sales transactions from POS`);
      
      return { success: true, salesData };
    } catch (error) {
      console.error('POS sales sync error:', error);
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
}

// Central Dashboard Hub Integration
export class DashboardIntegration {
  private baseUrl: string;
  private apiKey: string;
  private syncInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.baseUrl = process.env.DASHBOARD_API_URL || '';
    this.apiKey = process.env.DASHBOARD_API_KEY || 'kanban_admin_key_2025_full_access';
    this.startAutoSync();
  }

  private startAutoSync() {
    // Sync every 5 minutes for real-time data
    this.syncInterval = setInterval(async () => {
      await this.syncMetrics();
      await this.syncOrderUpdates();
    }, 5 * 60 * 1000);
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

      const response = await fetch(`${this.baseUrl}/api/metrics/frame-shop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey
        },
        body: JSON.stringify(metrics)
      });

      if (!response.ok) {
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
      const order = await storage.getOrder(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      const customer = await storage.getCustomer(order.customerId);
      const materials = await storage.getMaterialsByOrder(orderId);

      const updateData = {
        orderId: order.trackingId,
        updateType,
        details,
        orderData: {
          trackingId: order.trackingId,
          customerName: customer?.name,
          customerPhone: customer?.phone,
          orderType: order.orderType,
          status: order.status,
          priority: order.priority,
          totalPrice: order.totalPrice || order.price,
          dueDate: order.dueDate,
          artworkType: order.artworkType,
          artworkDescription: order.artworkDescription,
          artworkImages: order.artworkImages || [],
          artworkLocation: order.artworkLocation,
          frameSize: order.frameSize,
          outerSize: order.outerSize,
          glassType: order.glassType,
          spacers: order.spacers,
          shadowboxWalls: order.shadowboxWalls,
          isFloat: order.isFloat,
          laborHours: order.laborHours,
          specialInstructions: order.specialInstructions,
          materials: materials,
          estimatedHours: order.estimatedHours,
          actualHours: order.actualHours
        },
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

  async syncOrderUpdates() {
    try {
      const orders = await storage.getAllOrders();
      const recentOrders = orders.filter(order => {
        const updatedAt = new Date(order.updatedAt || order.createdAt);
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        return updatedAt > fiveMinutesAgo;
      });

      for (const order of recentOrders) {
        await this.sendOrderUpdate(order.id, 'status_change', {
          previousStatus: order.status,
          newStatus: order.status,
          updateReason: 'Auto sync'
        });
      }

      console.log(`Synced ${recentOrders.length} recent order updates to hub`);
    } catch (error) {
      console.error('Order sync error:', error);
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
  await dashboardIntegration.syncMetrics();
}