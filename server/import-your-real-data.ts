import { db } from "./db";
import { customers, orders, type InsertCustomer, type InsertOrder } from "@shared/schema";
import { eq } from "drizzle-orm";
import * as fs from 'fs';

interface YourRealOrder {
  customerName: string;
  phone: string;
  orderId: string;
  description: string;
  dueDate: string;
  invoice: string;
  orderType: string;
}

function parseYourOrderType(orderTypeStr: string): 'FRAME' | 'MAT' | 'SHADOWBOX' {
  const type = orderTypeStr.toLowerCase();
  if (type.includes('canvas')) return 'FRAME';
  if (type.includes('acrylic')) return 'FRAME';
  if (type.includes('double')) return 'MAT';
  return 'FRAME';
}

function parseYourDueDate(dateStr: string): Date {
  if (!dateStr || dateStr.trim() === '') {
    return new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 2 weeks from now
  }
  
  try {
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) : date;
  } catch {
    return new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  }
}

function estimateYourOrderHours(description: string, orderType: string): number {
  const desc = description.toLowerCase();
  
  // Canvas work
  if (desc.includes('canvas') || desc.includes('large')) return 3;
  
  // Complex descriptions
  if (desc.includes('birds') || desc.includes('plants') || desc.includes('painting')) return 4;
  
  // Simple work
  if (desc.includes('small') || desc.includes('photo')) return 1.5;
  
  // Standard framing
  return 2.5;
}

function estimateYourOrderPrice(orderType: string, description: string): number {
  const desc = description.toLowerCase();
  
  if (desc.includes('large') || desc.includes('canvas')) return 250;
  if (desc.includes('small')) return 85;
  if (desc.includes('photo')) return 65;
  
  return 125; // Standard frame price
}

export async function importYourRealOrders(): Promise<void> {
  console.log("Importing your authentic production orders...");
  
  const fileContent = fs.readFileSync('./attached_assets/Pasted-Date-Due-Invoice-Order-ID-Qty-Name-Phone-Designer-Location-Description-Order-Type-Order-Progress-Pai-1748361863829.txt', 'utf-8');
  
  const lines = fileContent.split('\n');
  const customerMap = new Map<string, any>();
  let imported = 0;
  
  for (let i = 1; i < lines.length; i++) {
    const columns = lines[i].split('\t');
    
    if (columns.length < 10) continue;
    
    const customerName = columns[4]?.trim();
    const phone = columns[5]?.trim();
    const orderId = columns[2]?.trim();
    const description = columns[8]?.trim();
    const dueDate = columns[0]?.trim();
    const invoice = columns[1]?.trim();
    const orderType = columns[9]?.trim();
    
    // Skip invalid or system rows
    if (!customerName || !orderId || !description ||
        customerName.includes('Jay"') || 
        customerName.includes('picked up') ||
        customerName.includes('Picked up') ||
        customerName.includes('Up Front') ||
        customerName.includes('Customer picked') ||
        customerName.includes('Emailed') ||
        description.includes('Jay"') ||
        description.length < 3) {
      continue;
    }
    
    // Create or get customer
    let customer = customerMap.get(customerName);
    if (!customer) {
      try {
        const [existingCustomer] = await db
          .select()
          .from(customers)
          .where(eq(customers.name, customerName))
          .limit(1);
          
        if (existingCustomer) {
          customer = existingCustomer;
        } else {
          const customerData: InsertCustomer = {
            name: customerName,
            phone: phone || null,
            email: `${customerName.toLowerCase().replace(/\s+/g, '.')}@customer.com`,
          };
          
          [customer] = await db
            .insert(customers)
            .values(customerData)
            .returning();
        }
        
        customerMap.set(customerName, customer);
      } catch (error) {
        console.error(`Error creating customer ${customerName}:`, error);
        continue;
      }
    }
    
    // Create order
    try {
      const orderData: InsertOrder = {
        customerId: customer.id,
        trackingId: orderId,
        invoiceNumber: invoice || null,
        description: description,
        orderType: parseYourOrderType(orderType),
        status: 'ORDER_PROCESSED',
        priority: 'MEDIUM',
        dueDate: parseYourDueDate(dueDate),
        estimatedHours: estimateYourOrderHours(description, orderType),
        price: estimateYourOrderPrice(orderType, description),
        notes: `Invoice: ${invoice}`,
      };
      
      await db.insert(orders).values(orderData);
      imported++;
      
      if (imported % 10 === 0) {
        console.log(`Imported ${imported} of your real orders...`);
      }
      
    } catch (error) {
      console.error(`Error creating order ${orderId}:`, error);
    }
  }
  
  console.log(`Successfully imported ${imported} of your authentic production orders!`);
}