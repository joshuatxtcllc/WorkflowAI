import { storage } from "./storage";

export async function addRealProductionOrders() {
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
        notes: 'Picture Of Boy - H500'
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
        notes: 'Signs For Methodist Clear Lake - H400 #2, Designer: Mike H.'
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
        notes: 'Mackey Crest - H400, Designer: Gabbie H'
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
        notes: 'Unclaimed Art Storage - Designer: Lindy Brooks'
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
        notes: '#3 ARVEDI Jerseys - H700 #2, Designer: Rico'
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
        notes: 'Steven Speilberg Letter - H700, Designer: Rico Rico, 1 of 2 Done'
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
        notes: 'ABSTRACT ART PAINTING G100 - J2, Designer: JayFrames'
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
        notes: 'Yogy Bear cells - Drawer 6, Designer: AdrianMo, Acrylic Fabrication'
      },
      
      // Mystery orders from your unclaimed drawer items - Invoice 303 (multiple items)
      {
        customerName: 'Mystery Customer',
        phone: null,
        orderId: '303-1',
        invoiceNumber: '303',
        frameSize: 'Custom',
        price: 0,
        status: 'ORDER_PROCESSED',
        notes: '3 Cathie Kayser illustrations - landscape (item 1 of 3) - Mystery Drawer#3'
      },
      
      {
        customerName: 'Mystery Customer',
        phone: null,
        orderId: '303-2',
        invoiceNumber: '303',
        frameSize: 'Custom',
        price: 0,
        status: 'MATERIALS_ORDERED',
        notes: '3 Cathie Kayser illustrations - tangled nest (item 2 of 3) - Mystery Drawer#3'
      },
      
      {
        customerName: 'Mystery Customer',
        phone: null,
        orderId: '303-3',
        invoiceNumber: '303',
        frameSize: 'Custom',
        price: 0,
        status: 'FRAME_CUT',
        notes: 'Leonard poem with crows (item 3 of 3) - Mystery Drawer#3'
      },
      
      // Additional mystery orders - single items
      {
        customerName: 'Mystery Customer',
        phone: null,
        orderId: '301',
        invoiceNumber: '301',
        frameSize: 'Custom',
        price: 0,
        status: 'ORDER_PROCESSED',
        notes: 'Girl in red dress walking down village road - Paint on Unstretched canvas - Mystery Drawer #3'
      },
      
      {
        customerName: 'Mystery Customer',
        phone: null,
        orderId: '302',
        invoiceNumber: '302',
        frameSize: 'Custom',
        price: 0,
        status: 'MATERIALS_ORDERED',
        notes: 'Golden Hindu temple with Buddha - Lazer cut tapestry - Mystery Drawer#3'
      },
      
      {
        customerName: 'Mystery Customer',
        phone: null,
        orderId: '304',
        invoiceNumber: '304',
        frameSize: 'Custom',
        price: 0,
        status: 'MAT_CUT',
        notes: 'Millie the true glue - printed poem on paper - Mystery Drawer#3'
      },
      
      {
        customerName: 'Mystery Customer',
        phone: null,
        orderId: '305',
        invoiceNumber: '305',
        frameSize: 'Custom',
        price: 0,
        status: 'PREPPED',
        notes: 'Woman in red and yellow head dress smiling - photograph - Mystery Drawer#3'
      },
      
      {
        customerName: 'Mystery Customer',
        phone: null,
        orderId: '306',
        invoiceNumber: '306',
        frameSize: 'Custom',
        price: 0,
        status: 'COMPLETED',
        notes: '2 photos: Red handprints on red rock; Cliffs of red and orange sand - Same sleeve - Mystery Drawer#3'
      },
      
      // Grant's live active orders - HIGH PRIORITY
      {
        customerName: 'Chip Grant',
        phone: null,
        orderId: '21018',
        invoiceNumber: '21018',
        frameSize: '27 X 35',
        price: 227.63,
        status: 'PREPPED',
        notes: 'Bella Moulding BEL720098 - Stock Savings: $227.63 - 80% Complete - Live Order'
      },
      
      {
        customerName: 'Chip Grant',
        phone: null,
        orderId: '21019',
        invoiceNumber: '21019',
        frameSize: '27 X 35',
        price: 227.63,
        status: 'PREPPED',
        notes: 'Bella Moulding BEL720098 - Stock Savings: $227.63 - 80% Complete - Live Order'
      },
      
      {
        customerName: 'Chip Grant',
        phone: null,
        orderId: '21020',
        invoiceNumber: '21020',
        frameSize: '27 X 35',
        price: 227.63,
        status: 'PREPPED',
        notes: 'Bella Moulding BEL720098 - Stock Savings: $227.63 - 80% Complete - Live Order'
      },
      
      {
        customerName: 'Chip Grant',
        phone: null,
        orderId: '21021',
        invoiceNumber: '21021',
        frameSize: '27 X 35',
        price: 227.63,
        status: 'PREPPED',
        notes: 'Bella Moulding BEL720098 - Stock Savings: $227.63 - 80% Complete - Live Order'
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
            phone: orderData.phone,
            address: null,
          });
          customerId = customer.id;
          customerMap.set(orderData.customerName, customerId);
          customersCreated++;
        }
      }

      // Set due dates and priority for Grant's live orders
      let dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      let priority = 'MEDIUM';
      let estimatedHours = 4;
      
      if (orderData.customerName === 'Chip Grant') {
        // Grant's orders have specific due dates and are HIGH priority
        if (orderData.orderId === '21018' || orderData.orderId === '21019') {
          dueDate = new Date('2024-10-05');
        } else if (orderData.orderId === '21020') {
          dueDate = new Date('2024-10-06');
        } else if (orderData.orderId === '21021') {
          dueDate = new Date('2024-10-07');
        }
        priority = 'HIGH';
        estimatedHours = 4.5; // Large custom frames take longer
      }

      // Create order with invoice number
      const order = await storage.createOrder({
        trackingId: `TRK-${orderData.orderId}`,
        customerId,
        orderType: 'FRAME',
        status: orderData.status as any,
        dueDate: dueDate,
        estimatedHours: estimatedHours,
        price: orderData.price,
        notes: orderData.notes || null,
        priority: priority as any,
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