#!/usr/bin/env node

/**
 * Installation verification script
 * Ensures package is correctly installed and functional
 */

const path = require('path');
const fs = require('fs');

console.log('🔍 Verifying SQLiteVector installation...\n');

// Check package.json
const packagePath = path.join(__dirname, '..', 'package.json');
if (!fs.existsSync(packagePath)) {
  console.error('❌ package.json not found');
  process.exit(1);
}
console.log('✅ package.json found');

const pkg = require(packagePath);
console.log(`   Version: ${pkg.version}`);
console.log(`   License: ${pkg.license}`);

// Check dist directory
const distPath = path.join(__dirname, '..', 'dist');
if (!fs.existsSync(distPath)) {
  console.error('❌ dist/ directory not found - run npm run build');
  process.exit(1);
}
console.log('✅ dist/ directory exists');

// Check main exports
const mainFile = path.join(__dirname, '..', pkg.main);
const moduleFile = path.join(__dirname, '..', pkg.module);
const typesFile = path.join(__dirname, '..', pkg.types);

if (!fs.existsSync(mainFile)) {
  console.error(`❌ Main file not found: ${pkg.main}`);
  process.exit(1);
}
console.log(`✅ Main file exists: ${pkg.main}`);

if (!fs.existsSync(moduleFile)) {
  console.error(`❌ Module file not found: ${pkg.module}`);
  process.exit(1);
}
console.log(`✅ Module file exists: ${pkg.module}`);

if (!fs.existsSync(typesFile)) {
  console.error(`❌ Types file not found: ${pkg.types}`);
  process.exit(1);
}
console.log(`✅ Types file exists: ${pkg.types}`);

// Check CLI
const cliPath = path.join(__dirname, '..', 'bin', 'sqlite-vector.js');
if (!fs.existsSync(cliPath)) {
  console.error('❌ CLI not found: bin/sqlite-vector.js');
  process.exit(1);
}
console.log('✅ CLI exists: bin/sqlite-vector.js');

// Check CLI is executable
try {
  fs.accessSync(cliPath, fs.constants.X_OK);
  console.log('✅ CLI is executable');
} catch (error) {
  console.warn('⚠️  CLI may not be executable - this is OK on Windows');
}

// Check license files
const mitLicense = path.join(__dirname, '..', 'LICENSE-MIT');
const apacheLicense = path.join(__dirname, '..', 'LICENSE-APACHE');

if (!fs.existsSync(mitLicense)) {
  console.error('❌ LICENSE-MIT not found');
  process.exit(1);
}
console.log('✅ LICENSE-MIT exists');

if (!fs.existsSync(apacheLicense)) {
  console.error('❌ LICENSE-APACHE not found');
  process.exit(1);
}
console.log('✅ LICENSE-APACHE exists');

// Try to import the module
console.log('\n📦 Testing module import...');
try {
  const lib = require(mainFile);

  if (!lib.SqliteVectorDB) {
    console.error('❌ SqliteVectorDB not exported');
    process.exit(1);
  }
  console.log('✅ SqliteVectorDB exported');

  if (!lib.createConfig) {
    console.error('❌ createConfig not exported');
    process.exit(1);
  }
  console.log('✅ createConfig exported');

  if (!lib.Presets) {
    console.error('❌ Presets not exported');
    process.exit(1);
  }
  console.log('✅ Presets exported');

  console.log('✅ Module imports successfully');
} catch (error) {
  console.error('❌ Failed to import module:', error.message);
  process.exit(1);
}

// Summary
console.log('\n✨ Installation verified successfully!');
console.log('\nNext steps:');
console.log('  1. npm publish --dry-run  (test publishing)');
console.log('  2. npm publish             (publish to npm)');
console.log('  3. npx sqlite-vector help  (test CLI)');
console.log('');
