# Strategic Framework: CapEx→Revenue, Iteration Budgets & Site Health

## 1. CapEx to Revenue Conversion Tracking

### Revenue Attribution Model
```yaml
# .goalie/capex_revenue_tracking.yaml
capex_investments:
  vibethinker_integration:
    cost: 0  # Pre-trained model
    implementation_hours: 40
    hourly_rate: 150
    total_capex: 6000
    revenue_streams:
      - wsjf_accuracy_improvement: 15%  # Faster prioritization
      - pattern_discovery_automation: 80%  # Reduced manual analysis
      - risk_prediction_accuracy: 25%  # Better decision-making
    expected_monthly_revenue_lift: 5000
    roi_months: 1.2
    
  domain_infrastructure:
    cost: 200  # Domain registration
    implementation_hours: 20
    total_capex: 3200
    revenue_streams:
      - multi_tenant_subscriptions: 10_clients * 299/mo = 2990/mo
      - reduced_support_burden: 500/mo  # No IP configuration issues
    expected_monthly_revenue_lift: 3490
    roi_months: 0.9
    
  lionagi_qe_fleet:
    cost: 0  # Open source
    implementation_hours: 60
    total_capex: 9000
    revenue_streams:
      - qa_cost_reduction: 4000/mo  # 50% manual QA reduction
      - bug_prevention_savings: 2000/mo  # Fewer production issues
    expected_monthly_revenue_lift: 6000
    roi_months: 1.5

# Tracking command
capex_roi_calculation:
  total_capex: 18200
  monthly_revenue_lift: 14490
  blended_roi_months: 1.26
  breakeven_date: "2026-02-01"
```

### Implementation
```typescript
// tools/metrics/capex_revenue_tracker.ts
export interface CapExItem {
  name: string;
  totalCapEx: number;
  revenueStreams: RevenueStream[];
  actualRevenue: number[];  // Monthly actuals
  projectedRevenue: number; // Monthly projection
}

export interface RevenueStream {
  source: string;
  projectedMonthly: number;
  actualMonthly: number;
  attribution: number;  // 0-1, how much of actual is attributable
}

export function calculateROI(item: CapExItem, monthsElapsed: number): ROIMetrics {
  const totalActualRevenue = item.actualRevenue.slice(0, monthsElapsed).reduce((a, b) => a + b, 0);
  const roi = (totalActualRevenue - item.totalCapEx) / item.totalCapEx;
  const paybackMonths = item.totalCapEx / (totalActualRevenue / monthsElapsed);
  
  return {
    roi,
    paybackMonths,
    revenueVsProjected: totalActualRevenue / (item.projectedRevenue * monthsElapsed),
    breakeven: totalActualRevenue >= item.totalCapEx
  };
}
```

---

## 2. Iteration Budget & Early Stop Prevention

### Problem: Early stopping wastes partial work investment

### Solution: Dynamic iteration budgets with checkpoints

```typescript
// src/patterns/iteration_budget.ts
export interface IterationBudget {
  maxIterations: number;
  softLimit: number;        // Warning threshold (e.g., 80% of max)
  checkpointInterval: number; // Save progress every N iterations
  earlyStopCriteria: {
    minProgress: number;      // Minimum progress per iteration (0-1)
    stallIterations: number;  // Stop if no progress for N iterations
    confidence: number;       // Stop if confidence > threshold
  };
  costPerIteration: {
    compute: number;
    time_seconds: number;
  };
}

export function shouldContinue(
  currentIteration: number,
  budget: IterationBudget,
  progressHistory: number[]
): { continue: boolean; reason: string; checkpoint: boolean } {
  // Check hard limit
  if (currentIteration >= budget.maxIterations) {
    return { continue: false, reason: 'max_iterations_reached', checkpoint: true };
  }
  
  // Check soft limit - emit warning
  if (currentIteration >= budget.softLimit) {
    logPatternEvent('iteration_budget', 'advisory', {
      warning: 'soft_limit_reached',
      remaining: budget.maxIterations - currentIteration
    });
  }
  
  // Check progress stall (prevent early stop if making progress)
  const recentProgress = progressHistory.slice(-budget.earlyStopCriteria.stallIterations);
  const avgProgress = recentProgress.reduce((a, b) => a + b, 0) / recentProgress.length;
  
  if (avgProgress < budget.earlyStopCriteria.minProgress && currentIteration > budget.softLimit) {
    // Only stop if we're past soft limit AND not making progress
    return { continue: false, reason: 'progress_stalled', checkpoint: true };
  }
  
  // Checkpoint at intervals
  const checkpoint = currentIteration % budget.checkpointInterval === 0;
  
  return { continue: true, reason: 'within_budget', checkpoint };
}
```

