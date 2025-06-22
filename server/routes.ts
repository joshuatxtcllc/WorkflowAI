import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from 'ws';
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import { 
  insertOrderSchema, 
  insertCustomerSchema, 
  insertMaterialSchema,
  insertNotificationSchema,
  type Order,
  type Customer,
  type OrderWithDetails,
  type WorkloadAnalysis 
} from "@shared/schema";
import { randomUUID } from "crypto";
import { smsIntegration, posIntegration, dashboardIntegration } from "./integrations";
import { AIService } from "./services/aiService";
import { twilioVoiceService } from "./services/twilioVoiceService";
import multer from 'multer';
import { artworkManager } from './artwork-manager';

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Initialize AI Service
const aiService = new AIService();

interface WebSocketMessage {
  type: string;
  data: any;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      if (req.session.user) {
        res.json(req.session.user);
      } else {
        res.status(401).json({ message: 'Unauthorized' });
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Test route for connection verification
  app.get('/api/test/auth', isAuthenticated, (req, res) => {
    res.json({ success: true, message: 'Hub connection authenticated successfully' });
  });

  // Customer routes
  app.get('/api/customers', isAuthenticated, async (req, res) => {
    try {
      const customers = await storage.getCustomers();
      res.json(customers);
    } catch (error) {
      console.error('Error fetching customers:', error);
      res.status(500).json({ message: 'Failed to fetch customers' });
    }
  });

  app.post('/api/customers', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertCustomerSchema.parse(req.body);
      
      // Check if customer already exists by email
      if (validatedData.email) {
        const existingCustomer = await storage.getCustomerByEmail(validatedData.email);
        if (existingCustomer) {
          return res.status(409).json({ 
            message: 'A customer with this email already exists',
            customer: existingCustomer
          });
        }
      }
      
      const customer = await storage.createCustomer(validatedData);
      res.status(201).json(customer);
    } catch (error) {
      console.error('Error creating customer:', error);
      res.status(500).json({ message: 'Failed to create customer' });
    }
  });

  // Order routes
  app.get('/api/orders', isAuthenticated, async (req, res) => {
    try {
      const orders = await storage.getOrders();
      res.json(orders);
    } catch (error) {
      console.error('Error fetching orders:', error);
      res.status(500).json({ message: 'Failed to fetch orders' });
    }
  });

  app.get('/api/orders/:id', isAuthenticated, async (req, res) => {
    try {
      const order = await storage.getOrderWithDetails(req.params.id);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
      res.json(order);
    } catch (error) {
      console.error('Error fetching order:', error);
      res.status(500).json({ message: 'Failed to fetch order' });
    }
  });

  app.post('/api/orders', isAuthenticated, async (req: any, res) => {
    try {
      console.log('Order creation request received:', req.body);
      
      // Process the request data before validation
      const orderData = {
        ...req.body,
        trackingId: `TRK-${Date.now()}`, // Generate tracking ID
        dueDate: new Date(req.body.dueDate) // Convert string to Date
      };
      
      const validatedData = insertOrderSchema.parse(orderData);
      
      // Verify customer exists
      console.log('Verifying customer exists:', validatedData.customerId);
      const customer = await storage.getCustomer(validatedData.customerId);
      if (!customer) {
        console.log('Customer not found:', validatedData.customerId);
        return res.status(400).json({ message: 'Customer not found' });
      }
      console.log('Customer verified:', customer.name);

      // Process order data
      const processedOrderData = {
        ...validatedData,
        status: 'ORDER_PROCESSED' as const
      };
      
      console.log('Processing order data:', processedOrderData);
      console.log('Order data validated successfully');

      // Create the order
      const order = await storage.createOrder(processedOrderData);
      console.log('Order created in storage:', order.id, order.trackingId);

      // Create initial status history
      await storage.createStatusHistory({
        orderId: order.id,
        toStatus: 'ORDER_PROCESSED',
        changedBy: 'system',
        reason: 'Order created'
      });
      console.log('Status history created');

      // Fetch the complete order with details
      const completeOrder = await storage.getOrderWithDetails(order.id);
      console.log('Order creation completed successfully:', order.id);

      // Send notifications
      try {
        await storage.createNotification({
          customerId: validatedData.customerId,
          orderId: order.id,
          type: 'ORDER_CREATED',
          channel: 'EMAIL',
          subject: 'Order Confirmation',
          content: `Your order ${order.trackingId} has been received and is being processed.`
        });
      } catch (notificationError) {
        console.error('Failed to create notification:', notificationError);
        // Don't fail the order creation if notification fails
      }

      console.log('Order saved with tracking ID:', order.trackingId);
      res.status(201).json({
        success: true,
        order: completeOrder,
        id: order.id,
        trackingId: order.trackingId,
        message: 'Order created successfully'
      });
    } catch (error) {
      console.error('Error creating order:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to create order',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.patch('/api/orders/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const { status } = req.body;
      const orderId = req.params.id;
      
      // Get current order to track status change
      const currentOrder = await storage.getOrder(orderId);
      if (!currentOrder) {
        return res.status(404).json({ message: 'Order not found' });
      }

      // Update order status
      const updatedOrder = await storage.updateOrder(orderId, { status });
      
      // Create status history entry
      await storage.createStatusHistory({
        orderId: orderId,
        fromStatus: currentOrder.status,
        toStatus: status,
        changedBy: req.session?.user?.id || 'system'
      });

      // Get the complete updated order
      const completeOrder = await storage.getOrderWithDetails(orderId);
      
      res.json(completeOrder);
    } catch (error) {
      console.error('Error updating order status:', error);
      res.status(500).json({ message: 'Failed to update order status' });
    }
  });

  // Material routes
  app.get('/api/orders/:orderId/materials', isAuthenticated, async (req, res) => {
    try {
      const materials = await storage.getMaterialsByOrder(req.params.orderId);
      res.json(materials);
    } catch (error) {
      console.error('Error fetching materials:', error);
      res.status(500).json({ message: 'Failed to fetch materials' });
    }
  });

  app.post('/api/orders/:orderId/materials', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertMaterialSchema.parse({
        ...req.body,
        orderId: req.params.orderId
      });
      
      const material = await storage.createMaterial(validatedData);
      res.status(201).json(material);
    } catch (error) {
      console.error('Error creating material:', error);
      res.status(500).json({ message: 'Failed to create material' });
    }
  });

  // Analytics routes
  app.get('/api/analytics/workload', isAuthenticated, async (req, res) => {
    try {
      const workload = await storage.getWorkloadMetrics();
      res.json(workload);
    } catch (error) {
      console.error('Error fetching workload analysis:', error);
      res.status(500).json({ message: 'Failed to fetch workload analysis' });
    }
  });

  // AI-powered routes
  app.get('/api/ai/analysis', isAuthenticated, async (req, res) => {
    try {
      const orders = await storage.getOrders();
      const workload = await storage.getWorkloadMetrics();
      
      // Try to get cached analysis first
      const cachedAnalysis = await storage.getLatestAIAnalysis();
      if (cachedAnalysis && isRecentAnalysis(cachedAnalysis.createdAt)) {
        return res.json(cachedAnalysis.metrics);
      }

      try {
        const analysis = await aiService.generateWorkloadAnalysis(orders, workload);
        
        // Cache the analysis
        await storage.saveAIAnalysis({
          metrics: analysis,
          alerts: analysis.alerts || []
        });
        
        res.json(analysis);
      } catch (aiError) {
        console.error('Error generating AI analysis:', aiError);
        // Return basic workload data if AI fails
        res.json(workload);
      }
    } catch (error) {
      console.error('Error in AI analysis route:', error);
      res.status(500).json({ message: 'Failed to generate analysis' });
    }
  });

  app.get('/api/ai/alerts', isAuthenticated, async (req, res) => {
    try {
      const orders = await storage.getOrders();
      const workload = await storage.getWorkloadMetrics();
      
      try {
        const alerts = await aiService.generateAlerts(orders, workload);
        res.json({ alerts });
      } catch (aiError) {
        console.error('Error generating AI alerts:', aiError);
        // Return basic alerts if AI fails
        const basicAlerts = generateBasicAlerts(orders);
        res.json({ alerts: basicAlerts });
      }
    } catch (error) {
      console.error('Error fetching AI alerts:', error);
      res.status(500).json({ message: 'Failed to fetch alerts' });
    }
  });

  // Integration routes
  app.get('/api/integrations/status', isAuthenticated, async (req, res) => {
    try {
      const twilioStatus = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
      
      const status = {
        sms: true, // SMS is always available
        voice: twilioStatus, // Twilio voice calls
        pos: await posIntegration.checkConnection(),
        dashboard: true // Dashboard integration is internal
      };
      res.json(status);
    } catch (error) {
      console.error('Error checking integration status:', error);
      res.status(500).json({ message: 'Failed to check integration status' });
    }
  });

  // POS Integration routes
  app.get('/api/pos/status', isAuthenticated, async (req, res) => {
    try {
      const isConnected = await posIntegration.checkConnection();
      const hasApiKey = !!process.env.POS_API_KEY;
      const hasUrl = !!process.env.POS_API_URL;
      
      res.json({
        success: isConnected,
        connected: isConnected,
        needsApiKey: !hasApiKey,
        needsUrl: !hasUrl,
        status: isConnected ? 'Connected to external POS system' : 'Waiting for external POS configuration'
      });
    } catch (error) {
      console.error('Error checking POS status:', error);
      res.status(500).json({ 
        success: false,
        connected: false,
        error: 'Failed to check POS status'
      });
    }
  });

  app.post('/api/pos/test-connection', isAuthenticated, async (req, res) => {
    try {
      const connection = await posIntegration.checkConnection();
      res.json({
        success: connection,
        message: connection 
          ? 'Successfully connected to external POS system' 
          : 'External POS system not configured'
      });
    } catch (error) {
      console.error('Error testing POS connection:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to test POS connection'
      });
    }
  });

  app.post('/api/pos/sync', isAuthenticated, async (req, res) => {
    try {
      const newOrders = await posIntegration.fetchNewOrders();
      res.json({
        success: true,
        ordersImported: newOrders.length,
        message: `Successfully imported ${newOrders.length} new orders from POS`
      });
    } catch (error) {
      console.error('Error syncing POS orders:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to sync POS orders',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // SMS Integration routes
  app.post('/api/sms/send', isAuthenticated, async (req, res) => {
    try {
      const { orderId, message, phoneNumber } = req.body;
      await smsIntegration.sendOrderNotification(orderId, message, phoneNumber);
      res.json({ success: true, message: 'SMS sent successfully' });
    } catch (error) {
      console.error('Error sending SMS:', error);
      res.status(500).json({ message: 'Failed to send SMS' });
    }
  });

  // Voice Call Integration routes
  app.post('/api/voice/order-status', isAuthenticated, async (req, res) => {
    try {
      const { orderId, phoneNumber } = req.body;
      
      const order = await storage.getOrderWithDetails(orderId);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }

      const callSid = await twilioVoiceService.makeOrderStatusCall(
        phoneNumber, 
        order.trackingId, 
        order.status
      );
      
      res.json({ 
        success: true, 
        message: 'Voice call initiated', 
        callSid 
      });
    } catch (error) {
      console.error('Error making voice call:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to make voice call',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.post('/api/voice/order-ready', isAuthenticated, async (req, res) => {
    try {
      const { orderId } = req.body;
      
      const order = await storage.getOrderWithDetails(orderId);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }

      if (!order.customer.phone) {
        return res.status(400).json({ message: 'Customer phone number not available' });
      }

      const callSid = await twilioVoiceService.makeOrderReadyCall(
        order.customer.phone,
        order.trackingId,
        order.customer.name
      );
      
      res.json({ 
        success: true, 
        message: 'Order ready call initiated', 
        callSid 
      });
    } catch (error) {
      console.error('Error making order ready call:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to make order ready call',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.post('/api/voice/custom', isAuthenticated, async (req, res) => {
    try {
      const { phoneNumber, message } = req.body;
      
      if (!phoneNumber || !message) {
        return res.status(400).json({ message: 'Phone number and message are required' });
      }

      const callSid = await twilioVoiceService.makeCustomCall(phoneNumber, message);
      
      res.json({ 
        success: true, 
        message: 'Custom voice call initiated', 
        callSid 
      });
    } catch (error) {
      console.error('Error making custom voice call:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to make custom voice call',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.get('/api/voice/status/:callSid', isAuthenticated, async (req, res) => {
    try {
      const { callSid } = req.params;
      const callStatus = await twilioVoiceService.getCallStatus(callSid);
      res.json(callStatus);
    } catch (error) {
      console.error('Error fetching call status:', error);
      res.status(500).json({ message: 'Failed to fetch call status' });
    }
  });

  // Dashboard Integration routes
  app.post('/api/integrations/dashboard/sync', isAuthenticated, async (req, res) => {
    try {
      await dashboardIntegration.syncMetrics();
      res.json({ success: true, message: 'Metrics synced to dashboard' });
    } catch (error) {
      console.error('Error syncing to dashboard:', error);
      res.status(500).json({ 
        success: false,
        error: error instanceof Error ? error.message : 'Dashboard sync failed'
      });
    }
  });

  // Artwork management routes
  app.post('/api/orders/:orderId/artwork', isAuthenticated, upload.single('artwork'), async (req, res) => {
    try {
      const { orderId } = req.params;
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({ message: 'No artwork file provided' });
      }

      const imageUrl = await artworkManager.uploadArtworkImage(orderId, file.buffer, file.originalname);
      res.json({ success: true, imageUrl });
    } catch (error) {
      console.error('Error uploading artwork:', error);
      res.status(500).json({ message: 'Failed to upload artwork' });
    }
  });

  app.get('/api/artwork/:filename', async (req, res) => {
    try {
      const { filename } = req.params;
      const imageBuffer = await artworkManager.getArtworkImage(filename);
      
      res.set('Content-Type', 'image/jpeg');
      res.send(imageBuffer);
    } catch (error) {
      console.error('Error serving artwork:', error);
      res.status(404).json({ message: 'Artwork not found' });
    }
  });

  // Webhook routes for integrations
  app.post('/api/webhooks/sms', async (req, res) => {
    try {
      await smsIntegration.handleWebhook(req, res);
    } catch (error) {
      console.error('Error handling SMS webhook:', error);
      res.status(500).json({ message: 'Failed to process SMS webhook' });
    }
  });

  app.post('/api/webhooks/pos', async (req, res) => {
    try {
      await posIntegration.handleWebhook(req, res);
    } catch (error) {
      console.error('Error handling POS webhook:', error);
      res.status(500).json({ message: 'Failed to process POS webhook' });
    }
  });

  // Search routes
  app.get('/api/orders/search', isAuthenticated, async (req, res) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ message: 'Search query required' });
      }
      
      const orders = await storage.searchOrders(q);
      res.json(orders);
    } catch (error) {
      console.error('Error searching orders:', error);
      res.status(500).json({ message: 'Failed to search orders' });
    }
  });

  // Tracking route for customers
  app.get('/api/track/:trackingId', async (req, res) => {
    try {
      const { trackingId } = req.params;
      const order = await storage.getOrderByTrackingId(trackingId);
      
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }

      // Return limited information for customer tracking
      res.json({
        trackingId: order.trackingId,
        status: order.status,
        dueDate: order.dueDate,
        description: order.description,
        customer: {
          name: order.customer.name
        }
      });
    } catch (error) {
      console.error('Error tracking order:', error);
      res.status(500).json({ message: 'Failed to track order' });
    }
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // Create HTTP server
  const httpServer = createServer(app);

  // WebSocket server setup
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    console.log('WebSocket client connected');
    
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });

    ws.on('message', async (data: Buffer) => {
      try {
        const message: WebSocketMessage = JSON.parse(data.toString());
        
        switch (message.type) {
          case 'order-update':
            // Handle real-time order updates
            broadcast(wss, {
              type: 'order-updated',
              data: message.data
            });
            break;
            
          case 'status-change':
            // Handle status changes
            broadcast(wss, {
              type: 'status-changed', 
              data: message.data
            });
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
  });

  function broadcast(wss: WebSocketServer, message: any) {
    const messageStr = JSON.stringify(message);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }

  // Auto-sync metrics to dashboard every 5 minutes
  setInterval(async () => {
    try {
      console.log('Auto-syncing metrics to dashboard...');
      await dashboardIntegration.syncMetrics();
    } catch (error) {
      console.error('Auto-sync failed:', error);
    }
  }, 5 * 60 * 1000);

  // POS sync every 30 seconds
  setInterval(async () => {
    try {
      await posIntegration.fetchNewOrders();
    } catch (error) {
      // Silent fail for POS sync as it may not be configured
    }
  }, 30 * 1000);

  // Generate periodic AI analysis
  setInterval(async () => {
    try {
      const orders = await storage.getOrders();
      const workload = await storage.getWorkloadMetrics();
      await aiService.generateWorkloadAnalysis(orders, workload);
    } catch (error) {
      console.error('Error generating AI analysis:', error);
    }
  }, 15 * 60 * 1000); // Every 15 minutes

  return httpServer;
}

// Helper functions
function isRecentAnalysis(date: Date): boolean {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  return date > fiveMinutesAgo;
}

function generateBasicAlerts(orders: OrderWithDetails[]) {
  const alerts = [];
  const now = new Date();
  
  // Check for overdue orders
  const overdueOrders = orders.filter(order => 
    new Date(order.dueDate) < now && 
    !['COMPLETED', 'PICKED_UP'].includes(order.status)
  );
  
  if (overdueOrders.length > 0) {
    alerts.push({
      id: `overdue_${randomUUID().replace(/-/g, '_')}`,
      type: 'overdue',
      severity: 'high',
      title: 'Overdue Orders',
      message: `${overdueOrders.length} orders are past their due date`,
      count: overdueOrders.length
    });
  }
  
  return alerts;
}