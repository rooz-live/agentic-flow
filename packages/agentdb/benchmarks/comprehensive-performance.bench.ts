/**
 * Comprehensive Performance Benchmarks for SQLiteVector
 * Tests insert, search, memory usage, and backend comparison
 *
 * Performance Targets:
 * - Native: 330K+ vectors/sec insert
 * - WASM: 10K+ vectors/sec insert
 * - Search: <10ms for 10K vectors
 * - Memory: <3MB per 1K vectors
 */

import { performance } from 'perf_hooks';
import { NativeBackend } from '../src/core/native-backend';
import { WasmBackend } from '../src/core/wasm-backend';
import { Vector, SimilarityMetric } from '../src/types';

interface BenchmarkResult {
  name: string;
  operations: number;
  duration: number;
  opsPerSecond: number;
  throughput: string;
  avgLatency: number;
  p95Latency?: number;
  p99Latency?: number;
  memoryUsed?: number;
}

class PerformanceBenchmark {
  private results: BenchmarkResult[] = [];
  private nativeBackend?: NativeBackend;
  private wasmBackend?: WasmBackend;

  /**
   * Generate random vectors for testing
   */
  private generateVectors(count: number, dimensions: number = 128): Vector[] {
    const vectors: Vector[] = [];
    for (let i = 0; i < count; i++) {
      vectors.push({
        id: `vec-${i}`,
        embedding: Array.from({ length: dimensions }, () => Math.random()),
        metadata: {
          index: i,
          category: `cat-${i % 10}`,
          timestamp: Date.now()
        }
      });
    }
    return vectors;
  }

  /**
   * Measure memory usage
   */
  private measureMemory(): number {
    if (global.gc) {
      global.gc();
    }
    return process.memoryUsage().heapUsed;
  }

  /**
   * Run benchmark with latency tracking
   */
  private async runBenchmark(
    name: string,
    operation: () => void | Promise<void>,
    iterations: number,
    trackLatency: boolean = false
  ): Promise<BenchmarkResult> {
    const latencies: number[] = [];
    const memoryBefore = this.measureMemory();

    // Warmup
    for (let i = 0; i < Math.min(10, iterations); i++) {
      await operation();
    }

    // Actual benchmark
    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
      const opStart = performance.now();
      await operation();
      if (trackLatency) {
        latencies.push(performance.now() - opStart);
      }
    }

    const duration = performance.now() - startTime;
    const memoryAfter = this.measureMemory();
    const memoryUsed = Math.max(0, memoryAfter - memoryBefore);

    // Calculate percentiles if tracking latency
    let p95Latency: number | undefined;
    let p99Latency: number | undefined;

    if (trackLatency && latencies.length > 0) {
      latencies.sort((a, b) => a - b);
      const p95Index = Math.floor(iterations * 0.95);
      const p99Index = Math.floor(iterations * 0.99);
      p95Latency = latencies[p95Index];
      p99Latency = latencies[p99Index];
    }

    const opsPerSecond = (iterations / duration) * 1000;
    const avgLatency = trackLatency && latencies.length > 0
      ? latencies.reduce((a, b) => a + b, 0) / latencies.length
      : duration / iterations;

    const result: BenchmarkResult = {
      name,
      operations: iterations,
      duration,
      opsPerSecond,
      throughput: this.formatThroughput(opsPerSecond),
      avgLatency,
      p95Latency,
      p99Latency,
      memoryUsed
    };

