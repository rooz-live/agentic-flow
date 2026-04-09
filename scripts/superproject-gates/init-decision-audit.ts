#!/usr/bin/env node
/**
 * Initialize decision_audit_core table and generate sample entries
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = path.join(__dirname, '../../agentdb.db');

async function main() {
  const db = new Database(DB_PATH, { readonly: false, fileMustExist: false });
  
  // Create decision_audit_core table
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS decision_audit_core (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      decision_id TEXT UNIQUE NOT NULL,
      decision_type TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      actor TEXT NOT NULL,
      context_json TEXT,
      input_data_json TEXT,
      decision_outcome TEXT NOT NULL,
      rationale TEXT NOT NULL,
      confidence REAL NOT NULL,
      alternatives_json TEXT,
      impact_json TEXT,
      metadata_json TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `;
  
  const createIndexSQL = `
    CREATE INDEX IF NOT EXISTS idx_decision_audit_core_type ON decision_audit_core(decision_type);
    CREATE INDEX IF NOT EXISTS idx_decision_audit_core_timestamp ON decision_audit_core(timestamp);
    CREATE INDEX IF NOT EXISTS idx_decision_audit_core_actor ON decision_audit_core(actor);
  `;
  
  db.exec(createTableSQL);
  db.exec(createIndexSQL);
  console.log('[DecisionAudit] Table created successfully');
  
  // Insert sample decision audit entries from production cycle
  const sampleEntries = [
    {
      decision_id: 'prod-cycle-001',
      decision_type: 'strategy',
      timestamp: new Date().toISOString(),
      actor: 'orchestrator',
      context: JSON.stringify({ circle: 'orchestrator', mode: 'mutate' }),
      input_data_json: JSON.stringify({ iterations: 1, rollout_strategy: 'gradual' }),
      decision_outcome: 'approved',
      rationale: 'Production cycle executed in mutate mode with gradual rollout strategy',
      confidence: 95.0,
      alternatives_json: JSON.stringify([
        { option: 'immediate', score: 70, reason_rejected: 'Too risky without testing' },
        { option: 'gradual', score: 95, reason_rejected: '' }
      ]),
      impact_json: JSON.stringify({ affected_components: ['production-cycle'], risk_level: 'low', reversible: true }),
      metadata_json: JSON.stringify({ source: 'production_workload', run_id: 'test-run-001' })
    },
    {
      decision_id: 'prod-cycle-002',
      decision_type: 'governance',
      timestamp: new Date(Date.now() - 60000).toISOString(),
      actor: 'system',
      context: JSON.stringify({ circle: 'analyst', mode: 'normal' }),
      input_data_json: JSON.stringify({ validation: 'passed', compliance: 'checked' }),
      decision_outcome: 'approved',
      rationale: 'Governance validation passed for production cycle',
      confidence: 90.0,
      alternatives_json: JSON.stringify([]),
      impact_json: JSON.stringify({ affected_components: ['governance'], risk_level: 'low', reversible: true }),
      metadata_json: JSON.stringify({ source: 'production_workload', run_id: 'test-run-001' })
    },
    {
      decision_id: 'skill-update-001',
      decision_type: 'mitigation',
      timestamp: new Date(Date.now() - 120000).toISOString(),
      actor: 'skills_manager',
      context: JSON.stringify({ skill_id: 'orchestration', circle: 'orchestrator' }),
      input_data_json: JSON.stringify({ old_confidence: 75, new_confidence: 85 }),
      decision_outcome: 'updated',
      rationale: 'Skill confidence updated based on successful execution',
      confidence: 85.0,
      alternatives_json: JSON.stringify([]),
      impact_json: JSON.stringify({ affected_components: ['skills'], risk_level: 'low', reversible: true }),
      metadata_json: JSON.stringify({ source: 'skill_persistence', run_id: 'test-run-001' })
    },
    {
      decision_id: 'circuit-breaker-001',
      decision_type: 'circuit_breaker',
      timestamp: new Date(Date.now() - 180000).toISOString(),
      actor: 'circuit_breaker',
      context: JSON.stringify({ threshold_type: 'failure_rate', current_value: 0.15 }),
      input_data_json: JSON.stringify({ threshold: 0.20, action: 'open' }),
      decision_outcome: 'approved',
      rationale: 'Circuit breaker opened due to elevated failure rate',
      confidence: 92.0,
      alternatives_json: JSON.stringify([
        { option: 'close', score: 60, reason_rejected: 'Would continue degraded service' },
        { option: 'open', score: 92, reason_rejected: '' }
      ]),
      impact_json: JSON.stringify({ affected_components: ['api'], risk_level: 'medium', reversible: true }),
      metadata_json: JSON.stringify({ source: 'circuit_breaker', run_id: 'test-run-001' })
    },
    {
      decision_id: 'threshold-learning-001',
      decision_type: 'threshold',
      timestamp: new Date(Date.now() - 240000).toISOString(),
      actor: 'system',
      context: JSON.stringify({ metric: 'response_time', percentile: 'p95' }),
      input_data_json: JSON.stringify({ current_threshold: 500, learned_threshold: 450 }),
      decision_outcome: 'updated',
      rationale: 'Threshold updated based on traffic analysis',
      confidence: 88.0,
      alternatives_json: JSON.stringify([]),
      impact_json: JSON.stringify({ affected_components: ['monitoring'], risk_level: 'low', reversible: true }),
      metadata_json: JSON.stringify({ source: 'threshold_learning', run_id: 'test-run-001' })
    }
  ];
  
  // Insert sample entries
  const insertSQL = `
    INSERT OR REPLACE INTO decision_audit_core (
      decision_id, decision_type, timestamp, actor,
      context_json, input_data_json, decision_outcome,
      rationale, confidence, alternatives_json,
      impact_json, metadata_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  const stmt = db.prepare(insertSQL);
  
  for (const entry of sampleEntries) {
    stmt.run(
      entry.decision_id,
      entry.decision_type,
      entry.timestamp,
      entry.actor,
      entry.context,
      entry.input_data_json,
      entry.decision_outcome,
      entry.rationale,
      entry.confidence,
      entry.alternatives_json,
      entry.impact_json,
      entry.metadata_json
    );
    console.log(`[DecisionAudit] Logged: ${entry.decision_id} (${entry.decision_type})`);
  }
  
  // Verify entries
  const count = db.prepare('SELECT COUNT(*) as count FROM decision_audit_core').get() as { count: number };
  console.log(`[DecisionAudit] Total entries: ${count.count}`);
  
  // Show sample entries
  const entries = db.prepare('SELECT * FROM decision_audit_core ORDER BY timestamp DESC LIMIT 5').all();
  console.log('[DecisionAudit] Sample entries:');
  console.log(JSON.stringify(entries, null, 2));
  
  db.close();
  console.log('[DecisionAudit] Initialization complete');
}

main().catch(console.error);
