/**
 * Calibration Optimization System
 * 
 * Implements feedback loop, adjustment triggers, rollback procedures,
 * learning system, and comprehensive reporting for the calibration framework.
 * 
 * @module calibration/calibration-optimizer
 */

import {
  CalibrationMetric,
  CalibrationFinding,
  CalibrationRecommendation,
  CalibrationAuditEntry,
  CalibrationSeverity,
  CalibrationHealth,
  ManthraCalibrationResult,
  YasnaCalibrationResult,
  MithraCalibrationResult,
  CrossDimensionalCoherenceResult,
  AdjustmentTrigger,
  RollbackProcedure,
  CalibrationLearning,
  CalibrationOptimizationConfig,
  CalibrationFeedbackMetrics,
  CalibrationReport,
  DEFAULT_CALIBRATION_CONFIG,
  generateCalibrationId,
  getStatusFromScore,
  getHealthFromScore
} from './types.js';

import { ManthraCalibrationSystem } from './manthra-calibration.js';
import { YasnaCalibrationSystem } from './yasna-calibration.js';
import { MithraCalibrationSystem } from './mithra-calibration.js';
import { CrossDimensionalCoherenceSystem } from './cross-dimensional-coherence.js';

/**
 * Optimization event
 */
export interface OptimizationEvent {
  id: string;
  timestamp: Date;
  type: 'trigger_fired' | 'adjustment_made' | 'rollback_initiated' | 'learning_recorded' | 'cycle_completed';
  description: string;
  data: any;
  success: boolean;
}

/**
 * Calibration Optimizer
 * 
 * Central orchestrator for calibration optimization, feedback loops,
 * and continuous improvement.
 */
export class CalibrationOptimizer {
  private config: CalibrationOptimizationConfig;
  private manthra: ManthraCalibrationSystem;
  private yasna: YasnaCalibrationSystem;
  private mithra: MithraCalibrationSystem;
  private coherence: CrossDimensionalCoherenceSystem;

  private triggers: Map<string, AdjustmentTrigger> = new Map();
  private rollbackProcedures: Map<string, RollbackProcedure> = new Map();
  private learnings: CalibrationLearning[] = [];
  private feedbackHistory: CalibrationFeedbackMetrics[] = [];
  private auditTrail: CalibrationAuditEntry[] = [];
  private events: OptimizationEvent[] = [];
  private reports: CalibrationReport[] = [];

  private optimizationInterval: NodeJS.Timeout | null = null;
  private lastOptimization: Date | null = null;

  constructor(
    manthra: ManthraCalibrationSystem,
    yasna: YasnaCalibrationSystem,
    mithra: MithraCalibrationSystem,
    coherence: CrossDimensionalCoherenceSystem,
    config?: Partial<CalibrationOptimizationConfig>
  ) {
    this.manthra = manthra;
    this.yasna = yasna;
    this.mithra = mithra;
    this.coherence = coherence;
    this.config = { ...DEFAULT_CALIBRATION_CONFIG, ...config };

    this.initializeDefaultTriggers();
  }

  /**
   * Initialize default adjustment triggers
   */
  private initializeDefaultTriggers(): void {
    const defaultTriggers: Omit<AdjustmentTrigger, 'id'>[] = [
      {
        name: 'Critical Health Alert',
        condition: 'Any dimension health is critical',
        threshold: 0.3,
        dimensions: ['manthra', 'yasna', 'mithra', 'cross-dimensional'],
        action: 'escalate',
        enabled: true,
        cooldownMs: 300000 // 5 minutes
      },
      {
        name: 'Low Coherence Alert',
        condition: 'Cross-dimensional coherence below threshold',
        threshold: 0.5,
        dimensions: ['cross-dimensional'],
        action: 'alert',
        enabled: true,
        cooldownMs: 600000 // 10 minutes
      },
      {
        name: 'Type Safety Degradation',
        condition: 'Yasna type safety drops significantly',
        threshold: 0.6,
        dimensions: ['yasna'],
        action: 'recommend',
        enabled: true,
        cooldownMs: 3600000 // 1 hour
      },
      {
        name: 'State Management Warning',
        condition: 'Mithra state management below threshold',
        threshold: 0.6,
        dimensions: ['mithra'],
        action: 'recommend',
        enabled: true,
        cooldownMs: 3600000 // 1 hour
      },
      {
        name: 'Strategic Thinking Alert',
        condition: 'Manthra strategic thinking drops',
        threshold: 0.6,
        dimensions: ['manthra'],
        action: 'recommend',
        enabled: true,
        cooldownMs: 3600000 // 1 hour
      }
    ];

    for (const trigger of defaultTriggers) {
      const id = generateCalibrationId('trigger');
      this.triggers.set(id, { id, ...trigger });
    }
  }

