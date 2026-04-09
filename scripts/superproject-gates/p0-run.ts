#!/usr/bin/env npx ts-node
/**
 * P0 Run Script
 * Run skills setup and validation
 */

import { setupRun1Skills } from '../domain/skills/skills-manager.ts';

async function main() {
  console.log('Setting up Run 1 skills...');
  setupRun1Skills();
  console.log('Run 1 setup complete.');
}

main();