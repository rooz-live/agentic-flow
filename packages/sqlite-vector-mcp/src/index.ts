#!/usr/bin/env node

/**
 * SQLiteVector MCP Server - Entry Point
 * Production-ready MCP server for Claude Code integration
 */

import { SQLiteVectorMCPServer } from './server.js';

async function main() {
  const server = new SQLiteVectorMCPServer();

  try {
    await server.start();
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();
