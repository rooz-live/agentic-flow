/**
 * Unit Tests for Process Governor Optimizations
 * Tests all enhanced features including:
 * - Adaptive throttling based on CPU load
 * - Circuit breaker functionality
 * - Token bucket rate limiting
 * - Predictive load analysis
 * - Process dependency optimization
 */

import { beforeEach, afterEach, describe, it, expect, jest } from '@jest/globals';

// Mock OS and process modules for controlled testing - must be defined before jest.mock
const mockCpus = jest.fn();
const mockLoadavg = jest.fn();

jest.mock('os', () => ({
  cpus: mockCpus,
  loadavg: mockLoadavg
}));
jest.mock('fs', () => ({
  existsSync: jest.fn(() => false),
  mkdirSync: jest.fn(),
  appendFileSync: jest.fn()
}));

import {
  runBatched,
  guarded,
  drain,
  getStats,
  reset,
  isCircuitClosed,
  recordSuccess,
  recordFailure,
  getCircuitBreakerState,
  CircuitBreakerOpenError,
  config
} from '../../src/runtime/processGovernor';

describe('Process Governor - Core Functionality', () => {
  beforeEach(() => {
    reset();
    jest.clearAllMocks();
    
    // Mock system with 4 CPUs and moderate load
    mockCpus.mockReturnValue(Array(4).fill({}));
    mockLoadavg.mockReturnValue([1.6, 1.5, 1.4]); // 40% load on 4 CPUs
  });

  afterEach(async () => {
    await drain();
    reset();
  });

  describe('Basic Batch Processing', () => {
    it('should process simple batch successfully', async () => {
      const items = [1, 2, 3];
      const processor = async (item: number) => item * 2;
      
      const results = await runBatched(items, processor);
      
      expect(results).toEqual([2, 4, 6]);
      const stats = getStats();
      expect(stats.completedWork).toBe(3);
      expect(stats.failedWork).toBe(0);
    });

    it('should handle empty batch', async () => {
      const results = await runBatched([], async (item) => item);
      expect(results).toEqual([]);
    });

    it('should respect batch size configuration', async () => {
      const items = [1, 2, 3, 4, 5];
      const processor = async (item: number) => item;
      
      const results = await runBatched(items, processor, { batchSize: 2 });
      
      expect(results).toEqual([1, 2, 3, 4, 5]);
      // Should have created 3 batches: [1,2], [3,4], [5]
    });
  });

  describe('Error Handling and Retries', () => {
    it('should retry failed operations', async () => {
      let attempts = 0;
      const processor = async (item: number) => {
        attempts++;
        if (attempts <= 2) {
          throw new Error(`Attempt ${attempts} failed`);
        }
        return item * 2;
      };

      const results = await runBatched([1], processor, { maxRetries: 3 });
      
      expect(results).toEqual([2]);
      expect(attempts).toBe(3);
    });

    it('should fail after max retries', async () => {
      const processor = async () => {
        throw new Error('Always fails');
      };

      await expect(runBatched([1], processor, { maxRetries: 2 }))
        .rejects.toThrow('Always fails');
      
      const stats = getStats();
      expect(stats.failedWork).toBe(1);
    });

    it('should handle mixed success/failure in batch', async () => {
      const processor = async (item: number) => {
        if (item === 2) throw new Error('Item 2 fails');
        return item * 2;
      };

      await expect(runBatched([1, 2, 3], processor))
        .rejects.toThrow('Item 2 fails');
    });
  });

  describe('Circuit Breaker', () => {
    beforeEach(() => {
      // Enable circuit breaker for these tests
      process.env.AF_CIRCUIT_BREAKER_ENABLED = 'true';
      process.env.AF_CIRCUIT_BREAKER_THRESHOLD = '2';
      reset();
    });

    it('should start in closed state', () => {
      expect(isCircuitClosed()).toBe(true);
      const state = getCircuitBreakerState();
      expect(state.state).toBe('CLOSED');
    });

    it('should open after failure threshold', async () => {
      const processor = async () => {
        recordFailure();
        throw new Error('Simulated failure');
      };

      // First failure - should stay closed
      try {
        await guarded(processor);
      } catch (e) {
        // Expected
      }
      expect(isCircuitClosed()).toBe(true);

      // Second failure - should open circuit
      try {
        await guarded(processor);
      } catch (e) {
        // Expected
      }
      expect(isCircuitClosed()).toBe(false);
    });

    it('should reject operations when open', async () => {
      // Force circuit open
      recordFailure();
      recordFailure();
      recordFailure(); // Third failure triggers open

      expect(isCircuitClosed()).toBe(false);

      const processor = async () => 'success';
      await expect(guarded(processor)).rejects.toThrow(CircuitBreakerOpenError);
    });

    it('should recover after successes', async () => {
      // Force circuit open
      recordFailure();
      recordFailure();
      recordFailure();

      // Mock time passage for cooldown
      const originalDate = Date.now;
      const mockTime = Date.now() + 35000; // 35 seconds later
      Date.now = jest.fn(() => mockTime);

      // Should be half-open now
      expect(isCircuitClosed()).toBe(true);

      // Success should close circuit
      const processor = async () => {
        recordSuccess();
        return 'success';
      };

      await guarded(processor);
      recordSuccess();
      recordSuccess(); // Multiple successes to close

      const state = getCircuitBreakerState();
      expect(state.state).toBe('CLOSED');

      // Restore original Date
      Date.now = originalDate;
    });
  });

  describe('Rate Limiting', () => {
    beforeEach(() => {
      process.env.AF_RATE_LIMIT_ENABLED = 'true';
      process.env.AF_TOKENS_PER_SECOND = '5';
      process.env.AF_MAX_BURST = '10';
      reset();
    });

    it('should respect token bucket limits', async () => {
      const startTime = Date.now();
      const items = Array(15).fill(0).map((_, i) => i);
      const processor = async (item: number) => item;

      await runBatched(items, processor);
      
      const duration = Date.now() - startTime;
      // Should take at least 2 seconds due to rate limiting (15 tokens, 5 per second, 10 burst)
      expect(duration).toBeGreaterThan(1500);
    });
  });

  describe('CPU Load Management', () => {
    it('should throttle under high CPU load', async () => {
      // Mock high CPU load (90% on 4 CPUs)
      mockLoadavg.mockReturnValue([3.6, 3.5, 3.4]);

      const startTime = Date.now();
      const processor = async (item: number) => {
        // Simulate work
        await new Promise(resolve => setTimeout(resolve, 50));
        return item;
      };

      await runBatched([1, 2, 3], processor);
      
      const duration = Date.now() - startTime;
      // Should take longer due to throttling
      expect(duration).toBeGreaterThan(300);
    });

    it('should allow normal processing under low load', async () => {
      // Mock low CPU load (10% on 4 CPUs)
      mockLoadavg.mockReturnValue([0.4, 0.3, 0.2]);

      const startTime = Date.now();
      const processor = async (item: number) => item;

      await runBatched([1, 2, 3], processor);
      
      const duration = Date.now() - startTime;
      // Should complete quickly
      expect(duration).toBeLessThan(200);
    });
  });

  describe('Guarded Operations', () => {
    it('should execute single guarded operation', async () => {
      const processor = async () => 'guarded-result';
      
      const result = await guarded(processor);
      
      expect(result).toBe('guarded-result');
      const stats = getStats();
      expect(stats.completedWork).toBe(1);
    });

    it('should handle guarded operation failure', async () => {
      const processor = async () => {
        throw new Error('Guarded failure');
      };

      await expect(guarded(processor)).rejects.toThrow('Guarded failure');
      
      const stats = getStats();
      expect(stats.failedWork).toBe(1);
    });
  });

  describe('Statistics and Monitoring', () => {
    it('should track work statistics correctly', async () => {
      const processor = async (item: number) => {
        if (item === 2) throw new Error('Fail item 2');
        return item * 2;
      };

      try {
        await runBatched([1, 2, 3, 4], processor, { maxRetries: 1 });
      } catch (e) {
        // Expected failure
      }

      const stats = getStats();
      expect(stats.completedWork).toBeGreaterThan(0);
      expect(stats.failedWork).toBeGreaterThan(0);
      expect(stats.incidents.length).toBeGreaterThan(0);
    });

    it('should reset state correctly', () => {
      // Generate some activity
      recordFailure();
      recordSuccess();
      
      let stats = getStats();
      expect(stats.circuitBreaker.failures).toBe(1);
      expect(stats.circuitBreaker.successes).toBe(1);

      reset();
      
      stats = getStats();
      expect(stats.circuitBreaker.failures).toBe(0);
      expect(stats.circuitBreaker.successes).toBe(0);
      expect(stats.activeWork).toBe(0);
      expect(stats.queuedWork).toBe(0);
    });
  });

  describe('Configuration', () => {
    it('should export configuration values', () => {
      expect(config.AF_BATCH_SIZE).toBeDefined();
      expect(config.AF_MAX_WIP).toBeDefined();
      expect(config.AF_CPU_HEADROOM_TARGET).toBeDefined();
      expect(config.AF_RATE_LIMIT_ENABLED).toBeDefined();
      expect(config.AF_CIRCUIT_BREAKER_ENABLED).toBeDefined();
    });

    it('should respect environment variable overrides', () => {
      process.env.AF_BATCH_SIZE = '10';
      process.env.AF_MAX_WIP = '20';
      
      // Re-import to test environment variable handling
      jest.resetModules();
      const newConfig = require('../../src/runtime/processGovernor').config;
      
      expect(newConfig.AF_BATCH_SIZE).toBe(10);
      expect(newConfig.AF_MAX_WIP).toBe(20);
    });
  });
});

