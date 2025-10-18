/**
 * MCP Learning Integration Tests
 */

import { SQLiteVectorDB } from '../core/vector-db.js';
import {
  LearningManager,
  ExperienceRecorder,
  RewardEstimator,
  SessionManager,
  PolicyOptimizer,
  ExperienceBuffer,
} from '../mcp/learning/index.js';
import type {
  Outcome,
  ExecutionContext,
  State,
  Experience,
} from '../mcp/learning/types/index.js';

describe('MCP Learning Integration', () => {
  let db: SQLiteVectorDB;
  let learningManager: LearningManager;

  beforeEach(async () => {
    db = new SQLiteVectorDB({ memoryMode: true });
    learningManager = new LearningManager(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('Session Management', () => {
    it('should create and manage sessions', async () => {
      const session = await learningManager.startSession(
        'user123',
        'coding',
        'q-learning'
      );

      expect(session.sessionId).toBeDefined();
      expect(session.userId).toBe('user123');
      expect(session.sessionType).toBe('coding');
      expect(session.status).toBe('active');

      const info = learningManager.getSessionInfo(session.sessionId);
      expect(info).toBeDefined();
      expect(info?.sessionId).toBe(session.sessionId);

      const ended = await learningManager.endSession(session.sessionId);
      expect(ended.status).toBe('ended');
      expect(ended.endTime).toBeDefined();
    });

    it('should track multiple sessions per user', async () => {
      const session1 = await learningManager.startSession(
        'user123',
        'coding'
      );
      const session2 = await learningManager.startSession(
        'user123',
        'research'
      );

      expect(session1.sessionId).not.toBe(session2.sessionId);
    });
  });

  describe('Experience Recording', () => {
    it('should record tool executions as experiences', async () => {
      const session = await learningManager.startSession(
        'user123',
        'coding'
      );

      const outcome: Outcome = {
        success: true,
        result: { code: 'console.log("hello")' },
        executionTime: 250,
        tokensUsed: 100,
      };

      const experience = await learningManager.recordExperience(
        session.sessionId,
        'code_generator',
        { prompt: 'write hello world' },
        { code: 'console.log("hello")' },
        outcome
      );

      expect(experience.state).toBeDefined();
      expect(experience.action.tool).toBe('code_generator');
      expect(experience.reward).toBeGreaterThan(0);
      expect(experience.metadata.sessionId).toBe(session.sessionId);

      const info = learningManager.getSessionInfo(session.sessionId);
      expect(info?.experienceCount).toBe(1);
    });

    it('should calculate appropriate rewards for successful outcomes', async () => {
      const estimator = new RewardEstimator();

      const goodOutcome: Outcome = {
        success: true,
        result: { data: 'complete' },
        executionTime: 1000,
        tokensUsed: 300,
      };

      const context: ExecutionContext = {
        userId: 'user123',
        sessionId: 'session456',
        taskType: 'coding',
        timestamp: Date.now(),
        isTerminal: true,
      };

      const reward = await estimator.calculateReward(goodOutcome, context);

      expect(reward.automatic).toBeGreaterThan(0.5);
      expect(reward.dimensions.success).toBe(1.0);
      expect(reward.dimensions.efficiency).toBeGreaterThan(0);
      expect(reward.dimensions.quality).toBeGreaterThan(0);
    });

    it('should calculate lower rewards for failures', async () => {
      const estimator = new RewardEstimator();

      const badOutcome: Outcome = {
        success: false,
        result: null,
        error: new Error('Failed to execute'),
        executionTime: 5000,
        tokensUsed: 800,
      };

      const context: ExecutionContext = {
        userId: 'user123',
        sessionId: 'session456',
        taskType: 'coding',
        timestamp: Date.now(),
        isTerminal: true,
      };

      const reward = await estimator.calculateReward(badOutcome, context);

      expect(reward.automatic).toBeLessThan(0.3);
      expect(reward.dimensions.success).toBe(0.0);
      expect(reward.dimensions.quality).toBe(0.0);
    });
  });

  describe('Action Prediction', () => {
    it('should predict best actions based on experience', async () => {
      const session = await learningManager.startSession(
        'user123',
        'coding'
      );

      // Record some successful experiences with a specific tool
      for (let i = 0; i < 5; i++) {
        await learningManager.recordExperience(
          session.sessionId,
          'code_analyzer',
          { file: `test${i}.ts` },
          { issues: [] },
          {
            success: true,
            result: { issues: [] },
            executionTime: 200 + i * 10,
            tokensUsed: 150,
          }
        );
      }

      // Record some failed experiences with another tool
      for (let i = 0; i < 3; i++) {
        await learningManager.recordExperience(
          session.sessionId,
          'code_formatter',
          { file: `test${i}.ts` },
          null,
          {
            success: false,
            result: null,
            error: new Error('Failed'),
            executionTime: 500,
            tokensUsed: 200,
          }
        );
      }

      const currentState: State = {
        taskDescription: 'Analyze code file',
        availableTools: ['code_analyzer', 'code_formatter', 'code_reviewer'],
        previousActions: [],
      };

      const prediction = await learningManager.predictAction(
        session.sessionId,
        currentState,
        ['code_analyzer', 'code_formatter', 'code_reviewer']
      );

      expect(prediction.recommendedAction).toBeDefined();
      expect(prediction.recommendedAction.tool).toBeDefined();
      expect(prediction.recommendedAction.confidence).toBeGreaterThan(0);
      expect(prediction.alternatives.length).toBeGreaterThan(0);
    });
  });

  describe('Policy Training', () => {
    it('should train policy on collected experiences', async () => {
      const session = await learningManager.startSession(
        'user123',
        'coding'
      );

      // Generate training data
      for (let i = 0; i < 50; i++) {
        const tool = i % 2 === 0 ? 'good_tool' : 'bad_tool';
        const success = i % 2 === 0;

        await learningManager.recordExperience(
          session.sessionId,
          tool,
          { param: i },
          { result: success },
          {
            success,
            result: { result: success },
            executionTime: success ? 200 : 1000,
            tokensUsed: success ? 100 : 500,
          }
        );
      }

      const metrics = await learningManager.train(session.sessionId, {
        batchSize: 16,
        epochs: 5,
        learningRate: 0.1,
      });

      expect(metrics.experiencesProcessed).toBeGreaterThan(0);
      expect(metrics.trainingTime).toBeGreaterThan(0);
      expect(metrics.loss).toBeDefined();
    });
  });

  describe('Learning Metrics', () => {
    it('should calculate learning progress metrics', async () => {
      const session = await learningManager.startSession(
        'user123',
        'coding'
      );

      // Simulate improving performance over time
      for (let i = 0; i < 20; i++) {
        const successRate = i / 20; // Improving success rate
        const success = Math.random() < successRate;

        await learningManager.recordExperience(
          session.sessionId,
          'test_tool',
          { iteration: i },
          { success },
          {
            success,
            result: { success },
            executionTime: 500 - i * 10,
            tokensUsed: 300 - i * 5,
          }
        );
      }

      const metrics = await learningManager.getMetrics(
        session.sessionId,
        'session'
      );

      expect(metrics.totalExperiences).toBe(20);
      expect(metrics.averageReward).toBeGreaterThan(0);
      expect(metrics.topActions.length).toBeGreaterThan(0);
      expect(metrics.topActions[0].tool).toBe('test_tool');
    });
  });

  describe('Transfer Learning', () => {
    it('should transfer knowledge between similar tasks', async () => {
      // Train on coding task
      const codingSession = await learningManager.startSession(
        'user123',
        'coding'
      );

      for (let i = 0; i < 30; i++) {
        await learningManager.recordExperience(
          codingSession.sessionId,
          'code_tool',
          { task: 'coding' },
          { success: true },
          {
            success: true,
            result: { success: true },
            executionTime: 300,
            tokensUsed: 200,
          }
        );
      }

      // Create debugging session
      const debugSession = await learningManager.startSession(
        'user123',
        'debugging'
      );

      // Transfer learning
      const transferMetrics = await learningManager.transferLearning(
        codingSession.sessionId,
        debugSession.sessionId,
        0.7
      );

      expect(transferMetrics.transferSuccess).toBe(true);
      expect(transferMetrics.similarity).toBe(0.7);
      expect(transferMetrics.experiencesTransferred).toBeGreaterThan(0);
    });
  });

  describe('Explanation', () => {
    it('should explain predictions with reasoning', async () => {
      const session = await learningManager.startSession(
        'user123',
        'coding'
      );

      // Record some experiences
      for (let i = 0; i < 5; i++) {
        await learningManager.recordExperience(
          session.sessionId,
          'analyzer',
          { file: 'test.ts' },
          { issues: [] },
          {
            success: true,
            result: { issues: [] },
            executionTime: 250,
            tokensUsed: 150,
          }
        );
      }

      const state: State = {
        taskDescription: 'Analyze code quality',
        availableTools: ['analyzer', 'formatter'],
        previousActions: [],
      };

      const explanation = await learningManager.explainPrediction(
        session.sessionId,
        state
      );

      expect(explanation.reasoning).toBeDefined();
      expect(explanation.reasoning).toContain('experience');
      expect(explanation.similarExperiences).toBeDefined();
      expect(explanation.confidenceFactors).toBeDefined();
    });
  });

  describe('Experience Buffer', () => {
    it('should manage prioritized experience replay', () => {
      const buffer = new ExperienceBuffer(100);

      // Add experiences
      for (let i = 0; i < 50; i++) {
        const experience: Experience = {
          state: {
            taskDescription: `task${i}`,
            availableTools: ['tool1'],
            previousActions: [],
          },
          action: { tool: 'tool1', params: {} },
          reward: i / 50, // Increasing reward
          nextState: {
            taskDescription: `task${i}`,
            availableTools: ['tool1'],
            previousActions: [],
          },
          done: false,
          timestamp: Date.now() + i,
          metadata: {
            userId: 'user123',
            sessionId: 'session456',
            taskType: 'coding',
            actionId: `action${i}`,
          },
        };

        buffer.add(experience);
      }

      expect(buffer.size()).toBe(50);

      const batch = buffer.samplePrioritized(10, 0.6);
      expect(batch.length).toBe(10);

      const topRewarded = buffer.getTopRewarded(5);
      expect(topRewarded.length).toBe(5);
      expect(topRewarded[0].reward).toBeGreaterThanOrEqual(
        topRewarded[4].reward
      );

      const stats = buffer.getStats();
      expect(stats.size).toBe(50);
      expect(stats.avgReward).toBeGreaterThan(0);
    });

    it('should prune buffer when exceeding max size', () => {
      const buffer = new ExperienceBuffer(10);

      // Add more than max size
      for (let i = 0; i < 20; i++) {
        const experience: Experience = {
          state: {
            taskDescription: `task${i}`,
            availableTools: ['tool1'],
            previousActions: [],
          },
          action: { tool: 'tool1', params: {} },
          reward: i / 20,
          nextState: {
            taskDescription: `task${i}`,
            availableTools: ['tool1'],
            previousActions: [],
          },
          done: false,
          timestamp: Date.now() + i,
          metadata: {
            userId: 'user123',
            sessionId: 'session456',
            taskType: 'coding',
            actionId: `action${i}`,
          },
        };

        buffer.add(experience);
      }

      // Should have pruned to max size
      expect(buffer.size()).toBe(10);
    });
  });

  describe('Policy Optimizer', () => {
    it('should optimize policy through Q-learning', async () => {
      const optimizer = new PolicyOptimizer(0.1, 0.95, 1000);

      const state: State = {
        taskDescription: 'Test task',
        availableTools: ['tool1', 'tool2', 'tool3'],
        previousActions: [],
      };

      // Record positive experiences with tool1
      for (let i = 0; i < 10; i++) {
        const experience: Experience = {
          state,
          action: { tool: 'tool1', params: {} },
          reward: 0.8,
          nextState: state,
          done: false,
          timestamp: Date.now(),
          metadata: {
            userId: 'user123',
            sessionId: 'session456',
            taskType: 'coding',
          },
        };

        await optimizer.updatePolicy(experience);
      }

      // Record negative experiences with tool2
      for (let i = 0; i < 10; i++) {
        const experience: Experience = {
          state,
          action: { tool: 'tool2', params: {} },
          reward: 0.2,
          nextState: state,
          done: false,
          timestamp: Date.now(),
          metadata: {
            userId: 'user123',
            sessionId: 'session456',
            taskType: 'coding',
          },
        };

        await optimizer.updatePolicy(experience);
      }

      const prediction = await optimizer.predictAction(state, [
        'tool1',
        'tool2',
        'tool3',
      ]);

      // Should prefer tool1 based on higher rewards
      expect(prediction.recommendedAction.tool).toBe('tool1');
      expect(prediction.recommendedAction.confidence).toBeGreaterThan(0.5);

      const stats = optimizer.getPolicyStats();
      expect(stats.statesLearned).toBeGreaterThan(0);
      expect(stats.totalExperiences).toBe(20);
    });

    it('should export and import policy', async () => {
      const optimizer1 = new PolicyOptimizer();

      const state: State = {
        taskDescription: 'Test',
        availableTools: ['tool1'],
        previousActions: [],
      };

      const experience: Experience = {
        state,
        action: { tool: 'tool1', params: {} },
        reward: 0.9,
        nextState: state,
        done: false,
        timestamp: Date.now(),
        metadata: {
          userId: 'user123',
          sessionId: 'session456',
          taskType: 'coding',
        },
      };

      await optimizer1.updatePolicy(experience);

      const exported = optimizer1.exportPolicy();
      expect(exported.qTable).toBeDefined();

      const optimizer2 = new PolicyOptimizer();
      optimizer2.importPolicy(exported);

      const stats = optimizer2.getPolicyStats();
      expect(stats.statesLearned).toBeGreaterThan(0);
    });
  });
});
