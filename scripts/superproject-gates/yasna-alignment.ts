/**
 * Yasna Alignment Tracker
 * 
 * Tracks genuine alignment vs checkbox compliance across the system.
 * Named after Yasna, the Zoroastrian concept of genuine worship/alignment
 * as opposed to mere ritual compliance.
 * 
 * This module addresses the philosophical distinction between:
 * - Genuine alignment: Actually achieving the intended outcome
 * - Checkbox compliance: Meeting metrics without achieving purpose
 * 
 * Key insight: A system can have 100% test coverage and still be broken
 * if the tests don't actually verify the intended behavior.
 */

import { SlopScore, SlopDetectionSystem } from './slop-detection';
import { CoherenceResult, MithraCoherenceSystem } from './mithra-coherence';

export interface AlignmentMetrics {
  /** Genuine alignment score (0-1) */
  genuineAlignmentScore: number;
  /** Checkbox compliance score (0-1) - high is bad if genuine is low */
  checkboxComplianceScore: number;
  /** Alignment gap (checkbox - genuine) - positive means checkbox theater */
  alignmentGap: number;
  /** Whether the system is genuinely aligned */
  isGenuinelyAligned: boolean;
  /** Detailed breakdown */
  breakdown: AlignmentBreakdown;
  /** Timestamp */
  timestamp: Date;
  /** Correlation ID */
  correlationId: string;
}

export interface AlignmentBreakdown {
  /** Test coverage vs actual bug detection rate */
  testEffectiveness: number;
  /** Documentation completeness vs actual clarity */
  documentationEffectiveness: number;
  /** Code review thoroughness vs actual issue detection */
  reviewEffectiveness: number;
  /** CI/CD pass rate vs actual deployment success */
  pipelineEffectiveness: number;
  /** Metric gaming indicators */
  gamingIndicators: GamingIndicator[];
  /** Iteration budget tracking */
  iterationBudget: IterationBudget;
}

export interface IterationBudget {
  /** Total iterations allocated */
  totalIterations: number;
  /** Iterations consumed */
  iterationsConsumed: number;
  /** Remaining iterations */
  remainingIterations: number;
  /** Iteration efficiency (results per iteration) */
  iterationEfficiency: number;
  /** Budget status */
  budgetStatus: 'healthy' | 'warning' | 'critical' | 'exhausted';
  /** Intention statements tracked */
  intentionStatements: IntentionStatement[];
}

export interface IntentionStatement {
  /** Unique ID for the intention */
  id: string;
  /** The stated intention */
  statement: string;
  /** Timestamp when stated */
  statedAt: Date;
  /** Whether intention was achieved */
  achieved: boolean;
  /** Timestamp when achieved (if applicable) */
  achievedAt?: Date;
  /** Iterations spent on this intention */
  iterationsSpent: number;
  /** Quality score for the implementation */
  qualityScore: number;
  /** Notes on implementation */
  notes?: string;
}

export interface GamingIndicator {
  type: 'coverage_padding' | 'trivial_tests' | 'rubber_stamp_reviews' | 'metric_manipulation';
  severity: 'low' | 'medium' | 'high';
  description: string;
  evidence: string[];
}

export interface AlignmentConfig {
  /** Minimum genuine alignment score */
  genuineAlignmentThreshold: number;
  /** Maximum acceptable alignment gap */
  maxAlignmentGap: number;
  /** Enable gaming detection */
  enableGamingDetection: boolean;
  /** Enable interpretability logging */
  enableInterpretabilityLogging: boolean;
  /** Total iteration budget */
  totalIterationBudget: number;
  /** Iteration budget warning threshold (percentage) */
  iterationWarningThreshold: number;
  /** Iteration budget critical threshold (percentage) */
  iterationCriticalThreshold: number;
  /** Enable intention statement validation */
  enableIntentionValidation: boolean;
}

