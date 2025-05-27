import { db } from "./db";
import { orders, customers } from "@shared/schema";
import { eq } from "drizzle-orm";

interface MaterialItem {
  vendor: string;
  itemNumber: string;
  description: string;
  price: number;
  frameSize?: string;
  orderId: string;
  customerName: string;
}

interface VendorPurchaseOrder {
  vendor: string;
  items: MaterialItem[];
  totalAmount: number;
  estimatedDelivery: string;
}

export class VendorOrderService {
  
  // Get all orders that need materials ordered
  async getOrdersNeedingMaterials() {
    const processedOrders = await db
      .select({
        order: orders,
        customer: customers
      })
      .from(orders)
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .where(eq(orders.status, 'ORDER_PROCESSED'));

    return processedOrders;
  }

  // Generate vendor purchase orders
  async generateVendorOrders(): Promise<VendorPurchaseOrder[]> {
    const orderData = await this.getOrdersNeedingMaterials();
    const vendorMap = new Map<string, MaterialItem[]>();

    for (const { order, customer } of orderData) {
      const materials = this.extractMaterials(order.notes || '', order.trackingId, customer?.name || 'Unknown Customer');
      
      for (const material of materials) {
        if (!vendorMap.has(material.vendor)) {
          vendorMap.set(material.vendor, []);
        }
        vendorMap.get(material.vendor)?.push(material);
      }
    }

    // Convert to purchase orders
    const purchaseOrders: VendorPurchaseOrder[] = [];
    for (const [vendor, items] of vendorMap.entries()) {
      const totalAmount = items.reduce((sum, item) => sum + item.price, 0);
      const leadTime = this.getVendorLeadTime(vendor);
      const deliveryDate = new Date();
      deliveryDate.setDate(deliveryDate.getDate() + leadTime);

      purchaseOrders.push({
        vendor,
        items,
        totalAmount,
        estimatedDelivery: deliveryDate.toLocaleDateString()
      });
    }

    return purchaseOrders;
  }

  // Extract materials from order notes
  private extractMaterials(notes: string, orderId: string, customerName: string): MaterialItem[] {
    const materials: MaterialItem[] = [];

    // Roma Moulding frames
    const romaMatch = notes.match(/Frame: (R\d+)/);
    if (romaMatch) {
      const priceMatch = notes.match(/Frame:.*?\$(\d+\.?\d*)/);
      materials.push({
        vendor: 'Roma Moulding',
        itemNumber: romaMatch[1],
        description: `${romaMatch[1]} Moulding`,
        price: priceMatch ? parseFloat(priceMatch[1]) : 50,
        orderId,
        customerName
      });
    }

    // Larson Juhl frames
    const larsonMatch = notes.match(/Frame: (L\d+)/);
    if (larsonMatch) {
      const priceMatch = notes.match(/Frame:.*?\$(\d+\.?\d*)/);
      materials.push({
        vendor: 'Larson Juhl',
        itemNumber: larsonMatch[1],
        description: `${larsonMatch[1]} Moulding`,
        price: priceMatch ? parseFloat(priceMatch[1]) : 60,
        orderId,
        customerName
      });
    }

    // Bella Moulding frames
    const bellaMatch = notes.match(/Frame: (BEL\d+)/);
    if (bellaMatch) {
      materials.push({
        vendor: 'Bella Moulding',
        itemNumber: bellaMatch[1],
        description: `${bellaMatch[1]} Moulding`,
        price: 45,
        orderId,
        customerName
      });
    }

    // Crescent mats
    const crescentMatch = notes.match(/Mat: (C\d+)/);
    if (crescentMatch) {
      const priceMatch = notes.match(/Mat:.*?\$(\d+\.?\d*)/);
      materials.push({
        vendor: 'Crescent',
        itemNumber: crescentMatch[1],
        description: `${crescentMatch[1]} Mat Board`,
        price: priceMatch ? parseFloat(priceMatch[1]) : 15,
        orderId,
        customerName
      });
    }

    // Museum Glass
    if (notes.includes('Museum Glass®')) {
      const priceMatch = notes.match(/Glass:.*?\$(\d+\.?\d*)/);
      materials.push({
        vendor: 'Guardian Glass',
        itemNumber: 'MUSEUM-GLASS',
        description: 'Museum Glass® Anti-Reflective',
        price: priceMatch ? parseFloat(priceMatch[1]) : 800,
        orderId,
        customerName
      });
    }

    // Franks Fabrics
    const fabricMatch = notes.match(/Fabric: (FFE\d+)/);
    if (fabricMatch) {
      const priceMatch = notes.match(/Fabric:.*?\$(\d+\.?\d*)/);
      materials.push({
        vendor: 'Franks Fabrics',
        itemNumber: fabricMatch[1],
        description: `${fabricMatch[1]} Conservation Fabric`,
        price: priceMatch ? parseFloat(priceMatch[1]) : 500,
        orderId,
        customerName
      });
    }

    return materials;
  }

  private getVendorLeadTime(vendor: string): number {
    const leadTimes: { [key: string]: number } = {
      'Roma Moulding': 7,
      'Larson Juhl': 10,
      'Bella Moulding': 5,
      'Crescent': 3,
      'Guardian Glass': 14,
      'Franks Fabrics': 21
    };
    
    return leadTimes[vendor] || 7;
  }

  // Generate purchase order document
  generatePurchaseOrderText(vendorOrder: VendorPurchaseOrder): string {
    return `
PURCHASE ORDER - ${vendorOrder.vendor}
=====================================

Order Date: ${new Date().toLocaleDateString()}
Expected Delivery: ${vendorOrder.estimatedDelivery}

ITEMS NEEDED:
${vendorOrder.items.map(item => 
  `• ${item.itemNumber} - ${item.description} - $${item.price.toFixed(2)}
    For: Order ${item.orderId} (${item.customerName})`
).join('\n')}

TOTAL AMOUNT: $${vendorOrder.totalAmount.toFixed(2)}

Ship to: Jay's Frames
[Your Business Address]

Notes: Please mark all items with order numbers for easy identification.
`;
  }

  // Mark orders as materials ordered
  async markMaterialsOrdered(orderIds: string[]) {
    for (const orderId of orderIds) {
      await db
        .update(orders)
        .set({ 
          status: 'MATERIALS_ORDERED',
          updatedAt: new Date()
        })
        .where(eq(orders.trackingId, orderId));
    }
  }
}

export const vendorOrderService = new VendorOrderService();