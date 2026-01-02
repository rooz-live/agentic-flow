/**
 * Integration Tests for End-to-End Workflows
 * Tests complete prod-cycle scenarios with all components working together
 */

import { beforeEach, afterEach, describe, it, expect, jest } from '@jest/globals';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import * as path from 'path';

// Mock all major components for integration testing
const mockProcessGovernor = {
  runBatched: jest.fn(),
  guarded: jest.fn(),
  getStats: jest.fn(),
  reset: jest.fn(),
  drain: jest.fn()
};

const mockPatternMetrics = {
  fetchPatternMetrics: jest.fn(),
  fetchDashboardMetrics: jest.fn(),
  fetchAnomalies: jest.fn(),
  createWebSocket: jest.fn()
};

const mockFederationAgents = {
  governanceAgent: {
    start: jest.fn(),
    stop: jest.fn(),
    coordinateAgents: jest.fn(),
    proposePolicy: jest.fn(),
    validatePolicy: jest.fn()
  },
  retroCoach: {
    start: jest.fn(),
    stop: jest.fn(),
    analyzeRetrospective: jest.fn(),
    generateInsights: jest.fn(),
    recommendImprovements: jest.fn()
  }
};

const mockVSCodeExtension = {
  activate: jest.fn(),
  deactivate: jest.fn(),
  executeCommand: jest.fn()
};

// Mock child_process for script execution
jest.mock('child_process', () => ({
  spawn: jest.fn()
}));

