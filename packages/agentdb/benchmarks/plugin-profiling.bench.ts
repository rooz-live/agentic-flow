/**
 * Learning Plugin Performance Profiling Benchmarks
 *
 * Comprehensive profiling suite for identifying bottlenecks and
 * measuring optimization improvements.
 */

import { ReasoningBankDB } from '../src';
import { performance } from 'perf_hooks';

interface ProfileResult {
  name: string;
  totalTime: number;
  calls: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
  p50: number;
  p95: number;
  p99: number;
  memoryBefore: number;
  memoryAfter: number;
  memoryDelta: number;
}

class PerformanceProfiler {
  private measurements: Map<string, number[]> = new Map();
  private memoryMeasurements: Map<string, { before: number; after: number }[]> = new Map();

  /**
   * Profile a function execution
   */
  async profile<T>(name: string, fn: () => Promise<T>): Promise<T> {
    // Record memory before
    const memBefore = process.memoryUsage().heapUsed;

    // Execute and time
    const start = performance.now();
    const result = await fn();
    const end = performance.now();

    // Record memory after
    const memAfter = process.memoryUsage().heapUsed;

    // Store measurements
    if (!this.measurements.has(name)) {
      this.measurements.set(name, []);
      this.memoryMeasurements.set(name, []);
    }

    this.measurements.get(name)!.push(end - start);
    this.memoryMeasurements.get(name)!.push({
      before: memBefore,
      after: memAfter
    });

    return result;
  }

  /**
   * Get profiling results
   */
  getResults(): ProfileResult[] {
    const results: ProfileResult[] = [];

    for (const [name, times] of this.measurements) {
      const sorted = [...times].sort((a, b) => a - b);
      const memMeasurements = this.memoryMeasurements.get(name) || [];

      const totalTime = times.reduce((a, b) => a + b, 0);
      const avgMemDelta = memMeasurements.reduce((sum, m) => sum + (m.after - m.before), 0) / memMeasurements.length;

      results.push({
        name,
        totalTime,
        calls: times.length,
        avgTime: totalTime / times.length,
        minTime: sorted[0],
        maxTime: sorted[sorted.length - 1],
        p50: sorted[Math.floor(sorted.length * 0.5)],
        p95: sorted[Math.floor(sorted.length * 0.95)],
        p99: sorted[Math.floor(sorted.length * 0.99)],
        memoryBefore: memMeasurements[0]?.before || 0,
        memoryAfter: memMeasurements[memMeasurements.length - 1]?.after || 0,
        memoryDelta: avgMemDelta
      });
    }

    return results.sort((a, b) => b.totalTime - a.totalTime);
  }

