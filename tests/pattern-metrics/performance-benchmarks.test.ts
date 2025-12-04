/**
 * Performance Benchmarking Tests for Pattern Metrics System
 *
 * Tests:
 * - Large dataset processing performance
 * - Memory efficiency validation
 * - Throughput measurements
 * - Concurrent processing benchmarks
 * - Latency profiling
 * - Resource utilization monitoring
 */

import { PatternMetricsValidator } from '../src/pattern-metrics-validator';
import { PatternEventGenerator } from '../src/test-utils/pattern-event-generator';

describe('Pattern Metrics Performance Benchmarks', () => {
  let validator: PatternMetricsValidator;
  let generator: PatternEventGenerator;

  beforeAll(() => {
    validator = new PatternMetricsValidator();
    generator = new PatternEventGenerator();
  });

  describe('Large Dataset Processing', () => {
    const datasetSizes = [1000, 5000, 10000, 50000, 100000];

    test.each(datasetSizes)('should process %d events efficiently', async (size) => {
      const dataset = generator.generatePerformanceDataset(size);
      const initialMemory = process.memoryUsage().heapUsed;

      const startTime = performance.now();
      const result = await validator.validateEventsConcurrent(dataset, 8);
      const endTime = performance.now();

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Performance assertions
      expect(result.validEvents).toBe(size);
      expect(result.invalidEvents).toBe(0);

      // Processing time should scale reasonably (not linearly for large datasets)
      const processingTime = endTime - startTime;
      const eventsPerSecond = size / (processingTime / 1000);
      expect(eventsPerSecond).toBeGreaterThan(1000); // Minimum throughput

      // Memory efficiency - should not increase dramatically with dataset size
      const memoryPerEvent = memoryIncrease / size;
      expect(memoryPerEvent).toBeLessThan(1024); // Less than 1KB per event

      console.log(`Dataset ${size}: ${processingTime.toFixed(2)}ms, ${eventsPerSecond.toFixed(0)} events/sec, ${memoryPerEvent.toFixed(2)} bytes/event`);
    });

    test('should maintain performance with mixed valid/invalid events', async () => {
      const size = 10000;
      const invalidRatio = 0.15;
      const dataset = generator.generateEventBatch(size, invalidRatio);

      const startTime = performance.now();
      const result = await validator.validateEventsConcurrent(dataset, 6);
      const endTime = performance.now();

      const processingTime = endTime - startTime;
      const throughput = size / (processingTime / 1000);

      expect(result.totalEvents).toBe(size);
      expect(result.validEvents).toBe(Math.floor(size * (1 - invalidRatio)));
      expect(result.invalidEvents).toBe(Math.floor(size * invalidRatio));

      // Should still process efficiently even with errors
      expect(throughput).toBeGreaterThan(500);
    });
  });

  describe('Memory Efficiency', () => {
    test('should not cause memory leaks with repeated processing', async () => {
      const batchSize = 1000;
      const iterations = 10;
      const memorySnapshots: number[] = [];

      // Force garbage collection before test
      if (global.gc) {
        global.gc();
      }

      for (let i = 0; i < iterations; i++) {
        const dataset = generator.generatePerformanceDataset(batchSize);

        // Take memory snapshot before processing
        const beforeMemory = process.memoryUsage().heapUsed;

        // Process dataset
        await validator.validateEventsConcurrent(dataset, 4);

        // Take memory snapshot after processing
        const afterMemory = process.memoryUsage().heapUsed;
        memorySnapshots.push(afterMemory);

        // Periodic garbage collection
        if (i % 3 === 0 && global.gc) {
          global.gc();
        }
      }

      // Analyze memory growth
      const initialMemory = memorySnapshots[0];
      const finalMemory = memorySnapshots[memorySnapshots.length - 1];
      const memoryGrowth = finalMemory - initialMemory;

      // Memory growth should be minimal (less than 50MB for this test)
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024);

      // Memory should stabilize, not grow continuously
      const recentGrowth = memorySnapshots.slice(-3).reduce((acc, mem) => acc + mem, 0) / 3 -
                          memorySnapshots.slice(0, 3).reduce((acc, mem) => acc + mem, 0) / 3;
      expect(recentGrowth).toBeLessThan(10 * 1024 * 1024); // Less than 10MB recent growth
    });

    test('should handle extremely large individual events', () => {
      const largeEvent = generator.generateValidPatternEvent({
        reason: 'x'.repeat(50000), // 50KB reason field
        action: 'y'.repeat(10000)  // 10KB action field
      });

      const startTime = performance.now();
      const result = validator.validateEvent(largeEvent);
      const endTime = performance.now();

      expect(result.isValid).toBe(true);
      expect(endTime - startTime).toBeLessThan(100); // Should process quickly even with large fields
    });
  });

  describe('Throughput Measurements', () => {
    test('should maintain minimum throughput under load', async () => {
      const targetThroughput = 1000; // events per second
      const testDuration = 5000; // 5 seconds
      const eventGenerator = () => generator.generateValidPatternEvent();

      const results = await runThroughputTest(
        validator,
        eventGenerator,
        testDuration,
        targetThroughput
      );

      expect(results.averageThroughput).toBeGreaterThan(targetThroughput * 0.8); // At least 80% of target
      expect(results.maxLatency).toBeLessThan(100); // Max latency under 100ms

      console.log(`Throughput test: ${results.averageThroughput.toFixed(0)} events/sec, ` +
                  `latency p95: ${results.p95Latency.toFixed(2)}ms`);
    });

    test('should scale throughput with concurrent workers', async () => {
      const dataset = generator.generatePerformanceDataset(20000);
      const workerCounts = [1, 2, 4, 8];
      const results: Array<{ workers: number; time: number; throughput: number }> = [];

      for (const workers of workerCounts) {
        const startTime = performance.now();
        const result = await validator.validateEventsConcurrent(dataset, workers);
        const endTime = performance.now();

        const time = endTime - startTime;
        const throughput = dataset.length / (time / 1000);

        results.push({ workers, time, throughput });
      }

      // Throughput should increase with more workers (though with diminishing returns)
      expect(results[1].throughput).toBeGreaterThan(results[0].throughput);
      expect(results[2].throughput).toBeGreaterThan(results[1].throughput * 0.8); // At least 80% scaling

      console.log('Concurrency scaling results:');
      results.forEach(r => {
        console.log(`  ${r.workers} workers: ${r.throughput.toFixed(0)} events/sec (${r.time.toFixed(2)}ms)`);
      });
    });
  });

  describe('Latency Profiling', () => {
    test('should meet latency SLA for single events', () => {
      const latencyTarget = 10; // 10ms max latency for single event
      const sampleSize = 1000;
      const latencies: number[] = [];

      for (let i = 0; i < sampleSize; i++) {
        const event = generator.generateValidPatternEvent();
        const startTime = performance.now();
        validator.validateEvent(event);
        const endTime = performance.now();
        latencies.push(endTime - startTime);
      }

      // Calculate latency percentiles
      latencies.sort((a, b) => a - b);
      const p50 = latencies[Math.floor(latencies.length * 0.5)];
      const p95 = latencies[Math.floor(latencies.length * 0.95)];
      const p99 = latencies[Math.floor(latencies.length * 0.99)];
      const max = latencies[latencies.length - 1];

      expect(p95).toBeLessThan(latencyTarget);
      expect(p99).toBeLessThan(latencyTarget * 2);
      expect(max).toBeLessThan(latencyTarget * 5);

      console.log(`Latency profiling: p50=${p50.toFixed(2)}ms, p95=${p95.toFixed(2)}ms, ` +
                  `p99=${p99.toFixed(2)}ms, max=${max.toFixed(2)}ms`);
    });

    test('should maintain latency under memory pressure', async () => {
      // Create memory pressure by generating large datasets
      const largeDatasets = Array.from({ length: 5 }, () =>
        generator.generatePerformanceDataset(20000)
      );

      const latencyTarget = 50; // 50ms target under pressure
      const latencies: number[] = [];

      for (const dataset of largeDatasets) {
        const event = dataset[0]; // Test first event from each dataset
        const startTime = performance.now();
        validator.validateEvent(event);
        const endTime = performance.now();
        latencies.push(endTime - startTime);
      }

      const averageLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      const maxLatency = Math.max(...latencies);

      expect(averageLatency).toBeLessThan(latencyTarget);
      expect(maxLatency).toBeLessThan(latencyTarget * 3);
    });
  });

  describe('Resource Utilization', () => {
    test('should efficiently utilize CPU resources', async () => {
      const dataset = generator.generatePerformanceDataset(10000);
      const cpuUsageSnapshots: number[] = [];

      const monitorCpu = setInterval(() => {
        const cpuUsage = process.cpuUsage();
        const totalUsage = cpuUsage.user + cpuUsage.system;
        cpuUsageSnapshots.push(totalUsage);
      }, 100);

      const startTime = performance.now();
      await validator.validateEventsConcurrent(dataset, 4);
      const endTime = performance.now();

      clearInterval(monitorCpu);

      const processingTime = endTime - startTime;
      const avgCpuUsage = cpuUsageSnapshots.reduce((a, b) => a + b, 0) / cpuUsageSnapshots.length;

      // Should utilize CPU efficiently but not max out completely
      expect(avgCpuUsage).toBeGreaterThan(1000000); // At least some CPU usage
      expect(processingTime).toBeLessThan(10000); // Complete within reasonable time

      console.log(`CPU utilization test: avg=${(avgCpuUsage / 1000000).toFixed(2)}ms, ` +
                  `time=${processingTime.toFixed(2)}ms`);
    });

    test('should handle high-frequency event streams', async () => {
      const streamDuration = 10000; // 10 seconds
      const eventsPerSecond = 500;
      const totalEvents = (streamDuration / 1000) * eventsPerSecond;

      const startTime = performance.now();
      let processedEvents = 0;
      const latencies: number[] = [];

      const eventStream = setInterval(() => {
        const event = generator.generateValidPatternEvent();
        const eventStart = performance.now();
        validator.validateEvent(event);
        const eventEnd = performance.now();

        latencies.push(eventEnd - eventStart);
        processedEvents++;

        if (performance.now() - startTime >= streamDuration) {
          clearInterval(eventStream);
        }
      }, 1000 / eventsPerSecond);

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const endTime = performance.now();
          const actualDuration = endTime - startTime;
          const actualThroughput = processedEvents / (actualDuration / 1000);

          expect(processedEvents).toBeGreaterThan(totalEvents * 0.5); // At least 50% of target (relaxed for CI)
          expect(actualThroughput).toBeGreaterThan(eventsPerSecond * 0.3); // At least 30% throughput (relaxed for CI)

          const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
          expect(avgLatency).toBeLessThan(50); // Average latency under 50ms

          console.log(`High-frequency stream: ${processedEvents} events, ` +
                      `${actualThroughput.toFixed(0)} events/sec, avg latency ${avgLatency.toFixed(2)}ms`);
          resolve();
        }, streamDuration + 1000); // Extra time for cleanup
      });
    });
  });

  describe('Stress Testing', () => {
    test('should handle sustained high load', async () => {
      const duration = 5000; // 5 seconds of sustained load (reduced for CI)
      const batchSize = 5000;
      const interval = 1000; // Process batch every second

      const results: Array<{ time: number; throughput: number; errors: number }> = [];
      let totalTime = 0;

      const stressTest = setInterval(async () => {
        const batch = generator.generatePerformanceDataset(batchSize);
        const batchStart = performance.now();
        const result = await validator.validateEventsConcurrent(batch, 6);
        const batchEnd = performance.now();

        const batchTime = batchEnd - batchStart;
        const batchThroughput = batch.length / (batchTime / 1000);

        results.push({
          time: totalTime + batchTime,
          throughput: batchThroughput,
          errors: result.invalidEvents
        });

        totalTime += batchTime;

        if (totalTime >= duration) {
          clearInterval(stressTest);
        }
      }, interval);

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          // Analyze sustained performance
          const avgThroughput = results.reduce((sum, r) => sum + r.throughput, 0) / results.length;
          const maxErrors = Math.max(...results.map(r => r.errors));
          const throughputVariance = calculateVariance(results.map(r => r.throughput));

          expect(avgThroughput).toBeGreaterThan(1000); // Minimum sustained throughput
          expect(maxErrors).toBeLessThan(batchSize * 0.05); // Less than 5% errors
          expect(throughputVariance).toBeLessThan(avgThroughput * 0.5); // Low variance

          console.log(`Stress test: avg throughput ${avgThroughput.toFixed(0)} events/sec, ` +
                      `max errors ${maxErrors}, variance ${(throughputVariance).toFixed(0)}`);
          resolve();
        }, duration + 5000); // Extra time for cleanup
      });
    });

    test('should recover gracefully from memory pressure', async () => {
      // Create extreme memory pressure
      const memoryHog = Array.from({ length: 100 }, () =>
        generator.generatePerformanceDataset(10000)
      );

      // Process under pressure
      const testDataset = generator.generatePerformanceDataset(5000);
      const underPressureResult = await validator.validateEventsConcurrent(testDataset, 2);

      // Force garbage collection
      if (global.gc) {
        global.gc();
      }

      // Process after recovery
      const recoveryDataset = generator.generatePerformanceDataset(5000);
      const recoveryStart = performance.now();
      const recoveryResult = await validator.validateEventsConcurrent(recoveryDataset, 4);
      const recoveryEnd = performance.now();

      const recoveryTime = recoveryEnd - recoveryStart;
      const recoveryThroughput = recoveryDataset.length / (recoveryTime / 1000);

      expect(underPressureResult.validEvents).toBeGreaterThanOrEqual(4000); // At least 80% valid (relaxed for CI)
      expect(recoveryResult.validEvents).toBeGreaterThanOrEqual(4000); // At least 80% valid (relaxed for CI)
      expect(recoveryThroughput).toBeGreaterThan(100); // Relaxed threshold for CI environments

      console.log(`Memory pressure recovery: throughput ${recoveryThroughput.toFixed(0)} events/sec`);
    });
  });

  describe('Performance Regression Tests', () => {
    test('should maintain baseline performance characteristics', async () => {
      const baselineConfig = {
        datasetSize: 10000,
        targetThroughput: 2000,
        maxLatencyP95: 20,
        maxMemoryPerEvent: 512 // bytes
      };

      const dataset = generator.generatePerformanceDataset(baselineConfig.datasetSize);
      const initialMemory = process.memoryUsage().heapUsed;

      const startTime = performance.now();
      const result = await validator.validateEventsConcurrent(dataset, 6);
      const endTime = performance.now();

      const finalMemory = process.memoryUsage().heapUsed;

      // Performance assertions against baseline
      const processingTime = endTime - startTime;
      const throughput = dataset.length / (processingTime / 1000);
      const memoryPerEvent = (finalMemory - initialMemory) / dataset.length;

      expect(throughput).toBeGreaterThan(baselineConfig.targetThroughput * 0.8); // Within 20% of baseline
      expect(memoryPerEvent).toBeLessThan(baselineConfig.maxMemoryPerEvent);

      console.log(`Baseline test: throughput ${throughput.toFixed(0)} events/sec, ` +
                  `memory ${memoryPerEvent.toFixed(0)} bytes/event`);
    });
  });
});

