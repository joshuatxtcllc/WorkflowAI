import { storage } from "./storage";

export async function quickImportFromTSV(fileContent: string) {
  try {
    const lines = fileContent.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('File must have header and data rows');
    }

    const headers = lines[0].split('\t').map(h => h.trim());
    const records = [];

    console.log('Headers found:', headers);

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split('\t');
      const record: any = {};
      
      headers.forEach((header, index) => {
        record[header] = values[index] ? values[index].trim() : '';
      });
      
      // Check for order ID and customer name with flexible column matching
      const orderId = record['Order ID'] || record['OrderID'] || record['order_id'];
      const customerName = record['Customer Name'] || record['CustomerName'] || record['customer_name'];
      
      if (orderId && customerName) {
        records.push(record);
      }
    }

    console.log(`Found ${records.length} valid records from ${lines.length - 1} total lines`);

    let customersCreated = 0;
    let ordersCreated = 0;
    let materialsCreated = 0;
    const errors: string[] = [];
    const customerMap = new Map<string, string>();

    // Group by Order ID
    const orderGroups = new Map<string, any[]>();
    for (const record of records) {
      const orderId = record['Order ID'] || record['OrderID'] || record['order_id'];
      if (!orderGroups.has(orderId)) {
        orderGroups.set(orderId, []);
      }
      orderGroups.get(orderId)!.push(record);
    }

    console.log(`Grouped into ${orderGroups.size} unique orders`);

    // Test database connection with a simple customer creation
    try {
      const testCustomer = await storage.createCustomer({
        name: 'Test Customer',
        email: 'test@test.com',
        phone: null,
        address: null,
      });
      console.log('Database connection successful, test customer created:', testCustomer.id);
      
      // Clean up test customer
      // await storage.deleteCustomer(testCustomer.id); // Uncomment if delete method exists
    } catch (testError) {
      console.error('Database connection test failed:', testError);
      throw new Error(`Database connection failed: ${testError}`);
    }

    for (const [orderId, materials] of Array.from(orderGroups.entries())) {
      try {
        const firstMaterial = materials[0];
        const customerName = firstMaterial['Customer Name'] || firstMaterial['CustomerName'] || firstMaterial['customer_name'];
        
        console.log(`Processing order ${orderId} for customer ${customerName}`);

        // Create customer if needed
        let customerId = customerMap.get(customerName);
        if (!customerId) {
          try {
            const customer = await storage.createCustomer({
              name: customerName,
              email: `${customerName.toLowerCase().replace(/\s+/g, '.')}@customer.local`,
              phone: null,
              address: null,
            });
            customerId = customer.id;
            customerMap.set(customerName, customerId);
            customersCreated++;
            console.log(`Created customer: ${customerName} with ID: ${customerId}`);
          } catch (customerError) {
            console.error(`Failed to create customer ${customerName}:`, customerError);
            errors.push(`Failed to create customer ${customerName}: ${customerError}`);
            continue;
          }
        }

        // Determine order status based on your actual column names
        let status: 'ORDER_PROCESSED' | 'MATERIALS_ORDERED' | 'MATERIALS_ARRIVED' | 'FRAME_CUT' | 'MAT_CUT' | 'PREPPED' | 'COMPLETED' | 'PICKED_UP' = 'ORDER_PROCESSED';
        if (firstMaterial['Delivered'] === 'TRUE') status = 'PICKED_UP';
        else if (firstMaterial['Done'] === 'TRUE') status = 'COMPLETED';
        else if (firstMaterial['Prepped'] === 'TRUE') status = 'PREPPED';
        else if (firstMaterial['M Cut'] === 'TRUE') status = 'MAT_CUT';
        else if (firstMaterial['F Cut'] === 'TRUE') status = 'FRAME_CUT';
        else if (firstMaterial['Arrived'] === 'TRUE') status = 'MATERIALS_ARRIVED';
        else if (firstMaterial['Ordered'] === 'TRUE') status = 'MATERIALS_ORDERED';
        else if (firstMaterial['Order Processed'] === 'TRUE') status = 'ORDER_PROCESSED';

        // Create order
        const frameSize = firstMaterial['Frame Size'] || '16x20';
        const [width, height] = frameSize.split('x').map((s: string) => parseInt(s.trim()) || 16);
        
        console.log(`Creating order for ${orderId} with status: ${status}`);
        
        let createdOrder;
        try {
          createdOrder = await storage.createOrder({
            trackingId: `TRK-${orderId}`,
            customerId,
            orderType: 'FRAME',
            status,
            dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks from now
            estimatedHours: 4,
            price: parseFloat(firstMaterial['Ext cost']) || 100,
            notes: firstMaterial['Notes'] || null,
            priority: 'MEDIUM',
          });

          console.log(`Successfully created order: ${createdOrder.id} for tracking: ${createdOrder.trackingId}`);
          ordersCreated++;

          // Create materials using your actual column names
          for (const materialRow of materials) {
            try {
              const material = await storage.createMaterial({
                orderId: createdOrder.id,
                type: 'FRAME',
                subtype: materialRow['Material'] || materialRow['Item Number'] || 'Frame',
                quantity: parseInt(materialRow['QTY']) || 1,
                unit: 'piece',
                ordered: materialRow['Ordered'] === 'TRUE',
                arrived: materialRow['Arrived'] === 'TRUE',
                cost: parseFloat(materialRow['Ext cost']) || 0,
              });
              materialsCreated++;
            } catch (materialError) {
              console.error(`Failed to create material for order ${orderId}:`, materialError);
            }
          }

          // Create status history
          await storage.createStatusHistory({
            orderId: createdOrder.id,
            toStatus: status,
            changedBy: 'import-system',
            reason: 'Imported from production data'
          });

        } catch (orderError) {
          console.error(`Failed to create order ${orderId}:`, orderError);
          errors.push(`Failed to create order ${orderId}: ${orderError}`);
          continue;
        }

      } catch (err) {
        errors.push(`Failed to process order ${orderId}: ${err}`);
      }
    }

    return {
      customersCreated,
      ordersCreated,
      materialsCreated,
      errors
    };

  } catch (error) {
    console.error('Import error:', error);
    throw new Error(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}