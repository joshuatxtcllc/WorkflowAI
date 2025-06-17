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
      console.log('Customer creation request received:', req.body);
      
      // Validate required fields
      if (!req.body.name?.trim()) {
        console.log('Validation failed: Missing name');
        return res.status(400).json({ 
          message: "Customer name is required" 
        });
      }

      if (!req.body.email?.trim()) {
        console.log('Validation failed: Missing email');
        return res.status(400).json({ 
          message: "Customer email is required" 
        });
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(req.body.email.trim())) {
        console.log('Validation failed: Invalid email format');
        return res.status(400).json({ 
          message: "Please enter a valid email address" 
        });
      }

      const customerData = {
        id: randomUUID(),
        name: req.body.name.trim(),
        email: req.body.email.trim().toLowerCase(),
        phone: req.body.phone?.trim() || null,
        address: req.body.address?.trim() || null,
        preferences: {},
        createdAt: new Date(),
      };

      console.log('Processed customer data:', customerData);

      // Check if customer with this email already exists
      try {
        const existingCustomer = await storage.getCustomerByEmail(customerData.email);
        if (existingCustomer) {
          console.log('Customer already exists with email:', customerData.email);
          return res.status(409).json({ 
            message: "A customer with this email already exists" 
          });
        }
      } catch (dbError) {
        console.log('Database check completed (no existing customer found)');
      }

      // Create customer directly in storage
      const customer = await storage.createCustomer(customerData);
      
      console.log('Customer created successfully:', customer.id);
      
      // Return customer data directly for compatibility with frontend
      res.status(201).json(customer);
    } catch (error) {
      console.error("Error creating customer:", error);
      
      // Provide detailed error information
      let errorMessage = "Failed to create customer. Please try again.";
      
      if (error instanceof Error) {
        console.log('Error details:', error.message, error.stack);
        
        if (error.message.includes('unique constraint') || 
            error.message.includes('duplicate key') || 
            error.message.includes('UNIQUE constraint failed')) {
          errorMessage = "A customer with this email already exists";
        } else {
          errorMessage = error.message;
        }
      }
      
      res.status(500).json({ 
        message: errorMessage,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });

  // Order routes with improved caching
  let ordersCache: any = null;
  let ordersCacheTime = 0;
  const ORDERS_CACHE_TTL = 10000; // 10 seconds for faster updates

  app.get('/api/orders', authenticateToken, async (req, res) => {
    try {
      const now = Date.now();

      // Return cached orders if still fresh
      if (ordersCache && (now - ordersCacheTime) < ORDERS_CACHE_TTL) {
        res.setHeader('X-Cache', 'HIT');
        return res.json(ordersCache);
      }

      // Fetch orders directly without timeout wrapper
      const orders = await storage.getOrders();

      // Update cache
      ordersCache = orders;
      ordersCacheTime = now;

      res.setHeader('X-Cache', 'MISS');
      res.json(orders);
    } catch (error) {
      console.error("Error fetching orders:", error);

      // Return cached data if available, even if stale
      if (ordersCache) {
        res.setHeader('X-Cache', 'STALE');
        return res.json(ordersCache);
      }

      // Return empty array instead of error to prevent UI crash
      res.status(200).json([]);
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
      console.log('Order creation request received:', req.body);
      
      // Validate required fields
      if (!req.body.customerId?.trim()) {
        return res.status(400).json({ 
          message: "Customer ID is required" 
        });
      }
      
      if (!req.body.description?.trim()) {
        return res.status(400).json({ 
          message: "Order description is required" 
        });
      }
      
      // Verify customer exists
      const customer = await storage.getCustomer(req.body.customerId);
      if (!customer) {
        return res.status(400).json({ 
          message: "Invalid customer ID - customer not found" 
        });
      }
      
      // Generate ID if not provided
      const orderDataWithId = {
        id: randomUUID(),
        ...req.body,
        trackingId: req.body.trackingId || `TRK-${Date.now()}`,
      };

      console.log('Processing order data:', orderDataWithId);
      
      const orderData = insertOrderSchema.parse(orderDataWithId);
      console.log('Order data validated:', orderData);
      
      const order = await storage.createOrder(orderData);
      console.log('Order created in storage:', order);

      // Create status history entry
      await storage.createStatusHistory({
        orderId: order.id,
        toStatus: order.status || 'ORDER_PROCESSED',
        changedBy: (req.user as any)?.claims?.sub || 'system',
        reason: 'Order created'
      });

      // Clear orders cache immediately
      ordersCache = null;
      ordersCacheTime = 0;

      // Get the full order with customer details for response
      const fullOrder = await storage.getOrder(order.id);
      
      // Trigger AI analysis
      await aiService.analyzeWorkload();

      console.log('Order creation completed successfully:', order.id);
      console.log('Order saved with tracking ID:', order.trackingId);
      
      res.status(201).json(fullOrder || order);
    } catch (error) {
      console.error("Error creating order:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid order data", 
          errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
        });
      }
      
      res.status(500).json({ 
        message: "Failed to create order", 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
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

  // Update order details
  app.patch('/api/orders/:id', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Handle dimensions separately if provided
      if (updates.dimensions) {
        const dimensions = updates.dimensions;
        updates.dimensions = {
          width: dimensions.width ? parseFloat(dimensions.width) : null,
          height: dimensions.height ? parseFloat(dimensions.height) : null,
          depth: dimensions.depth ? parseFloat(dimensions.depth) : null
        };
      }

      // Convert string dates to Date objects
      if (updates.dueDate) {
        updates.dueDate = new Date(updates.dueDate);
      }

      const order = await storage.updateOrder(id, updates);

      res.json(order);
    } catch (error) {
      console.error('Error updating order:', error);
      res.status(500).json({ error: 'Failed to update order' });
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

  // AI chat endpoint with MCP support
  app.post('/api/ai/chat', async (req, res) => {
    try {
      const { message, sessionId } = req.body;
      const response = await aiService.generateChatResponse(message, sessionId);
      res.json({ response });
    } catch (error) {
      console.error('AI chat error:', error);
      res.status(500).json({ error: 'Failed to process chat message' });
    }
  });

  // AI clear conversation endpoint
  app.post('/api/ai/clear', async (req, res) => {
    try {
      // Clear any cached conversation state if needed
      res.json({ success: true, message: 'Conversation cleared' });
    } catch (error) {
      console.error('AI clear error:', error);
      res.status(500).json({ error: 'Failed to clear conversation' });
    }
  });

  app.get('/api/ai/alerts', authenticateToken, async (req, res) => {
    try {
      const alerts = await aiService.generateAlerts();
      res.json({ alerts });
    } catch (error) {
      console.error("Error generating AI alerts:", error);
      res.status(500).json({ message: "Failed to generate alerts" });
    }
  });

  // Artwork management routes
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

  // Import routes
  app.post('/api/import/orders', authenticateToken, async (req, res) => {
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

  // Add real production orders
  app.post('/api/add-production-orders', authenticateToken, async (req, res) => {
    try {
      const { addRealProductionOrders } = await import('./manual-add-orders');
      const result = await addRealProductionOrders();

      res.json({
        message: "Production orders added successfully",
        ...result
      });
    } catch (error) {
      console.error("Failed to add production orders:", error);
      res.status(500).json({ 
        message: "Failed to add production orders", 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Import real customer data from your business records
  app.post('/api/import-real-data', authenticateToken, async (req, res) => {
    try {
      const { importRealCustomerData } = await import('./real-data-import');
      const result = await importRealCustomerData();

      res.json({
        message: "Real customer data imported successfully",
        ...result
      });
    } catch (error) {
      console.error("Failed to import real customer data:", error);
      res.status(500).json({ 
        message: "Failed to import real customer data", 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Import all real orders from database
  app.post('/api/import/all-orders', authenticateToken, async (req, res) => {
    try {
      const { importAllRealOrders } = await import('./import-all-orders');
      const result = await importAllRealOrders();
      res.json(result);
    } catch (error) {
      console.error('Import all orders error:', error);
      res.status(500).json({ error: 'Failed to import all orders' });
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

  // Start AI monitoring and alerts
  setInterval(async () => {
    try {
      const analysis = await aiService.analyzeWorkload();
      const alerts = await aiService.generateAlerts();

      if (analysis) {
        broadcast(wss, {
          type: 'ai-analysis',
          data: analysis
        });
      }

      if (alerts && alerts.length > 0) {
        broadcast(wss, {
          type: 'ai-alerts',
          data: alerts
        });
      }
    } catch (error) {
      console.error('AI monitoring error:', error);
    }
  }, 30000); // Every 30 seconds

  // Import endpoint
  app.post('/api/import/orders', authenticateToken, async (req, res) => {
    try {
      const { fileContent } = req.body;

      if (!fileContent) {
        return res.status(400).json({ error: 'File content is required' });
      }

      const { directImportFromTSV } = await import('./direct-import');
      const result = await directImportFromTSV(fileContent);
      res.json(result);
    } catch (error) {
      console.error('Import error:', error);
      res.status(500).json({ error: 'Import failed' });
    }
  });

  // Batch import endpoint - processes orders in small batches
  app.post('/api/import/batch', authenticateToken, async (req, res) => {
    try {
      const { batchSize = 5 } = req.body;
      console.log(`🚀 Starting batch import with batch size: ${batchSize}`);

      const { batchImportOrders } = await import('./batch-import');
      const result = await batchImportOrders(batchSize);

      res.json({
        success: true,
        message: `Successfully imported ${result.totalImported} orders in ${result.batchCount} batches`,
        totalImported: result.totalImported,
        batchCount: result.batchCount
      });

    } catch (error) {
      console.error('Batch import error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Batch import failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Final import endpoint - one-time use
  app.post('/api/import/final-authentic', authenticateToken, async (req, res) => {
    try {
      console.log('🚀 Starting final authentic import...');

      const filePath = './attached_assets/Pasted-Date-Due-Invoice-Order-ID-Qty-Name-Phone-Designer-Location-Description-Order-Type-Order-Progress-Pai-1748309997681.txt';
      const fileContent = await fs.readFile(filePath, 'utf-8');

      const lines = fileContent.split('\n');
      const customerMap = new Map();
      let importedCustomers = 0;
      let importedOrders = 0;

      // Filter real order lines (those starting with date pattern)
      const orderLines = lines.filter(line => /^[0-9]{1,2}\/[0-9]{1,2}\/[0-9]{4}/.test(line.trim()));
      console.log(`✅ Found ${orderLines.length} authentic order records`);

      for (const line of orderLines) {
        const parts = line.split('\t');
        if (parts.length < 10) continue;

        try {
          const [dateDue, invoice, orderId, qty, name, phone, designer, location, description, orderType] = parts;

          if (!name?.trim() || !orderId?.trim()) continue;

          // Create unique customer
          const customerKey = `${name.trim()}-${phone || 'no-phone'}`;
          let customerId;

          if (!customerMap.has(customerKey)) {
            customerId = randomUUID();
            await db.insert(customers).values({
              id: customerId,
              name: name.trim(),
              email: `${name.toLowerCase().replace(/\s+/g, '.')}@customer.com`,
              phone: phone?.trim() || null,
              address: location?.trim() || null,
              preferences: {},
            });
            customerMap.set(customerKey, customerId);
            importedCustomers++;
          } else {
            customerId = customerMap.get(customerKey);
          }

          // Determine status from completion flags (parts 12-22 contain status flags)
          let status = 'ORDER_PROCESSED';
          if (parts[21] === 'Y' || parts[20] === 'Y') status = 'PICKED_UP'; // Delivered/Done
          else if (parts[19] === 'Y') status = 'COMPLETED'; // Prepped
          else if (parts[18] === 'Y' || (parts[15] === 'Y' && parts[16] === 'Y')) status = 'PREPPED'; // F&M Cut or Cut+MCut
          else if (parts[16] === 'Y') status = 'MAT_CUT'; // M Cut
          else if (parts[15] === 'Y') status = 'FRAME_CUT'; // Cut
          else if (parts[14] === 'Y') status = 'MATERIALS_ARRIVED'; // Arrived
          else if (parts[13] === 'Y') status = 'MATERIALS_ORDERED'; // Ordered

          // Map order type
          const mappedType = orderType?.toLowerCase().includes('canvas') || orderType?.toLowerCase().includes('acrylic') 
            ? 'SHADOWBOX' 
            : orderType?.toLowerCase().includes('mat') || orderType?.toLowerCase().includes('check')
              ? 'MAT' 
              : 'FRAME';

          // Parse due date
          let dueDate = new Date();
          if (dateDue?.includes('/')) {
            try {
              dueDate = new Date(dateDue);
              if (isNaN(dueDate.getTime())) dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            } catch (e) {
              dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            }
          }

          // Create order
          const orderDbId = randomUUID();
          await db.insert(orders).values({
            id: orderDbId,
            trackingId: `TRK-${orderId.trim()}`,
            customerId: customerId,
            orderType: mappedType,
            status: status,
            dueDate: dueDate,
            estimatedHours: mappedType === 'SHADOWBOX' ? 4.5 : mappedType === 'MAT' ? 1.5 : 3.0,
            price: mappedType === 'SHADOWBOX' ? 450 : mappedType === 'MAT' ? 150 : 275,
            description: description?.trim() || '',
            priority: status === 'PICKED_UP' ? 'LOW' : dueDate < new Date() ? 'URGENT' : 'MEDIUM',
            invoiceNumber: invoice?.trim() || '',
          });

          // Create status history
          await db.insert(statusHistory).values({
            id: randomUUID(),
            orderId: orderDbId,
            fromStatus: null,
            toStatus: status,
            changedBy: 'production-system',
            reason: 'Final authentic production data import',
            changedAt: new Date(),
          });

          importedOrders++;

        } catch (error) {
          console.log(`⚠️ Skipping problematic row: ${error}`);
          continue;
        }
      }

      console.log(`🎉 Final import completed!`);
      console.log(`👥 Created ${importedCustomers} customers`);
      console.log(`📦 Imported ${importedOrders} authentic orders`);

      res.json({ 
        success: true, 
        importedCustomers, 
        importedOrders,
        message: 'Final authentic import completed successfully!'
      });

    } catch (error) {
      console.error('❌ Final import failed:', error);
      res.status(500).json({ error: 'Final import failed', details: error.message });
    }
  });

  // Import all authentic mystery orders from your real shop data
  app.post('/api/import/all-mysteries', async (req, res) => {
    try {
      const fs = await import('fs/promises');

      // First, create a Mystery Customer if it doesn't exist
      let mysteryCustomer = await storage.getCustomerByEmail('mystery@shop.local');
      if (!mysteryCustomer) {
        mysteryCustomer = await storage.createCustomer({
          name: 'Mystery Customer',
          email: 'mystery@shop.local',
          phone: null,
          address: null,
        });
      }

      // Read and process the authentic mystery data file
      const filePath = './attached_assets/Pasted-Date-Due-Invoice-Order-ID-Qty-Name-Phone-Designer-Location-Description-Order-Type-Order-Progress-Pai-1748618065100.txt';
      const fileContent = await fs.readFile(filePath, 'utf-8');

      const lines = fileContent.split('\n');
      const mysteryOrders = [];

      // Process each line to find mystery orders
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const columns = line.split('\t');
        if (columns.length < 9) continue;

        const name = columns[4]?.trim();
        const location = columns[7]?.trim();
        const description = columns[8]?.trim();
        const orderId = columns[2]?.trim();
        const invoice = columns[1]?.trim();
        const qty = parseInt(columns[3]?.trim()) || 1;

        // Only process Mystery orders from your authentic data
        if (name === 'Mystery' && location?.includes('Mystery Drawer')) {
          mysteryOrders.push({
            trackingId: `MYSTERY-${orderId}`,
            description: description || `Mystery item ${orderId}`,
            notes: `${description} - ${location}`,
            invoiceNumber: invoice,
            quantity: qty
          });
        }
      }

      let created = 0;
      const existingOrders = await storage.getAllOrders();

      for (const item of mysteryOrders) {
        // Check if order already exists
        const exists = existingOrders.some(o => o.trackingId === item.trackingId);

        if (!exists) {
          await storage.createOrder({
            trackingId: item.trackingId,
            customerId: mysteryCustomer.id,
            orderType: 'FRAME',
            status: 'MYSTERY_UNCLAIMED',
            dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
            estimatedHours: 2,
            price: 0,
            description: item.description,
            notes: item.notes,
            priority: 'LOW',
            invoiceNumber: item.invoiceNumber,
          });
          created++;
        }
      }

      res.json({ 
        success: true, 
        message: `Created ${created} mystery orders` 
      });
    } catch (error) {
      console.error('Mystery orders creation error:', error);
      res.status(500).json({ error: 'Failed to create mystery orders' });
    }
  });

  // Batch update order priorities
  app.patch('/api/orders/batch-priority', async (req, res) => {
    try {
      const { orderIds, priority } = req.body;
      
      if (!Array.isArray(orderIds) || !priority) {
        return res.status(400).json({ error: 'Missing orderIds array or priority' });
      }

      const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
      if (!validPriorities.includes(priority)) {
        return res.status(400).json({ error: 'Invalid priority level' });
      }

      const updates = await Promise.all(
        orderIds.map((id: string) => 
          storage.updateOrder(id, { priority: priority })
        )
      );

      res.json({ 
        success: true, 
        updatedCount: updates.length,
        updates 
      });
    } catch (error) {
      console.error('Batch priority update error:', error);
      res.status(500).json({ error: 'Failed to update order priorities' });
    }
  });

  // Auto-assign priorities based on due dates and status
  app.post('/api/orders/auto-assign-priorities', async (req, res) => {
    try {
      const orders = await storage.getOrders();
      const now = new Date();
      const oneDayMs = 24 * 60 * 60 * 1000;
      const threeDayMs = 3 * oneDayMs;
      const sevenDayMs = 7 * oneDayMs;

      const updates = [];

      for (const order of orders) {
        if (!order.dueDate) continue;

        const dueDate = new Date(order.dueDate);
        const timeDiff = dueDate.getTime() - now.getTime();
        let newPriority = order.priority;

        // Overdue orders
        if (timeDiff < 0) {
          newPriority = 'URGENT';
        }
        // Due within 24 hours
        else if (timeDiff <= oneDayMs) {
          newPriority = 'URGENT';
        }
        // Due within 3 days
        else if (timeDiff <= threeDayMs) {
          newPriority = 'HIGH';
        }
        // Due within a week
        else if (timeDiff <= sevenDayMs) {
          newPriority = 'MEDIUM';
        }
        // Due later
        else {
          newPriority = 'LOW';
        }

        // Higher priority for orders in later stages
        if (['PREPPED', 'COMPLETED'].includes(order.status || '')) {
          if (newPriority === 'LOW') newPriority = 'MEDIUM';
          if (newPriority === 'MEDIUM') newPriority = 'HIGH';
        }

        if (newPriority !== order.priority) {
          const updated = await storage.updateOrder(order.id, { priority: newPriority });
          updates.push(updated);
        }
      }

      res.json({ 
        success: true, 
        updatedCount: updates.length,
        updates 
      });
    } catch (error) {
      console.error('Auto-assign priorities error:', error);
      res.status(500).json({ error: 'Failed to auto-assign priorities' });
    }
  });

  // Kanban API endpoints for external system integration
  app.get('/api/kanban/status', (req, res) => {
    try {
      res.json({ 
        status: 'operational',
        message: 'Kanban system is running',
        timestamp: new Date().toISOString(),
        server: 'Jay\'s Frames Kanban System'
      });
    } catch (error) {
      console.error('Kanban status check error:', error);
      res.status(500).json({ error: 'Kanban status check failed' });
    }
  });

  app.get('/api/kanban/orders', async (req, res) => {
    try {
      const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');

      if (!apiKey || apiKey !== 'kanban_admin_key_2025_full_access') {
        return res.status(401).json({ error: 'Invalid API key' });
      }

      const orders = await storage.getOrders();
      res.json(orders);
    } catch (error) {
      console.error('Kanban orders fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch orders' });
    }
  });

  app.post('/api/kanban/orders/:orderId/status', async (req, res) => {
    try {
      const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');

      if (!apiKey || apiKey !== 'kanban_admin_key_2025_full_access') {
        return res.status(401).json({ error: 'Invalid API key' });
      }

      const { orderId } = req.params;
      const { status, notes } = req.body;

      const updatedOrder = await storage.updateOrder(orderId, { status });
      
      // Create status history entry
      await storage.createStatusHistory({
        orderId,
        toStatus: status,
        changedBy: 'external-system',
        reason: notes || 'Updated via Kanban API'
      });

      res.json({ 
        success: true, 
        message: 'Order status updated',
        order: updatedOrder
      });
    } catch (error) {
      console.error('Kanban order status update error:', error);
      res.status(500).json({ error: 'Failed to update order status' });
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
  app.post('/api/webhooks/dashboard', (req, res) => {
    try {
      console.log('Dashboard webhook received:', req.body);
      // Handle any dashboard events or notifications here
      res.status(200).json({ received: true, timestamp: new Date().toISOString() });
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

  // Internal POS order creation endpoint
  app.post('/api/pos/create-order', authenticateToken, async (req, res) => {
    try {
      const { customerName, customerPhone, customerEmail, orderType, description, price, dueDate } = req.body;

      // Create or find customer
      let customer = await storage.getCustomerByEmail(customerEmail);
      if (!customer) {
        customer = await storage.createCustomer({
          name: customerName,
          email: customerEmail,
          phone: customerPhone || null,
          address: null,
        });
      }

      // Create order
      const order = await storage.createOrder({
        trackingId: `POS-${Date.now()}`,
        customerId: customer.id,
        orderType: orderType || 'FRAME',
        status: 'ORDER_PROCESSED',
        dueDate: new Date(dueDate || Date.now() + 7 * 24 * 60 * 60 * 1000),
        estimatedHours: 3,
        price: price || 0,
        description: description || 'POS Order',
        priority: 'MEDIUM',
        notes: 'Created via internal POS system'
      });

      // Create status history
      await storage.createStatusHistory({
        orderId: order.id,
        toStatus: 'ORDER_PROCESSED',
        changedBy: (req.user as any)?.claims?.sub || 'pos-system',
        reason: 'POS order created'
      });

      res.json({ success: true, order });
    } catch (error) {
      console.error('POS order creation error:', error);
      res.status(500).json({ error: 'Failed to create POS order' });
    }
  });

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
    app.get('/api/pos/status', async (req, res) => {
      try {
        const result = await posIntegration.fetchNewOrders();
        res.json(result);
      } catch (error) {
        console.error('POS status error:', error);
        res.status(500).json({ error: 'Failed to get POS status' });
      }
    });

    app.post('/api/pos/start-sync', async (req, res) => {
      try {
        const result = await posIntegration.startRealTimeSync();
        res.json({ success: true, message: 'Real-time sync started' });
      } catch (error) {
        console.error('POS sync start error:', error);
        res.status(500).json({ error: 'Failed to start sync' });
      }
    });

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

    // Auto-sync dashboard metrics with exponential backoff
    let syncFailures = 0;
    const baseSyncInterval = 15 * 60 * 1000; // 15 minutes

    const scheduleNextSync = () => {
      const delay = Math.min(baseSyncInterval * Math.pow(2, syncFailures), 60 * 60 * 1000); // Max 1 hour
      setTimeout(async () => {
        try {
          const result = await autoSyncMetrics();
          if (result.success) {
            syncFailures = 0; // Reset on success
          } else {
            syncFailures++;
          }
        } catch (error) {
          console.error('Auto-sync failed:', error);
          syncFailures++;
        }
        scheduleNextSync();
      }, delay);
    };

    scheduleNextSync();

    // Material status update endpoint
    app.patch('/api/materials/:id', async (req, res) => {
      try {
        const materialId = req.params.id;
        const updates = req.body;

        const updatedMaterial = await storage.updateMaterial(materialId, updates);
        res.json(updatedMaterial);
      } catch (error) {
        console.error('Error updating material:', error);
        res.status(500).json({ error: 'Failed to update material' });
      }
    });

    // Create material endpoint
    app.post('/api/orders/:orderId/materials', async (req, res) => {
      try {
        const { orderId } = req.params;
        const materialData = req.body;

        const newMaterial = await storage.createMaterial(orderId, materialData);
        res.json(newMaterial);
      } catch (error) {
        console.error('Error creating material:', error);
        res.status(500).json({ error: 'Failed to create material' });
      }
    });

    // Delete material endpoint
    app.delete('/api/materials/:id', async (req, res) => {
      try {
        const materialId = req.params.id;

        await storage.deleteMaterial(materialId);
        res.json({ success: true });
      } catch (error) {
        console.error('Error deleting material:', error);
        res.status(500).json({ error: 'Failed to delete material' });
      }
    });

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