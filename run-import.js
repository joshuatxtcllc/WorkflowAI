import { directImportFromTSV } from './server/direct-import.js';
import * as fs from 'fs';

async function runImport() {
  try {
    console.log('Starting direct import of authentic production data...');
    const fileContent = fs.readFileSync('./attached_assets/Pasted-Date-Due-Invoice-Order-ID-Qty-Name-Phone-Designer-Location-Description-Order-Type-Order-Progress-Pai-1748309997681.txt', 'utf-8');
    const result = await directImportFromTSV(fileContent);
    console.log('Import completed successfully!');
    console.log(`Imported ${result.importedCustomers} customers and ${result.importedOrders} orders`);
  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  }
}

runImport();