# Priority Matrix Implementation Plan
**Date**: 2026-01-13T15:35:00Z  
**Status**: Planning Phase

---

## ✅ Dynamic Integration Validated

**Test Results**:
```
1. Dynamic Ceremony Order: standup wsjf review retro refine replenish synthesis
2. Dynamic Sleep: 4.50s (system load 20.49, low-medium context)
3. Adaptive Learning Rate: 0.011257 (moderate variance)
4. System Status: Load 20.49/28 cores, Memory 5% (healthy)
```

**Verdict**: All 4 dynamic systems operational ✅

---

## P0 Priority: Critical Path Items

### P0-1: Replace GovernanceSystem Stub with Real Implementation
**Owner**: orchestrator_circle  
**Success Metric**: `checkCompliance()` returns actual violations  
**Current State**: TRUTH dimension at ~60% (needs >90%)

**Implementation**:
```typescript
// File: src/governance/governance-system.ts
interface ComplianceViolation {
  type: 'TRUTH' | 'TIME' | 'LIVE';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  detectedAt: Date;
  affectedComponent: string;
  evidence: {
    expected: any;
    actual: any;
    query: string;
  };
}

class GovernanceSystem {
  async checkCompliance(): Promise<ComplianceViolation[]> {
    const violations: ComplianceViolation[] = [];
    
    // TRUTH: Direct measurement coverage
    const truthViolations = await this.checkTruthCoverage();
    violations.push(...truthViolations);
    
    // TIME: Decision audit coverage
    const timeViolations = await this.checkDecisionAuditCoverage();
    violations.push(...timeViolations);
    
    // LIVE: Calibration adaptivity
    const liveViolations = await this.checkCalibrationAdaptivity();
    violations.push(...liveViolations);
    
    return violations;
  }
  
  private async checkTruthCoverage(): Promise<ComplianceViolation[]> {
    // Query AgentDB for health checks using direct queries vs proxies
    const directQueryCount = await this.countHealthChecks('direct_db_query');
    const totalHealthChecks = await this.countHealthChecks('all');
    const coverage = directQueryCount / totalHealthChecks;
    
    if (coverage < 0.9) {
      return [{
        type: 'TRUTH',
        severity: 'CRITICAL',
        description: `Direct measurement coverage at ${(coverage*100).toFixed(1)}% (target: >90%)`,
        detectedAt: new Date(),
        affectedComponent: 'health-checks',
        evidence: {
          expected: 0.9,
          actual: coverage,
          query: 'SELECT COUNT(*) FROM health_checks WHERE method = ?'
        }
      }];
    }
    
    return [];
  }
}
```

**Integration Points**:
- AgentDB episodes table (query health check methods)
- Governor incidents table (query violation patterns)
- Pattern metrics (query proxy vs direct measurement ratios)

**Acceptance Criteria**:
- [ ] `checkCompliance()` returns non-empty array for known violations
- [ ] TRUTH violations detected when direct measurement < 90%
- [ ] TIME violations detected when audit coverage < 95%
- [ ] LIVE violations detected when calibration is static

---

### P0-2: Implement DecisionAuditEntry Logging
**Owner**: governance_agent  
**Success Metric**: 100% governance decisions audited  
**Current State**: TIME dimension at ~20% (needs >95%)

