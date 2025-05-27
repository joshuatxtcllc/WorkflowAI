import { storage } from './storage.js';
import * as fs from 'fs';
import * as path from 'path';

interface AuthenticOrderRow {
  'Date Due': string;
  'Invoice': string;
  'Order ID': string;
  'Qty': string;
  'Name': string;
  'Phone': string;
  'Designer': string;
  'Location': string;
  'Description': string;
  'Order Type': string;
  'Order Progress': string;
  'Paid In Full': string;
  'Order Processed': string;
  'Ordered': string;
  'Arrived': string;
  'Cut': string;
  'M Cut': string;
  'G Cut': string;
  'F & M Cut': string;
  'Prepped': string;
  'Done': string;
  'Delivered': string;
  'Delayed': string;
  'Balance Due': string;
  'Image': string;
  'Real Due Date': string;
  'SMS Message': string;
  'SMS Sent': string;
  'Pick Up SMS': string;
  'Pick Up SMS Sent': string;
  'Frame Location': string;
  'Active': string;
  'Notes': string;
  [key: string]: string;
}

function parseAuthenticStatus(row: AuthenticOrderRow): 'ORDER_PROCESSED' | 'MATERIALS_ORDERED' | 'MATERIALS_ARRIVED' | 'FRAME_CUT' | 'MAT_CUT' | 'PREPPED' | 'COMPLETED' | 'PICKED_UP' {
  // Parse progress percentage from strings like "████████░░ 80%"
  const progressStr = row['Order Progress'];
  
  if (row['Delivered'] === 'Y' || row['Done'] === 'Y') {
    return 'PICKED_UP';
  }
  
  if (row['Prepped'] === 'Y') {
    return 'ASSEMBLY_COMPLETE';
  }
  
  if (row['F & M Cut'] === 'Y' || (row['Cut'] === 'Y' && row['M Cut'] === 'Y')) {
    return 'PREPPED';
  }
  
  if (row['M Cut'] === 'Y') {
    return 'MAT_CUT';
  }
  
  if (row['G Cut'] === 'Y') {
    return 'GLASS_CUT';
  }
  
  if (row['Cut'] === 'Y') {
    return 'FRAME_CUT';
  }
  
  if (row['Arrived'] === 'Y') {
    return 'MATERIALS_ARRIVED';
  }
  
  if (row['Ordered'] === 'Y') {
    return 'MATERIALS_ORDERED';
  }
  
  if (row['Order Processed'] === 'Y') {
    return 'ORDER_PROCESSED';
  }
  
  return 'ORDER_PROCESSED';
}

function parseOrderType(orderTypeStr: string): 'FRAME' | 'MAT' | 'SHADOWBOX' {
  const type = orderTypeStr.toLowerCase();
  if (type.includes('canvas') || type.includes('acrylic')) {
    return 'SHADOWBOX';
  }
  if (type.includes('mat')) {
    return 'MAT';
  }
  return 'FRAME';
}

function parseDueDate(dateStr: string): Date {
  if (!dateStr) return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
  
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date;
    }
  } catch (e) {
    // Fallback for invalid dates
  }
  
  return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
}

function estimateHours(description: string, orderType: string): number {
  const baseHours = orderType === 'SHADOWBOX' ? 4.5 : orderType === 'MAT' ? 1.5 : 3.0;
  
  // Add complexity based on description keywords
  let complexity = 1.0;
  if (description.toLowerCase().includes('custom')) complexity += 0.5;
  if (description.toLowerCase().includes('large')) complexity += 0.3;
  if (description.toLowerCase().includes('complex')) complexity += 0.7;
  
  return Math.round(baseHours * complexity * 10) / 10;
}

function estimatePrice(orderType: string, description: string): number {
  const basePrice = orderType === 'SHADOWBOX' ? 450 : orderType === 'MAT' ? 150 : 250;
  
  // Add pricing based on description complexity
  let multiplier = 1.0;
  if (description.toLowerCase().includes('large')) multiplier += 0.4;
  if (description.toLowerCase().includes('custom')) multiplier += 0.3;
  if (description.toLowerCase().includes('premium')) multiplier += 0.5;
  
  return Math.round(basePrice * multiplier);
}