  /**
   * Print profiling report
   */
  printReport(): void {
    const results = this.getResults();

    console.log('\n╔═══════════════════════════════════════════════════════════════════════════╗');
    console.log('║                    PERFORMANCE PROFILING REPORT                           ║');
    console.log('╚═══════════════════════════════════════════════════════════════════════════╝\n');

    console.log('┌─────────────────────────────────────────────────────────────────────────┐');
    console.log('│ Time Distribution (ms)                                                  │');
    console.log('├─────────────────────────────────────────────────────────────────────────┤');

    for (const result of results) {
      console.log(`│ ${result.name.padEnd(50)} │`);
      console.log(`│   Calls:  ${result.calls.toString().padEnd(10)} Total: ${result.totalTime.toFixed(2).padStart(8)}ms │`);
      console.log(`│   Avg:    ${result.avgTime.toFixed(2).padStart(7)}ms  P50: ${result.p50.toFixed(2).padStart(7)}ms │`);
      console.log(`│   P95:    ${result.p95.toFixed(2).padStart(7)}ms  P99: ${result.p99.toFixed(2).padStart(7)}ms │`);
      console.log('├─────────────────────────────────────────────────────────────────────────┤');
    }

    console.log('└─────────────────────────────────────────────────────────────────────────┘\n');

    console.log('┌─────────────────────────────────────────────────────────────────────────┐');
    console.log('│ Memory Usage (MB)                                                       │');
    console.log('├─────────────────────────────────────────────────────────────────────────┤');

    for (const result of results) {
      const before = (result.memoryBefore / 1024 / 1024).toFixed(2);
      const after = (result.memoryAfter / 1024 / 1024).toFixed(2);
      const delta = (result.memoryDelta / 1024 / 1024).toFixed(2);
      const status = result.memoryDelta > 0 ? '⚠️' : '✅';

      console.log(`│ ${result.name.padEnd(50)} │`);
      console.log(`│   Before: ${before.padStart(8)}MB  After: ${after.padStart(8)}MB │`);
      console.log(`│   Delta:  ${delta.padStart(8)}MB  ${status}                        │`);
      console.log('├─────────────────────────────────────────────────────────────────────────┤');
    }

    console.log('└─────────────────────────────────────────────────────────────────────────┘\n');

    // Identify bottlenecks
    const bottlenecks = results.filter(r => r.totalTime > 100);
    if (bottlenecks.length > 0) {
      console.log('⚠️  BOTTLENECKS DETECTED:');
      bottlenecks.forEach(b => {
        console.log(`   - ${b.name}: ${b.totalTime.toFixed(2)}ms total (${b.calls} calls)`);
      });
      console.log('');
    }

    // Memory leaks
    const leaks = results.filter(r => r.memoryDelta > 1024 * 1024); // > 1MB
    if (leaks.length > 0) {
      console.log('🔴 POTENTIAL MEMORY LEAKS:');
      leaks.forEach(l => {
        const mb = (l.memoryDelta / 1024 / 1024).toFixed(2);
        console.log(`   - ${l.name}: +${mb}MB per call`);
      });
      console.log('');
    }
  }

  /**
   * Clear measurements
   */
  clear(): void {
    this.measurements.clear();
    this.memoryMeasurements.clear();
  }
}

/**
 * Detailed profiling of learning plugin components
 */
class PluginProfilingBenchmark {
  private db: ReasoningBankDB;
  private profiler: PerformanceProfiler;

  constructor() {
    this.db = new ReasoningBankDB({ memoryMode: true });
    this.profiler = new PerformanceProfiler();
  }

  /**
   * Profile pattern storage pipeline
   */
  async profilePatternStorage(): Promise<void> {
    console.log('\n📊 Profiling Pattern Storage Pipeline...\n');

    for (let i = 0; i < 100; i++) {
      const embedding = this.generateRandomEmbedding(128);

      await this.profiler.profile('Pattern Store: Total', async () => {
        await this.profiler.profile('Pattern Store: Vector Insert', async () => {
          await this.db.patterns.storePattern({
            embedding,
            taskType: `task-${i}`,
            approach: `approach-${i}`,
            successRate: Math.random(),
            avgDuration: Math.random() * 5000,
            metadata: {
              domain: 'testing',
              complexity: 'simple',
              learningSource: 'success',
              tags: ['test']
            }
          });
        });
      });
    }
  }

  /**
   * Profile pattern matching pipeline
   */
  async profilePatternMatching(): Promise<void> {
    console.log('\n📊 Profiling Pattern Matching Pipeline...\n');

    // Pre-populate
    for (let i = 0; i < 1000; i++) {
      await this.db.patterns.storePattern({
        embedding: this.generateRandomEmbedding(128),
        taskType: `task-${i}`,
        approach: `approach-${i}`,
        successRate: Math.random(),
        avgDuration: Math.random() * 5000,
        metadata: {
          domain: 'testing',
          complexity: 'simple',
          learningSource: 'success',
          tags: ['test']
        }
      });
    }

    const queryEmbedding = this.generateRandomEmbedding(128);

    for (let i = 0; i < 50; i++) {
      await this.profiler.profile('Pattern Match: Total', async () => {
        await this.profiler.profile('Pattern Match: Vector Search', async () => {
          const results = this.db.db.search(queryEmbedding, 10, 'cosine', 0.7);
          return results;
        });

        await this.profiler.profile('Pattern Match: SQL Queries', async () => {
          await this.db.patterns.findSimilar(queryEmbedding, 5, 0.7);
        });
      });
    }
  }

