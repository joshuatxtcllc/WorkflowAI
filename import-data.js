const fs = require('fs');
const path = require('path');

// Read the TSV file
const tsvPath = path.join(__dirname, 'attached_assets', 'New Custom Frame Datasbase - Moulding (1).tsv');
const fileContent = fs.readFileSync(tsvPath, 'utf8');

// Send import request
const importData = async () => {
  try {
    const response = await fetch('http://localhost:5000/api/import/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'connect.sid=your-session-cookie' // You'll need to get this from browser
      },
      body: JSON.stringify({ fileContent })
    });

    const result = await response.json();
    console.log('Import Result:', result);
  } catch (error) {
    console.error('Import failed:', error);
  }
};

importData();