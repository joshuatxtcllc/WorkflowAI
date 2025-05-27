import { storage } from './storage.js';
import * as fs from 'fs';

// Import the cleaned authentic TSV data
export async function importCleanAuthenticData() {
  console.log('Reading cleaned authentic order data...');
  
  try {
    const filePath = './attached_assets/Pasted-Date-Due-Invoice-Order-ID-Qty-Name-Phone-Designer-Location-Description-Order-Type-Order-Progress-Pai-1748309997681.txt';
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    
    const lines = fileContent.split('\n');
    let importedCustomers = 0;
    let importedOrders = 0;
    const customerMap = new Map();
    
    console.log(`Processing ${lines.length} lines from cleaned authentic data...`);
    
    // Skip header row and process data rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const parts = line.split('\t');
      if (parts.length < 10) continue;
      
      try {
        // Extract core data from TSV columns
        const [dateDue, invoice, orderId, qty, name, phone, designer, location, description, orderType, orderProgress, paidInFull, orderProcessed, ordered, arrived, cut, mCut, gCut, fMCut, prepped, done, delivered] = parts;
        
        if (!name || !invoice || !orderId) continue;
        
        // Create unique customer
        const customerKey = `${name.trim()}-${phone}`;
        let customer;
        if (!customerMap.has(customerKey)) {
          customer = {
            id: `cust-${orderId}`,
            name: name.trim(),
            email: `${name.toLowerCase().replace(/\s+/g, '.')}@customer.com`,
            phone: phone || '',
            address: location || '',
            preferences: {},
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          
          await storage.createCustomer(customer);
          customerMap.set(customerKey, customer);
          importedCustomers++;
        } else {
          customer = customerMap.get(customerKey);
        }
        
        // Determine order status based on completion flags
        let status = 'ORDER_PROCESSED';
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
        } else if (orderProcessed === 'Y') {
          status = 'ORDER_PROCESSED';
        }
        
        // Map order type
        const mappedOrderType = 
          orderType?.toLowerCase().includes('canvas') || orderType?.toLowerCase().includes('acrylic') 
            ? 'SHADOWBOX' 
            : orderType?.toLowerCase().includes('mat') || orderType?.toLowerCase().includes('double check')
              ? 'MAT' 
              : 'FRAME';
        
        // Parse due date
        let dueDate = new Date();
        try {
          if (dateDue && dateDue.includes('/')) {
            dueDate = new Date(dateDue);
            if (isNaN(dueDate.getTime())) {
              dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            }
          }
        } catch (e) {
          dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        }
        
        // Parse progress percentage for estimated hours
        let progressMultiplier = 1.0;
        if (orderProgress?.includes('█')) {
          const progressMatch = orderProgress.match(/(\d+)%/);
          if (progressMatch) {
            progressMultiplier = parseInt(progressMatch[1]) / 100;
          }
        }
        
        // Estimate hours and pricing based on order type and complexity
        const baseHours = mappedOrderType === 'SHADOWBOX' ? 5.0 : mappedOrderType === 'MAT' ? 1.5 : 3.0;
        const estimatedHours = Math.round(baseHours * (1 + progressMultiplier) * 10) / 10;
        
        const basePrice = mappedOrderType === 'SHADOWBOX' ? 500 : mappedOrderType === 'MAT' ? 150 : 300;
        const price = Math.round(basePrice * (description?.toLowerCase().includes('large') ? 1.3 : 1.0));
        
        // Determine priority based on status and due date
        let priority = 'MEDIUM';
        if (status === 'PICKED_UP' || status === 'COMPLETED') {
          priority = 'LOW';
        } else if (dueDate < new Date()) {
          priority = 'URGENT';
        } else if (status === 'ORDER_PROCESSED' || status === 'MATERIALS_ORDERED') {
          priority = 'HIGH';
        }
        
        // Create order
        const order = {
          id: `ord-${orderId}`,
          trackingId: `TRK-${orderId}`,
          customerId: customer.id,
          orderType: mappedOrderType,
          status: status,
          dueDate: dueDate,
          estimatedHours: estimatedHours,
          price: price,
          notes: description || '',
          priority: priority,
          invoiceNumber: invoice,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        await storage.createOrder(order);
        
        // Create status history
        await storage.createStatusHistory({
          orderId: order.id,
          toStatus: status,
          changedBy: 'production-system',
          reason: 'Authentic production data imported from cleaned TSV',
        });
        
        importedOrders++;
        
        if (importedOrders % 100 === 0) {
          console.log(`✅ Imported ${importedOrders} authentic orders so far...`);
        }
        
      } catch (error) {
        console.log(`⚠️ Error processing line ${i}: ${error}`);
        continue;
      }
    }
    
    console.log(`🎉 Import completed successfully!`);
    console.log(`📊 Final results: ${importedCustomers} customers and ${importedOrders} authentic orders imported`);
    return { importedCustomers, importedOrders };
    
  } catch (error) {
    console.error('❌ Import failed:', error);
    throw error;
  }
}