### Configuration
```yaml
# .goalie/iteration_budgets.yaml
patterns:
  safe_degrade:
    max_iterations: 10
    soft_limit: 8
    checkpoint_interval: 2
    early_stop:
      min_progress: 0.05  # Must make 5% progress per iteration
      stall_iterations: 3
      confidence: 0.90
      
  wsjf_calculation:
    max_iterations: 5
    soft_limit: 4
    checkpoint_interval: 1
    early_stop:
      min_progress: 0.10
      stall_iterations: 2
      confidence: 0.85
```

---

## 3. Schema Validation Per Tier

### Multi-Tier Validation Architecture

```typescript
// src/validation/schema_validator.ts
export enum ValidationTier {
  BASIC = 1,      // Type checking, required fields
  STANDARD = 2,   // Business logic, ranges, formats
  STRICT = 3,     // Cross-field validation, invariants
  PARANOID = 4    // Historical consistency, audit trails
}

export interface SchemaValidation {
  tier: ValidationTier;
  schema: any;  // Zod/Joi schema
  customValidators: ValidationRule[];
}

// Example: WSJF item validation
const wsjfValidation: Record<ValidationTier, SchemaValidation> = {
  [ValidationTier.BASIC]: {
    tier: ValidationTier.BASIC,
    schema: z.object({
      userValue: z.number(),
      timeCrit: z.number(),
      riskOpp: z.number(),
      jobSize: z.number().positive()
    }),
    customValidators: []
  },
  
  [ValidationTier.STANDARD]: {
    tier: ValidationTier.STANDARD,
    schema: z.object({
      userValue: z.number().min(1).max(10),
      timeCrit: z.number().min(1).max(10),
      riskOpp: z.number().min(1).max(10),
      jobSize: z.number().min(1).max(20)
    }),
    customValidators: [
      (item) => item.userValue + item.timeCrit + item.riskOpp >= 6 || 'CoD too low'
    ]
  },
  
  [ValidationTier.STRICT]: {
    tier: ValidationTier.STRICT,
    schema: z.object({
      // ... all fields plus
      wsjf: z.number().positive(),
      cod: z.number().positive(),
      reasoning: z.array(z.string()).min(2)  // AI reasoning traces
    }),
    customValidators: [
      (item) => Math.abs(item.wsjf - item.cod / item.jobSize) < 0.01 || 'WSJF miscalculated',
      (item) => item.reasoning.length >= 2 || 'Insufficient reasoning'
    ]
  },
  
  [ValidationTier.PARANOID]: {
    tier: ValidationTier.PARANOID,
    schema: z.object({
      // ... all fields plus
      auditTrail: z.array(z.object({
        timestamp: z.string(),
        actor: z.string(),
        action: z.string(),
        previousValue: z.any(),
        newValue: z.any()
      }))
    }),
    customValidators: [
      (item) => validateHistoricalConsistency(item),
      (item) => validateApprovalChain(item)
    ]
  }
};

// Usage
export function validateWithTier<T>(
  data: T,
  tier: ValidationTier,
  schemas: Record<ValidationTier, SchemaValidation>
): ValidationResult {
  const validation = schemas[tier];
  
  try {
    // Zod validation
    validation.schema.parse(data);
    
    // Custom validators
    for (const validator of validation.customValidators) {
      const result = validator(data);
      if (typeof result === 'string') {
        throw new Error(result);
      }
    }
    
    return { valid: true, tier };
  } catch (error) {
    return { valid: false, tier, errors: [error.message] };
  }
}
```

### Tier Selection by Environment
```typescript
const VALIDATION_TIER = {
  development: ValidationTier.BASIC,
  staging: ValidationTier.STANDARD,
  production: ValidationTier.STRICT,
  audit: ValidationTier.PARANOID
}[process.env.NODE_ENV] || ValidationTier.BASIC;
```

---

## 4. Offload Sensorimotor to Specialized Agents