  // ============================================================================
  // Feedback Loop
  // ============================================================================

  /**
   * Execute a complete feedback loop cycle
   */
  public async executeFeedbackCycle(): Promise<CalibrationFeedbackMetrics> {
    const cycleStart = Date.now();

    // Calibrate all dimensions
    const manthraResult = await this.manthra.calibrate();
    const yasnaResult = await this.yasna.calibrate();
    const mithraResult = await this.mithra.calibrate();

    // Assess coherence
    const coherenceResult = await this.coherence.assess(
      manthraResult,
      yasnaResult,
      mithraResult
    );

    // Check triggers
    const triggeredActions = await this.checkTriggers(
      manthraResult,
      yasnaResult,
      mithraResult,
      coherenceResult
    );

    // Apply auto-adjustments if enabled
    let adjustmentsMade = 0;
    if (this.config.autoOptimize) {
      adjustmentsMade = await this.applyAutoAdjustments(
        manthraResult,
        yasnaResult,
        mithraResult,
        coherenceResult
      );
    }

    // Extract learnings
    let learningsExtracted = 0;
    if (this.config.enableLearning) {
      learningsExtracted = await this.extractLearnings(
        manthraResult,
        yasnaResult,
        mithraResult,
        coherenceResult
      );
    }

    // Create feedback metrics
    const metrics: CalibrationFeedbackMetrics = {
      timestamp: new Date(),
      manthraScore: manthraResult.overallScore,
      yasnaScore: yasnaResult.overallScore,
      mithraScore: mithraResult.overallScore,
      coherenceScore: coherenceResult.overallCoherence,
      adjustmentsMade,
      learningsExtracted,
      overallHealth: this.calculateOverallHealth(
        manthraResult.health,
        yasnaResult.health,
        mithraResult.health,
        coherenceResult.health
      )
    };

    this.feedbackHistory.push(metrics);

    // Trim history
    if (this.feedbackHistory.length > 100) {
      this.feedbackHistory = this.feedbackHistory.slice(-100);
    }

    this.lastOptimization = new Date();

    // Log event
    this.recordEvent({
      type: 'cycle_completed',
      description: `Feedback cycle completed in ${Date.now() - cycleStart}ms`,
      data: {
        metrics,
        triggeredActions: triggeredActions.length,
        adjustmentsMade,
        learningsExtracted
      },
      success: true
    });

    this.addAuditEntry({
      eventType: 'assessment',
      description: 'Feedback cycle completed',
      newState: metrics
    });

    return metrics;
  }

  /**
   * Start automatic optimization loop
   */
  public startOptimizationLoop(): void {
    if (this.optimizationInterval) {
      console.log('[OPTIMIZER] Optimization loop already running');
      return;
    }

    this.optimizationInterval = setInterval(
      () => this.executeFeedbackCycle(),
      this.config.optimizationIntervalMs
    );

    this.addAuditEntry({
      eventType: 'adjustment',
      description: 'Optimization loop started',
      newState: { intervalMs: this.config.optimizationIntervalMs }
    });

    console.log(`[OPTIMIZER] Optimization loop started (interval: ${this.config.optimizationIntervalMs}ms)`);
  }

