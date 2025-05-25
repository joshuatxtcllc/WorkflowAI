import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { AIService } from "./services/aiService";
import { NotificationService } from "./services/notificationService";
import { insertOrderSchema, insertCustomerSchema, insertMaterialSchema } from "@shared/schema";
import { z } from "zod";

interface WebSocketMessage {
  type: string;
  data: any;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Initialize services
  const aiService = new AIService();
  const notificationService = new NotificationService();

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Customer routes
  app.get('/api/customers', isAuthenticated, async (req, res) => {
    try {
      const customers = await storage.getCustomers();
      res.json(customers);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ message: "Failed to fetch customers" });
    }
  });

  app.post('/api/customers', isAuthenticated, async (req, res) => {
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
  app.get('/api/orders', isAuthenticated, async (req, res) => {
    try {
      const orders = await storage.getOrders();
      res.json(orders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.get('/api/orders/:id', isAuthenticated, async (req, res) => {
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

  app.post('/api/orders', isAuthenticated, async (req, res) => {
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

  app.patch('/api/orders/:id/status', isAuthenticated, async (req, res) => {
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
  app.get('/api/orders/:orderId/materials', isAuthenticated, async (req, res) => {
    try {
      const materials = await storage.getMaterialsByOrder(req.params.orderId);
      res.json(materials);
    } catch (error) {
      console.error("Error fetching materials:", error);
      res.status(500).json({ message: "Failed to fetch materials" });
    }
  });

  app.post('/api/orders/:orderId/materials', isAuthenticated, async (req, res) => {
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

  app.patch('/api/materials/:id', isAuthenticated, async (req, res) => {
    try {
      const material = await storage.updateMaterial(req.params.id, req.body);
      res.json(material);
    } catch (error) {
      console.error("Error updating material:", error);
      res.status(500).json({ message: "Failed to update material" });
    }
  });

  // AI routes
  app.get('/api/ai/analysis', isAuthenticated, async (req, res) => {
    try {
      const analysis = await aiService.generateWorkloadAnalysis();
      res.json(analysis);
    } catch (error) {
      console.error("Error generating AI analysis:", error);
      res.status(500).json({ message: "Failed to generate analysis" });
    }
  });

  app.post('/api/ai/chat', isAuthenticated, async (req, res) => {
    try {
      const { message } = req.body;
      const response = await aiService.generateChatResponse(message);
      res.json({ response });
    } catch (error) {
      console.error("Error generating AI response:", error);
      res.status(500).json({ message: "Failed to generate response" });
    }
  });

  // Import routes
  app.post('/api/import/orders', isAuthenticated, async (req, res) => {
    try {
      const { fileContent } = req.body;
      if (!fileContent) {
        return res.status(400).json({ message: "File content is required" });
      }

      const { directImportFromTSV } = await import('./direct-import');
      const result = await directImportFromTSV(fileContent);
      
      res.json({
        message: "Import completed successfully",
        ...result
      });
    } catch (error) {
      console.error("Import error:", error);
      res.status(500).json({ 
        message: "Import failed", 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Analytics routes
  app.get('/api/analytics/workload', isAuthenticated, async (req, res) => {
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
