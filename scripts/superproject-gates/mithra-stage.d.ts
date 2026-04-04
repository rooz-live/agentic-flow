/**
 * Mithra Stage - Judgment and Promotion Decisions
 *
 * Phase 4 Implementation - CI/CD Pipeline Mithra Stage
 *
 * The Mithra stage represents the "judgment" phase of the pipeline where:
 * - Promotion decisions are made based on alignment criteria
 * - Drift detection validates alignment preservation
 * - Approval workflows manage production deployments
 *
 * Integration: Uses GoaliePDAObserver for PDA cycle tracking
 *
 * @module alignment-cicd/mithra-stage
 */
import { EventEmitter } from 'events';
import { PromotionDecision, PromotionCriterion, IntegrationCeremony, BuildManifest, DriftDetection, AlignmentPipelineConfig } from './types.js';
import { GoaliePDAObserver } from '../ruvector/goalie-pda-observer.js';
/**
 * MithraStage handles promotion decisions and drift detection
 *
 * Key responsibilities:
 * - Evaluate promotion criteria for ceremonies
 * - Detect value and behavior drift
 * - Manage approval workflows
 * - Monitor post-deployment drift
 * - Handle break glass emergency overrides
 */
export declare class MithraStage extends EventEmitter {
    private config;
    private pdaObserver;
    private promotionHistory;
    private driftBaselines;
    private pendingApprovals;
    private lastPromotionTime;
    /**
     * Create a new MithraStage instance
     * @param config - Mithra stage configuration
     */
    constructor(config: AlignmentPipelineConfig['mithraConfig']);
    /**
     * Evaluate a ceremony for promotion
     * @param ceremony - Integration ceremony to evaluate
     * @param targetEnv - Target environment for promotion
     * @returns Promotion decision
     */
    evaluatePromotion(ceremony: IntegrationCeremony, targetEnv: 'staging' | 'production' | 'canary'): PromotionDecision;
    /**
     * Determine the final decision based on criteria
     */
    private determineDecision;
    /**
     * Generate justification for the decision
     */
    private generateJustification;
    /**
     * Evaluate all promotion criteria for a ceremony
     * @param ceremony - Integration ceremony
     * @returns Array of promotion criteria
     */
    evaluateCriteria(ceremony: IntegrationCeremony): PromotionCriterion[];
    /**
     * Check alignment score criterion
     * @param ceremony - Integration ceremony
     * @returns Promotion criterion
     */
    checkAlignmentScore(ceremony: IntegrationCeremony): PromotionCriterion;
    /**
     * Check test coverage criterion
     * @param ceremony - Integration ceremony
     * @returns Promotion criterion
     */
    checkTestCoverage(ceremony: IntegrationCeremony): PromotionCriterion;
    /**
     * Check drift threshold criterion
     * @param ceremony - Integration ceremony
     * @returns Promotion criterion
     */
    checkDriftThreshold(ceremony: IntegrationCeremony): PromotionCriterion;
    /**
     * Check ceremony status criterion
     */
    private checkCeremonyStatus;
    /**
     * Check all stages passed criterion
     */
    private checkAllStagesPassed;
    /**
     * Detect drift between current and baseline metrics
     * @param current - Current metrics
     * @param baseline - Baseline metrics
     * @returns Drift detection result
     */
    detectDrift(current: any, baseline: any): DriftDetection;
    /**
     * Calculate drift severity based on delta
     */
    private calculateDriftSeverity;
    /**
     * Get recommendation based on drift
     */
    private getDriftRecommendation;
    /**
     * Record a baseline for an environment
     * @param environment - Environment name
     * @param metrics - Baseline metrics
     */
    recordBaseline(environment: string, metrics: any): void;
    /**
     * Get baseline for an environment
     * @param environment - Environment name
     * @returns Baseline data or undefined
     */
    getBaseline(environment: string): any;
    /**
     * Detect value drift for a build manifest
     * @param buildManifest - Build manifest to check
     * @returns Drift detection result or null
     */
    detectValueDrift(buildManifest: BuildManifest): DriftDetection | null;
    /**
     * Request manual approval for a decision
     * @param decision - Promotion decision requiring approval
     */
    requestManualApproval(decision: PromotionDecision): void;
    /**
     * Approve a pending promotion
     * @param decisionId - Decision identifier
     * @param approverId - Approver identifier
     */
    approvePromotion(decisionId: string, approverId: string): void;
    /**
     * Reject a pending promotion
     * @param decisionId - Decision identifier
     * @param approverId - Approver identifier
     * @param reason - Reason for rejection
     */
    rejectPromotion(decisionId: string, approverId: string, reason: string): void;
    /**
     * Monitor for drift after deployment
     * @param decision - Promotion decision
     * @param durationMs - Duration to monitor
     * @returns Array of drift detections
     */
    monitorPostDeployment(decision: PromotionDecision, durationMs: number): Promise<DriftDetection[]>;
    /**
     * Sleep utility
     */
    private sleep;
    /**
     * Initiate rollback for a promotion
     * @param decision - Promotion decision to rollback
     * @param reason - Reason for rollback
     */
    initiateRollback(decision: PromotionDecision, reason: string): void;
    /**
     * Override promotion decision using break glass procedure
     * @param decisionId - Decision identifier
     * @param reason - Reason for override
     * @param approvers - List of approvers authorizing the override
     */
    breakGlassOverride(decisionId: string, reason: string, approvers: string[]): void;
    /**
     * Check if cooldown period has passed
     */
    private checkCooldownPeriod;
    /**
     * Get time since last promotion
     */
    private getTimeSinceLastPromotion;
    /**
     * Generate a unique decision ID
     */
    private generateDecisionId;
    /**
     * Emit a pipeline event
     */
    private emitEvent;
    /**
     * Get promotion history
     */
    getPromotionHistory(): PromotionDecision[];
    /**
     * Get pending approvals
     */
    getPendingApprovals(): PromotionDecision[];
    /**
     * Get a decision by ID
     */
    getDecision(id: string): PromotionDecision | undefined;
    /**
     * Get the PDA observer for direct access
     */
    getPDAObserver(): GoaliePDAObserver;
    /**
     * Update configuration
     */
    updateConfig(config: Partial<AlignmentPipelineConfig['mithraConfig']>): void;
    /**
     * Get current configuration
     */
    getConfig(): AlignmentPipelineConfig['mithraConfig'];
}
/**
 * Factory function to create a MithraStage
 * @param config - Mithra stage configuration
 * @returns Configured MithraStage instance
 */
export declare function createMithraStage(config?: Partial<AlignmentPipelineConfig['mithraConfig']>): MithraStage;
//# sourceMappingURL=mithra-stage.d.ts.map