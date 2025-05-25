import { storage } from "./storage";

export async function testImport() {
  try {
    console.log('Testing basic database operations...');
    
    // Test 1: Create a simple customer
    const customer = await storage.createCustomer({
      name: 'Adam Brouillard',
      email: 'adam@test.com',
      phone: null,
      address: null,
    });
    console.log('✓ Customer created:', customer);
    
    // Test 2: Create a simple order
    const order = await storage.createOrder({
      trackingId: 'TRK-20966',
      customerId: customer.id,
      orderType: 'FRAME',
      status: 'ORDER_PROCESSED',
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      estimatedHours: 4,
      price: 100,
      priority: 'MEDIUM',
    });
    console.log('✓ Order created:', order);
    
    return {
      customersCreated: 1,
      ordersCreated: 1,
      materialsCreated: 0,
      errors: []
    };
    
  } catch (error) {
    console.error('Database operation failed:', error);
    throw error;
  }
}