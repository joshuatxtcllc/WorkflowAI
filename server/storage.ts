import {
  users,
  customers,
  orders,
  materials,
  statusHistory,
  timeEntries,
  notifications,
  aiAnalysis,
  type User,
  type UpsertUser,
  type Customer,
  type InsertCustomer,
  type Order,
  type InsertOrder,
  type OrderWithDetails,
  type Material,
  type InsertMaterial,
  type StatusHistory,
  type TimeEntry,
  type Notification,
  type InsertNotification,
  type AIAnalysis,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, gte, lte } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Customer operations
  getCustomers(): Promise<Customer[]>;
  getCustomer(id: string): Promise<Customer | undefined>;
  getCustomerByEmail(email: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer>;
  
  // Order operations
  getOrders(): Promise<OrderWithDetails[]>;
  getOrder(id: string): Promise<OrderWithDetails | undefined>;
  getOrderByTrackingId(trackingId: string): Promise<OrderWithDetails | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: string, order: Partial<InsertOrder>): Promise<Order>;
  getOrdersByStatus(status: string): Promise<OrderWithDetails[]>;
  getOrdersByCustomer(customerId: string): Promise<OrderWithDetails[]>;
  
  // Material operations
  getMaterialsByOrder(orderId: string): Promise<Material[]>;
  createMaterial(material: InsertMaterial): Promise<Material>;
  updateMaterial(id: string, material: Partial<InsertMaterial>): Promise<Material>;
  
  // Status history operations
  createStatusHistory(data: {
    orderId: string;
    fromStatus?: string;
    toStatus: string;
    changedBy: string;
    reason?: string;
  }): Promise<StatusHistory>;
  
  // Time entry operations
  createTimeEntry(data: {
    orderId: string;
    userId: string;
    duration: number;
    task: string;
    notes?: string;
    startTime: Date;
    endTime: Date;
  }): Promise<TimeEntry>;
  
  // Notification operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  updateNotification(id: string, data: Partial<Notification>): Promise<Notification>;
  getPendingNotifications(): Promise<Notification[]>;
  
  // AI Analysis operations
  saveAIAnalysis(data: { metrics: any; alerts: any }): Promise<AIAnalysis>;
  getLatestAIAnalysis(): Promise<AIAnalysis | undefined>;
  
  // Analytics operations
  getWorkloadMetrics(): Promise<{
    totalOrders: number;
    totalHours: number;
    averageComplexity: number;
    onTimePercentage: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Customer operations
  async getCustomers(): Promise<Customer[]> {
    return await db.select().from(customers).orderBy(desc(customers.createdAt));
  }

  async getCustomer(id: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer;
  }

  async getCustomerByEmail(email: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.email, email));
    return customer;
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const id = `cust_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const [newCustomer] = await db
      .insert(customers)
      .values({ ...customer, id })
      .returning();
    return newCustomer;
  }

  async updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer> {
    const [updatedCustomer] = await db
      .update(customers)
      .set({ ...customer, updatedAt: new Date() })
      .where(eq(customers.id, id))
      .returning();
    return updatedCustomer;
  }

  // Order operations
  async getOrders(): Promise<OrderWithDetails[]> {
    const ordersData = await db
      .select()
      .from(orders)
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .leftJoin(users, eq(orders.assignedToId, users.id))
      .orderBy(desc(orders.createdAt));

    const ordersWithDetails: OrderWithDetails[] = [];

    for (const row of ordersData) {
      const order = row.orders;
      const customer = row.customers!;
      const assignedTo = row.users || undefined;

      const [orderMaterials, orderStatusHistory] = await Promise.all([
        this.getMaterialsByOrder(order.id),
        db.select().from(statusHistory).where(eq(statusHistory.orderId, order.id)).orderBy(desc(statusHistory.createdAt))
      ]);

      ordersWithDetails.push({
        ...order,
        customer,
        assignedTo,
        materials: orderMaterials,
        statusHistory: orderStatusHistory,
      });
    }

    return ordersWithDetails;
  }

  async getOrder(id: string): Promise<OrderWithDetails | undefined> {
    const [orderData] = await db
      .select()
      .from(orders)
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .leftJoin(users, eq(orders.assignedToId, users.id))
      .where(eq(orders.id, id));

    if (!orderData) return undefined;

    const order = orderData.orders;
    const customer = orderData.customers!;
    const assignedTo = orderData.users || undefined;

    const [orderMaterials, orderStatusHistory] = await Promise.all([
      this.getMaterialsByOrder(order.id),
      db.select().from(statusHistory).where(eq(statusHistory.orderId, order.id)).orderBy(desc(statusHistory.createdAt))
    ]);

    return {
      ...order,
      customer,
      assignedTo,
      materials: orderMaterials,
      statusHistory: orderStatusHistory,
    };
  }

  async getOrderByTrackingId(trackingId: string): Promise<OrderWithDetails | undefined> {
    const [orderData] = await db
      .select()
      .from(orders)
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .leftJoin(users, eq(orders.assignedToId, users.id))
      .where(eq(orders.trackingId, trackingId));

    if (!orderData) return undefined;

    const order = orderData.orders;
    const customer = orderData.customers!;
    const assignedTo = orderData.users || undefined;

    const [orderMaterials, orderStatusHistory] = await Promise.all([
      this.getMaterialsByOrder(order.id),
      db.select().from(statusHistory).where(eq(statusHistory.orderId, order.id)).orderBy(desc(statusHistory.createdAt))
    ]);

    return {
      ...order,
      customer,
      assignedTo,
      materials: orderMaterials,
      statusHistory: orderStatusHistory,
    };
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const id = `ord_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const trackingId = `JF${new Date().getFullYear()}${String(Date.now()).slice(-6)}`;
    
    const [newOrder] = await db
      .insert(orders)
      .values({ ...order, id, trackingId })
      .returning();
    return newOrder;
  }

  async updateOrder(id: string, order: Partial<InsertOrder>): Promise<Order> {
    const [updatedOrder] = await db
      .update(orders)
      .set({ ...order, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    return updatedOrder;
  }

  async getOrdersByStatus(status: string): Promise<OrderWithDetails[]> {
    const ordersData = await db
      .select()
      .from(orders)
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .leftJoin(users, eq(orders.assignedToId, users.id))
      .where(eq(orders.status, status))
      .orderBy(desc(orders.createdAt));

    const ordersWithDetails: OrderWithDetails[] = [];

    for (const row of ordersData) {
      const order = row.orders;
      const customer = row.customers!;
      const assignedTo = row.users || undefined;

      const [orderMaterials, orderStatusHistory] = await Promise.all([
        this.getMaterialsByOrder(order.id),
        db.select().from(statusHistory).where(eq(statusHistory.orderId, order.id)).orderBy(desc(statusHistory.createdAt))
      ]);

      ordersWithDetails.push({
        ...order,
        customer,
        assignedTo,
        materials: orderMaterials,
        statusHistory: orderStatusHistory,
      });
    }

    return ordersWithDetails;
  }

  async getOrdersByCustomer(customerId: string): Promise<OrderWithDetails[]> {
    const ordersData = await db
      .select()
      .from(orders)
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .leftJoin(users, eq(orders.assignedToId, users.id))
      .where(eq(orders.customerId, customerId))
      .orderBy(desc(orders.createdAt));

    const ordersWithDetails: OrderWithDetails[] = [];

    for (const row of ordersData) {
      const order = row.orders;
      const customer = row.customers!;
      const assignedTo = row.users || undefined;

      const [orderMaterials, orderStatusHistory] = await Promise.all([
        this.getMaterialsByOrder(order.id),
        db.select().from(statusHistory).where(eq(statusHistory.orderId, order.id)).orderBy(desc(statusHistory.createdAt))
      ]);

      ordersWithDetails.push({
        ...order,
        customer,
        assignedTo,
        materials: orderMaterials,
        statusHistory: orderStatusHistory,
      });
    }

    return ordersWithDetails;
  }

  // Material operations
  async getMaterialsByOrder(orderId: string): Promise<Material[]> {
    return await db.select().from(materials).where(eq(materials.orderId, orderId));
  }

  async createMaterial(material: InsertMaterial): Promise<Material> {
    const id = `mat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const [newMaterial] = await db
      .insert(materials)
      .values({ ...material, id })
      .returning();
    return newMaterial;
  }

  async updateMaterial(id: string, material: Partial<InsertMaterial>): Promise<Material> {
    const [updatedMaterial] = await db
      .update(materials)
      .set({ ...material, updatedAt: new Date() })
      .where(eq(materials.id, id))
      .returning();
    return updatedMaterial;
  }

  // Status history operations
  async createStatusHistory(data: {
    orderId: string;
    fromStatus?: string;
    toStatus: string;
    changedBy: string;
    reason?: string;
  }): Promise<StatusHistory> {
    const id = `sh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const [statusHistoryEntry] = await db
      .insert(statusHistory)
      .values({ ...data, id })
      .returning();
    return statusHistoryEntry;
  }

  // Time entry operations
  async createTimeEntry(data: {
    orderId: string;
    userId: string;
    duration: number;
    task: string;
    notes?: string;
    startTime: Date;
    endTime: Date;
  }): Promise<TimeEntry> {
    const id = `te_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const [timeEntry] = await db
      .insert(timeEntries)
      .values({ ...data, id })
      .returning();
    return timeEntry;
  }

  // Notification operations
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const id = `not_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const [newNotification] = await db
      .insert(notifications)
      .values({ ...notification, id })
      .returning();
    return newNotification;
  }

  async updateNotification(id: string, data: Partial<Notification>): Promise<Notification> {
    const [updatedNotification] = await db
      .update(notifications)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(notifications.id, id))
      .returning();
    return updatedNotification;
  }

  async getPendingNotifications(): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.status, "PENDING"))
      .orderBy(desc(notifications.createdAt));
  }

  // AI Analysis operations
  async saveAIAnalysis(data: { metrics: any; alerts: any }): Promise<AIAnalysis> {
    const id = `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const [analysis] = await db
      .insert(aiAnalysis)
      .values({ ...data, id })
      .returning();
    return analysis;
  }

  async getLatestAIAnalysis(): Promise<AIAnalysis | undefined> {
    const [analysis] = await db
      .select()
      .from(aiAnalysis)
      .orderBy(desc(aiAnalysis.createdAt))
      .limit(1);
    return analysis;
  }

  // Analytics operations
  async getWorkloadMetrics(): Promise<{
    totalOrders: number;
    totalHours: number;
    averageComplexity: number;
    onTimePercentage: number;
  }> {
    const [metrics] = await db
      .select({
        totalOrders: sql<number>`count(*)`,
        totalHours: sql<number>`coalesce(sum(${orders.estimatedHours}), 0)`,
        averageComplexity: sql<number>`coalesce(avg(${orders.complexity}), 0)`,
      })
      .from(orders)
      .where(
        and(
          sql`${orders.status} != 'PICKED_UP'`,
          sql`${orders.status} != 'COMPLETED'`
        )
      );

    // Calculate on-time percentage
    const [onTimeData] = await db
      .select({
        total: sql<number>`count(*)`,
        onTime: sql<number>`count(case when ${orders.completedAt} <= ${orders.dueDate} then 1 end)`,
      })
      .from(orders)
      .where(sql`${orders.completedAt} is not null`);

    const onTimePercentage = onTimeData.total > 0 ? (onTimeData.onTime / onTimeData.total) * 100 : 0;

    return {
      totalOrders: metrics.totalOrders,
      totalHours: metrics.totalHours,
      averageComplexity: metrics.averageComplexity,
      onTimePercentage: Math.round(onTimePercentage),
    };
  }
}

export const storage = new DatabaseStorage();
