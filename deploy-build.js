#!/usr/bin/env node
import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';

console.log('🚀 Starting deployment build process...');

try {
  // Ensure dist directory exists
  if (!existsSync('dist')) {
    mkdirSync('dist', { recursive: true });
  }

  // Step 1: Build the server
  console.log('📦 Building server...');
  execSync('npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist', { stdio: 'inherit' });
  console.log('✓ Server built successfully');

  // Step 2: Create simple client build
  console.log('🎨 Creating client build...');
  execSync('node build-simple.js', { stdio: 'inherit' });
  console.log('✓ Client build created');

  // Step 3: Try to build the full client if possible (with timeout)
  console.log('🔨 Attempting full client build (with timeout)...');
  try {
    execSync('cd client && timeout 120 npx vite build --outDir ../dist/public --emptyOutDir', { 
      stdio: 'inherit',
      timeout: 120000 // 2 minutes timeout
    });
    console.log('✓ Full client build completed successfully');
  } catch (error) {
    console.log('⚠️  Full client build timed out or failed, using simple build');
    // Ensure we still have a working simple build
    execSync('node build-simple.js', { stdio: 'inherit' });
  }

  console.log('🎉 Deployment build completed successfully!');
  console.log('📁 Build artifacts:');
  console.log('   - dist/index.js (server)');
  console.log('   - dist/public/ (client files)');

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}