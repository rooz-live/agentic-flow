/**
 * ML Training Integration Tests
 * Tests for MLTrainingManager, training jobs, inference, and governance logging
 */

import { CausalRecall, ReflexionMemory } from '../../src/integrations/agentdb_learning';
import {
    createMLTrainingManager,
    getDefaultMLConfig,
    MLTrainingManager,
    TrainingJob
} from '../../src/integrations/ml_training';
import { LocalWorkflowEngine } from '../../src/integrations/temporal_workflows';

// Mock the file system for testing
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  readFileSync: jest.fn().mockReturnValue(`
{"run_id": "test-1", "cycle_index": 1, "circle_bucket": 0, "depth": 1, "norm_risk_score": 0.1, "norm_duration_ms": 0.5, "safe_degrade_flag": 1, "guardrail_enforced": 0, "guardrail_requests": 0, "iteration_budget_consumed": 0, "observability_missing": 0, "reward_status": "success"}
{"run_id": "test-1", "cycle_index": 2, "circle_bucket": 1, "depth": 2, "norm_risk_score": 0.2, "norm_duration_ms": 0.6, "safe_degrade_flag": 0, "guardrail_enforced": 1, "guardrail_requests": 1, "iteration_budget_consumed": 1, "observability_missing": 0, "reward_status": "success"}
{"run_id": "test-1", "cycle_index": 3, "circle_bucket": 2, "depth": 3, "norm_risk_score": 0.8, "norm_duration_ms": 0.9, "safe_degrade_flag": 0, "guardrail_enforced": 1, "guardrail_requests": 2, "iteration_budget_consumed": 1, "observability_missing": 1, "reward_status": "failure"}
{"run_id": "test-2", "cycle_index": 1, "circle_bucket": 0, "depth": 1, "norm_risk_score": 0.05, "norm_duration_ms": 0.3, "safe_degrade_flag": 1, "guardrail_enforced": 0, "guardrail_requests": 0, "iteration_budget_consumed": 0, "observability_missing": 0, "reward_status": "success"}
{"run_id": "test-2", "cycle_index": 2, "circle_bucket": 1, "depth": 2, "norm_risk_score": 0.15, "norm_duration_ms": 0.4, "safe_degrade_flag": 1, "guardrail_enforced": 0, "guardrail_requests": 0, "iteration_budget_consumed": 0, "observability_missing": 0, "reward_status": "success"}
`),
  appendFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

