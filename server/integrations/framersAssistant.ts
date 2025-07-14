
import { Request, Response } from 'express';
import { storage } from '../storage';

export class FramersAssistantIntegration {
  private baseUrl: string;
  private apiKey: string;
  private webhookSecret: string;

  constructor() {
    this.baseUrl = process.env.FRAMERS_ASSISTANT_API_URL || '';
    this.apiKey = process.env.FRAMERS_ASSISTANT_API_KEY || '';
    this.webhookSecret = process.env.FRAMERS_ASSISTANT_WEBHOOK_SECRET || '';

    console.log('Framers Assistant Integration initialized:');
    console.log('- API URL:', this.baseUrl || 'Not configured');
    console.log('- API Key configured:', this.apiKey ? `Yes (${this.apiKey.length} chars)` : 'No');
    console.log('- Webhook Secret configured:', this.webhookSecret ? 'Yes' : 'No');

    if (!this.baseUrl || !this.apiKey) {
      console.log('- Status: Integration disabled - missing configuration');
      console.log('- To enable: Set FRAMERS_ASSISTANT_API_URL and FRAMERS_ASSISTANT_API_KEY in Secrets');
    } else {
      console.log('- Status: Ready to connect to Framers Assistant');
    }
  }

  async checkConnection() {
    if (!this.baseUrl || !this.apiKey) {
      return {
        connected: false,
        authenticated: false,
        error: 'Missing API configuration - set FRAMERS_ASSISTANT_API_URL and FRAMERS_ASSISTANT_API_KEY in Secrets'
      };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${this.baseUrl}/api/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        let data;
        try {
          data = await response.json();
        } catch {
          // If response isn't JSON, treat as basic success
          data = { status: 'healthy' };
        }
        return {
          connected: true,
          authenticated: true,
          status: 'healthy',
          appInfo: data
        };
      } else {
        return {
          connected: true,
          authenticated: false,
          error: `Authentication failed: ${response.status} ${response.statusText}`
        };
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        return {
          connected: false,
          authenticated: false,
          error: 'Connection timeout - check if Framers Assistant is running'
        };
      }
      return {
        connected: false,
        authenticated: false,
        error: (error as Error).message
      };
    }
  }

  async syncOrder(orderId: string) {
    if (!this.baseUrl || !this.apiKey) {
      return { success: false, error: 'Framers Assistant not configured' };
    }

    try {
      const order = await storage.getOrder(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      const syncData = {
        orderId: order.id,
        trackingId: order.trackingId,
        customerName: order.customer.name,
        customerPhone: order.customer.phone,
        customerEmail: order.customer.email,
        orderType: order.orderType,
        description: order.description,
        status: order.status,
        dueDate: order.dueDate,
        price: order.price,
        estimatedHours: order.estimatedHours,
        priority: order.priority,
        notes: order.notes,
        materials: order.materials,
        artworkImages: order.artworkImages || [],
        lastUpdated: new Date().toISOString(),
        source: 'Jay Frames Kanban System'
      };

      const response = await fetch(`${this.baseUrl}/api/orders/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(syncData)
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`Order ${orderId} synced to Framers Assistant successfully`);
      return { success: true, result };
    } catch (error) {
      console.error('Framers Assistant sync error:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  async syncAllActiveOrders() {
    try {
      const orders = await storage.getOrders();
      const activeOrders = orders.filter(order => 
        !['COMPLETED', 'PICKED_UP'].includes(order.status)
      );

      const results = [];
      for (const order of activeOrders) {
        const result = await this.syncOrder(order.id);
        results.push({ orderId: order.id, ...result });
      }

      return {
        success: true,
        totalOrders: activeOrders.length,
        results
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  async receiveOrderUpdate(orderData: any) {
    try {
      // Find order by external ID or tracking ID
      let order = null;
      if (orderData.externalOrderId) {
        order = await storage.getOrder(orderData.externalOrderId);
      } else if (orderData.trackingId) {
        order = await storage.getOrderByTrackingId(orderData.trackingId);
      }

      if (!order) {
        console.log('Order not found for update:', orderData);
        return { success: false, error: 'Order not found' };
      }

      // Update order status if provided
      if (orderData.status && orderData.status !== order.status) {
        await storage.updateOrder(order.id, { status: orderData.status });
        
        // Create status history
        await storage.createStatusHistory({
          orderId: order.id,
          fromStatus: order.status,
          toStatus: orderData.status,
          changedBy: 'framers-assistant',
          reason: 'Updated from Framers Assistant'
        });
      }

      // Update other fields if provided
      const updates: any = {};
      if (orderData.notes) updates.notes = orderData.notes;
      if (orderData.estimatedHours) updates.estimatedHours = orderData.estimatedHours;
      if (orderData.dueDate) updates.dueDate = new Date(orderData.dueDate);

      if (Object.keys(updates).length > 0) {
        await storage.updateOrder(order.id, updates);
      }

      return { success: true, message: 'Order updated successfully' };
    } catch (error) {
      console.error('Error receiving order update:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  async handleWebhook(req: Request, res: Response) {
    try {
      // Verify webhook signature if secret is configured
      if (this.webhookSecret) {
        const signature = req.headers['x-framers-assistant-signature'] as string;
        if (!signature || !this.verifyWebhookSignature(req.body, signature)) {
          return res.status(401).json({ error: 'Invalid webhook signature' });
        }
      }

      const { type, data } = req.body;

      switch (type) {
        case 'order.updated':
          const updateResult = await this.receiveOrderUpdate(data);
          return res.json(updateResult);

        case 'order.completed':
          if (data.orderId) {
            await storage.updateOrder(data.orderId, { status: 'COMPLETED' });
            await storage.createStatusHistory({
              orderId: data.orderId,
              fromStatus: data.previousStatus || 'PREPPED',
              toStatus: 'COMPLETED',
              changedBy: 'framers-assistant',
              reason: 'Completed in Framers Assistant'
            });
          }
          return res.json({ success: true, message: 'Order marked as completed' });

        case 'ping':
          return res.json({ success: true, message: 'Webhook endpoint is working' });

        default:
          console.log('Unknown webhook type:', type);
          return res.json({ success: true, message: 'Event received but not processed' });
      }
    } catch (error) {
      console.error('Framers Assistant webhook error:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  }

  private verifyWebhookSignature(payload: any, signature: string): boolean {
    try {
      const crypto = require('crypto');
      const computedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(JSON.stringify(payload))
        .digest('hex');
      
      return `sha256=${computedSignature}` === signature;
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      return false;
    }
  }

  async testConnection() {
    return await this.checkConnection();
  }
}

export const framersAssistantIntegration = new FramersAssistantIntegration();