  /**
   * Profile experience query pipeline
   */
  async profileExperienceQuery(): Promise<void> {
    console.log('\n📊 Profiling Experience Query Pipeline...\n');

    // Pre-populate
    for (let i = 0; i < 2000; i++) {
      await this.db.experiences.storeExperience({
        taskEmbedding: this.generateRandomEmbedding(128),
        taskDescription: `Task ${i}`,
        success: Math.random() > 0.5,
        duration: Math.random() * 5000,
        approach: `Approach ${i}`,
        outcome: `Outcome ${i}`,
        quality: Math.random(),
        metadata: {
          domain: i % 5 === 0 ? 'backend' : 'frontend',
          tokensUsed: Math.floor(Math.random() * 10000)
        }
      });
    }

    const queryEmbedding = this.generateRandomEmbedding(128);

    for (let i = 0; i < 50; i++) {
      await this.profiler.profile('Experience Query: Total', async () => {
        await this.profiler.profile('Experience Query: Vector Search', async () => {
          this.db.db.search(queryEmbedding, 20, 'cosine', 0.5);
        });

        await this.profiler.profile('Experience Query: SQL Queries', async () => {
          await this.db.experiences.queryExperiences(queryEmbedding, 10, {
            successOnly: false,
            minQuality: 0.5
          });
        });
      });
    }
  }

  /**
   * Profile context synthesis pipeline
   */
  async profileContextSynthesis(): Promise<void> {
    console.log('\n📊 Profiling Context Synthesis Pipeline...\n');

    // Pre-populate
    for (let i = 0; i < 500; i++) {
      await this.db.patterns.storePattern({
        embedding: this.generateRandomEmbedding(128),
        taskType: `task-${i}`,
        approach: `approach-${i}`,
        successRate: Math.random(),
        avgDuration: Math.random() * 5000,
        metadata: {
          domain: 'testing',
          complexity: 'simple',
          learningSource: 'success',
          tags: ['test']
        }
      });

      await this.db.experiences.storeExperience({
        taskEmbedding: this.generateRandomEmbedding(128),
        taskDescription: `Task ${i}`,
        success: Math.random() > 0.5,
        duration: Math.random() * 5000,
        approach: `Approach ${i}`,
        outcome: `Outcome ${i}`,
        quality: Math.random(),
        metadata: { domain: 'testing' }
      });
    }

    const queryEmbedding = this.generateRandomEmbedding(128);

    for (let i = 0; i < 20; i++) {
      await this.profiler.profile('Context Synthesis: Total', async () => {
        await this.profiler.profile('Context: Pattern Query', async () => {
          await this.db.patterns.findSimilar(queryEmbedding, 3, 0.7);
        });

        await this.profiler.profile('Context: Experience Query', async () => {
          await this.db.experiences.queryExperiences(queryEmbedding, 5);
        });

        await this.profiler.profile('Context: Deduplication', async () => {
          await this.db.context.synthesizeContext(queryEmbedding, [
            { type: 'patterns', k: 3 },
            { type: 'experiences', k: 5 }
          ]);
        });
      });
    }
  }

  /**
   * Profile memory collapse pipeline
   */
  async profileMemoryCollapse(): Promise<void> {
    console.log('\n📊 Profiling Memory Collapse Pipeline...\n');

    // Pre-populate with old vectors
    for (let i = 0; i < 1000; i++) {
      this.db.db.insert({
        embedding: this.generateRandomEmbedding(128),
        metadata: { type: 'test', quality: Math.random() },
        timestamp: Date.now() - 10 * 24 * 60 * 60 * 1000
      });
    }

    for (let i = 0; i < 5; i++) {
      await this.profiler.profile('Memory Collapse: Total', async () => {
        await this.profiler.profile('Collapse: Get Old Vectors', async () => {
          // This will be called internally
        });

        await this.profiler.profile('Collapse: Clustering', async () => {
          await this.db.memory.collapseMemories(
            7 * 24 * 60 * 60 * 1000,
            { type: 'graph', threshold: 0.9, maxNodes: 100 }
          );
        });
      });
    }
  }