describe('Process Governor - Advanced Features', () => {
  beforeEach(() => {
    reset();
    jest.clearAllMocks();
    
    // Enable advanced features
    process.env.AF_ADAPTIVE_THROTTLING_ENABLED = 'true';
    process.env.AF_PREDICTIVE_THROTTLING = 'true';
    process.env.AF_CPU_WARNING_THRESHOLD = '0.7';
    process.env.AF_CPU_CRITICAL_THRESHOLD = '0.9';
    
    mockCpus.mockReturnValue(Array(4).fill({}));
    mockLoadavg.mockReturnValue([1.6, 1.5, 1.4]);
  });

  afterEach(async () => {
    await drain();
    reset();
  });

  describe('Adaptive Throttling', () => {
    it('should adjust throttling based on CPU load', async () => {
      // Start with moderate load
      mockLoadavg.mockReturnValue([1.6, 1.5, 1.4]);
      
      const processor = async (item: number) => {
        // Increase load mid-processing
        if (item === 2) {
          mockLoadavg.mockReturnValue([3.2, 3.1, 3.0]); // 80% load
        }
        return item;
      };

      const startTime = Date.now();
      await runBatched([1, 2, 3, 4], processor);
      const duration = Date.now() - startTime;

      // Should take longer due to adaptive throttling
      expect(duration).toBeGreaterThan(200);
    });
  });

  describe('Predictive Load Analysis', () => {
    it('should build load history for predictions', async () => {
      const processor = async (item: number) => item;
      
      await runBatched([1, 2, 3], processor);
      
      const stats = getStats();
      // Should have load history entries
      expect((stats as any).loadHistory).toBeDefined();
      expect((stats as any).loadHistory.length).toBeGreaterThan(0);
    });
  });

  describe('Process Dependency Optimization', () => {
    it('should analyze dependencies when enabled', async () => {
      process.env.AF_DEPENDENCY_ANALYSIS_ENABLED = 'true';
      process.env.AF_EXECUTION_ORDER_OPTIMIZATION = 'true';
      
      const processor = async (item: number) => item;
      const items = [1, 2, 3, 4, 5, 6];
      
      const startTime = Date.now();
      await runBatched(items, processor);
      const duration = Date.now() - startTime;

      // Should complete successfully with dependency analysis
      expect(duration).toBeGreaterThan(0);
      
      const stats = getStats();
      expect(stats.incidents.some(i => i.type === 'DEPENDENCY_ANALYSIS')).toBe(true);
    });
  });
});

