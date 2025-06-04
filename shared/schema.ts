import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  integer,
  real,
  boolean,
  serial,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique().notNull(),
  password: varchar("password"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role", { enum: ["ADMIN", "EMPLOYEE", "VIEWER"] }).default("EMPLOYEE"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const customers = pgTable("customers", {
  id: varchar("id").primaryKey().notNull(),
  name: varchar("name").notNull(),
  email: varchar("email").unique().notNull(),
  phone: varchar("phone"),
  address: text("address"),
  preferences: jsonb("preferences"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().notNull(),
  trackingId: varchar("tracking_id").unique().notNull(),
  customerId: varchar("customer_id").notNull(),
  assignedToId: varchar("assigned_to_id"),
  invoiceNumber: varchar("invoice_number"),

  orderType: varchar("order_type", { enum: ["FRAME", "MAT", "SHADOWBOX"] }).notNull(),
  status: varchar("status", { 
    enum: [
      "MYSTERY_UNCLAIMED",
      "ORDER_PROCESSED",
      "MATERIALS_ORDERED", 
      "MATERIALS_ARRIVED",
      "FRAME_CUT",
      "MAT_CUT", 
      "PREPPED",
      "COMPLETED",
      "DELAYED",
      "PICKED_UP"
    ] 
  }).default("ORDER_PROCESSED"),
  priority: varchar("priority", { enum: ["LOW", "MEDIUM", "HIGH", "URGENT"] }).default("MEDIUM"),
  complexity: integer("complexity").default(5), // 1-10 scale

  dueDate: timestamp("due_date").notNull(),
  estimatedHours: real("estimated_hours").notNull(),
  actualHours: real("actual_hours"),

  price: real("price").notNull(),
  deposit: real("deposit").default(0),

  dimensions: jsonb("dimensions"), // { width, height, depth }
  notes: text("notes"),
  description: text("description"),
  imageUrl: text("image_url"),
  artworkImages: jsonb("artwork_images"), // Array of image URLs for customer artwork
  artworkLocation: varchar("artwork_location"), // Physical location of artwork
  artworkReceived: boolean("artwork_received").default(false),
  artworkReceivedDate: timestamp("artwork_received_date"),
  internalNotes: text("internal_notes"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  pickedUpAt: timestamp("picked_up_at"),
});

export const materials = pgTable("materials", {
  id: varchar("id").primaryKey().notNull(),
  orderId: varchar("order_id").notNull(),

  type: varchar("type", { enum: ["FRAME", "MAT", "GLASS", "HARDWARE", "OTHER"] }).notNull(),
  subtype: varchar("subtype"), // e.g., "museum glass", "oak frame"
  quantity: integer("quantity").notNull(),
  unit: varchar("unit").default("piece"),

  ordered: boolean("ordered").default(false),
  arrived: boolean("arrived").default(false),

  supplier: varchar("supplier"),
  cost: real("cost"),
  orderedDate: timestamp("ordered_date"),
  arrivedDate: timestamp("arrived_date"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const statusHistory = pgTable("status_history", {
  id: varchar("id").primaryKey().notNull(),
  orderId: varchar("order_id").notNull(),

  fromStatus: varchar("from_status"),
  toStatus: varchar("to_status").notNull(),
  changedBy: varchar("changed_by").notNull(), // User ID
  reason: text("reason"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const timeEntries = pgTable("time_entries", {
  id: varchar("id").primaryKey().notNull(),
  orderId: varchar("order_id").notNull(),

  userId: varchar("user_id").notNull(), // Who worked on it
  duration: real("duration").notNull(), // In hours
  task: varchar("task").notNull(), // What was done
  notes: text("notes"),

  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().notNull(),
  customerId: varchar("customer_id"),
  orderId: varchar("order_id"),

  type: varchar("type", { 
    enum: ["ORDER_CREATED", "STATUS_UPDATE", "READY_FOR_PICKUP", "OVERDUE_REMINDER", "MATERIAL_UPDATE"] 
  }).notNull(),
  channel: varchar("channel", { enum: ["EMAIL", "SMS", "BOTH"] }).notNull(),
  status: varchar("status", { enum: ["PENDING", "SENT", "FAILED"] }).default("PENDING"),

  subject: varchar("subject").notNull(),
  content: text("content").notNull(),
  metadata: jsonb("metadata"),

  sentAt: timestamp("sent_at"),
  failedAt: timestamp("failed_at"),
  error: text("error"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const aiAnalysis = pgTable("ai_analysis", {
  id: varchar("id").primaryKey().notNull(),

  date: timestamp("date").defaultNow(),
  metrics: jsonb("metrics").notNull(), // Workload metrics, bottlenecks, etc.
  alerts: jsonb("alerts").notNull(), // Current alerts and warnings

  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
}));

export const customersRelations = relations(customers, ({ many }) => ({
  orders: many(orders),
  notifications: many(notifications),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id],
  }),
  assignedTo: one(users, {
    fields: [orders.assignedToId],
    references: [users.id],
  }),
  materials: many(materials),
  statusHistory: many(statusHistory),
  timeEntries: many(timeEntries),
  notifications: many(notifications),
}));

export const materialsRelations = relations(materials, ({ one }) => ({
  order: one(orders, {
    fields: [materials.orderId],
    references: [orders.id],
  }),
}));

export const statusHistoryRelations = relations(statusHistory, ({ one }) => ({
  order: one(orders, {
    fields: [statusHistory.orderId],
    references: [orders.id],
  }),
}));

export const timeEntriesRelations = relations(timeEntries, ({ one }) => ({
  order: one(orders, {
    fields: [timeEntries.orderId],
    references: [orders.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  customer: one(customers, {
    fields: [notifications.customerId],
    references: [customers.id],
  }),
  order: one(orders, {
    fields: [notifications.orderId],
    references: [orders.id],
  }),
}));

// Insert schemas
export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
  pickedUpAt: true,
});

export const insertMaterialSchema = createInsertSchema(materials).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  sentAt: true,
  failedAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Material = typeof materials.$inferSelect;
export type InsertMaterial = z.infer<typeof insertMaterialSchema>;
export type StatusHistory = typeof statusHistory.$inferSelect;
export type TimeEntry = typeof timeEntries.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type AIAnalysis = typeof aiAnalysis.$inferSelect;

// Extended types for API responses
export type OrderWithDetails = Order & {
  customer: Customer;
  assignedTo?: User;
  materials: Material[];
  statusHistory: StatusHistory[];
};

export type WorkloadAnalysis = {
  totalOrders: number;
  totalHours: number;
  averageComplexity: number;
  onTimePercentage: number;
  bottlenecks: string[];
  recommendations: string[];
  projectedCompletion?: Date;
  riskLevel: 'low' | 'medium' | 'high' | 'critical' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  statusCounts: Record<string, number>;
  totalWorkload: number;
  trends?: {
    weeklyGrowth: string;
    efficiencyScore: string;
    predictedCompletion: string;
  };
  alerts: string[];
  aiInsights: string;
  timestamp?: string;
};

export type AIMessage = {
  id: string;
  type: 'user' | 'assistant' | 'alert';
  content: string;
  timestamp: Date;
  severity?: 'info' | 'warning' | 'urgent' | 'success';
};