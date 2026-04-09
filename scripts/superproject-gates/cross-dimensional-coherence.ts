/**
 * Cross-Dimensional Coherence Assessment System
 * 
 * Assesses coherence across all three calibration dimensions:
 * - Manthra (Directed Thought-Power)
 * - Yasna (Alignment)
 * - Mithra (Binding Force)
 * 
 * Identifies alignment gaps, synergies, and conflicts between dimensions,
 * providing a holistic view of system coherence.
 * 
 * @module calibration/cross-dimensional-coherence
 */

import {
  CalibrationFinding,
  CalibrationRecommendation,
  CalibrationAuditEntry,
  CalibrationSeverity,
  CalibrationHealth,
  ManthraCalibrationResult,
  YasnaCalibrationResult,
  MithraCalibrationResult,
  DimensionAlignmentScore,
  CoherenceGap,
  CrossDimensionalCoherenceResult,
  generateCalibrationId,
  getStatusFromScore,
  getHealthFromScore
} from './types.js';

/**
 * Configuration for cross-dimensional coherence assessment
 */
export interface CrossDimensionalConfig {
  /** Minimum acceptable coherence score */
  coherenceThreshold: number;
  /** Weight for Manthra-Yasna alignment */
  manthraYasnaWeight: number;
  /** Weight for Yasna-Mithra alignment */
  yasnaMithraWeight: number;
  /** Weight for Manthra-Mithra alignment */
  manthraMithraWeight: number;
  /** Enable trend analysis */
  enableTrendAnalysis: boolean;
  /** History window for trend analysis (number of assessments) */
  trendWindow: number;
  /** Enable verbose logging */
  verbose: boolean;
}

/**
 * Default cross-dimensional configuration
 */
export const DEFAULT_CROSS_DIMENSIONAL_CONFIG: CrossDimensionalConfig = {
  coherenceThreshold: 0.7,
  manthraYasnaWeight: 0.35,
  yasnaMithraWeight: 0.35,
  manthraMithraWeight: 0.3,
  enableTrendAnalysis: true,
  trendWindow: 10,
  verbose: false
};

/**
 * Cross-Dimensional Coherence Assessment System
 */
export class CrossDimensionalCoherenceSystem {
  private config: CrossDimensionalConfig;
  private auditTrail: CalibrationAuditEntry[] = [];
  private assessmentHistory: CrossDimensionalCoherenceResult[] = [];
  private lastAssessment: CrossDimensionalCoherenceResult | null = null;

  constructor(config?: Partial<CrossDimensionalConfig>) {
    this.config = { ...DEFAULT_CROSS_DIMENSIONAL_CONFIG, ...config };
  }

  /**
   * Assess cross-dimensional coherence
   */
  public async assess(
    manthraResult: ManthraCalibrationResult,
    yasnaResult: YasnaCalibrationResult,
    mithraResult: MithraCalibrationResult
  ): Promise<CrossDimensionalCoherenceResult> {
    const startTime = Date.now();

    if (this.config.verbose) {
      console.log('[COHERENCE] Starting cross-dimensional coherence assessment...');
    }

    // Calculate dimension alignment scores
    const dimensionAlignments = this.calculateDimensionAlignments(
      manthraResult,
      yasnaResult,
      mithraResult
    );

    // Identify coherence gaps
    const coherenceGaps = this.identifyCoherenceGaps(
      manthraResult,
      yasnaResult,
      mithraResult,
      dimensionAlignments
    );

    // Identify systemic issues
    const systemicIssues = this.identifySystemicIssues(
      manthraResult,
      yasnaResult,
      mithraResult
    );

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      dimensionAlignments,
      coherenceGaps,
      systemicIssues
    );

    // Calculate trend
    const trend = this.calculateTrend();

    // Calculate overall coherence score
    const overallCoherence = this.calculateOverallCoherence(dimensionAlignments);

    // Create assessment result
    const result: CrossDimensionalCoherenceResult = {
      overallCoherence,
      status: getStatusFromScore(overallCoherence),
      health: getHealthFromScore(overallCoherence),
      dimensionAlignments,
      coherenceGaps,
      systemicIssues,
      recommendations,
      trend,
      assessedAt: new Date()
    };

