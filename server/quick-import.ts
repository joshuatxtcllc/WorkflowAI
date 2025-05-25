import { storage } from "./storage";

export async function quickImportFromTSV(fileContent: string) {
  try {
    const lines = fileContent.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('File must have header and data rows');
    }

    const headers = lines[0].split('\t');
    const records = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split('\t');
      const record: any = {};
      
      headers.forEach((header, index) => {
        record[header.trim()] = values[index] ? values[index].trim() : '';
      });
      
      if (record['Order ID'] && record['Customer Name']) {
        records.push(record);
      }
    }

    let customersCreated = 0;
    let ordersCreated = 0;
    let materialsCreated = 0;
    const errors: string[] = [];
    const customerMap = new Map<string, string>();

    // Group by Order ID
    const orderGroups = new Map<string, any[]>();
    for (const record of records) {
      const orderId = record['Order ID'];
      if (!orderGroups.has(orderId)) {
        orderGroups.set(orderId, []);
      }
      orderGroups.get(orderId)!.push(record);
    }

    for (const [orderId, materials] of orderGroups) {
      try {
        const firstMaterial = materials[0];
        const customerName = firstMaterial['Customer Name'];

        // Create customer if needed
        let customerId = customerMap.get(customerName);
        if (!customerId) {
          const customer = await storage.createCustomer({
            name: customerName,
            email: `${customerName.toLowerCase().replace(/\s+/g, '.')}@customer.local`,
            phone: null,
            address: null,
          });
          customerId = customer.id;
          customerMap.set(customerName, customerId);
          customersCreated++;
        }

        // Determine order status
        let status = 'ORDER_PROCESSED';
        if (firstMaterial['Delivered'] === 'TRUE') status = 'DELIVERED';
        else if (firstMaterial['Done'] === 'TRUE') status = 'COMPLETED';
        else if (firstMaterial['Prepped'] === 'TRUE') status = 'PREPPED';
        else if (firstMaterial['M Cut'] === 'TRUE') status = 'MAT_CUT';
        else if (firstMaterial['F Cut'] === 'TRUE') status = 'FRAME_CUT';
        else if (firstMaterial['Arrived'] === 'TRUE') status = 'MATERIALS_ARRIVED';
        else if (firstMaterial['Ordered'] === 'TRUE') status = 'MATERIALS_ORDERED';

        // Create order
        const frameSize = firstMaterial['Frame Size'] || '16x20';
        const [width, height] = frameSize.split('x').map(s => parseInt(s.trim()) || 16);
        
        const order = await storage.createOrder({
          trackingId: `TRK-${orderId}`,
          customerId,
          frameWidth: width,
          frameHeight: height,
          totalCost: parseFloat(firstMaterial['Ext cost']) || 100,
          orderType: 'FRAME',
          status,
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks from now
          notes: firstMaterial['Notes'] || null,
          priority: 'MEDIUM',
        });

        ordersCreated++;

        // Create materials
        for (const materialRow of materials) {
          const material = await storage.createMaterial({
            orderId: order.id,
            materialType: materialRow['Material'] || 'Frame',
            description: `${materialRow['Material']} for ${frameSize}`,
            supplier: materialRow['Vendor'] || 'Unknown',
            cost: parseFloat(materialRow['Ext cost']) || 0,
            quantity: parseInt(materialRow['QTY']) || 1,
            received: materialRow['Arrived'] === 'TRUE',
          });
          materialsCreated++;
        }

        // Create status history
        await storage.createStatusHistory({
          orderId: order.id,
          toStatus: status,
          changedBy: 'import-system',
          reason: 'Imported from production data'
        });

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