describe('Process Governor - Performance Benchmarks', () => {
  beforeEach(() => {
    reset();
    mockCpus.mockReturnValue(Array(8).fill({}));
    mockLoadavg.mockReturnValue([2.0, 2.0, 2.0]); // 25% load on 8 CPUs
  });

  it('should handle high-volume batch processing', async () => {
    const items = Array(100).fill(0).map((_, i) => i);
    const processor = async (item: number) => item * 2;
    
    const startTime = Date.now();
    const results = await runBatched(items, processor);
    const duration = Date.now() - startTime;
    
    expect(results).toHaveLength(100);
    expect(results[99]).toBe(198);
    
    // Performance target: should process 100 items in reasonable time
    expect(duration).toBeLessThan(5000); // 5 seconds max
    
    const stats = getStats();
    expect(stats.completedWork).toBe(100);
    expect(stats.failedWork).toBe(0);
  });

  it('should maintain performance under concurrent load', async () => {
    const concurrentBatches = 5;
    const itemsPerBatch = 20;
    
    const promises = Array(concurrentBatches).fill(0).map(async (_, batchIndex) => {
      const items = Array(itemsPerBatch).fill(0).map((_, i) => batchIndex * 100 + i);
      const processor = async (item: number) => item;
      return runBatched(items, processor);
    });

    const startTime = Date.now();
    const results = await Promise.all(promises);
    const duration = Date.now() - startTime;

    expect(results).toHaveLength(concurrentBatches);
    results.forEach(batch => {
      expect(batch).toHaveLength(itemsPerBatch);
    });

    // Should handle concurrent load efficiently
    expect(duration).toBeLessThan(10000); // 10 seconds max
  });
});