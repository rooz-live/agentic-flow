#!/usr/bin/env node

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const args = process.argv.slice(2);
const command = args[0];

if (command === 'mcp' && args[1] === 'start') {
  // Start MCP server
  const serverPath = join(__dirname, '..', 'dist', 'index.js');
  const server = spawn('node', [serverPath], {
    stdio: 'inherit',
  });

  server.on('error', (error) => {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  });

  process.on('SIGINT', () => {
    server.kill('SIGINT');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    server.kill('SIGTERM');
    process.exit(0);
  });
} else {
  console.log(`
SQLiteVector MCP Server

Usage:
  sqlite-vector-mcp mcp start    Start MCP server

Integration:
  claude mcp add sqlite-vector npx sqlite-vector-mcp mcp start

Documentation:
  https://github.com/ruvnet/agentic-flow/tree/main/packages/sqlite-vector-mcp
`);
}