  /**
   * Stop automatic optimization loop
   */
  public stopOptimizationLoop(): void {
    if (this.optimizationInterval) {
      clearInterval(this.optimizationInterval);
      this.optimizationInterval = null;

      this.addAuditEntry({
        eventType: 'adjustment',
        description: 'Optimization loop stopped'
      });

      console.log('[OPTIMIZER] Optimization loop stopped');
    }
  }

  /**
   * Calculate overall health from dimension health statuses
   */
  private calculateOverallHealth(
    manthraHealth: CalibrationHealth,
    yasnaHealth: CalibrationHealth,
    mithraHealth: CalibrationHealth,
    coherenceHealth: CalibrationHealth
  ): CalibrationHealth {
    const healths = [manthraHealth, yasnaHealth, mithraHealth, coherenceHealth];

    if (healths.some(h => h === 'critical')) return 'critical';
    if (healths.some(h => h === 'warning')) return 'warning';
    if (healths.every(h => h === 'healthy')) return 'healthy';
    return 'unknown';
  }

  // ============================================================================
  // Adjustment Triggers
  // ============================================================================

  /**
   * Check all triggers and fire applicable ones
   */
  private async checkTriggers(
    manthra: ManthraCalibrationResult,
    yasna: YasnaCalibrationResult,
    mithra: MithraCalibrationResult,
    coherence: CrossDimensionalCoherenceResult
  ): Promise<AdjustmentTrigger[]> {
    const triggeredList: AdjustmentTrigger[] = [];
    const now = new Date();

    for (const [id, trigger] of this.triggers) {
      if (!trigger.enabled) continue;

      // Check cooldown
      if (trigger.lastTriggered) {
        const elapsed = now.getTime() - trigger.lastTriggered.getTime();
        if (elapsed < trigger.cooldownMs) continue;
      }

      // Check condition
      const shouldTrigger = this.evaluateTriggerCondition(
        trigger,
        manthra,
        yasna,
        mithra,
        coherence
      );

      if (shouldTrigger) {
        trigger.lastTriggered = now;
        triggeredList.push(trigger);

        this.recordEvent({
          type: 'trigger_fired',
          description: `Trigger fired: ${trigger.name}`,
          data: { triggerId: id, action: trigger.action },
          success: true
        });

        // Execute trigger action
        await this.executeTriggerAction(trigger, manthra, yasna, mithra, coherence);
      }
    }

    return triggeredList;
  }

  /**
   * Evaluate if a trigger condition is met
   */
  private evaluateTriggerCondition(
    trigger: AdjustmentTrigger,
    manthra: ManthraCalibrationResult,
    yasna: YasnaCalibrationResult,
    mithra: MithraCalibrationResult,
    coherence: CrossDimensionalCoherenceResult
  ): boolean {
    for (const dimension of trigger.dimensions) {
      let score = 0;

      switch (dimension) {
        case 'manthra':
          score = manthra.overallScore;
          break;
        case 'yasna':
          score = yasna.overallScore;
          break;
        case 'mithra':
          score = mithra.overallScore;
          break;
        case 'cross-dimensional':
          score = coherence.overallCoherence;
          break;
      }

      if (score < trigger.threshold) {
        return true;
      }
    }

    return false;
  }

  /**
   * Execute trigger action
   */
  private async executeTriggerAction(
    trigger: AdjustmentTrigger,
    manthra: ManthraCalibrationResult,
    yasna: YasnaCalibrationResult,
    mithra: MithraCalibrationResult,
    coherence: CrossDimensionalCoherenceResult
  ): Promise<void> {
    switch (trigger.action) {
      case 'alert':
        console.log(`[OPTIMIZER] ALERT: ${trigger.name} - ${trigger.condition}`);
        break;

      case 'recommend':
        // Recommendations are already generated by calibration systems
        console.log(`[OPTIMIZER] RECOMMENDATION: ${trigger.name} triggered`);
        break;

      case 'auto_adjust':
        if (this.config.autoOptimize) {
          console.log(`[OPTIMIZER] AUTO-ADJUST: ${trigger.name} triggered`);
        }
        break;

      case 'escalate':
        console.log(`[OPTIMIZER] ESCALATE: ${trigger.name} - IMMEDIATE ATTENTION REQUIRED`);
        // Create high-priority finding
        break;
    }
  }

