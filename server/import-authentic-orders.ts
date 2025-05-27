import { storage } from './storage.js';
import * as fs from 'fs';

export async function importAuthenticOrders() {
  console.log('🚀 Starting import of authentic production orders...');
  
  try {
    const filePath = './attached_assets/Pasted-Date-Due-Invoice-Order-ID-Qty-Name-Phone-Designer-Location-Description-Order-Type-Order-Progress-Pai-1748309997681.txt';
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    
    const lines = fileContent.split('\n');
    let importedCustomers = 0;
    let importedOrders = 0;
    const customerMap = new Map();
    
    console.log('📋 Filtering real order rows from file...');
    
    // Extract only lines that start with date pattern (real order rows)
    const orderLines = lines.filter(line => /^[0-9]{1,2}\/[0-9]{1,2}\/[0-9]{4}/.test(line.trim()));
    
    console.log(`✅ Found ${orderLines.length} authentic order records`);
    
    for (const line of orderLines) {
      const parts = line.split('\t');
      if (parts.length < 10) continue;
      
      try {
        const [dateDue, invoice, orderId, qty, name, phone, designer, location, description, orderType, orderProgress, paidInFull, orderProcessed, ordered, arrived, cut, mCut, gCut, fMCut, prepped, done, delivered] = parts;
        
        if (!name?.trim() || !invoice?.trim() || !orderId?.trim()) continue;
        
        // Create customer if new
        const customerKey = `${name.trim()}-${phone?.trim() || 'no-phone'}`;
        let customer;
        if (!customerMap.has(customerKey)) {
          customer = {
            id: `cust-${orderId.trim()}`,
            name: name.trim(),
            email: `${name.toLowerCase().replace(/\s+/g, '.')}@customer.com`,
            phone: phone?.trim() || '',
            address: location?.trim() || '',
            preferences: {},
          };
          
          const createdCustomer = await storage.createCustomer(customer);
          customerMap.set(customerKey, createdCustomer);
          importedCustomers++;
        } else {
          customer = customerMap.get(customerKey);
        }
        
        // Determine order status from completion flags
        let status: 'ORDER_PROCESSED' | 'MATERIALS_ORDERED' | 'MATERIALS_ARRIVED' | 'FRAME_CUT' | 'MAT_CUT' | 'PREPPED' | 'COMPLETED' | 'PICKED_UP' = 'ORDER_PROCESSED';
        
        if (delivered === 'Y' || done === 'Y') {
          status = 'PICKED_UP';
        } else if (prepped === 'Y') {
          status = 'COMPLETED';
        } else if (fMCut === 'Y' || (cut === 'Y' && mCut === 'Y')) {
          status = 'PREPPED';
        } else if (mCut === 'Y') {
          status = 'MAT_CUT';
        } else if (cut === 'Y') {
          status = 'FRAME_CUT';
        } else if (arrived === 'Y') {
          status = 'MATERIALS_ARRIVED';
        } else if (ordered === 'Y') {
          status = 'MATERIALS_ORDERED';
        }
        
        // Map order type
        const mappedOrderType: 'FRAME' | 'MAT' | 'SHADOWBOX' = 
          orderType?.toLowerCase().includes('canvas') || orderType?.toLowerCase().includes('acrylic') 
            ? 'SHADOWBOX' 
            : orderType?.toLowerCase().includes('mat') || orderType?.toLowerCase().includes('double check')
              ? 'MAT' 
              : 'FRAME';
        
        // Parse due date
        let dueDate = new Date();
        try {
          if (dateDue?.includes('/')) {
            dueDate = new Date(dateDue);
            if (isNaN(dueDate.getTime())) {
              dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            }
          }
        } catch (e) {
          dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        }
        
        // Calculate pricing and hours
        const baseHours = mappedOrderType === 'SHADOWBOX' ? 4.5 : mappedOrderType === 'MAT' ? 1.5 : 3.0;
        const basePrice = mappedOrderType === 'SHADOWBOX' ? 450 : mappedOrderType === 'MAT' ? 150 : 275;
        
        // Priority based on status and timing
        let priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' = 'MEDIUM';
        if (status === 'PICKED_UP' || status === 'COMPLETED') {
          priority = 'LOW';
        } else if (dueDate < new Date()) {
          priority = 'URGENT';
        } else if (status === 'ORDER_PROCESSED') {
          priority = 'HIGH';
        }
        
        // Create order
        const order = {
          trackingId: `TRK-${orderId}`,
          customerId: customer.id,
          orderType: mappedOrderType,
          status: status,
          dueDate: dueDate,
          estimatedHours: baseHours,
          price: basePrice,
          description: description?.trim() || '',
          priority: priority,
          invoiceNumber: invoice?.trim() || '',
        };
        
        const createdOrder = await storage.createOrder(order);
        
        // Create status history
        await storage.createStatusHistory({
          orderId: createdOrder.id,
          toStatus: status,
          changedBy: 'production-system',
          reason: 'Authentic production data imported',
        });
        
        importedOrders++;
        
        if (importedOrders % 25 === 0) {
          console.log(`📈 Imported ${importedOrders} authentic orders...`);
        }
        
      } catch (error) {
        console.log(`⚠️ Error processing order: ${error}`);
        continue;
      }
    }
    
    console.log(`🎉 Import completed successfully!`);
    console.log(`👥 Imported ${importedCustomers} customers`);
    console.log(`📦 Imported ${importedOrders} authentic orders`);
    
    return { importedCustomers, importedOrders };
    
  } catch (error) {
    console.error('❌ Import failed:', error);
    throw error;
  }
}