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

export default PatternLogger;