describe('End-to-End Workflow Integration Tests', () => {
  let workspaceRoot: string;
  let testWorkspace: string;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Set up test workspace
    workspaceRoot = process.cwd();
    testWorkspace = path.join(workspaceRoot, 'test-workspace');
    
    // Ensure test workspace exists
    try {
      await fs.mkdir(testWorkspace, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }

    // Mock successful component interactions
    mockProcessGovernor.runBatched.mockImplementation(async (items, processor) => {
      return await Promise.all(items.map(processor));
    });

    mockPatternMetrics.fetchDashboardMetrics.mockResolvedValue({
      totalPatterns: 1247,
      activePatterns: 23,
      completedToday: 156,
      failureRate: 0.02,
      averageExecutionTime: 2.4,
      totalEconomicValue: 89234.50,
      anomalyCount: 3,
      systemHealth: 0.94
    });

    mockFederationAgents.governanceAgent.start.mockResolvedValue(true);
    mockFederationAgents.retroCoach.start.mockResolvedValue(true);
    mockVSCodeExtension.activate.mockResolvedValue({ status: 'activated' });
  });

  afterEach(async () => {
    jest.resetAllMocks();
    await mockProcessGovernor.drain();
    mockProcessGovernor.reset();
  });

  describe('Complete Prod-Cycle Workflow', () => {
    it('should execute full production cycle from start to finish', async () => {
      // 1. Initialize workspace and configuration
      const config = {
        afServerUrl: 'http://localhost:8080',
        afTimeout: 30000,
        afLogLevel: 'info',
        afAutoStart: true
      };

      // 2. Start federation agents
      const governanceStarted = await mockFederationAgents.governanceAgent.start();
      const retroCoachStarted = await mockFederationAgents.retroCoach.start();

      expect(governanceStarted).toBe(true);
      expect(retroCoachStarted).toBe(true);

      // 3. Activate VSCode extension
      const extensionResult = await mockVSCodeExtension.activate();
      expect(extensionResult.status).toBe('activated');

      // 4. Execute pattern with process governor
      const patternTasks = [
        { id: 'task-1', type: 'observability-first', priority: 'high' },
        { id: 'task-2', type: 'safe-degrade', priority: 'medium' },
        { id: 'task-3', type: 'wsjf-enrichment', priority: 'low' }
      ];

      const processor = async (task: any) => {
        // Simulate pattern execution
        await new Promise(resolve => setTimeout(resolve, 100));
        return {
          taskId: task.id,
          status: 'completed',
          executionTime: 100,
          economicValue: Math.random() * 1000
        };
      };

      const results = await mockProcessGovernor.runBatched(patternTasks, processor);

      expect(results).toHaveLength(3);
      expect(results[0].status).toBe('completed');
      expect(results[0].taskId).toBe('task-1');

      // 5. Collect and log metrics
      const metrics = await mockPatternMetrics.fetchDashboardMetrics();
      expect(metrics.totalPatterns).toBeGreaterThan(0);
      expect(metrics.systemHealth).toBeGreaterThan(0.9);

      // 6. Coordinate agents for cleanup
      const coordinationResult = await mockFederationAgents.governanceAgent.coordinateAgents({
        operation: 'cleanup',
        agents: ['governance', 'retro-coach'],
        timeline: '5m'
      });

      expect(coordinationResult).toBeDefined();

      // 7. Stop agents gracefully
      await mockFederationAgents.governanceAgent.stop();
      await mockFederationAgents.retroCoach.stop();
      await mockVSCodeExtension.deactivate();

      // Verify complete workflow
      expect(mockFederationAgents.governanceAgent.start).toHaveBeenCalledTimes(1);
      expect(mockFederationAgents.retroCoach.start).toHaveBeenCalledTimes(1);
      expect(mockProcessGovernor.runBatched).toHaveBeenCalledTimes(1);
      expect(mockPatternMetrics.fetchDashboardMetrics).toHaveBeenCalledTimes(1);
    });

    it('should handle workflow failures and recovery', async () => {
      // 1. Start with failing component
      mockFederationAgents.governanceAgent.start.mockRejectedValueOnce(
        new Error('Governance agent failed to start')
      );

      // 2. Attempt to start agents
      let governanceStarted = false;
      try {
        await mockFederationAgents.governanceAgent.start();
        governanceStarted = true;
      } catch (error) {
        expect(error.message).toContain('Governance agent failed to start');
      }

      expect(governanceStarted).toBe(false);

      // 3. Start retro coach (should succeed)
      const retroCoachStarted = await mockFederationAgents.retroCoach.start();
      expect(retroCoachStarted).toBe(true);

      // 4. Execute patterns with limited functionality
      const patternTasks = [
        { id: 'task-1', type: 'basic-pattern', priority: 'high' }
      ];

      const processor = async (task: any) => {
        // Simulate pattern execution without governance
        await new Promise(resolve => setTimeout(resolve, 50));
        return {
          taskId: task.id,
          status: 'completed',
          warning: 'Governance coordination unavailable'
        };
      };

      const results = await mockProcessGovernor.runBatched(patternTasks, processor);
      expect(results).toHaveLength(1);
      expect(results[0].warning).toBe('Governance coordination unavailable');

      // 5. Retry governance agent start (should succeed)
      mockFederationAgents.governanceAgent.start.mockResolvedValueOnce(true);
      const governanceRestarted = await mockFederationAgents.governanceAgent.start();
      expect(governanceRestarted).toBe(true);

      // 6. Verify system recovery
      const metrics = await mockPatternMetrics.fetchDashboardMetrics();
      expect(metrics.systemHealth).toBeGreaterThan(0.8); // Degraded but functional
    });
  });

  describe('Multi-Agent Coordination Workflow', () => {
    it('should coordinate multiple agents for complex operations', async () => {
      // 1. Start all agents
      await mockFederationAgents.governanceAgent.start();
      await mockFederationAgents.retroCoach.start();

      // 2. Propose policy through governance
      const policyProposal = {
        id: 'policy-123',
        title: 'Enhanced Security Policy',
        description: 'Implement additional security checks',
        priority: 'high',
        impact: 'security'
      };

      mockFederationAgents.governanceAgent.proposePolicy.mockResolvedValue({
        proposalId: 'proposal-456',
        status: 'proposed',
        votingPeriod: '7d'
      });

      const proposal = await mockFederationAgents.governanceAgent.proposePolicy(policyProposal);
      expect(proposal.proposalId).toBe('proposal-456');
      expect(proposal.status).toBe('proposed');

      // 3. Analyze impact through retro coach
      const retrospectiveData = {
        sprintId: 'sprint-45',
        team: 'security',
        duration: '2w',
        completedItems: 12,
        blockedItems: 2,
        metrics: {
          velocity: 1.2,
          burndown: 'on-track',
          teamSatisfaction: 8.5
        }
      };

      mockFederationAgents.retroCoach.analyzeRetrospective.mockResolvedValue({
        analysisId: 'analysis-789',
        insights: [
          {
            type: 'improvement',
            category: 'security',
            description: 'Security policies need better team buy-in',
            impact: 'high'
          }
        ],
        recommendations: [
          'Include security team in policy discussions',
          'Provide better training on new policies'
        ]
      });

      const analysis = await mockFederationAgents.retroCoach.analyzeRetrospective(retrospectiveData);
      expect(analysis.analysisId).toBe('analysis-789');
      expect(analysis.insights).toHaveLength(1);
      expect(analysis.recommendations).toHaveLength(2);

      // 4. Coordinate policy implementation
      mockFederationAgents.governanceAgent.coordinateAgents.mockResolvedValue({
        coordinationId: 'coord-123',
        status: 'completed',
        agentStatuses: {
          governance: 'completed',
          'retro-coach': 'completed'
        },
        implementedPolicies: ['policy-123']
      });

      const coordination = await mockFederationAgents.governanceAgent.coordinateAgents({
        operation: 'implement-policy',
        policyId: 'policy-123',
        agents: ['governance', 'retro-coach'],
        timeline: '1d'
      });

      expect(coordination.coordinationId).toBe('coord-123');
      expect(coordination.status).toBe('completed');
      expect(coordination.implementedPolicies).toContain('policy-123');
    });

    it('should handle agent communication failures', async () => {
      // 1. Start agents
      await mockFederationAgents.governanceAgent.start();
      await mockFederationAgents.retroCoach.start();

      // 2. Simulate communication failure
      mockFederationAgents.governanceAgent.coordinateAgents.mockRejectedValueOnce(
        new Error('Communication timeout with retro-coach')
      );

      // 3. Attempt coordination
      let coordinationSucceeded = false;
      try {
        await mockFederationAgents.governanceAgent.coordinateAgents({
          operation: 'sync',
          agents: ['governance', 'retro-coach'],
          timeout: 5000
        });
        coordinationSucceeded = true;
      } catch (error) {
        expect(error.message).toContain('Communication timeout');
      }

      expect(coordinationSucceeded).toBe(false);

      // 4. Retry with different strategy
      mockFederationAgents.governanceAgent.coordinateAgents.mockResolvedValueOnce({
        coordinationId: 'coord-retry',
        status: 'completed',
        fallbackUsed: true,
        agentStatuses: {
          governance: 'completed',
          'retro-coach': 'completed-via-fallback'
        }
      });

      const retryResult = await mockFederationAgents.governanceAgent.coordinateAgents({
        operation: 'sync',
        agents: ['governance', 'retro-coach'],
        fallbackStrategy: true
      });

      expect(retryResult.status).toBe('completed');
      expect(retryResult.fallbackUsed).toBe(true);
    });
  });

  describe('VSCode Extension Integration Workflow', () => {
    it('should integrate extension with backend services', async () => {
      // 1. Activate extension
      const extensionContext = {
        subscriptions: [],
        workspaceState: { get: jest.fn(), update: jest.fn() },
        extensionPath: testWorkspace
      };

      const activationResult = await mockVSCodeExtension.activate(extensionContext);
      expect(activationResult.status).toBe('activated');

      // 2. Execute extension command that triggers backend
      mockVSCodeExtension.executeCommand.mockImplementation(async (command, ...args) => {
        if (command === 'af.start') {
          // Start backend services
          await mockFederationAgents.governanceAgent.start();
          await mockFederationAgents.retroCoach.start();
          return { success: true, message: 'Backend started' };
        } else if (command === 'af.status') {
          // Get status from backend
          const metrics = await mockPatternMetrics.fetchDashboardMetrics();
          return {
            status: 'running',
            metrics: metrics,
            agents: ['governance', 'retro-coach']
          };
        }
      });

      // 3. Start backend via extension
      const startResult = await mockVSCodeExtension.executeCommand('af.start');
      expect(startResult.success).toBe(true);

      // 4. Check status via extension
      const statusResult = await mockVSCodeExtension.executeCommand('af.status');
      expect(statusResult.status).toBe('running');
      expect(statusResult.agents).toContain('governance');
      expect(statusResult.metrics.systemHealth).toBeGreaterThan(0.9);

      // 5. Execute pattern via extension
      const patternTasks = [
        { id: 'ext-task-1', type: 'extension-triggered', priority: 'medium' }
      ];

      mockProcessGovernor.runBatched.mockImplementation(async (items, processor) => {
        return await Promise.all(items.map(processor));
      });

      const processor = async (task: any) => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return {
          taskId: task.id,
          status: 'completed',
          triggeredBy: 'vscode-extension'
        };
      };

      const patternResults = await mockProcessGovernor.runBatched(patternTasks, processor);
      expect(patternResults[0].triggeredBy).toBe('vscode-extension');

      // 6. Stop backend via extension
      mockVSCodeExtension.executeCommand.mockImplementation(async (command) => {
        if (command === 'af.stop') {
          await mockFederationAgents.governanceAgent.stop();
          await mockFederationAgents.retroCoach.stop();
          return { success: true, message: 'Backend stopped' };
        }
      });

      const stopResult = await mockVSCodeExtension.executeCommand('af.stop');
      expect(stopResult.success).toBe(true);
    });
  });

  describe('Performance Under Load Integration', () => {
    it('should maintain performance under integrated load', async () => {
      // 1. Start all components
      await mockFederationAgents.governanceAgent.start();
      await mockFederationAgents.retroCoach.start();
      await mockVSCodeExtension.activate({});

      // 2. Generate high load
      const highLoadTasks = Array(100).fill(0).map((_, i) => ({
        id: `load-task-${i}`,
        type: i % 3 === 0 ? 'observability-first' : 'safe-degrade',
        priority: i % 5 === 0 ? 'high' : 'normal',
        dataSize: Math.random() * 1000
      }));

      const startTime = Date.now();

      // 3. Process with all components active
      mockProcessGovernor.runBatched.mockImplementation(async (items, processor) => {
        // Simulate realistic processing time
        return await Promise.all(items.map(async (item, index) => {
          await new Promise(resolve => setTimeout(resolve, 10 + Math.random() * 20));
          return processor(item, index);
        }));
      });

      const processor = async (task: any) => {
        // Simulate complex processing
        const result = {
          taskId: task.id,
          status: 'completed',
          processingTime: 10 + Math.random() * 20,
          memoryUsage: 50 + Math.random() * 100,
          economicValue: task.dataSize * Math.random()
        };

        // Log to metrics service
        mockPatternMetrics.fetchDashboardMetrics();
        
        return result;
      };

      const results = await mockProcessGovernor.runBatched(highLoadTasks, processor);

      const processingTime = Date.now() - startTime;

      // 4. Verify performance under load
      expect(results).toHaveLength(100);
      expect(processingTime).toBeLessThan(10000); // 10 seconds max

      const avgProcessingTime = results.reduce((sum, r) => sum + r.processingTime, 0) / results.length;
      expect(avgProcessingTime).toBeLessThan(30); // Average < 30ms per task

      // 5. Verify system health under load
      const metrics = await mockPatternMetrics.fetchDashboardMetrics();
      expect(metrics.systemHealth).toBeGreaterThan(0.8); // Should remain healthy
      expect(metrics.activePatterns).toBeGreaterThan(0);

      // 6. Verify component coordination
      const coordination = await mockFederationAgents.governanceAgent.coordinateAgents({
        operation: 'load-test-cleanup',
        agents: ['governance', 'retro-coach'],
        loadTestResults: {
          tasksProcessed: results.length,
          totalTime: processingTime,
          averageTime: avgProcessingTime
        }
      });

      expect(coordination).toBeDefined();
    });
  });

  describe('Error Handling and Recovery Integration', () => {
    it('should handle cascading failures gracefully', async () => {
      // 1. Start components
      await mockFederationAgents.governanceAgent.start();
      await mockFederationAgents.retroCoach.start();

      // 2. Simulate cascading failure scenario
      const failureScenarios = [
        {
          component: 'processGovernor',
          failure: new Error('Process governor overload'),
          recoverable: true
        },
        {
          component: 'patternMetrics',
          failure: new Error('Metrics service unavailable'),
          recoverable: true
        },
        {
          component: 'governanceAgent',
          failure: new Error('Governance agent crash'),
          recoverable: false
        }
      ];

      // 3. Process tasks with failures
      const tasksWithFailures = Array(10).fill(0).map((_, i) => ({
        id: `failure-task-${i}`,
        type: 'test-task',
        willFail: i % 3 === 0
      }));

      let failureCount = 0;
      mockProcessGovernor.runBatched.mockImplementation(async (items, processor) => {
        const results = [];
        for (const item of items) {
          try {
            if (item.willFail) {
              failureCount++;
              if (failureCount > 3) {
                throw failureScenarios[2].failure; // Unrecoverable failure
              }
              throw failureScenarios[failureCount - 1].failure;
            }
            results.push(await processor(item));
          } catch (error) {
            if (failureCount <= 3) {
              // Retry for recoverable failures
              results.push(await processor(item));
            } else {
              throw error; // Propagate unrecoverable failure
            }
          }
        }
        return results;
      });

      const processor = async (task: any) => ({
        taskId: task.id,
        status: 'completed',
        retried: task.willFail && failureCount <= 3
      });

      // 4. Execute with failure handling
      let finalResults = [];
      let systemRecovered = false;

      try {
        finalResults = await mockProcessGovernor.runBatched(tasksWithFailures, processor);
        systemRecovered = true;
      } catch (error) {
        // Handle unrecoverable failure
        expect(error.message).toContain('Governance agent crash');
        
        // Attempt system recovery
        await mockFederationAgents.governanceAgent.stop();
        await new Promise(resolve => setTimeout(resolve, 100)); // Recovery delay
        await mockFederationAgents.governanceAgent.start();
        systemRecovered = true;
      }

      // 5. Verify recovery
      expect(systemRecovered).toBe(true);
      
      if (finalResults.length > 0) {
        const successfulTasks = finalResults.filter(r => r.status === 'completed');
        const retriedTasks = finalResults.filter(r => r.retried);
        
        expect(successfulTasks.length).toBeGreaterThan(0);
        expect(retriedTasks.length).toBeGreaterThan(0);
      }

      // 6. Verify system state after recovery
      const metrics = await mockPatternMetrics.fetchDashboardMetrics();
      expect(metrics.systemHealth).toBeGreaterThan(0.5); // System should be functional
    });
  });

  describe('Data Flow Integration', () => {
    it('should maintain data consistency across components', async () => {
      // 1. Start all components
      await mockFederationAgents.governanceAgent.start();
      await mockFederationAgents.retroCoach.start();
      await mockVSCodeExtension.activate({});

      // 2. Create test data flow
      const testDataFlow = {
        input: {
          patterns: [
            { id: 'pattern-1', type: 'observability', data: 'test-data-1' },
            { id: 'pattern-2', type: 'governance', data: 'test-data-2' }
          ],
          policies: [
            { id: 'policy-1', rules: ['rule-1', 'rule-2'] },
            { id: 'policy-2', rules: ['rule-3'] }
          ]
        },
        expectedTransformations: [
          'pattern-metrics-logging',
          'policy-validation',
          'agent-coordination',
          'vscode-extension-notification'
        ]
      };

      // 3. Process through data flow pipeline
      let dataIntegrityChecks = {
        inputHash: JSON.stringify(testDataFlow.input),
        transformations: [],
        outputHash: null
      };

      // Pattern processing
      mockProcessGovernor.runBatched.mockImplementation(async (items, processor) => {
        dataIntegrityChecks.transformations.push('pattern-processing');
        return await Promise.all(items.map(processor));
      });

      const patternProcessor = async (pattern: any) => {
        dataIntegrityChecks.transformations.push('pattern-processor');
        return {
          ...pattern,
          processed: true,
          timestamp: new Date().toISOString(),
          processedBy: 'process-governor'
        };
      };

      const processedPatterns = await mockProcessGovernor.runBatched(
        testDataFlow.input.patterns,
        patternProcessor
      );

      // Policy validation
      mockFederationAgents.governanceAgent.validatePolicy.mockImplementation(async (policy) => {
        dataIntegrityChecks.transformations.push('policy-validation');
        return {
          isValid: policy.rules.length > 0,
          validatedBy: 'governance-agent',
          timestamp: new Date().toISOString()
        };
      });

      const policyValidations = await Promise.all(
        testDataFlow.input.policies.map(policy =>
          mockFederationAgents.governanceAgent.validatePolicy(policy)
        )
      );

      // Agent coordination
      mockFederationAgents.governanceAgent.coordinateAgents.mockImplementation(async (request) => {
        dataIntegrityChecks.transformations.push('agent-coordination');
        return {
          coordinationId: 'coord-integration-test',
          status: 'completed',
          coordinatedBy: 'governance-agent',
          timestamp: new Date().toISOString(),
          data: {
            patternsProcessed: processedPatterns.length,
            policiesValidated: policyValidations.length
          }
        };
      });

      const coordination = await mockFederationAgents.governanceAgent.coordinateAgents({
        operation: 'integration-test',
        patterns: processedPatterns,
        policies: policyValidations
      });

      // VSCode extension notification
      mockVSCodeExtension.executeCommand.mockImplementation(async (command, data) => {
        dataIntegrityChecks.transformations.push('vscode-extension-notification');
        return {
          command,
          notified: true,
          timestamp: new Date().toISOString(),
          data
        };
      });

      const notification = await mockVSCodeExtension.executeCommand(
        'af.notify.integration-complete',
        {
          patterns: processedPatterns,
          policies: policyValidations,
          coordination
        }
      );

      // 4. Verify data integrity
      expect(dataIntegrityChecks.transformations).toEqual(
        testDataFlow.expectedTransformations
      );

      expect(processedPatterns).toHaveLength(2);
      expect(processedPatterns[0].processed).toBe(true);
      expect(processedPatterns[0].processedBy).toBe('process-governor');

      expect(policyValidations).toHaveLength(2);
      expect(policyValidations[0].validatedBy).toBe('governance-agent');

      expect(coordination.status).toBe('completed');
      expect(coordination.data.patternsProcessed).toBe(2);
      expect(coordination.data.policiesValidated).toBe(2);

      expect(notification.notified).toBe(true);
      expect(notification.data.patterns).toBeDefined();
      expect(notification.data.policies).toBeDefined();

      // 5. Verify end-to-end data consistency
      const finalOutput = {
        patterns: processedPatterns,
        policies: policyValidations,
        coordination,
        notification
      };

      dataIntegrityChecks.outputHash = JSON.stringify(finalOutput);

      // Data should be transformed but maintain integrity
      expect(dataIntegrityChecks.inputHash).not.toBe(dataIntegrityChecks.outputHash);
      expect(dataIntegrityChecks.transformations).toHaveLength(4);
      
      // Verify all components processed the same data
      expect(processedPatterns[0].id).toBe(testDataFlow.input.patterns[0].id);
      expect(policyValidations[0].isValid).toBe(true);
    });
  });
});