const DEFAULT_CONFIG: AlignmentConfig = {
  genuineAlignmentThreshold: 0.7,
  maxAlignmentGap: 0.2,
  enableGamingDetection: true,
  enableInterpretabilityLogging: true,
  totalIterationBudget: 100,
  iterationWarningThreshold: 0.7,
  iterationCriticalThreshold: 0.9,
  enableIntentionValidation: true
};

export class YasnaAlignmentTracker {
  private config: AlignmentConfig;
  private slopDetector: SlopDetectionSystem;
  private coherenceSystem: MithraCoherenceSystem;
  private alignmentHistory: AlignmentMetrics[] = [];
  private iterationBudget!: IterationBudget;
  private intentionStatements: Map<string, IntentionStatement> = new Map();

  constructor(
    config: Partial<AlignmentConfig> = {},
    slopDetector?: SlopDetectionSystem,
    coherenceSystem?: MithraCoherenceSystem
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.slopDetector = slopDetector || new SlopDetectionSystem();
    this.coherenceSystem = coherenceSystem || new MithraCoherenceSystem();
    this.initializeIterationBudget();
  }

  /**
   * Initialize iteration budget
   */
  private initializeIterationBudget(): void {
    this.iterationBudget = {
      totalIterations: this.config.totalIterationBudget,
      iterationsConsumed: 0,
      remainingIterations: this.config.totalIterationBudget,
      iterationEfficiency: 1.0,
      budgetStatus: 'healthy',
      intentionStatements: []
    };
  }

  /**
   * Measure alignment between stated goals and actual outcomes
   */
  public measureAlignment(
    testCoverage: number,
    bugDetectionRate: number,
    docCompleteness: number,
    docClarityScore: number,
    reviewPassRate: number,
    issueDetectionRate: number,
    ciPassRate: number,
    deploymentSuccessRate: number
  ): AlignmentMetrics {
    const correlationId = this.generateCorrelationId();
    const timestamp = new Date();

    // Calculate effectiveness scores (genuine alignment)
    const testEffectiveness = this.calculateEffectiveness(testCoverage, bugDetectionRate);
    const documentationEffectiveness = this.calculateEffectiveness(docCompleteness, docClarityScore);
    const reviewEffectiveness = this.calculateEffectiveness(reviewPassRate, issueDetectionRate);
    const pipelineEffectiveness = this.calculateEffectiveness(ciPassRate, deploymentSuccessRate);

    // Calculate genuine alignment (weighted average of effectiveness)
    const genuineAlignmentScore = (
      0.35 * testEffectiveness +
      0.20 * documentationEffectiveness +
      0.25 * reviewEffectiveness +
      0.20 * pipelineEffectiveness
    );

    // Calculate checkbox compliance (just the input metrics)
    const checkboxComplianceScore = (
      0.35 * testCoverage +
      0.20 * docCompleteness +
      0.25 * reviewPassRate +
      0.20 * ciPassRate
    );

    // Calculate alignment gap
    const alignmentGap = checkboxComplianceScore - genuineAlignmentScore;

    // Detect gaming indicators
    const gamingIndicators = this.config.enableGamingDetection
      ? this.detectGaming(
          testCoverage, bugDetectionRate,
          docCompleteness, docClarityScore,
          reviewPassRate, issueDetectionRate,
          ciPassRate, deploymentSuccessRate
        )
      : [];

    // Update iteration budget
    this.updateIterationBudget(genuineAlignmentScore);

    // Determine if genuinely aligned
    const isGenuinelyAligned =
      genuineAlignmentScore >= this.config.genuineAlignmentThreshold &&
      alignmentGap <= this.config.maxAlignmentGap &&
      !gamingIndicators.some(g => g.severity === 'high');

    const breakdown: AlignmentBreakdown = {
      testEffectiveness,
      documentationEffectiveness,
      reviewEffectiveness,
      pipelineEffectiveness,
      gamingIndicators,
      iterationBudget: { ...this.iterationBudget }
    };

    const metrics: AlignmentMetrics = {
      genuineAlignmentScore,
      checkboxComplianceScore,
      alignmentGap,
      isGenuinelyAligned,
      breakdown,
      timestamp,
      correlationId
    };

    // Log for interpretability
    if (this.config.enableInterpretabilityLogging) {
      this.logInterpretability(metrics);
    }

    // Store in history
    this.alignmentHistory.push(metrics);
    if (this.alignmentHistory.length > 100) {
      this.alignmentHistory = this.alignmentHistory.slice(-100);
    }

    return metrics;
  }

