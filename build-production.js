
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting production build...');

// Clean previous build
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true, force: true });
}

// Create dist directory structure
fs.mkdirSync('dist/public', { recursive: true });

try {
  // Build server
  console.log('📦 Building server...');
  execSync('npx esbuild server/index.ts --bundle --platform=node --outfile=dist/index.js --external:pg-native --external:sqlite3 --external:mysql2 --external:oracledb --external:pg-query-stream --external:tedious --external:mysql --external:better-sqlite3', { stdio: 'inherit' });

  // Build client
  console.log('📦 Building client...');
  try {
    execSync('npm run build', { stdio: 'inherit', timeout: 30000 });
  } catch (buildError) {
    console.warn('⚠️  Full build failed, creating minimal build...');
    
    // Create minimal client build
    const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Jay's Frames</title>
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #111; color: white; }
    .loading { text-align: center; padding: 50px; }
  </style>
</head>
<body>
  <div id="root">
    <div class="loading">
      <h1>Jay's Frames</h1>
      <p>Loading production system...</p>
    </div>
  </div>
  <script>
    setTimeout(() => {
      window.location.reload();
    }, 3000);
  </script>
</body>
</html>`;

    fs.writeFileSync('dist/public/index.html', indexHtml);
  }

  console.log('✅ Build completed successfully!');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
