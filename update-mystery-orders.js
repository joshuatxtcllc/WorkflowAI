const { execSync } = require('child_process');

// Simple script to update mystery orders to MYSTERY_UNCLAIMED status
const updateQuery = `
UPDATE orders 
SET status = 'MYSTERY_UNCLAIMED' 
WHERE notes LIKE '%Mystery Drawer%' OR customer_name = 'Mystery Customer';
`;

console.log('Updating mystery orders to show in mystery column...');
console.log('SQL Query:', updateQuery);

// Note: This would need to be run through the database connection
// For now, we'll create an API endpoint to handle this update