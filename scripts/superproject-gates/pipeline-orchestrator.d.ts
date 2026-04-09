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
import { AlignmentPipelineConfig, ManthraIntention, BuildManifest, IntegrationCeremony, PromotionDecision, PipelineEvent, PipelineStatus, PipelineMetrics, PipelineRunResult } from './types.js';
import { ManthraStage } from './manthra-stage.js';
import { YasnaStage } from './yasna-stage.js';
import { MithraStage } from './mithra-stage.js';
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
export declare class AlignmentPipelineOrchestrator extends EventEmitter {
    private manthraStage;
    private yasnaStage;
    private mithraStage;
    private config;
    private auditLog;
    private pipelineRuns;
    private runMetrics;
    /**
     * Create a new AlignmentPipelineOrchestrator
     * @param config - Pipeline configuration
     */
    constructor(config?: Partial<AlignmentPipelineConfig>);
    /**
     * Set up event forwarding from stages
     */
    private setupEventForwarding;
    /**
     * Run the complete pipeline from intention to promotion
     * @param intention - Intention details (without id and timestamp)
     * @returns Complete pipeline run result
     */
    runPipeline(intention: Omit<ManthraIntention, 'id' | 'timestamp'>): Promise<PipelineRunResult>;
    /**
     * Update metrics after a pipeline run
     */
    private updateMetrics;
    /**
     * Transition from Manthra to Yasna stage
     * @param buildManifest - Build manifest from Manthra stage
     * @returns Integration ceremony
     */
    transitionToYasna(buildManifest: BuildManifest): Promise<IntegrationCeremony>;
    /**
     * Transition from Yasna to Mithra stage
     * @param ceremony - Completed integration ceremony
     * @returns Promotion decision
     */
    transitionToMithra(ceremony: IntegrationCeremony): Promise<PromotionDecision>;
    /**
     * Check if break glass is required for a decision
     * @param decision - Promotion decision
     * @returns Whether break glass is required
     */
    isBreakGlassRequired(decision: PromotionDecision): boolean;
    /**
     * Handle break glass override
     * @param decision - Promotion decision to override
     * @param reason - Reason for break glass
     * @param approvers - List of approvers
     */
    handleBreakGlass(decision: PromotionDecision, reason: string, approvers: string[]): Promise<void>;
    /**
     * Log a pipeline event
     * @param event - Event to log
     */
    logPipelineEvent(event: PipelineEvent): void;
    /**
     * Get the audit log
     * @returns Array of pipeline events
     */
    getAuditLog(): PipelineEvent[];
    /**
     * Export audit log in specified format
     * @param format - Export format
     * @returns Formatted audit log
     */
    exportAuditLog(format: 'json' | 'csv'): string;
    /**
     * Get pipeline status for an intention
     * @param intentionId - Intention identifier
     * @returns Pipeline status
     */
    getPipelineStatus(intentionId: string): PipelineStatus;
    /**
     * Get pipeline metrics
     * @returns Pipeline metrics
     */
    getPipelineMetrics(): PipelineMetrics;
    /**
     * Get the Manthra stage for direct access
     */
    getManthraStage(): ManthraStage;
    /**
     * Get the Yasna stage for direct access
     */
    getYasnaStage(): YasnaStage;
    /**
     * Get the Mithra stage for direct access
     */
    getMithraStage(): MithraStage;
    /**
     * Get current configuration
     */
    getConfig(): AlignmentPipelineConfig;
    /**
     * Update configuration
     */
    updateConfig(config: Partial<AlignmentPipelineConfig>): void;
    /**
     * Get a pipeline run result
     */
    getPipelineRun(intentionId: string): PipelineRunResult | undefined;
    /**
     * Get all pipeline runs
     */
    getAllPipelineRuns(): PipelineRunResult[];
}
/**
 * Factory function to create an AlignmentPipelineOrchestrator
 * @param config - Pipeline configuration
 * @returns Configured orchestrator instance
 */
export declare function createAlignmentPipelineOrchestrator(config?: Partial<AlignmentPipelineConfig>): AlignmentPipelineOrchestrator;
//# sourceMappingURL=pipeline-orchestrator.d.ts.map