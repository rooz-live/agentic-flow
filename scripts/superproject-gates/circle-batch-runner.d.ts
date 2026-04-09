/**
 * Circle Batch Runner
 *
 * Implements WSJF-based dynamic circle role batching for adaptive orchestration.
 * Selects and coordinates circle roles based on business value, time criticality,
 * risk reduction, and job size.
 */
import { EventEmitter } from 'events';
export interface WSJFFactors {
    businessValue: number;
    timeCriticality: number;
    riskReduction: number;
    jobSize: number;
}
export interface WSJFScore {
    factors: WSJFFactors;
    costOfDelay: number;
    score: number;
    normalized: number;
}
export interface CircleRole {
    id: string;
    name: string;
    description: string;
    responsibilities: string[];
    defaultPriority: number;
    wsjfWeights: {
        businessValue: number;
        timeCriticality: number;
        riskReduction: number;
        jobSize: number;
    };
}
export interface BatchTask {
    id: string;
    name: string;
    description: string;
    assignedCircle?: string;
    wsjfScore?: WSJFScore;
    status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'failed';
    createdAt: Date;
    completedAt?: Date;
    metadata: Record<string, unknown>;
}
export interface CircleBatch {
    id: string;
    circles: string[];
    tasks: BatchTask[];
    startedAt: Date;
    completedAt?: Date;
    status: 'pending' | 'running' | 'completed' | 'failed';
    metrics: {
        totalTasks: number;
        completedTasks: number;
        failedTasks: number;
        averageWsjfScore: number;
        throughput: number;
    };
}
export interface CircleBatchingConfig {
    version: string;
    enabled: boolean;
    circles: Record<string, CircleRole>;
    batching: {
        mode: 'dynamic' | 'fixed' | 'hybrid';
        maxConcurrentCircles: number;
        minBatchSize: number;
        maxBatchSize: number;
        rebalanceIntervalMs: number;
        rules: Array<{
            name: string;
            condition: string;
            action: string;
            weight: number;
        }>;
    };
    wsjf: {
        scales: {
            businessValue: [number, number];
            timeCriticality: [number, number];
            riskReduction: [number, number];
            jobSize: [number, number];
        };
        normalize: boolean;
        costOfDelay: {
            businessValueMultiplier: number;
            timeCriticalityMultiplier: number;
            riskReductionMultiplier: number;
        };
    };
    metrics: {
        trackCirclePerformance: boolean;
        trackBatchEfficiency: boolean;
        trackWsjfAccuracy: boolean;
        thresholds: {
            minCircleUtilization: number;
            maxBatchWaitTimeMs: number;
            targetThroughputPerMinute: number;
        };
    };
    integration: {
        orchestrationFramework: boolean;
        healthChecks: boolean;
        telemetry: boolean;
        hooks: Record<string, string>;
    };
    logging: {
        level: 'debug' | 'info' | 'warn' | 'error';
        logWsjfCalculations: boolean;
        logBatchDecisions: boolean;
        logCircleAssignments: boolean;
    };
}
export declare class CircleBatchRunner extends EventEmitter {
    private config;
    private configPath;
    private activeBatches;
    private taskQueue;
    private circlePerformance;
    private rebalanceTimer?;
    constructor(configPath?: string);
    private loadConfig;
    private initializeCircles;
    calculateWSJF(factors: WSJFFactors, circleId?: string): WSJFScore;
    private normalizeScore;
    assignCircle(task: BatchTask): string;
    private applyBatchingRules;
    private evaluateRuleCondition;
    createBatch(tasks: BatchTask[]): CircleBatch;
    completeBatch(batchId: string): void;
    queueTask(task: BatchTask): void;
    private processTasks;
    private startRebalancing;
    private rebalanceBatches;
    stopRebalancing(): void;
    getMetrics(): {
        circles: Record<string, {
            averageScore: number;
            taskCount: number;
        }>;
        batches: {
            active: number;
            completed: number;
        };
        queue: {
            size: number;
        };
        performance: {
            averageThroughput: number;
        };
    };
    private log;
    shutdown(): void;
}
export declare function createCircleBatchRunner(configPath?: string): CircleBatchRunner;
export declare function createBatchTask(name: string, description: string, metadata?: Record<string, unknown>): BatchTask;
//# sourceMappingURL=circle-batch-runner.d.ts.map