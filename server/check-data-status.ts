
import { storage } from './storage.js';
import { db } from './db.js';
import { customers, orders } from '../shared/schema.js';

export async function checkDataStatus() {
  console.log('🔍 Checking current database status...');
  
  try {
    // Check total customers
    const allCustomers = await db.select().from(customers);
    console.log(`👥 Total customers in database: ${allCustomers.length}`);
    
    // Check total orders
    const allOrders = await db.select().from(orders);
    console.log(`📦 Total orders in database: ${allOrders.length}`);
    
    // Check orders by status
    const statusCounts = allOrders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('📊 Orders by status:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });
    
    // Check for real vs demo data
    const realOrders = allOrders.filter(order => 
      order.trackingId?.startsWith('TRK-') && 
      !order.trackingId.includes('demo') &&
      !order.trackingId.includes('test')
    );
    
    console.log(`✅ Real production orders: ${realOrders.length}`);
    
    // Show recent orders
    const recentOrders = allOrders
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
    
    console.log('🕒 Most recent orders:');
    recentOrders.forEach(order => {
      console.log(`  ${order.trackingId} - ${order.status} - Created: ${order.createdAt}`);
    });
    
    return {
      totalCustomers: allCustomers.length,
      totalOrders: allOrders.length,
      realOrders: realOrders.length,
      statusCounts,
      recentOrders: recentOrders.map(o => ({
        trackingId: o.trackingId,
        status: o.status,
        createdAt: o.createdAt
      }))
    };
    
  } catch (error) {
    console.error('❌ Error checking data status:', error);
    throw error;
  }
}
