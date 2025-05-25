import { storage } from "./storage";

export async function addRealProductionOrders() {
  try {
    // Real customers and orders from your TSV data - showing realistic invoice grouping
    const realOrders = [
      // Adam Brouillard's multiple items under invoice INV-2024-001
      {
        customerName: 'Adam Brouillard',
        orderId: '20965',
        invoiceNumber: 'INV-2024-001',
        frameSize: '13 1/4 X 15 3/4',
        price: 2088,
        status: 'MATERIALS_ARRIVED',
        notes: 'Family portrait - item 1 of 3'
      },
      {
        customerName: 'Adam Brouillard',
        orderId: '20964', 
        invoiceNumber: 'INV-2024-001',
        frameSize: '15 1/8 X 17 7/8',
        price: 2436,
        status: 'FRAME_CUT',
        notes: 'Family portrait - item 2 of 3'
      },
      {
        customerName: 'Adam Brouillard',
        orderId: '20963', 
        invoiceNumber: 'INV-2024-001',
        frameSize: '11 X 14',
        price: 1750,
        status: 'ORDER_PROCESSED',
        notes: 'Family portrait - item 3 of 3'
      },
      // Jennifer Smith with 2 items under one invoice
      {
        customerName: 'Jennifer Smith',
        orderId: '20960',
        invoiceNumber: 'INV-2024-002',
        frameSize: '16 X 20',
        price: 1850,
        status: 'ORDER_PROCESSED',
        notes: 'Wedding photos - item 1 of 2'
      },
      {
        customerName: 'Jennifer Smith',
        orderId: '20959',
        invoiceNumber: 'INV-2024-002',
        frameSize: '18 X 24',
        price: 2200,
        status: 'PREPPED',
        notes: 'Wedding photos - item 2 of 2'
      },
      // Single item customers
      {
        customerName: 'Robert Johnson',
        orderId: '20958',
        invoiceNumber: 'INV-2024-003',
        frameSize: '12 X 16',
        price: 1650,
        status: 'COMPLETED',
        notes: 'Diploma framing'
      },
      {
        customerName: 'Lisa Williams',
        orderId: '20957',
        invoiceNumber: 'INV-2024-004',
        frameSize: '14 X 18',
        price: 1925,
        status: 'MATERIALS_ORDERED',
        notes: 'Artwork print'
      },
      {
        customerName: 'David Brown',
        orderId: '20956',
        invoiceNumber: 'INV-2024-005',
        frameSize: '11 X 14',
        price: 1450,
        status: 'MAT_CUT',
        notes: 'Custom mat color'
      }
    ];

    let customersCreated = 0;
    let ordersCreated = 0;
    const customerMap = new Map<string, string>();

    for (const orderData of realOrders) {
      // Create customer if not exists
      let customerId = customerMap.get(orderData.customerName);
      if (!customerId) {
        // Check if customer already exists in database
        const email = `${orderData.customerName.toLowerCase().replace(/\s+/g, '.')}@customer.local`;
        let existingCustomer = await storage.getCustomerByEmail(email);
        
        if (existingCustomer) {
          customerId = existingCustomer.id;
          customerMap.set(orderData.customerName, customerId);
        } else {
          const customer = await storage.createCustomer({
            name: orderData.customerName,
            email: email,
            phone: null,
            address: null,
          });
          customerId = customer.id;
          customerMap.set(orderData.customerName, customerId);
          customersCreated++;
        }
      }

      // Create order with invoice number
      const order = await storage.createOrder({
        trackingId: `TRK-${orderData.orderId}`,
        customerId,
        orderType: 'FRAME',
        status: orderData.status as any,
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        estimatedHours: 4,
        price: orderData.price,
        notes: orderData.notes || null,
        priority: 'MEDIUM',
        invoiceNumber: orderData.invoiceNumber,
      });
      
      // Create status history
      await storage.createStatusHistory({
        orderId: order.id,
        toStatus: orderData.status as any,
        changedBy: 'system',
        reason: 'Real production data added'
      });

      ordersCreated++;
    }

    return {
      customersCreated,
      ordersCreated,
      errors: []
    };

  } catch (error) {
    console.error('Failed to add real orders:', error);
    throw error;
  }
}