import { importAuthenticOrders } from './server/import-authentic-orders.js';

async function runImport() {
  try {
    console.log('Starting import of authentic production data...');
    const result = await importAuthenticOrders();
    console.log('Import completed successfully!');
    console.log(`Imported ${result.importedCustomers} customers and ${result.importedOrders} orders`);
  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  }
}

runImport();