describe('MLTrainingManager', () => {
  let manager: MLTrainingManager;
  let reflexionMemory: ReflexionMemory;
  let causalRecall: CausalRecall;
  let workflowEngine: LocalWorkflowEngine;

  beforeEach(() => {
    // Create mock instances
    reflexionMemory = {
      storePrediction: jest.fn().mockReturnValue({
        id: 'pattern-1',
        patternType: 'affinity',
        affiliateId: 'test',
        inputFeatures: {},
        prediction: {},
        confidence: 0.8,
        createdAt: new Date(),
      }),
      getMetrics: jest.fn().mockReturnValue({
        total: 10,
        successful: 8,
        accuracy: 0.8,
      }),
    } as unknown as ReflexionMemory;

    causalRecall = {
      recordRelation: jest.fn().mockResolvedValue('relation-1'),
      recordCausalLink: jest.fn(),
      queryRelations: jest.fn().mockResolvedValue([]),
    } as unknown as CausalRecall;

    workflowEngine = {
      startWorkflow: jest.fn().mockResolvedValue({
        workflowId: 'wf-1',
        workflowType: 'ml-training',
        status: 'completed',
        input: {},
        startedAt: new Date(),
        retryCount: 0,
      }),
      executeWorkflow: jest.fn().mockResolvedValue({
        workflowId: 'wf-1',
        workflowType: 'ml-training',
        status: 'completed',
        input: {},
        startedAt: new Date(),
        retryCount: 0,
      }),
    } as unknown as LocalWorkflowEngine;

    manager = createMLTrainingManager(reflexionMemory, causalRecall, workflowEngine, {
      enableGovernanceLogging: false,
      epochs: 5, // Fewer epochs for faster tests
      earlyStoppingPatience: 2,
    });
  });

  describe('Initialization', () => {
    it('should create manager with default config', () => {
      expect(manager).toBeDefined();
      const config = getDefaultMLConfig();
      expect(config.batchSize).toBe(32);
      expect(config.epochs).toBe(100);
      expect(config.validationSplit).toBe(0.2);
    });

    it('should have no jobs initially', () => {
      expect(manager.getAllJobs()).toHaveLength(0);
      expect(manager.getCurrentJob()).toBeNull();
    });
  });

  describe('Dataset Loading', () => {
    it('should load DT dataset from file', async () => {
      const datapoints = await manager.loadDTDataset();
      expect(datapoints.length).toBe(5);
      expect(datapoints[0].run_id).toBe('test-1');
    });

    it('should prepare training dataset with features', async () => {
      const datapoints = await manager.loadDTDataset();
      const dataset = await manager.prepareTrainingDataset(datapoints);

      expect(dataset.size).toBe(5);
      expect(dataset.featureNames).toContain('norm_risk_score');
      expect(dataset.featureNames).toContain('safe_degrade_flag');
      expect(dataset.features[0].length).toBe(8);
    });

    it('should split dataset correctly', async () => {
      const datapoints = await manager.loadDTDataset();
      const dataset = await manager.prepareTrainingDataset(datapoints);

      expect(dataset.splitIndex).toBe(4); // 80% of 5 = 4
    });
  });

  describe('Training Jobs', () => {
    it('should create training job', async () => {
      const job = await manager.createTrainingJob('affinity_predictor');

      expect(job.jobId).toMatch(/^ml-\d+-[a-z0-9]+$/);
      expect(job.modelType).toBe('affinity_predictor');
      expect(job.status).toBe('pending');
    });

    it('should track job in manager', async () => {
      const job = await manager.createTrainingJob('risk_assessor');

      expect(manager.getJob(job.jobId)).toBeDefined();
      expect(manager.getAllJobs()).toHaveLength(1);
    });

    it('should create jobs for all model types', async () => {
      const types: Array<TrainingJob['modelType']> = [
        'affinity_predictor',
        'risk_assessor',
        'tier_optimizer',
        'behavior_classifier',
      ];

      for (const type of types) {
        const job = await manager.createTrainingJob(type);
        expect(job.modelType).toBe(type);
      }

      expect(manager.getAllJobs()).toHaveLength(4);
    });
  });

  describe('Training Execution', () => {
    it('should start training and complete', async () => {
      const job = await manager.createTrainingJob('affinity_predictor');
      const execution = await manager.startTraining(job.jobId);

      expect(execution.workflowId).toBe('wf-1');
      expect(manager.getJob(job.jobId)?.status).toBe('completed');
    });

    it('should track training metrics', async () => {
      const job = await manager.createTrainingJob('risk_assessor');
      await manager.startTraining(job.jobId);

      const updatedJob = manager.getJob(job.jobId);
      expect(updatedJob?.metrics.epoch).toBeGreaterThan(0);
      expect(updatedJob?.metrics.samplesProcessed).toBeGreaterThan(0);
    });

    it('should fail on unknown job ID', async () => {
      await expect(manager.startTraining('unknown-job')).rejects.toThrow(
        'Training job not found',
      );
    });

    it('should emit epoch completed events', async () => {
      const epochEvents: number[] = [];
      manager.on('epoch:completed', ({ epoch }) => epochEvents.push(epoch));

      const job = await manager.createTrainingJob('tier_optimizer');
      await manager.startTraining(job.jobId);

      expect(epochEvents.length).toBeGreaterThan(0);
    });
  });

  describe('Inference', () => {
    it('should make predictions', async () => {
      const features = [0.1, 0.5, 1, 0, 0, 0, 0, 0];
      const prediction = await manager.predict('aff-001', 'affinity_predictor', features);

      expect(prediction.affiliateId).toBe('aff-001');
      expect(prediction.modelType).toBe('affinity_predictor');
      expect(prediction.prediction).toBeDefined();
      expect(prediction.confidence).toBeGreaterThanOrEqual(0);
      expect(prediction.confidence).toBeLessThanOrEqual(1);
    });

    it('should store prediction in ReflexionMemory', async () => {
      const features = [0.2, 0.6, 0, 1, 1, 0, 0, 1];
      await manager.predict('aff-002', 'risk_assessor', features);

      expect(reflexionMemory.storePrediction).toHaveBeenCalledWith(
        'risk',
        'aff-002',
        expect.any(Object),
        expect.any(Object),
        expect.any(Number),
      );
    });

    it('should classify predictions correctly', async () => {
      // High-risk features should predict negative
      const highRiskFeatures = [0.9, 0.9, 0, 1, 2, 1, 1, 2];
      const highRiskPred = await manager.predict('aff-risk', 'risk_assessor', highRiskFeatures);

      // Low-risk features should predict positive
      const lowRiskFeatures = [0.1, 0.1, 1, 0, 0, 0, 0, 0];
      const lowRiskPred = await manager.predict('aff-safe', 'risk_assessor', lowRiskFeatures);

      expect(highRiskPred.prediction).toBeDefined();
      expect(lowRiskPred.prediction).toBeDefined();
    });
  });

  describe('Learning Metrics', () => {
    it('should return learning metrics from ReflexionMemory', () => {
      const metrics = manager.getLearningMetrics();

      expect(metrics.total).toBe(10);
      expect(metrics.accuracy).toBe(0.8);
    });
  });
});

