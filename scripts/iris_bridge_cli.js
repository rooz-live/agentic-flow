#!/usr/bin/env node
/**
 * CLI wrapper for iris_bridge.ts
 *
 * Usage: node scripts/iris_bridge_cli.js <command> [args...]
 */

const { captureIrisMetrics } = require('../tools/federation/iris_bridge');

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: iris_bridge_cli.js <command> [args...]');
    process.exit(1);
  }

  const command = args[0];
  const commandArgs = args.slice(1);

  try {
    const event = await captureIrisMetrics(command, commandArgs);
    console.log(`[iris_bridge] Logged ${command} metrics to .goalie/metrics_log.jsonl`);
    process.exit(0);
  } catch (error) {
    console.error(`[iris_bridge] Error:`, error.message);
    process.exit(1);
  }
}

main();
