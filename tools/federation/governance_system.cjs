#!/usr/bin/env node
/**
 * Governance System - Real Compliance Implementation
 * ====================================================
 * Implements truth-alignment by validating pattern metrics and ROAM risk state.
 * Replaces stub implementation with actual compliance logic.
 */

const fs = require('fs');
const path = require('path');
const yaml = require('yaml');
const { spawnSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '../../');
const GOALIE_DIR = process.env.GOALIE_DIR || path.join(PROJECT_ROOT, '.goalie');
const ROAM_TRACKER_PATH = path.join(GOALIE_DIR, 'ROAM_TRACKER.yaml');

function loadPolicyInventoryTotal() {
  const candidates = [
    path.join(PROJECT_ROOT, 'config', 'governance_policies.json'),
    path.join(PROJECT_ROOT, 'config', 'governance', 'governance_policies.json'),
    path.join(GOALIE_DIR, 'governance_policies.json')
  ];

  for (const p of candidates) {
    try {
      if (!fs.existsSync(p)) continue;
      const raw = fs.readFileSync(p, 'utf-8');
      const policies = JSON.parse(raw);
      if (!Array.isArray(policies)) continue;

      if (policies.length > 0 && typeof policies[0] === 'string') {
        return policies.length;
      }

      return policies.filter(pol => {
        const status = (pol?.status || 'active');
        return status === 'active';
      }).length;
    } catch (_err) {
      continue;
    }
  }

  return 0;
}

function selectPatternMetricsPath() {
  const preferred = path.join(GOALIE_DIR, 'pattern_metrics.jsonl');
  try {
    if (fs.existsSync(preferred) && fs.statSync(preferred).isFile() && fs.statSync(preferred).size > 0) {
      return preferred;
    }
  } catch (_err) {
    // ignore
  }

  let best = null;
  let bestMtime = 0;
  try {
    const files = fs.readdirSync(GOALIE_DIR);
    for (const f of files) {
      if (!f.startsWith('pattern_metrics.jsonl')) continue;
      const p = path.join(GOALIE_DIR, f);
      const st = fs.statSync(p);
      if (!st.isFile() || st.size <= 0) continue;
      if (st.mtimeMs > bestMtime) {
        best = p;
        bestMtime = st.mtimeMs;
      }
    }
  } catch (_err) {
    // ignore
  }

  return best || preferred;
}

const PATTERN_METRICS_PATH = selectPatternMetricsPath();

// Compliance thresholds from governance rules
const THRESHOLDS = {
  manthra: 0.84,
  yasna: 1.0,
  mithra: 0.96,
  drift: 0.15,
  anomaly_rate: 0.1,
  staleness_days: 3,
  wsjf_max: 100.0
};

/**
 * Parse ROAM_TRACKER.yaml and check for violations
 */
