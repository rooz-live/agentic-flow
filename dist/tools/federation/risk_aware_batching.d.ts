import type { WSJFResult } from './wsjf_calculator.js';
/**
 * Risk-Aware Batching Policies System
 *
 * This system implements intelligent batching policies that consider multiple risk factors:
 * - Risk-based batch sizing
 * - Priority-based batch scheduling
 * - Dependency-aware batching
 * - Resource-constrained batching
 * - Approval workflow integration
 */
export interface BatchPolicy {
    /** Unique policy identifier */
    id: string;
    /** Policy name */
    name: string;
    /** Policy description */
    description: string;
    /** Risk threshold for this policy */
    riskThreshold: number;
    /** Maximum batch size under this policy */
    maxBatchSize: number;
    /** Approval requirements */
    approvalRequired: boolean;
    /** Applicable workload types */
    applicableWorkloads: string[];
    /** Priority levels this policy handles */
    priorityLevels: string[];
}
export interface BatchExecutionPlan {
    /** Plan identifier */
    id: string;
    /** Batch items included */
    items: WSJFResult[];
    /** Overall risk level */
    riskLevel: number;
    /** Execution window */
    executionWindow: {
        start: string;
        end: string;
    };
    /** Required approvals */
    requiredApprovals: string[];
    /** Resource requirements */
    resourceRequirements: {
        cpu: number;
        memory: number;
        storage: number;
        network: number;
    };
    /** Estimated duration */
    estimatedDuration: number;
    /** Rollback strategy */
    rollbackStrategy: string;
}
export interface BatchExecutionResult {
    /** Plan ID */
    planId: string;
    /** Execution status */
    status: 'pending' | 'executing' | 'completed' | 'failed' | 'rolled_back';
    /** Items executed */
    itemsExecuted: number;
    /** Items successful */
    itemsSuccessful: number;
    /** Items failed */
    itemsFailed: number;
    /** Execution duration */
    actualDuration: number;
    /** Errors encountered */
    errors: string[];
    /** Rollback information */
    rollbackInfo?: {
        reason: string;
        itemsRolledBack: string[];
        timestamp: string;
    };
}
export declare class RiskAwareBatchingSystem {
    private goalieDir;
    private policies;
    private executionHistory;
    constructor(goalieDir: string);
    /**
     * Load default batching policies
     */
    private loadDefaultPolicies;
    /**
     * Load custom policies from configuration
     */
    private loadCustomPolicies;
    /**
     * Determine appropriate policy for items
     */
    private determinePolicy;
    /**
     * Create intelligent batching plan
     */
    createBatchingPlan(items: WSJFResult[], policyId?: string, constraints?: {
        maxDuration?: number;
        maxItems?: number;
        resourceLimits?: {
            cpu?: number;
            memory?: number;
            storage?: number;
            network?: number;
        };
    }): Promise<BatchExecutionPlan>;
    /**
     * Calculate resource requirements for batch
     */
    private calculateResourceRequirements;
    /**
     * Calculate execution window
     */
    private calculateExecutionWindow;
    /**
     * Determine approval requirements
     */
    private determineApprovals;
    /**
     * Determine rollback strategy
     */
    private determineRollbackStrategy;
    /**
     * Save batch plan to file
     */
    private saveBatchPlan;
    /**
     * Execute batch plan
     */
    executeBatchPlan(planId: string): Promise<BatchExecutionResult>;
    /**
     * Get batch execution history
     */
    getBatchHistory(limit?: number): Promise<BatchExecutionResult[]>;
    /**
     * Get available policies
     */
    getAvailablePolicies(): BatchPolicy[];
    /**
     * Add custom policy
     */
    addCustomPolicy(policy: BatchPolicy): void;
    /**
     * Save custom policies to file
     */
    private saveCustomPolicies;
    /**
     * Analyze batch performance
     */
    analyzeBatchPerformance(days?: number): Promise<{
        totalBatches: number;
        successRate: number;
        avgDuration: number;
        riskDistribution: Record<string, number>;
    }>;
    /**
     * Generate batch optimization recommendations
     */
    generateOptimizationRecommendations(): Promise<string[]>;
}
export { RiskAwareBatchingSystem, type BatchPolicy, type BatchExecutionPlan, type BatchExecutionResult };
//# sourceMappingURL=risk_aware_batching.d.ts.map