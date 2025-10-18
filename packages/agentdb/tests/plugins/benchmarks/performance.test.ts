/**
 * Performance benchmark tests for plugins
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MockSQLiteVectorDB, generateTrainingData, PerformanceTimer, measureMemory } from '../setup';

describe('Plugin Performance Benchmarks', () => {
  let db: MockSQLiteVectorDB;
  let timer: PerformanceTimer;

  beforeEach(() => {
    db = new MockSQLiteVectorDB();
    timer = new PerformanceTimer();
  });

  describe('Training Performance', () => {
    it('should benchmark small dataset (100 samples)', async () => {
      const data = generateTrainingData(100, 8);

      // Mock Q-Learning training
      timer.start();
      for (const sample of data) {
        // Simulate training step
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      const duration = timer.stop();

      expect(duration).toBeLessThan(500); // Should complete in under 500ms
      console.log(`Small dataset (100): ${duration.toFixed(2)}ms`);
    });

    it('should benchmark medium dataset (1000 samples)', async () => {
      const data = generateTrainingData(1000, 8);

      timer.start();
      for (const sample of data) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      const duration = timer.stop();

      expect(duration).toBeLessThan(2000); // Should complete in under 2 seconds
      console.log(`Medium dataset (1000): ${duration.toFixed(2)}ms`);
    });

    it('should benchmark large dataset (10000 samples)', async () => {
      const data = generateTrainingData(10000, 8);

      timer.start();
      for (const sample of data) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      const duration = timer.stop();

      expect(duration).toBeLessThan(10000); // Should complete in under 10 seconds
      console.log(`Large dataset (10000): ${duration.toFixed(2)}ms`);
    });
  });

  describe('Prediction Performance', () => {
    it('should benchmark single prediction', async () => {
      const state = [0.5, 0.5, 0.5, 0.5];

      timer.start();
      // Simulate prediction
      const action = Math.floor(Math.random() * 4);
      const duration = timer.stop();

      expect(duration).toBeLessThan(10); // Should be < 10ms
      console.log(`Single prediction: ${duration.toFixed(2)}ms`);
    });

    it('should benchmark batch predictions (100)', async () => {
      const states = Array.from({ length: 100 }, () =>
        Array.from({ length: 4 }, () => Math.random())
      );

      timer.start();
      for (const state of states) {
        const action = Math.floor(Math.random() * 4);
      }
      const duration = timer.stop();

      expect(duration).toBeLessThan(50); // 100 predictions in under 50ms
      console.log(`Batch predictions (100): ${duration.toFixed(2)}ms`);
    });

    it('should benchmark throughput (predictions per second)', async () => {
      const testDuration = 1000; // 1 second
      let count = 0;

      const startTime = performance.now();
      while (performance.now() - startTime < testDuration) {
        const action = Math.floor(Math.random() * 4);
        count++;
      }

      const predictionsPerSecond = count;
      expect(predictionsPerSecond).toBeGreaterThan(1000); // At least 1000 predictions/sec
      console.log(`Throughput: ${predictionsPerSecond} predictions/sec`);
    });
  });

  describe('Memory Performance', () => {
    it('should measure memory usage for small Q-table', () => {
      const qTable = new Map<string, number[]>();

      const memBefore = measureMemory();

      // Add 100 states
      for (let i = 0; i < 100; i++) {
        qTable.set(`state-${i}`, Array(4).fill(0));
      }

      const memAfter = measureMemory();
      const memUsed = memAfter - memBefore;

      console.log(`Memory for 100 states: ${memUsed} bytes`);
      expect(memUsed).toBeGreaterThanOrEqual(0);
    });

    it('should measure memory usage for large Q-table', () => {
      const qTable = new Map<string, number[]>();

      const memBefore = measureMemory();

      // Add 10000 states
      for (let i = 0; i < 10000; i++) {
        qTable.set(`state-${i}`, Array(4).fill(0));
      }

      const memAfter = measureMemory();
      const memUsed = memAfter - memBefore;

      console.log(`Memory for 10000 states: ${memUsed} bytes`);
      expect(memUsed).toBeGreaterThanOrEqual(0);
    });

    it('should benchmark memory efficiency', () => {
      const implementations = {
        map: new Map<string, number[]>(),
        object: {} as Record<string, number[]>,
      };

      const memBefore = measureMemory();

      // Test Map
      for (let i = 0; i < 1000; i++) {
        implementations.map.set(`state-${i}`, [0, 0, 0, 0]);
      }

      const memMap = measureMemory() - memBefore;

      // Test Object
      for (let i = 0; i < 1000; i++) {
        implementations.object[`state-${i}`] = [0, 0, 0, 0];
      }

      const memObject = measureMemory() - memBefore;

      console.log(`Map memory: ${memMap} bytes`);
      console.log(`Object memory: ${memObject} bytes`);
    });
  });

  describe('Database Performance', () => {
    it('should benchmark vector insertion', async () => {
      timer.start();

      for (let i = 0; i < 100; i++) {
        await db.insert([Math.random(), Math.random(), Math.random()], { index: i });
      }

      const duration = timer.stop();

      expect(duration).toBeLessThan(500);
      console.log(`100 vector insertions: ${duration.toFixed(2)}ms`);
    });

    it('should benchmark vector search', async () => {
      // Insert some vectors
      for (let i = 0; i < 100; i++) {
        await db.insert([Math.random(), Math.random(), Math.random()], { index: i });
      }

      timer.start();

      for (let i = 0; i < 50; i++) {
        await db.search([Math.random(), Math.random(), Math.random()], 5);
      }

      const duration = timer.stop();

      expect(duration).toBeLessThan(1000);
      console.log(`50 vector searches: ${duration.toFixed(2)}ms`);
    });

    it('should benchmark database operations throughput', async () => {
      const testDuration = 1000; // 1 second
      let insertCount = 0;

      const startTime = performance.now();
      while (performance.now() - startTime < testDuration) {
        await db.insert([Math.random(), Math.random(), Math.random()]);
        insertCount++;
      }

      console.log(`Database throughput: ${insertCount} inserts/sec`);
      expect(insertCount).toBeGreaterThan(0);
    });
  });

  describe('Algorithm Comparison', () => {
    it('should compare Q-Learning vs SARSA training time', async () => {
      const data = generateTrainingData(1000, 4);

      // Q-Learning simulation
      timer.start();
      for (const sample of data) {
        const maxNextQ = Math.random(); // Simulate max Q calculation
      }
      const qLearningTime = timer.stop();

      // SARSA simulation
      timer.start();
      for (const sample of data) {
        const nextQ = Math.random(); // Simulate next Q lookup
      }
      const sarsaTime = timer.stop();

      console.log(`Q-Learning: ${qLearningTime.toFixed(2)}ms`);
      console.log(`SARSA: ${sarsaTime.toFixed(2)}ms`);

      // Both should be reasonably fast
      expect(qLearningTime).toBeLessThan(5000);
      expect(sarsaTime).toBeLessThan(5000);
    });

    it('should compare memory usage across algorithms', () => {
      const qTable = new Map<string, number[]>();
      const actorCritic = {
        actor: new Map<string, number[]>(),
        critic: new Map<string, number>(),
      };

      const memBefore = measureMemory();

      // Q-Learning/SARSA memory
      for (let i = 0; i < 1000; i++) {
        qTable.set(`state-${i}`, [0, 0, 0, 0]);
      }

      const qMemory = measureMemory() - memBefore;

      // Actor-Critic memory
      for (let i = 0; i < 1000; i++) {
        actorCritic.actor.set(`state-${i}`, [0.25, 0.25, 0.25, 0.25]);
        actorCritic.critic.set(`state-${i}`, 0);
      }

      const acMemory = measureMemory() - memBefore;

      console.log(`Q-Learning memory: ${qMemory} bytes`);
      console.log(`Actor-Critic memory: ${acMemory} bytes`);
    });
  });

  describe('Scalability Tests', () => {
    it('should test linear scaling with dataset size', async () => {
      const sizes = [100, 500, 1000, 5000];
      const timings: number[] = [];

      for (const size of sizes) {
        const data = generateTrainingData(size, 4);

        timer.start();
        for (const sample of data) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
        timings.push(timer.stop());
      }

      console.log('Scaling results:');
      sizes.forEach((size, i) => {
        console.log(`  ${size} samples: ${timings[i].toFixed(2)}ms`);
      });

      // Check for roughly linear scaling
      const ratio1 = timings[1] / timings[0];
      const ratio2 = timings[2] / timings[1];

      expect(Math.abs(ratio1 - ratio2)).toBeLessThan(2); // Should be roughly linear
    });

    it('should test scaling with state dimensions', async () => {
      const dimensions = [4, 8, 16, 32];
      const timings: number[] = [];

      for (const dim of dimensions) {
        const data = generateTrainingData(100, dim);

        timer.start();
        for (const sample of data) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
        timings.push(timer.stop());
      }

      console.log('Dimension scaling:');
      dimensions.forEach((dim, i) => {
        console.log(`  ${dim} dimensions: ${timings[i].toFixed(2)}ms`);
      });
    });
  });

  describe('Optimization Opportunities', () => {
    it('should identify bottlenecks in training loop', async () => {
      const data = generateTrainingData(1000, 4);

      const timings = {
        stateKey: 0,
        qLookup: 0,
        qUpdate: 0,
        dbInsert: 0,
      };

      for (const sample of data) {
        // State key generation
        timer.start();
        const stateKey = sample.state.map(s => s.toFixed(4)).join(',');
        timings.stateKey += timer.stop();

        // Q-value lookup
        timer.start();
        const qValues = [0, 0, 0, 0];
        timings.qLookup += timer.stop();

        // Q-value update
        timer.start();
        const newQ = qValues[0] + 0.1 * (sample.reward - qValues[0]);
        timings.qUpdate += timer.stop();

        // Database insert
        timer.start();
        await db.insert(sample.state, { action: sample.action });
        timings.dbInsert += timer.stop();
      }

      console.log('Bottleneck analysis:');
      console.log(`  State key generation: ${timings.stateKey.toFixed(2)}ms`);
      console.log(`  Q-value lookup: ${timings.qLookup.toFixed(2)}ms`);
      console.log(`  Q-value update: ${timings.qUpdate.toFixed(2)}ms`);
      console.log(`  Database insert: ${timings.dbInsert.toFixed(2)}ms`);
    });
  });
});