### Agent Specialization Architecture

```typescript
// tools/federation/sensorimotor_agents.ts
export interface SensorimotorAgent {
  id: string;
  capability: 'perception' | 'action' | 'coordination';
  specialization: string;
  circle: Circle;
}

// Perception agents (sensors)
const perceptionAgents: SensorimotorAgent[] = [
  {
    id: 'pattern-detector',
    capability: 'perception',
    specialization: 'pattern_metrics_analysis',
    circle: 'analyst'
  },
  {
    id: 'code-smell-detector',
    capability: 'perception',
    specialization: 'code_quality_assessment',
    circle: 'assessor'
  },
  {
    id: 'risk-sensor',
    capability: 'perception',
    specialization: 'risk_detection',
    circle: 'assessor'
  }
];

// Action agents (motor)
const actionAgents: SensorimotorAgent[] = [
  {
    id: 'test-generator',
    capability: 'action',
    specialization: 'test_case_generation',
    circle: 'innovator'
  },
  {
    id: 'code-refactorer',
    capability: 'action',
    specialization: 'automated_refactoring',
    circle: 'innovator'
  },
  {
    id: 'doc-generator',
    capability: 'action',
    specialization: 'documentation_generation',
    circle: 'seeker'
  }
];

// Coordination agents
const coordinationAgents: SensorimotorAgent[] = [
  {
    id: 'workflow-orchestrator',
    capability: 'coordination',
    specialization: 'multi_agent_coordination',
    circle: 'orchestrator'
  },
  {
    id: 'priority-resolver',
    capability: 'coordination',
    specialization: 'wsjf_prioritization',
    circle: 'orchestrator'
  }
];

// Delegation logic
export function delegateTask(task: Task): SensorimotorAgent[] {
  if (task.type === 'analyze_patterns') {
    return perceptionAgents.filter(a => a.specialization.includes('pattern'));
  } else if (task.type === 'generate_tests') {
    return actionAgents.filter(a => a.specialization.includes('test'));
  } else if (task.type === 'coordinate_workflow') {
    return coordinationAgents;
  }
  return [];
}
```

---

## 5. Guardrail Lock Enforcement

### Boundary Protection System

```typescript
// src/patterns/guardrail_lock.ts
export interface Guardrail {
  name: string;
  boundary: Boundary;
  enforcement: 'soft' | 'hard';
  violations: ViolationHandler[];
}

export interface Boundary {
  metric: string;
  operator: '<' | '>' | '==' | 'in_range';
  value: number | [number, number];
  unit: string;
}

// Example guardrails
const guardrails: Guardrail[] = [
  {
    name: 'max_memory_usage',
    boundary: { metric: 'memory_percent', operator: '<', value: 85, unit: '%' },
    enforcement: 'hard',
    violations: [
      { action: 'reject_operation', notify: true },
      { action: 'log_incident', severity: 'critical' }
    ]
  },
  {
    name: 'max_wip',
    boundary: { metric: 'active_work', operator: '<', value: 10, unit: 'tasks' },
    enforcement: 'hard',
    violations: [
      { action: 'queue_task', notify: false },
      { action: 'log_pattern_event', pattern: 'iteration_budget' }
    ]
  },
  {
    name: 'min_test_coverage',
    boundary: { metric: 'coverage_percent', operator: '>', value: 80, unit: '%' },
    enforcement: 'soft',
    violations: [
      { action: 'warn_user', message: 'Coverage below 80%' },
      { action: 'log_pattern_event', pattern: 'safe_degrade' }
    ]
  }
];

export function enforceGuardrail(
  guardrail: Guardrail,
  currentValue: number
): { allowed: boolean; actions: string[] } {
  const violated = checkBoundary(guardrail.boundary, currentValue);
  
  if (!violated) {
    return { allowed: true, actions: [] };
  }
  
  // Log violation
  logPatternEvent('guardrail_lock', 'mutation', {
    guardrail: guardrail.name,
    current: currentValue,
    boundary: guardrail.boundary,
    enforcement: guardrail.enforcement
  });
  
  // Execute violation handlers
  const actions = guardrail.violations.map(v => v.action);
  guardrail.violations.forEach(handler => executeHandler(handler));
  
  return {
    allowed: guardrail.enforcement === 'soft',
    actions
  };
}
```

---

## 6. WIP Limits for Unbounded Growth Prevention

