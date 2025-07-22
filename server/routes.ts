import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertOrderSchema, 
  insertCustomerSchema, 
  insertMaterialSchema,
  insertNotificationSchema,
  insertInvoiceSchema,
  type Order,
  type Customer,
  type OrderWithDetails,
  type WorkloadAnalysis,
  type Invoice 
} from "@shared/schema";
import { randomUUID } from "crypto";
import { smsIntegration, posIntegration, dashboardIntegration } from "./integrations";
import { framersAssistantIntegration } from "./integrations/framersAssistant";
import { AIService } from "./services/aiService";
import { NotificationService } from "./services/notificationService";
import { TwilioVoiceService } from './services/twilioVoiceService';
import multer from 'multer';
import { artworkManager } from './artwork-manager';
import Stripe from 'stripe';
import express from "express";
import { analyticsEngine } from "./analytics-engine";
// import { apiServices } from "./api-services";
// import { replitAuth } from "./replitAuth";
import { logger } from "./logger";
import { circuitBreakers } from "./circuit-breaker";
import { setupAuth } from "./auth";
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Initialize Stripe with better error handling
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET || '';
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_ENDPOINT_SECRET || '';

console.log('🔄 Initializing Stripe configuration...');
console.log('- Secret key configured:', stripeSecretKey ? `✅ Yes (${stripeSecretKey.length} chars)` : '❌ No');
console.log('- Webhook secret configured:', stripeWebhookSecret ? `✅ Yes (${stripeWebhookSecret.length} chars)` : '❌ No');

let stripe = null;
if (stripeSecretKey) {
  try {
    stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-06-30.basil',
    });
    console.log('✅ Stripe initialized successfully');
  } catch (error) {
    console.error('❌ Stripe initialization failed:', error instanceof Error ? error.message : 'Unknown error');
  }
} else {
  console.warn('⚠️  Stripe not initialized - missing STRIPE_SECRET_KEY environment variable');
  console.log('💡 Add your Stripe secret key to Secrets as STRIPE_SECRET_KEY');
}

// Initialize AI Service
const aiService = new AIService();

export async function registerRoutes(app: Express): Promise<Server> {
  const router = express.Router();
  
  // Setup authentication routes
  await setupAuth(app);

  // Orders routes
  app.get("/api/orders", async (req, res) => {
    try {
      logger.info("Fetching orders");
      const orders = await storage.getOrders();
      res.json(orders);
    } catch (error) {
      logger.error("Error fetching orders:", error);
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  app.get("/api/orders/:id", async (req, res) => {
    try {
      const order = await storage.getOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      res.json(order);
    } catch (error) {
      logger.error("Error fetching order:", error);
      res.status(500).json({ error: "Failed to fetch order" });
    }
  });

  app.post("/api/orders", async (req, res) => {
    try {
      console.log("Creating order:", req.body);
      const validatedData = insertOrderSchema.parse(req.body);
      const order = await storage.createOrder(validatedData);
      res.json(order);
    } catch (error) {
      logger.error("Error creating order:", error);
      res.status(500).json({ error: "Failed to create order" });
    }
  });

  app.put("/api/orders/:id", async (req, res) => {
    try {
      const order = await storage.updateOrder(req.params.id, req.body);
      res.json(order);
    } catch (error) {
      logger.error("Error updating order:", error);
      res.status(500).json({ error: "Failed to update order" });
    }
  });

  // Customers routes
  app.get("/api/customers", async (req, res) => {
    try {
      const customers = await storage.getCustomers();
      res.json(customers);
    } catch (error) {
      logger.error("Error fetching customers:", error);
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  });

  app.post("/api/customers", async (req, res) => {
    try {
      const customer = await storage.createCustomer(req.body);
      res.json(customer);
    } catch (error) {
      logger.error("Error creating customer:", error);
      res.status(500).json({ error: "Failed to create customer" });
    }
  });

  // Invoices routes
  app.get("/api/invoices", async (req, res) => {
    try {
      const invoices = await storage.getInvoices();
      res.json(invoices);
    } catch (error) {
      logger.error("Error fetching invoices:", error);
      res.status(500).json({ error: "Failed to fetch invoices" });
    }
  });

  app.post("/api/invoices", async (req, res) => {
    try {
      const validatedData = insertInvoiceSchema.parse(req.body);
      const invoice = await storage.createInvoice(validatedData);
      res.json(invoice);
    } catch (error) {
      logger.error("Error creating invoice:", error);
      res.status(500).json({ error: "Failed to create invoice" });
    }
  });

    // Analytics routes - simplified
  app.get("/api/analytics/comprehensive", async (req, res) => {
    try {
      const metrics = await analyticsEngine.generateComprehensiveMetrics();
      res.json(metrics);
    } catch (error) {
      logger.error("Analytics error:", error);
      res.status(500).json({ error: "Failed to generate analytics" });
    }
  });

    // Keep essential AI analysis with circuit breaker
  app.get("/api/ai/analysis", async (req, res) => {
    try {
      const analysis = await circuitBreakers.openai.execute(async () => {
        return await aiService.generateWorkloadAnalysis();
      });
      res.json(analysis);
    } catch (error) {
      logger.warn("AI analysis unavailable:", error);
      res.json({
        totalOrders: 0,
        totalHours: 0,
        averageComplexity: 5,
        onTimePercentage: 100,
        statusCounts: {},
        aiInsights: "AI analysis temporarily unavailable",
        recommendations: ["System operating normally"],
        timestamp: new Date().toISOString()
      });
    }
  });
  
    // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "healthy", timestamp: new Date().toISOString() });
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
  
  // Create HTTP server
  const httpServer = createServer(app);

  return httpServer;
}