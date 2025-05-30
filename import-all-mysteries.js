const fs = require('fs');
const path = require('path');

async function importAllMysteryOrders() {
  try {
    // Read the mystery data file
    const filePath = './attached_assets/Pasted-Date-Due-Invoice-Order-ID-Qty-Name-Phone-Designer-Location-Description-Order-Type-Order-Progress-Pai-1748618065100.txt';
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    
    const lines = fileContent.split('\n');
    const header = lines[0].split('\t');
    
    console.log('Processing mystery orders from authentic shop data...');
    
    const mysteryOrders = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const columns = line.split('\t');
      if (columns.length < 8) continue;
      
      const name = columns[4]?.trim();
      const location = columns[7]?.trim();
      const description = columns[8]?.trim();
      const orderId = columns[2]?.trim();
      const invoice = columns[1]?.trim();
      
      // Only process Mystery orders
      if (name === 'Mystery' && location?.includes('Mystery Drawer')) {
        mysteryOrders.push({
          trackingId: `MYSTERY-${orderId}`,
          description: description || `Mystery item ${orderId}`,
          location: location,
          invoice: invoice,
          orderId: orderId
        });
      }
    }
    
    console.log(`Found ${mysteryOrders.length} authentic mystery orders`);
    return mysteryOrders;
    
  } catch (error) {
    console.error('Error processing mystery data:', error);
    return [];
  }
}

module.exports = { importAllMysteryOrders };