  /**
   * Add a custom trigger
   */
  public addTrigger(trigger: Omit<AdjustmentTrigger, 'id'>): string {
    const id = generateCalibrationId('trigger');
    this.triggers.set(id, { id, ...trigger });

    this.addAuditEntry({
      eventType: 'adjustment',
      description: `Trigger added: ${trigger.name}`,
      newState: { triggerId: id }
    });

    return id;
  }

  /**
   * Remove a trigger
   */
  public removeTrigger(triggerId: string): boolean {
    const trigger = this.triggers.get(triggerId);
    if (trigger) {
      this.triggers.delete(triggerId);

      this.addAuditEntry({
        eventType: 'adjustment',
        description: `Trigger removed: ${trigger.name}`,
        previousState: { triggerId }
      });

      return true;
    }
    return false;
  }

  /**
   * Get all triggers
   */
  public getTriggers(): AdjustmentTrigger[] {
    return Array.from(this.triggers.values());
  }

  /**
   * Enable/disable a trigger
   */
  public setTriggerEnabled(triggerId: string, enabled: boolean): boolean {
    const trigger = this.triggers.get(triggerId);
    if (trigger) {
      trigger.enabled = enabled;
      return true;
    }
    return false;
  }

  // ============================================================================
  // Rollback Procedures
  // ============================================================================

  /**
   * Create a rollback procedure
   */
  public createRollbackProcedure(
    procedure: Omit<RollbackProcedure, 'id' | 'createdAt' | 'status'>
  ): string {
    const id = generateCalibrationId('rollback');
    const rollback: RollbackProcedure = {
      id,
      ...procedure,
      createdAt: new Date(),
      status: 'ready'
    };

    this.rollbackProcedures.set(id, rollback);

    this.addAuditEntry({
      eventType: 'adjustment',
      description: `Rollback procedure created: ${procedure.name}`,
      newState: { procedureId: id }
    });

    return id;
  }

  /**
   * Capture current state for rollback
   */
  public captureStateSnapshot(procedureId: string): boolean {
    const procedure = this.rollbackProcedures.get(procedureId);
    if (!procedure) return false;

    procedure.preChangeState = {
      manthra: this.manthra.exportState(),
      yasna: this.yasna.exportState(),
      mithra: this.mithra.exportState(),
      coherence: this.coherence.exportState(),
      capturedAt: new Date()
    };

    this.addAuditEntry({
      eventType: 'adjustment',
      description: `State snapshot captured for rollback: ${procedure.name}`,
      newState: { procedureId }
    });

    return true;
  }

  /**
   * Execute a rollback procedure
   */
  public async executeRollback(procedureId: string): Promise<boolean> {
    const procedure = this.rollbackProcedures.get(procedureId);
    if (!procedure || !procedure.preChangeState) {
      console.error('[OPTIMIZER] Cannot execute rollback: procedure not found or no snapshot');
      return false;
    }

    procedure.status = 'executing';

    this.recordEvent({
      type: 'rollback_initiated',
      description: `Rollback initiated: ${procedure.name}`,
      data: { procedureId },
      success: true
    });

    try {
      // Restore state from snapshot
      this.manthra.importState(procedure.preChangeState.manthra);
      this.yasna.importState(procedure.preChangeState.yasna);
      this.mithra.importState(procedure.preChangeState.mithra);
      this.coherence.importState(procedure.preChangeState.coherence);

      procedure.status = 'completed';

      this.addAuditEntry({
        eventType: 'rollback',
        description: `Rollback completed: ${procedure.name}`,
        newState: { procedureId, status: 'completed' }
      });

      return true;
    } catch (error) {
      procedure.status = 'failed';

      this.addAuditEntry({
        eventType: 'rollback',
        description: `Rollback failed: ${procedure.name}`,
        newState: { procedureId, status: 'failed', error: String(error) }
      });

      return false;
    }
  }

