import { storage } from "./storage";

export async function directImportFromTSV(fileContent: string) {
  const lines = fileContent.split('\n').filter(line => line.trim());
  const headers = lines[0].split('\t').map(h => h.trim());
  
  let customersCreated = 0;
  let ordersCreated = 0;
  let materialsCreated = 0;
  const errors: string[] = [];
  
  // Process only first few orders to test
  const testRows = lines.slice(1, 6); // Just first 5 orders for testing
  
  for (const line of testRows) {
    try {
      const values = line.split('\t');
      const record: any = {};
      
      headers.forEach((header, index) => {
        record[header] = values[index] ? values[index].trim() : '';
      });
      
      const orderId = record['Order ID'];
      const customerName = record['Customer Name'];
      
      if (!orderId || !customerName) continue;
      
      console.log(`Processing: Order ${orderId} for ${customerName}`);
      
      // Create customer
      const customer = await storage.createCustomer({
        name: customerName,
        email: `${customerName.toLowerCase().replace(/\s+/g, '.')}@customer.local`,
        phone: null,
        address: null,
      });
      customersCreated++;
      
      // Create order
      const order = await storage.createOrder({
        trackingId: `TRK-${orderId}`,
        customerId: customer.id,
        orderType: 'FRAME',
        status: 'ORDER_PROCESSED',
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        estimatedHours: 4,
        price: 100,
        priority: 'MEDIUM',
      });
      ordersCreated++;
      
      console.log(`Successfully created order ${order.id} for ${customerName}`);
      
    } catch (error) {
      console.error(`Failed to process record:`, error);
      errors.push(`Error: ${error}`);
    }
  }
  
  return {
    customersCreated,
    ordersCreated,
    materialsCreated: 0, // Skip materials for now
    errors
  };
}