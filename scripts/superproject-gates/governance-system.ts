// Minimal GovernanceSystem: policy checks + compliance violations
import { promises as fs } from 'fs';
import * as path from 'path';
import { getDecisionAuditLogger, createDecisionAuditEntry, DecisionType, DecisionOutcome, CircleRole } from './decision-audit.js';

export interface PolicyViolation {
  policyId: string;
  severity: 'low'|'medium'|'high'|'critical';
  rationale: string;
  evidence?: Record<string, any>;
}

export interface GovernanceCheckResult {
  timestamp: string;
  violations: PolicyViolation[];
}

export class GovernanceSystem {
  constructor(private projectRoot: string) {}

  async checkCompliance(): Promise<GovernanceCheckResult> {
    const violations: PolicyViolation[] = [];
    const logger = getDecisionAuditLogger();

    // P0: ROAM freshness < 3 days (docs/ROAM*.md)
    try {
      const docsDir = path.join(this.projectRoot, 'docs');
      const files = await fs.readdir(docsDir).catch(() => [] as string[]);
      const roamFiles = files.filter(f => /ROAM/i.test(f) && f.endsWith('.md'));
      if (roamFiles.length > 0) {
        const stats = await Promise.all(roamFiles.map(f => fs.stat(path.join(docsDir, f))));
        const newestMtime = Math.max(...stats.map(s => s.mtimeMs));
        const ageDays = (Date.now() - newestMtime) / (1000*60*60*24);
        if (ageDays > 3) {
          violations.push({
            policyId: 'ROAM_FRESHNESS_LT_3D',
            severity: 'high',
            rationale: `Newest ROAM doc is ~${ageDays.toFixed(1)} days old (>3d)`
          });
        }
      } else {
        violations.push({ policyId: 'ROAM_DOCS_MISSING', severity: 'medium', rationale: 'No ROAM*.md found under docs/' });
      }
    } catch {}

    // P0: Decision audit coverage > 0 in last 7 days
    try {
      const logPath = path.join(this.projectRoot, 'reports', 'decision-audit.jsonl');
      const content = await fs.readFile(logPath, 'utf8').catch(() => '');
      const lines = content.split('\n').filter(Boolean);
      const recent = lines.filter(l => {
        try {
          const j = JSON.parse(l);
          const t = new Date(j.timestamp).getTime();
          return Date.now() - t < 7*24*60*60*1000;
        } catch { return false; }
      });
      if (recent.length === 0) {
        violations.push({ policyId: 'DECISION_AUDIT_COVERAGE', severity: 'medium', rationale: 'No decision audits in last 7 days' });
      }
    } catch {}

    // P1 (placeholder): learned circuit breaker available
    try {
      const lib = path.join(this.projectRoot, 'scripts', 'lib', 'statistical-thresholds.sh');
      const exists = await fs.stat(lib).then(() => true).catch(() => false);
      if (!exists) {
        violations.push({ policyId: 'CB_LEARNED_THRESHOLDS_MISSING', severity: 'medium', rationale: 'statistical-thresholds.sh not present' });
      }
    } catch {}

    const result = { timestamp: new Date().toISOString(), violations };

    // Log governance compliance decision to audit trail
    const decisionId = `compliance-check-${Date.now()}`;
    const outcome: DecisionOutcome = violations.length === 0 ? 'GO' : violations.some(v => v.severity === 'critical' || v.severity === 'high') ? 'ESCALATED' : 'CONTINUE';

    await logger.logDecision(createDecisionAuditEntry({
      decision_id: decisionId,
      circle_role: 'assessor',
      decision_type: 'governance',
      context: {
        projectRoot: this.projectRoot,
        violationsCount: violations.length,
        violationDetails: violations
      },
      outcome,
      rationale: violations.length === 0
        ? 'All compliance checks passed - system is in good standing'
        : `Found ${violations.length} compliance violation(s) requiring attention`,
      alternatives_considered: [
        'Continue with current state',
        'Pause operations to fix violations',
        'Escalate critical violations'
      ],
      evidence_chain: [
        { source: 'ROAM documents freshness check', weight: 0.3 },
        { source: 'Decision audit coverage check', weight: 0.3 },
        { source: 'Circuit breaker availability check', weight: 0.2 },
        { source: 'System health metrics', weight: 0.2 }
      ]
    }));

    return result;
  }
}