  /**
   * Get rollback procedures
   */
  public getRollbackProcedures(): RollbackProcedure[] {
    return Array.from(this.rollbackProcedures.values());
  }

  // ============================================================================
  // Auto Adjustments
  // ============================================================================

  /**
   * Apply automatic adjustments based on calibration results
   */
  private async applyAutoAdjustments(
    manthra: ManthraCalibrationResult,
    yasna: YasnaCalibrationResult,
    mithra: MithraCalibrationResult,
    coherence: CrossDimensionalCoherenceResult
  ): Promise<number> {
    if (!this.config.autoOptimize) return 0;

    let adjustmentsMade = 0;
    const maxAdjustments = this.config.maxAutoAdjustments;

    // Auto-accept high-priority recommendations
    const allRecommendations = [
      ...manthra.recommendations,
      ...yasna.recommendations,
      ...mithra.recommendations,
      ...coherence.recommendations
    ].filter(r => r.status === 'proposed')
      .sort((a, b) => a.priority - b.priority);

    for (const recommendation of allRecommendations.slice(0, maxAdjustments)) {
      // Auto-accept if effort is low and expected improvement is high
      if (recommendation.effort === 'low' && recommendation.expectedImprovement > 0.1) {
        recommendation.status = 'accepted';
        adjustmentsMade++;

        this.recordEvent({
          type: 'adjustment_made',
          description: `Auto-accepted recommendation: ${recommendation.title}`,
          data: { recommendationId: recommendation.id },
          success: true
        });
      }
    }

    return adjustmentsMade;
  }

  // ============================================================================
  // Learning System
  // ============================================================================

  /**
   * Extract learnings from calibration results
   */
  private async extractLearnings(
    manthra: ManthraCalibrationResult,
    yasna: YasnaCalibrationResult,
    mithra: MithraCalibrationResult,
    coherence: CrossDimensionalCoherenceResult
  ): Promise<number> {
    if (!this.config.enableLearning) return 0;

    let learningsExtracted = 0;

    // Pattern learning: Identify recurring issues
    const patternLearnings = this.identifyPatterns(manthra, yasna, mithra, coherence);
    for (const learning of patternLearnings) {
      this.learnings.push(learning);
      learningsExtracted++;
    }

    // Correlation learning: Identify dimension correlations
    const correlationLearnings = this.identifyCorrelations(manthra, yasna, mithra, coherence);
    for (const learning of correlationLearnings) {
      this.learnings.push(learning);
      learningsExtracted++;
    }

    // Log learnings
    for (const learning of [...patternLearnings, ...correlationLearnings]) {
      this.recordEvent({
        type: 'learning_recorded',
        description: `Learning recorded: ${learning.description}`,
        data: { learningId: learning.id, type: learning.type },
        success: true
      });
    }

    return learningsExtracted;
  }

  /**
   * Identify patterns from calibration history
   */
  private identifyPatterns(
    manthra: ManthraCalibrationResult,
    yasna: YasnaCalibrationResult,
    mithra: MithraCalibrationResult,
    coherence: CrossDimensionalCoherenceResult
  ): CalibrationLearning[] {
    const learnings: CalibrationLearning[] = [];

    // Check for recurring findings
    const allFindings = [
      ...manthra.findings,
      ...yasna.findings,
      ...mithra.findings
    ];

    const categoryCount: Record<string, number> = {};
    for (const finding of allFindings) {
      categoryCount[finding.category] = (categoryCount[finding.category] || 0) + 1;
    }

    for (const [category, count] of Object.entries(categoryCount)) {
      if (count >= 3) {
        learnings.push({
          id: generateCalibrationId('learning'),
          type: 'pattern',
          description: `Recurring issue pattern: ${category} (${count} occurrences)`,
          confidence: Math.min(0.9, 0.5 + count * 0.1),
          data: { category, count },
          learnedAt: new Date(),
          validated: false,
          applicationCount: 0,
          successRate: 0
        });
      }
    }

    return learnings;
  }

