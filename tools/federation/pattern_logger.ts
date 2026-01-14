/**
 * Pattern Logger - Canonical implementation for all observability-first patterns
 *
 * This module provides structured logging for the 6 core governance patterns:
 * 1. safe_degrade - Graceful degradation under load
 * 2. circle_risk_focus - Risk-based prioritization
 * 3. autocommit_shadow - Autonomous commit validation
 * 4. guardrail_lock - Enforcement boundaries
 * 5. iteration_budget - Resource allocation
 * 6. observability_first - Metrics-driven execution
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Alignment Score - Manthra/Yasna/Mithra Framework (P1-B Spiritual Dimension Recovery)
 * Tracks thought-word-action consistency for philosophical integrity
 */
export interface AlignmentScore {
  manthra_score: number;   // Intent alignment (0-1): thought-power, directed intention
  yasna_score: number;     // Policy alignment (0-1): structured action, ritual alignment
  mithra_score: number;    // Evidence alignment (0-1): binding force, outcome tracking
  overall_drift: number;   // Aggregate drift (0-1): lower is better
  consequence_tracked: boolean; // Vigilance indicator: was outcome measured?
}

/**
 * Semantic Rationale - P1-TIME: Structured context for pattern decisions
 * Provides human-readable and machine-parseable decision context
 */
export interface SemanticRationale {
  why: string;                      // Why this pattern was triggered
  context?: string;                 // Situational context (optional)
  decision_logic?: string;          // Decision-making process (optional)
  alternatives_considered?: string[]; // Other options evaluated (optional)
}

/**
 * Decision Context - P1-TIME: Extended context for governance decisions
 * Links pattern execution to broader governance framework
 */
export interface DecisionContext {
  trigger_source: string;           // What triggered this decision (e.g., 'health_check', 'user_request', 'scheduled')
  governance_dimension?: 'TRUTH' | 'TIME' | 'LIVE';  // Which governance dimension applies
  plan_id?: string;                 // Associated Plan ID from PDA framework
  do_id?: string;                   // Associated Do ID from PDA framework
  act_id?: string;                  // Associated Act ID from PDA framework
  circle?: string;                  // Circle responsible for this decision
  escalation_path?: string[];       // Escalation chain if applicable
}

/**
 * ROAM Reference - P1-TIME: Link to ROAM tracker items
 * Connects pattern execution to risk/blocker tracking
 */
export interface ROAMReference {
  roam_id: string;                  // ID from ROAM_TRACKER.yaml (e.g., 'RISK-001')
  roam_status: 'RESOLVED' | 'OWNED' | 'ACCEPTED' | 'MITIGATING';
  roam_type: 'risk' | 'blocker' | 'dependency';
  mitigation_applied?: string;      // What mitigation was applied
  resolution_evidence?: string;     // Evidence of resolution if RESOLVED
}

/**
 * Base interface for all pattern metrics
 * All patterns must include these core fields
 */
export interface PatternMetric {
  timestamp: string;
  pattern: string;
  depth: number;
  run?: string;
  run_id?: string;
  iteration?: number;
  circle?: string;
  alignment_score?: AlignmentScore; // P1-B: Spiritual dimension tracking
  action_completed?: boolean;       // Ethical dimension: visible outcome
  consequence?: string;             // Vigilance: what happened as a result
  rationale?: SemanticRationale;    // P1-TIME: Semantic context for decisions
  decision_context?: DecisionContext; // P1-TIME: Extended governance context
  roam_reference?: ROAMReference;   // P1-TIME: Link to ROAM tracker items
  [key: string]: any;
}

/**
 * Schema for safe_degrade pattern
 * Tracks graceful degradation triggers and recovery
 */
export interface SafeDegradeMetric extends PatternMetric {
  pattern: 'safe_degrade';
  triggers: number;
  actions: string[];
  recovery_cycles: number;
  load_metric?: number;
  degradation_level?: 'none' | 'partial' | 'full';
}

/**
 * Schema for circle_risk_focus pattern
 * Tracks risk ownership and mitigation
 */
