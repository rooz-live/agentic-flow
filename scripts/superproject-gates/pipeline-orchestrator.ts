/**
 * Alignment Pipeline Orchestrator
 * 
 * Phase 4 Implementation - Full CI/CD Pipeline Orchestration
 * 
 * The orchestrator coordinates all three stages of the pipeline:
 * - Manthra Stage: Intention declaration and build manifests
 * - Yasna Stage: Integration ceremonies with alignment validation
 * - Mithra Stage: Promotion decisions with drift detection
 * 
 * @module alignment-cicd/pipeline-orchestrator
 */

import { EventEmitter } from 'events';

import {
  AlignmentPipelineConfig,
  DEFAULT_PIPELINE_CONFIG,
  ManthraIntention,
  BuildManifest,
  IntegrationCeremony,
  PromotionDecision,
  PipelineEvent,
  PipelineStatus,
  PipelineMetrics,
  PipelineRunResult
} from './types.js';

import { ManthraStage, createManthraStage } from './manthra-stage.js';
import { YasnaStage, createYasnaStage } from './yasna-stage.js';
import { MithraStage, createMithraStage } from './mithra-stage.js';

/**
 * AlignmentPipelineOrchestrator coordinates the full Manthra/Yasna/Mithra pipeline
 * 
 * Key responsibilities:
 * - Execute the complete pipeline from intention to promotion
 * - Manage stage transitions
 * - Handle break glass emergency overrides
 * - Maintain audit logs
 * - Track pipeline metrics
 */
export class AlignmentPipelineOrchestrator extends EventEmitter {
  private manthraStage: ManthraStage;
  private yasnaStage: YasnaStage;
  private mithraStage: MithraStage;
  private config: AlignmentPipelineConfig;
  private auditLog: PipelineEvent[];
  private pipelineRuns: Map<string, PipelineRunResult>;
  private runMetrics: {
    totalRuns: number;
    successfulRuns: number;
    failedRuns: number;
    totalDurationMs: number;
    totalAlignmentScore: number;
    driftDetections: number;
    breakGlassCount: number;
    rollbackCount: number;
  };

  /**
   * Create a new AlignmentPipelineOrchestrator
   * @param config - Pipeline configuration
   */
  constructor(config: Partial<AlignmentPipelineConfig> = {}) {
    super();
    this.config = { ...DEFAULT_PIPELINE_CONFIG, ...config };
    
    // Initialize stages
    this.manthraStage = createManthraStage(this.config.manthraConfig);
    this.yasnaStage = createYasnaStage(this.config.yasnaConfig);
    this.mithraStage = createMithraStage(this.config.mithraConfig);

    // Initialize state
    this.auditLog = [];
    this.pipelineRuns = new Map();
    this.runMetrics = {
      totalRuns: 0,
      successfulRuns: 0,
      failedRuns: 0,
      totalDurationMs: 0,
      totalAlignmentScore: 0,
      driftDetections: 0,
      breakGlassCount: 0,
      rollbackCount: 0
    };

    // Set up event forwarding
    this.setupEventForwarding();
  }

  /**
   * Set up event forwarding from stages
   */
  private setupEventForwarding(): void {
    // Forward events from all stages
    const stages = [this.manthraStage, this.yasnaStage, this.mithraStage];
    
    for (const stage of stages) {
      stage.on('pipelineEvent', (event: PipelineEvent) => {
        this.logPipelineEvent(event);
        this.emit('pipelineEvent', event);
      });
    }

    // Track specific events
    this.mithraStage.on('breakGlassOverride', () => {
      this.runMetrics.breakGlassCount++;
    });

    this.mithraStage.on('rollbackInitiated', () => {
      this.runMetrics.rollbackCount++;
    });

    this.mithraStage.on('driftDetected', () => {
      this.runMetrics.driftDetections++;
    });
  }

  // ============================================================================
  // Full Pipeline Execution
  // ============================================================================

