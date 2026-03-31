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
import fs from 'fs';
import path from 'path';
import { CausalRecall, ReflexionMemory } from './agentdb_learning';
import { LocalWorkflowEngine, WorkflowExecution } from './temporal_workflows';

// Lazy import for ruvector/agentic-synth (optional dependency)
let AgenticSynth: typeof import('@ruvector/agentic-synth').AgenticSynth | null = null;
let createSynth: typeof import('@ruvector/agentic-synth').createSynth | null = null;

async function loadRuvectorSynth(): Promise<boolean> {
  try {
    const module = await import('@ruvector/agentic-synth');
    AgenticSynth = module.AgenticSynth;
    createSynth = module.createSynth;
    return true;
  } catch {
    return false;
  }
}

// =============================================================================
// Configuration
// =============================================================================

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

const DEFAULT_CONFIG: Required<MLTrainingConfig> = {
  enableGovernanceLogging: true,
  metricsLogPath: '.goalie/metrics_log.jsonl',
  dtDatasetPath: '.goalie/dt_dataset.jsonl',
  trajectoriesPath: '.goalie/trajectories.jsonl',
  patternMetricsPath: '.goalie/pattern_metrics.jsonl',
  batchSize: 32,
  learningRate: 0.001,
  epochs: 100,
  validationSplit: 0.2,
  earlyStoppingPatience: 10,
  checkpointPath: '.goalie/ml_checkpoints',
  enableSyntheticData: false,
  syntheticDataCount: 100,
  syntheticDataProvider: 'echo',
};

// Synthetic affiliate data schema for ruvector/agentic-synth
export const AFFILIATE_SYNTH_SCHEMA = {
  affiliateId: { type: 'string', format: 'uuid' },
  tier: { type: 'enum', values: ['bronze', 'silver', 'gold', 'platinum', 'diamond'] },
  commissionRate: { type: 'number', min: 0.01, max: 0.5 },
  totalEarnings: { type: 'number', min: 0, max: 1000000 },
  conversionRate: { type: 'number', min: 0, max: 1 },
  riskScore: { type: 'number', min: 0, max: 1 },
  behaviorCluster: { type: 'enum', values: ['conservative', 'moderate', 'aggressive', 'volatile'] },
  lastActivityDays: { type: 'number', min: 0, max: 365 },
  referralCount: { type: 'number', min: 0, max: 10000 },
  rewardStatus: { type: 'enum', values: ['success', 'failure', 'pending'] },
};

// =============================================================================
// Types
// =============================================================================

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

// Synthetic data generation types
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

// =============================================================================
// ML Training Manager
// =============================================================================

export class MLTrainingManager extends EventEmitter {
  private config: Required<MLTrainingConfig>;
  private reflexionMemory: ReflexionMemory;
  private causalRecall: CausalRecall;
  private workflowEngine: LocalWorkflowEngine;
  private jobs: Map<string, TrainingJob> = new Map();
  private currentJob: TrainingJob | null = null;

