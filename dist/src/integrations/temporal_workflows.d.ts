/**
 * Temporal Workflow Definitions
 * @module integrations/temporal_workflows
 *
 * Workflow orchestration for affiliate system automation.
 * Note: This module provides workflow definitions that can work with Temporal.io
 * or as standalone workflow engine when Temporal is not available.
 */
import { EventEmitter } from 'events';
export interface TemporalConfig {
    serverAddress?: string;
    namespace?: string;
    taskQueue?: string;
    enableLocal?: boolean;
}
export type WorkflowStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export interface WorkflowExecution {
    workflowId: string;
    workflowType: string;
    status: WorkflowStatus;
    input: Record<string, unknown>;
    output?: Record<string, unknown>;
    error?: string;
    startedAt: Date;
    completedAt?: Date;
    retryCount: number;
}
export interface CommissionPayoutInput {
    affiliateId: string;
    amount: number;
    tier: 'standard' | 'premium' | 'enterprise';
    scheduleType: 'immediate' | 'weekly' | 'monthly';
}
export interface TierUpgradeInput {
    affiliateId: string;
    currentTier: 'standard' | 'premium' | 'enterprise';
    metrics: {
        revenue: number;
        referrals: number;
        activityScore: number;
    };
}
export interface RiskAssessmentInput {
    affiliateId: string;
    riskFactors: string[];
    severity: 'low' | 'medium' | 'high' | 'critical';
}
export interface AffinityRecalcInput {
    affiliateIds: string[];
    batchSize: number;
    forceRecalc: boolean;
}
export interface ActivityResult<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    duration: number;
    retryable: boolean;
}
export declare class LocalWorkflowEngine extends EventEmitter {
    private config;
    private executions;
    private activities;
    constructor(config?: Partial<TemporalConfig>);
    registerActivity(name: string, handler: Function): void;
    executeWorkflow<T>(workflowType: string, workflowId: string, input: Record<string, unknown>): Promise<WorkflowExecution>;
    private runWorkflow;
    private runCommissionPayoutWorkflow;
    private runTierUpgradeWorkflow;
    private runRiskAssessmentWorkflow;
    private runAffinityRecalcWorkflow;
    private runActivity;
    getExecution(workflowId: string): WorkflowExecution | undefined;
    listExecutions(status?: WorkflowStatus): WorkflowExecution[];
    cancelWorkflow(workflowId: string): Promise<boolean>;
    scheduleWorkflow(workflowType: string, input: Record<string, unknown>, schedule: {
        cron?: string;
        intervalMs?: number;
    }): string;
}
export declare function createLocalWorkflowEngine(config?: Partial<TemporalConfig>): LocalWorkflowEngine;
export declare function getTemporalConfigFromEnv(): Partial<TemporalConfig>;
//# sourceMappingURL=temporal_workflows.d.ts.map