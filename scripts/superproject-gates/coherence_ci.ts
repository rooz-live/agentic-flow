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

import {
  createCrossDimensionalCoherenceSystem,
  CrossDimensionalCoherenceSystem,
  CrossDimensionalConfig,
  DEFAULT_CROSS_DIMENSIONAL_CONFIG
} from './cross-dimensional-coherence.js';

import {
  createCalibrationSystem,
  CalibrationSystem
} from './index.js';

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
 * Default CI configuration
 */
const DEFAULT_CI_CONFIG: Partial<CrossDimensionalConfig> = {
  coherenceThreshold: 0.95,
  enableTrendAnalysis: false, // Disable for CI speed
  verbose: false
};

/**
 * Calculate TRUTH-TIME coherence
 * 
 * Measures whether governance decisions are properly audited over time.
 * 
 * TRUTH: Governance decisions, audit trails, evidence chains
 * TIME: Temporal consistency, historical tracking, calibration cycles
 * 
 * @param intention - PR intention/description
 * @param commitMessages - Commit history
 * @returns Coherence score (0-1)
 */
function calculateTruthTimeCoherence(
  intention?: string,
  commitMessages?: string[]
): number {
  let score = 0.85; // Base score

  // Check if intention is documented (TRUTH)
  if (intention && intention.length > 20) {
    score += 0.05;
  }

  // Check if commits follow temporal patterns (TIME)
  if (commitMessages && commitMessages.length > 0) {
    const hasTemporalKeywords = commitMessages.some(msg =>
      /fix|refactor|update|migrate|deprecated/i.test(msg)
    );
    if (hasTemporalKeywords) {
      score += 0.05;
    }

    // Check for audit trail consistency
    const hasAuditKeywords = commitMessages.some(msg =>
      /audit|review|verify|validate|check/i.test(msg)
    );
    if (hasAuditKeywords) {
      score += 0.03;
    }
  }

  return Math.min(1, score);
}

/**
 * Calculate TRUTH-LIVE coherence
 * 
 * Measures whether health checks reflect actual system state.
 * 
 * TRUTH: Evidence chains, audit entries, documented state
 * LIVE: Health checks, runtime metrics, system status
 * 
 * @param codeChanges - Code change statistics
 * @returns Coherence score (0-1)
 */
function calculateTruthLiveCoherence(codeChanges?: string): number {
  let score = 0.80; // Base score

  if (!codeChanges) {
    return score;
  }

  // Check if health-related files are modified
  const hasHealthChanges = /health|metric|monitor|check/i.test(codeChanges);
  if (hasHealthChanges) {
    score += 0.08;
  }

  // Check if test files are updated (validates health)
  const hasTestChanges = /test\.|spec\./i.test(codeChanges);
  if (hasTestChanges) {
    score += 0.07;
  }

  // Check for evidence chain updates
  const hasEvidenceChanges = /evidence|audit|trail/i.test(codeChanges);
  if (hasEvidenceChanges) {
    score += 0.05;
  }

  return Math.min(1, score);
}

/**
 * Calculate TIME-LIVE coherence
 * 
 * Measures whether calibration is responsive to system state.
 * 
 * TIME: Calibration cycles, drift prevention, temporal consistency
 * LIVE: Runtime metrics, health status, system state
 * 
 * @param commitMessages - Commit history
 * @param codeChanges - Code change statistics
 * @returns Coherence score (0-1)
 */
function calculateTimeLiveCoherence(
  commitMessages?: string[],
  codeChanges?: string
): number {
  let score = 0.82; // Base score

  // Check for calibration-related changes
  if (commitMessages && commitMessages.length > 0) {
    const hasCalibrationKeywords = commitMessages.some(msg =>
      /calibrat|adjust|tune|optimize|drift/i.test(msg)
    );
    if (hasCalibrationKeywords) {
      score += 0.08;
    }

    // Check for responsiveness to issues
    const hasFixKeywords = commitMessages.some(msg =>
      /fix|bug|issue|resolve/i.test(msg)
    );
    if (hasFixKeywords) {
      score += 0.05;
    }
  }

  // Check if runtime/system files are modified
  if (codeChanges) {
    const hasRuntimeChanges = /runtime|system|core|framework/i.test(codeChanges);
    if (hasRuntimeChanges) {
      score += 0.05;
    }
  }

  return Math.min(1, score);
}

/**
 * Generate remediation recommendations based on coherence gaps
 */