export interface CircleRiskFocusMetric extends PatternMetric {
  pattern: 'circle_risk_focus';
  top_owner: string;
  extra_iterations: number;
  roam_reduction: number;
  risk_count?: number;
  p0_risks?: number;
}

/**
 * Schema for autocommit_shadow pattern
 * Tracks autonomous commit validation
 */
export interface AutocommitShadowMetric extends PatternMetric {
  pattern: 'autocommit_shadow';
  candidates: number;
  manual_override: boolean;
  cycles_before_confidence: number;
  confidence_threshold?: number;
  shadow_validation?: boolean;
}

/**
 * Schema for guardrail_lock pattern
 * Tracks enforcement boundaries
 */
export interface GuardrailLockMetric extends PatternMetric {
  pattern: 'guardrail_lock';
  enforced: boolean;
  health_state: string;
  user_requests: number;
  lock_reason?: string;
  override_attempts?: number;
}

/**
 * Schema for iteration_budget pattern
 * Tracks resource allocation and limits
 */
export interface IterationBudgetMetric extends PatternMetric {
  pattern: 'iteration_budget';
  requested: number;
  enforced: number;
  autocommit_runs: number;
  budget_exhausted?: boolean;
  efficiency_ratio?: number;
}

/**
 * Schema for observability_first pattern
 * Tracks metrics emission and completeness
 */
export interface ObservabilityFirstMetric extends PatternMetric {
  pattern: 'observability_first';
  metrics_written: number;
  missing_signals: string[];
  suggestion_made: boolean;
  coverage_pct?: number;
  critical_missing?: boolean;
}

/**
 * Main PatternLogger class
 * Provides typed methods for logging all 6 core patterns
 */
export class PatternLogger {
  private goalieDir: string;
  private metricsFile: string;

  constructor(goalieDir?: string) {
    this.goalieDir = goalieDir || this.getGoalieDirFromEnv();
    this.metricsFile = path.join(this.goalieDir, 'pattern_metrics.jsonl');

    // Ensure directory exists
    if (!fs.existsSync(this.goalieDir)) {
      fs.mkdirSync(this.goalieDir, { recursive: true });
    }
  }

  private getGoalieDirFromEnv(): string {
    if (process.env.GOALIE_DIR) {
      return path.resolve(process.env.GOALIE_DIR);
    }
    return path.resolve(process.cwd(), '.goalie');
  }

  private getCurrentDepth(): number {
    return parseInt(process.env.AF_DEPTH_LEVEL || '0', 10);
  }

  private getCurrentRun(): string | undefined {
    return process.env.AF_RUN || process.env.AF_CONTEXT;
  }

  private getCurrentRunId(): string {
    return process.env.AF_RUN_ID || `run-${Date.now()}`;
  }

  private getCurrentIteration(): number {
    return parseInt(process.env.AF_RUN_ITERATION || '0', 10);
  }

  private getCurrentCircle(): string {
    return process.env.AF_CIRCLE || 'default';
  }

  /**
   * Compute alignment score using Manthra/Yasna/Mithra framework
   * P1-B: Spiritual Dimension Recovery implementation
   *
   * @param intent - The declared intention (thought-power)
   * @param policy - The governing policy/rule (structured action)
   * @param evidence - The actual outcome/evidence (binding force)
   * @param hasConsequence - Whether the outcome was tracked
   */
  computeAlignmentScore(
    intent: string | undefined,
    policy: string | undefined,
    evidence: boolean | undefined,
    hasConsequence: boolean = false
  ): AlignmentScore {
    // Manthra score: Intent clarity (is there directed thought-power?)
    const manthra_score = intent ? 0.9 : 0.3;

    // Yasna score: Policy alignment (is there structured action?)
    const yasna_score = policy ? 1.0 : 0.5;

    // Mithra score: Evidence binding (is outcome tracked?)
    const mithra_score = evidence !== undefined ? (evidence ? 1.0 : 0.7) : 0.3;

    // Overall drift: inverse of alignment (0 = perfect alignment, 1 = total drift)
    const avgAlignment = (manthra_score + yasna_score + mithra_score) / 3;
    const overall_drift = Math.round((1 - avgAlignment) * 1000) / 1000;

    return {
      manthra_score,
      yasna_score,
      mithra_score,
      overall_drift,
      consequence_tracked: hasConsequence
    };
  }

