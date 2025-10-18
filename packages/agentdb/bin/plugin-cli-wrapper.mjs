#!/usr/bin/env node
/**
 * Wrapper to load the ES module plugin CLI
 * This file uses .mjs extension to signal ES module to Node.js
 */
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import the plugin CLI ES module (.mjs version)
const cliPath = join(__dirname, '../dist/cli/plugin-cli.mjs');
import(pathToFileURL(cliPath).href).catch(err => {
  console.error('Failed to load plugin CLI:', err);
  process.exit(1);
});

function pathToFileURL(path) {
  return new URL(`file://${path.startsWith('/') ? '' : '/'}${path}`);
}