function generateRemediationRecommendations(
  dimensionScores: DimensionScores,
  threshold: number
): RemediationRecommendation[] {
  const recommendations: RemediationRecommendation[] = [];

  // TRUTH-TIME recommendations
  if (dimensionScores.truthTime < threshold) {
    recommendations.push({
      title: 'Improve Governance Audit Trail',
      description: 'Governance decisions need better temporal tracking and audit documentation.',
      steps: [
        'Document all governance decisions with clear rationales',
        'Maintain audit trail for all calibration changes',
        'Use commit messages to track decision evolution',
        'Implement evidence chain validation'
      ]
    });
  }

  // TRUTH-LIVE recommendations
  if (dimensionScores.truthLive < threshold) {
    recommendations.push({
      title: 'Align Health Checks with Reality',
      description: 'Health checks need to better reflect actual system state.',
      steps: [
        'Review health check metrics for accuracy',
        'Update tests to validate health check behavior',
        'Ensure evidence chains match runtime state',
        'Add integration tests for health monitoring'
      ]
    });
  }

  // TIME-LIVE recommendations
  if (dimensionScores.timeLive < threshold) {
    recommendations.push({
      title: 'Improve Calibration Responsiveness',
      description: 'Calibration system needs to be more responsive to system state changes.',
      steps: [
        'Implement drift detection and auto-adjustment',
        'Add calibration cycle triggers on system events',
        'Monitor calibration effectiveness metrics',
        'Create calibration feedback loops'
      ]
    });
  }

  return recommendations;
}

/**
 * Identify coherence gaps based on dimension scores
 */
function identifyCoherenceGaps(
  dimensionScores: DimensionScores,
  threshold: number
): CoherenceCIGap[] {
  const gaps: CoherenceCIGap[] = [];

  // TRUTH-TIME gaps
  if (dimensionScores.truthTime < threshold * 0.7) {
    gaps.push({
      type: 'alignment',
      severity: 'critical',
      description: 'Governance decisions lack proper temporal audit trail',
      impact: 'Unable to track decision evolution and accountability over time',
      resolution: 'Implement comprehensive audit trail with evidence chains'
    });
  } else if (dimensionScores.truthTime < threshold) {
    gaps.push({
      type: 'alignment',
      severity: 'high',
      description: 'Governance decisions have weak temporal tracking',
      impact: 'Limited visibility into decision history and evolution',
      resolution: 'Strengthen audit trail documentation practices'
    });
  }

  // TRUTH-LIVE gaps
  if (dimensionScores.truthLive < threshold * 0.7) {
    gaps.push({
      type: 'integration',
      severity: 'critical',
      description: 'Health checks do not reflect actual system state',
      impact: 'False sense of system health and reliability',
      resolution: 'Align health check metrics with real system behavior'
    });
  } else if (dimensionScores.truthLive < threshold) {
    gaps.push({
      type: 'integration',
      severity: 'high',
      description: 'Health checks partially disconnected from reality',
      impact: 'Potential for undetected system issues',
      resolution: 'Improve health check accuracy and validation'
    });
  }

  // TIME-LIVE gaps
  if (dimensionScores.timeLive < threshold * 0.7) {
    gaps.push({
      type: 'synergy',
      severity: 'critical',
      description: 'Calibration not responsive to system state changes',
      impact: 'System drifts without timely correction',
      resolution: 'Implement responsive calibration with drift prevention'
    });
  } else if (dimensionScores.timeLive < threshold) {
    gaps.push({
      type: 'synergy',
      severity: 'high',
      description: 'Calibration has delayed response to system changes',
      impact: 'System operates sub-optimally between calibration cycles',
      resolution: 'Improve calibration trigger mechanisms'
    });
  }

  // Consistency gap (all dimensions below threshold)
  if (dimensionScores.truthTime < threshold &&
      dimensionScores.truthLive < threshold &&
      dimensionScores.timeLive < threshold) {
    gaps.push({
      type: 'consistency',
      severity: 'critical',
      description: 'All coherence dimensions below threshold',
      impact: 'System-wide governance drift risk',
      resolution: 'Comprehensive governance audit and remediation required'
    });
  }

  return gaps;
}

/**
 * Calculate overall coherence from dimension scores
 */
function calculateOverallCoherence(dimensionScores: DimensionScores): number {
  // Weighted average with emphasis on TRUTH-LIVE (most critical for production)
  const weights = {
    truthTime: 0.25,
    truthLive: 0.40,
    timeLive: 0.35
  };

  const weightedScore = (
    dimensionScores.truthTime * weights.truthTime +
    dimensionScores.truthLive * weights.truthLive +
    dimensionScores.timeLive * weights.timeLive
  );

  return weightedScore;
}

/**
 * Determine health status from coherence score
 */
function getHealthStatus(score: number, threshold: number): 'healthy' | 'warning' | 'critical' {
  if (score >= threshold) return 'healthy';
  if (score >= threshold * 0.8) return 'warning';
  return 'critical';
}

/**
 * Determine exit code based on coherence result
 */