  private getBaseMetric(): Partial<PatternMetric> {
    return {
      timestamp: new Date().toISOString(),
      depth: this.getCurrentDepth(),
      run: this.getCurrentRun(),
      run_id: this.getCurrentRunId(),
      iteration: this.getCurrentIteration(),
      circle: this.getCurrentCircle(),
    };
  }

  /**
   * Enhanced base metric with alignment score and semantic rationale
   * P1-B: Automatically compute spiritual dimension tracking
   * P1-TIME: Include semantic context for decisions
   */
  private getAlignedBaseMetric(
    intent?: string,
    policy?: string,
    actionCompleted?: boolean,
    consequence?: string,
    rationale?: SemanticRationale
  ): Partial<PatternMetric> {
    const hasConsequence = consequence !== undefined && consequence.length > 0;
    const base: Partial<PatternMetric> = {
      ...this.getBaseMetric(),
      alignment_score: this.computeAlignmentScore(intent, policy, actionCompleted, hasConsequence),
      action_completed: actionCompleted ?? true,
      consequence: consequence
    };

    // P1-TIME: Add rationale if provided
    if (rationale) {
      base.rationale = rationale;
    }

    return base;
  }

  private async writeMetric(metric: PatternMetric): Promise<void> {
    try {
      const line = JSON.stringify(metric) + '\n';
      fs.appendFileSync(this.metricsFile, line, 'utf8');
    } catch (err) {
      console.error('[PatternLogger] Failed to write metric:', err);
      throw err;
    }
  }

  /**
   * Log safe_degrade pattern event
   * Call when system gracefully degrades functionality under load
   */
  async logSafeDegrade(
    triggers: number,
    actions: string[],
    recovery_cycles: number,
    options?: {
      load_metric?: number;
      degradation_level?: 'none' | 'partial' | 'full';
      rationale?: SemanticRationale;
      roam_reference?: ROAMReference;
    }
  ): Promise<void> {
    const metric: SafeDegradeMetric = {
      ...this.getBaseMetric(),
      pattern: 'safe_degrade',
      triggers,
      actions,
      recovery_cycles,
      ...options,
    } as SafeDegradeMetric;

    await this.writeMetric(metric);
  }

  /**
   * Log circle_risk_focus pattern event
   * Call when prioritizing work based on risk analysis
   */
  async logCircleRiskFocus(
    top_owner: string,
    extra_iterations: number,
    roam_reduction: number,
    options?: {
      risk_count?: number;
      p0_risks?: number;
      rationale?: SemanticRationale;
      roam_reference?: ROAMReference;
    }
  ): Promise<void> {
    const metric: CircleRiskFocusMetric = {
      ...this.getBaseMetric(),
      pattern: 'circle_risk_focus',
      top_owner,
      extra_iterations,
      roam_reduction,
      ...options,
    } as CircleRiskFocusMetric;

    await this.writeMetric(metric);
  }

  /**
   * Log autocommit_shadow pattern event
   * Call when validating autonomous commit candidates
   */
  async logAutocommitShadow(
    candidates: number,
    manual_override: boolean,
    cycles_before_confidence: number,
    options?: {
      confidence_threshold?: number;
      shadow_validation?: boolean;
    }
  ): Promise<void> {
    const metric: AutocommitShadowMetric = {
      ...this.getBaseMetric(),
      pattern: 'autocommit_shadow',
      candidates,
      manual_override,
      cycles_before_confidence,
      ...options,
    } as AutocommitShadowMetric;

    await this.writeMetric(metric);
  }

