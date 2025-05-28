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

      const posData = {
        orderId: order.trackingId,
        customerName: customer.name,
        customerPhone: customer.phone,
        orderType: order.orderType,
        totalPrice: order.totalPrice,
        status: order.status,
        dueDate: order.dueDate,
        materials: order.materials,
        notes: order.notes,
        lastUpdated: new Date().toISOString()
      };

      const response = await fetch(`${this.baseUrl}/orders`, {
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
}

// Central Dashboard Hub Integration
export class DashboardIntegration {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = process.env.DASHBOARD_API_URL || 'https://0ac8a328-32f3-4362-9a16-8018d89af012-00-17hqj8k6x7wac.worf.replit.dev';
    this.apiKey = process.env.DASHBOARD_API_KEY || 'jf_kanban_admin_2025_full_access_key_12345';
  }

  async syncMetrics() {
    if (!this.baseUrl || !this.apiKey) {
      console.log('Dashboard integration not configured - missing API credentials');
      return { success: false, error: 'Dashboard credentials not configured' };
    }

    try {
      const orders = await storage.getAllOrders();
      const customers = await storage.getAllCustomers();
      
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
      console.error('Dashboard sync error:', error);
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
  await dashboardIntegration.syncMetrics();
}