function checkRoamTracker() {
  const violations = [];

  if (!fs.existsSync(ROAM_TRACKER_PATH)) {
    return {
      rule: 'ROAM-001',
      severity: 'WARN',
      details: 'ROAM_TRACKER.yaml not found - cannot validate ROAM entries'
    };
  }

  try {
    const content = fs.readFileSync(ROAM_TRACKER_PATH, 'utf-8');
    const roamData = yaml.parse(content);

    if (!roamData || typeof roamData !== 'object') {
      return {
        rule: 'ROAM-001',
        severity: 'WARN',
        details: 'ROAM_TRACKER.yaml is empty or malformed'
      };
    }

    // Check for stale ROAM entries (last_updated > 3 days)
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    if (roamData.entries && Array.isArray(roamData.entries)) {
      for (const entry of roamData.entries) {
        if (entry.last_updated) {
          const lastUpdated = new Date(entry.last_updated);
          if (lastUpdated < threeDaysAgo) {
            const daysOld = Math.floor((now - lastUpdated) / (1000 * 60 * 60 * 24));
            violations.push({
              rule: 'ROAM-002',
              severity: 'HIGH',
              details: `Stale ROAM entry "${entry.id || entry.name || 'unknown'}": last updated ${daysOld} days ago (>3 day threshold)`
            });
          }
        }
      }
    }

    // Check for blocked items without resolution plans
    if (roamData.blocked && Array.isArray(roamData.blocked)) {
      for (const item of roamData.blocked) {
        if (!item.resolution_plan || item.resolution_plan.trim() === '') {
          violations.push({
            rule: 'ROAM-003',
            severity: 'CRITICAL',
            details: `Blocked item "${item.id || item.name || 'unknown'}" has no resolution plan defined`
          });
        }
      }
    }

    // Check for risk items without mitigations
    // Supports both 'mitigation' and 'mitigation_plan' field names
    if (roamData.risks && Array.isArray(roamData.risks)) {
      for (const risk of roamData.risks) {
        const mitigation = risk.mitigation || risk.mitigation_plan || '';
        const mitigationStr = typeof mitigation === 'string' ? mitigation.trim() : JSON.stringify(mitigation);
        if (!mitigationStr || mitigationStr === '' || mitigationStr === '[]') {
          violations.push({
            rule: 'ROAM-004',
            severity: 'HIGH',
            details: `Risk item "${risk.id || risk.name || 'unknown'}" has no mitigation plan defined`
          });
        }
      }
    }

    // Check overall tracker staleness
    const stats = fs.statSync(ROAM_TRACKER_PATH);
    const mtime = stats.mtime;
    const ageDays = (Date.now() - mtime.getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays > THRESHOLDS.staleness_days) {
      violations.push({
        rule: 'ROAM-005',
        severity: 'MEDIUM',
        details: `ROAM_TRACKER.yaml file is ${Math.round(ageDays)} days old (>3 day threshold)`
      });
    }

  } catch (err) {
    return {
      rule: 'ROAM-001',
      severity: 'WARN',
      details: `Error parsing ROAM_TRACKER.yaml: ${err.message}`
    };
  }

  return violations;
}

/**
 * Analyze pattern_metrics.jsonl for violations
 */