  /**
   * Log guardrail_lock pattern event
   * Call when enforcing safety boundaries
   */
  async logGuardrailLock(
    enforced: boolean,
    health_state: string,
    user_requests: number,
    options?: {
      lock_reason?: string;
      override_attempts?: number;
    }
  ): Promise<void> {
    const metric: GuardrailLockMetric = {
      ...this.getBaseMetric(),
      pattern: 'guardrail_lock',
      enforced,
      health_state,
      user_requests,
      ...options,
    } as GuardrailLockMetric;

    await this.writeMetric(metric);
  }

  /**
   * Log iteration_budget pattern event
   * Call when managing iteration resource allocation
   */
  async logIterationBudget(
    requested: number,
    enforced: number,
    autocommit_runs: number,
    options?: {
      budget_exhausted?: boolean;
      efficiency_ratio?: number;
    }
  ): Promise<void> {
    const metric: IterationBudgetMetric = {
      ...this.getBaseMetric(),
      pattern: 'iteration_budget',
      requested,
      enforced,
      autocommit_runs,
      ...options,
    } as IterationBudgetMetric;

    await this.writeMetric(metric);
  }

  /**
   * Log observability_first pattern event
   * Call when validating metrics emission before execution
   */
  async logObservabilityFirst(
    metrics_written: number,
    missing_signals: string[],
    suggestion_made: boolean,
    options?: {
      coverage_pct?: number;
      critical_missing?: boolean;
    }
  ): Promise<void> {
    const metric: ObservabilityFirstMetric = {
      ...this.getBaseMetric(),
      pattern: 'observability_first',
      metrics_written,
      missing_signals,
      suggestion_made,
      ...options,
    } as ObservabilityFirstMetric;

    await this.writeMetric(metric);
  }

  /**
   * Query pattern metrics from file
   * Returns all metrics matching the pattern name
   */
  async queryPatterns(patternName?: string): Promise<PatternMetric[]> {
    if (!fs.existsSync(this.metricsFile)) {
      return [];
    }

    const content = fs.readFileSync(this.metricsFile, 'utf8');
    const lines = content.trim().split('\n').filter(l => l.length > 0);

    const metrics: PatternMetric[] = [];
    for (const line of lines) {
      try {
        const metric = JSON.parse(line);
        if (!patternName || metric.pattern === patternName) {
          metrics.push(metric);
        }
      } catch (err) {
        // Skip invalid JSON lines
        continue;
      }
    }

    return metrics;
  }

  /**
   * Get pattern coverage statistics
   * Returns count of each pattern type
   */
  async getPatternCoverage(): Promise<Record<string, number>> {
    const metrics = await this.queryPatterns();
    const coverage: Record<string, number> = {};

    for (const metric of metrics) {
      coverage[metric.pattern] = (coverage[metric.pattern] || 0) + 1;
    }

    return coverage;
  }

  /**
   * Validate observability-first compliance
   * Returns true if observability_first pattern is present for current run
   */
  async validateObservabilityFirst(): Promise<boolean> {
    const currentRun = this.getCurrentRun();
    if (!currentRun) return true; // Skip validation if no run context

    const metrics = await this.queryPatterns('observability_first');
    return metrics.some(m => m.run === currentRun);
  }

  /**
   * P1-TRUTH: Compute learned threshold based on P99 latency
   * Auto-generates circuit breaker thresholds from historical performance
   */
  async computeLearnedThreshold(pattern: string): Promise<number | null> {
    const metrics = await this.queryPatterns(pattern);
    const latencyValues = metrics
      .filter(m => m.latency_ms !== undefined)
      .map(m => m.latency_ms as number)
      .sort((a, b) => a - b);

    if (latencyValues.length < 10) return null;

    // Calculate P99 latency
    const p99Index = Math.floor(latencyValues.length * 0.99);
    const p99Latency = latencyValues[p99Index];

    // Learned threshold is 1.5x P99 latency
    const learnedThreshold = p99Latency * 1.5;

    console.log(`[PatternLogger] Learned threshold for ${pattern}: ${learnedThreshold.toFixed(2)}ms (P99: ${p99Latency}ms)`);

    return learnedThreshold;
  }
}

