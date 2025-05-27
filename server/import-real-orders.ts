import { storage } from './storage.js';
import * as fs from 'fs';

// Simple direct import function for your authentic TSV data
export async function importRealOrderData() {
  console.log('Reading authentic order data file...');
  
  try {
    const filePath = './attached_assets/Pasted-Date-Due-Invoice-Order-ID-Qty-Name-Phone-Designer-Location-Description-Order-Type-Order-Progress-Pai-1748309764369.txt';
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    
    const lines = fileContent.split('\n');
    let importedCustomers = 0;
    let importedOrders = 0;
    const customerMap = new Map();
    
    console.log(`Processing ${lines.length} lines from authentic data...`);
    
    // Parse each line that starts with a date pattern (actual order rows)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Check if this line starts with a date (MM/DD/YYYY format)
      const dateMatch = line.match(/^(\d{1,2}\/\d{1,2}\/\d{4})\t/);
      if (!dateMatch) continue;
      
      const parts = line.split('\t');
      if (parts.length < 10) continue;
      
      try {
        const [dateDue, invoice, orderId, qty, name, phone, designer, location, description, orderType] = parts;
        
        if (!name || !invoice || !orderId) continue;
        
        // Create customer if not exists
        const customerKey = `${name}-${phone}`;
        let customer;
        if (!customerMap.has(customerKey)) {
          customer = {
            id: `cust-real-${orderId}`,
            name: name,
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
        
        // Determine order status and type
        let status = 'ORDER_PROCESSED';
        if (parts[12] === 'Y') status = 'ORDER_PROCESSED'; // Order Processed
        if (parts[13] === 'Y') status = 'MATERIALS_ORDERED'; // Ordered
        if (parts[14] === 'Y') status = 'MATERIALS_ARRIVED'; // Arrived
        if (parts[15] === 'Y') status = 'FRAME_CUT'; // Cut
        if (parts[16] === 'Y') status = 'MAT_CUT'; // M Cut
        if (parts[19] === 'Y') status = 'PREPPED'; // Prepped
        if (parts[20] === 'Y') status = 'COMPLETED'; // Done
        if (parts[21] === 'Y') status = 'PICKED_UP'; // Delivered
        
        const mappedOrderType = orderType?.toLowerCase().includes('canvas') || orderType?.toLowerCase().includes('acrylic') 
          ? 'SHADOWBOX' 
          : orderType?.toLowerCase().includes('mat') 
            ? 'MAT' 
            : 'FRAME';
        
        // Parse due date
        let dueDate = new Date();
        try {
          if (dateMatch[1]) {
            dueDate = new Date(dateMatch[1]);
            if (isNaN(dueDate.getTime())) {
              dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
            }
          }
        } catch (e) {
          dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        }
        
        // Create order
        const order = {
          id: `ord-real-${orderId}`,
          trackingId: `TRK-${orderId}`,
          customerId: customer.id,
          orderType: mappedOrderType,
          status: status,
          dueDate: dueDate,
          estimatedHours: mappedOrderType === 'SHADOWBOX' ? 4.5 : mappedOrderType === 'MAT' ? 1.5 : 3.0,
          price: mappedOrderType === 'SHADOWBOX' ? 450 : mappedOrderType === 'MAT' ? 150 : 250,
          notes: description || '',
          priority: 'MEDIUM' as const,
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
          reason: 'Authentic production data imported',
        });
        
        importedOrders++;
        
        if (importedOrders % 50 === 0) {
          console.log(`Imported ${importedOrders} orders so far...`);
        }
        
      } catch (error) {
        console.log(`Error processing line ${i}: ${error}`);
        continue;
      }
    }
    
    console.log(`✅ Import completed successfully!`);
    console.log(`📊 Imported ${importedCustomers} customers and ${importedOrders} orders`);
    return { importedCustomers, importedOrders };
    
  } catch (error) {
    console.error('❌ Import failed:', error);
    throw error;
  }
}