function checkPatternMetrics() {
  const violations = [];

  if (!fs.existsSync(PATTERN_METRICS_PATH)) {
    return [{
      rule: 'PATTERN-001',
      severity: 'WARN',
      details: 'pattern_metrics.jsonl not found - cannot validate pattern compliance'
    }];
  }

  try {
    const content = fs.readFileSync(PATTERN_METRICS_PATH, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim());
    const events = lines.map(line => {
      try { return JSON.parse(line); } catch (e) { return null; }
    }).filter(e => e);

    if (events.length === 0) {
      return [{
        rule: 'PATTERN-001',
        severity: 'WARN',
        details: 'No pattern metrics events found'
      }];
    }

    // Check for anomaly rate thresholds exceeded
    const recentEvents = events.slice(-100);
    const driftEvents = recentEvents.filter(e => 
      e.alignment_score && e.alignment_score.overall_drift > THRESHOLDS.drift
    );
    const anomalyRate = driftEvents.length / recentEvents.length;
    
    if (anomalyRate > THRESHOLDS.anomaly_rate) {
      violations.push({
        rule: 'PATTERN-002',
        severity: 'HIGH',
        details: `Anomaly rate ${(anomalyRate * 100).toFixed(1)}% exceeds threshold of ${(THRESHOLDS.anomaly_rate * 100).toFixed(1)}% (${driftEvents.length}/${recentEvents.length} events)`
      });
    }

    // Check for failed health checks
    const failedHealthChecks = recentEvents.filter(e => 
      e.health_check && e.health_check.status === 'FAILED'
    );
    if (failedHealthChecks.length > 0) {
      violations.push({
        rule: 'PATTERN-003',
        severity: 'CRITICAL',
        details: `${failedHealthChecks.length} failed health checks detected in recent events`
      });
    }

    // Check governance rule violations
    // 1. Check for secrets in patterns
    const secretPatterns = /api_key|password|secret|token|credential/i;
    const secretViolations = recentEvents.filter(e =>
      JSON.stringify(e).match(secretPatterns)
    );
    if (secretViolations.length > 0) {
      violations.push({
        rule: 'GOV-001',
        severity: 'CRITICAL',
        details: `Potential secrets detected in ${secretViolations.length} pattern events`
      });
    }

    // 2. Check for inflated WSJF scores (gaming)
    const inflatedWsjf = recentEvents.filter(e =>
      e.economic && e.economic.wsjf_score > THRESHOLDS.wsjf_max
    );
    if (inflatedWsjf.length > 0) {
      violations.push({
        rule: 'GOV-002',
        severity: 'HIGH',
        details: `${inflatedWsjf.length} events with inflated WSJF scores (>${THRESHOLDS.wsjf_max}) detected`
      });
    }

    // 3. Check philosophical alignment (MYM-v2)
    const alignmentEvents = recentEvents.filter(e => e.alignment_score);
    if (alignmentEvents.length > 0) {
      const latest = alignmentEvents[alignmentEvents.length - 1].alignment_score;
      
      if (latest.manthra_score < THRESHOLDS.manthra) {
        violations.push({
          rule: 'MYM-001',
          severity: 'HIGH',
          details: `Manthra score ${latest.manthra_score} below threshold ${THRESHOLDS.manthra}`
        });
      }
      
      if (latest.yasna_score < THRESHOLDS.yasna) {
        violations.push({
          rule: 'MYM-002',
          severity: 'CRITICAL',
          details: `Yasna score ${latest.yasna_score} below threshold ${THRESHOLDS.yasna}`
        });
      }
      
      if (latest.mithra_score < THRESHOLDS.mithra) {
        violations.push({
          rule: 'MYM-003',
          severity: 'HIGH',
          details: `Mithra score ${latest.mithra_score} below threshold ${THRESHOLDS.mithra}`
        });
      }
    }

    // 4. Check for checkbox compliance (high alignment without consequence tracking)
    const checkboxCompliance = recentEvents.filter(e =>
      e.alignment_score &&
      e.alignment_score.manthra_score > 0.9 &&
      e.alignment_score.yasna_score > 0.9 &&
      (!e.alignment_score.consequence_tracked || e.alignment_score.consequence_tracked === false)
    );
    if (checkboxCompliance.length > 5) {
      violations.push({
        rule: 'GOV-003',
        severity: 'MEDIUM',
        details: `Potential checkbox compliance: ${checkboxCompliance.length} events with high alignment but no consequence tracking`
      });
    }

  } catch (err) {
    return [{
      rule: 'PATTERN-001',
      severity: 'WARN',
      details: `Error reading pattern_metrics.jsonl: ${err.message}`
    }];
  }

  return violations;
}

/**
 * Main compliance check function
 * Returns ComplianceResult with proper structure
 */
