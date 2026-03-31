
import Database from 'better-sqlite3';
import { existsSync } from 'fs';
import { join } from 'path';
import HealthCheckSystem from '../src/core/health-checks';
import GovernanceSystem from '../src/governance/core/governance_system';

const GOALIE_DIR = '.goalie-verification';
const DB_PATH = join(GOALIE_DIR, 'governance.db');

async function verifyP0() {
  console.log('--- Starting P0 Verification ---');

  if (!existsSync(GOALIE_DIR)) {
    require('fs').mkdirSync(GOALIE_DIR, { recursive: true });
  }

  // P0-TRUTH: GovernanceSystem
  console.log('\n[P0-TRUTH] Verifying GovernanceSystem...');
  const govSystem = new GovernanceSystem({
    goalieDir: GOALIE_DIR,
    autoLogDecisions: true,
    strictMode: true
  });

  // Mock pattern events for testing
  const patternMetricsPath = join(GOALIE_DIR, 'pattern_metrics.jsonl');
  const mockEvent = {
    ts: new Date().toISOString(),
    pattern: 'safe-degrade',
    mode: 'advisory',
    gate: 'health',
    circle: 'planning',
    alignment_score: { overall_drift: 0.05 }
  };
  require('fs').writeFileSync(patternMetricsPath, JSON.stringify(mockEvent) + '\n');

  const compliance = await govSystem.checkCompliance();
  console.log('Compliance Check Result:', compliance.length > 0 ? 'PASS' : 'FAIL');
  if (compliance.length === 0) {
      console.error('Expected compliance checks to return results');
      process.exit(1);
  }

  // P0-TIME: DecisionAudit
  console.log('\n[P0-TIME] Verifying DecisionAudit...');
  // Force a decision to test logging
  const actionValid = await govSystem.validateAction('test-action', { circle: 'verification' });
  console.log('Action Validation:', actionValid);

  // Check DB
  const db = new Database(DB_PATH);
  const row = db.prepare('SELECT * FROM decision_audit ORDER BY id DESC LIMIT 1').get() as any;

  if (row) {
    console.log('Logged Decision:', row.decision_id);
    console.log('Table: decision_audit');
    console.log('Columns:', Object.keys(row).join(', '));
    if (row.evidence_chain === null && row.alternatives === null) {
         console.log('Note: evidence_chain/alternatives are null (expected for this test)');
    }
  } else {
    console.error('Failed to log decision to DB');
    process.exit(1);
  }
  db.close();

  // P0-LIVE: HealthCheck
  console.log('\n[P0-LIVE] Verifying HealthCheckSystem...');
  const healthSystem = new HealthCheckSystem({
      baseIntervalMs: 1000,
      minIntervalMs: 100,
      maxIntervalMs: 2000
  });

  // Simulate normal
  console.log('Initial Interval:', healthSystem.getAdaptiveInterval());

  // Simulate stress (failures)
  for (let i = 0; i < 10; i++) {
      healthSystem.calculateAnomalyRate([{ success: false, latency: 5000 }]);
  }

  const stressedInterval = healthSystem.getAdaptiveInterval();
  console.log('Stressed Interval:', stressedInterval);

  if (stressedInterval < 1000) {
      console.log('PASS: Interval decreased under stress');
  } else {
      console.error('FAIL: Interval did not decrease enough');
      process.exit(1);
  }

  console.log('\n--- P0 Verification Complete ---');
}

verifyP0().catch(console.error);
