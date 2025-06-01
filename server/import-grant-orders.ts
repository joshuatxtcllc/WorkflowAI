
import { storage } from './storage.js';
import { randomUUID } from 'crypto';

export async function importGrantOrders() {
  console.log('🚀 Importing live Grant orders...');
  
  try {
    // Create customer for Chip Grant if doesn't exist
    let customer = await storage.getCustomerByEmail('chip.grant@customer.com');
    
    if (!customer) {
      customer = await storage.createCustomer({
        name: 'Chip Grant',
        email: 'chip.grant@customer.com',
        phone: null,
        address: null,
        preferences: {},
      });
      console.log('✅ Created customer: Chip Grant');
    }

    // Grant's live orders from your database
    const grantOrders = [
      {
        orderId: '21018',
        itemNumber: 'BEL720098',
        vendor: 'Bella Moulding',
        material: 'Moulding',
        qty: 1,
        extCost: '$22,763',
        frameSize: '27 X 35',
        dueDate: '10/5/2024',
        stockSavings: '$22,763.00',
        orderProgress: '████████░░ 80%',
        status: 'PREPPED'
      },
      {
        orderId: '21019',
        itemNumber: 'BEL720098',
        vendor: 'Bella Moulding',
        material: 'Moulding',
        qty: 1,
        extCost: '$22,763',
        frameSize: '27 X 35',
        dueDate: '10/5/2024',
        stockSavings: '$22,763.00',
        orderProgress: '████████░░ 80%',
        status: 'PREPPED'
      },
      {
        orderId: '21020',
        itemNumber: 'BEL720098',
        vendor: 'Bella Moulding',
        material: 'Moulding',
        qty: 1,
        extCost: '$22,763',
        frameSize: '27 X 35',
        dueDate: '10/6/2024',
        stockSavings: '$22,763.00',
        orderProgress: '████████░░ 80%',
        status: 'PREPPED'
      },
      {
        orderId: '21021',
        itemNumber: 'BEL720098',
        vendor: 'Bella Moulding',
        material: 'Moulding',
        qty: 1,
        extCost: '$22,763',
        frameSize: '27 X 35',
        dueDate: '10/7/2024',
        stockSavings: '$22,763.00',
        orderProgress: '████████░░ 80%',
        status: 'PREPPED'
      }
    ];

    let importedOrders = 0;

    for (const orderData of grantOrders) {
      try {
        // Check if order already exists
        const existingOrder = await storage.getOrderByTrackingId(`TRK-${orderData.orderId}`);
        if (existingOrder) {
          console.log(`⏭️  Order ${orderData.orderId} already exists, skipping`);
          continue;
        }

        // Parse price
        const price = parseFloat(orderData.extCost.replace(/[$,]/g, '')) || 0;
        
        // Parse due date
        let dueDate = new Date();
        try {
          dueDate = new Date(orderData.dueDate);
          if (isNaN(dueDate.getTime())) {
            dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
          }
        } catch (e) {
          dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
        }

        // Parse frame dimensions
        const frameSize = orderData.frameSize.split(' X ');
        const width = parseFloat(frameSize[0]) || 0;
        const height = parseFloat(frameSize[1]) || 0;

        // Determine priority - these are live active orders so HIGH priority
        const priority = dueDate < new Date() ? 'URGENT' : 'HIGH';

        // Create order
        const order = await storage.createOrder({
          trackingId: `TRK-${orderData.orderId}`,
          customerId: customer.id,
          orderType: 'FRAME',
          status: orderData.status as any,
          dueDate: dueDate,
          estimatedHours: 4.5, // Large custom frames
          price: price,
          description: `Custom frame ${orderData.frameSize} - ${orderData.vendor} ${orderData.itemNumber}`,
          priority: priority,
          invoiceNumber: `INV-${orderData.orderId}`,
          frameWidth: width,
          frameHeight: height,
          notes: `Live production order - Stock Savings: ${orderData.stockSavings}`,
          internalNotes: `Vendor: ${orderData.vendor}, Item: ${orderData.itemNumber}, Progress: ${orderData.orderProgress}`
        });

        // Create material record
        await storage.createMaterial({
          type: 'FRAME',
          orderId: order.id,
          quantity: parseInt(orderData.qty) || 1,
          subtype: `${orderData.vendor} - ${orderData.itemNumber}`,
          unit: 'pieces',
          ordered: true,
          arrived: true,
          cost: price,
          notes: `Stock Savings: ${orderData.stockSavings}, Live production order`
        });

        // Create status history
        await storage.createStatusHistory({
          orderId: order.id,
          toStatus: orderData.status as any,
          changedBy: 'production-system',
          reason: 'Live Grant order imported from production data'
        });

        console.log(`✅ Imported live order ${orderData.orderId} for Chip Grant - $${price.toLocaleString()}`);
        importedOrders++;

      } catch (error) {
        console.error(`❌ Error importing order ${orderData.orderId}:`, error);
        continue;
      }
    }

    console.log(`🎉 Grant orders import completed!`);
    console.log(`📦 Imported ${importedOrders} live orders`);
    console.log(`💰 Total value: $${grantOrders.reduce((sum, order) => sum + (parseFloat(order.extCost.replace(/[$,]/g, '')) || 0), 0).toLocaleString()}`);

    return { importedOrders, totalValue: grantOrders.reduce((sum, order) => sum + (parseFloat(order.extCost.replace(/[$,]/g, '')) || 0), 0) };

  } catch (error) {
    console.error('❌ Grant orders import failed:', error);
    throw error;
  }
}