**Implementation**:
```typescript
// File: src/governance/decision-audit.ts
interface DecisionAuditEntry {
  id: string;
  timestamp: Date;
  decisionType: 'APPROVE' | 'REJECT' | 'DEFER' | 'ESCALATE';
  governance_rule: string;
  rationale: string;
  context: {
    circle: string;
    ceremony: string;
    episode_id?: string;
    trigger_event: string;
  };
  outcome: {
    status: 'SUCCESS' | 'FAILURE' | 'PARTIAL';
    impact_metrics: Record<string, number>;
  };
  audit_trail: {
    reviewed_by?: string;
    approved_by?: string;
    review_notes?: string;
  };
}

class DecisionAuditLogger {
  async logDecision(entry: DecisionAuditEntry): Promise<void> {
    // Store in AgentDB
    await this.db.execute(
      `INSERT INTO governance_decisions 
       (id, timestamp, decision_type, governance_rule, rationale, context, outcome, audit_trail)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.id,
        entry.timestamp.toISOString(),
        entry.decisionType,
        entry.governance_rule,
        entry.rationale,
        JSON.stringify(entry.context),
        JSON.stringify(entry.outcome),
        JSON.stringify(entry.audit_trail)
      ]
    );
    
    // Update coverage metric
    await this.updateAuditCoverage();
  }
  
  async getAuditCoverage(): Promise<number> {
    const result = await this.db.query(
      `SELECT 
         COUNT(DISTINCT governance_rule) as audited,
         (SELECT COUNT(*) FROM governance_rules) as total
       FROM governance_decisions
       WHERE timestamp > datetime('now', '-7 days')`
    );
    
    return result.audited / result.total;
  }
}
```

**Database Schema**:
```sql
CREATE TABLE IF NOT EXISTS governance_decisions (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  decision_type TEXT NOT NULL,
  governance_rule TEXT NOT NULL,
  rationale TEXT NOT NULL,
  context JSON,
  outcome JSON,
  audit_trail JSON,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX idx_governance_decisions_ts ON governance_decisions(timestamp DESC);
CREATE INDEX idx_governance_decisions_rule ON governance_decisions(governance_rule);
```

**Acceptance Criteria**:
- [ ] All governance decisions logged before execution
- [ ] Coverage metric reaches 100% for active rules
- [ ] Audit trail includes rationale and outcome
- [ ] Historical queries performant (<100ms for 7-day window)

---

### P0-3: Add Health-Based Adaptive Check Frequency
**Owner**: health-checks.ts  
**Success Metric**: Check frequency scales with anomaly rate  
**Current State**: LIVE dimension has static intervals (needs stress-responsive)

**Implementation**:
```typescript
// File: src/health/adaptive-health-checks.ts
interface AnomalyRate {
  window: number; // seconds
  anomalyCount: number;
  totalChecks: number;
  rate: number; // anomalyCount / totalChecks
}

class AdaptiveHealthChecker {
  private baseInterval = 60000; // 60 seconds
  private minInterval = 5000;   // 5 seconds
  private maxInterval = 300000; // 5 minutes
  
  async calculateCheckInterval(): Promise<number> {
    const anomalyRate = await this.getAnomalyRate(300); // Last 5 minutes
    
    // Exponential backoff on low anomaly rate, exponential speedup on high rate
    if (anomalyRate.rate > 0.1) {
      // >10% anomaly rate: check 4x more frequently
      return Math.max(this.minInterval, this.baseInterval / 4);
    } else if (anomalyRate.rate > 0.05) {
      // 5-10% anomaly rate: check 2x more frequently
      return Math.max(this.minInterval, this.baseInterval / 2);
    } else if (anomalyRate.rate < 0.01) {
      // <1% anomaly rate: check 2x less frequently
      return Math.min(this.maxInterval, this.baseInterval * 2);
    }
    
    return this.baseInterval;
  }
  
  private async getAnomalyRate(windowSeconds: number): Promise<AnomalyRate> {
    const result = await this.db.query(
      `SELECT 
         COUNT(*) as total_checks,
         SUM(CASE WHEN status = 'ANOMALY' THEN 1 ELSE 0 END) as anomaly_count
       FROM health_checks
       WHERE ts > strftime('%s', 'now') - ?`,
      [windowSeconds]
    );
    
    return {
      window: windowSeconds,
      totalChecks: result.total_checks,
      anomalyCount: result.anomaly_count,
      rate: result.anomaly_count / result.total_checks
    };
  }
  
  async runAdaptiveHealthCheck(): Promise<void> {
    while (true) {
      // Perform health check
      await this.performHealthCheck();
      
      // Calculate next interval based on recent anomaly rate
      const interval = await this.calculateCheckInterval();
      
      // Log interval adaptation
      await this.logIntervalChange(interval);
      
      // Sleep dynamically
      await this.sleep(interval);
    }
  }
}
```

**Integration with Dynamic Sleep**:
```typescript
// Use ay-dynamic-sleep.sh for system-aware delays
private async sleep(baseMs: number): Promise<void> {
  const baseSec = baseMs / 1000;
  const adaptedSec = await this.execShell(
    `./scripts/ay-dynamic-sleep.sh calculate ${baseSec} auto`
  );
  await new Promise(resolve => setTimeout(resolve, parseFloat(adaptedSec) * 1000));
}
```

**Acceptance Criteria**:
- [ ] Check frequency increases when anomaly rate > 5%
- [ ] Check frequency decreases when anomaly rate < 1%
- [ ] Interval bounds respected (5s min, 5m max)
- [ ] Integration with dynamic sleep for system load awareness

---

## P1 Priority: High Impact Items

### P1-1: Automate ROAM Staleness Detection in CI
**Owner**: CI/CD  
**Success Metric**: ROAM age < 3 days enforced  
**Current State**: ROAM freshness at 7 days max (needs 3 days max)

**Implementation**:
```bash
#!/usr/bin/env bash
# .github/workflows/roam-staleness-check.sh

MAX_ROAM_AGE_DAYS=3

# Find ROAM files
roam_files=$(find . -name "ROAM-*.md" -o -name "*-roam.md")

violations=0
for file in $roam_files; do
  # Get last modified date
  if [[ "$OSTYPE" == "darwin"* ]]; then
    last_modified=$(stat -f "%m" "$file")
  else
    last_modified=$(stat -c "%Y" "$file")
  fi
  
  now=$(date +%s)
  age_days=$(( (now - last_modified) / 86400 ))
  
  if (( age_days > MAX_ROAM_AGE_DAYS )); then
    echo "❌ ROAM file stale: $file (age: ${age_days} days, max: ${MAX_ROAM_AGE_DAYS})"
    violations=$((violations + 1))
  else
    echo "✓ ROAM file fresh: $file (age: ${age_days} days)"
  fi
done

if (( violations > 0 )); then
  echo ""
  echo "🚫 Found $violations stale ROAM file(s). Update ROAM items or resolve them."
  exit 1
fi

echo "✓ All ROAM files fresh (<${MAX_ROAM_AGE_DAYS} days)"
```

**GitHub Actions Integration**:
```yaml
# .github/workflows/roam-check.yml
name: ROAM Staleness Check

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main, develop]

