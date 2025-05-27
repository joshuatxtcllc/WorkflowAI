import { db } from "./db";
import { orders } from "@shared/schema";
import { eq } from "drizzle-orm";

interface VendorOrderItem {
  itemNumber: string;
  description: string;
  price: number;
  frameSize?: string;
  orderId: string;
  customerName: string;
}

interface VendorOrder {
  vendor: string;
  items: VendorOrderItem[];
  totalAmount: number;
  orderDate: Date;
  estimatedDelivery: Date;
}

export class VendorIntegrationService {
  
  // Get orders that need materials ordered
  async getOrdersNeedingMaterials() {
    const pendingOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.status, 'ORDER_PROCESSED'));

    return pendingOrders;
  }

  // Generate vendor purchase orders from processed orders
  async generatePurchaseOrders(): Promise<VendorOrder[]> {
    const pendingOrders = await this.getOrdersNeedingMaterials();
    const vendorMap = new Map<string, VendorOrderItem[]>();

    for (const order of pendingOrders) {
      const materials = this.parseMaterialRequirements(order.notes || '', order.trackingId, order.description);
      
      for (const material of materials) {
        if (!vendorMap.has(material.vendor)) {
          vendorMap.set(material.vendor, []);
        }
        vendorMap.get(material.vendor)?.push(material);
      }
    }

    // Convert to vendor orders
    const vendorOrders: VendorOrder[] = [];
    for (const [vendor, items] of vendorMap.entries()) {
      const totalAmount = items.reduce((sum: number, item: VendorOrderItem) => sum + item.price, 0);
      const orderDate = new Date();
      const estimatedDelivery = new Date();
      estimatedDelivery.setDate(orderDate.getDate() + this.getVendorLeadTime(vendor));

      vendorOrders.push({
        vendor,
        items,
        totalAmount,
        orderDate,
        estimatedDelivery
      });
    }

    return vendorOrders;
  }

  // Parse material requirements from order notes
  private parseMaterialRequirements(notes: string): Array<{
    vendor: string;
    itemNumber: string;
    description: string;
    price: number;
    frameSize?: string;
  }> {
    const materials: Array<{
      vendor: string;
      itemNumber: string;
      description: string;
      price: number;
      frameSize?: string;
    }> = [];

    // Parse Roma Moulding items
    const romaMatch = notes.match(/Frame: (R\d+)/);
    if (romaMatch) {
      const frameSizeMatch = notes.match(/(\d+[\s\d\/]*X[\s\d\/]*\d+)/);
      materials.push({
        vendor: 'Roma Moulding',
        itemNumber: romaMatch[1],
        description: `${romaMatch[1]} Moulding`,
        price: this.extractPrice(notes, 'frame') || 50,
        frameSize: frameSizeMatch?.[1]
      });
    }

    // Parse Larson Juhl items
    const larsonMatch = notes.match(/Frame: (L\d+)/);
    if (larsonMatch) {
      const frameSizeMatch = notes.match(/(\d+[\s\d\/]*X[\s\d\/]*\d+)/);
      materials.push({
        vendor: 'Larson Juhl',
        itemNumber: larsonMatch[1],
        description: `${larsonMatch[1]} Moulding`,
        price: this.extractPrice(notes, 'frame') || 60,
        frameSize: frameSizeMatch?.[1]
      });
    }

    // Parse Bella Moulding items
    const bellaMatch = notes.match(/Frame: (BEL\d+)/);
    if (bellaMatch) {
      materials.push({
        vendor: 'Bella Moulding',
        itemNumber: bellaMatch[1],
        description: `${bellaMatch[1]} Moulding`,
        price: this.extractPrice(notes, 'frame') || 45
      });
    }

    // Parse Crescent Mat items
    const crescentMatch = notes.match(/Mat: (C\d+)/);
    if (crescentMatch) {
      const priceMatch = notes.match(/Mat:.*?\$(\d+\.?\d*)/);
      materials.push({
        vendor: 'Crescent',
        itemNumber: crescentMatch[1],
        description: `${crescentMatch[1]} Mat Board`,
        price: priceMatch ? parseFloat(priceMatch[1]) : 15
      });
    }

    // Parse Museum Glass
    if (notes.includes('Museum Glass®')) {
      const glassPrice = notes.match(/Glass:.*?\$(\d+\.?\d*)/);
      materials.push({
        vendor: 'Guardian Glass',
        itemNumber: 'MUSEUM-GLASS',
        description: 'Museum Glass® Anti-Reflective',
        price: glassPrice ? parseFloat(glassPrice[1]) : 800
      });
    }

    // Parse Franks Fabrics items
    const fabricMatch = notes.match(/Fabric: (FFE\d+)/);
    if (fabricMatch) {
      const fabricPrice = notes.match(/Fabric:.*?\$(\d+\.?\d*)/);
      materials.push({
        vendor: 'Franks Fabrics',
        itemNumber: fabricMatch[1],
        description: `${fabricMatch[1]} Conservation Fabric`,
        price: fabricPrice ? parseFloat(fabricPrice[1]) : 500
      });
    }

    return materials;
  }

  private extractPrice(notes: string, type: string): number | null {
    const patterns = {
      frame: /Frame:.*?\$(\d+\.?\d*)/,
      mat: /Mat:.*?\$(\d+\.?\d*)/,
      glass: /Glass:.*?\$(\d+\.?\d*)/,
      fabric: /Fabric:.*?\$(\d+\.?\d*)/
    };
    
    const match = notes.match(patterns[type as keyof typeof patterns]);
    return match ? parseFloat(match[1]) : null;
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
  async generatePurchaseOrderDocument(vendorOrder: VendorOrder): Promise<string> {
    const po = `
PURCHASE ORDER
================

Vendor: ${vendorOrder.vendor}
Order Date: ${vendorOrder.orderDate.toLocaleDateString()}
Expected Delivery: ${vendorOrder.estimatedDelivery.toLocaleDateString()}

ITEMS:
------
${vendorOrder.items.map(item => 
  `${item.itemNumber} - ${item.description}${item.frameSize ? ` (${item.frameSize})` : ''}
   Qty: ${item.quantity} @ $${item.unitPrice.toFixed(2)}
   For Order: ${item.orderId} (${item.customerName})
`).join('\n')}

TOTAL: $${vendorOrder.totalAmount.toFixed(2)}

Ship to:
Jay's Frames
[Your Address]
[City, State ZIP]

Special Instructions:
- Mark all items with corresponding order numbers
- Call upon delivery for inspection
- Invoice separately for accounting
`;

    return po;
  }

  // Mark materials as ordered in the system
  async markMaterialsOrdered(vendorOrder: VendorOrder): Promise<void> {
    for (const item of vendorOrder.items) {
      // Update order status to indicate materials have been ordered
      await db
        .update(orders)
        .set({ 
          status: 'MATERIALS_ORDERED',
          updatedAt: new Date()
        })
        .where(eq(orders.trackingId, item.orderId));
    }
  }

  // Get vendor contact information
  getVendorContacts(): { [key: string]: { email: string; phone: string; website: string } } {
    return {
      'Roma Moulding': {
        email: 'orders@romamoulding.com',
        phone: '1-800-ROMA-123',
        website: 'www.romamoulding.com'
      },
      'Larson Juhl': {
        email: 'customerservice@larsonjuhl.com', 
        phone: '1-800-438-5031',
        website: 'www.larsonjuhl.com'
      },
      'Bella Moulding': {
        email: 'sales@bellamoulding.com',
        phone: '1-888-235-5266',
        website: 'www.bellamoulding.com'
      },
      'Crescent': {
        email: 'orders@crescentcardboard.com',
        phone: '1-800-323-1055',
        website: 'www.crescentcardboard.com'
      },
      'Guardian Glass': {
        email: 'orders@guardian.com',
        phone: '1-866-482-7374',
        website: 'www.guardianglass.com'
      },
      'Franks Fabrics': {
        email: 'orders@franksfabrics.com',
        phone: '1-800-372-6571',
        website: 'www.franksfabrics.com'
      }
    };
  }
}

export const vendorService = new VendorIntegrationService();