function checkCompliance() {
  const violations = [];

  // Check ROAM tracker violations
  const roamViolations = checkRoamTracker();
  if (Array.isArray(roamViolations)) {
    violations.push(...roamViolations);
  } else {
    violations.push(roamViolations);
  }

  // Check pattern metrics violations
  const patternViolations = checkPatternMetrics();
  violations.push(...patternViolations);

  // Determine overall compliance status
  const criticalViolations = violations.filter(v => String(v.severity || '').toUpperCase() === 'CRITICAL');
  const compliant = criticalViolations.length === 0;

  const weights = { CRITICAL: 30, HIGH: 15, MEDIUM: 8, WARN: 3 };
  const score = Math.max(
    0,
    100 - violations.reduce((sum, v) => sum + (weights[String(v.severity || '').toUpperCase()] || 0), 0)
  );

  const metrics = {
    roam: {
      fileAgeDays: null
    },
    audit: {
      mirrorCoverage: null,
      auditedPolicies: 0,
      totalPolicies: 0
    },
    pattern: {
      metricsPath: PATTERN_METRICS_PATH
    }
  };

  try {
    if (fs.existsSync(ROAM_TRACKER_PATH)) {
      const st = fs.statSync(ROAM_TRACKER_PATH);
      metrics.roam.fileAgeDays = Math.round(((Date.now() - st.mtimeMs) / (1000 * 60 * 60 * 24)) * 100) / 100;
    }
  } catch (_err) {
    metrics.roam.fileAgeDays = null;
  }

  try {
    metrics.audit.totalPolicies = loadPolicyInventoryTotal();
  } catch (_err) {
    // ignore
  }

  if (!metrics.audit.totalPolicies || metrics.audit.totalPolicies <= 0) {
    // Fallback: default GovernanceSystem always has at least one active policy (pattern-compliance)
    metrics.audit.totalPolicies = 1;
  }

  try {
    const audited = new Set();
    const cutoffSeconds = Math.floor(Date.now() / 1000) - (168 * 3600);

    const dbPath = path.join(GOALIE_DIR, 'governance.db');
    if (fs.existsSync(dbPath)) {
      const queries = [
        `SELECT DISTINCT policy_id FROM decision_audit WHERE policy_id IS NOT NULL AND timestamp >= ${cutoffSeconds};`,
        `SELECT DISTINCT policy_id FROM governance_decisions WHERE policy_id IS NOT NULL AND timestamp >= ${cutoffSeconds};`
      ];

      for (const q of queries) {
        const res = spawnSync('sqlite3', [dbPath, q], { encoding: 'utf8' });
        if (res.status !== 0 || typeof res.stdout !== 'string') continue;
        res.stdout
          .split('\n')
          .map(s => s.trim())
          .filter(Boolean)
          .forEach(id => audited.add(id));
        if (audited.size > 0) break;
      }
    }

    if (audited.size === 0) {
      const jsonlPath = path.join(GOALIE_DIR, 'governance_decisions.jsonl');
      if (fs.existsSync(jsonlPath)) {
        const content = fs.readFileSync(jsonlPath, 'utf-8');
        const lines = content.split('\n').filter(l => l.trim());
        for (const line of lines) {
          try {
            const obj = JSON.parse(line);
            const ts = obj.timestamp;
            if (typeof ts === 'number' && ts < cutoffSeconds) continue;

            const policyId =
              obj.policyId ||
              obj.policy_id ||
              obj.policy ||
              (obj.policy && obj.policy.id) ||
              null;
            if (policyId) audited.add(String(policyId));
          } catch (_err) {
            // ignore
          }
        }
      }
    }

    metrics.audit.auditedPolicies = audited.size;
    metrics.audit.mirrorCoverage = metrics.audit.totalPolicies > 0
      ? Math.min(1, metrics.audit.auditedPolicies / metrics.audit.totalPolicies)
      : 0;
  } catch (_err) {
    metrics.audit.mirrorCoverage = metrics.audit.totalPolicies > 0 ? 0 : 0;
  }

  return {
    compliant,
    score,
    metrics,
    violations,
    timestamp: new Date().toISOString(),
    source: 'governance_system.cjs'
  };
}

// CLI functionality
if (require.main === module) {
  const result = checkCompliance();
  if (process.env.GOVERNANCE_JSON_ONLY === '1') {
    process.stdout.write(JSON.stringify(result));
  } else {
    console.log(JSON.stringify(result, null, 2));

    if (!result.compliant) {
      console.error('\nCompliance check FAILED!');
    } else {
      console.log('\nCompliance check PASSED!');
    }
  }

  process.exit(result.compliant ? 0 : 1);
}

module.exports = { checkCompliance, checkRoamTracker, checkPatternMetrics, THRESHOLDS };
