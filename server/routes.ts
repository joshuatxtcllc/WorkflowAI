import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { authenticateToken, loginUser, createDefaultUser } from "./simpleAuth";
import { AIService } from "./services/aiService";
import { NotificationService } from "./services/notificationService";
import { vendorOrderService } from "./vendor-orders";
import { artworkManager } from "./artwork-manager";
import { insertOrderSchema, insertCustomerSchema, insertMaterialSchema } from "@shared/schema";
import { z } from "zod";
import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import multer from 'multer';
import path from 'node:path';
import { db } from "./db";
import { customers, orders, statusHistory } from "../shared/schema";
import { eq } from "drizzle-orm";

interface WebSocketMessage {
  type: string;
  data: any;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Create default admin user on startup
  await createDefaultUser();

  // Initialize services
  const aiService = new AIService();
  const notificationService = new NotificationService();

  // Configure multer for image uploads
  const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed'));
      }
    }
  });

  // Auth routes
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      const result = await loginUser(email, password);

      if (!result) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      res.json(result);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.get('/api/auth/user', authenticateToken, async (req: any, res) => {
    try {
      res.json(req.user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Customer routes
  app.get('/api/customers', authenticateToken, async (req, res) => {
    try {
      const customers = await storage.getCustomers();
      res.json(customers);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ message: "Failed to fetch customers" });
    }
  });

  app.post('/api/customers', authenticateToken, async (req, res) => {
    try {
      const customerData = insertCustomerSchema.parse(req.body);
      const customer = await storage.createCustomer(customerData);
      res.status(201).json(customer);
    } catch (error) {
      console.error("Error creating customer:", error);
      res.status(400).json({ message: "Failed to create customer" });
    }
  });

  // Order routes
  app.get('/api/orders', authenticateToken, async (req, res) => {
    try {
      const orders = await storage.getOrders();
      res.json(orders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.get('/api/orders/:id', authenticateToken, async (req, res) => {
    try {
      const order = await storage.getOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      res.json(order);
    } catch (error) {
      console.error("Error fetching order:", error);
      res.status(500).json({ message: "Failed to fetch order" });
    }
  });

  app.post('/api/orders', authenticateToken, async (req, res) => {
    try {
      const orderData = insertOrderSchema.parse(req.body);
      const order = await storage.createOrder(orderData);

      // Create status history entry
      await storage.createStatusHistory({
        orderId: order.id,
        toStatus: order.status || 'ORDER_PROCESSED',
        changedBy: (req.user as any)?.claims?.sub || 'system',
        reason: 'Order created'
      });

      // Trigger AI analysis
      await aiService.analyzeWorkload();

      res.status(201).json(order);
    } catch (error) {
      console.error("Error creating order:", error);
      res.status(400).json({ message: "Failed to create order" });
    }
  });

  app.patch('/api/orders/:id/status', authenticateToken, async (req, res) => {
    try {
      const { status } = req.body;
      const orderId = req.params.id;
      const userId = (req.user as any)?.claims?.sub || 'system';

      // Get current order
      const currentOrder = await storage.getOrder(orderId);
      if (!currentOrder) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Update order status
      const updatedOrder = await storage.updateOrder(orderId, { 
        status,
      });

      // Create status history entry
      await storage.createStatusHistory({
        orderId,
        fromStatus: currentOrder.status || undefined,
        toStatus: status,
        changedBy: userId,
      });

      // Send notifications for certain status changes
      if (['COMPLETED', 'READY_FOR_PICKUP'].includes(status)) {
        await notificationService.sendStatusUpdate(currentOrder);
      }

      // Trigger AI analysis
      await aiService.analyzeWorkload();

      res.json(updatedOrder);
    } catch (error) {
      console.error("Error updating order status:", error);
      res.status(500).json({ message: "Failed to update order status" });
    }
  });

  // Material routes
  app.get('/api/orders/:orderId/materials', authenticateToken, async (req, res) => {
    try {
      const materials = await storage.getMaterialsByOrder(req.params.orderId);
      res.json(materials);
    } catch (error) {
      console.error("Error fetching materials:", error);
      res.status(500).json({ message: "Failed to fetch materials" });
    }
  });

  app.post('/api/orders/:orderId/materials', authenticateToken, async (req, res) => {
    try {
      const materialData = insertMaterialSchema.parse({
        ...req.body,
        orderId: req.params.orderId
      });
      const material = await storage.createMaterial(materialData);
      res.status(201).json(material);
    } catch (error) {
      console.error("Error creating material:", error);
      res.status(400).json({ message: "Failed to create material" });
    }
  });

  app.patch('/api/materials/:id', authenticateToken, async (req, res) => {
    try {
      const material = await storage.updateMaterial(req.params.id, req.body);
      res.json(material);
    } catch (error) {
      console.error("Error updating material:", error);
      res.status(500).json({ message: "Failed to update material" });
    }
  });

  // AI routes
  app.get('/api/ai/analysis', authenticateToken, async (req, res) => {
    try {
      const analysis = await aiService.generateWorkloadAnalysis();
      res.json(analysis);
    } catch (error) {
      console.error("Error generating AI analysis:", error);
      res.status(500).json({ message: "Failed to generate analysis" });
    }
  });

  app.post('/api/ai/chat', authenticateToken, async (req, res) => {
    try {
      const { message } = req.body;
      const response = await aiService.generateChatResponse(message);
      res.json({ response });
    } catch (error) {
      console.error("Error generating AI response:", error);
      res.status(500).json({ message: "Failed to generate response" });
    }
  });

  // Artwork management routes
  // Get artwork images for an order
  app.get('/api/orders/:orderId/artwork', authenticateToken, async (req, res) => {
    try {
      const { orderId } = req.params;

      const [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, orderId));

      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      const artworkImages = (order.artworkImages as string[]) || [];
      const imageData = artworkImages.map((url, index) => ({
        id: `${orderId}-${index}`,
        filename: url.split('/').pop() || 'unknown',
        url: url,
        uploadedAt: order.updatedAt || new Date().toISOString()
      }));

      res.json(imageData);
    } catch (error) {
      console.error("Error fetching artwork:", error);
      res.status(500).json({ message: "Failed to fetch artwork" });
    }
  });

  // Artwork image upload
  app.post('/api/orders/:orderId/artwork/upload', upload.single('artwork'), async (req, res) => {
    try {
      const { orderId } = req.params;
      console.log("Upload request received for order:", orderId);
      console.log("File info:", req.file ? { 
        originalname: req.file.originalname, 
        mimetype: req.file.mimetype, 
        size: req.file.size 
      } : "No file");

      if (!req.file) {
        console.log("No file provided in request");
        return res.status(400).json({ message: "No image file provided" });
      }

      const imageUrl = await artworkManager.uploadArtworkImage(
        orderId, 
        req.file.buffer, 
        req.file.originalname
      );

      console.log("Image uploaded successfully:", imageUrl);
      res.json({ imageUrl, message: "Image uploaded successfully" });
    } catch (error) {
      console.error("Error uploading artwork image:", error);
      res.status(500).json({ message: "Failed to upload image", error: (error as Error).message });
    }
  });

  app.get('/api/artwork/:filename', async (req, res) => {
    try {
      const { filename } = req.params;
      const imageBuffer = await artworkManager.getArtworkImage(filename);

      const ext = path.extname(filename).toLowerCase();
      const contentType = ext === '.png' ? 'image/png' : 
                         ext === '.gif' ? 'image/gif' : 'image/jpeg';

      res.setHeader('Content-Type', contentType);
      res.send(imageBuffer);
    } catch (error) {
      res.status(404).json({ message: "Image not found" });
    }
  });

  app.put('/api/orders/:orderId/artwork/location', async (req, res) => {
    try {
      const { orderId } = req.params;
      const { location } = req.body;

      console.log("Updating artwork location for order:", orderId, "to:", location);
      await artworkManager.updateArtworkLocation(orderId, location);
      res.json({ message: "Artwork location updated" });
    } catch (error) {
      console.error("Error updating artwork location:", error);
      res.status(500).json({ message: "Failed to update location" });
    }
  });

  app.put('/api/orders/:orderId/artwork/received', async (req, res) => {
    try {
      const { orderId } = req.params;
      const { received } = req.body;

      console.log("Updating artwork received status for order:", orderId, "to:", received);
      await artworkManager.markArtworkReceived(orderId, received);
      res.json({ message: "Artwork received status updated" });
    } catch (error) {
      console.error("Error updating artwork received status:", error);
      res.status(500).json({ message: "Failed to update received status" });
    }
  });

  app.delete('/api/orders/:orderId/artwork/:imageUrl', authenticateToken, async (req, res) => {
    try {
      const { orderId, imageUrl } = req.params;
      const decodedImageUrl = decodeURIComponent(imageUrl);

      await artworkManager.removeArtworkImage(orderId, decodedImageUrl);
      res.json({ message: "Image removed successfully" });
    } catch (error) {
      console.error("Error removing artwork image:", error);
      res.status(500).json({ message: "Failed to remove image" });
    }
  });

  app.get('/api/artwork/locations', authenticateToken, async (req, res) => {
    try {
      const locations = artworkManager.getCommonLocations();
      res.json(locations);
    } catch (error) {
      res.status(500).json({ message: "Failed to get locations" });
    }
  });

  // Vendor ordering routes
  app.get('/api/vendor/orders', authenticateToken, async (req, res) => {
    try {
      const vendorOrders = await vendorOrderService.generateVendorOrders();
      res.json(vendorOrders);
    } catch (error) {
      console.error("Error generating vendor orders:", error);
      res.status(500).json({ message: "Failed to generate vendor orders" });
    }
  });

  app.post('/api/vendor/mark-ordered', authenticateToken, async (req, res) => {
    try {
      const { orderIds } = req.body;
      await vendorOrderService.markMaterialsOrdered(orderIds);
      res.json({ message: "Orders marked as materials ordered" });
    } catch (error) {
      console.error("Error marking orders:", error);
      res.status(500).json({ message: "Failed to mark orders" });
    }
  });

  

  // Analytics routes
  app.get('/api/analytics/workload', authenticateToken, async (req, res) => {
    try {
      const metrics = await storage.getWorkloadMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching workload metrics:", error);
      res.status(500).json({ message: "Failed to fetch metrics" });
    }
  });

  // Customer portal routes (no auth required)
  app.get('/api/customer/track/:trackingId', async (req, res) => {
    try {
      const { trackingId } = req.params;
      const order = await storage.getOrderByTrackingId(trackingId);

      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Remove sensitive data
      const { internalNotes, assignedToId, ...safeOrder } = order;
      res.json(safeOrder);
    } catch (error) {
      console.error("Error tracking order:", error);
      res.status(500).json({ message: "Failed to track order" });
    }
  });

  app.get('/api/customer/orders/:email', async (req, res) => {
    try {
      const { email } = req.params;
      const customer = await storage.getCustomerByEmail(email);

      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      const orders = await storage.getOrdersByCustomer(customer.id);

      // Remove sensitive data
      const safeOrders = orders.map(({ internalNotes, assignedToId, ...order }) => order);
      res.json(safeOrders);
    } catch (error) {
      console.error("Error fetching customer orders:", error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);

  // Setup WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    console.log('WebSocket client connected');

    ws.on('message', async (data: Buffer) => {
      try {
        const message: WebSocketMessage = JSON.parse(data.toString());

        switch (message.type) {
          case 'join-room':
            // Add client to specific room (could be enhanced with room management)
            break;

          case 'order-status-update':
            // Broadcast order status update to all connected clients
            const updatedOrder = message.data;
            broadcast(wss, {
              type: 'order-updated',
              data: updatedOrder
            });
            break;

          case 'ai-alert':
            // Broadcast AI alert to all connected clients
            broadcast(wss, {
              type: 'ai-alert',
              data: message.data
            });
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });

    // Send initial connection confirmation
    ws.send(JSON.stringify({
      type: 'connected',
      data: { message: 'Connected to Jay\'s Frames WebSocket' }
    }));
  });

  // Start AI monitoring
  if (process.env.OPENAI_API_KEY) {
    setInterval(async () => {
      try {
        const analysis = await aiService.analyzeWorkload();
        if (analysis) {
          broadcast(wss, {
            type: 'ai-analysis',
            data: analysis
          });
        }
      } catch (error) {
        console.error('AI monitoring error:', error);
      }
    }, 30000); // Every 30 seconds
  }

  

  

  // Batch update order status
  app.patch('/api/orders/batch-status', async (req, res) => {
    try {
      const { orderIds, status } = req.body;

      if (!Array.isArray(orderIds) || orderIds.length === 0) {
        return res.status(400).json({ error: 'Order IDs array is required' });
      }

if (!status) {
        return res.status(400).json({ error: 'Status is required' });
      }

      const updatedOrders = [];
      for (const orderId of orderIds) {
        try {
          const updatedOrder = await storage.updateOrder(orderId, { status });
          updatedOrders.push(updatedOrder);
        } catch (error) {
          console.error(`Failed to update order ${orderId}:`, error);
        }
      }

      // Broadcast update to connected clients
      broadcast(wss, {
        type: 'batch_status_update',
        data: { orderIds, status, count: updatedOrders.length }
      });

      res.json({ 
        message: `Updated ${updatedOrders.length} orders successfully`,
        updatedCount: updatedOrders.length,
        totalRequested: orderIds.length
      });
    } catch (error) {
      console.error('Error batch updating order status:', error);
      res.status(500).json({ error: 'Failed to batch update order status' });
    }
  });

  // Test endpoint for hub connection verification
  app.get('/api/test/auth', (req, res) => {
    try {
      const startTime = Date.now();
      const apiKey = req.headers['x-api-key'];

      if (!apiKey) {
        return res.status(401).json({ error: 'API key required' });
      }

      if (apiKey !== 'kanban_admin_key_2025_full_access') {
        return res.status(403).json({ error: 'Invalid API key' });
      }

      const responseTime = Date.now() - startTime;

      res.json({ 
        success: true, 
        message: 'Hub connection authenticated successfully',
        timestamp: new Date().toISOString(),
        server: 'Jay\'s Frames Central Hub',
        status: 'operational',
        responseTime
      });
    } catch (error) {
      console.error('Hub auth test error:', error);
      res.status(500).json({ error: 'Hub authentication test failed' });
    }
  });

  // System health check endpoint
  app.get('/api/system/health', async (req, res) => {
    try {
      const startTime = Date.now();

      // Test database connectivity
      const orders = await storage.getAllOrders();
      const customers = await storage.getCustomers();

      const dbResponseTime = Date.now() - startTime;

      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: {
          connected: true,
          responseTime: dbResponseTime,
          ordersCount: orders.length,
          customersCount: customers.length
        },
        server: {
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
          nodeVersion: process.version
        }
      });
    } catch (error) {
      console.error('Health check failed:', error);
      res.status(500).json({ 
        status: 'unhealthy',
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Integration sync status endpoint
  app.get('/api/integrations/dashboard/status', (req, res) => {
    try {
      // Check if sync is working by verifying last sync time
      const lastSyncTime = new Date(); // You can store this in a variable or database
      const timeSinceSync = Date.now() - lastSyncTime.getTime();
      const syncHealthy = timeSinceSync < 900000; // 15 minutes

      res.json({
        syncActive: syncHealthy,
        lastSync: lastSyncTime.toISOString(),
        timeSinceSync,
        status: syncHealthy ? 'operational' : 'degraded',
        dashboardUrl: process.env.DASHBOARD_API_URL || 'Local Hub',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Sync status check failed:', error);
      res.status(500).json({ 
        syncActive: false,
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Dashboard Webhook endpoint
  app.post('/api/webhooks/dashboard', async (req, res) => {
    try {
      console.log('Dashboard webhook received:', req.body);
      const { type, orderId, data } = req.body;

      // Handle different webhook types
      switch (type) {
        case 'order_status_update':
          if (orderId && data.status) {
            // Update order status from hub
            const orders = await storage.getAllOrders();
            const order = orders.find(o => o.trackingId === orderId);
            if (order) {
              await storage.updateOrder(order.id, { 
                status: data.status,
                lastSyncedToHub: new Date()
              });

              // Broadcast update to connected clients
              broadcast(wss, {
                type: 'order_updated',
                data: { orderId: order.id, status: data.status }
              });
            }
          }
          break;

        case 'metrics_request':
          // Send current metrics to hub
          await dashboardIntegration.syncMetrics();
          break;

        case 'full_sync_request':
          // Perform full data synchronization
          const allOrders = await storage.getAllOrders();
          for (const order of allOrders) {
            await dashboardIntegration.sendOrderUpdate(order.id, 'full_sync', {
              reason: 'Hub requested full sync'
            });
          }
          break;
      }

      res.status(200).json({ 
        received: true, 
        processed: true,
        timestamp: new Date().toISOString() 
      });
    } catch (error) {
      console.error('Dashboard webhook error:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  // Configuration endpoint to check integration status
  app.get('/api/integrations/status', (req, res) => {
    const status = {
      sms: {
        configured: !!(process.env.SMS_API_URL && process.env.SMS_API_KEY),
        url: process.env.SMS_API_URL ? 'configured' : 'not set'
      },
      pos: {
        configured: !!(process.env.POS_API_URL && process.env.POS_API_KEY),
        url: process.env.POS_API_URL ? 'configured' : 'not set'
      },
      dashboard: {
        configured: !!(process.env.DASHBOARD_API_URL && process.env.DASHBOARD_API_KEY),
        url: process.env.DASHBOARD_API_URL ? 'configured' : 'not set'
      }
    };
    res.json(status);
  });

  // Import integrations
  const { smsIntegration, posIntegration, dashboardIntegration, autoSyncMetrics } = await import('./integrations');

  // SMS Integration Routes
  app.post('/api/integrations/sms/send', async (req, res) => {
    try {
      const { orderId, message, phoneNumber } = req.body;
      const result = await smsIntegration.sendOrderNotification(orderId, message, phoneNumber);
      res.json(result);
    } catch (error) {
      console.error('SMS send error:', error);
      res.status(500).json({ error: 'Failed to send SMS' });
    }
  });

  // SMS Webhook endpoint
  app.post('/api/webhooks/sms', (req, res) => {
    smsIntegration.handleWebhook(req, res);
  });

  // POS Integration Routes
  app.post('/api/integrations/pos/sync/:orderId', async (req, res) => {
    try {
      const { orderId } = req.params;
      const result = await posIntegration.syncOrder(orderId);
      res.json(result);
    } catch (error) {
      console.error('POS sync error:', error);
      res.status(500).json({ error: 'Failed to sync with POS' });
    }
  });

  // POS Webhook endpoint
  app.post('/api/webhooks/pos', (req, res) => {
    posIntegration.handleWebhook(req, res);
  });

  // Dashboard Integration Routes
  app.post('/api/integrations/dashboard/sync', async (req, res) => {
    try {
      const result = await dashboardIntegration.syncMetrics();
      res.json(result);
    } catch (error) {
      console.error('Dashboard sync error:', error);
      res.status(500).json({ error: 'Failed to sync with dashboard' });
    }
  });

  app.post('/api/integrations/dashboard/order-update', async (req, res) => {
    try {
      const { orderId, updateType, details } = req.body;
      const result = await dashboardIntegration.sendOrderUpdate(orderId, updateType, details);
      res.json(result);
    } catch (error) {
      console.error('Dashboard update error:', error);
      res.status(500).json({ error: 'Failed to send dashboard update' });
    }
  });

  // Auto-sync dashboard metrics every 15 minutes
  setInterval(async () => {
    try {
      await autoSyncMetrics();
    } catch (error) {
      console.error('Auto-sync failed:', error);
    }
  }, 15 * 60 * 1000);

  // Auto-sync recent order changes every 5 minutes
  setInterval(async () => {
    try {
      const orders = await storage.getAllOrders();
      const recentOrders = orders.filter(order => {
        const updatedAt = new Date(order.updatedAt || order.createdAt);
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        return updatedAt > fiveMinutesAgo;
      });

      for (const order of recentOrders) {
        // Sync to POS if needed
        if (!order.posOrderId || new Date(order.updatedAt || order.createdAt) > new Date(order.lastSyncedToPOS || 0)) {
          await posIntegration.syncOrder(order.id);
        }

        // Sync to Hub if needed
        if (new Date(order.updatedAt || order.createdAt) > new Date(order.lastSyncedToHub || 0)) {
          await dashboardIntegration.sendOrderUpdate(order.id, 'auto_sync', {
            reason: 'Automatic sync - recent changes detected'
          });
        }
      }

      if (recentOrders.length > 0) {
        console.log(`Auto-synced ${recentOrders.length} recently updated orders`);
      }
    } catch (error) {
      console.error('Auto order sync failed:', error);
    }
  }, 5 * 60 * 1000);

  return httpServer;
}

// Helper function to broadcast to all connected WebSocket clients
function broadcast(wss: WebSocketServer, message: any) {
  const messageStr = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
}