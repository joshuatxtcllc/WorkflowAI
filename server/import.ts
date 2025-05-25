import { parse } from 'csv-parse/sync';
import { storage } from './storage';
import { nanoid } from 'nanoid';

interface ImportRow {
  'Order ID': string;
  'Item Number': string;
  'Vendor': string;
  'Customer Name': string;
  'Material': string;
  'QTY': string;
  'Ft Nded': string;
  'Ext cost': string;
  'Frame Size': string;
  'Due Date': string;
  'Stock Savings': string;
  'Notes': string;
  'Order Progress': string;
  'Order Processed': string;
  'Stock': string;
  'Ordered': string;
  'Arrived': string;
  'F Cut': string;
  'G Cut': string;
  'M Cut': string;
  'Prepped': string;
  'Done': string;
  'Delivered': string;
  'Delayed': string;
  'SMS Sent': string;
  'SMS Message': string;
  'Active': string;
  [key: string]: string;
}

function determineOrderStatus(row: ImportRow): string {
  if (row['Delivered'] === 'TRUE') return 'PICKED_UP';
  if (row['Done'] === 'TRUE') return 'COMPLETED';
  if (row['Prepped'] === 'TRUE') return 'PREPPED';
  if (row['M Cut'] === 'TRUE') return 'MAT_CUT';
  if (row['F Cut'] === 'TRUE') return 'FRAME_CUT';
  if (row['Arrived'] === 'TRUE') return 'MATERIALS_ARRIVED';
  if (row['Ordered'] === 'TRUE') return 'MATERIALS_ORDERED';
  if (row['Order Processed'] === 'TRUE') return 'ORDER_PROCESSED';
  return 'ORDER_PROCESSED';
}

function parseFrameSize(frameSize: string): { width: number; height: number } | null {
  if (!frameSize) return null;
  
  // Parse sizes like "20 1/8 X 27 1/8" or "16 X 20"
  const match = frameSize.match(/([0-9\s\/]+)\s*[Xx]\s*([0-9\s\/]+)/);
  if (!match) return null;
  
  const parseSize = (sizeStr: string): number => {
    // Handle fractions like "20 1/8"
    const parts = sizeStr.trim().split(' ');
    let size = parseFloat(parts[0]) || 0;
    if (parts[1]) {
      const fraction = parts[1].split('/');
      if (fraction.length === 2) {
        size += parseFloat(fraction[0]) / parseFloat(fraction[1]);
      }
    }
    return size;
  };
  
  return {
    width: parseSize(match[1]),
    height: parseSize(match[2])
  };
}

function estimateHours(frameSize: string, orderType: string): number {
  const size = parseFrameSize(frameSize);
  if (!size) return 2; // Default estimate
  
  const area = size.width * size.height;
  
  // Base hours calculation based on frame area and complexity
  let baseHours = Math.max(1, Math.ceil(area / 100));
  
  // Adjust for frame type complexity
  if (orderType.includes('SHADOWBOX')) baseHours *= 2;
  if (orderType.includes('MAT')) baseHours *= 1.5;
  
  return Math.min(baseHours, 20); // Cap at 20 hours
}

function parseDueDate(dateStr: string): Date {
  if (!dateStr) return new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // Default 2 weeks
  
  try {
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) : date;
  } catch {
    return new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  }
}

function extractOrderType(notes: string, material: string): 'FRAME' | 'MAT' | 'SHADOWBOX' {
  const combined = `${notes} ${material}`.toLowerCase();
  if (combined.includes('shadowbox') || combined.includes('shadow box')) return 'SHADOWBOX';
  if (combined.includes('mat') || combined.includes('matting')) return 'MAT';
  return 'FRAME';
}

export async function importOrdersFromTSV(fileContent: string): Promise<{ 
  customersCreated: number; 
  ordersCreated: number; 
  errors: string[] 
}> {
  const errors: string[] = [];
  let customersCreated = 0;
  let ordersCreated = 0;
  
  try {
    // Parse TSV data
    const records: ImportRow[] = parse(fileContent, {
      columns: true,
      delimiter: '\t',
      skip_empty_lines: true,
      trim: true
    });

    console.log(`Processing ${records.length} records...`);
    
    // Track unique customers
    const customerMap = new Map<string, string>();
    
    for (const row of records) {
      try {
        // Skip empty or invalid rows
        if (!row['Customer Name'] || !row['Order ID']) {
          continue;
        }
        
        // Create or get customer
        const customerName = row['Customer Name'].trim();
        let customerId = customerMap.get(customerName);
        
        if (!customerId) {
          try {
            // Check if customer already exists
            const existingCustomer = await storage.getCustomerByEmail(`${customerName.toLowerCase().replace(/\s+/g, '.')}@frames.local`);
            
            if (existingCustomer) {
              customerId = existingCustomer.id;
            } else {
              // Create new customer
              const customer = await storage.createCustomer({
                name: customerName,
                email: `${customerName.toLowerCase().replace(/\s+/g, '.')}@frames.local`,
                phone: null,
                address: null,
                preferences: {}
              });
              customerId = customer.id;
              customersCreated++;
            }
            
            customerMap.set(customerName, customerId);
          } catch (err) {
            errors.push(`Failed to create customer ${customerName}: ${err}`);
            continue;
          }
        }
        
        // Parse order data
        const frameSize = row['Frame Size'] || '';
        const orderType = extractOrderType(row['Notes'] || '', row['Material'] || '');
        const dueDate = parseDueDate(row['Due Date']);
        const estimatedHours = estimateHours(frameSize, orderType);
        const status = determineOrderStatus(row);
        
        // Parse cost
        let price = 0;
        if (row['Ext cost']) {
          const costStr = row['Ext cost'].replace(/[\$,]/g, '');
          price = parseFloat(costStr) || 0;
        }
        
        // Create order
        try {
          const order = await storage.createOrder({
            trackingId: `JF-${row['Order ID']}`,
            customerId: customerId,
            orderType: orderType,
            // description: `${row['Item Number']} - ${frameSize}`,
            dueDate: dueDate,
            estimatedHours: estimatedHours,
            price: price,
            status: status as any,
            priority: price > 5000 ? 'HIGH' : price > 2000 ? 'MEDIUM' : 'LOW',
            internalNotes: `${row['Notes'] || ''} | Vendor: ${row['Vendor']}, Material: ${row['Material']}, QTY: ${row['QTY']}`
          });
          
          // Create status history
          await storage.createStatusHistory({
            orderId: order.id,
            toStatus: status,
            changedBy: 'import-system',
            reason: 'Imported from existing data'
          });
          
          // Create material entry
          if (row['Material'] && row['Item Number']) {
            await storage.createMaterial({
              orderId: order.id,
              type: 'FRAME',
              subtype: row['Item Number'],
              quantity: parseInt(row['QTY']) || 1,
              unit: 'piece',
              ordered: row['Ordered'] === 'TRUE',
              arrived: row['Arrived'] === 'TRUE',
              cost: price,
              notes: `Vendor: ${row['Vendor'] || 'Unknown'}. ${row['Stock Savings'] || ''}`.trim()
            });
          }
          
          ordersCreated++;
        } catch (err) {
          errors.push(`Failed to create order ${row['Order ID']}: ${err}`);
        }
        
      } catch (err) {
        errors.push(`Error processing row ${row['Order ID']}: ${err}`);
      }
    }
    
  } catch (err) {
    errors.push(`Failed to parse TSV file: ${err}`);
  }
  
  return {
    customersCreated,
    ordersCreated,
    errors
  };
}