import { db } from './db';
import { storage } from './storage';
import fs from 'fs';
import { parse } from 'csv-parse/sync';

interface TSVRow {
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

function parseBoolean(value: string): boolean {
  return value?.toUpperCase() === 'TRUE' || value === '1';
}

function parseFrameSize(frameSize: string): { width: number; height: number } | null {
  if (!frameSize || frameSize.trim() === '') return null;
  
  // Clean the frame size string
  const cleaned = frameSize.replace(/['"]/g, '').trim();
  
  // Try to match patterns like "20 1/8 X 27 1/8" or "20.125 X 27.125"
  const patterns = [
    /(\d+(?:\s+\d+\/\d+)?)\s*[Xx]\s*(\d+(?:\s+\d+\/\d+)?)/,
    /(\d+(?:\.\d+)?)\s*[Xx]\s*(\d+(?:\.\d+)?)/
  ];
  
  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match) {
      const width = parseFraction(match[1].trim());
      const height = parseFraction(match[2].trim());
      if (width > 0 && height > 0) {
        return { width, height };
      }
    }
  }
  
  return null;
}

function parseFraction(str: string): number {
  // Handle fractions like "20 1/8" or just "20.125"
  if (str.includes('/')) {
    const parts = str.trim().split(/\s+/);
    if (parts.length === 2) {
      // Whole number and fraction
      const whole = parseInt(parts[0]);
      const [num, den] = parts[1].split('/').map(Number);
      return whole + (num / den);
    } else if (parts.length === 1 && parts[0].includes('/')) {
      // Just fraction
      const [num, den] = parts[0].split('/').map(Number);
      return num / den;
    }
  }
  
  return parseFloat(str) || 0;
}

function determineOrderStatus(row: TSVRow): 'ORDER_PROCESSED' | 'MATERIALS_ORDERED' | 'MATERIALS_ARRIVED' | 'FRAME_CUT' | 'GLASS_CUT' | 'MAT_CUT' | 'ASSEMBLY_COMPLETE' | 'READY_FOR_PICKUP' | 'PICKED_UP' {
  // Check completion stages in order
  if (parseBoolean(row['Delivered'])) return 'PICKED_UP';
  if (parseBoolean(row['Done'])) return 'READY_FOR_PICKUP';
  if (parseBoolean(row['Prepped'])) return 'ASSEMBLY_COMPLETE';
  if (parseBoolean(row['M Cut'])) return 'MAT_CUT';
  if (parseBoolean(row['G Cut'])) return 'GLASS_CUT';
  if (parseBoolean(row['F Cut'])) return 'FRAME_CUT';
  if (parseBoolean(row['Arrived'])) return 'MATERIALS_ARRIVED';
  if (parseBoolean(row['Ordered'])) return 'MATERIALS_ORDERED';
  if (parseBoolean(row['Order Processed'])) return 'ORDER_PROCESSED';
  
  return 'ORDER_PROCESSED'; // Default status
}

function parseDueDate(dateStr: string): Date {
  if (!dateStr || dateStr.trim() === '') {
    // Default to 2 weeks from now if no date
    return new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  }
  
  try {
    // Try to parse the date
    const parsed = new Date(dateStr);
    if (isNaN(parsed.getTime())) {
      // If parsing fails, default to 2 weeks from now
      return new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    }
    return parsed;
  } catch {
    return new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  }
}

function estimateHours(frameSize: string, notes: string): number {
  const size = parseFrameSize(frameSize);
  if (!size) return 2; // Default hours
  
  const area = size.width * size.height;
  let baseHours = 1;
  
  // Estimate based on frame area
  if (area > 1000) baseHours = 4;
  else if (area > 500) baseHours = 3;
  else if (area > 200) baseHours = 2;
  else baseHours = 1.5;
  
  // Add complexity based on notes
  const notesLower = notes.toLowerCase();
  if (notesLower.includes('complex') || notesLower.includes('difficult')) {
    baseHours += 1;
  }
  
  return Math.round(baseHours * 10) / 10; // Round to 1 decimal
}

function parsePrice(priceStr: string): number {
  if (!priceStr || priceStr.trim() === '') return 0;
  
  // Remove currency symbols and parse
  const cleaned = priceStr.replace(/[$,]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

export async function importAllRealOrders() {
  try {
    console.log('Starting import of all real orders...');
    
    // Read the TSV file
    const filePath = '../attached_assets/New Custom Frame Datasbase - Moulding (1).tsv';
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    
    // Parse TSV data
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      delimiter: '\t',
      trim: true
    }) as TSVRow[];
    
    console.log(`Found ${records.length} orders to import`);
    
    let importedCount = 0;
    let skippedCount = 0;
    
    for (const row of records) {
      try {
        // Skip if essential data is missing
        if (!row['Order ID'] || !row['Customer Name'] || !row['Item Number']) {
          console.log(`Skipping row with missing essential data: ${row['Order ID']}`);
          skippedCount++;
          continue;
        }
        
        // Create or get customer
        let customer = await storage.getCustomerByEmail(`${row['Customer Name'].toLowerCase().replace(/\s+/g, '')}@frames.local`);
        
        if (!customer) {
          customer = await storage.createCustomer({
            name: row['Customer Name'],
            email: `${row['Customer Name'].toLowerCase().replace(/\s+/g, '')}@frames.local`,
            phone: null,
            address: null,
            preferences: {}
          });
        }
        
        // Check if order already exists
        const existingOrder = await storage.getOrderByTrackingId(`TRK-${row['Order ID']}`);
        if (existingOrder) {
          console.log(`Order ${row['Order ID']} already exists, skipping`);
          skippedCount++;
          continue;
        }
        
        // Parse frame size
        const frameSize = parseFrameSize(row['Frame Size']);
        const dueDate = parseDueDate(row['Due Date']);
        const price = parsePrice(row['Ext cost']);
        const estimatedHours = estimateHours(row['Frame Size'], row['Notes'] || '');
        const status = determineOrderStatus(row);
        
        // Create order
        const order = await storage.createOrder({
          trackingId: `TRK-${row['Order ID']}`,
          customerId: customer.id,
          orderType: 'FRAME',
          status: status,
          priority: 'MEDIUM',
          dueDate: dueDate,
          estimatedHours: estimatedHours,
          price: price,
          notes: row['Notes'] || '',
          internalNotes: `Vendor: ${row['Vendor']}, Item: ${row['Item Number']}`,
          imageUrl: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400',
          description: `Custom frame for ${row['Customer Name']} - ${row['Frame Size']}`,
          invoiceNumber: `INV-${row['Order ID']}`,
          frameWidth: frameSize?.width || 0,
          frameHeight: frameSize?.height || 0
        });
        
        // Create material entry for the moulding
        await storage.createMaterial({
          type: 'FRAME',
          orderId: order.id,
          quantity: parseInt(row['QTY']) || 1,
          subtype: `${row['Vendor']} - ${row['Item Number']}`,
          unit: 'pieces',
          ordered: parseBoolean(row['Ordered']),
          arrived: parseBoolean(row['Arrived']),
          cost: price,
          notes: row['Stock Savings'] ? `Stock Savings: ${row['Stock Savings']}, Vendor: ${row['Vendor']}` : `Vendor: ${row['Vendor']}`
        });
        
        console.log(`✓ Imported order ${row['Order ID']} for ${row['Customer Name']}`);
        importedCount++;
        
      } catch (error) {
        console.error(`Error importing order ${row['Order ID']}:`, error);
        skippedCount++;
      }
    }
    
    console.log(`\n✅ Import completed!`);
    console.log(`📊 Imported: ${importedCount} orders`);
    console.log(`⏭️  Skipped: ${skippedCount} orders`);
    
    return { imported: importedCount, skipped: skippedCount, total: records.length };
    
  } catch (error) {
    console.error('Failed to import orders:', error);
    throw error;
  }
}