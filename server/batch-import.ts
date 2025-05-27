
import { db } from './db.js';
import { customers, orders, statusHistory } from '../shared/schema.js';
import { randomUUID } from 'crypto';
import * as fs from 'fs';

export async function batchImportOrders(batchSize: number = 5) {
  console.log('🚀 Starting batch import of authentic orders...');
  
  try {
    const filePath = './attached_assets/Pasted-Date-Due-Invoice-Order-ID-Qty-Name-Phone-Designer-Location-Description-Order-Type-Order-Progress-Pai-1748309997681.txt';
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    
    const lines = fileContent.split('\n');
    const customerMap = new Map();
    let totalImported = 0;
    let batchCount = 0;
    
    // Filter real order lines
    const orderLines = lines.filter(line => /^[0-9]{1,2}\/[0-9]{1,2}\/[0-9]{4}/.test(line.trim()));
    console.log(`✅ Found ${orderLines.length} authentic order records`);
    
    // Process in batches
    for (let i = 0; i < orderLines.length; i += batchSize) {
      const batch = orderLines.slice(i, i + batchSize);
      batchCount++;
      
      console.log(`\n📦 Processing batch ${batchCount} (${batch.length} orders)...`);
      
      for (const line of batch) {
        const parts = line.split('\t');
        if (parts.length < 10) continue;
        
        try {
          const [dateDue, invoice, orderId, qty, name, phone, designer, location, description, orderType] = parts;
          
          if (!name?.trim() || !orderId?.trim()) continue;
          
          // Create customer if needed
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
            console.log(`  👤 Created customer: ${name.trim()}`);
          } else {
            customerId = customerMap.get(customerKey);
          }
          
          // Determine status
          let status = 'ORDER_PROCESSED';
          if (parts[21] === 'Y' || parts[20] === 'Y') status = 'PICKED_UP';
          else if (parts[19] === 'Y') status = 'COMPLETED';
          else if (parts[18] === 'Y' || (parts[15] === 'Y' && parts[16] === 'Y')) status = 'PREPPED';
          else if (parts[16] === 'Y') status = 'MAT_CUT';
          else if (parts[15] === 'Y') status = 'FRAME_CUT';
          else if (parts[14] === 'Y') status = 'MATERIALS_ARRIVED';
          else if (parts[13] === 'Y') status = 'MATERIALS_ORDERED';
          
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
            changedBy: 'batch-import',
            reason: `Batch ${batchCount} import`,
            changedAt: new Date(),
          });
          
          console.log(`  📋 Created order: ${orderId.trim()} for ${name.trim()}`);
          totalImported++;
          
        } catch (error) {
          console.log(`  ⚠️ Skipped order: ${error}`);
          continue;
        }
      }
      
      console.log(`✅ Batch ${batchCount} completed. Total imported: ${totalImported}`);
      
      // Optional: Add a small delay between batches
      if (i + batchSize < orderLines.length) {
        console.log('⏳ Waiting 2 seconds before next batch...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log(`\n🎉 All batches completed!`);
    console.log(`📊 Total orders imported: ${totalImported}`);
    console.log(`📦 Total batches processed: ${batchCount}`);
    
    return { totalImported, batchCount };
    
  } catch (error) {
    console.error('❌ Batch import failed:', error);
    throw error;
  }
}
