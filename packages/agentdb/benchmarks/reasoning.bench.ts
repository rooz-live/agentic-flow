/**
 * ReasoningBank Performance Benchmarks
 */

import { ReasoningBankDB } from '../src';

interface BenchmarkResult {
  name: string;
  operations: number;
  duration: number;
  opsPerSecond: number;
  avgLatency: number;
  p95Latency: number;
  p99Latency: number;
}

class ReasoningBenchmark {
  private db: ReasoningBankDB;
  private results: BenchmarkResult[] = [];

  constructor() {
    this.db = new ReasoningBankDB({ memoryMode: true });
  }

  /**
   * Run benchmark and collect metrics
   */
  private async runBenchmark(
    name: string,
    operation: () => Promise<void>,
    iterations: number
  ): Promise<BenchmarkResult> {
    const latencies: number[] = [];

    // Warmup
    for (let i = 0; i < 10; i++) {
      await operation();
    }

    // Actual benchmark
    const startTime = Date.now();

    for (let i = 0; i < iterations; i++) {
      const opStart = Date.now();
      await operation();
      latencies.push(Date.now() - opStart);
    }

    const duration = Date.now() - startTime;

    // Calculate percentiles
    latencies.sort((a, b) => a - b);
    const p95Index = Math.floor(iterations * 0.95);
    const p99Index = Math.floor(iterations * 0.99);

    const result: BenchmarkResult = {
      name,
      operations: iterations,
      duration,
      opsPerSecond: (iterations / duration) * 1000,
      avgLatency: latencies.reduce((a, b) => a + b, 0) / iterations,
      p95Latency: latencies[p95Index],
      p99Latency: latencies[p99Index]
    };

    this.results.push(result);
    return result;
  }

  /**
   * Benchmark: Pattern storage
   */
  async benchmarkPatternStore(): Promise<void> {
    console.log('\n📊 Benchmarking Pattern Storage...');

    const result = await this.runBenchmark(
      'Pattern Store',
      async () => {
        await this.db.patterns.storePattern({
          embedding: this.generateRandomEmbedding(128),
          taskType: 'test-task',
          approach: 'test-approach',
          successRate: Math.random(),
          avgDuration: Math.random() * 5000,
          metadata: {
            domain: 'testing',
            complexity: 'simple',
            learningSource: 'success',
            tags: ['test']
          }
        });
      },
      1000
    );

    this.printResult(result);
  }

  /**
   * Benchmark: Pattern matching (similarity search)
   */
  async benchmarkPatternMatch(): Promise<void> {
    console.log('\n📊 Benchmarking Pattern Matching...');

    // Pre-populate with patterns
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

    const result = await this.runBenchmark(
      'Pattern Match (k=5, 1k patterns)',
      async () => {
        await this.db.patterns.findSimilar(queryEmbedding, 5, 0.7);
      },
      100
    );

    this.printResult(result);
    console.log(`   Target: <10ms | Actual: ${result.avgLatency.toFixed(2)}ms`);
  }

  /**
   * Benchmark: Experience storage
   */
  async benchmarkExperienceStore(): Promise<void> {
    console.log('\n📊 Benchmarking Experience Storage...');

    const result = await this.runBenchmark(
      'Experience Store',
      async () => {
        await this.db.experiences.storeExperience({
          taskEmbedding: this.generateRandomEmbedding(128),
          taskDescription: 'Test task',
          success: Math.random() > 0.5,
          duration: Math.random() * 5000,
          approach: 'Test approach',
          outcome: 'Test outcome',
          quality: Math.random(),
          metadata: {
            domain: 'testing',
            tokensUsed: Math.floor(Math.random() * 10000),
            iterationCount: Math.floor(Math.random() * 5) + 1
          }
        });
      },
      1000
    );

    this.printResult(result);
  }

  /**
   * Benchmark: Experience queries
   */
  async benchmarkExperienceQuery(): Promise<void> {
    console.log('\n📊 Benchmarking Experience Queries...');

    // Pre-populate with experiences
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

    const result = await this.runBenchmark(
      'Experience Query (k=10, 2k experiences)',
      async () => {
        await this.db.experiences.queryExperiences(queryEmbedding, 10, {
          successOnly: false,
          minQuality: 0.5
        });
      },
      100
    );

    this.printResult(result);
    console.log(`   Target: <20ms | Actual: ${result.avgLatency.toFixed(2)}ms`);
  }

  /**
   * Benchmark: Context synthesis
   */
  async benchmarkContextSynthesis(): Promise<void> {
    console.log('\n📊 Benchmarking Context Synthesis...');

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

    const result = await this.runBenchmark(
      'Context Synthesis (patterns + experiences)',
      async () => {
        await this.db.context.synthesizeContext(queryEmbedding, [
          { type: 'patterns', k: 3 },
          { type: 'experiences', k: 5 }
        ]);
      },
      50
    );

    this.printResult(result);
  }

