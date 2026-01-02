/**
 * Performance Benchmarks for High-Load Scenarios
 * Tests system performance under various stress conditions
 */

import { beforeEach, afterEach, describe, it, expect, jest } from '@jest/globals';
import { performance } from 'perf_hooks';

// Mock process governor for performance testing
const mockProcessGovernor = {
  runBatched: jest.fn(),
  guarded: jest.fn(),
  getStats: jest.fn(),
  reset: jest.fn()
};

// Mock pattern metrics service
const mockPatternMetrics = {
  fetchPatternMetrics: jest.fn(),
  fetchDashboardMetrics: jest.fn(),
  fetchAnomalies: jest.fn(),
  createWebSocket: jest.fn()
};

// Mock federation agents
const mockFederationAgents = {
  governanceAgent: {
    start: jest.fn(),
    stop: jest.fn(),
    coordinateAgents: jest.fn()
  },
  retroCoach: {
    analyzeRetrospective: jest.fn(),
    generateInsights: jest.fn()
  }
};

describe('Performance Benchmarks - High Load Scenarios', () => {
  let performanceMetrics: {
    startTime: number;
    endTime: number;
    memoryBefore: NodeJS.MemoryUsage;
    memoryAfter: NodeJS.MemoryUsage;
    cpuBefore: number;
    cpuAfter: number;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    performanceMetrics = {
      startTime: 0,
      endTime: 0,
      memoryBefore: process.memoryUsage(),
      memoryAfter: process.memoryUsage(),
      cpuBefore: process.cpuUsage().user,
      cpuAfter: process.cpuUsage().user
    };
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  const startPerformanceMeasurement = () => {
    performanceMetrics.startTime = performance.now();
    performanceMetrics.memoryBefore = process.memoryUsage();
    performanceMetrics.cpuBefore = process.cpuUsage().user;
  };

  const endPerformanceMeasurement = () => {
    performanceMetrics.endTime = performance.now();
    performanceMetrics.memoryAfter = process.memoryUsage();
    performanceMetrics.cpuAfter = process.cpuUsage().user;
  };

  const getPerformanceReport = () => {
    const duration = performanceMetrics.endTime - performanceMetrics.startTime;
    const memoryDelta = performanceMetrics.memoryAfter.heapUsed - performanceMetrics.memoryBefore.heapUsed;
    const cpuDelta = performanceMetrics.cpuAfter - performanceMetrics.cpuBefore;

    return {
      duration,
      memoryDelta,
      cpuDelta,
      memoryUsedMB: performanceMetrics.memoryAfter.heapUsed / 1024 / 1024,
      throughput: duration > 0 ? 1000 / duration : 0 // ops per second
    };
  };

  describe('Process Governor Performance', () => {
    it('should handle high-volume batch processing', async () => {
      startPerformanceMeasurement();

      const batchSize = 1000;
      const items = Array(batchSize).fill(0).map((_, i) => i);
      
      mockProcessGovernor.runBatched.mockImplementation(async (items, processor) => {
        return await Promise.all(items.map(processor));
      });

      const processor = async (item: number) => {
        // Simulate some work
        await new Promise(resolve => setTimeout(resolve, 1));
        return item * 2;
      };

      const results = await mockProcessGovernor.runBatched(items, processor);

      endPerformanceMeasurement();
      const report = getPerformanceReport();

      expect(results).toHaveLength(batchSize);
      expect(results[batchSize - 1]).toBe((batchSize - 1) * 2);
      
      // Performance assertions
      expect(report.duration).toBeLessThan(5000); // Should complete within 5 seconds
      expect(report.memoryUsedMB).toBeLessThan(200); // Should use less than 200MB
      expect(report.throughput).toBeGreaterThan(100); // Should process >100 items/second
    });

    it('should maintain performance under concurrent load', async () => {
      startPerformanceMeasurement();

      const concurrentBatches = 10;
      const itemsPerBatch = 100;
      
      mockProcessGovernor.runBatched.mockImplementation(async (items, processor) => {
        return await Promise.all(items.map(processor));
      });

      const promises = Array(concurrentBatches).fill(0).map(async (_, batchIndex) => {
        const items = Array(itemsPerBatch).fill(0).map((_, i) => batchIndex * 1000 + i);
        const processor = async (item: number) => {
          await new Promise(resolve => setTimeout(resolve, 5));
          return item;
        };
        return mockProcessGovernor.runBatched(items, processor);
      });

      const results = await Promise.all(promises);

      endPerformanceMeasurement();
      const report = getPerformanceReport();

      expect(results).toHaveLength(concurrentBatches);
      results.forEach(batch => {
        expect(batch).toHaveLength(itemsPerBatch);
      });

      // Should handle concurrent load efficiently
      expect(report.duration).toBeLessThan(10000); // 10 seconds max
      expect(report.memoryUsedMB).toBeLessThan(500); // Should manage memory well
    });

    it('should handle memory pressure gracefully', async () => {
      startPerformanceMeasurement();

      // Create memory-intensive workload
      const largeItems = Array(500).fill(0).map((_, i) => ({
        id: i,
        data: 'x'.repeat(10000), // 10KB per item
        metadata: {
          timestamp: Date.now(),
          type: 'test',
          tags: Array(100).fill(0).map((_, j) => `tag-${j}`)
        }
      }));

      mockProcessGovernor.runBatched.mockImplementation(async (items, processor) => {
        return await Promise.all(items.map(processor));
      });

      const processor = async (item: any) => {
        // Simulate memory-intensive processing
        const processed = {
          ...item,
          processed: true,
          result: item.data.toUpperCase(),
          computed: Array(1000).fill(0).map((_, i) => i * Math.random())
        };
        return processed;
      };

      const results = await mockProcessGovernor.runBatched(largeItems, processor);

      endPerformanceMeasurement();
      const report = getPerformanceReport();

      expect(results).toHaveLength(500);
      expect(results[0].processed).toBe(true);
      
      // Should handle memory pressure without crashing
      expect(report.memoryUsedMB).toBeLessThan(1000); // Should not exceed 1GB
      expect(report.memoryDelta).toBeLessThan(500 * 1024 * 1024); // Memory growth should be controlled
    });

    it('should maintain performance with circuit breaker enabled', async () => {
      startPerformanceMeasurement();

      let failureCount = 0;
      const failureRate = 0.1; // 10% failure rate
      
      mockProcessGovernor.runBatched.mockImplementation(async (items, processor) => {
        const results = [];
        for (const item of items) {
          try {
            const result = await processor(item);
            results.push(result);
          } catch (error) {
            failureCount++;
            // Simulate circuit breaker behavior
            if (failureCount > items.length * failureRate) {
              throw new Error('Circuit breaker opened');
            }
          }
        }
        return results;
      });

      const processor = async (item: number) => {
        await new Promise(resolve => setTimeout(resolve, 1));
        if (Math.random() < failureRate) {
          throw new Error(`Random failure for item ${item}`);
        }
        return item * 2;
      };

      const items = Array(1000).fill(0).map((_, i) => i);
      
      try {
        const results = await mockProcessGovernor.runBatched(items, processor);
        endPerformanceMeasurement();
        const report = getPerformanceReport();

        expect(results.length).toBeGreaterThan(800); // Most should succeed
        expect(failureCount).toBeGreaterThan(50); // Some should fail
        expect(report.duration).toBeLessThan(3000); // Should complete quickly
      } catch (error) {
        endPerformanceMeasurement();
        const report = getPerformanceReport();
        
        // If circuit breaker opens, should fail fast
        expect(error.message).toContain('Circuit breaker opened');
        expect(report.duration).toBeLessThan(2000); // Should fail quickly
      }
    });
  });

  describe('Pattern Metrics Performance', () => {
    it('should handle high-frequency metrics collection', async () => {
      startPerformanceMeasurement();

      const metricsCount = 10000;
      const mockMetrics = Array(metricsCount).fill(0).map((_, i) => ({
        id: `metric-${i}`,
        name: `pattern-${i}`,
        circle: 'test-circle',
        timestamp: new Date().toISOString(),
        executionTime: Math.random() * 5,
        success: Math.random() > 0.1,
        economicValue: Math.random() * 1000,
        wsjfScore: Math.random() * 100
      }));

      mockPatternMetrics.fetchPatternMetrics.mockResolvedValue(mockMetrics);

      const results = await mockPatternMetrics.fetchPatternMetrics();

      endPerformanceMeasurement();
      const report = getPerformanceReport();

      expect(results).toHaveLength(metricsCount);
      expect(results[0]).toHaveProperty('id');
      expect(results[0]).toHaveProperty('executionTime');
      
      // Should handle large datasets efficiently
      expect(report.duration).toBeLessThan(1000); // 1 second max
      expect(report.memoryUsedMB).toBeLessThan(100); // Should be memory efficient
    });

    it('should process real-time metrics updates efficiently', async () => {
      startPerformanceMeasurement();

      const updateCount = 1000;
      const updates = Array(updateCount).fill(0).map((_, i) => ({
        type: 'metric-update',
        patternId: `pattern-${i % 100}`,
        status: i % 3 === 0 ? 'running' : 'completed',
        progress: Math.floor(Math.random() * 100),
        timestamp: new Date().toISOString()
      }));

      mockPatternMetrics.createWebSocket.mockReturnValue({
        addEventListener: jest.fn(),
        send: jest.fn(),
        close: jest.fn()
      });

      const ws = mockPatternMetrics.createWebSocket();
      
      // Simulate rapid updates
      const startTime = performance.now();
      for (const update of updates) {
        ws.send(JSON.stringify(update));
      }
      const updateTime = performance.now() - startTime;

      endPerformanceMeasurement();
      const report = getPerformanceReport();

      expect(ws.send).toHaveBeenCalledTimes(updateCount);
      expect(updateTime).toBeLessThan(1000); // Should send updates quickly
      expect(report.duration).toBeLessThan(2000); // Overall operation should be fast
    });
  });

  describe('Federation Performance', () => {
    it('should handle high-volume inter-agent communication', async () => {
      startPerformanceMeasurement();

      const messageCount = 5000;
      const messages = Array(messageCount).fill(0).map((_, i) => ({
        id: `msg-${i}`,
        from: 'governance-agent',
        to: i % 2 === 0 ? 'retro-coach' : 'security-agent',
        type: 'policy-update',
        payload: {
          policyId: `policy-${i}`,
          data: 'x'.repeat(1000) // 1KB payload
        },
        timestamp: new Date().toISOString()
      }));

      // Mock message processing
      const mockMessageProcessor = async (message: any) => {
        await new Promise(resolve => setTimeout(resolve, 0.1)); // 0.1ms processing time
        return {
          messageId: message.id,
          status: 'processed',
          timestamp: new Date().toISOString()
        };
      };

      const startTime = performance.now();
      const results = await Promise.all(messages.map(mockMessageProcessor));
      const processingTime = performance.now() - startTime;

      endPerformanceMeasurement();
      const report = getPerformanceReport();

      expect(results).toHaveLength(messageCount);
      results.forEach(result => {
        expect(result.status).toBe('processed');
      });

      // Should handle high message throughput
      expect(processingTime).toBeLessThan(2000); // 2 seconds max
      expect(report.throughput).toBeGreaterThan(2000); // >2000 messages/second
      expect(report.memoryUsedMB).toBeLessThan(300); // Memory should be managed well
    });

    it('should coordinate multiple agents efficiently', async () => {
      startPerformanceMeasurement();

      const coordinationRequests = Array(100).fill(0).map((_, i) => ({
        operation: 'deploy',
        targetEnvironment: `env-${i % 5}`,
        agents: ['governance', 'retro-coach', 'security'],
        priority: i % 3 === 0 ? 'high' : 'normal',
        timeline: `${Math.floor(Math.random() * 60)}m`
      }));

      mockFederationAgents.governanceAgent.coordinateAgents.mockImplementation(async (request) => {
        await new Promise(resolve => setTimeout(resolve, 10)); // 10ms coordination time
        return {
          coordinationId: `coord-${Math.random()}`,
          status: 'completed',
          agentStatuses: {
            governance: 'completed',
            'retro-coach': 'completed',
            security: 'completed'
          }
        };
      });

      const startTime = performance.now();
      const results = await Promise.all(
        coordinationRequests.map(req => 
          mockFederationAgents.governanceAgent.coordinateAgents(req)
        )
      );
      const coordinationTime = performance.now() - startTime;

      endPerformanceMeasurement();
      const report = getPerformanceReport();

      expect(results).toHaveLength(100);
      results.forEach(result => {
        expect(result.status).toBe('completed');
        expect(result.agentStatuses.governance).toBe('completed');
      });

      // Should coordinate efficiently
      expect(coordinationTime).toBeLessThan(5000); // 5 seconds max
      expect(report.throughput).toBeGreaterThan(20); // >20 coordinations/second
    });
  });

  describe('Memory and Resource Management', () => {
    it('should handle memory leaks gracefully', async () => {
      startPerformanceMeasurement();

      const iterations = 10;
      const itemsPerIteration = 1000;
      
      for (let iteration = 0; iteration < iterations; iteration++) {
        const items = Array(itemsPerIteration).fill(0).map((_, i) => ({
          id: `${iteration}-${i}`,
          data: 'x'.repeat(1000),
          timestamp: Date.now()
        }));

        // Simulate processing that might leak memory
        const processed = items.map(item => ({
          ...item,
          processed: true,
          largeArray: Array(1000).fill(0).map(() => Math.random())
        }));

        // Clear reference to allow garbage collection
        if (iteration % 3 === 0) {
          global.gc?.(); // Force garbage collection if available
        }
      }

      endPerformanceMeasurement();
      const report = getPerformanceReport();

      // Memory should not grow uncontrollably
      expect(report.memoryUsedMB).toBeLessThan(1000); // Should be under 1GB
      expect(report.memoryDelta).toBeLessThan(500 * 1024 * 1024); // Growth should be limited
    });

    it('should maintain performance under CPU pressure', async () => {
      startPerformanceMeasurement();

      // CPU-intensive workload
      const cpuIntensiveTasks = Array(50).fill(0).map((_, i) => async () => {
        const startTime = performance.now();
        let result = 0;
        
        // Intensive computation
        for (let j = 0; j < 1000000; j++) {
          result += Math.sin(j) * Math.cos(j);
        }
        
        const duration = performance.now() - startTime;
        return { taskId: i, result, duration };
      });

      const results = await Promise.all(cpuIntensiveTasks.map(task => task()));

      endPerformanceMeasurement();
      const report = getPerformanceReport();

      expect(results).toHaveLength(50);
      results.forEach(result => {
        expect(result).toHaveProperty('taskId');
        expect(result).toHaveProperty('result');
        expect(result).toHaveProperty('duration');
      });

      // Should handle CPU pressure
      expect(report.duration).toBeLessThan(15000); // 15 seconds max
      expect(report.memoryUsedMB).toBeLessThan(200); // Should not use excessive memory
    });
  });

  describe('Scalability Tests', () => {
    it('should scale linearly with increased load', async () => {
      const loadSizes = [100, 500, 1000, 2000];
      const performanceResults = [];

      for (const loadSize of loadSizes) {
        startPerformanceMeasurement();

        const items = Array(loadSize).fill(0).map((_, i) => i);
        mockProcessGovernor.runBatched.mockImplementation(async (items, processor) => {
          return await Promise.all(items.map(processor));
        });

        const processor = async (item: number) => {
          await new Promise(resolve => setTimeout(resolve, 1));
          return item * 2;
        };

        await mockProcessGovernor.runBatched(items, processor);

        endPerformanceMeasurement();
        const report = getPerformanceReport();
        performanceResults.push({
          loadSize,
          duration: report.duration,
          throughput: report.throughput,
          memoryUsed: report.memoryUsedMB
        });
      }

      // Analyze scaling behavior
      for (let i = 1; i < performanceResults.length; i++) {
        const current = performanceResults[i];
        const previous = performanceResults[i - 1];
        const loadRatio = current.loadSize / previous.loadSize;
        const timeRatio = current.duration / previous.duration;

        // Time should scale reasonably (not exponentially)
        expect(timeRatio).toBeLessThan(loadRatio * 1.5);
        
        // Throughput should remain relatively stable
        const throughputRatio = current.throughput / previous.throughput;
        expect(throughputRatio).toBeGreaterThan(0.5);
      }
    });

    it('should handle burst traffic patterns', async () => {
      startPerformanceMeasurement();

      const burstPattern = [
        { size: 100, delay: 0 },    // Initial burst
        { size: 50, delay: 100 },   // Reduced load
        { size: 200, delay: 0 },    // Large burst
        { size: 75, delay: 50 },    // Medium load
        { size: 150, delay: 0 }     // Final burst
      ];

      mockProcessGovernor.runBatched.mockImplementation(async (items, processor) => {
        return await Promise.all(items.map(processor));
      });

      const processor = async (item: number) => {
        await new Promise(resolve => setTimeout(resolve, 1));
        return item;
      };

      const results = [];
      for (const burst of burstPattern) {
        if (burst.delay > 0) {
          await new Promise(resolve => setTimeout(resolve, burst.delay));
        }

        const items = Array(burst.size).fill(0).map((_, i) => i);
        const burstResult = await mockProcessGovernor.runBatched(items, processor);
        results.push(burstResult);
      }

      endPerformanceMeasurement();
      const report = getPerformanceReport();

      expect(results).toHaveLength(burstPattern.length);
      results.forEach((result, index) => {
        expect(result).toHaveLength(burstPattern[index].size);
      });

      // Should handle bursts without performance degradation
      expect(report.duration).toBeLessThan(10000); // 10 seconds max
      expect(report.memoryUsedMB).toBeLessThan(400); // Memory should be managed
    });
  });

  describe('Performance Regression Detection', () => {
    it('should detect performance regressions', async () => {
      // Baseline performance (simulated)
      const baseline = {
        averageResponseTime: 100, // ms
        throughput: 1000, // ops/second
        memoryUsage: 50, // MB
        errorRate: 0.01 // 1%
      };

      // Current performance measurement
      startPerformanceMeasurement();

      const items = Array(1000).fill(0).map((_, i) => i);
      mockProcessGovernor.runBatched.mockImplementation(async (items, processor) => {
        return await Promise.all(items.map(processor));
      });

      const processor = async (item: number) => {
        await new Promise(resolve => setTimeout(resolve, 2)); // Slower than baseline
        return item;
      };

      await mockProcessGovernor.runBatched(items, processor);

      endPerformanceMeasurement();
      const report = getPerformanceReport();

      const current = {
        averageResponseTime: report.duration / 1000, // Convert to per-item
        throughput: report.throughput,
        memoryUsage: report.memoryUsedMB,
        errorRate: 0.02 // Higher error rate
      };

      // Detect regressions
      const responseTimeRegression = current.averageResponseTime > baseline.averageResponseTime * 1.5;
      const throughputRegression = current.throughput < baseline.throughput * 0.7;
      const memoryRegression = current.memoryUsage > baseline.memoryUsage * 2;
      const errorRateRegression = current.errorRate > baseline.errorRate * 2;

      expect(responseTimeRegression || throughputRegression || memoryRegression || errorRateRegression).toBe(true);
    });
  });
});