  /**
   * Identify correlations between dimensions
   */
  private identifyCorrelations(
    manthra: ManthraCalibrationResult,
    yasna: YasnaCalibrationResult,
    mithra: MithraCalibrationResult,
    coherence: CrossDimensionalCoherenceResult
  ): CalibrationLearning[] {
    const learnings: CalibrationLearning[] = [];

    // Check history for score correlations
    if (this.feedbackHistory.length >= 5) {
      const recent = this.feedbackHistory.slice(-10);

      // Check Manthra-Yasna correlation
      const manthraYasnaCorr = this.calculateCorrelation(
        recent.map(m => m.manthraScore),
        recent.map(m => m.yasnaScore)
      );

      if (Math.abs(manthraYasnaCorr) > 0.7) {
        learnings.push({
          id: generateCalibrationId('learning'),
          type: 'correlation',
          description: `Strong ${manthraYasnaCorr > 0 ? 'positive' : 'negative'} correlation between Manthra and Yasna`,
          confidence: Math.abs(manthraYasnaCorr),
          data: { dimensions: ['manthra', 'yasna'], correlation: manthraYasnaCorr },
          learnedAt: new Date(),
          validated: false,
          applicationCount: 0,
          successRate: 0
        });
      }
    }

    return learnings;
  }

  /**
   * Calculate Pearson correlation coefficient
   */
  private calculateCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    if (n === 0) return 0;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((total, xi, i) => total + xi * y[i], 0);
    const sumX2 = x.reduce((total, xi) => total + xi * xi, 0);
    const sumY2 = y.reduce((total, yi) => total + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    if (denominator === 0) return 0;
    return numerator / denominator;
  }

  /**
   * Get learnings
   */
  public getLearnings(): CalibrationLearning[] {
    return [...this.learnings];
  }

  /**
   * Validate a learning
   */
  public validateLearning(learningId: string, validated: boolean): boolean {
    const learning = this.learnings.find(l => l.id === learningId);
    if (learning) {
      learning.validated = validated;
      return true;
    }
    return false;
  }

  /**
   * Apply a learning and track success
   */
  public applyLearning(learningId: string, success: boolean): boolean {
    const learning = this.learnings.find(l => l.id === learningId);
    if (learning) {
      learning.applicationCount++;
      const totalSuccess = learning.successRate * (learning.applicationCount - 1) + (success ? 1 : 0);
      learning.successRate = totalSuccess / learning.applicationCount;

      // Update confidence based on application success
      learning.confidence = Math.min(0.95, 
        learning.confidence * (1 - this.config.learningRate) + 
        learning.successRate * this.config.learningRate
      );

      return true;
    }
    return false;
  }

  // ============================================================================
  // Reporting
  // ============================================================================

  /**
   * Generate comprehensive calibration report
   */
  public async generateReport(): Promise<CalibrationReport> {
    // Get latest calibration results
    const manthraResult = this.manthra.getLastCalibration();
    const yasnaResult = this.yasna.getLastCalibration();
    const mithraResult = this.mithra.getLastCalibration();
    const coherenceResult = this.coherence.getLastAssessment();

    // Ensure we have results
    let manthra = manthraResult;
    let yasna = yasnaResult;
    let mithra = mithraResult;
    let coherence = coherenceResult;

    if (!manthra || !yasna || !mithra || !coherence) {
      // Run calibration if needed
      manthra = await this.manthra.calibrate();
      yasna = await this.yasna.calibrate();
      mithra = await this.mithra.calibrate();
      coherence = await this.coherence.assess(manthra, yasna, mithra);
    }

    // Calculate overall score
    const overallScore = (
      manthra.overallScore * 0.25 +
      yasna.overallScore * 0.3 +
      mithra.overallScore * 0.25 +
      coherence.overallCoherence * 0.2
    );

    // Generate executive summary
    const executiveSummary = this.generateExecutiveSummary(manthra, yasna, mithra, coherence);

    // Collect audit trail
    const allAuditTrail = [
      ...this.manthra.getAuditTrail(),
      ...this.yasna.getAuditTrail(),
      ...this.mithra.getAuditTrail(),
      ...this.coherence.getAuditTrail(),
      ...this.auditTrail
    ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 100);

    const report: CalibrationReport = {
      id: generateCalibrationId('report'),
      timestamp: new Date(),
      systemHealth: this.calculateOverallHealth(
        manthra.health,
        yasna.health,
        mithra.health,
        coherence.health
      ),
      overallScore,
      manthra,
      yasna,
      mithra,
      coherence,
      executiveSummary,
      auditTrail: allAuditTrail,
      metricsHistory: [...this.feedbackHistory]
    };

    this.reports.push(report);

    this.addAuditEntry({
      eventType: 'assessment',
      description: 'Calibration report generated',
      newState: { reportId: report.id, overallScore }
    });

    return report;
  }