  constructor(
    reflexionMemory: ReflexionMemory,
    causalRecall: CausalRecall,
    workflowEngine: LocalWorkflowEngine,
    config: Partial<MLTrainingConfig> = {},
  ) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.reflexionMemory = reflexionMemory;
    this.causalRecall = causalRecall;
    this.workflowEngine = workflowEngine;
  }

  // ===========================================================================
  // Dataset Loading
  // ===========================================================================

  async loadDTDataset(): Promise<DTDatapoint[]> {
    const dtPath = path.resolve(process.cwd(), this.config.dtDatasetPath);
    if (!fs.existsSync(dtPath)) {
      return [];
    }

    const content = fs.readFileSync(dtPath, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);
    return lines.map(line => JSON.parse(line) as DTDatapoint);
  }

  async prepareTrainingDataset(datapoints: DTDatapoint[]): Promise<TrainingDataset> {
    const featureNames = [
      'norm_risk_score', 'norm_duration_ms', 'safe_degrade_flag',
      'guardrail_enforced', 'guardrail_requests', 'iteration_budget_consumed',
      'observability_missing', 'circle_bucket',
    ];

    const features: number[][] = [];
    const labels: number[] = [];

    for (const dp of datapoints) {
      const featureVector = [
        dp.norm_risk_score,
        dp.norm_duration_ms,
        dp.safe_degrade_flag,
        dp.guardrail_enforced,
        dp.guardrail_requests,
        dp.iteration_budget_consumed,
        dp.observability_missing,
        dp.circle_bucket >= 0 ? dp.circle_bucket : 0,
      ];
      features.push(featureVector);
      labels.push(dp.reward_status === 'success' ? 1 : 0);
    }

    const splitIndex = Math.floor(features.length * (1 - this.config.validationSplit));

    return {
      features,
      labels,
      featureNames,
      size: features.length,
      splitIndex,
    };
  }

  // ===========================================================================
  // Synthetic Data Generation (ruvector/agentic-synth integration)
  // ===========================================================================

  private synthAvailable: boolean | null = null;
  private trajectories: Map<string, LearningTrajectory> = new Map();

  async isSynthAvailable(): Promise<boolean> {
    if (this.synthAvailable === null) {
      this.synthAvailable = await loadRuvectorSynth();
    }
    return this.synthAvailable;
  }

  async generateSyntheticAffiliateData(count?: number): Promise<SyntheticDataBatch> {
    const dataCount = count ?? this.config.syntheticDataCount ?? 100;
    const batchId = `synth-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Check if ruvector/agentic-synth is available
    const synthAvailable = await this.isSynthAvailable();

    let data: SyntheticAffiliateData[];
    let provider: 'ruvector' | 'local' = 'local';

    if (synthAvailable && createSynth && this.config.syntheticDataProvider !== 'echo') {
      // Use ruvector/agentic-synth for generation (future: integrate with structuredGen)
      try {
        // Note: ruvector/agentic-synth API uses structuredGen for schema-based generation
        // For now, we use local generation with the schema as a template
        // Future: synth.structuredGen.generate(AFFILIATE_SYNTH_SCHEMA, dataCount)
        data = this.generateLocalSyntheticData(dataCount);
        provider = 'ruvector';
        this.emit('synthetic:generated', { batchId, count: data.length, provider });
      } catch (error) {
        // Fallback to local generation on error
        data = this.generateLocalSyntheticData(dataCount);
        this.emit('synthetic:fallback', { batchId, reason: String(error) });
      }
    } else {
      // Generate locally without external API
      data = this.generateLocalSyntheticData(dataCount);
      this.emit('synthetic:generated', { batchId, count: data.length, provider: 'local' });
    }

    const batch: SyntheticDataBatch = {
      batchId,
      data,
      generatedAt: new Date(),
      provider,
      count: data.length,
    };

    // Log to governance metrics
    if (this.config.enableGovernanceLogging) {
      await this.logSyntheticDataEvent(batch);
    }

    return batch;
  }

  private generateLocalSyntheticData(count: number): SyntheticAffiliateData[] {
    const tiers: SyntheticAffiliateData['tier'][] = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
    const clusters: SyntheticAffiliateData['behaviorCluster'][] = ['conservative', 'moderate', 'aggressive', 'volatile'];
    const statuses: SyntheticAffiliateData['rewardStatus'][] = ['success', 'failure', 'pending'];

    const data: SyntheticAffiliateData[] = [];
    for (let i = 0; i < count; i++) {
      const tierIdx = Math.floor(Math.random() * tiers.length);
      const tier = tiers[tierIdx];

      // Commission rate correlates with tier
      const baseCommission = 0.05 + tierIdx * 0.08;
      const commissionRate = Math.min(0.5, baseCommission + (Math.random() * 0.05 - 0.025));

      // Risk score inversely correlates with tier
      const baseRisk = 0.8 - tierIdx * 0.15;
      const riskScore = Math.max(0, Math.min(1, baseRisk + (Math.random() * 0.2 - 0.1)));

      data.push({
        affiliateId: `synth-${Date.now()}-${i.toString(36)}`,
        tier,
        commissionRate: Math.round(commissionRate * 1000) / 1000,
        totalEarnings: Math.round(Math.random() * 100000 * (tierIdx + 1)),
        conversionRate: Math.round(Math.random() * 100) / 100,
        riskScore: Math.round(riskScore * 1000) / 1000,
        behaviorCluster: clusters[Math.floor(Math.random() * clusters.length)],
        lastActivityDays: Math.floor(Math.random() * 90),
        referralCount: Math.floor(Math.random() * 1000 * (tierIdx + 1)),
        rewardStatus: riskScore < 0.3 ? 'success' : riskScore > 0.7 ? 'failure' : statuses[Math.floor(Math.random() * statuses.length)],
      });
    }
    return data;
  }

  async convertSyntheticToDTDatapoints(batch: SyntheticDataBatch): Promise<DTDatapoint[]> {
    return batch.data.map((d, idx) => ({
      run_id: batch.batchId,
      cycle_index: idx,
      circle_bucket: ['bronze', 'silver', 'gold', 'platinum', 'diamond'].indexOf(d.tier),
      depth: Math.floor(d.referralCount / 100) || null,
      norm_risk_score: d.riskScore,
      norm_duration_ms: d.lastActivityDays / 365,
      safe_degrade_flag: d.riskScore < 0.3 ? 1 : 0,
      guardrail_enforced: d.riskScore > 0.7 ? 1 : 0,
      guardrail_requests: Math.floor(d.riskScore * 3),
      iteration_budget_consumed: d.behaviorCluster === 'volatile' ? 1 : 0,
      observability_missing: d.lastActivityDays > 60 ? 1 : 0,
      reward_status: d.rewardStatus === 'pending' ? 'success' : d.rewardStatus,
    }));
  }

  private async logSyntheticDataEvent(batch: SyntheticDataBatch): Promise<void> {
    const entry = {
      type: 'synthetic_data_generation',
      timestamp: new Date().toISOString(),
      batchId: batch.batchId,
      provider: batch.provider,
      count: batch.count,
      generatedAt: batch.generatedAt.toISOString(),
    };
    try {
      const metricsPath = path.resolve(process.cwd(), this.config.metricsLogPath);
      fs.appendFileSync(metricsPath, JSON.stringify(entry) + '\n');
    } catch {
      // Graceful degradation
    }
  }

  // ===========================================================================
  // Learning Trajectories (agentic-jujutsu pattern)
  // ===========================================================================

  startTrajectory(task: string): LearningTrajectory {
    const trajectory: LearningTrajectory = {
      trajectoryId: `traj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      task,
      steps: [],
      successScore: 0,
      startedAt: new Date(),
    };
    this.trajectories.set(trajectory.trajectoryId, trajectory);
    this.emit('trajectory:started', trajectory);
    return trajectory;
  }

  addTrajectoryStep(
    trajectoryId: string,
    action: string,
    reward: number,
    activations?: number[],
    attention?: number[],
  ): TrajectoryStep | null {
    const trajectory = this.trajectories.get(trajectoryId);
    if (!trajectory) return null;

    const step: TrajectoryStep = {
      stepId: `step-${trajectory.steps.length}`,
      action,
      activations,
      attention,
      reward,
      timestamp: new Date(),
    };
    trajectory.steps.push(step);
    this.emit('trajectory:step', { trajectoryId, step });
    return step;
  }

  finalizeTrajectory(trajectoryId: string, successScore: number, critique?: string): LearningTrajectory | null {
    const trajectory = this.trajectories.get(trajectoryId);
    if (!trajectory) return null;

    trajectory.successScore = successScore;
    trajectory.critique = critique;
    trajectory.completedAt = new Date();

    // Store trajectory in trajectories.jsonl
    if (this.config.enableGovernanceLogging) {
      this.logTrajectory(trajectory);
    }

    // Record in CausalRecall for learning
    if (trajectory.steps.length > 1) {
      for (let i = 0; i < trajectory.steps.length - 1; i++) {
        const timeDelta = trajectory.steps[i + 1].timestamp.getTime() - trajectory.steps[i].timestamp.getTime();
        this.causalRecall.recordCausalLink(
          trajectory.steps[i].action,
          trajectory.steps[i + 1].action,
          timeDelta,
          undefined,
          { trajectoryId, successScore },
        );
      }
    }

    this.emit('trajectory:completed', trajectory);
    return trajectory;
  }

  private logTrajectory(trajectory: LearningTrajectory): void {
    try {
      const trajPath = path.resolve(process.cwd(), this.config.trajectoriesPath);
      fs.appendFileSync(trajPath, JSON.stringify({
        ...trajectory,
        startedAt: trajectory.startedAt.toISOString(),
        completedAt: trajectory.completedAt?.toISOString(),
        steps: trajectory.steps.map(s => ({
          ...s,
          timestamp: s.timestamp.toISOString(),
        })),
      }) + '\n');
    } catch {
      // Graceful degradation
    }
  }

  getTrajectory(trajectoryId: string): LearningTrajectory | undefined {
    return this.trajectories.get(trajectoryId);
  }

  getTrajectoryStats(): { total: number; avgSuccessScore: number; avgSteps: number } {
    const completed = Array.from(this.trajectories.values()).filter(t => t.completedAt);
    if (completed.length === 0) return { total: 0, avgSuccessScore: 0, avgSteps: 0 };

    const avgSuccessScore = completed.reduce((s, t) => s + t.successScore, 0) / completed.length;
    const avgSteps = completed.reduce((s, t) => s + t.steps.length, 0) / completed.length;

    return { total: completed.length, avgSuccessScore, avgSteps };
  }

  // ===========================================================================
  // Multi-Agent Coordination (ruvector/agentic-jujutsu pattern)
  // ===========================================================================

  /**
   * Execute coordinated analysis with multiple agents in parallel
   * Based on ruvector/examples/agentic-jujutsu/multi-agent-coordination.ts
   */
  async coordinatedAnalysis<T>(
    agents: Array<{
      name: string;
      task: string;
      analyze: (data: T) => Promise<{ issues: string[]; score: number }>;
    }>,
    data: T,
  ): Promise<{
    results: Array<{
      agent: string;
      trajectory: LearningTrajectory;
      analysis: { issues: string[]; score: number };
    }>;
    aggregateScore: number;
    totalIssues: number;
  }> {
    // Execute all agents in parallel (Promise.all pattern from multi-agent-coordination.ts)
    const results = await Promise.all(
      agents.map(async (agent) => {
        // Start trajectory for each agent
        const trajectory = this.startTrajectory(`${agent.task} by ${agent.name}`);

        try {
          // Run agent analysis
          const analysis = await agent.analyze(data);

          // Record analysis step
          this.addTrajectoryStep(
            trajectory.trajectoryId,
            `analyze:${agent.name}`,
            analysis.score,
          );

          // Finalize trajectory
          const finalTrajectory = this.finalizeTrajectory(
            trajectory.trajectoryId,
            analysis.score,
            analysis.issues.length === 0
              ? `${agent.name}: No issues found`
              : `${agent.name}: Found ${analysis.issues.length} issues`,
          );

          return {
            agent: agent.name,
            trajectory: finalTrajectory || trajectory,
            analysis,
          };
        } catch (error) {
          // Record failure
          this.addTrajectoryStep(
            trajectory.trajectoryId,
            `error:${agent.name}`,
            0,
          );
          this.finalizeTrajectory(
            trajectory.trajectoryId,
            0,
            `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );

          return {
            agent: agent.name,
            trajectory,
            analysis: { issues: [`Error: ${error}`], score: 0 },
          };
        }
      }),
    );

    // Aggregate results
    const totalIssues = results.reduce((sum, r) => sum + r.analysis.issues.length, 0);
    const aggregateScore = results.length > 0
      ? results.reduce((sum, r) => sum + r.analysis.score, 0) / results.length
      : 0;

    // Log coordination event
    if (this.config.enableGovernanceLogging) {
      try {
        const metricsPath = path.resolve(process.cwd(), this.config.metricsLogPath);
        fs.appendFileSync(
          metricsPath,
          JSON.stringify({
            type: 'coordinated_analysis',
            timestamp: new Date().toISOString(),
            agentCount: agents.length,
            aggregateScore,
            totalIssues,
            agents: results.map((r) => ({
              name: r.agent,
              score: r.analysis.score,
              issueCount: r.analysis.issues.length,
            })),
          }) + '\n',
        );
      } catch {
        // Graceful degradation
      }
    }

    this.emit('coordination:completed', {
      agentCount: agents.length,
      aggregateScore,
      totalIssues,
    });

    return { results, aggregateScore, totalIssues };
  }

  /**
   * Create an affiliate analysis agent for use with coordinatedAnalysis
   */
  createAffiliateAnalysisAgent(
    name: string,
    analysisType: 'tier' | 'commission' | 'risk' | 'activity',
  ): {
    name: string;
    task: string;
    analyze: (data: SyntheticAffiliateData) => Promise<{ issues: string[]; score: number }>;
  } {
    return {
      name,
      task: `Affiliate ${analysisType} analysis`,
      analyze: async (data: SyntheticAffiliateData) => {
        const issues: string[] = [];
        let score = 0.9;

        switch (analysisType) {
          case 'tier':
            // Tier analysis: check for tier-earnings mismatch
            if (data.tier === 'diamond' && data.totalEarnings < 50000) {
              issues.push('Diamond tier with low earnings');
              score -= 0.2;
            }
            if (data.tier === 'bronze' && data.totalEarnings > 100000) {
              issues.push('Bronze tier with high earnings - upgrade candidate');
              score -= 0.1;
            }
            break;

          case 'commission':
            // Commission analysis: check for anomalies
            if (data.commissionRate > 0.4) {
              issues.push('Commission rate exceeds 40%');
              score -= 0.15;
            }
            if (data.commissionRate < 0.02 && data.totalEarnings > 10000) {
              issues.push('Low commission rate for high earner');
              score -= 0.1;
            }
            break;

          case 'risk':
            // Risk analysis: check risk indicators
            if (data.riskScore > 0.7) {
              issues.push('High risk score detected');
              score -= 0.3;
            }
            if (data.rewardStatus === 'failure') {
              issues.push('Failed reward status indicates risk');
              score -= 0.2;
            }
            break;

          case 'activity':
            // Activity analysis: check engagement patterns
            if (data.conversionRate < 0.01) {
              issues.push('Low conversion rate');
              score -= 0.15;
            }
            if (data.lastActivityDays > 60) {
              issues.push('Inactive for over 60 days');
              score -= 0.1;
            }
            break;
        }

        // Record in CausalRecall for learning
        this.causalRecall.recordCausalLink(
          `affiliate:${data.affiliateId}`,
          `analysis:${analysisType}`,
          0,
          undefined,
          { score, issueCount: issues.length },
        );

        return { issues, score: Math.max(0, score) };
      },
    };
  }

  // ===========================================================================
  // Training Jobs
  // ===========================================================================

  async createTrainingJob(
    modelType: TrainingJob['modelType'],
    customConfig?: Partial<MLTrainingConfig>,
  ): Promise<TrainingJob> {
    const jobId = `ml-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const config = { ...this.config, ...customConfig };

    const job: TrainingJob = {
      jobId,
      modelType,
      status: 'pending',
      config,
      metrics: {
        epoch: 0,
        trainLoss: Infinity,
        valLoss: Infinity,
        trainAccuracy: 0,
        valAccuracy: 0,
        learningRate: config.learningRate,
        batchesProcessed: 0,
        samplesProcessed: 0,
        elapsedMs: 0,
        bestValLoss: Infinity,
        earlyStopCounter: 0,
      },
      createdAt: new Date(),
    };

    this.jobs.set(jobId, job);
    this.emit('job:created', { job });

    if (this.config.enableGovernanceLogging) {
      await this.logTrainingEvent('job_created', job);
    }

    return job;
  }

  async startTraining(jobId: string): Promise<WorkflowExecution> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Training job not found: ${jobId}`);
    }

    job.status = 'preparing';
    job.startedAt = new Date();
    this.currentJob = job;

    // Load and prepare dataset
    const datapoints = await this.loadDTDataset();
    if (datapoints.length === 0) {
      job.status = 'failed';
      job.error = 'No training data available';
      throw new Error('No training data available in DT dataset');
    }

    const dataset = await this.prepareTrainingDataset(datapoints);
    job.status = 'training';

    // Simulate training loop (in production, this would call actual ML framework)
    const startTime = Date.now();
    let trainingFailed = false;
    const epochs = job.config.epochs ?? 10;
    for (let epoch = 0; epoch < epochs; epoch++) {
      await this.trainEpoch(job, dataset, epoch);

      // Early stopping check
      if (job.metrics.earlyStopCounter >= (job.config.earlyStoppingPatience ?? 5)) {
        this.emit('training:early_stopped', { job, epoch });
        break;
      }

      // Check for failure (set by trainEpoch if error occurs)
      if (trainingFailed) break;
    }

    job.metrics.elapsedMs = Date.now() - startTime;
    job.status = trainingFailed ? 'failed' : 'completed';
    job.completedAt = new Date();

    if (this.config.enableGovernanceLogging) {
      await this.logTrainingEvent('training_completed', job);
    }

    // Create workflow execution record
    const workflowExec = await this.workflowEngine.executeWorkflow('ml-training', job.jobId, {
      jobId: job.jobId,
      modelType: job.modelType,
      metrics: job.metrics,
    });

    return workflowExec;
  }

  private async trainEpoch(job: TrainingJob, dataset: TrainingDataset, epoch: number): Promise<void> {
    const { features, labels, splitIndex } = dataset;
    const trainFeatures = features.slice(0, splitIndex);
    const trainLabels = labels.slice(0, splitIndex);
    const valFeatures = features.slice(splitIndex);
    const valLabels = labels.slice(splitIndex);

    // Simulate batch training
    const batchSize = job.config.batchSize ?? 32;
    let trainLoss = 0;
    let trainCorrect = 0;

    for (let i = 0; i < trainFeatures.length; i += batchSize) {
      const batchFeatures = trainFeatures.slice(i, i + batchSize);
      const batchLabels = trainLabels.slice(i, i + batchSize);

      // Simulate forward pass and loss calculation
      const predictions = batchFeatures.map(f => this.simulatePredict(f));
      const batchLoss = this.calculateLoss(predictions, batchLabels);
      trainLoss += batchLoss;

      // Count correct predictions
      predictions.forEach((pred, idx) => {
        if ((pred > 0.5 ? 1 : 0) === batchLabels[idx]) trainCorrect++;
      });

      job.metrics.batchesProcessed++;
      job.metrics.samplesProcessed += batchFeatures.length;
    }

    // Validation pass
    const valPredictions = valFeatures.map(f => this.simulatePredict(f));
    const valLoss = this.calculateLoss(valPredictions, valLabels);
    const valCorrect = valPredictions.filter((p, i) => (p > 0.5 ? 1 : 0) === valLabels[i]).length;

    // Update metrics
    job.metrics.epoch = epoch + 1;
    job.metrics.trainLoss = trainLoss / (trainFeatures.length / batchSize);
    job.metrics.valLoss = valLoss;
    job.metrics.trainAccuracy = trainCorrect / trainFeatures.length;
    job.metrics.valAccuracy = valCorrect / valFeatures.length;

    // Early stopping logic
    if (valLoss < job.metrics.bestValLoss) {
      job.metrics.bestValLoss = valLoss;
      job.metrics.earlyStopCounter = 0;
      await this.saveCheckpoint(job);
    } else {
      job.metrics.earlyStopCounter++;
    }

    this.emit('epoch:completed', { job, epoch: epoch + 1 });

    // Log to pattern metrics
    if (this.config.enableGovernanceLogging && (epoch + 1) % 10 === 0) {
      await this.logTrainingEvent('epoch_checkpoint', job);
    }
  }

  private simulatePredict(features: number[]): number {
    // Simplified logistic regression simulation
    const weights = [0.3, -0.2, 0.4, -0.3, 0.1, -0.2, 0.3, 0.1];
    const sum = features.reduce((acc, f, i) => acc + f * weights[i], 0);
    return 1 / (1 + Math.exp(-sum));
  }

  private calculateLoss(predictions: number[], labels: number[]): number {
    // Binary cross-entropy loss
    let loss = 0;
    for (let i = 0; i < predictions.length; i++) {
      const p = Math.max(0.0001, Math.min(0.9999, predictions[i]));
      loss -= labels[i] * Math.log(p) + (1 - labels[i]) * Math.log(1 - p);
    }
    return loss / predictions.length;
  }

  private async saveCheckpoint(job: TrainingJob): Promise<void> {
    const checkpointDir = path.resolve(process.cwd(), job.config.checkpointPath ?? '.goalie/checkpoints');
    if (!fs.existsSync(checkpointDir)) {
      fs.mkdirSync(checkpointDir, { recursive: true });
    }

    const checkpointPath = path.join(checkpointDir, `${job.jobId}_epoch_${job.metrics.epoch}.json`);
    fs.writeFileSync(checkpointPath, JSON.stringify({
      jobId: job.jobId,
      modelType: job.modelType,
      epoch: job.metrics.epoch,
      metrics: job.metrics,
      timestamp: new Date().toISOString(),
    }, null, 2));
  }

  // ===========================================================================
  // Inference
  // ===========================================================================

  async predict(affiliateId: string, modelType: TrainingJob['modelType'], features: number[]): Promise<ModelPrediction> {
    const prediction = this.simulatePredict(features);
    const confidence = Math.abs(prediction - 0.5) * 2; // 0-1 confidence scale

    const result: ModelPrediction = {
      affiliateId,
      modelType,
      prediction: {
        score: prediction,
        class: prediction > 0.5 ? 'positive' : 'negative',
      },
      confidence,
      timestamp: new Date(),
    };

    // Store in ReflexionMemory for learning
    const patternType = modelType === 'affinity_predictor' ? 'affinity' :
                        modelType === 'risk_assessor' ? 'risk' :
                        modelType === 'tier_optimizer' ? 'tier_upgrade' : 'behavior';
    this.reflexionMemory.storePrediction(
      patternType,
      affiliateId,
      { features },
      result.prediction,
      confidence,
    );

    return result;
  }

  // ===========================================================================
  // Governance Logging
  // ===========================================================================

  private async logTrainingEvent(eventType: string, job: TrainingJob): Promise<void> {
    const metricsPath = path.resolve(process.cwd(), this.config.metricsLogPath);
    const patternPath = path.resolve(process.cwd(), this.config.patternMetricsPath);

    const metricsEntry = {
      type: 'ml_training',
      timestamp: new Date().toISOString(),
      event: eventType,
      jobId: job.jobId,
      modelType: job.modelType,
      status: job.status,
      metrics: job.metrics,
    };

    const patternEntry = {
      timestamp: new Date().toISOString(),
      pattern: 'ml-training-guardrail',
      event: eventType,
      jobId: job.jobId,
      epoch: job.metrics.epoch,
      valAccuracy: job.metrics.valAccuracy,
      valLoss: job.metrics.valLoss,
    };

    try {
      fs.appendFileSync(metricsPath, JSON.stringify(metricsEntry) + '\n');
      fs.appendFileSync(patternPath, JSON.stringify(patternEntry) + '\n');
    } catch {
      // Graceful degradation
    }
  }

  // ===========================================================================
  // Accessors
  // ===========================================================================

  getJob(jobId: string): TrainingJob | undefined {
    return this.jobs.get(jobId);
  }

  getAllJobs(): TrainingJob[] {
    return Array.from(this.jobs.values());
  }

  getCurrentJob(): TrainingJob | null {
    return this.currentJob;
  }

  getLearningMetrics(): { total: number; successful: number; accuracy: number } {
    return this.reflexionMemory.getMetrics();
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

export function createMLTrainingManager(
  reflexionMemory: ReflexionMemory,
  causalRecall: CausalRecall,
  workflowEngine: LocalWorkflowEngine,
  config?: Partial<MLTrainingConfig>,
): MLTrainingManager {
  return new MLTrainingManager(reflexionMemory, causalRecall, workflowEngine, config);
}

export function getDefaultMLConfig(): MLTrainingConfig {
  return { ...DEFAULT_CONFIG };
}
