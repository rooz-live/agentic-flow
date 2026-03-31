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
 * Main PatternLogger class
 * Provides typed methods for logging all 6 core patterns
 */
export class PatternLogger {
    goalieDir;
    metricsFile;
    constructor(goalieDir) {
        this.goalieDir = goalieDir || this.getGoalieDirFromEnv();
        this.metricsFile = path.join(this.goalieDir, 'pattern_metrics.jsonl');
        // Ensure directory exists
        if (!fs.existsSync(this.goalieDir)) {
            fs.mkdirSync(this.goalieDir, { recursive: true });
        }
    }
    getGoalieDirFromEnv() {
        if (process.env.GOALIE_DIR) {
            return path.resolve(process.env.GOALIE_DIR);
        }
        return path.resolve(process.cwd(), '.goalie');
    }
    getCurrentDepth() {
        return parseInt(process.env.AF_DEPTH_LEVEL || '0', 10);
    }
    getCurrentRun() {
        return process.env.AF_RUN || process.env.AF_CONTEXT;
    }
    getCurrentRunId() {
        return process.env.AF_RUN_ID || `run-${Date.now()}`;
    }
    getCurrentIteration() {
        return parseInt(process.env.AF_RUN_ITERATION || '0', 10);
    }
    getCurrentCircle() {
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
    computeAlignmentScore(intent, policy, evidence, hasConsequence = false) {
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
    getBaseMetric() {
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
    getAlignedBaseMetric(intent, policy, actionCompleted, consequence, rationale) {
        const hasConsequence = consequence !== undefined && consequence.length > 0;
        const base = {
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
    async writeMetric(metric) {
        try {
            const line = JSON.stringify(metric) + '\n';
            fs.appendFileSync(this.metricsFile, line, 'utf8');
        }
        catch (err) {
            console.error('[PatternLogger] Failed to write metric:', err);
            throw err;
        }
    }
    /**
     * Log safe_degrade pattern event
     * Call when system gracefully degrades functionality under load
     */
    async logSafeDegrade(triggers, actions, recovery_cycles, options) {
        const metric = {
            ...this.getBaseMetric(),
            pattern: 'safe_degrade',
            triggers,
            actions,
            recovery_cycles,
            ...options,
        };
        await this.writeMetric(metric);
    }
    /**
     * Log circle_risk_focus pattern event
     * Call when prioritizing work based on risk analysis
     */
    async logCircleRiskFocus(top_owner, extra_iterations, roam_reduction, options) {
        const metric = {
            ...this.getBaseMetric(),
            pattern: 'circle_risk_focus',
            top_owner,
            extra_iterations,
            roam_reduction,
            ...options,
        };
        await this.writeMetric(metric);
    }
    /**
     * Log autocommit_shadow pattern event
     * Call when validating autonomous commit candidates
     */
    async logAutocommitShadow(candidates, manual_override, cycles_before_confidence, options) {
        const metric = {
            ...this.getBaseMetric(),
            pattern: 'autocommit_shadow',
            candidates,
            manual_override,
            cycles_before_confidence,
            ...options,
        };
        await this.writeMetric(metric);
    }
    /**
     * Log guardrail_lock pattern event
     * Call when enforcing safety boundaries
     */
    async logGuardrailLock(enforced, health_state, user_requests, options) {
        const metric = {
            ...this.getBaseMetric(),
            pattern: 'guardrail_lock',
            enforced,
            health_state,
            user_requests,
            ...options,
        };
        await this.writeMetric(metric);
    }
    /**
     * Log iteration_budget pattern event
     * Call when managing iteration resource allocation
     */
    async logIterationBudget(requested, enforced, autocommit_runs, options) {
        const metric = {
            ...this.getBaseMetric(),
            pattern: 'iteration_budget',
            requested,
            enforced,
            autocommit_runs,
            ...options,
        };
        await this.writeMetric(metric);
    }
    /**
     * Log observability_first pattern event
     * Call when validating metrics emission before execution
     */
    async logObservabilityFirst(metrics_written, missing_signals, suggestion_made, options) {
        const metric = {
            ...this.getBaseMetric(),
            pattern: 'observability_first',
            metrics_written,
            missing_signals,
            suggestion_made,
            ...options,
        };
        await this.writeMetric(metric);
    }
    /**
     * Query pattern metrics from file
     * Returns all metrics matching the pattern name
     */
    async queryPatterns(patternName) {
        if (!fs.existsSync(this.metricsFile)) {
            return [];
        }
        const content = fs.readFileSync(this.metricsFile, 'utf8');
        const lines = content.trim().split('\n').filter(l => l.length > 0);
        const metrics = [];
        for (const line of lines) {
            try {
                const metric = JSON.parse(line);
                if (!patternName || metric.pattern === patternName) {
                    metrics.push(metric);
                }
            }
            catch (err) {
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
    async getPatternCoverage() {
        const metrics = await this.queryPatterns();
        const coverage = {};
        for (const metric of metrics) {
            coverage[metric.pattern] = (coverage[metric.pattern] || 0) + 1;
        }
        return coverage;
    }
    /**
     * Validate observability-first compliance
     * Returns true if observability_first pattern is present for current run
     */
    async validateObservabilityFirst() {
        const currentRun = this.getCurrentRun();
        if (!currentRun)
            return true; // Skip validation if no run context
        const metrics = await this.queryPatterns('observability_first');
        return metrics.some(m => m.run === currentRun);
    }
    /**
     * P1-TRUTH: Compute learned threshold based on P99 latency
     * Auto-generates circuit breaker thresholds from historical performance
     */
    async computeLearnedThreshold(pattern) {
        const metrics = await this.queryPatterns(pattern);
        const latencyValues = metrics
            .filter(m => m.latency_ms !== undefined)
            .map(m => m.latency_ms)
            .sort((a, b) => a - b);
        if (latencyValues.length < 10)
            return null;
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
export async function logLoadDegrade(loadMetric, actions) {
    await patternLogger.logSafeDegrade(1, actions, 0, {
        load_metric: loadMetric,
        degradation_level: loadMetric > 90 ? 'full' : 'partial',
    });
}
/**
 * Log risk-based prioritization decision
 */
export async function logRiskPrioritization(owner, p0Count) {
    await patternLogger.logCircleRiskFocus(owner, p0Count, 0, {
        risk_count: p0Count,
        p0_risks: p0Count,
    });
}
/**
 * Log prod-cycle observability validation
 */
export async function logProdCycleObservability(metricsCount, missing) {
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
export async function logAlignedPattern(pattern, data, alignment) {
    const alignmentScore = patternLogger.computeAlignmentScore(alignment.intent, alignment.policy, alignment.completed, alignment.consequence.length > 0);
    const metric = {
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
export function calculateVigilanceMetrics(patterns) {
    const patternsWithConsequence = patterns.filter(p => p.consequence !== undefined && p.consequence.length > 0);
    const patternsWithTracking = patterns.filter(p => p.alignment_score?.consequence_tracked === true);
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
//# sourceMappingURL=pattern_logger.js.map