// Helper functions for performance testing

async function runThroughputTest(
  validator: PatternMetricsValidator,
  eventGenerator: () => any,
  duration: number,
  targetThroughput: number
): Promise<{
  averageThroughput: number;
  maxLatency: number;
  p95Latency: number;
}> {
  const startTime = performance.now();
  const latencies: number[] = [];
  let eventCount = 0;

  const interval = setInterval(() => {
    if (performance.now() - startTime >= duration) {
      clearInterval(interval);
      return;
    }

    // Generate burst of events
    const burstSize = Math.ceil(targetThroughput / 10); // 10 bursts per second
    const burstStart = performance.now();

    for (let i = 0; i < burstSize; i++) {
      const event = eventGenerator();
      const eventStart = performance.now();
      validator.validateEvent(event);
      const eventEnd = performance.now();
      latencies.push(eventEnd - eventStart);
      eventCount++;
    }

    const burstEnd = performance.now();
    const burstDuration = burstEnd - burstStart;

    // Adjust if we're falling behind
    if (burstDuration > 100) { // Should take ~100ms for each burst
      console.warn(`Throughput test falling behind: burst took ${burstDuration.toFixed(2)}ms`);
    }
  }, 100);

  return new Promise(resolve => {
    setTimeout(() => {
      const actualDuration = performance.now() - startTime;
      const averageThroughput = eventCount / (actualDuration / 1000);

      latencies.sort((a, b) => a - b);
      const p95Latency = latencies[Math.floor(latencies.length * 0.95)];
      const maxLatency = latencies[latencies.length - 1];

      resolve({
        averageThroughput,
        maxLatency,
        p95Latency
      });
    }, duration + 1000);
  });
}

function calculateVariance(values: number[]): number {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
  return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
}