export async function importAuthenticProductionData(fileContent: string): Promise<{ 
  importedCustomers: number; 
  importedOrders: number; 
  errors: string[] 
}> {
  console.log('Starting import of authentic production data...');
  
  const lines = fileContent.split('\n');
  const headers = lines[0].split('\t');
  const errors: string[] = [];
  let importedCustomers = 0;
  let importedOrders = 0;
  
  // Track unique customers
  const customerMap = new Map<string, any>();
  
  // Process data more carefully, looking for complete rows
  let currentRow = '';
  let rowData: AuthenticOrderRow = {};
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Try to detect if this is a new row (starts with a date)
    const datePattern = /^\d{1,2}\/\d{1,2}\/\d{4}/;
    const isNewRow = datePattern.test(line);
    
    if (isNewRow && currentRow) {
      // Process the previous complete row
      try {
        const values = currentRow.split('\t');
        rowData = {};
        
        headers.forEach((header, index) => {
          rowData[header] = values[index] || '';
        });
        
        // Process this row if it has essential data
        if (rowData['Name'] && rowData['Invoice'] && rowData['Order ID']) {
          await processAuthenticOrder(rowData, customerMap);
          if (!customerMap.has(`${rowData['Name']}-${rowData['Phone']}`)) {
            importedCustomers++;
          }
          importedOrders++;
        }
      } catch (error) {
        errors.push(`Row processing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    if (isNewRow) {
      currentRow = line;
    } else {
      currentRow += ' ' + line;
    }
  }
  
  // Process the last row
  if (currentRow) {
    try {
      const values = currentRow.split('\t');
      rowData = {};
      
      headers.forEach((header, index) => {
        rowData[header] = values[index] || '';
      });
      
      if (rowData['Name'] && rowData['Invoice'] && rowData['Order ID']) {
        await processAuthenticOrder(rowData, customerMap);
        if (!customerMap.has(`${rowData['Name']}-${rowData['Phone']}`)) {
          importedCustomers++;
        }
        importedOrders++;
      }
    } catch (error) {
      errors.push(`Final row error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  console.log(`Import completed: ${importedCustomers} customers, ${importedOrders} orders`);
  return { importedCustomers, importedOrders, errors };
}

async function processAuthenticOrder(row: AuthenticOrderRow, customerMap: Map<string, any>): Promise<void> {
      
      // Create unique customer if not exists
      const customerKey = `${row['Name']}-${row['Phone']}`;
      if (!customerMap.has(customerKey)) {
        const customerId = `cust-${row['Order ID']}`;
        const customer = {
          id: customerId,
          name: row['Name'],
          email: `${row['Name'].toLowerCase().replace(/\s+/g, '.')}@email.com`,
          phone: row['Phone'] || '',
          address: row['Location'] || '',
          preferences: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        await storage.createCustomer(customer);
        customerMap.set(customerKey, customer);
        importedCustomers++;
      }
      
      // Create order
      const customer = customerMap.get(customerKey);
      const orderType = parseOrderType(row['Order Type']);
      const status = parseAuthenticStatus(row);
      const dueDate = parseDueDate(row['Real Due Date'] || row['Date Due']);
      const estimatedHours = estimateHours(row['Description'], orderType);
      const price = estimatePrice(orderType, row['Description']);
      
      const order = {
        id: `ord-${row['Order ID']}`,
        trackingId: `TRK-${row['Order ID']}`,
        customerId: customer.id,
        orderType,
        status,
        dueDate,
        estimatedHours,
        price,
        notes: row['Description'] || '',
        priority: 'MEDIUM' as const,
        invoiceNumber: row['Invoice'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      await storage.createOrder(order);
      
      // Create status history
      await storage.createStatusHistory({
        orderId: order.id,
        toStatus: status,
        changedBy: 'production-system',
        reason: 'Authentic production data imported',
      });
      
      importedOrders++;
      
    } catch (error) {
      errors.push(`Line ${i}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  console.log(`Import completed: ${importedCustomers} customers, ${importedOrders} orders`);
  return { importedCustomers, importedOrders, errors };
}