### Token Bucket + Adaptive WIP

```typescript
// src/patterns/wip_limits.ts
export interface WIPConfig {
  maxConcurrent: number;
  perCircle: Record<Circle, number>;
  tokenBucket: {
    capacity: number;
    refillRate: number;  // tokens per second
  };
  adaptiveScaling: {
    enabled: boolean;
    cpuThreshold: number;
    scaleDownFactor: number;
  };
}

const defaultWIPConfig: WIPConfig = {
  maxConcurrent: 10,
  perCircle: {
    orchestrator: 3,
    analyst: 2,
    assessor: 2,
    innovator: 2,
    intuitive: 1,
    seeker: 1
  },
  tokenBucket: {
    capacity: 20,
    refillRate: 2  // 2 new tasks per second max
  },
  adaptiveScaling: {
    enabled: true,
    cpuThreshold: 75,
    scaleDownFactor: 0.5
  }
};

export class WIPLimiter {
  private activeWork = new Map<Circle, number>();
  private tokens: number;
  private lastRefill: number;
  
  constructor(private config: WIPConfig) {
    this.tokens = config.tokenBucket.capacity;
    this.lastRefill = Date.now();
  }
  
  canAcceptWork(circle: Circle): boolean {
    // Check per-circle limit
    const circleWork = this.activeWork.get(circle) || 0;
    if (circleWork >= this.config.perCircle[circle]) {
      logPatternEvent('iteration_budget', 'advisory', {
        reason: 'circle_wip_limit',
        circle,
        current: circleWork,
        limit: this.config.perCircle[circle]
      });
      return false;
    }
    
    // Check global limit
    const totalWork = Array.from(this.activeWork.values()).reduce((a, b) => a + b, 0);
    if (totalWork >= this.config.maxConcurrent) {
      logPatternEvent('iteration_budget', 'advisory', {
        reason: 'global_wip_limit',
        current: totalWork,
        limit: this.config.maxConcurrent
      });
      return false;
    }
    
    // Check token bucket
    this.refillTokens();
    if (this.tokens < 1) {
      logPatternEvent('iteration_budget', 'advisory', {
        reason: 'rate_limit',
        tokens: this.tokens
      });
      return false;
    }
    
    // Adaptive scaling based on CPU
    if (this.config.adaptiveScaling.enabled) {
      const cpuUsage = getCPUUsage();
      if (cpuUsage > this.config.adaptiveScaling.cpuThreshold) {
        const scaledLimit = Math.floor(this.config.maxConcurrent * this.config.adaptiveScaling.scaleDownFactor);
        if (totalWork >= scaledLimit) {
          logPatternEvent('safe_degrade', 'mutation', {
            reason: 'cpu_pressure',
            cpuUsage,
            scaledLimit
          });
          return false;
        }
      }
    }
    
    return true;
  }
  
  private refillTokens() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    const tokensToAdd = elapsed * this.config.tokenBucket.refillRate;
    this.tokens = Math.min(this.tokens + tokensToAdd, this.config.tokenBucket.capacity);
    this.lastRefill = now;
  }
}
```

---

## 7. Advisory Mode for Non-Mutating Analysis

### Mode Enforcement

```typescript
// src/patterns/advisory_mode.ts
export enum OperationMode {
  ADVISORY = 'advisory',    // Read-only, recommendations only
  MUTATE = 'mutate',        // Can modify code/config
  AUDIT = 'audit'           // Advisory + detailed logging
}

const MODE = (process.env.AF_PROD_CYCLE_MODE as OperationMode) || OperationMode.ADVISORY;

export function executeOperation<T>(
  operation: () => T,
  metadata: {
    name: string;
    mutating: boolean;
    circle: Circle;
  }
): OperationResult<T> {
  // Check if mutation is allowed
  if (metadata.mutating && MODE === OperationMode.ADVISORY) {
    logPatternEvent('advisory_mode', 'observability', {
      operation: metadata.name,
      action: 'blocked',
      reason: 'advisory_mode_active',
      recommendation: 'Set AF_PROD_CYCLE_MODE=mutate to execute'
    });
    
    return {
      success: false,
      mode: MODE,
      blocked: true,
      recommendation: `Would execute: ${metadata.name}`
    };
  }
  
  // Execute operation
  const startTime = Date.now();
  try {
    const result = operation();
    const duration = Date.now() - startTime;
    
    logPatternEvent(
      metadata.mutating ? 'mutation' : 'observability',
      MODE === OperationMode.AUDIT ? 'observability' : 'mutation',
      {
        operation: metadata.name,
        circle: metadata.circle,
        duration,
        mode: MODE
      }
    );
    
    return { success: true, result, mode: MODE, durationMs: duration };
  } catch (error) {
    logPatternEvent('failure_strategy', 'observability', {
      operation: metadata.name,
      error: error.message,
      mode: MODE
    });
    throw error;
  }
}

// Usage
const result = executeOperation(
  () => modifyBacklog(item),
  { name: 'update_wsjf', mutating: true, circle: 'analyst' }
);
```