jobs:
  roam-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Check ROAM Freshness
        run: bash .github/workflows/roam-staleness-check.sh
        
      - name: Comment on PR
        if: failure()
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '❌ ROAM staleness check failed. Update or resolve stale ROAM items (>3 days old).'
            })
```

**Acceptance Criteria**:
- [ ] CI fails when ROAM items > 3 days old
- [ ] PR comments indicate which ROAM files are stale
- [ ] Pre-commit hook optionally checks ROAM freshness locally

---

### P1-2: Add Semantic Context (Rationale) to Pattern Metrics
**Owner**: pattern_logger  
**Success Metric**: Each event includes rationale field  
**Current State**: TIME dimension needs knowledge preservation enhancement

**Implementation**:
```typescript
// File: src/pattern/semantic-pattern-logger.ts
interface SemanticPatternMetric {
  event_type: string;
  circle: string;
  ceremony: string;
  metric_value: number;
  timestamp: Date;
  rationale: {
    why: string;              // Why this pattern occurred
    context: string;          // Situational context
    decision_logic: string;   // Decision-making process
    alternatives_considered: string[]; // Other options evaluated
  };
  semantic_tags: string[];    // Embeddings-friendly tags
  embeddings?: number[];      // Vector representation for semantic search
}

class SemanticPatternLogger {
  async logPattern(metric: SemanticPatternMetric): Promise<void> {
    // Generate embeddings if not provided
    if (!metric.embeddings) {
      metric.embeddings = await this.generateEmbeddings(
        `${metric.rationale.why} ${metric.rationale.context}`
      );
    }
    
    // Store in AgentDB
    await this.db.execute(
      `INSERT INTO semantic_patterns 
       (event_type, circle, ceremony, metric_value, timestamp, rationale, semantic_tags, embeddings)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        metric.event_type,
        metric.circle,
        metric.ceremony,
        metric.metric_value,
        metric.timestamp.toISOString(),
        JSON.stringify(metric.rationale),
        JSON.stringify(metric.semantic_tags),
        JSON.stringify(metric.embeddings)
      ]
    );
  }
  
  private async generateEmbeddings(text: string): Promise<number[]> {
    // Use Transformers.js (already loaded in AgentDB)
    const { pipeline } = await import('@xenova/transformers');
    const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    const output = await embedder(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  }
}
```

**Database Schema**:
```sql
CREATE TABLE IF NOT EXISTS semantic_patterns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  circle TEXT NOT NULL,
  ceremony TEXT NOT NULL,
  metric_value REAL NOT NULL,
  timestamp TEXT NOT NULL,
  rationale JSON NOT NULL,
  semantic_tags JSON,
  embeddings JSON,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX idx_semantic_patterns_ts ON semantic_patterns(timestamp DESC);
CREATE INDEX idx_semantic_patterns_event ON semantic_patterns(event_type);
```

**Acceptance Criteria**:
- [ ] All pattern logs include rationale.why field
- [ ] Rationale includes alternatives_considered for decisions
- [ ] Semantic embeddings enable similarity search
- [ ] Query: "Find similar patterns" returns relevant historical events

---

### P1-3: Implement Learned Circuit Breaker Thresholds
**Owner**: circuit_breaker.rs (or TypeScript equivalent)  
**Success Metric**: Thresholds updated from failure history  
**Current State**: LIVE dimension has static thresholds

**Implementation**:
```typescript
// File: src/resilience/learned-circuit-breaker.ts
interface CircuitBreakerConfig {
  service: string;
  failureThreshold: number;
  timeoutMs: number;
  resetTimeoutMs: number;
  lastLearned: Date;
}

class LearnedCircuitBreaker {
  async updateThresholdsFromHistory(): Promise<void> {
    const services = await this.getMonitoredServices();
    
    for (const service of services) {
      const failureHistory = await this.getFailureHistory(service, 30); // Last 30 days
      
      // Calculate p95 failure rate
      const p95FailureRate = this.calculatePercentile(failureHistory.map(h => h.failureRate), 0.95);
      
      // Update threshold to be slightly above p95 (allow some variance)
      const newThreshold = Math.ceil(p95FailureRate * 1.1);
      
      await this.updateCircuitBreakerConfig(service, {
        failureThreshold: newThreshold,
        lastLearned: new Date()
      });
      
      console.log(`✓ Updated ${service} circuit breaker: threshold=${newThreshold} (p95=${p95FailureRate})`);
    }
  }
  
  private async getFailureHistory(service: string, days: number): Promise<FailureHistory[]> {
    const result = await this.db.query(
      `SELECT 
         date(ts, 'unixepoch') as date,
         COUNT(*) as total_requests,
         SUM(CASE WHEN status = 'FAILURE' THEN 1 ELSE 0 END) as failures,
         (SUM(CASE WHEN status = 'FAILURE' THEN 1 ELSE 0 END) * 1.0 / COUNT(*)) as failure_rate
       FROM service_requests
       WHERE service = ? AND ts > strftime('%s', 'now', '-${days} days')
       GROUP BY date(ts, 'unixepoch')
       ORDER BY date DESC`,
      [service]
    );
    
    return result;
  }
}
```

**Integration with AgentDB**:
```typescript
// Use ay-dynamic-thresholds.sh for threshold calculation
private async calculateDynamicThreshold(service: string): Promise<number> {
  const threshold = await this.execShell(
    `./scripts/lib/dynamic-reward-calculator.sh get_reward_threshold circuit_breaker`
  );
  return parseFloat(threshold);
}
```

**Acceptance Criteria**:
- [ ] Thresholds updated weekly from failure history
- [ ] P95 failure rate used as baseline
- [ ] Manual override capability preserved
- [ ] Threshold learning logged to audit trail

---

## P2 Priority: Strategic Improvements

### P2-1: Implement Proxy Gaming Detection (Goodhart's Law)
**Owner**: alignment_checker.py  
**Success Metric**: Gaming events flagged in metrics

**Implementation**:
```python
# File: src/alignment/proxy_gaming_detector.py
from typing import List, Dict
import numpy as np

class ProxyGamingDetector:
    """Detects when agents optimize for metrics rather than actual goals."""
    
    def detect_gaming(self, episodes: List[Dict]) -> List[Dict]:
        violations = []
        
        # Pattern 1: High reward but low actual value delivery
        for episode in episodes:
            if episode['reward'] > 0.9 and episode.get('actual_value_delivered', 0) < 0.5:
                violations.append({
                    'type': 'REWARD_VALUE_MISMATCH',
                    'episode_id': episode['id'],
                    'reward': episode['reward'],
                    'actual_value': episode.get('actual_value_delivered'),
                    'severity': 'HIGH'
                })
        
        # Pattern 2: Metric inflation without outcome improvement
        metric_trends = self.calculate_metric_trends(episodes)
        outcome_trends = self.calculate_outcome_trends(episodes)
        
        if metric_trends['slope'] > 0.1 and outcome_trends['slope'] < 0.01:
            violations.append({
                'type': 'METRIC_INFLATION',
                'metric_slope': metric_trends['slope'],
                'outcome_slope': outcome_trends['slope'],
                'severity': 'MEDIUM'
            })
        
        # Pattern 3: Reduced variance (optimization plateau)
        recent_variance = np.var([e['reward'] for e in episodes[-10:]])
        if recent_variance < 0.001:  # Too stable = likely gaming
            violations.append({
                'type': 'VARIANCE_COLLAPSE',
                'variance': recent_variance,
                'severity': 'LOW'
            })
        
        return violations
```

**Acceptance Criteria**:
- [ ] Detects reward/value mismatches
- [ ] Flags metric inflation without outcome improvement
- [ ] Identifies variance collapse (optimization plateau)

---

### P2-2: Auto-Generate Runbooks from RESOLVED ROAM Items
**Owner**: retro_coach.ts  
**Success Metric**: Runbooks for all resolved blockers

**Implementation**:
```typescript
// File: src/retro/runbook-generator.ts
class RunbookGenerator {
  async generateFromROAM(roamFile: string): Promise<Runbook> {
    const roamItems = await this.parseROAMFile(roamFile);
    const resolvedItems = roamItems.filter(item => item.status === 'RESOLVED');
    
    const runbook: Runbook = {
      title: `Runbook: ${path.basename(roamFile, '.md')}`,
      generated_at: new Date(),
      sections: []
    };
    
    for (const item of resolvedItems) {
      runbook.sections.push({
        title: item.title,
        problem: item.description,
        solution: item.resolution,
        steps: this.extractSteps(item.resolution),
        validation: this.extractValidation(item.resolution),
        estimated_time: item.resolution_time
      });
    }
    
    await this.saveRunbook(runbook);
    return runbook;
  }
}
```

**Acceptance Criteria**:
- [ ] Parses RESOLVED ROAM items automatically
- [ ] Generates structured runbooks (problem/solution/steps)
- [ ] Includes validation criteria and timing estimates

---

### P2-3: Integrate Coherence Checks into CI Quality Gate
**Owner**: CI/CD  
**Success Metric**: PR blocks if coherence < 95%

**Implementation**:
```typescript
// File: src/coherence/ci-coherence-checker.ts
interface CoherenceCheck {
  spiritual: number;  // Intention alignment
  ethical: number;    // Practice alignment  
  embodied: number;   // Action alignment
  overall: number;    // Weighted average
}

class CICoherenceChecker {
  async checkPRCoherence(prNumber: number): Promise<CoherenceCheck> {
    const changes = await this.getPRChanges(prNumber);
    
    // Spiritual: Check if changes align with stated intention
    const spiritual = await this.checkIntentionAlignment(changes);
    
    // Ethical: Check if changes follow best practices
    const ethical = await this.checkPracticeAlignment(changes);
    
    // Embodied: Check if changes actually work (tests pass, no regressions)
    const embodied = await this.checkActionAlignment(changes);
    
    const overall = (spiritual * 0.33 + ethical * 0.33 + embodied * 0.34);
    
    return { spiritual, ethical, embodied, overall };
  }
}
```

**GitHub Actions Integration**:
```yaml
- name: Coherence Check
  run: |
    coherence=$(npx tsx src/coherence/ci-coherence-checker.ts check-pr ${{ github.event.pull_request.number }})
    if (( $(echo "$coherence < 0.95" | bc -l) )); then
      echo "❌ Coherence check failed: $coherence < 0.95"
      exit 1
    fi
```

**Acceptance Criteria**:
- [ ] Three-dimensional coherence calculated per PR
- [ ] PR blocked if overall coherence < 95%
- [ ] Coherence breakdown shown in PR comment

---

## Success Metrics Dashboard (Projected)

| Dimension | Current | Target | Post-Implementation |
|-----------|---------|--------|---------------------|
| TRUTH - Direct Measurement Coverage | ~60% | >90% | 92% (P0-1) |
| TRUTH - ROAM Freshness | 7 days | 3 days | 3 days (P1-1) |
| TIME - Decision Audit Coverage | ~20% | >95% | 96% (P0-2) |
| TIME - Knowledge Preservation | Tier storage | Semantic + Storage | Embeddings enabled (P1-2) |
| LIVE - Calibration Adaptivity | Static | Stress-responsive | Dynamic (P0-3) |
| LIVE - Auto-Recovery Rate | Manual | <60s | <45s (P1-3) |

---

## Implementation Timeline

**Week 1 (P0)**: Critical path items
- Days 1-2: GovernanceSystem real implementation
- Days 3-4: DecisionAuditEntry logging
- Days 5-7: Health-based adaptive frequency

**Week 2 (P1)**: High impact items
- Days 8-9: ROAM staleness CI integration
- Days 10-11: Semantic pattern metrics
- Days 12-14: Learned circuit breaker thresholds

**Week 3 (P2)**: Strategic improvements
- Days 15-16: Proxy gaming detection
- Days 17-18: Runbook auto-generation
- Days 19-21: Coherence CI quality gate

**Total**: 21 days (3 weeks) for complete implementation

---

**Next Action**: Begin P0-1 implementation (GovernanceSystem real logic)
