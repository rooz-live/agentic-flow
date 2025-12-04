/**
 * ML Training Integration
 * @module integrations/ml_training
 *
 * Integrates machine learning training workflows with:
 * - AgentDB learning infrastructure (ReflexionMemory, CausalRecall)
 * - DT (Decision Transformer) dataset infrastructure
 * - Temporal workflow engine for training orchestration
 * - Governance metrics logging (.goalie/)
 * - ruvector/agentic-synth synthetic data generation
 *
 * Leverages existing learning hooks (Performance Predictor, Edit Optimizer, Error Predictor)
 */
import { EventEmitter } from 'events';
import { CausalRecall, ReflexionMemory } from './agentdb_learning';
import { LocalWorkflowEngine, WorkflowExecution } from './temporal_workflows';
export interface MLTrainingConfig {
    enableGovernanceLogging?: boolean;
    metricsLogPath?: string;
    dtDatasetPath?: string;
    trajectoriesPath?: string;
    patternMetricsPath?: string;
    batchSize?: number;
    learningRate?: number;
    epochs?: number;
    validationSplit?: number;
    earlyStoppingPatience?: number;
    checkpointPath?: string;
    enableSyntheticData?: boolean;
    syntheticDataCount?: number;
    syntheticDataProvider?: 'echo' | 'openai' | 'anthropic' | 'gemini';
}
export declare const AFFILIATE_SYNTH_SCHEMA: {
    affiliateId: {
        type: string;
        format: string;
    };
    tier: {
        type: string;
        values: string[];
    };
    commissionRate: {
        type: string;
        min: number;
        max: number;
    };
    totalEarnings: {
        type: string;
        min: number;
        max: number;
    };
    conversionRate: {
        type: string;
        min: number;
        max: number;
    };
    riskScore: {
        type: string;
        min: number;
        max: number;
    };
    behaviorCluster: {
        type: string;
        values: string[];
    };
    lastActivityDays: {
        type: string;
        min: number;
        max: number;
    };
    referralCount: {
        type: string;
        min: number;
        max: number;
    };
    rewardStatus: {
        type: string;
        values: string[];
    };
};
export type TrainingStatus = 'pending' | 'preparing' | 'training' | 'validating' | 'completed' | 'failed';
export interface TrainingJob {
    jobId: string;
    modelType: 'affinity_predictor' | 'risk_assessor' | 'tier_optimizer' | 'behavior_classifier';
    status: TrainingStatus;
    config: MLTrainingConfig;
    metrics: TrainingMetrics;
    createdAt: Date;
    startedAt?: Date;
    completedAt?: Date;
    error?: string;
}
export interface TrainingMetrics {
    epoch: number;
    trainLoss: number;
    valLoss: number;
    trainAccuracy: number;
    valAccuracy: number;
    learningRate: number;
    batchesProcessed: number;
    samplesProcessed: number;
    elapsedMs: number;
    bestValLoss: number;
    earlyStopCounter: number;
}
export interface DTDatapoint {
    run_id: string;
    cycle_index: number;
    circle_bucket: number;
    depth: number | null;
    norm_risk_score: number;
    norm_duration_ms: number;
    safe_degrade_flag: number;
    guardrail_enforced: number;
    guardrail_requests: number;
    iteration_budget_consumed: number;
    observability_missing: number;
    reward_status: 'success' | 'failure';
}
export interface TrainingDataset {
    features: number[][];
    labels: number[];
    featureNames: string[];
    size: number;
    splitIndex: number;
}
export interface ModelPrediction {
    affiliateId: string;
    modelType: string;
    prediction: Record<string, unknown>;
    confidence: number;
    timestamp: Date;
}
export interface SyntheticAffiliateData {
    affiliateId: string;
    tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
    commissionRate: number;
    totalEarnings: number;
    conversionRate: number;
    riskScore: number;
    behaviorCluster: 'conservative' | 'moderate' | 'aggressive' | 'volatile';
    lastActivityDays: number;
    referralCount: number;
    rewardStatus: 'success' | 'failure' | 'pending';
}
export interface SyntheticDataBatch {
    batchId: string;
    data: SyntheticAffiliateData[];
    generatedAt: Date;
    provider: string;
    count: number;
}
export interface LearningTrajectory {
    trajectoryId: string;
    task: string;
    steps: TrajectoryStep[];
    successScore: number;
    critique?: string;
    startedAt: Date;
    completedAt?: Date;
}
export interface TrajectoryStep {
    stepId: string;
    action: string;
    activations?: number[];
    attention?: number[];
    reward: number;
    timestamp: Date;
}
export declare class MLTrainingManager extends EventEmitter {
    private config;
    private reflexionMemory;
    private causalRecall;
    private workflowEngine;
    private jobs;
    private currentJob;
    constructor(reflexionMemory: ReflexionMemory, causalRecall: CausalRecall, workflowEngine: LocalWorkflowEngine, config?: Partial<MLTrainingConfig>);
    loadDTDataset(): Promise<DTDatapoint[]>;
    prepareTrainingDataset(datapoints: DTDatapoint[]): Promise<TrainingDataset>;
    private synthAvailable;
    private trajectories;
    isSynthAvailable(): Promise<boolean>;
    generateSyntheticAffiliateData(count?: number): Promise<SyntheticDataBatch>;
    private generateLocalSyntheticData;
    convertSyntheticToDTDatapoints(batch: SyntheticDataBatch): Promise<DTDatapoint[]>;
    private logSyntheticDataEvent;
    startTrajectory(task: string): LearningTrajectory;
    addTrajectoryStep(trajectoryId: string, action: string, reward: number, activations?: number[], attention?: number[]): TrajectoryStep | null;
    finalizeTrajectory(trajectoryId: string, successScore: number, critique?: string): LearningTrajectory | null;
    private logTrajectory;
    getTrajectory(trajectoryId: string): LearningTrajectory | undefined;
    getTrajectoryStats(): {
        total: number;
        avgSuccessScore: number;
        avgSteps: number;
    };
    /**
     * Execute coordinated analysis with multiple agents in parallel
     * Based on ruvector/examples/agentic-jujutsu/multi-agent-coordination.ts
     */
    coordinatedAnalysis<T>(agents: Array<{
        name: string;
        task: string;
        analyze: (data: T) => Promise<{
            issues: string[];
            score: number;
        }>;
    }>, data: T): Promise<{
        results: Array<{
            agent: string;
            trajectory: LearningTrajectory;
            analysis: {
                issues: string[];
                score: number;
            };
        }>;
        aggregateScore: number;
        totalIssues: number;
    }>;
    /**
     * Create an affiliate analysis agent for use with coordinatedAnalysis
     */
    createAffiliateAnalysisAgent(name: string, analysisType: 'tier' | 'commission' | 'risk' | 'activity'): {
        name: string;
        task: string;
        analyze: (data: SyntheticAffiliateData) => Promise<{
            issues: string[];
            score: number;
        }>;
    };
    createTrainingJob(modelType: TrainingJob['modelType'], customConfig?: Partial<MLTrainingConfig>): Promise<TrainingJob>;
    startTraining(jobId: string): Promise<WorkflowExecution>;
    private trainEpoch;
    private simulatePredict;
    private calculateLoss;
    private saveCheckpoint;
    predict(affiliateId: string, modelType: TrainingJob['modelType'], features: number[]): Promise<ModelPrediction>;
    private logTrainingEvent;
    getJob(jobId: string): TrainingJob | undefined;
    getAllJobs(): TrainingJob[];
    getCurrentJob(): TrainingJob | null;
    getLearningMetrics(): {
        total: number;
        successful: number;
        accuracy: number;
    };
}
export declare function createMLTrainingManager(reflexionMemory: ReflexionMemory, causalRecall: CausalRecall, workflowEngine: LocalWorkflowEngine, config?: Partial<MLTrainingConfig>): MLTrainingManager;
export declare function getDefaultMLConfig(): MLTrainingConfig;
//# sourceMappingURL=ml_training.d.ts.map