  /**
   * Generate executive summary
   */
  private generateExecutiveSummary(
    manthra: ManthraCalibrationResult,
    yasna: YasnaCalibrationResult,
    mithra: MithraCalibrationResult,
    coherence: CrossDimensionalCoherenceResult
  ): CalibrationReport['executiveSummary'] {
    const highlights: string[] = [];
    const concerns: string[] = [];
    const actions: string[] = [];

    // Highlights
    if (manthra.overallScore >= 0.8) {
      highlights.push(`Strong directed thought-power (Manthra): ${(manthra.overallScore * 100).toFixed(1)}%`);
    }
    if (yasna.overallScore >= 0.8) {
      highlights.push(`Excellent alignment discipline (Yasna): ${(yasna.overallScore * 100).toFixed(1)}%`);
    }
    if (mithra.overallScore >= 0.8) {
      highlights.push(`Solid binding force (Mithra): ${(mithra.overallScore * 100).toFixed(1)}%`);
    }
    if (coherence.overallCoherence >= 0.8) {
      highlights.push(`High cross-dimensional coherence: ${(coherence.overallCoherence * 100).toFixed(1)}%`);
    }

    // Concerns
    if (manthra.overallScore < 0.6) {
      concerns.push(`Manthra calibration needs attention: ${(manthra.overallScore * 100).toFixed(1)}%`);
    }
    if (yasna.overallScore < 0.6) {
      concerns.push(`Yasna alignment is degraded: ${(yasna.overallScore * 100).toFixed(1)}%`);
    }
    if (mithra.overallScore < 0.6) {
      concerns.push(`Mithra binding force is weak: ${(mithra.overallScore * 100).toFixed(1)}%`);
    }
    if (coherence.overallCoherence < 0.6) {
      concerns.push(`System coherence is compromised: ${(coherence.overallCoherence * 100).toFixed(1)}%`);
    }

    // Critical findings
    const allFindings = [
      ...manthra.findings,
      ...yasna.findings,
      ...mithra.findings,
      ...coherence.systemicIssues
    ];
    const criticalFindings = allFindings.filter(f => f.severity === 'critical');
    if (criticalFindings.length > 0) {
      concerns.push(`${criticalFindings.length} critical findings require immediate attention`);
    }

    // Actions
    const allRecommendations = [
      ...manthra.recommendations,
      ...yasna.recommendations,
      ...mithra.recommendations,
      ...coherence.recommendations
    ].filter(r => r.status === 'proposed')
      .sort((a, b) => a.priority - b.priority);

    for (const rec of allRecommendations.slice(0, 5)) {
      actions.push(`[${rec.dimension.toUpperCase()}] ${rec.title} (${rec.effort} effort, ${rec.estimatedTime})`);
    }

    return { highlights, concerns, actions };
  }

  /**
   * Get reports
   */
  public getReports(): CalibrationReport[] {
    return [...this.reports];
  }