  /**
   * Register an intention statement
   */
  public registerIntention(
    statement: string,
    estimatedIterations?: number
  ): string {
    const id = this.generateIntentionId();
    const intention: IntentionStatement = {
      id,
      statement,
      statedAt: new Date(),
      achieved: false,
      iterationsSpent: 0,
      qualityScore: 0
    };

    this.intentionStatements.set(id, intention);
    this.iterationBudget.intentionStatements.push(intention);

    if (estimatedIterations) {
      this.consumeIterations(estimatedIterations, id);
    }

    return id;
  }

  /**
   * Mark an intention as achieved
   */
  public achieveIntention(
    intentionId: string,
    qualityScore: number = 1.0,
    notes?: string
  ): boolean {
    const intention = this.intentionStatements.get(intentionId);
    if (!intention) {
      return false;
    }

    intention.achieved = true;
    intention.achievedAt = new Date();
    intention.qualityScore = qualityScore;
    intention.notes = notes;

    // Update iteration efficiency
    this.updateIterationEfficiency();

    return true;
  }

  /**
   * Validate an intention statement
   */
  public validateIntention(
    statement: string
  ): { isValid: boolean; issues: string[]; suggestions: string[] } {
    const issues: string[] = [];
    const suggestions: string[] = [];

    // Check for vague language
    const vaguePatterns = [
      /\b(?:improve|enhance|optimize|fix|update)\b/i,
      /\b(?:better|faster|cleaner|nicer)\b/i
    ];

    for (const pattern of vaguePatterns) {
      if (pattern.test(statement)) {
        issues.push('Contains vague language without specific metrics');
        suggestions.push('Add specific, measurable outcomes (e.g., "reduce latency by 20%" instead of "improve performance")');
        break;
      }
    }

    // Check for measurable criteria
    const measurablePatterns = [
      /\d+%/, // Percentage
      /\d+\s*(?:ms|seconds?|minutes?|hours?)/i, // Time
      /\b(?:reduce|increase|decrease)\s+by\s+\d+/i, // Quantified change
      /\b(?:achieve|reach|attain)\s+\d+/i // Quantified goal
    ];

    const hasMeasurableCriteria = measurablePatterns.some(p => p.test(statement));
    if (!hasMeasurableCriteria) {
      issues.push('Lacks measurable criteria');
      suggestions.push('Include specific metrics or success criteria');
    }

    // Check for action verbs
    const actionVerbs = ['implement', 'create', 'add', 'remove', 'fix', 'refactor', 'optimize', 'deploy', 'test', 'document'];
    const hasActionVerb = actionVerbs.some(verb => statement.toLowerCase().includes(verb));
    if (!hasActionVerb) {
      issues.push('Lacks clear action verb');
      suggestions.push('Start with a clear action verb (implement, create, add, etc.)');
    }

    // Check length
    if (statement.split(/\s+/).length < 5) {
      issues.push('Statement is too brief');
      suggestions.push('Provide more context and detail');
    }

    return {
      isValid: issues.length === 0,
      issues,
      suggestions
    };
  }

  /**
   * Consume iterations from budget
   */
  private consumeIterations(count: number, intentionId?: string): void {
    this.iterationBudget.iterationsConsumed += count;
    this.iterationBudget.remainingIterations = Math.max(0, this.iterationBudget.totalIterations - this.iterationBudget.iterationsConsumed);

    if (intentionId) {
      const intention = this.intentionStatements.get(intentionId);
      if (intention) {
        intention.iterationsSpent += count;
      }
    }

    this.updateBudgetStatus();
  }

