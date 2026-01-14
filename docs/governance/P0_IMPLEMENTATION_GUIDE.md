# P0 Implementation Guide: Governance & Adaptive Health Checks

## Overview

This document describes the P0 priority implementations completed for the agentic-flow project, focusing on TRUTH, TIME, and LIVE dimensions of system observability and governance.

## Completed Implementations

### 1. GovernanceSystem - Real Implementation (P0 TRUTH)

**Status**: ✅ Complete  
**Success Metric**: `checkCompliance()` returns actual violations  
**Coverage**: 100% of governance decisions audited

#### Features

The GovernanceSystem has been upgraded from stub to full implementation:

- **Pattern Compliance Checking**: Validates against pattern telemetry from `.goalie/pattern_metrics.jsonl`
- **Real Violation Detection**: Returns actual violations with severity levels
- **Policy Management**: Supports multiple policies with configurable rules
- **Automatic Audit Logging**: All decisions automatically logged when enabled

#### Usage

```typescript
import { GovernanceSystem } from './src/governance/core/governance_system';

// Initialize with configuration
const governance = new GovernanceSystem({
  goalieDir: '.goalie',
  autoLogDecisions: true,  // Enable automatic audit logging
  strictMode: false        // false = only critical violations block actions
});

// Initialize (loads custom policies if available)
await governance.initialize();

// Check compliance
const checks = await governance.checkCompliance();
// or check specific area
const patternChecks = await governance.checkCompliance('pattern-compliance');

// Validate action before execution
const approved = await governance.validateAction('deploy-service', {
  circle: 'orchestrator',
  ceremony: 'standup'
});

if (approved) {
  // Proceed with action
} else {
  // Action blocked due to compliance violations
}
```

#### Default Policies

The system includes a default `pattern-compliance` policy with these rules:

| Rule ID | Pattern | Max Frequency | Required Mode | Required Gate | Severity |
|---------|---------|---------------|---------------|---------------|----------|
| `safe-degrade-frequency` | safe-degrade | 20/hour | - | - | high |
| `guardrail-lock-enforcement` | guardrail-lock | - | enforcement | - | critical |
| `autocommit-governance` | autocommit-shadow | - | - | governance | medium |
| `circuit-breaker-frequency` | circuit-breaker | 10/hour | - | - | critical |
| `mutation-governance` | * (all mutations) | - | - | governance | high |

#### Compliance Scores

Violations reduce compliance score from 100:
- **Low severity**: -5 points
- **Medium severity**: -15 points
- **High severity**: -30 points
- **Critical severity**: -50 points

#### Custom Policies

Create custom policies in `.goalie/governance_policies.json`:

```json
[
  {
    "id": "custom-policy",
    "name": "Custom Policy",
    "description": "Custom compliance rules",
    "version": "1.0.0",
    "status": "active",
    "rules": [
      {
        "id": "custom-rule-1",
        "pattern": "my-pattern",
        "maxFrequency": 15,
        "severity": "medium",
        "description": "Custom rule description"
      }
    ]
  }
]
```

---

### 2. DecisionAuditEntry Logging (P0 TIME)

**Status**: ✅ Complete  
**Success Metric**: 100% governance decisions audited  
**Storage**: SQLite + JSONL fallback

#### Features

- **Persistent Storage**: Uses SQLite with automatic fallback to JSONL
- **Complete Decision Tracking**: Logs all governance decisions with full context
- **Query Capabilities**: Filter by result, policy, time window
- **Statistics**: Calculate compliance metrics over time periods

#### Database Schema

```sql
CREATE TABLE governance_decisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  decision_id TEXT UNIQUE NOT NULL,
  timestamp INTEGER NOT NULL,
  decision_type TEXT NOT NULL,        -- 'policy_check', 'action_validation', 'compliance_check'
  policy_id TEXT,
  action TEXT,
  context TEXT,                        -- JSON: full decision context
  result TEXT NOT NULL,                -- 'approved', 'denied', 'warning'
  rationale TEXT,
  violations TEXT,                     -- JSON: list of violations
  compliance_score REAL,               -- 0-100 score
  user_id TEXT,
  circle TEXT,
  ceremony TEXT,
  metadata TEXT,                       -- JSON: additional data
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);
```

#### Usage

```typescript
import { DecisionAuditLogger } from './src/governance/core/decision_audit_logger';

const logger = new DecisionAuditLogger('.goalie');

// Log a decision
const decisionId = logger.logDecision({
  decisionType: 'action_validation',
  policyId: 'pattern-compliance',
  action: 'deploy-service',
  context: { circle: 'orchestrator', ceremony: 'standup' },
  result: 'approved',
  rationale: 'All compliance checks passed',
  complianceScore: 95,
  userId: 'user-123',
  circle: 'orchestrator',
  ceremony: 'standup'
});

// Query recent decisions
const recent = logger.getRecentDecisions(100);

// Filter by result
const deniedDecisions = logger.getDecisionsByResult('denied');

// Filter by policy
const policyDecisions = logger.getDecisionsByPolicy('pattern-compliance');

// Get statistics
const stats = logger.getStatistics(24); // Last 24 hours
// Returns: { total, approved, denied, warnings, avgComplianceScore }

// Close connection when done
logger.close();
```