    this.results.push(result);
    return result;
  }

  /**
   * Format throughput for display
   */
  private formatThroughput(opsPerSec: number): string {
    if (opsPerSec >= 1000000) {
      return `${(opsPerSec / 1000000).toFixed(2)}M/sec`;
    } else if (opsPerSec >= 1000) {
      return `${(opsPerSec / 1000).toFixed(2)}K/sec`;
    } else {
      return `${opsPerSec.toFixed(2)}/sec`;
    }
  }

  /**
   * Benchmark: Native Backend - Single Inserts
   */
  async benchmarkNativeSingleInsert(): Promise<void> {
    console.log('\n📊 Benchmarking Native Backend - Single Inserts...');
    this.nativeBackend = new NativeBackend();
    this.nativeBackend.initialize();

    const vectors = this.generateVectors(1000, 128);
    let index = 0;

    await this.runBenchmark(
      'Native: Single Insert (1K ops)',
      () => {
        this.nativeBackend!.insert(vectors[index % vectors.length]);
        index++;
      },
      1000,
      false
    );

    this.nativeBackend.close();
  }

  /**
   * Benchmark: Native Backend - Batch Inserts
   */
  async benchmarkNativeBatchInsert(): Promise<void> {
    console.log('\n📊 Benchmarking Native Backend - Batch Inserts...');

    const testCases = [
      { size: 100, name: 'Native: Batch Insert (100 vectors)' },
      { size: 1000, name: 'Native: Batch Insert (1K vectors)' },
      { size: 10000, name: 'Native: Batch Insert (10K vectors)' },
      { size: 100000, name: 'Native: Batch Insert (100K vectors)' }
    ];

    for (const testCase of testCases) {
      this.nativeBackend = new NativeBackend();
      this.nativeBackend.initialize();

      const vectors = this.generateVectors(testCase.size, 128);

      await this.runBenchmark(
        testCase.name,
        () => {
          this.nativeBackend!.insertBatch(vectors);
        },
        1,
        false
      );

      this.nativeBackend.close();
    }
  }

  /**
   * Benchmark: WASM Backend - Batch Inserts
   */
  async benchmarkWasmBatchInsert(): Promise<void> {
    console.log('\n📊 Benchmarking WASM Backend - Batch Inserts...');

    const testCases = [
      { size: 100, name: 'WASM: Batch Insert (100 vectors)' },
      { size: 1000, name: 'WASM: Batch Insert (1K vectors)' },
      { size: 10000, name: 'WASM: Batch Insert (10K vectors)' }
    ];

    for (const testCase of testCases) {
      this.wasmBackend = new WasmBackend();
      await this.wasmBackend.initializeAsync();

      const vectors = this.generateVectors(testCase.size, 128);

      await this.runBenchmark(
        testCase.name,
        () => {
          this.wasmBackend!.insertBatch(vectors);
        },
        1,
        false
      );

      this.wasmBackend.close();
    }
  }

  /**
   * Benchmark: Native Backend - Search Performance
   */
  async benchmarkNativeSearch(): Promise<void> {
    console.log('\n📊 Benchmarking Native Backend - Search...');

    const dataSizes = [
      { size: 1000, k: 10, name: 'Native: Search (1K vectors, k=10)' },
      { size: 10000, k: 10, name: 'Native: Search (10K vectors, k=10)' },
      { size: 100000, k: 10, name: 'Native: Search (100K vectors, k=10)' }
    ];

    const metrics: SimilarityMetric[] = ['cosine', 'euclidean', 'dot'];

    for (const dataSize of dataSizes) {
      this.nativeBackend = new NativeBackend();
      this.nativeBackend.initialize();

      // Populate database
      const vectors = this.generateVectors(dataSize.size, 128);
      this.nativeBackend.insertBatch(vectors);

      // Test each metric
      for (const metric of metrics) {
        const queryVector = Array.from({ length: 128 }, () => Math.random());

        await this.runBenchmark(
          `${dataSize.name} [${metric}]`,
          () => {
            this.nativeBackend!.search(queryVector, dataSize.k, metric, 0.0);
          },
          100,
          true
        );
      }

      this.nativeBackend.close();
    }
  }

  /**
   * Benchmark: WASM Backend - Search Performance
   */
  async benchmarkWasmSearch(): Promise<void> {
    console.log('\n📊 Benchmarking WASM Backend - Search...');

    const dataSizes = [
      { size: 1000, k: 10, name: 'WASM: Search (1K vectors, k=10)' },
      { size: 10000, k: 10, name: 'WASM: Search (10K vectors, k=10)' }
    ];

    const metrics: SimilarityMetric[] = ['cosine', 'euclidean', 'dot'];

    for (const dataSize of dataSizes) {
      this.wasmBackend = new WasmBackend();
      await this.wasmBackend.initializeAsync();

      // Populate database
      const vectors = this.generateVectors(dataSize.size, 128);
      this.wasmBackend.insertBatch(vectors);

      // Test each metric
      for (const metric of metrics) {
        const queryVector = Array.from({ length: 128 }, () => Math.random());

        await this.runBenchmark(
          `${dataSize.name} [${metric}]`,
          () => {
            this.wasmBackend!.search(queryVector, dataSize.k, metric, 0.0);
          },
          100,
          true
        );
      }

      this.wasmBackend.close();
    }
  }

  /**
   * Benchmark: Memory Usage
   */
  async benchmarkMemoryUsage(): Promise<void> {
    console.log('\n📊 Benchmarking Memory Usage...');

    const testCases = [
      { size: 1000, backend: 'Native', dimensions: 128 },
      { size: 10000, backend: 'Native', dimensions: 128 },
      { size: 1000, backend: 'WASM', dimensions: 128 },
      { size: 10000, backend: 'WASM', dimensions: 128 }
    ];

    for (const testCase of testCases) {
      if (global.gc) global.gc();
      const memoryBefore = this.measureMemory();

      if (testCase.backend === 'Native') {
        this.nativeBackend = new NativeBackend();
        this.nativeBackend.initialize();

        const vectors = this.generateVectors(testCase.size, testCase.dimensions);
        this.nativeBackend.insertBatch(vectors);

        const stats = this.nativeBackend.stats();
        const memoryAfter = this.measureMemory();
        const heapUsed = memoryAfter - memoryBefore;

        console.log(`\n   ${testCase.backend}: ${testCase.size} vectors (${testCase.dimensions}D)`);
        console.log(`   - DB Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
        console.log(`   - Heap Used: ${(heapUsed / 1024 / 1024).toFixed(2)} MB`);
        console.log(`   - Per 1K vectors: ${((stats.size / testCase.size) * 1000 / 1024 / 1024).toFixed(3)} MB`);

        this.nativeBackend.close();
      } else {
        this.wasmBackend = new WasmBackend();
        await this.wasmBackend.initializeAsync();

        const vectors = this.generateVectors(testCase.size, testCase.dimensions);
        this.wasmBackend.insertBatch(vectors);

        const stats = this.wasmBackend.stats();
        const memoryAfter = this.measureMemory();
        const heapUsed = memoryAfter - memoryBefore;

        console.log(`\n   ${testCase.backend}: ${testCase.size} vectors (${testCase.dimensions}D)`);
        console.log(`   - DB Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
        console.log(`   - Heap Used: ${(heapUsed / 1024 / 1024).toFixed(2)} MB`);
        console.log(`   - Per 1K vectors: ${((stats.size / testCase.size) * 1000 / 1024 / 1024).toFixed(3)} MB`);

        this.wasmBackend.close();
      }
    }
  }

  /**
   * Benchmark: Backend Comparison
   */
  async benchmarkBackendComparison(): Promise<void> {
    console.log('\n📊 Benchmarking Backend Comparison...');

    // Native
    this.nativeBackend = new NativeBackend();
    this.nativeBackend.initialize();
    const nativeVectors = this.generateVectors(10000, 128);
    const nativeStartInsert = performance.now();
    this.nativeBackend.insertBatch(nativeVectors);
    const nativeInsertDuration = performance.now() - nativeStartInsert;

    const nativeQuery = Array.from({ length: 128 }, () => Math.random());
    const nativeStartSearch = performance.now();
    for (let i = 0; i < 100; i++) {
      this.nativeBackend.search(nativeQuery, 10, 'cosine', 0.0);
    }
    const nativeSearchDuration = performance.now() - nativeStartSearch;
    const nativeStats = this.nativeBackend.stats();
    this.nativeBackend.close();

    // WASM
    this.wasmBackend = new WasmBackend();
    await this.wasmBackend.initializeAsync();
    const wasmVectors = this.generateVectors(10000, 128);
    const wasmStartInsert = performance.now();
    this.wasmBackend.insertBatch(wasmVectors);
    const wasmInsertDuration = performance.now() - wasmStartInsert;

    const wasmQuery = Array.from({ length: 128 }, () => Math.random());
    const wasmStartSearch = performance.now();
    for (let i = 0; i < 100; i++) {
      this.wasmBackend.search(wasmQuery, 10, 'cosine', 0.0);
    }
    const wasmSearchDuration = performance.now() - wasmStartSearch;
    const wasmStats = this.wasmBackend.stats();
    this.wasmBackend.close();

    console.log('\n   Backend Comparison (10K vectors, 128D):');
    console.log('\n   Insert Performance:');
    console.log(`   - Native: ${nativeInsertDuration.toFixed(2)}ms (${(10000 / nativeInsertDuration * 1000).toFixed(0)} vectors/sec)`);
    console.log(`   - WASM: ${wasmInsertDuration.toFixed(2)}ms (${(10000 / wasmInsertDuration * 1000).toFixed(0)} vectors/sec)`);
    console.log(`   - Ratio: ${(wasmInsertDuration / nativeInsertDuration).toFixed(2)}x slower`);

    console.log('\n   Search Performance (100 queries):');
    console.log(`   - Native: ${(nativeSearchDuration / 100).toFixed(2)}ms/query`);
    console.log(`   - WASM: ${(wasmSearchDuration / 100).toFixed(2)}ms/query`);
    console.log(`   - Ratio: ${(wasmSearchDuration / nativeSearchDuration).toFixed(2)}x slower`);

    console.log('\n   Memory Usage:');
    console.log(`   - Native: ${(nativeStats.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   - WASM: ${(wasmStats.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   - Ratio: ${(wasmStats.size / nativeStats.size).toFixed(2)}x`);
  }

  /**
   * Print result
   */
  private printResult(result: BenchmarkResult): void {
    console.log(`\n   ${result.name}:`);
    console.log(`   - Operations: ${result.operations.toLocaleString()}`);
    console.log(`   - Duration: ${result.duration.toFixed(2)}ms`);
    console.log(`   - Throughput: ${result.throughput}`);
    console.log(`   - Avg Latency: ${result.avgLatency.toFixed(3)}ms`);
    if (result.p95Latency !== undefined) {
      console.log(`   - P95 Latency: ${result.p95Latency.toFixed(3)}ms`);
    }
    if (result.p99Latency !== undefined) {
      console.log(`   - P99 Latency: ${result.p99Latency.toFixed(3)}ms`);
    }
    if (result.memoryUsed !== undefined && result.memoryUsed > 0) {
      console.log(`   - Memory Used: ${(result.memoryUsed / 1024 / 1024).toFixed(2)} MB`);
    }
  }

  /**
   * Print summary
   */
  printSummary(): void {
    console.log('\n\n═══════════════════════════════════════════════════════════');
    console.log('📈 PERFORMANCE BENCHMARK SUMMARY');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Print all results
    this.results.forEach(result => this.printResult(result));

    // Performance analysis
    console.log('\n\n═══════════════════════════════════════════════════════════');
    console.log('🎯 PERFORMANCE TARGETS vs ACTUAL');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('   Insert Performance:');
    console.log('   - Native Target: 330K+ vectors/sec');
    const nativeBatch = this.results.find(r => r.name.includes('Native: Batch Insert (100K'));
    if (nativeBatch) {
      const status = nativeBatch.opsPerSecond * 100000 >= 330000 ? '✅' : '⚠️';
      console.log(`   ${status} Native Actual: ${(nativeBatch.opsPerSecond * 100000).toFixed(0)} vectors/sec`);
    }

    console.log('\n   - WASM Target: 10K+ vectors/sec');
    const wasmBatch = this.results.find(r => r.name.includes('WASM: Batch Insert (10K'));
    if (wasmBatch) {
      const status = wasmBatch.opsPerSecond * 10000 >= 10000 ? '✅' : '⚠️';
      console.log(`   ${status} WASM Actual: ${(wasmBatch.opsPerSecond * 10000).toFixed(0)} vectors/sec`);
    }

    console.log('\n   Search Performance:');
    console.log('   - Target: <10ms for 10K vectors');
    const nativeSearch = this.results.find(r => r.name.includes('Native: Search (10K vectors'));
    if (nativeSearch) {
      const status = nativeSearch.avgLatency < 10 ? '✅' : '⚠️';
      console.log(`   ${status} Native Actual: ${nativeSearch.avgLatency.toFixed(2)}ms`);
    }

    console.log('\n   Memory Usage:');
    console.log('   - Target: <3MB per 1K vectors');
    console.log('   ℹ️  See memory benchmark results above for details');

    console.log('\n═══════════════════════════════════════════════════════════\n');
  }

  /**
   * Run all benchmarks
   */
  async runAll(): Promise<void> {
    console.log('🚀 SQLiteVector Performance Benchmarks\n');
    console.log('Testing both Native and WASM backends...\n');

    try {
      // Insert benchmarks
      await this.benchmarkNativeSingleInsert();
      await this.benchmarkNativeBatchInsert();
      await this.benchmarkWasmBatchInsert();

      // Search benchmarks
      await this.benchmarkNativeSearch();
      await this.benchmarkWasmSearch();

      // Memory benchmarks
      await this.benchmarkMemoryUsage();

      // Backend comparison
      await this.benchmarkBackendComparison();

      // Print summary
      this.printSummary();
    } catch (error) {
      console.error('Benchmark error:', error);
      throw error;
    }
  }
}

// Run benchmarks if executed directly
if (require.main === module) {
  const benchmark = new PerformanceBenchmark();
  benchmark.runAll()
    .then(() => {
      console.log('✅ All benchmarks completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Benchmark failed:', error);
      process.exit(1);
    });
}

export { PerformanceBenchmark };
