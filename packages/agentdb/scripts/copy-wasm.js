#!/usr/bin/env node
/**
 * Copy WASM files from sql.js to dist for npm distribution
 * This ensures browser examples work without external CDN dependencies
 */

const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, '../node_modules/sql.js/dist');
const targetDir = path.join(__dirname, '../dist/wasm');

// Create target directory if it doesn't exist
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// WASM files to copy
const wasmFiles = [
  'sql-wasm.wasm',
  'sql-wasm.js',
  'sql-wasm-debug.wasm',
  'sql-wasm-debug.js'
];

console.log('📦 Copying WASM files for browser distribution...\n');

let copiedCount = 0;
let errorCount = 0;

wasmFiles.forEach(file => {
  const source = path.join(sourceDir, file);
  const target = path.join(targetDir, file);

  try {
    if (fs.existsSync(source)) {
      fs.copyFileSync(source, target);
      const stats = fs.statSync(target);
      const sizeKB = (stats.size / 1024).toFixed(2);
      console.log(`✅ Copied ${file} (${sizeKB} KB)`);
      copiedCount++;
    } else {
      console.warn(`⚠️  Source file not found: ${file}`);
      errorCount++;
    }
  } catch (error) {
    console.error(`❌ Failed to copy ${file}:`, error.message);
    errorCount++;
  }
});

console.log(`\n📊 Summary: ${copiedCount} files copied, ${errorCount} errors`);

if (errorCount > 0) {
  process.exit(1);
}
