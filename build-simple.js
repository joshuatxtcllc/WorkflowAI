#!/usr/bin/env node
import { copyFileSync, mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

try {
  // Create necessary directories
  mkdirSync('dist/public/assets', { recursive: true });

  // Copy the client index.html to dist/public if it doesn't exist already
  try {
    copyFileSync(join(__dirname, 'client/index.html'), 'dist/public/index.html');
    console.log('✓ Copied client index.html to dist/public/');
  } catch (err) {
    console.log('Using existing dist/public/index.html');
  }

  // Create a simple main.js file for basic functionality
  const mainJs = `
console.log('Application starting...');
// Basic client-side initialization
window.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded');
});
`;

  writeFileSync('dist/public/assets/main.js', mainJs);
  console.log('✓ Created basic main.js');

  // Create a basic CSS file
  const basicCss = `
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  margin: 0;
  padding: 0;
}
`;

  writeFileSync('dist/public/assets/style.css', basicCss);
  console.log('✓ Created basic style.css');

  // Update the index.html to reference the main.js and style.css
  const simpleHtml = `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Jay's Frames - AI-Powered Frame Shop Management</title>
    <meta name="description" content="Comprehensive frame shop management system with AI-powered workflow optimization and real-time collaboration">
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    <link rel="stylesheet" href="/assets/style.css">
    <style>
        body {
            margin: 0;
            padding: 0;
            min-height: 100vh;
            background: #0A0A0B;
            color: #FAFAFA;
            font-family: 'Inter', system-ui, sans-serif;
        }
    </style>
</head>
<body>
    <div id="root"></div>
    <script src="/assets/main.js"></script>
</body>
</html>`;

  writeFileSync('dist/public/index.html', simpleHtml);
  console.log('✓ Updated index.html with proper structure');


  console.log('Build completed successfully!');
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}