---

## 8. Explicit Visibility via Pattern Metrics

### Comprehensive Observability

Already implemented in Phase 3! See:
- `src/runtime/processGovernorBridge.ts`
- `.goalie/pattern_metrics.jsonl`

Enhancement: Add visibility dashboard endpoint:

```typescript
// tools/dashboard/pattern_visibility_api.ts
export function getPatternVisibility(timeRange: TimeRange): PatternDashboard {
  const metrics = readPatternMetrics(timeRange);
  
  return {
    coverage: {
      patterns_detected: new Set(metrics.map(m => m.pattern)).size,
      total_events: metrics.length,
      circles_active: new Set(metrics.map(m => m.circle)).size,
      coverage_percent: calculateCoverage(metrics)
    },
    top_patterns: groupBy(metrics, 'pattern').map(([pattern, events]) => ({
      pattern,
      count: events.length,
      success_rate: events.filter(e => e.success).length / events.length,
      avg_duration: events.reduce((sum, e) => sum + e.durationMs, 0) / events.length
    })),
    degraded_states: metrics.filter(m => m.degraded),
    alerts: generateAlerts(metrics)
  };
}
```

---

## 9. Curriculum Learning with Baselines

### Progressive Difficulty + Baseline Tracking

```typescript
// src/learning/curriculum.ts
export interface CurriculumStage {
  stage: number;
  name: string;
  prerequisites: string[];
  baseline: Baseline;
  successCriteria: SuccessCriteria;
}

const curriculum: CurriculumStage[] = [
  {
    stage: 1,
    name: 'basic_wsjf_calculation',
    prerequisites: [],
    baseline: {
      accuracy: 0.70,
      latency_ms: 100,
      coverage: 0.50
    },
    successCriteria: {
      accuracy: 0.85,
      latency_ms: 50,
      coverage: 0.80
    }
  },
  {
    stage: 2,
    name: 'ai_enhanced_wsjf',
    prerequisites: ['basic_wsjf_calculation'],
    baseline: {
      accuracy: 0.85,
      latency_ms: 50,
      reasoning_quality: 0.70
    },
    successCriteria: {
      accuracy: 0.92,
      latency_ms: 100,  // Allowed to be slower
      reasoning_quality: 0.85
    }
  }
];

export function getCurrentStage(history: LearningHistory): CurriculumStage {
  for (const stage of curriculum) {
    const meetsPrereqs = stage.prerequisites.every(p => 
      history.completed.includes(p)
    );
    const meetsBaseline = checkBaseline(stage.baseline, history.current);
    
    if (meetsPrereqs && !meetsBaseline) {
      return stage;  // This is the current stage to work on
    }
  }
  return curriculum[curriculum.length - 1];  // All stages complete
}
```

---

## 10. Track Productivity Metrics (Not Just Output)

### Quality-Adjusted Productivity

```typescript
// tools/metrics/productivity_tracker.ts
export interface ProductivityMetrics {
  // Output metrics
  features_delivered: number;
  tests_written: number;
  bugs_fixed: number;
  
  // Quality metrics
  test_coverage: number;
  bug_escape_rate: number;
  code_review_cycles: number;
  
  // Efficiency metrics
  cycle_time_days: number;
  rework_percent: number;
  blocked_time_percent: number;
  
  // Learning metrics
  patterns_discovered: number;
  knowledge_docs_created: number;
  skills_acquired: string[];
  
  // Collaboration metrics
  cross_circle_interactions: number;
  knowledge_sharing_events: number;
}

export function calculateQualityAdjustedProductivity(
  metrics: ProductivityMetrics
): number {
  const outputScore = (
    metrics.features_delivered * 1.0 +
    metrics.tests_written * 0.5 +
    metrics.bugs_fixed * 0.3
  );
  
  const qualityMultiplier = (
    (metrics.test_coverage / 100) * 0.3 +
    (1 - metrics.bug_escape_rate) * 0.3 +
    (1 - metrics.rework_percent / 100) * 0.2 +
    (1 - metrics.blocked_time_percent / 100) * 0.2
  );
  
  const learningBonus = (
    metrics.patterns_discovered * 0.5 +
    metrics.knowledge_docs_created * 0.3
  );
  
  return outputScore * qualityMultiplier + learningBonus;
}
```