/**
 * Singleton instance for convenience
 */
export const patternLogger = new PatternLogger();

/**
 * Helper functions for common logging scenarios
 */

/**
 * Log safe degradation triggered by high system load
 */
export async function logLoadDegrade(loadMetric: number, actions: string[]): Promise<void> {
  await patternLogger.logSafeDegrade(1, actions, 0, {
    load_metric: loadMetric,
    degradation_level: loadMetric > 90 ? 'full' : 'partial',
  });
}

/**
 * Log risk-based prioritization decision
 */
export async function logRiskPrioritization(owner: string, p0Count: number): Promise<void> {
  await patternLogger.logCircleRiskFocus(owner, p0Count, 0, {
    risk_count: p0Count,
    p0_risks: p0Count,
  });
}

/**
 * Log prod-cycle observability validation
 */
export async function logProdCycleObservability(metricsCount: number, missing: string[]): Promise<void> {
  const isCritical = missing.length > 0;
  await patternLogger.logObservabilityFirst(metricsCount, missing, isCritical, {
    coverage_pct: missing.length === 0 ? 100 : 0,
    critical_missing: isCritical,
  });
}

/**
 * P1-B: Log pattern with full Manthra/Yasna/Mithra alignment tracking
 * Use this for patterns that need spiritual dimension recovery
 *
 * @param pattern - Pattern name
 * @param data - Pattern-specific data
 * @param alignment - Alignment context (intent, policy, outcome, consequence)
 */
export async function logAlignedPattern(
  pattern: string,
  data: Record<string, any>,
  alignment: {
    intent: string;      // Manthra: What was the directed thought-power?
    policy: string;      // Yasna: What rule/phase governed the action?
    completed: boolean;  // Was the action completed?
    consequence: string; // What happened as a result?
  }
): Promise<void> {
  const alignmentScore = patternLogger.computeAlignmentScore(
    alignment.intent,
    alignment.policy,
    alignment.completed,
    alignment.consequence.length > 0
  );

  const metric: PatternMetric = {
    timestamp: new Date().toISOString(),
    pattern,
    depth: parseInt(process.env.AF_DEPTH_LEVEL || '0', 10),
    run: process.env.AF_RUN || process.env.AF_CONTEXT,
    run_id: process.env.AF_RUN_ID || `run-${Date.now()}`,
    iteration: parseInt(process.env.AF_RUN_ITERATION || '0', 10),
    circle: process.env.AF_CIRCLE || 'default',
    alignment_score: alignmentScore,
    action_completed: alignment.completed,
    consequence: alignment.consequence,
    ...data
  };

  // Write directly using already imported fs module
  const goalieDir = process.env.GOALIE_DIR || '.goalie';
  const metricsFile = `${goalieDir}/pattern_metrics.jsonl`;
  fs.appendFileSync(metricsFile, JSON.stringify(metric) + '\n', 'utf8');
}

/**
 * P2-B: Calculate vigilance metrics from existing patterns
 * Returns vigilance score and deficit analysis
 */
export function calculateVigilanceMetrics(patterns: PatternMetric[]): {
  vigilance_score: number;
  deficit: number;
  patterns_with_consequence: number;
  total_patterns: number;
  avg_consequence_awareness: number;
} {
  const patternsWithConsequence = patterns.filter(p =>
    p.consequence !== undefined && p.consequence.length > 0
  );

  const patternsWithTracking = patterns.filter(p =>
    p.alignment_score?.consequence_tracked === true
  );

  const total = patterns.length;
  const tracked = patternsWithConsequence.length + patternsWithTracking.length;
  const vigilance_score = total > 0 ? tracked / total : 0;

  return {
    vigilance_score,
    deficit: 1 - vigilance_score,
    patterns_with_consequence: tracked,
    total_patterns: total,
    avg_consequence_awareness: vigilance_score
  };
}

export default PatternLogger;