  /**
   * Get latest report
   */
  public getLatestReport(): CalibrationReport | null {
    return this.reports.length > 0 ? this.reports[this.reports.length - 1] : null;
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Record an optimization event
   */
  private recordEvent(event: Omit<OptimizationEvent, 'id' | 'timestamp'>): void {
    this.events.push({
      id: generateCalibrationId('event'),
      timestamp: new Date(),
      ...event
    });

    // Trim events
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000);
    }
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
      dimension: 'system',
      description: params.description,
      previousState: params.previousState,
      newState: params.newState,
      actor: params.actor,
      reason: params.reason
    });
  }

  /**
   * Get optimization events
   */
  public getEvents(): OptimizationEvent[] {
    return [...this.events];
  }

  /**
   * Get feedback history
   */
  public getFeedbackHistory(): CalibrationFeedbackMetrics[] {
    return [...this.feedbackHistory];
  }

  /**
   * Get audit trail
   */
  public getAuditTrail(): CalibrationAuditEntry[] {
    return [...this.auditTrail];
  }

  /**
   * Get dashboard data
   */
  public getDashboardData(): {
    lastOptimization: Date | null;
    optimizationLoopActive: boolean;
    feedbackCycles: number;
    activeTriggers: number;
    triggeredCount: number;
    learningsCount: number;
    reportsGenerated: number;
    latestMetrics: CalibrationFeedbackMetrics | null;
    trend: {
      direction: 'improving' | 'stable' | 'degrading';
      manthraChange: number;
      yasnaChange: number;
      mithraChange: number;
      coherenceChange: number;
    };
  } {
    const recentEvents = this.events.filter(e => e.type === 'trigger_fired');

    let trend: ReturnType<CalibrationOptimizer['getDashboardData']>['trend'] = {
      direction: 'stable',
      manthraChange: 0,
      yasnaChange: 0,
      mithraChange: 0,
      coherenceChange: 0
    };

    if (this.feedbackHistory.length >= 2) {
      const first = this.feedbackHistory[0];
      const last = this.feedbackHistory[this.feedbackHistory.length - 1];

      trend = {
        direction: last.coherenceScore > first.coherenceScore + 0.02 ? 'improving' :
                   last.coherenceScore < first.coherenceScore - 0.02 ? 'degrading' : 'stable',
        manthraChange: last.manthraScore - first.manthraScore,
        yasnaChange: last.yasnaScore - first.yasnaScore,
        mithraChange: last.mithraScore - first.mithraScore,
        coherenceChange: last.coherenceScore - first.coherenceScore
      };
    }

    return {
      lastOptimization: this.lastOptimization,
      optimizationLoopActive: this.optimizationInterval !== null,
      feedbackCycles: this.feedbackHistory.length,
      activeTriggers: Array.from(this.triggers.values()).filter(t => t.enabled).length,
      triggeredCount: recentEvents.length,
      learningsCount: this.learnings.length,
      reportsGenerated: this.reports.length,
      latestMetrics: this.feedbackHistory.length > 0 ? 
        this.feedbackHistory[this.feedbackHistory.length - 1] : null,
      trend
    };
  }

  /**
   * Reset the optimizer
   */
  public reset(): void {
    this.stopOptimizationLoop();
    this.triggers.clear();
    this.rollbackProcedures.clear();
    this.learnings = [];
    this.feedbackHistory = [];
    this.events = [];
    this.reports = [];
    this.lastOptimization = null;

    this.initializeDefaultTriggers();

    this.addAuditEntry({
      eventType: 'adjustment',
      description: 'Calibration optimizer reset',
      reason: 'Manual reset'
    });
  }
}

/**
 * Factory function to create calibration optimizer
 */
export function createCalibrationOptimizer(
  manthra: ManthraCalibrationSystem,
  yasna: YasnaCalibrationSystem,
  mithra: MithraCalibrationSystem,
  coherence: CrossDimensionalCoherenceSystem,
  config?: Partial<CalibrationOptimizationConfig>
): CalibrationOptimizer {
  return new CalibrationOptimizer(manthra, yasna, mithra, coherence, config);
}