---

## 11. Site Health Components

### Multi-Domain Health Monitoring

```yaml
# .goalie/site_health_config.yaml
domains:
  - name: app.interface.tag.ooo
    role: primary_application
    healthcheck:
      endpoint: /health
      interval_seconds: 30
      timeout_ms: 5000
      expected_status: 200
    metrics:
      - response_time_p95
      - error_rate
      - active_users
    alerts:
      - condition: error_rate > 0.01
        severity: warning
      - condition: response_time_p95 > 1000
        severity: critical
        
  - name: billing.interface.tag.ooo
    role: billing_system
    healthcheck:
      endpoint: /api/health
      interval_seconds: 60
      critical: true  # Page on failure
    metrics:
      - transactions_per_minute
      - payment_success_rate
      - invoice_generation_latency
      
  - name: blog.interface.tag.ooo
    role: content_platform
    healthcheck:
      endpoint: /wp-admin/admin-ajax.php?action=heartbeat
      interval_seconds: 300
      critical: false
      
  - name: dev.interface.tag.ooo
    role: development_environment
    healthcheck:
      endpoint: /
      interval_seconds: 600
      critical: false
      
  - name: forum.interface.tag.ooo
    role: community_forum
    healthcheck:
      endpoint: /api/health
      interval_seconds: 120
    metrics:
      - active_discussions
      - posts_per_hour
      - moderation_queue_depth
      
  - name: starlingx.interface.tag.ooo
    role: infrastructure_management
    healthcheck:
      endpoint: /
      interval_seconds: 60
      critical: true
    metrics:
      - k8s_pods_ready
      - cpu_utilization
      - memory_utilization
```

### Implementation

```typescript
// tools/monitoring/site_health_checker.ts
export async function checkSiteHealth(domain: DomainConfig): Promise<HealthStatus> {
  const startTime = Date.now();
  
  try {
    const response = await fetch(`https://${domain.name}${domain.healthcheck.endpoint}`, {
      method: 'GET',
      timeout: domain.healthcheck.timeout_ms
    });
    
    const responseTime = Date.now() - startTime;
    const healthy = response.status === domain.healthcheck.expected_status;
    
    // Log to pattern metrics
    logPatternEvent('observability_first', 'observability', {
      domain: domain.name,
      role: domain.role,
      healthy,
      response_time_ms: responseTime,
      status_code: response.status
    });
    
    return {
      domain: domain.name,
      healthy,
      response_time_ms: responseTime,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    // Log failure
    logPatternEvent('failure_strategy', 'observability', {
      domain: domain.name,
      error: error.message,
      critical: domain.healthcheck.critical
    });
    
    if (domain.healthcheck.critical) {
      sendAlert(domain, error);
    }
    
    return {
      domain: domain.name,
      healthy: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}
```

---

## Summary: Execution Priorities

1. **NOW** (This Week):
   - ✅ CapEx→Revenue tracking (`.goalie/capex_revenue_tracking.yaml`)
   - ✅ Iteration budget guardrails (`iteration_budget.ts`)
   - ✅ Site health monitoring (all 6 domains)

2. **NEXT** (Next Sprint):
   - Schema validation tiers
   - WIP limits with adaptive scaling
   - Curriculum learning baselines

3. **LATER** (Ongoing):
   - Productivity metrics dashboard
   - Sensorimotor agent specialization
   - Advanced guardrail enforcement

All implementations follow your principles:
- ✅ Advisory mode by default
- ✅ Explicit pattern metrics visibility
- ✅ No new .md files (YAML/TS only)
- ✅ Graceful degradation
- ✅ <2s overhead per operation