  /**
   * Run the complete pipeline from intention to promotion
   * @param intention - Intention details (without id and timestamp)
   * @returns Complete pipeline run result
   */
  async runPipeline(intention: Omit<ManthraIntention, 'id' | 'timestamp'>): Promise<PipelineRunResult> {
    const startTime = Date.now();
    const events: PipelineEvent[] = [];

    // Track events for this run
    const eventHandler = (event: PipelineEvent) => {
      events.push(event);
    };
    this.on('pipelineEvent', eventHandler);

    try {
      // Stage 1: Manthra - Intention Declaration and Build
      this.emit('stageStarted', 'manthra');
      const fullIntention = this.manthraStage.declareIntention(intention);
      
      // Validate intention
      const intentionChecks = this.manthraStage.validateIntention(fullIntention);
      const intentionValid = intentionChecks.every(c => c.passed);
      
      if (!intentionValid && this.config.manthraConfig.requireIntention) {
        throw new Error('Intention validation failed: ' + 
          intentionChecks.filter(c => !c.passed).map(c => c.details).join('; '));
      }

      // Generate build manifest
      const buildManifest = await this.manthraStage.generateBuildManifest(fullIntention);
      this.emit('stageCompleted', 'manthra', { intentionId: fullIntention.id });

      // Stage 2: Yasna - Integration Ceremony
      this.emit('stageStarted', 'yasna');
      const ceremony = await this.transitionToYasna(buildManifest);
      this.emit('stageCompleted', 'yasna', { ceremonyId: ceremony.id, status: ceremony.status });

      // Check if ceremony passed
      if (ceremony.status !== 'passed' && !this.config.yasnaConfig.allowPartialPass) {
        throw new Error(`Ceremony failed with status: ${ceremony.status}`);
      }

      // Stage 3: Mithra - Promotion Decision
      this.emit('stageStarted', 'mithra');
      const decision = await this.transitionToMithra(ceremony);
      this.emit('stageCompleted', 'mithra', { decisionId: decision.id, decision: decision.decision });

      // Calculate result
      const totalDurationMs = Date.now() - startTime;
      const success = decision.decision === 'approved';

      const result: PipelineRunResult = {
        intention: fullIntention,
        buildManifest,
        ceremony,
        decision,
        success,
        totalDurationMs,
        events
      };

      // Store run
      this.pipelineRuns.set(fullIntention.id, result);

      // Update metrics
      this.updateMetrics(result);

      this.emit('pipelineCompleted', result);

      return result;

    } catch (error) {
      // Handle pipeline failure
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.logPipelineEvent({
        type: 'rollback_initiated',
        timestamp: new Date(),
        details: { error: errorMessage }
      });

      throw error;

    } finally {
      // Clean up event handler
      this.off('pipelineEvent', eventHandler);
    }
  }

  /**
   * Update metrics after a pipeline run
   */
  private updateMetrics(result: PipelineRunResult): void {
    this.runMetrics.totalRuns++;
    this.runMetrics.totalDurationMs += result.totalDurationMs;

    if (result.success) {
      this.runMetrics.successfulRuns++;
    } else {
      this.runMetrics.failedRuns++;
    }

    // Calculate alignment score from ceremony
    const allChecks = result.ceremony.stages.flatMap(s => s.alignmentChecks);
    const checksWithScores = allChecks.filter(c => c.score !== undefined);
    if (checksWithScores.length > 0) {
      const avgScore = checksWithScores.reduce((sum, c) => sum + (c.score || 0), 0) / checksWithScores.length;
      this.runMetrics.totalAlignmentScore += avgScore;
    }
  }

  // ============================================================================
  // Stage Transitions
  // ============================================================================

  /**
   * Transition from Manthra to Yasna stage
   * @param buildManifest - Build manifest from Manthra stage
   * @returns Integration ceremony
   */
  async transitionToYasna(buildManifest: BuildManifest): Promise<IntegrationCeremony> {
    // Start ceremony
    const ceremony = this.yasnaStage.startCeremony(buildManifest);

    // Execute all stages in sequence
    for (const stage of ceremony.stages) {
      this.yasnaStage.advanceStage(ceremony.id);
      await this.yasnaStage.executeStage(ceremony, stage.name);

      // Check for failure and potential rollback
      if (stage.status === 'failed') {
        if (this.config.yasnaConfig.rollbackOnFailure) {
          this.yasnaStage.rollbackCeremony(ceremony.id, `Stage ${stage.name} failed`);
          break;
        }
      }
    }

    // Complete ceremony
    return this.yasnaStage.completeCeremony(ceremony.id);
  }

  /**
   * Transition from Yasna to Mithra stage
   * @param ceremony - Completed integration ceremony
   * @returns Promotion decision
   */
  async transitionToMithra(ceremony: IntegrationCeremony): Promise<PromotionDecision> {
    // Determine target environment based on ceremony status
    const targetEnv = ceremony.status === 'passed' ? 'staging' : 'staging';

    // Evaluate promotion
    const decision = this.mithraStage.evaluatePromotion(ceremony, targetEnv);

    return decision;
  }

  // ============================================================================
  // Break Glass Handling
  // ============================================================================

  /**
   * Check if break glass is required for a decision
   * @param decision - Promotion decision
   * @returns Whether break glass is required
   */
  isBreakGlassRequired(decision: PromotionDecision): boolean {
    // Break glass required if:
    // 1. Decision was rejected but deployment is urgent
    // 2. Criteria not met but override needed
    return decision.decision === 'rejected' && this.config.breakGlass.enabled;
  }

  /**
   * Handle break glass override
   * @param decision - Promotion decision to override
   * @param reason - Reason for break glass
   * @param approvers - List of approvers
   */
  async handleBreakGlass(decision: PromotionDecision, reason: string, approvers: string[]): Promise<void> {
    if (!this.config.breakGlass.enabled) {
      throw new Error('Break glass is not enabled');
    }

    if (approvers.length < this.config.breakGlass.requiredApprovers) {
      throw new Error(`Break glass requires ${this.config.breakGlass.requiredApprovers} approvers, got ${approvers.length}`);
    }

    // Execute break glass
    this.mithraStage.breakGlassOverride(decision.id, reason, approvers);

    // Log to audit
    this.logPipelineEvent({
      type: 'break_glass_invoked',
      timestamp: new Date(),
      decisionId: decision.id,
      details: {
        reason,
        approvers,
        originalDecision: decision.decision
      },
      actor: approvers[0]
    });
  }