describe('Factory Functions', () => {
  it('should return default ML config', () => {
    const config = getDefaultMLConfig();

    expect(config.enableGovernanceLogging).toBe(true);
    expect(config.dtDatasetPath).toBe('.goalie/dt_dataset.jsonl');
    expect(config.learningRate).toBe(0.001);
  });
});

describe('Multi-Agent Coordination (ruvector/agentic-jujutsu pattern)', () => {
  let manager: MLTrainingManager;
  let reflexionMemory: ReflexionMemory;
  let causalRecall: CausalRecall;
  let workflowEngine: LocalWorkflowEngine;

  beforeEach(() => {
    reflexionMemory = {
      storePrediction: jest.fn().mockReturnValue({ id: 'pattern-1' }),
      getMetrics: jest.fn().mockReturnValue({ total: 10, successful: 8, accuracy: 0.8 }),
    } as unknown as ReflexionMemory;

    causalRecall = {
      recordRelation: jest.fn().mockResolvedValue('relation-1'),
      recordCausalLink: jest.fn(),
      queryRelations: jest.fn().mockResolvedValue([]),
    } as unknown as CausalRecall;

    workflowEngine = {
      startWorkflow: jest.fn().mockResolvedValue({ workflowId: 'wf-1', status: 'completed' }),
      executeWorkflow: jest.fn().mockResolvedValue({ workflowId: 'wf-1', status: 'completed' }),
    } as unknown as LocalWorkflowEngine;

    manager = createMLTrainingManager(reflexionMemory, causalRecall, workflowEngine, {
      enableGovernanceLogging: false,
    });
  });

  describe('coordinatedAnalysis', () => {
    it('should execute multiple agents in parallel', async () => {
      const mockAgent1 = {
        name: 'TierAnalyzer',
        task: 'Tier analysis',
        analyze: jest.fn().mockResolvedValue({ issues: [], score: 0.9 }),
      };
      const mockAgent2 = {
        name: 'RiskAnalyzer',
        task: 'Risk analysis',
        analyze: jest.fn().mockResolvedValue({ issues: ['High risk'], score: 0.6 }),
      };

      const testData = { affiliateId: 'test-1', tier: 'gold' };
      const result = await manager.coordinatedAnalysis([mockAgent1, mockAgent2], testData);

      expect(result.results).toHaveLength(2);
      expect(mockAgent1.analyze).toHaveBeenCalledWith(testData);
      expect(mockAgent2.analyze).toHaveBeenCalledWith(testData);
    });

    it('should calculate aggregate score correctly', async () => {
      const agents = [
        { name: 'Agent1', task: 'Task 1', analyze: jest.fn().mockResolvedValue({ issues: [], score: 0.8 }) },
        { name: 'Agent2', task: 'Task 2', analyze: jest.fn().mockResolvedValue({ issues: [], score: 1.0 }) },
      ];

      const result = await manager.coordinatedAnalysis(agents, {});

      expect(result.aggregateScore).toBe(0.9);
      expect(result.totalIssues).toBe(0);
    });

    it('should count total issues across agents', async () => {
      const agents = [
        { name: 'Agent1', task: 'Task 1', analyze: jest.fn().mockResolvedValue({ issues: ['Issue 1', 'Issue 2'], score: 0.5 }) },
        { name: 'Agent2', task: 'Task 2', analyze: jest.fn().mockResolvedValue({ issues: ['Issue 3'], score: 0.7 }) },
      ];

      const result = await manager.coordinatedAnalysis(agents, {});

      expect(result.totalIssues).toBe(3);
    });

    it('should create trajectory for each agent', async () => {
      const agents = [
        { name: 'TrajectoryAgent', task: 'Trajectory test', analyze: jest.fn().mockResolvedValue({ issues: [], score: 0.95 }) },
      ];

      const result = await manager.coordinatedAnalysis(agents, {});

      expect(result.results[0].trajectory).toBeDefined();
      expect(result.results[0].trajectory.task).toContain('TrajectoryAgent');
      expect(result.results[0].trajectory.successScore).toBe(0.95);
    });

    it('should handle agent errors gracefully', async () => {
      const agents = [
        { name: 'SuccessAgent', task: 'Success', analyze: jest.fn().mockResolvedValue({ issues: [], score: 0.9 }) },
        { name: 'FailAgent', task: 'Fail', analyze: jest.fn().mockRejectedValue(new Error('Analysis failed')) },
      ];

      const result = await manager.coordinatedAnalysis(agents, {});

      expect(result.results).toHaveLength(2);
      expect(result.results[1].analysis.score).toBe(0);
      expect(result.results[1].analysis.issues[0]).toContain('Error');
    });

    it('should emit coordination:completed event', async () => {
      const eventSpy = jest.fn();
      manager.on('coordination:completed', eventSpy);

      const agents = [
        { name: 'EventAgent', task: 'Event test', analyze: jest.fn().mockResolvedValue({ issues: [], score: 0.8 }) },
      ];

      await manager.coordinatedAnalysis(agents, {});

      expect(eventSpy).toHaveBeenCalledWith({ agentCount: 1, aggregateScore: 0.8, totalIssues: 0 });
    });
  });

  describe('createAffiliateAnalysisAgent', () => {
    it('should create tier analysis agent', () => {
      const agent = manager.createAffiliateAnalysisAgent('TierChecker', 'tier');

      expect(agent.name).toBe('TierChecker');
      expect(agent.task).toBe('Affiliate tier analysis');
      expect(typeof agent.analyze).toBe('function');
    });

    it('should detect tier-earnings mismatch', async () => {
      const agent = manager.createAffiliateAnalysisAgent('TierChecker', 'tier');
      const result = await agent.analyze({
        affiliateId: 'test-1', tier: 'diamond', totalEarnings: 10000, commissionRate: 0.1,
        riskScore: 0.2, conversionRate: 0.05, behaviorCluster: 'moderate',
        lastActivityDays: 5, referralCount: 10, rewardStatus: 'success',
      } as any);

      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0]).toContain('Diamond tier with low earnings');
    });

    it('should detect high commission rate', async () => {
      const agent = manager.createAffiliateAnalysisAgent('CommissionChecker', 'commission');
      const result = await agent.analyze({
        affiliateId: 'test-2', tier: 'gold', totalEarnings: 50000, commissionRate: 0.45,
        riskScore: 0.2, conversionRate: 0.05, behaviorCluster: 'moderate',
        lastActivityDays: 5, referralCount: 10, rewardStatus: 'success',
      } as any);

      expect(result.issues).toContain('Commission rate exceeds 40%');
    });

    it('should detect high risk score', async () => {
      const agent = manager.createAffiliateAnalysisAgent('RiskChecker', 'risk');
      const result = await agent.analyze({
        affiliateId: 'test-3', tier: 'silver', totalEarnings: 25000, commissionRate: 0.1,
        riskScore: 0.85, conversionRate: 0.05, behaviorCluster: 'moderate',
        lastActivityDays: 5, referralCount: 10, rewardStatus: 'success',
      } as any);

      expect(result.issues).toContain('High risk score detected');
    });

    it('should detect low conversion rate', async () => {
      const agent = manager.createAffiliateAnalysisAgent('ActivityChecker', 'activity');
      const result = await agent.analyze({
        affiliateId: 'test-4', tier: 'bronze', totalEarnings: 5000, commissionRate: 0.05,
        riskScore: 0.1, conversionRate: 0.005, behaviorCluster: 'moderate',
        lastActivityDays: 5, referralCount: 10, rewardStatus: 'success',
      } as any);

      expect(result.issues).toContain('Low conversion rate');
    });
  });

  describe('Full Coordinated Affiliate Analysis', () => {
    it('should run all 4 analysis types in parallel', async () => {
      const agents = [
        manager.createAffiliateAnalysisAgent('TierAgent', 'tier'),
        manager.createAffiliateAnalysisAgent('CommissionAgent', 'commission'),
        manager.createAffiliateAnalysisAgent('RiskAgent', 'risk'),
        manager.createAffiliateAnalysisAgent('ActivityAgent', 'activity'),
      ];

      const testAffiliate = {
        affiliateId: 'aff-full-test', tier: 'gold' as const, totalEarnings: 75000,
        commissionRate: 0.15, riskScore: 0.3, conversionRate: 0.08,
        behaviorCluster: 'moderate' as const, lastActivityDays: 5, referralCount: 10,
        rewardStatus: 'success' as const,
      };

      const result = await manager.coordinatedAnalysis(agents, testAffiliate);

      expect(result.results).toHaveLength(4);
      expect(result.aggregateScore).toBeGreaterThan(0);
      expect(result.results.every((r) => r.trajectory.completedAt)).toBe(true);
    });
  });
});