#### Automatic Logging

When `autoLogDecisions: true` is set in GovernanceSystem, all compliance checks and action validations are automatically logged with:
- Full context
- All violations
- Compliance scores
- Execution time
- Policy details

---

### 3. Adaptive Health Check Frequency (P0 LIVE)

**Status**: ✅ Complete  
**Success Metric**: Check frequency scales with anomaly rate  
**Range**: 1-20 episodes (stress-responsive)

#### Features

- **Stress-Responsive**: Frequency adjusts based on system health
- **Anomaly Detection**: Monitors degradation, cascade failures, failure rate
- **Automatic Scaling**: More frequent checks under stress, less when stable
- **Historical Tracking**: Maintains health check history

#### Algorithm

```typescript
// Anomaly Rate Calculation (0-1)
anomalyRate = min(1,
  degradationScore * 0.4 +
  (cascadeCount > 0 ? 0.3 : 0) +
  failureRate * 0.3
)

// Adaptive Frequency
stressMultiplier = 1 - anomalyRate
adaptiveFrequency = round(
  minFrequency + (maxFrequency - minFrequency) * stressMultiplier
)

// Constraints
frequency = clamp(adaptiveFrequency, 1, 20)
```

#### Stress Levels

| Frequency | Stress Level | Anomaly Rate | Description |
|-----------|-------------|--------------|-------------|
| 1-3 | High | >0.6 | Check every 1-3 episodes |
| 4-7 | Medium | 0.3-0.6 | Check every 4-7 episodes |
| 8-20 | Low | <0.3 | Check every 8-20 episodes |

#### API Endpoints

##### GET /api/health

Comprehensive health check with adaptive frequency included:

```json
{
  "status": "healthy",
  "timestamp": "2026-01-13T15:30:00.000Z",
  "circle": "orchestrator",
  "ceremony": "standup",
  "healthy": true,
  "issues": [],
  "recommendations": [],
  "adaptive": {
    "checkFrequency": 5,
    "episodeCount": 42,
    "anomalyRate": 0.15,
    "stressLevel": "low"
  },
  "checks": {
    "circuitBreaker": { ... },
    "degradation": { ... },
    "cascadeFailure": { ... },
    "divergenceRate": { ... }
  }
}
```

##### GET /api/health/adaptive

Get adaptive frequency status:

```json
{
  "timestamp": "2026-01-13T15:30:00.000Z",
  "adaptive": {
    "checkFrequency": 5,
    "episodeCount": 42,
    "lastHealthCheck": 1736785800000,
    "anomalyRate": 0.15,
    "stressLevel": "low",
    "factors": {
      "degradationScore": 0.2,
      "cascadeCount": 0,
      "failureRate": 0.05
    },
    "ranges": {
      "minFrequency": 1,
      "maxFrequency": 20,
      "currentFrequency": 5
    }
  },
  "healthCheckHistory": [ ... ],
  "recommendation": "System stable. Normal check frequency."
}
```

#### Usage Example

```typescript
// In your episode loop
let episodeCount = 0;

while (running) {
  episodeCount++;
  
  // Execute episode
  const result = await executeEpisode();
  
  // Record performance
  await fetch('http://localhost:3000/api/health/episode', {
    method: 'POST',
    body: JSON.stringify({
      reward: result.reward,
      success: result.success,
      taskId: result.taskId
    })
  });
  
  // Check if health check should run
  const adaptive = await fetch('http://localhost:3000/api/health/adaptive')
    .then(r => r.json());
  
  if (episodeCount % adaptive.adaptive.checkFrequency === 0) {
    // Perform health check
    const health = await fetch('http://localhost:3000/api/health')
      .then(r => r.json());
    
    if (!health.healthy) {
      console.warn('Health issues detected:', health.issues);
      // Handle degradation
    }
  }
}
```

---

## Testing

Comprehensive test suites have been created:

### Governance System Tests
- Location: `tests/governance/governance_system.test.ts`
- Coverage: Initialization, compliance checking, violation detection, policy management, audit logging
- Test Count: 15+ test cases

### Decision Audit Logger Tests
- Location: `tests/governance/decision_audit_logger.test.ts`
- Coverage: Decision logging, querying, filtering, statistics, adaptive frequency
- Test Count: 20+ test cases

### Running Tests

```bash
npm test tests/governance/
```

---

## Integration Guide

### 1. Initialize GovernanceSystem in Your Application

```typescript
// app.ts
import { GovernanceSystem } from './src/governance/core/governance_system';

const governance = new GovernanceSystem({
  goalieDir: process.env.GOALIE_DIR || '.goalie',
  autoLogDecisions: true,
  strictMode: process.env.NODE_ENV === 'production'
});

await governance.initialize();

// Make available globally or via dependency injection
app.set('governance', governance);
```

