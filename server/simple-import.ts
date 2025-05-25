import { parse } from 'csv-parse/sync';
import { storage } from './storage';

interface SimpleRow {
  'Order ID': string;
  'Customer Name': string;
  'Material': string;
  'Frame Size': string;
  'Due Date': string;
  'Ext cost': string;
  'Item Number': string;
  'Vendor': string;
  'QTY': string;
  'Notes': string;
  'Order Processed': string;
  'Ordered': string;
  'Arrived': string;
  'F Cut': string;
  'M Cut': string;
  'Prepped': string;
  'Done': string;
  'Delivered': string;
  [key: string]: string;
}

function getOrderStatus(row: SimpleRow): string {
  if (row['Delivered'] === 'TRUE') return 'PICKED_UP';
  if (row['Done'] === 'TRUE') return 'COMPLETED';
  if (row['Prepped'] === 'TRUE') return 'PREPPED';
  if (row['M Cut'] === 'TRUE') return 'MAT_CUT';
  if (row['F Cut'] === 'TRUE') return 'FRAME_CUT';
  if (row['Arrived'] === 'TRUE') return 'MATERIALS_ARRIVED';
  if (row['Ordered'] === 'TRUE') return 'MATERIALS_ORDERED';
  return 'ORDER_PROCESSED';
}

export async function importFromTSV(fileContent: string) {
  const records: SimpleRow[] = parse(fileContent, {
    columns: true,
    delimiter: '\t',
    skip_empty_lines: true,
    trim: true
  });

  // Group by Order ID
  const orderGroups = new Map<string, SimpleRow[]>();
  for (const row of records) {
    if (!row['Order ID'] || !row['Customer Name']) continue;
    const id = row['Order ID'];
    if (!orderGroups.has(id)) orderGroups.set(id, []);
    orderGroups.get(id)!.push(row);
  }

  let customersCreated = 0;
  let ordersCreated = 0;
  let materialsCreated = 0;
  const errors: string[] = [];

  const customerMap = new Map<string, string>();

  for (const [orderId, materials] of Array.from(orderGroups.entries())) {
    try {
      const firstMaterial = materials[0];
      const customerName = firstMaterial['Customer Name'].trim();

      // Create or get customer
      let customerId = customerMap.get(customerName);
      if (!customerId) {
        try {
          const customer = await storage.createCustomer({
            name: customerName,
            email: `${customerName.toLowerCase().replace(/\s+/g, '.')}@frames.local`,
            phone: null,
            address: null,
            preferences: {}
          });
          customerId = customer.id;
          customerMap.set(customerName, customerId);
          customersCreated++;
        } catch (err) {
          // Customer might already exist
          const existing = await storage.getCustomerByEmail(`${customerName.toLowerCase().replace(/\s+/g, '.')}@frames.local`);
          if (existing) {
            customerId = existing.id;
            customerMap.set(customerName, customerId);
          } else {
            errors.push(`Failed to create customer ${customerName}`);
            continue;
          }
        }
      }

      // Parse order details
      const frameSize = firstMaterial['Frame Size'] || '';
      const price = parseFloat(firstMaterial['Ext cost']?.replace(/[\$,]/g, '') || '0') || 0;
      const dueDate = firstMaterial['Due Date'] ? new Date(firstMaterial['Due Date']) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      const status = getOrderStatus(firstMaterial);
      
      // Estimate hours based on price/complexity
      const estimatedHours = Math.max(1, Math.min(Math.ceil(price / 500), 20));

      // Create order
      const order = await storage.createOrder({
        trackingId: `JF-${orderId}`,
        customerId: customerId,
        orderType: 'FRAME' as any,
        dueDate: dueDate,
        estimatedHours: estimatedHours,
        price: price,
        status: status as any,
        priority: price > 5000 ? 'HIGH' as any : price > 2000 ? 'MEDIUM' as any : 'LOW' as any,
        internalNotes: `${firstMaterial['Notes'] || ''} | Frame Size: ${frameSize}`
      });

      // Create materials for this order
      for (const material of materials) {
        try {
          await storage.createMaterial({
            orderId: order.id,
            type: material['Material'] === 'Moulding' ? 'FRAME' as any : 'OTHER' as any,
            subtype: material['Item Number'] || null,
            quantity: parseInt(material['QTY']) || 1,
            unit: 'piece',
            ordered: material['Ordered'] === 'TRUE',
            arrived: material['Arrived'] === 'TRUE',
            cost: parseFloat(material['Ext cost']?.replace(/[\$,]/g, '') || '0') || 0
          });
          materialsCreated++;
        } catch (err) {
          errors.push(`Failed to create material for order ${orderId}`);
        }
      }

      // Create status history
      await storage.createStatusHistory({
        orderId: order.id,
        toStatus: status,
        changedBy: 'import-system',
        reason: 'Imported from production data'
      });

      ordersCreated++;
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
}