  /**
   * Update iteration budget status
   */
  private updateBudgetStatus(): void {
    const consumedRatio = this.iterationBudget.iterationsConsumed / this.iterationBudget.totalIterations;

    if (consumedRatio >= 1.0) {
      this.iterationBudget.budgetStatus = 'exhausted';
    } else if (consumedRatio >= this.config.iterationCriticalThreshold) {
      this.iterationBudget.budgetStatus = 'critical';
    } else if (consumedRatio >= this.config.iterationWarningThreshold) {
      this.iterationBudget.budgetStatus = 'warning';
    } else {
      this.iterationBudget.budgetStatus = 'healthy';
    }
  }

  /**
   * Update iteration efficiency
   */
  private updateIterationEfficiency(): void {
    const intentions = this.iterationBudget.intentionStatements;
    const achievedIntentions = intentions.filter(i => i.achieved);

    if (achievedIntentions.length === 0) {
      this.iterationBudget.iterationEfficiency = 0;
      return;
    }

    const totalIterations = this.iterationBudget.iterationsConsumed;
    const totalQuality = achievedIntentions.reduce((sum, i) => sum + i.qualityScore, 0);
    const avgQuality = totalQuality / achievedIntentions.length;

    this.iterationBudget.iterationEfficiency = (achievedIntentions.length / totalIterations) * avgQuality;
  }

  /**
   * Update iteration budget with new alignment score
   */
  private updateIterationBudget(alignmentScore: number): void {
    // Consume one iteration per measurement
    this.consumeIterations(1);
  }

  private generateCorrelationId(): string {
    return `yasna-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  private generateIntentionId(): string {
    return `intention-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Calculate effectiveness as the geometric mean of input and outcome
   * This penalizes high input with low outcome (checkbox theater)
   */
  private calculateEffectiveness(inputMetric: number, outcomeMetric: number): number {
    // Geometric mean penalizes imbalance
    return Math.sqrt(inputMetric * outcomeMetric);
  }

  /**
   * Detect gaming indicators - signs of checkbox compliance without genuine alignment
   */
  private detectGaming(
    testCoverage: number, bugDetectionRate: number,
    docCompleteness: number, docClarityScore: number,
    reviewPassRate: number, issueDetectionRate: number,
    ciPassRate: number, deploymentSuccessRate: number
  ): GamingIndicator[] {
    const indicators: GamingIndicator[] = [];

    // Coverage padding: High coverage but low bug detection
    if (testCoverage > 0.9 && bugDetectionRate < 0.3) {
      indicators.push({
        type: 'coverage_padding',
        severity: 'high',
        description: 'High test coverage but low bug detection rate suggests trivial or ineffective tests',
        evidence: [
          `Test coverage: ${(testCoverage * 100).toFixed(1)}%`,
          `Bug detection rate: ${(bugDetectionRate * 100).toFixed(1)}%`
        ]
      });
    }

    // Trivial tests: Coverage without assertions
    if (testCoverage > 0.8 && bugDetectionRate < 0.5) {
      indicators.push({
        type: 'trivial_tests',
        severity: 'medium',
        description: 'Tests may lack meaningful assertions',
        evidence: [
          `Coverage/detection ratio: ${(testCoverage / Math.max(0.01, bugDetectionRate)).toFixed(2)}`
        ]
      });
    }

    // Rubber stamp reviews: High pass rate but low issue detection
    if (reviewPassRate > 0.95 && issueDetectionRate < 0.2) {
      indicators.push({
        type: 'rubber_stamp_reviews',
        severity: 'high',
        description: 'Reviews pass too easily without detecting issues',
        evidence: [
          `Review pass rate: ${(reviewPassRate * 100).toFixed(1)}%`,
          `Issue detection rate: ${(issueDetectionRate * 100).toFixed(1)}%`
        ]
      });
    }

    // Metric manipulation: CI passes but deployments fail
    if (ciPassRate > 0.9 && deploymentSuccessRate < 0.7) {
      indicators.push({
        type: 'metric_manipulation',
        severity: 'high',
        description: 'CI metrics do not reflect deployment reality',
        evidence: [
          `CI pass rate: ${(ciPassRate * 100).toFixed(1)}%`,
          `Deployment success: ${(deploymentSuccessRate * 100).toFixed(1)}%`
        ]
      });
    }

    return indicators;
  }

  private logInterpretability(metrics: AlignmentMetrics): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      pattern: 'interpretability',
      model_type: 'yasna_alignment_v1',
      explanation_type: 'alignment_analysis',
      circle: 'quality-alignment',
      genuine_alignment: metrics.genuineAlignmentScore,
      checkbox_compliance: metrics.checkboxComplianceScore,
      alignment_gap: metrics.alignmentGap,
      is_genuinely_aligned: metrics.isGenuinelyAligned,
      gaming_indicators: metrics.breakdown.gamingIndicators.length,
      high_severity_gaming: metrics.breakdown.gamingIndicators.filter(g => g.severity === 'high').length,
      iteration_budget_status: metrics.breakdown.iterationBudget.budgetStatus,
      iteration_efficiency: metrics.breakdown.iterationBudget.iterationEfficiency,
      correlation_id: metrics.correlationId
    };

