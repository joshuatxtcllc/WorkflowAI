
<line_number>1</line_number>
import { storage } from './storage';
import { db } from './db';

async function debugOrders() {
  console.log('=== Debug Orders Endpoint ===');
  
  try {
    // Test database connection
    console.log('1. Testing database connection...');
    const testQuery = await db.select().from(db.query.orders).limit(1);
    console.log('Database connection: OK');
    
    // Test storage method
    console.log('2. Testing storage.getOrders()...');
    const orders = await storage.getOrders();
    console.log(`Storage method: OK, returned ${orders.length} orders`);
    
    // Check first order structure
    if (orders.length > 0) {
      console.log('3. First order structure:');
      console.log(JSON.stringify(orders[0], null, 2));
    }
    
    console.log('=== Debug Complete ===');
  } catch (error) {
    console.error('Debug failed:', error);
  }
}

// Run if called directly
if (require.main === module) {
  debugOrders();
}

export { debugOrders };