  /**
   * Profile deduplication algorithms
   */
  async profileDeduplication(): Promise<void> {
    console.log('\n📊 Profiling Deduplication Algorithms...\n');

    // Generate test patterns with duplicates
    const patterns = [];
    for (let i = 0; i < 1000; i++) {
      const id = `pattern-${i % 100}`; // 10x duplication
      patterns.push({
        id,
        embedding: this.generateRandomEmbedding(128),
        taskType: 'test',
        approach: 'test',
        successRate: Math.random(),
        avgDuration: 1000,
        metadata: { domain: 'test', complexity: 'simple' as const, iterations: 1, learningSource: 'success' as const, tags: [] },
        timestamp: Date.now(),
        similarity: Math.random()
      });
    }

    for (let i = 0; i < 20; i++) {
      await this.profiler.profile('Deduplication: Patterns', async () => {
        // Simulate deduplication
        const seen = new Map();
        for (const p of patterns) {
          const existing = seen.get(p.id);
          if (!existing || p.similarity > (existing as any).similarity) {
            seen.set(p.id, p);
          }
        }
        return Array.from(seen.values());
      });
    }
  }

  /**
   * Profile full learning cycle
   */
  async profileLearningCycle(): Promise<void> {
    console.log('\n📊 Profiling Full Learning Cycle...\n');

    const queryEmbedding = this.generateRandomEmbedding(128);

    for (let i = 0; i < 30; i++) {
      await this.profiler.profile('Learning Cycle: Total', async () => {
        await this.profiler.profile('Cycle: Find Patterns', async () => {
          await this.db.patterns.findSimilar(queryEmbedding, 3, 0.7);
        });

        await this.profiler.profile('Cycle: Query Experiences', async () => {
          await this.db.experiences.queryExperiences(queryEmbedding, 5);
        });

        await this.profiler.profile('Cycle: Store Experience', async () => {
          await this.db.experiences.storeExperience({
            taskEmbedding: queryEmbedding,
            taskDescription: 'Learning cycle test',
            success: true,
            duration: 1000,
            approach: 'Test approach',
            outcome: 'Success',
            quality: 0.9,
            metadata: { domain: 'testing' }
          });
        });

        await this.profiler.profile('Cycle: Update Pattern', async () => {
          const patterns = await this.db.patterns.findSimilar(queryEmbedding, 1, 0.8);
          if (patterns.length > 0) {
            await this.db.patterns.updatePattern(patterns[0].id, {
              success: true,
              duration: 1000
            });
          }
        });
      });
    }
  }

  /**
   * Run all profiling benchmarks
   */
  async runAll(): Promise<void> {
    console.log('🚀 Learning Plugin Performance Profiling\n');
    console.log('Running comprehensive profiling suite...\n');

    await this.profilePatternStorage();
    await this.profilePatternMatching();
    await this.profileExperienceQuery();
    await this.profileContextSynthesis();
    await this.profileMemoryCollapse();
    await this.profileDeduplication();
    await this.profileLearningCycle();

    this.profiler.printReport();
  }

  /**
   * Generate random embedding
   */
  private generateRandomEmbedding(dimensions: number): number[] {
    return Array.from({ length: dimensions }, () => Math.random());
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    this.db.close();
  }
}

// Run profiling
async function main() {
  const bench = new PluginProfilingBenchmark();

  try {
    await bench.runAll();
  } finally {
    bench.cleanup();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { PluginProfilingBenchmark, PerformanceProfiler };