    console.log('[YASNA-ALIGNMENT]', JSON.stringify(logEntry));
  }

  /**
   * Get alignment trend over time
   */
  public getAlignmentTrend(): { improving: boolean; trend: number; history: AlignmentMetrics[] } {
    if (this.alignmentHistory.length < 2) {
      return { improving: true, trend: 0, history: this.alignmentHistory };
    }

    const recent = this.alignmentHistory.slice(-10);
    const older = this.alignmentHistory.slice(-20, -10);

    const recentAvg = recent.reduce((sum, m) => sum + m.genuineAlignmentScore, 0) / recent.length;
    const olderAvg = older.length > 0
      ? older.reduce((sum, m) => sum + m.genuineAlignmentScore, 0) / older.length
      : recentAvg;

    const trend = recentAvg - olderAvg;

    return {
      improving: trend >= 0,
      trend,
      history: this.alignmentHistory
    };
  }

  /**
   * Integrate slop detection results
   */
  public integrateSlop(slopScore: SlopScore): void {
    // Slop detection affects genuine alignment
    if (slopScore.isSlop) {
      // Log the integration
      console.log('[YASNA-SLOP-INTEGRATION]', JSON.stringify({
        timestamp: new Date().toISOString(),
        slop_detected: true,
        slop_confidence: slopScore.confidence,
        correlation_id: slopScore.details.correlationId
      }));
    }
  }

  /**
   * Integrate coherence results
   */
  public integrateCoherence(coherenceResult: CoherenceResult): void {
    // Coherence affects genuine alignment
    if (!coherenceResult.isCoherent) {
      console.log('[YASNA-COHERENCE-INTEGRATION]', JSON.stringify({
        timestamp: new Date().toISOString(),
        coherent: false,
        coherence_score: coherenceResult.coherenceScore,
        misalignment_count: coherenceResult.misalignments.length,
        correlation_id: coherenceResult.binding.correlationId
      }));
    }
  }

  /**
   * Get current iteration budget
   */
  public getIterationBudget(): Readonly<IterationBudget> {
    return { ...this.iterationBudget };
  }

  /**
   * Get all intention statements
   */
  public getIntentionStatements(): IntentionStatement[] {
    return Array.from(this.intentionStatements.values());
  }

  /**
   * Get a specific intention statement
   */
  public getIntentionStatement(id: string): IntentionStatement | undefined {
    return this.intentionStatements.get(id);
  }

  /**
   * Reset iteration budget
   */
  public resetIterationBudget(): void {
    this.initializeIterationBudget();
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<AlignmentConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  public getConfig(): Readonly<AlignmentConfig> {
    return { ...this.config };
  }
}