  /**
   * Benchmark: Memory collapse
   */
  async benchmarkMemoryCollapse(): Promise<void> {
    console.log('\n📊 Benchmarking Memory Collapse...');

    // Pre-populate with 1000 old vectors
    for (let i = 0; i < 1000; i++) {
      this.db.db.insert({
        embedding: this.generateRandomEmbedding(128),
        metadata: { type: 'test', quality: Math.random() },
        timestamp: Date.now() - 10 * 24 * 60 * 60 * 1000
      });
    }

    const result = await this.runBenchmark(
      'Memory Collapse (1k vectors)',
      async () => {
        await this.db.memory.collapseMemories(
          7 * 24 * 60 * 60 * 1000,
          { type: 'graph', threshold: 0.9, maxNodes: 100 }
        );
      },
      1
    );

    this.printResult(result);
    console.log(`   Target: <100ms | Actual: ${result.avgLatency.toFixed(2)}ms`);
  }

  /**
   * Benchmark: Full learning cycle
   */
  async benchmarkLearningCycle(): Promise<void> {
    console.log('\n📊 Benchmarking Full Learning Cycle...');

    const queryEmbedding = this.generateRandomEmbedding(128);

    const result = await this.runBenchmark(
      'Full Learning Cycle (query + store)',
      async () => {
        // 1. Find similar patterns
        await this.db.patterns.findSimilar(queryEmbedding, 3, 0.7);

        // 2. Query experiences
        await this.db.experiences.queryExperiences(queryEmbedding, 5);

        // 3. Store new experience
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

        // 4. Update pattern (if exists)
        const patterns = await this.db.patterns.findSimilar(queryEmbedding, 1, 0.8);
        if (patterns.length > 0) {
          await this.db.patterns.updatePattern(patterns[0].id, {
            success: true,
            duration: 1000
          });
        }
      },
      50
    );

    this.printResult(result);
  }

  /**
   * Print benchmark result
   */
  private printResult(result: BenchmarkResult): void {
    console.log(`\n   ${result.name}:`);
    console.log(`   - Operations: ${result.operations}`);
    console.log(`   - Duration: ${result.duration}ms`);
    console.log(`   - Ops/sec: ${result.opsPerSecond.toFixed(2)}`);
    console.log(`   - Avg latency: ${result.avgLatency.toFixed(2)}ms`);
    console.log(`   - P95 latency: ${result.p95Latency.toFixed(2)}ms`);
    console.log(`   - P99 latency: ${result.p99Latency.toFixed(2)}ms`);
  }

  /**
   * Print summary
   */
  printSummary(): void {
    console.log('\n\n═══════════════════════════════════════════════════════════');
    console.log('📈 BENCHMARK SUMMARY');
    console.log('═══════════════════════════════════════════════════════════\n');

    const table = this.results.map(r => ({
      Name: r.name,
      'Ops/sec': r.opsPerSecond.toFixed(0),
      'Avg (ms)': r.avgLatency.toFixed(2),
      'P95 (ms)': r.p95Latency.toFixed(2),
      'P99 (ms)': r.p99Latency.toFixed(2)
    }));

    console.table(table);

    console.log('\n✅ Performance Targets:');
    console.log('   - Pattern matching: <10ms (avg)');
    console.log('   - Experience query: <20ms (avg)');
    console.log('   - Memory collapse: <100ms (1k vectors)');

    const patternMatch = this.results.find(r => r.name.includes('Pattern Match'));
    const expQuery = this.results.find(r => r.name.includes('Experience Query'));
    const memCollapse = this.results.find(r => r.name.includes('Memory Collapse'));

    console.log('\n📊 Results:');
    if (patternMatch) {
      const status = patternMatch.avgLatency < 10 ? '✅' : '⚠️';
      console.log(`   ${status} Pattern matching: ${patternMatch.avgLatency.toFixed(2)}ms`);
    }
    if (expQuery) {
      const status = expQuery.avgLatency < 20 ? '✅' : '⚠️';
      console.log(`   ${status} Experience query: ${expQuery.avgLatency.toFixed(2)}ms`);
    }
    if (memCollapse) {
      const status = memCollapse.avgLatency < 100 ? '✅' : '⚠️';
      console.log(`   ${status} Memory collapse: ${memCollapse.avgLatency.toFixed(2)}ms`);
    }

    console.log('\n═══════════════════════════════════════════════════════════\n');
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

// Run benchmarks
async function main() {
  console.log('🚀 ReasoningBank Performance Benchmarks\n');

  const bench = new ReasoningBenchmark();

  try {
    await bench.benchmarkPatternStore();
    await bench.benchmarkPatternMatch();
    await bench.benchmarkExperienceStore();
    await bench.benchmarkExperienceQuery();
    await bench.benchmarkContextSynthesis();
    await bench.benchmarkMemoryCollapse();
    await bench.benchmarkLearningCycle();

    bench.printSummary();
  } finally {
    bench.cleanup();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { ReasoningBenchmark };
