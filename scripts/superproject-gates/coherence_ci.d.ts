/**
 * Cross-Dimensional Coherence CI Checker
 *
 * P2-LIVE: CI quality gate for cross-dimensional coherence checks.
 *
 * This module provides CI-specific functionality for running coherence checks
 * in automated environments with machine-readable output and appropriate exit codes.
 *
 * @module calibration/coherence_ci
 */
/**
 * CI-specific configuration
 */
export interface CoherenceCIOptions {
    /** Coherence threshold (default: 0.95) */
    threshold?: number;
    /** PR intention/description */
    intention?: string;
    /** Code changes for analysis */
    codeChanges?: string;
    /** Commit messages */
    commitMessages?: string[];
    /** Enable CI mode (non-interactive) */
    ciMode?: boolean;
    /** Verbose output */
    verbose?: boolean;
}
/**
 * Coherence dimension scores
 */
export interface DimensionScores {
    /** TRUTH-TIME coherence: Are governance decisions properly audited? */
    truthTime: number;
    /** TRUTH-LIVE coherence: Do health checks reflect reality? */
    truthLive: number;
    /** TIME-LIVE coherence: Is calibration responsive to system state? */
    timeLive: number;
}
/**
 * Coherence gap for CI reporting
 */
export interface CoherenceCIGap {
    /** Type of gap */
    type: 'alignment' | 'synergy' | 'integration' | 'consistency';
    /** Severity level */
    severity: 'critical' | 'high' | 'medium' | 'low';
    /** Description of gap */
    description: string;
    /** Potential impact */
    impact: string;
    /** Recommended resolution */
    resolution: string;
}
/**
 * Remediation recommendation
 */
export interface RemediationRecommendation {
    /** Title of recommendation */
    title: string;
    /** Description */
    description: string;
    /** Implementation steps */
    steps: string[];
}
/**
 * CI check result
 */
export interface CoherenceCIResult {
    /** Overall coherence score (0-1) */
    overallCoherence: number;
    /** Dimension-specific scores */
    dimensionScores: DimensionScores;
    /** Threshold used */
    threshold: number;
    /** Whether threshold was met */
    meetsThreshold: boolean;
    /** Exit code for CI */
    exitCode: 0 | 1 | 2 | 3;
    /** Coherence gaps identified */
    gaps: CoherenceCIGap[];
    /** Remediation recommendations */
    recommendations: RemediationRecommendation[];
    /** Health status */
    health: 'healthy' | 'warning' | 'critical';
    /** Detailed report */
    report?: any;
}
/**
 * Run coherence check in CI mode
 *
 * This is the main entry point for CI execution. It calculates coherence
 * across TRUTH, TIME, and LIVE dimensions and returns a machine-readable
 * result with appropriate exit codes.
 *
 * Exit codes:
 * - 0: Pass (coherence >= threshold)
 * - 1: Warn (coherence meets threshold but has issues)
 * - 2: Fail (coherence < threshold)
 * - 3: Error (unexpected failure)
 *
 * @param options - CI check options
 * @returns Coherence check result
 *
 * @example
 * ```typescript
 * const result = runCoherenceCheckCI({
 *   threshold: 0.95,
 *   intention: 'Fix governance drift in calibration',
 *   codeChanges: '5 files changed, 200 insertions, 50 deletions',
 *   commitMessages: ['fix: update calibration thresholds', 'docs: add audit trail'],
 *   ciMode: true
 * });
 *
 * console.log(`Coherence: ${(result.overallCoherence * 100).toFixed(1)}%`);
 * console.log(`Exit code: ${result.exitCode}`);
 * process.exit(result.exitCode);
 * ```
 */
export declare function runCoherenceCheckCI(options: CoherenceCIOptions): CoherenceCIResult;
/**
 * CLI entry point for coherence check
 *
 * Supports --ci flag for non-interactive execution and --threshold for custom threshold.
 *
 * @example
 * ```bash
 * # Run with default 95% threshold
 * node dist/calibration/coherence_ci.js --ci
 *
 * # Run with custom threshold
 * node dist/calibration/coherence_ci.js --ci --threshold 0.90
 *
 * # Run with verbose output
 * node dist/calibration/coherence_ci.js --ci --verbose
 * ```
 */
export declare function runCoherenceCICLI(): Promise<void>;
//# sourceMappingURL=coherence_ci.d.ts.map