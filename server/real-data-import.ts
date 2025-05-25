import { storage } from "./storage";

export async function importRealCustomerData() {
  try {
    // Real customers and orders from your actual business data
    const realOrders = [
      // Angie Marston - Invoice 200
      {
        customerName: 'Angie Marston',
        phone: '4152039036',
        orderId: '1212',
        invoiceNumber: '200',
        frameSize: 'Custom',
        price: 189,
        status: 'PICKED_UP',
        description: 'Picture Of Boy',
        notes: 'H500 location'
      },
      
      // Houston Methodist Clear Lake - Invoice 7008
      {
        customerName: 'Houston Methodist Clear Lake',
        phone: '2813848890',
        orderId: '11422',
        invoiceNumber: '7008',
        frameSize: 'Custom Signs',
        price: 0,
        status: 'PICKED_UP',
        description: 'Signs For Methodist Clear Lake',
        notes: 'H400 #2 location, Designer: Mike H.'
      },
      
      // Elisabeth Mcingvale - Invoice 11765
      {
        customerName: 'Elisabeth Mcingvale',
        phone: '7133069133',
        orderId: '19456',
        invoiceNumber: '11765',
        frameSize: 'Custom',
        price: 0,
        status: 'PICKED_UP',
        description: 'Mackey Crest',
        notes: 'H400 location, Designer: Gabbie H'
      },
      
      // Randy Reed - Invoice 11806
      {
        customerName: 'Randy Reed',
        phone: '7025414025',
        orderId: '19526',
        invoiceNumber: '11806',
        frameSize: 'Custom',
        price: 10,
        status: 'PICKED_UP',
        description: 'Unclaimed Art Storage',
        notes: 'Designer: Lindy Brooks'
      },
      
      // Matt Bosworth - Invoice 11899
      {
        customerName: 'Matt Bosworth',
        phone: '8329956928',
        orderId: '19708',
        invoiceNumber: '11899',
        frameSize: 'Custom',
        price: 4,
        status: 'PICKED_UP',
        description: '#3 ARVEDI Jerseys',
        notes: 'H700 #2 location, Designer: Rico'
      },
      
      // Valerie Sanchez - Invoice 11900
      {
        customerName: 'Valerie Sanchez',
        phone: '7134446285',
        orderId: '19709',
        invoiceNumber: '11900',
        frameSize: 'Custom',
        price: 3,
        status: 'COMPLETED',
        description: 'Steven Speilberg Letter',
        notes: 'H700 location, Designer: Rico Rico, 1 of 2 Done'
      },
      
      // Alison Coriell - Invoice 12175
      {
        customerName: 'Alison Coriell',
        phone: '7132058619',
        orderId: '20167',
        invoiceNumber: '12175',
        frameSize: 'Custom',
        price: 5,
        status: 'PICKED_UP',
        description: 'ABSTRACT ART PAINTING G100',
        notes: 'J2 location, Designer: JayFrames'
      },
      
      // Matt Duncan - Invoice 12177 (in progress)
      {
        customerName: 'Matt Duncan',
        phone: '2812241705',
        orderId: '20172',
        invoiceNumber: '12177',
        frameSize: 'Custom',
        price: 191,
        status: 'MATERIALS_ARRIVED',
        description: 'Yogy Bear cells',
        notes: 'Drawer 6, Designer: AdrianMo, Acrylic Fabrication'
      },
      
      // Mystery orders from your unclaimed drawer items
      {
        customerName: 'Mystery Customer',
        phone: null,
        orderId: '301',
        invoiceNumber: '301',
        frameSize: 'Custom',
        price: 0,
        status: 'ORDER_PROCESSED',
        description: 'Girl in red dress walking down village road',
        notes: 'Mystery Drawer #3, Paint on Unstretched canvas'
      },
      
      {
        customerName: 'Mystery Customer',
        phone: null,
        orderId: '302',
        invoiceNumber: '302',
        frameSize: 'Custom',
        price: 0,
        status: 'ORDER_PROCESSED',
        description: 'Golden Hindu temple with Buddha',
        notes: 'Mystery Drawer#3, Lazer cut tapestry'
      },
      
      // Multiple items for Mystery Customer - Invoice 303
      {
        customerName: 'Mystery Customer',
        phone: null,
        orderId: '303-1',
        invoiceNumber: '303',
        frameSize: 'Custom',
        price: 0,
        status: 'ORDER_PROCESSED',
        description: 'Cathie Kayser illustration - landscape',
        notes: 'Mystery Drawer#3, Item 1 of 3'
      },
      
      {
        customerName: 'Mystery Customer',
        phone: null,
        orderId: '303-2',
        invoiceNumber: '303',
        frameSize: 'Custom',
        price: 0,
        status: 'MATERIALS_ORDERED',
        description: 'Cathie Kayser illustration - tangled nest',
        notes: 'Mystery Drawer#3, Item 2 of 3'
      },
      
      {
        customerName: 'Mystery Customer',
        phone: null,
        orderId: '303-3',
        invoiceNumber: '303',
        frameSize: 'Custom',
        price: 0,
        status: 'FRAME_CUT',
        description: 'Leonard poem with crows',
        notes: 'Mystery Drawer#3, Item 3 of 3'
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
        const email = orderData.customerName === 'Mystery Customer' 
          ? `mystery${Math.random().toString(36).substr(2, 9)}@customer.local`
          : `${orderData.customerName.toLowerCase().replace(/\s+/g, '.')}@customer.local`;
        
        let existingCustomer = await storage.getCustomerByEmail(email);
        
        if (existingCustomer) {
          customerId = existingCustomer.id;
          customerMap.set(orderData.customerName, customerId);
        } else {
          const customer = await storage.createCustomer({
            name: orderData.customerName,
            email: email,
            phone: orderData.phone,
            address: null,
          });
          customerId = customer.id;
          customerMap.set(orderData.customerName, customerId);
          customersCreated++;
        }
      }

      // Create order with real invoice number
      const order = await storage.createOrder({
        trackingId: `TRK-${orderData.orderId}`,
        customerId,
        orderType: 'FRAME',
        status: orderData.status as any,
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        estimatedHours: 2,
        price: orderData.price,
        notes: `${orderData.description} - ${orderData.notes}`,
        priority: 'MEDIUM',
        invoiceNumber: orderData.invoiceNumber,
      });
      
      // Create status history
      await storage.createStatusHistory({
        orderId: order.id,
        toStatus: orderData.status as any,
        changedBy: 'system',
        reason: 'Data import from real business records'
      });
      
      ordersCreated++;
    }

    return {
      success: true,
      message: `Successfully imported ${customersCreated} customers and ${ordersCreated} orders from real business data`,
      customersCreated,
      ordersCreated
    };
  } catch (error) {
    console.error('Failed to import real customer data:', error);
    throw error;
  }
}