import { execSync } from 'child_process';
import path from 'path';
import { logPattern } from './pattern-metrics-logger';
import type { PatternMetric } from './types';

const WORKSPACE_ROOT = path.resolve(process.cwd(), '../../../..');

function runQEGates(): boolean {
  try {
    const output = execSync('npx agentic-qe', { 
      cwd: WORKSPACE_ROOT, 
      stdio: 'pipe', 
      timeout: 60000,
      encoding: 'utf8'
    });
    console.log('QE Gates passed:\\n' + output);
    logPattern({ pattern: 'qe_gate', triggers: 0, circle: 'testing', description: 'QE gates passed - integrated for PDA Do phase per architect plan' });
    return true;
  } catch (error: any) {
    console.error('QE Gates failed:', error.message);
    logPattern({ pattern: 'qe_gate_fail', triggers: 1, circle: 'testing', description: error.message || 'QE execution failed' });
    return false;
  }
}

if (require.main === module) {
  const passed = runQEGates();
  process.exit(passed ? 0 : 1);
}