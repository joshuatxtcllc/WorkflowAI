const fs = require('fs');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function updateMatData() {
  const matContent = fs.readFileSync('./attached_assets/Pasted-ID-Item-Number-Vendor-Customer-Material-Stock-Quantity-UnitPrice-Extended-Price-Frame-Size-Due-Date--1748364700514.txt', 'utf-8');
  const lines = matContent.split('\n');
  let updated = 0;

  console.log(`Processing ${lines.length} lines of authentic mat data...`);

  // Group mat costs by order ID to get total mat cost per order
  const orderMatCosts = new Map();
  
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split('\t');
    if (cols.length < 10) continue;

    const orderID = cols[0]?.trim();
    const itemNumber = cols[1]?.trim();
    const vendor = cols[2]?.trim();
    const customer = cols[3]?.trim();
    const extPrice = cols[8]?.trim();
    const frameSize = cols[9]?.trim();

    if (!orderID || !extPrice) continue;

    const matCost = parseFloat(extPrice.replace('$', '').replace(',', '')) || 0;
    
    if (!orderMatCosts.has(orderID)) {
      orderMatCosts.set(orderID, {
        totalMatCost: 0,
        matDetails: [],
        customer: customer
      });
    }
    
    const orderData = orderMatCosts.get(orderID);
    orderData.totalMatCost += matCost;
    orderData.matDetails.push(`${itemNumber} (${vendor}) - ${frameSize} - $${extPrice}`);
  }

  // Update orders with mat data
  for (const [orderID, matInfo] of orderMatCosts) {
    try {
      // Get current order price (frame cost)
      const currentOrder = await pool.query('SELECT price, notes FROM orders WHERE tracking_id = $1', [orderID]);
      
      if (currentOrder.rows.length > 0) {
        const framePrice = currentOrder.rows[0].price || 0;
        const frameNotes = currentOrder.rows[0].notes || '';
        const totalPrice = framePrice + matInfo.totalMatCost;
        
        const matNotes = matInfo.matDetails.join('; ');
        const combinedNotes = frameNotes ? `${frameNotes} | Mat: ${matNotes}` : `Mat: ${matNotes}`;
        
        await pool.query(`
          UPDATE orders 
          SET price = $1, notes = $2
          WHERE tracking_id = $3
        `, [totalPrice, combinedNotes]);
        
        updated++;
        if (updated % 10 === 0) {
          console.log(`Updated ${updated} orders with authentic mat data...`);
        }
      }
    } catch (error) {
      // Continue on errors
    }
  }

  console.log(`Mat data update complete! Updated ${updated} orders with authentic mat costs and details.`);
  await pool.end();
}

updateMatData().catch(console.error);