#!/usr/bin/env tsx
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { GovernanceSystem } from '../../src/governance/governance-system';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  const projectRoot = path.resolve(__dirname, '..', '..');
  const gov = new GovernanceSystem(projectRoot);
  const res = await gov.checkCompliance();
  console.log(JSON.stringify(res, null, 2));
  // non-zero if critical violations exist
  const hasCritical = res.violations.some(v => v.severity === 'critical');
  process.exit(hasCritical ? 2 : 0);
}

main().catch(err => { console.error(err); process.exit(1); });