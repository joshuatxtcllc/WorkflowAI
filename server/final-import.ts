
import { db } from './db.js';
import { customers, orders, statusHistory } from '../shared/schema.js';
import * as fs from 'fs';
import { randomUUID } from 'crypto';

export async function finalImportAuthentic() {
  console.log('🚀 Final import of all authentic production orders...');
  
  try {
    const filePath = './attached_assets/Pasted-Date-Due-Invoice-Order-ID-Qty-Name-Phone-Designer-Location-Description-Order-Type-Order-Progress-Pai-1748309997681.txt';
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    
    const lines = fileContent.split('\n');
    const customerMap = new Map();
    let importedCustomers = 0;
    let importedOrders = 0;
    
    // Filter real order lines (those starting with date pattern)
    const orderLines = lines.filter(line => /^[0-9]{1,2}\/[0-9]{1,2}\/[0-9]{4}/.test(line.trim()));
    console.log(`✅ Found ${orderLines.length} authentic order records`);
    
    for (const line of orderLines) {
      const parts = line.split('\t');
      if (parts.length < 10) continue;
      
      try {
        const [dateDue, invoice, orderId, qty, name, phone, designer, location, description, orderType] = parts;
        
        if (!name?.trim() || !orderId?.trim()) continue;
        
        // Create unique customer
        const customerKey = `${name.trim()}-${phone || 'no-phone'}`;
        let customerId;
        
        if (!customerMap.has(customerKey)) {
          customerId = randomUUID();
          await db.insert(customers).values({
            id: customerId,
            name: name.trim(),
            email: `${name.toLowerCase().replace(/\s+/g, '.')}@customer.com`,
            phone: phone?.trim() || null,
            address: location?.trim() || null,
            preferences: {},
          });
          customerMap.set(customerKey, customerId);
          importedCustomers++;
        } else {
          customerId = customerMap.get(customerKey);
        }
        
        // Determine status from completion flags (parts 12-22 contain status flags)
        let status = 'ORDER_PROCESSED';
        if (parts[21] === 'Y' || parts[20] === 'Y') status = 'PICKED_UP'; // Delivered/Done
        else if (parts[19] === 'Y') status = 'COMPLETED'; // Prepped
        else if (parts[18] === 'Y' || (parts[15] === 'Y' && parts[16] === 'Y')) status = 'PREPPED'; // F&M Cut or Cut+MCut
        else if (parts[16] === 'Y') status = 'MAT_CUT'; // M Cut
        else if (parts[15] === 'Y') status = 'FRAME_CUT'; // Cut
        else if (parts[14] === 'Y') status = 'MATERIALS_ARRIVED'; // Arrived
        else if (parts[13] === 'Y') status = 'MATERIALS_ORDERED'; // Ordered
        
        // Map order type
        const mappedType = orderType?.toLowerCase().includes('canvas') || orderType?.toLowerCase().includes('acrylic') 
          ? 'SHADOWBOX' 
          : orderType?.toLowerCase().includes('mat') || orderType?.toLowerCase().includes('check')
            ? 'MAT' 
            : 'FRAME';
        
        // Parse due date
        let dueDate = new Date();
        if (dateDue?.includes('/')) {
          try {
            dueDate = new Date(dateDue);
            if (isNaN(dueDate.getTime())) dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          } catch (e) {
            dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          }
        }
        
        // Create order
        const orderDbId = randomUUID();
        await db.insert(orders).values({
          id: orderDbId,
          trackingId: `TRK-${orderId.trim()}`,
          customerId: customerId,
          orderType: mappedType,
          status: status,
          dueDate: dueDate,
          estimatedHours: mappedType === 'SHADOWBOX' ? 4.5 : mappedType === 'MAT' ? 1.5 : 3.0,
          price: mappedType === 'SHADOWBOX' ? 450 : mappedType === 'MAT' ? 150 : 275,
          description: description?.trim() || '',
          priority: status === 'PICKED_UP' ? 'LOW' : dueDate < new Date() ? 'URGENT' : 'MEDIUM',
          invoiceNumber: invoice?.trim() || '',
        });
        
        // Create status history
        await db.insert(statusHistory).values({
          id: randomUUID(),
          orderId: orderDbId,
          fromStatus: null,
          toStatus: status,
          changedBy: 'production-system',
          reason: 'Final authentic production data import',
          changedAt: new Date(),
        });
        
        importedOrders++;
        
        if (importedOrders % 25 === 0) {
          console.log(`📈 Imported ${importedOrders} orders...`);
        }
        
      } catch (error) {
        console.log(`⚠️ Skipping problematic row: ${error}`);
        continue;
      }
    }
    
    console.log(`🎉 Final import completed!`);
    console.log(`👥 Created ${importedCustomers} customers`);
    console.log(`📦 Imported ${importedOrders} authentic orders`);
    
    return { importedCustomers, importedOrders };
    
  } catch (error) {
    console.error('❌ Final import failed:', error);
    throw error;
  }
}
