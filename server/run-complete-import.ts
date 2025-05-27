import { importCleanAuthenticData } from './import-clean-data.js';
import { importAuthenticProductionData } from './import-authentic-data.js';
import * as fs from 'fs';

export async function runCompleteImport() {
  console.log('Starting complete import of all authentic production orders...');
  
  try {
    // Import from the first authentic data file
    console.log('Importing from first authentic data file...');
    const filePath1 = './attached_assets/Pasted-Date-Due-Invoice-Order-ID-Qty-Name-Phone-Designer-Location-Description-Order-Type-Order-Progress-Pai-1748309764369.txt';
    if (fs.existsSync(filePath1)) {
      const fileContent1 = fs.readFileSync(filePath1, 'utf-8');
      await importAuthenticProductionData(fileContent1);
      console.log('✓ Completed import from first file');
    }

    // Import from the second authentic data file
    console.log('Importing from second authentic data file...');
    const filePath2 = './attached_assets/Pasted-Date-Due-Invoice-Order-ID-Qty-Name-Phone-Designer-Location-Description-Order-Type-Order-Progress-Pai-1748309997681.txt';
    if (fs.existsSync(filePath2)) {
      const fileContent2 = fs.readFileSync(filePath2, 'utf-8');
      await importAuthenticProductionData(fileContent2);
      console.log('✓ Completed import from second file');
    }

    console.log('✅ Complete import finished successfully!');
    return { success: true, message: 'All authentic production orders imported successfully' };
  } catch (error) {
    console.error('❌ Import failed:', error);
    throw error;
  }
}