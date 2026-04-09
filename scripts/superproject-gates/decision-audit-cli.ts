#!/usr/bin/env tsx
import { getDecisionAuditLogger, createDecisionAuditEntry } from '../../src/governance/decision-audit';
import type { DecisionOutcome, CircleRole, DecisionType } from '../../src/governance/decision-audit';
import * as path from 'path';

async function main() {
  const [ , , event = 'verdict', outcomeStr = 'CONTINUE', detailsKV = '', contextKV = '' ] = process.argv;
  const logger = getDecisionAuditLogger();

  const details: Record<string, any> = {};
  const context: Record<string, any> = {};

  if (detailsKV) detailsKV.split(';').forEach(kv => { const [k,v] = kv.split('='); if (k) details[k] = v; });
  if (contextKV) contextKV.split(';').forEach(kv => { const [k,v] = kv.split('='); if (k) context[k] = v; });

  const entry = createDecisionAuditEntry({
    decision_id: `${event}-${Date.now()}`,
    circle_role: (details.role || 'orchestrator') as CircleRole,
    decision_type: (details.type || 'governance') as DecisionType,
    context,
    outcome: outcomeStr as DecisionOutcome,
    rationale: details.rationale || `Auto-generated from ${event}`,
    alternatives_considered: details.alternatives ? details.alternatives.split(',') : [],
    evidence_chain: []
  });

  await logger.logDecision(entry);
  console.log(`[audit-ts] ${event} recorded (${entry.id})`);
}

main().catch(err => { console.error(err); process.exit(1); });