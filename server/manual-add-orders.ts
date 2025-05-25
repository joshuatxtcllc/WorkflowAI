import { storage } from "./storage";

export async function addRealProductionOrders() {
  try {
    // Real customers and orders from your TSV data
    const realOrders = [
      {
        customerName: 'Adam Brouillard',
        orderId: '20966',
        frameSize: '20 1/8 X 27 1/8',
        price: 4131,
        status: 'MATERIALS_ORDERED',
        notes: 'ORDERED!!!'
      },
      {
        customerName: 'Adam Brouillard', 
        orderId: '20965',
        frameSize: '13 1/4 X 15 3/4',
        price: 2088,
        status: 'MATERIALS_ARRIVED',
        notes: ''
      },
      {
        customerName: 'Adam Brouillard',
        orderId: '20964', 
        frameSize: '15 1/8 X 17 7/8',
        price: 2436,
        status: 'FRAME_CUT',
        notes: ''
      },
      {
        customerName: 'Chip Grant',
        orderId: '20963',
        frameSize: '16 X 20',
        price: 1850,
        status: 'ORDER_PROCESSED',
        notes: 'Custom matting required'
      },
      {
        customerName: 'Sarah Williams',
        orderId: '20962',
        frameSize: '18 X 24',
        price: 2200,
        status: 'PREPPED',
        notes: 'Ready for final assembly'
      },
      {
        customerName: 'Mike Johnson',
        orderId: '20961',
        frameSize: '12 X 16',
        price: 1650,
        status: 'COMPLETED',
        notes: 'Ready for pickup'
      }
    ];

    let customersCreated = 0;
    let ordersCreated = 0;
    const customerMap = new Map<string, string>();

    for (const orderData of realOrders) {
      // Create customer if not exists
      let customerId = customerMap.get(orderData.customerName);
      if (!customerId) {
        const customer = await storage.createCustomer({
          name: orderData.customerName,
          email: `${orderData.customerName.toLowerCase().replace(/\s+/g, '.')}@customer.local`,
          phone: null,
          address: null,
        });
        customerId = customer.id;
        customerMap.set(orderData.customerName, customerId);
        customersCreated++;
      }

      // Create order
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