### 2. Add Health Check Routes

```typescript
// server.ts
import healthCheckRouter from './src/api/health-check-endpoint';

app.use('/api', healthCheckRouter);
```

### 3. Validate Actions Before Execution

```typescript
// Before deploying, modifying, or executing critical operations
const approved = await governance.validateAction('critical-operation', {
  circle: 'orchestrator',
  ceremony: 'standup',
  userId: currentUser.id
});

if (!approved) {
  throw new Error('Operation blocked by governance policies');
}
```

### 4. Monitor Adaptive Frequency

```typescript
// Monitoring dashboard
setInterval(async () => {
  const adaptive = await fetch('/api/health/adaptive').then(r => r.json());
  
  console.log(`Check frequency: ${adaptive.adaptive.checkFrequency}`);
  console.log(`Stress level: ${adaptive.adaptive.stressLevel}`);
  console.log(`Anomaly rate: ${(adaptive.adaptive.anomalyRate * 100).toFixed(1)}%`);
  
  if (adaptive.adaptive.stressLevel === 'high') {
    // Alert operations team
    alertOps('System under high stress', adaptive);
  }
}, 60000); // Check every minute
```

---

## Success Metrics

### TRUTH - Direct Measurement Coverage
- ✅ GovernanceSystem returns **actual violations**
- ✅ Pattern metrics directly queried from `.goalie/pattern_metrics.jsonl`
- ✅ No stub implementations remaining
- ✅ 100% decision audit coverage

### TIME - Decision Audit Coverage
- ✅ All governance decisions logged with audit entries
- ✅ Semantic context included (rationale field)
- ✅ Full traceability with decision IDs
- ✅ Query capabilities for analysis

### LIVE - Calibration Adaptivity
- ✅ Check frequency responds to stress (1-20 range)
- ✅ Anomaly rate calculated from real metrics
- ✅ Automatic frequency adjustment
- ✅ Historical tracking enabled

---

## Next Steps (P1 & P2 Items)

While P0 items are complete, consider these enhancements:

### P1 Priority
1. **ROAM Staleness Detection**: Add CI checks for ROAM age < 3 days
2. **Pattern Metrics Enhancement**: Add rationale field to all pattern events
3. **Circuit Breaker Learning**: Implement learned thresholds from failure history

### P2 Priority
1. **Proxy Gaming Detection**: Flag gaming events in metrics
2. **Auto-Generated Runbooks**: Create from RESOLVED ROAM items
3. **CI Quality Gate**: Integrate coherence checks (target >95%)

---

## Troubleshooting

### Governance checks always pass
- Verify `.goalie/pattern_metrics.jsonl` exists and contains recent events
- Check that patterns are being logged with correct format
- Ensure timestamp format is ISO 8601

### Decision audit not logging
- Check `autoLogDecisions` is set to `true`
- Verify `.goalie` directory is writable
- Check SQLite is available (fallback to JSONL automatic)

### Adaptive frequency not changing
- Verify health metrics are being updated
- Check `/api/health/episode` is being called with correct data
- Ensure state persistence between health checks

### Tests failing
- Run `npm install` to ensure all dependencies installed
- Check Node.js version >= 18
- Verify test database directory permissions

---

## API Reference

### GovernanceSystem

#### `constructor(config?: GovernanceConfig)`
Initialize governance system with optional configuration.

#### `async initialize(): Promise<void>`
Load custom policies and prepare system.

#### `async checkCompliance(area?: string): Promise<ComplianceCheck[]>`
Check compliance against policies. Returns violations if any.

#### `async validateAction(action: string, context?: any): Promise<boolean>`
Validate if an action should be allowed based on compliance status.

#### `async getPolicies(): Promise<Policy[]>`
Get all active policies.

#### `async getPolicy(id: string): Promise<Policy | null>`
Get a specific policy by ID.

### DecisionAuditLogger

#### `logDecision(entry): string`
Log a decision and return decision ID.

#### `getRecentDecisions(limit?: number): DecisionAuditEntry[]`
Get recent decisions (default: 100).

#### `getDecisionsByResult(result, limit?): DecisionAuditEntry[]`
Filter decisions by result (approved/denied/warning).

#### `getDecisionsByPolicy(policyId, limit?): DecisionAuditEntry[]`
Filter decisions by policy ID.

#### `getStatistics(hours?: number): object`
Get statistics for time window.

#### `close(): void`
Close database connection.

---

## Change Log

### 2026-01-13
- ✅ Implemented real GovernanceSystem with pattern compliance
- ✅ Added DecisionAuditEntry database schema and logger
- ✅ Implemented adaptive health check frequency
- ✅ Created comprehensive test suites
- ✅ Documented all implementations

---

## Support

For questions or issues:
1. Check test files for usage examples
2. Review this documentation
3. Check `.goalie/` directory for logged data
4. Verify API endpoints with curl/Postman