    // Store results
    this.lastAssessment = result;
    this.assessmentHistory.push(result);

    // Trim history to window size
    if (this.assessmentHistory.length > this.config.trendWindow) {
      this.assessmentHistory = this.assessmentHistory.slice(-this.config.trendWindow);
    }

    // Add audit entry
    this.addAuditEntry({
      eventType: 'assessment',
      description: `Cross-dimensional coherence assessed. Score: ${(overallCoherence * 100).toFixed(1)}%`,
      newState: { overallCoherence, status: result.status }
    });

    if (this.config.verbose) {
      console.log(`[COHERENCE] Assessment completed in ${Date.now() - startTime}ms`);
      console.log(`[COHERENCE] Overall coherence: ${(overallCoherence * 100).toFixed(1)}%`);
      console.log(`[COHERENCE] Status: ${result.status}`);
    }

    return result;
  }

  /**
   * Calculate alignment scores between dimension pairs
   */
  private calculateDimensionAlignments(
    manthra: ManthraCalibrationResult,
    yasna: YasnaCalibrationResult,
    mithra: MithraCalibrationResult
  ): DimensionAlignmentScore[] {
    return [
      this.calculateManthraYasnaAlignment(manthra, yasna),
      this.calculateYasnaMithraAlignment(yasna, mithra),
      this.calculateManthraMithraAlignment(manthra, mithra)
    ];
  }

  /**
   * Calculate Manthra-Yasna alignment
   * 
   * Measures how well directed thought-power aligns with disciplined alignment.
   * High alignment means clear thinking is matched with consistent implementation.
   */
  private calculateManthraYasnaAlignment(
    manthra: ManthraCalibrationResult,
    yasna: YasnaCalibrationResult
  ): DimensionAlignmentScore {
    const conflicts: Array<{ type: string; description: string; impact: number }> = [];

    // Check for logical separation vs interface consistency conflict
    if (manthra.logicalSeparation.score > 0.8 && yasna.interfaceConsistency.score < 0.6) {
      conflicts.push({
        type: 'separation-consistency-gap',
        description: 'Good logical separation but poor interface consistency',
        impact: 0.15
      });
    }

    // Check for strategic thinking vs type safety conflict
    if (manthra.strategicThinking.score > 0.8 && yasna.typeSafety.score < 0.6) {
      conflicts.push({
        type: 'strategy-safety-gap',
        description: 'Strong strategic thinking but weak type safety implementation',
        impact: 0.2
      });
    }

    // Check for contextual awareness vs alignment discipline
    if (manthra.contextualAwareness.score < 0.6 && yasna.alignmentDiscipline.score > 0.8) {
      conflicts.push({
        type: 'awareness-discipline-imbalance',
        description: 'Disciplined but lacking contextual awareness',
        impact: 0.1
      });
    }

    // Calculate alignment score
    const scoreDiff = Math.abs(manthra.overallScore - yasna.overallScore);
    const baseAlignment = 1 - (scoreDiff * 0.5);
    
    // Synergy: Both dimensions contribute to clarity and correctness
    const synergyBonus = (
      (manthra.logicalSeparation.score * yasna.typeSafety.score) +
      (manthra.strategicThinking.score * yasna.interfaceConsistency.score)
    ) / 2 * 0.2;

    // Conflict penalty
    const conflictPenalty = conflicts.reduce((sum, c) => sum + c.impact, 0);

    const alignmentScore = Math.max(0, Math.min(1, baseAlignment + synergyBonus - conflictPenalty));
    const synergyScore = Math.max(0, Math.min(1, 
      (manthra.overallScore + yasna.overallScore) / 2 + synergyBonus
    ));

    return {
      dimension1: 'manthra',
      dimension2: 'yasna',
      alignmentScore,
      synergyScore,
      conflicts
    };
  }

  /**
   * Calculate Yasna-Mithra alignment
   * 
   * Measures how well disciplined alignment works with binding force.
   * High alignment means consistent interfaces are supported by centralized state.
   */
  private calculateYasnaMithraAlignment(
    yasna: YasnaCalibrationResult,
    mithra: MithraCalibrationResult
  ): DimensionAlignmentScore {
    const conflicts: Array<{ type: string; description: string; impact: number }> = [];

    // Check for type safety vs state management conflict
    if (yasna.typeSafety.score > 0.8 && mithra.stateManagement.score < 0.6) {
      conflicts.push({
        type: 'type-state-gap',
        description: 'Strong type safety but weak state management',
        impact: 0.15
      });
    }

    // Check for contract adherence vs centralization
    if (yasna.interfaceConsistency.contractAdherence.adherenceScore > 0.85 &&
        mithra.centralization.score < 0.6) {
      conflicts.push({
        type: 'contract-centralization-gap',
        description: 'Good contracts but poor centralization',
        impact: 0.12
      });
    }

    // Check for alignment discipline vs drift prevention
    if (yasna.alignmentDiscipline.score < 0.6 && mithra.codeDriftPrevention.score > 0.8) {
      conflicts.push({
        type: 'discipline-drift-imbalance',
        description: 'Strong drift prevention but weak alignment discipline',
        impact: 0.1
      });
    }

    // Calculate alignment score
    const scoreDiff = Math.abs(yasna.overallScore - mithra.overallScore);
    const baseAlignment = 1 - (scoreDiff * 0.5);
    
    // Synergy: Both dimensions contribute to consistency and reliability
    const synergyBonus = (
      (yasna.typeSafety.score * mithra.stateManagement.score) +
      (yasna.interfaceConsistency.score * mithra.centralization.score)
    ) / 2 * 0.2;

    // Conflict penalty
    const conflictPenalty = conflicts.reduce((sum, c) => sum + c.impact, 0);

    const alignmentScore = Math.max(0, Math.min(1, baseAlignment + synergyBonus - conflictPenalty));
    const synergyScore = Math.max(0, Math.min(1,
      (yasna.overallScore + mithra.overallScore) / 2 + synergyBonus
    ));

    return {
      dimension1: 'yasna',
      dimension2: 'mithra',
      alignmentScore,
      synergyScore,
      conflicts
    };
  }

  /**
   * Calculate Manthra-Mithra alignment
   * 
   * Measures how well directed thought-power works with binding force.
   * High alignment means clear strategic thinking is bound by solid implementation.
   */
  private calculateManthraMithraAlignment(
    manthra: ManthraCalibrationResult,
    mithra: MithraCalibrationResult
  ): DimensionAlignmentScore {
    const conflicts: Array<{ type: string; description: string; impact: number }> = [];

    // Check for logical separation vs state centralization
    if (manthra.logicalSeparation.score > 0.8 && mithra.stateManagement.stateCentralization.centralizationScore < 0.6) {
      conflicts.push({
        type: 'separation-centralization-tension',
        description: 'Good logical separation but state is scattered',
        impact: 0.15
      });
    }

    // Check for contextual awareness vs drift prevention
    if (manthra.contextualAwareness.score > 0.8 && mithra.codeDriftPrevention.score < 0.6) {
      conflicts.push({
        type: 'awareness-drift-gap',
        description: 'High contextual awareness but weak drift prevention',
        impact: 0.12
      });
    }

    // Check for strategic thinking vs centralization
    if (manthra.strategicThinking.score < 0.6 && mithra.centralization.score > 0.8) {
      conflicts.push({
        type: 'strategy-centralization-imbalance',
        description: 'Over-centralized without clear strategic direction',
        impact: 0.1
      });
    }

    // Calculate alignment score
    const scoreDiff = Math.abs(manthra.overallScore - mithra.overallScore);
    const baseAlignment = 1 - (scoreDiff * 0.5);
    
    // Synergy: Both dimensions contribute to cohesion and integrity
    const synergyBonus = (
      (manthra.logicalSeparation.score * mithra.centralization.score) +
      (manthra.strategicThinking.score * mithra.codeDriftPrevention.score)
    ) / 2 * 0.2;

    // Conflict penalty
    const conflictPenalty = conflicts.reduce((sum, c) => sum + c.impact, 0);

    const alignmentScore = Math.max(0, Math.min(1, baseAlignment + synergyBonus - conflictPenalty));
    const synergyScore = Math.max(0, Math.min(1,
      (manthra.overallScore + mithra.overallScore) / 2 + synergyBonus
    ));

    return {
      dimension1: 'manthra',
      dimension2: 'mithra',
      alignmentScore,
      synergyScore,
      conflicts
    };
  }

  /**
   * Identify coherence gaps
   */
  private identifyCoherenceGaps(
    manthra: ManthraCalibrationResult,
    yasna: YasnaCalibrationResult,
    mithra: MithraCalibrationResult,
    alignments: DimensionAlignmentScore[]
  ): CoherenceGap[] {
    const gaps: CoherenceGap[] = [];

    // Check for alignment gaps
    for (const alignment of alignments) {
      if (alignment.alignmentScore < 0.6) {
        gaps.push({
          id: generateCalibrationId('gap'),
          type: 'alignment',
          affectedDimensions: [alignment.dimension1, alignment.dimension2],
          severity: alignment.alignmentScore < 0.4 ? 'critical' : 'high',
          description: `Poor alignment between ${alignment.dimension1} and ${alignment.dimension2}`,
          rootCause: alignment.conflicts.length > 0 
            ? alignment.conflicts.map(c => c.description).join('; ')
            : 'Fundamental approach mismatch',
          impact: 'System coherence is compromised, leading to inconsistent behavior',
          resolution: `Address ${alignment.conflicts.length} identified conflicts`,
          evidence: alignment.conflicts.map(c => `${c.type}: ${c.description}`)
        });
      }
    }

    // Check for synergy gaps
    for (const alignment of alignments) {
      if (alignment.synergyScore < 0.5) {
        gaps.push({
          id: generateCalibrationId('gap'),
          type: 'synergy',
          affectedDimensions: [alignment.dimension1, alignment.dimension2],
          severity: 'medium',
          description: `Low synergy between ${alignment.dimension1} and ${alignment.dimension2}`,
          rootCause: 'Dimensions are not leveraging each other effectively',
          impact: 'Missed opportunity for system-wide improvements',
          resolution: 'Identify integration points between dimensions',
          evidence: [`Synergy score: ${(alignment.synergyScore * 100).toFixed(1)}%`]
        });
      }
    }

    // Check for integration gaps (all three dimensions)
    const avgAlignment = alignments.reduce((sum, a) => sum + a.alignmentScore, 0) / alignments.length;
    if (avgAlignment < 0.7) {
      gaps.push({
        id: generateCalibrationId('gap'),
        type: 'integration',
        affectedDimensions: ['manthra', 'yasna', 'mithra'],
        severity: avgAlignment < 0.5 ? 'critical' : 'high',
        description: 'Overall system integration is weak',
        rootCause: 'Dimensions are operating in isolation',
        impact: 'System lacks holistic coherence',
        resolution: 'Implement cross-dimensional integration strategy',
        evidence: [
          `Average alignment: ${(avgAlignment * 100).toFixed(1)}%`,
          `Manthra: ${(manthra.overallScore * 100).toFixed(1)}%`,
          `Yasna: ${(yasna.overallScore * 100).toFixed(1)}%`,
          `Mithra: ${(mithra.overallScore * 100).toFixed(1)}%`
        ]
      });
    }

    // Check for consistency gaps
    const scores = [manthra.overallScore, yasna.overallScore, mithra.overallScore];
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);
    if (maxScore - minScore > 0.3) {
      gaps.push({
        id: generateCalibrationId('gap'),
        type: 'consistency',
        affectedDimensions: ['manthra', 'yasna', 'mithra'],
        severity: maxScore - minScore > 0.5 ? 'high' : 'medium',
        description: 'Significant variance between dimension scores',
        rootCause: 'Uneven attention to different calibration dimensions',
        impact: 'System strength limited by weakest dimension',
        resolution: 'Focus improvement efforts on lowest-scoring dimension',
        evidence: [
          `Score variance: ${((maxScore - minScore) * 100).toFixed(1)}%`,
          `Highest: ${(maxScore * 100).toFixed(1)}%`,
          `Lowest: ${(minScore * 100).toFixed(1)}%`
        ]
      });
    }

    return gaps;
  }

  /**
   * Identify systemic issues affecting all dimensions
   */
  private identifySystemicIssues(
    manthra: ManthraCalibrationResult,
    yasna: YasnaCalibrationResult,
    mithra: MithraCalibrationResult
  ): CalibrationFinding[] {
    const issues: CalibrationFinding[] = [];

    // Check for universal low scores (systemic degradation)
    if (manthra.overallScore < 0.5 && yasna.overallScore < 0.5 && mithra.overallScore < 0.5) {
      issues.push({
        id: generateCalibrationId('finding'),
        dimension: 'cross-dimensional',
        category: 'systemic-degradation',
        severity: 'critical',
        description: 'All dimensions are below acceptable thresholds',
        evidence: [
          `Manthra: ${(manthra.overallScore * 100).toFixed(1)}%`,
          `Yasna: ${(yasna.overallScore * 100).toFixed(1)}%`,
          `Mithra: ${(mithra.overallScore * 100).toFixed(1)}%`
        ],
        recommendation: 'Initiate comprehensive system recovery program',
        impact: 'System is at risk of critical failure',
        detectedAt: new Date(),
        resolved: false
      });
    }

    // Check for pattern of low findings resolution
    const allFindings = [
      ...manthra.findings,
      ...yasna.findings,
      ...mithra.findings
    ];
    const unresolvedCount = allFindings.filter(f => !f.resolved).length;
    const criticalUnresolved = allFindings.filter(f => !f.resolved && f.severity === 'critical').length;

    if (criticalUnresolved > 0) {
      issues.push({
        id: generateCalibrationId('finding'),
        dimension: 'cross-dimensional',
        category: 'unresolved-critical',
        severity: 'critical',
        description: `${criticalUnresolved} critical findings remain unresolved`,
        evidence: allFindings
          .filter(f => !f.resolved && f.severity === 'critical')
          .map(f => f.description),
        recommendation: 'Prioritize resolution of critical findings immediately',
        impact: 'Critical issues threaten system stability',
        detectedAt: new Date(),
        resolved: false
      });
    }

    if (unresolvedCount > 10) {
      issues.push({
        id: generateCalibrationId('finding'),
        dimension: 'cross-dimensional',
        category: 'finding-accumulation',
        severity: unresolvedCount > 20 ? 'high' : 'medium',
        description: `${unresolvedCount} total findings remain unresolved`,
        evidence: [`Unresolved findings: ${unresolvedCount}`],
        recommendation: 'Establish systematic finding resolution process',
        impact: 'Accumulated issues degrade system quality over time',
        detectedAt: new Date(),
        resolved: false
      });
    }

    // Check for conflicting health statuses
    const healthStatuses = [manthra.health, yasna.health, mithra.health];
    if (healthStatuses.includes('critical') && healthStatuses.includes('healthy')) {
      issues.push({
        id: generateCalibrationId('finding'),
        dimension: 'cross-dimensional',
        category: 'health-inconsistency',
        severity: 'high',
        description: 'Inconsistent health status across dimensions',
        evidence: [
          `Manthra health: ${manthra.health}`,
          `Yasna health: ${yasna.health}`,
          `Mithra health: ${mithra.health}`
        ],
        recommendation: 'Investigate cause of health status divergence',
        impact: 'Health inconsistency indicates systemic imbalance',
        detectedAt: new Date(),
        resolved: false
      });
    }

    return issues;
  }

  /**
   * Generate recommendations for improving coherence
   */
  private generateRecommendations(
    alignments: DimensionAlignmentScore[],
    gaps: CoherenceGap[],
    systemicIssues: CalibrationFinding[]
  ): CalibrationRecommendation[] {
    const recommendations: CalibrationRecommendation[] = [];
    let priority = 1;

    // Systemic issue recommendations (highest priority)
    const criticalSystemicIssues = systemicIssues.filter(i => i.severity === 'critical');
    if (criticalSystemicIssues.length > 0) {
      recommendations.push({
        id: generateCalibrationId('rec'),
        dimension: 'cross-dimensional',
        priority: priority++,
        title: 'Address Critical Systemic Issues',
        description: 'Critical systemic issues require immediate attention',
        expectedImprovement: 0.25,
        effort: 'high',
        estimatedTime: '2-4 weeks',
        relatedFindings: criticalSystemicIssues.map(i => i.id),
        implementationSteps: [
          'Assemble cross-functional team',
          'Triage critical issues by impact',
          'Create remediation plan',
          'Execute with daily checkpoints',
          'Validate improvements across all dimensions'
        ],
        createdAt: new Date(),
        status: 'proposed'
      });
    }

    // Critical coherence gap recommendations
    const criticalGaps = gaps.filter(g => g.severity === 'critical');
    if (criticalGaps.length > 0) {
      recommendations.push({
        id: generateCalibrationId('rec'),
        dimension: 'cross-dimensional',
        priority: priority++,
        title: 'Close Critical Coherence Gaps',
        description: `${criticalGaps.length} critical coherence gaps need resolution`,
        expectedImprovement: 0.2,
        effort: 'high',
        estimatedTime: '3-5 weeks',
        relatedFindings: [],
        implementationSteps: [
          'Map gap root causes',
          'Design cross-dimensional solution',
          'Implement integration points',
          'Test dimensional interactions',
          'Validate coherence improvement'
        ],
        createdAt: new Date(),
        status: 'proposed'
      });
    }

    // Alignment improvement recommendations
    for (const alignment of alignments) {
      if (alignment.alignmentScore < 0.6) {
        recommendations.push({
          id: generateCalibrationId('rec'),
          dimension: 'cross-dimensional',
          priority: priority++,
          title: `Improve ${alignment.dimension1}-${alignment.dimension2} Alignment`,
          description: `Alignment between ${alignment.dimension1} and ${alignment.dimension2} is below threshold`,
          expectedImprovement: 0.15,
          effort: 'medium',
          estimatedTime: '2-3 weeks',
          relatedFindings: [],
          implementationSteps: [
            `Review ${alignment.dimension1} and ${alignment.dimension2} calibration results`,
            'Identify conflict root causes',
            'Design unified approach',
            'Implement aligned patterns',
            'Validate alignment improvement'
          ],
          createdAt: new Date(),
          status: 'proposed'
        });
      }
    }

    // Synergy optimization recommendation
    const avgSynergy = alignments.reduce((sum, a) => sum + a.synergyScore, 0) / alignments.length;
    if (avgSynergy < 0.6) {
      recommendations.push({
        id: generateCalibrationId('rec'),
        dimension: 'cross-dimensional',
        priority: priority++,
        title: 'Optimize Cross-Dimensional Synergy',
        description: 'Dimensions are not leveraging each other effectively',
        expectedImprovement: 0.12,
        effort: 'medium',
        estimatedTime: '2-4 weeks',
        relatedFindings: [],
        implementationSteps: [
          'Map synergy opportunities',
          'Design shared patterns and utilities',
          'Implement cross-cutting concerns',
          'Create dimensional bridges',
          'Measure synergy improvement'
        ],
        createdAt: new Date(),
        status: 'proposed'
      });
    }

    // Coherence monitoring recommendation
    if (gaps.length > 3) {
      recommendations.push({
        id: generateCalibrationId('rec'),
        dimension: 'cross-dimensional',
        priority: priority++,
        title: 'Establish Coherence Monitoring',
        description: 'Multiple coherence gaps indicate need for ongoing monitoring',
        expectedImprovement: 0.08,
        effort: 'low',
        estimatedTime: '1 week',
        relatedFindings: [],
        implementationSteps: [
          'Set up coherence dashboard',
          'Define alert thresholds',
          'Create monitoring runbook',
          'Establish review cadence',
          'Automate coherence checks in CI'
        ],
        createdAt: new Date(),
        status: 'proposed'
      });
    }

    return recommendations;
  }

  /**
   * Calculate overall coherence score
   */
  private calculateOverallCoherence(alignments: DimensionAlignmentScore[]): number {
    const manthraYasna = alignments.find(a => 
      a.dimension1 === 'manthra' && a.dimension2 === 'yasna'
    );
    const yasnaMithra = alignments.find(a => 
      a.dimension1 === 'yasna' && a.dimension2 === 'mithra'
    );
    const manthraMithra = alignments.find(a => 
      a.dimension1 === 'manthra' && a.dimension2 === 'mithra'
    );

    const weightedScore = (
      (manthraYasna?.alignmentScore || 0) * this.config.manthraYasnaWeight +
      (yasnaMithra?.alignmentScore || 0) * this.config.yasnaMithraWeight +
      (manthraMithra?.alignmentScore || 0) * this.config.manthraMithraWeight
    );

    // Add synergy bonus
    const avgSynergy = alignments.reduce((sum, a) => sum + a.synergyScore, 0) / alignments.length;
    const synergyBonus = avgSynergy * 0.1;

    return Math.min(1, weightedScore + synergyBonus);
  }

  /**
   * Calculate trend from assessment history
   */
  private calculateTrend(): CrossDimensionalCoherenceResult['trend'] {
    if (!this.config.enableTrendAnalysis || this.assessmentHistory.length < 2) {
      return {
        direction: 'stable',
        rate: 0,
        projectedHealth: 'unknown'
      };
    }

    const recent = this.assessmentHistory.slice(-5);
    const first = recent[0].overallCoherence;
    const last = recent[recent.length - 1].overallCoherence;
    const change = last - first;
    const rate = change / recent.length;

    let direction: 'improving' | 'stable' | 'degrading';
    if (rate > 0.02) direction = 'improving';
    else if (rate < -0.02) direction = 'degrading';
    else direction = 'stable';

    // Project future health based on current trend
    const projectedScore = last + (rate * 5); // Project 5 assessments ahead
    const projectedHealth = getHealthFromScore(Math.max(0, Math.min(1, projectedScore)));

    return {
      direction,
      rate,
      projectedHealth
    };
  }

  /**
   * Add an audit entry
   */
  private addAuditEntry(params: {
    eventType: CalibrationAuditEntry['eventType'];
    description: string;
    previousState?: any;
    newState?: any;
    actor?: string;
    reason?: string;
  }): void {
    this.auditTrail.push({
      id: generateCalibrationId('audit'),
      timestamp: new Date(),
      eventType: params.eventType,
      dimension: 'cross-dimensional',
      description: params.description,
      previousState: params.previousState,
      newState: params.newState,
      actor: params.actor,
      reason: params.reason
    });
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Get last assessment result
   */
  public getLastAssessment(): CrossDimensionalCoherenceResult | null {
    return this.lastAssessment;
  }

  /**
   * Get assessment history
   */
  public getAssessmentHistory(): CrossDimensionalCoherenceResult[] {
    return [...this.assessmentHistory];
  }

  /**
   * Get audit trail
   */
  public getAuditTrail(): CalibrationAuditEntry[] {
    return [...this.auditTrail];
  }

  /**
   * Get dashboard data for visualization
   */
  public getDashboardData(): {
    overallCoherence: number;
    status: string;
    health: string;
    dimensionAlignments: Array<{
      dimensions: string;
      alignment: number;
      synergy: number;
      conflicts: number;
    }>;
    gapSummary: {
      total: number;
      critical: number;
      high: number;
      byType: Record<string, number>;
    };
    systemicHealth: {
      issues: number;
      criticalIssues: number;
    };
    trend: {
      direction: string;
      rate: number;
      projectedHealth: string;
    };
    topRecommendations: CalibrationRecommendation[];
  } {
    const lastResult = this.lastAssessment;

    const dimensionAlignments = lastResult?.dimensionAlignments.map(a => ({
      dimensions: `${a.dimension1}-${a.dimension2}`,
      alignment: a.alignmentScore,
      synergy: a.synergyScore,
      conflicts: a.conflicts.length
    })) || [];

    const gapSummary = {
      total: lastResult?.coherenceGaps.length || 0,
      critical: lastResult?.coherenceGaps.filter(g => g.severity === 'critical').length || 0,
      high: lastResult?.coherenceGaps.filter(g => g.severity === 'high').length || 0,
      byType: {} as Record<string, number>
    };

    if (lastResult) {
      for (const gap of lastResult.coherenceGaps) {
        gapSummary.byType[gap.type] = (gapSummary.byType[gap.type] || 0) + 1;
      }
    }

    return {
      overallCoherence: lastResult?.overallCoherence || 0,
      status: lastResult?.status || 'unknown',
      health: lastResult?.health || 'unknown',
      dimensionAlignments,
      gapSummary,
      systemicHealth: {
        issues: lastResult?.systemicIssues.length || 0,
        criticalIssues: lastResult?.systemicIssues.filter(i => i.severity === 'critical').length || 0
      },
      trend: {
        direction: lastResult?.trend.direction || 'stable',
        rate: lastResult?.trend.rate || 0,
        projectedHealth: lastResult?.trend.projectedHealth || 'unknown'
      },
      topRecommendations: lastResult?.recommendations.filter(r => r.status === 'proposed').slice(0, 3) || []
    };
  }

  /**
   * Get coherence health summary
   */
  public getCoherenceHealthSummary(): {
    healthy: boolean;
    score: number;
    alerts: string[];
    strengths: string[];
  } {
    const lastResult = this.lastAssessment;
    const alerts: string[] = [];
    const strengths: string[] = [];

    if (!lastResult) {
      return {
        healthy: false,
        score: 0,
        alerts: ['No coherence assessment performed'],
        strengths: []
      };
    }

    // Check for alerts
    if (lastResult.status === 'critical') {
      alerts.push('System coherence is critically low');
    }
    if (lastResult.coherenceGaps.some(g => g.severity === 'critical')) {
      alerts.push('Critical coherence gaps present');
    }
    if (lastResult.systemicIssues.some(i => i.severity === 'critical')) {
      alerts.push('Critical systemic issues detected');
    }
    if (lastResult.trend.direction === 'degrading') {
      alerts.push('Coherence is trending downward');
    }

    // Check for strengths
    for (const alignment of lastResult.dimensionAlignments) {
      if (alignment.alignmentScore >= 0.8) {
        strengths.push(`Strong ${alignment.dimension1}-${alignment.dimension2} alignment`);
      }
      if (alignment.synergyScore >= 0.8) {
        strengths.push(`High ${alignment.dimension1}-${alignment.dimension2} synergy`);
      }
    }
    if (lastResult.trend.direction === 'improving') {
      strengths.push('Coherence is improving');
    }
    if (lastResult.coherenceGaps.length === 0) {
      strengths.push('No coherence gaps detected');
    }

    return {
      healthy: lastResult.health === 'healthy' && alerts.length === 0,
      score: lastResult.overallCoherence,
      alerts,
      strengths
    };
  }

  /**
   * Reset the coherence system
   */
  public reset(): void {
    this.lastAssessment = null;
    this.assessmentHistory = [];

    this.addAuditEntry({
      eventType: 'adjustment',
      description: 'Cross-dimensional coherence system reset',
      reason: 'Manual reset'
    });
  }

  /**
   * Export coherence state
   */
  public exportState(): string {
    return JSON.stringify({
      config: this.config,
      auditTrail: this.auditTrail,
      assessmentHistory: this.assessmentHistory,
      lastAssessment: this.lastAssessment
    }, null, 2);
  }

  /**
   * Import coherence state
   */
  public importState(stateJson: string): void {
    try {
      const state = JSON.parse(stateJson);
      if (state.config) this.config = { ...DEFAULT_CROSS_DIMENSIONAL_CONFIG, ...state.config };
      if (state.auditTrail) this.auditTrail = state.auditTrail;
      if (state.assessmentHistory) this.assessmentHistory = state.assessmentHistory;
      if (state.lastAssessment) this.lastAssessment = state.lastAssessment;

      this.addAuditEntry({
        eventType: 'adjustment',
        description: 'Cross-dimensional coherence state imported',
        reason: 'State import'
      });
    } catch (error) {
      console.error('[COHERENCE] Failed to import state:', error);
      throw error;
    }
  }
}

/**
 * Factory function to create cross-dimensional coherence system
 */
export function createCrossDimensionalCoherenceSystem(
  config?: Partial<CrossDimensionalConfig>
): CrossDimensionalCoherenceSystem {
  return new CrossDimensionalCoherenceSystem(config);
}