  // ============================================================================
  // Audit Logging
  // ============================================================================

  /**
   * Log a pipeline event
   * @param event - Event to log
   */
  logPipelineEvent(event: PipelineEvent): void {
    this.auditLog.push(event);
  }

  /**
   * Get the audit log
   * @returns Array of pipeline events
   */
  getAuditLog(): PipelineEvent[] {
    return [...this.auditLog];
  }

  /**
   * Export audit log in specified format
   * @param format - Export format
   * @returns Formatted audit log
   */
  exportAuditLog(format: 'json' | 'csv'): string {
    if (format === 'json') {
      return JSON.stringify(this.auditLog, null, 2);
    }

    // CSV format
    const headers = ['timestamp', 'type', 'intentionId', 'ceremonyId', 'decisionId', 'actor', 'details'];
    const rows = this.auditLog.map(event => [
      event.timestamp.toISOString(),
      event.type,
      event.intentionId || '',
      event.ceremonyId || '',
      event.decisionId || '',
      event.actor || '',
      JSON.stringify(event.details)
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  // ============================================================================
  // Pipeline Status
  // ============================================================================

  /**
   * Get pipeline status for an intention
   * @param intentionId - Intention identifier
   * @returns Pipeline status
   */
  getPipelineStatus(intentionId: string): PipelineStatus {
    const run = this.pipelineRuns.get(intentionId);
    
    if (!run) {
      // Check if in progress
      const intention = this.manthraStage.getIntention(intentionId);
      if (!intention) {
        return {
          stage: 'failed',
          progress: 0,
          currentStep: 'Unknown',
          error: 'Intention not found'
        };
      }

      const buildManifest = this.manthraStage.getBuildManifest(intentionId);
      if (!buildManifest) {
        return {
          stage: 'manthra',
          progress: 25,
          currentStep: 'Building...'
        };
      }

      return {
        stage: 'yasna',
        progress: 50,
        currentStep: 'Integration ceremony in progress'
      };
    }

    // Completed run
    if (run.success) {
      return {
        stage: 'complete',
        progress: 100,
        currentStep: 'Pipeline completed successfully'
      };
    }

    return {
      stage: 'failed',
      progress: 100,
      currentStep: 'Pipeline failed',
      error: run.decision.justification
    };
  }

  // ============================================================================
  // Metrics
  // ============================================================================

  /**
   * Get pipeline metrics
   * @returns Pipeline metrics
   */
  getPipelineMetrics(): PipelineMetrics {
    const { totalRuns, successfulRuns, totalDurationMs, totalAlignmentScore, 
            driftDetections, breakGlassCount, rollbackCount } = this.runMetrics;

    return {
      totalRuns,
      successRate: totalRuns > 0 ? successfulRuns / totalRuns : 0,
      avgDurationMs: totalRuns > 0 ? totalDurationMs / totalRuns : 0,
      alignmentScoreAvg: totalRuns > 0 ? totalAlignmentScore / totalRuns : 0,
      driftDetectionCount: driftDetections,
      breakGlassCount,
      rollbackCount
    };
  }

  // ============================================================================
  // Configuration and Access
  // ============================================================================

  /**
   * Get the Manthra stage for direct access
   */
  getManthraStage(): ManthraStage {
    return this.manthraStage;
  }

  /**
   * Get the Yasna stage for direct access
   */
  getYasnaStage(): YasnaStage {
    return this.yasnaStage;
  }

  /**
   * Get the Mithra stage for direct access
   */
  getMithraStage(): MithraStage {
    return this.mithraStage;
  }

  /**
   * Get current configuration
   */
  getConfig(): AlignmentPipelineConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<AlignmentPipelineConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Update stage configs
    if (config.manthraConfig) {
      this.manthraStage.updateConfig(config.manthraConfig);
    }
    if (config.yasnaConfig) {
      this.yasnaStage.updateConfig(config.yasnaConfig);
    }
    if (config.mithraConfig) {
      this.mithraStage.updateConfig(config.mithraConfig);
    }
  }

  /**
   * Get a pipeline run result
   */
  getPipelineRun(intentionId: string): PipelineRunResult | undefined {
    return this.pipelineRuns.get(intentionId);
  }

  /**
   * Get all pipeline runs
   */
  getAllPipelineRuns(): PipelineRunResult[] {
    return Array.from(this.pipelineRuns.values());
  }
}

/**
 * Factory function to create an AlignmentPipelineOrchestrator
 * @param config - Pipeline configuration
 * @returns Configured orchestrator instance
 */
export function createAlignmentPipelineOrchestrator(
  config: Partial<AlignmentPipelineConfig> = {}
): AlignmentPipelineOrchestrator {
  return new AlignmentPipelineOrchestrator(config);
}