function determineExitCode(
  meetsThreshold: boolean,
  health: 'healthy' | 'warning' | 'critical',
  hasCriticalGaps: boolean
): 0 | 1 | 2 | 3 {
  // 3 = Error (unexpected failure)
  if (health === 'critical' && !meetsThreshold && !hasCriticalGaps) {
    return 3;
  }

  // 2 = Fail (below threshold)
  if (!meetsThreshold) {
    return 2;
  }

  // 1 = Warn (meets threshold but has issues)
  if (health === 'warning') {
    return 1;
  }

  // 0 = Pass
  return 0;
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
export function runCoherenceCheckCI(options: CoherenceCIOptions): CoherenceCIResult {
  const {
    threshold = parseFloat(process.env.COHERENCE_THRESHOLD || '0.95'),
    intention,
    codeChanges,
    commitMessages,
    ciMode = true,
    verbose = false
  } = options;

  if (verbose) {
    console.log('[COHERENCE_CI] Running coherence check in CI mode');
    console.log(`[COHERENCE_CI] Threshold: ${threshold}`);
  }

  // Calculate dimension-specific coherence scores
  const truthTimeScore = calculateTruthTimeCoherence(intention, commitMessages);
  const truthLiveScore = calculateTruthLiveCoherence(codeChanges);
  const timeLiveScore = calculateTimeLiveCoherence(commitMessages, codeChanges);

  const dimensionScores: DimensionScores = {
    truthTime: truthTimeScore,
    truthLive: truthLiveScore,
    timeLive: timeLiveScore
  };

  // Calculate overall coherence
  const overallCoherence = calculateOverallCoherence(dimensionScores);

  // Determine health status
  const health = getHealthStatus(overallCoherence, threshold);

  // Identify coherence gaps
  const gaps = identifyCoherenceGaps(dimensionScores, threshold);
  const hasCriticalGaps = gaps.some(g => g.severity === 'critical');

  // Generate recommendations
  const recommendations = generateRemediationRecommendations(dimensionScores, threshold);

  // Determine if threshold is met
  const meetsThreshold = overallCoherence >= threshold;

  // Determine exit code
  const exitCode = determineExitCode(meetsThreshold, health, hasCriticalGaps);

  if (verbose) {
    console.log('[COHERENCE_CI] Dimension Scores:');
    console.log(`  TRUTH-TIME: ${(truthTimeScore * 100).toFixed(1)}%`);
    console.log(`  TRUTH-LIVE: ${(truthLiveScore * 100).toFixed(1)}%`);
    console.log(`  TIME-LIVE: ${(timeLiveScore * 100).toFixed(1)}%`);
    console.log(`[COHERENCE_CI] Overall: ${(overallCoherence * 100).toFixed(1)}%`);
    console.log(`[COHERENCE_CI] Health: ${health}`);
    console.log(`[COHERENCE_CI] Meets Threshold: ${meetsThreshold}`);
    console.log(`[COHERENCE_CI] Exit Code: ${exitCode}`);
    console.log(`[COHERENCE_CI] Gaps: ${gaps.length}`);
  }

  const result: CoherenceCIResult = {
    overallCoherence,
    dimensionScores,
    threshold,
    meetsThreshold,
    exitCode,
    gaps,
    recommendations,
    health,
    report: {
      timestamp: new Date().toISOString(),
      ciMode: true,
      environment: process.env.NODE_ENV || 'unknown'
    }
  };

  return result;
}

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
export async function runCoherenceCICLI(): Promise<void> {
  const args = process.argv.slice(2);
  
  const ciMode = args.includes('--ci');
  const verbose = args.includes('--verbose');
  const thresholdArg = args.find(arg => arg.startsWith('--threshold='));
  const threshold = thresholdArg 
    ? parseFloat(thresholdArg.split('=')[1]) 
    : parseFloat(process.env.COHERENCE_THRESHOLD || '0.95');

  if (!ciMode) {
    console.error('Error: --ci flag is required for CI mode');
    console.error('Usage: node dist/calibration/coherence_ci.js --ci [--threshold=<value>] [--verbose]');
    process.exit(3);
  }

  if (isNaN(threshold) || threshold < 0 || threshold > 1) {
    console.error('Error: Threshold must be a number between 0 and 1');
    process.exit(3);
  }

  // Simulate getting PR data (in real CI, this would come from environment)
  const intention = process.env.PR_INTENTION || '';
  const codeChanges = process.env.PR_CODE_CHANGES || '';
  const commitMessagesStr = process.env.PR_COMMIT_MESSAGES || '';
  const commitMessages = commitMessagesStr.split('\n').filter(m => m.trim());

  const result = runCoherenceCheckCI({
    threshold,
    intention,
    codeChanges,
    commitMessages,
    ciMode,
    verbose
  });

  // Output JSON for CI parsing
  if (verbose) {
    console.log('\n--- CI Output ---');
  }
  console.log(JSON.stringify(result, null, 2));

  // Exit with appropriate code
  process.exit(result.exitCode);
}

// Auto-run if executed directly
if (require.main === module) {
  runCoherenceCICLI().catch(err => {
    console.error('Error running coherence check:', err);
    process.exit(3);
  });
}
