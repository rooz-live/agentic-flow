#!/usr/bin/env node
import { performance } from 'perf_hooks';
import * as fs from 'fs';
import * as path from 'path';
class PerformanceBenchmarkSuite {
    testResults = [];
    testDataPath;
    constructor(testDataPath) {
        this.testDataPath = testDataPath || path.join(process.cwd(), '.goalie', 'pattern_metrics.jsonl');
    }
    async runFullBenchmarkSuite() {
        console.log('🚀 Starting Pattern Metrics Performance Benchmark Suite...\n');
        // Ensure test data exists
        await this.ensureTestData();
        // Run all benchmarks
        await this.benchmarkJsonlProcessing();
        await this.benchmarkAnomalyDetection();
        await this.benchmarkMemoryUsage();
        await this.benchmarkCachingPerformance();
        await this.benchmarkRealTimeProcessing();
        // Calculate overall results
        return this.generateBenchmarkReport();
    }
    async ensureTestData() {
        if (!fs.existsSync(this.testDataPath)) {
            console.log('📝 Generating test data...');
            await this.generateTestData(10000); // 10K records for testing
        }
        const stats = fs.statSync(this.testDataPath);
        console.log(`📊 Test data: ${(stats.size / 1024).toFixed(2)}KB, ${await this.countRecords()} records\n`);
    }
    async countRecords() {
        const content = fs.readFileSync(this.testDataPath, 'utf-8');
        return content.trim().split('\n').filter(line => line.trim()).length;
    }
    async generateTestData(numRecords) {
        const patterns = ['safe-degrade', 'observability-first', 'guardrail-lock', 'iteration-budget', 'depth-ladder'];
        const circles = ['orchestrator', 'analyst', 'governance', 'pre-flight'];
        const modes = ['advisory', 'enforcement', 'mutate'];
        const gates = ['health', 'system-risk', 'governance', 'calibration'];
        const records = [];
        for (let i = 0; i < numRecords; i++) {
            const record = {
                ts: new Date(Date.now() - (numRecords - i) * 1000).toISOString().replace('.000Z', 'Z'),
                run: `test-run-${Math.floor(i / 100)}`,
                run_id: `test-${i}-${Date.now()}`,
                iteration: Math.floor(i / 100),
                circle: circles[i % circles.length],
                depth: (i % 5) + 1,
                pattern: patterns[i % patterns.length],
                mode: modes[i % modes.length],
                mutation: i % 10 === 0,
                gate: gates[i % gates.length],
                framework: i % 2 === 0 ? 'test-framework' : '',
                scheduler: i % 3 === 0 ? 'test-scheduler' : '',
                tags: [patterns[i % patterns.length], circles[i % circles.length]],
                economic: {
                    cod: Math.random() * 100,
                    wsjf_score: Math.random() * 50
                },
                metrics: {
                    processed: i % 50,
                    errors: i % 20 === 0 ? 1 : 0,
                    latency_ms: 50 + Math.random() * 200
                }
            };
            records.push(JSON.stringify(record));
        }
        const dir = path.dirname(this.testDataPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(this.testDataPath, records.join('\n'));
    }
    async benchmarkJsonlProcessing() {
        console.log('⚡ Benchmark: JSONL Processing');
        // Original implementation simulation
        const originalTime = await this.measureOriginalJsonlProcessing();
        const originalMemory = this.measureMemoryUsage();
        // Optimized implementation simulation
        const optimizedTime = await this.measureOptimizedJsonlProcessing();
        const optimizedMemory = this.measureMemoryUsage();
        const result = {
            test_name: 'JSONL Processing',
            original_time_ms: originalTime,
            optimized_time_ms: optimizedTime,
            improvement_factor: originalTime / optimizedTime,
            memory_original_mb: originalMemory,
            memory_optimized_mb: optimizedMemory,
            memory_improvement_factor: originalMemory / optimizedMemory,
            throughput_original_ops: (await this.countRecords()) / (originalTime / 1000),
            throughput_optimized_ops: (await this.countRecords()) / (optimizedTime / 1000),
            throughput_improvement_factor: ((await this.countRecords()) / (optimizedTime / 1000)) / ((await this.countRecords()) / (originalTime / 1000))
        };
        this.testResults.push(result);
        this.printBenchmarkResult(result);
    }
    async measureOriginalJsonlProcessing() {
        const start = performance.now();
        // Simulate original synchronous processing
        const content = fs.readFileSync(this.testDataPath, 'utf-8');
        const lines = content.trim().split('\n');
        let recordCount = 0;
        for (const line of lines) {
            if (line.trim()) {
                try {
                    JSON.parse(line);
                    recordCount++;
                }
                catch (e) {
                    // Skip invalid lines
                }
            }
        }
        return performance.now() - start;
    }
    async measureOptimizedJsonlProcessing() {
        const start = performance.now();
        // Simulate optimized streaming processing
        const stream = fs.createReadStream(this.testDataPath, { encoding: 'utf8', highWaterMark: 64 * 1024 });
        let buffer = '';
        let recordCount = 0;
        return new Promise((resolve) => {
            stream.on('data', (chunk) => {
                buffer += chunk;
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                for (const line of lines) {
                    if (line.trim()) {
                        try {
                            JSON.parse(line);
                            recordCount++;
                        }
                        catch (e) {
                            // Skip invalid lines
                        }
                    }
                }
            });
            stream.on('end', () => {
                if (buffer.trim()) {
                    try {
                        JSON.parse(buffer);
                        recordCount++;
                    }
                    catch (e) {
                        // Skip invalid line
                    }
                }
                resolve(performance.now() - start);
            });
        });
    }
    async benchmarkAnomalyDetection() {
        console.log('🔍 Benchmark: Anomaly Detection');
        // Load test data
        const content = fs.readFileSync(this.testDataPath, 'utf-8');
        const records = content.trim().split('\n')
            .filter(line => line.trim())
            .map(line => JSON.parse(line));
        // Original implementation
        const originalTime = this.measureAnomalyDetectionOriginal(records);
        const originalMemory = this.measureMemoryUsage();
        // Optimized implementation
        const optimizedTime = this.measureAnomalyDetectionOptimized(records);
        const optimizedMemory = this.measureMemoryUsage();
        const result = {
            test_name: 'Anomaly Detection',
            original_time_ms: originalTime,
            optimized_time_ms: optimizedTime,
            improvement_factor: originalTime / optimizedTime,
            memory_original_mb: originalMemory,
            memory_optimized_mb: optimizedMemory,
            memory_improvement_factor: originalMemory / optimizedMemory,
            throughput_original_ops: records.length / (originalTime / 1000),
            throughput_optimized_ops: records.length / (optimizedTime / 1000),
            throughput_improvement_factor: (records.length / (optimizedTime / 1000)) / (records.length / (originalTime / 1000))
        };
        this.testResults.push(result);
        this.printBenchmarkResult(result);
    }
    measureAnomalyDetectionOriginal(records) {
        const start = performance.now();
        // Simulate original O(n²) anomaly detection
        for (let i = 0; i < records.length; i++) {
            for (let j = i + 1; j < Math.min(i + 100, records.length); j++) {
                // Simulate comparison
                const diff = Math.abs(records[i].depth - records[j].depth);
                if (diff > 3) {
                    // Anomaly detected
                }
            }
        }
        return performance.now() - start;
    }
    measureAnomalyDetectionOptimized(records) {
        const start = performance.now();
        // Simulate optimized O(n) anomaly detection with sliding window
        const windowSize = 100;
        const depthSums = new Array(11).fill(0); // depths 0-10
        const depthCounts = new Array(11).fill(0);
        for (let i = 0; i < records.length; i++) {
            const record = records[i];
            const depth = record.depth || 0;
            // Update sliding window
            if (i >= windowSize) {
                const oldRecord = records[i - windowSize];
                const oldDepth = oldRecord.depth || 0;
                depthSums[oldDepth] -= oldDepth;
                depthCounts[oldDepth]--;
            }
            depthSums[depth] += depth;
            depthCounts[depth]++;
            // Quick anomaly check
            const windowStart = Math.max(0, i - windowSize + 1);
            const windowSizeActual = i - windowStart + 1;
            const avgDepth = depthSums[depth] / Math.max(1, depthCounts[depth]);
            if (Math.abs(depth - avgDepth) > 2.5) {
                // Anomaly detected
            }
        }
        return performance.now() - start;
    }
    async benchmarkMemoryUsage() {
        console.log('💾 Benchmark: Memory Usage');
        // Test memory allocation patterns
        const iterations = 1000;
        // Original implementation (many small allocations)
        const originalMemory = this.measureMemoryAllocationPattern(() => {
            for (let i = 0; i < iterations; i++) {
                const obj = {
                    id: i,
                    data: new Array(100).fill(0).map(() => Math.random()),
                    timestamp: Date.now(),
                    metadata: { processed: false }
                };
                // Force GC pressure
                if (i % 100 === 0) {
                    if (global.gc)
                        global.gc();
                }
            }
        });
        // Optimized implementation (object pooling)
        const optimizedMemory = this.measureMemoryAllocationPattern(() => {
            const pool = [];
            for (let i = 0; i < iterations; i++) {
                let obj = pool.pop();
                if (!obj) {
                    obj = {
                        id: 0,
                        data: new Array(100),
                        timestamp: 0,
                        metadata: {}
                    };
                }
                // Reuse object
                obj.id = i;
                for (let j = 0; j < obj.data.length; j++) {
                    obj.data[j] = Math.random();
                }
                obj.timestamp = Date.now();
                obj.metadata.processed = false;
                if (i % 10 === 0) {
                    pool.push(obj); // Return to pool
                }
            }
        });
        const result = {
            test_name: 'Memory Usage',
            original_time_ms: 0, // Memory-focused test
            optimized_time_ms: 0,
            improvement_factor: 0,
            memory_original_mb: originalMemory,
            memory_optimized_mb: optimizedMemory,
            memory_improvement_factor: originalMemory / optimizedMemory,
            throughput_original_ops: 0,
            throughput_optimized_ops: 0,
            throughput_improvement_factor: 0
        };
        this.testResults.push(result);
        this.printBenchmarkResult(result);
    }
    measureMemoryAllocationPattern(fn) {
        const beforeMemory = this.measureMemoryUsage();
        fn();
        if (global.gc)
            global.gc(); // Force garbage collection
        const afterMemory = this.measureMemoryUsage();
        return Math.max(0, afterMemory - beforeMemory);
    }
    async benchmarkCachingPerformance() {
        console.log('🗄️  Benchmark: Caching Performance');
        const queries = [
            { pattern: 'safe-degrade', circle: 'orchestrator' },
            { pattern: 'observability-first', circle: 'analyst' },
            { pattern: 'guardrail-lock', circle: 'governance' },
            { pattern: 'iteration-budget', circle: 'pre-flight' },
            { pattern: 'depth-ladder', circle: 'orchestrator' }
        ];
        // Original implementation (no caching)
        const originalTime = this.measureCachePerformance(queries, false);
        const originalMemory = this.measureMemoryUsage();
        // Optimized implementation (with caching)
        const optimizedTime = this.measureCachePerformance(queries, true);
        const optimizedMemory = this.measureMemoryUsage();
        const result = {
            test_name: 'Caching Performance',
            original_time_ms: originalTime,
            optimized_time_ms: optimizedTime,
            improvement_factor: originalTime / optimizedTime,
            memory_original_mb: originalMemory,
            memory_optimized_mb: optimizedMemory,
            memory_improvement_factor: originalMemory / optimizedMemory,
            throughput_original_ops: queries.length / (originalTime / 1000),
            throughput_optimized_ops: queries.length / (optimizedTime / 1000),
            throughput_improvement_factor: (queries.length / (optimizedTime / 1000)) / (queries.length / (originalTime / 1000))
        };
        this.testResults.push(result);
        this.printBenchmarkResult(result);
    }
    measureCachePerformance(queries, useCache) {
        const start = performance.now();
        const cache = new Map();
        for (const query of queries) {
            const key = `${query.pattern}:${query.circle}`;
            if (useCache && cache.has(key)) {
                // Cache hit
                const result = cache.get(key);
            }
            else {
                // Cache miss - simulate processing
                const result = this.simulatePatternQuery(query);
                if (useCache) {
                    cache.set(key, result);
                }
            }
        }
        return performance.now() - start;
    }
    simulatePatternQuery(query) {
        // Simulate expensive query processing
        const start = performance.now();
        while (performance.now() - start < 5) {
            // Simulate processing time
            Math.random();
        }
        return { pattern: query.pattern, results: Math.floor(Math.random() * 100) };
    }
    async benchmarkRealTimeProcessing() {
        console.log('⚡ Benchmark: Real-time Processing');
        const eventRate = 1000; // events per second
        const testDuration = 5000; // 5 seconds
        const totalEvents = (eventRate * testDuration) / 1000;
        // Original implementation (synchronous)
        const originalTime = this.measureRealTimeProcessing(totalEvents, false);
        const originalMemory = this.measureMemoryUsage();
        // Optimized implementation (asynchronous batched)
        const optimizedTime = this.measureRealTimeProcessing(totalEvents, true);
        const optimizedMemory = this.measureMemoryUsage();
        const result = {
            test_name: 'Real-time Processing',
            original_time_ms: originalTime,
            optimized_time_ms: optimizedTime,
            improvement_factor: originalTime / optimizedTime,
            memory_original_mb: originalMemory,
            memory_optimized_mb: optimizedMemory,
            memory_improvement_factor: originalMemory / optimizedMemory,
            throughput_original_ops: totalEvents / (originalTime / 1000),
            throughput_optimized_ops: totalEvents / (optimizedTime / 1000),
            throughput_improvement_factor: (totalEvents / (optimizedTime / 1000)) / (totalEvents / (originalTime / 1000))
        };
        this.testResults.push(result);
        this.printBenchmarkResult(result);
    }
    measureRealTimeProcessing(eventCount, useBatching) {
        const start = performance.now();
        const batchSize = 100;
        let processed = 0;
        if (useBatching) {
            // Batched processing
            const batch = [];
            for (let i = 0; i < eventCount; i++) {
                batch.push({ id: i, timestamp: Date.now() });
                if (batch.length >= batchSize) {
                    // Process batch
                    this.processBatch(batch);
                    batch.length = 0; // Clear batch
                    processed += batchSize;
                }
            }
            // Process remaining
            if (batch.length > 0) {
                this.processBatch(batch);
                processed += batch.length;
            }
        }
        else {
            // Individual processing
            for (let i = 0; i < eventCount; i++) {
                const event = { id: i, timestamp: Date.now() };
                this.processEvent(event);
                processed++;
            }
        }
        return performance.now() - start;
    }
    processBatch(events) {
        // Simulate batch processing
        for (const event of events) {
            event.processed = true;
        }
    }
    processEvent(event) {
        // Simulate individual event processing
        event.processed = true;
    }
    measureMemoryUsage() {
        const usage = process.memoryUsage();
        return usage.heapUsed / 1024 / 1024; // MB
    }
    printBenchmarkResult(result) {
        const { test_name, improvement_factor, memory_improvement_factor } = result;
        console.log(`  ${test_name}:`);
        console.log(`    Speed Improvement: ${improvement_factor.toFixed(2)}x`);
        if (memory_improvement_factor > 0) {
            console.log(`    Memory Improvement: ${memory_improvement_factor.toFixed(2)}x`);
        }
        console.log(`    Throughput: ${result.throughput_optimized_ops.toFixed(0)} ops/sec`);
        console.log('');
    }
    generateBenchmarkReport() {
        const avgImprovement = this.testResults.reduce((sum, result) => sum + result.improvement_factor, 0) / this.testResults.length;
        const maxImprovement = Math.max(...this.testResults.map(r => r.improvement_factor));
        const minImprovement = Math.min(...this.testResults.map(r => r.improvement_factor));
        let summary = '';
        if (avgImprovement > 5) {
            summary = 'Excellent performance improvements achieved!';
        }
        else if (avgImprovement > 2) {
            summary = 'Good performance improvements, but room for optimization remains.';
        }
        else {
            summary = 'Minimal performance improvements - review optimization strategies.';
        }
        return {
            name: 'Pattern Metrics Performance Benchmark',
            results: this.testResults,
            total_improvement: avgImprovement,
            summary
        };
    }
    printFullReport() {
        const suite = this.generateBenchmarkReport();
        console.log('\n📊 BENCHMARK SUMMARY REPORT');
        console.log('='.repeat(50));
        console.log(`Average Improvement: ${suite.total_improvement.toFixed(2)}x`);
        console.log(`Max Improvement: ${Math.max(...suite.results.map(r => r.improvement_factor)).toFixed(2)}x`);
        console.log(`Min Improvement: ${Math.min(...suite.results.map(r => r.improvement_factor)).toFixed(2)}x`);
        console.log(`\n📝 Assessment: ${suite.summary}\n`);
        // Detailed results table
        console.log('DETAILED RESULTS:');
        console.log('─'.repeat(80));
        console.log('Test Name                    | Speed↑ | Memory↓ | Throughput (ops/sec)');
        console.log('─'.repeat(80));
        for (const result of suite.results) {
            const speedImprovement = result.improvement_factor.toFixed(1) + 'x';
            const memoryImprovement = result.memory_improvement_factor > 0 ?
                result.memory_improvement_factor.toFixed(1) + 'x' : 'N/A';
            const throughput = result.throughput_optimized_ops.toFixed(0);
            const name = result.test_name.padEnd(28);
            const speed = speedImprovement.padStart(7);
            const memory = memoryImprovement.padStart(8);
            const tp = throughput.padStart(17);
            console.log(`${name} | ${speed} | ${memory} | ${tp}`);
        }
        console.log('─'.repeat(80));
    }
    async saveReport(outputPath) {
        const suite = this.generateBenchmarkReport();
        const reportPath = outputPath || path.join(process.cwd(), 'performance_benchmark_report.json');
        fs.writeFileSync(reportPath, JSON.stringify(suite, null, 2));
        console.log(`\n📁 Detailed report saved to: ${reportPath}`);
    }
}
// CLI interface
async function main() {
    const args = process.argv.slice(2);
    const outputPath = args.find(arg => arg.startsWith('--output='))?.split('=')[1];
    const testDataPath = args.find(arg => arg.startsWith('--test-data='))?.split('=')[1];
    console.log('🔬 Pattern Metrics Performance Benchmark Suite');
    console.log('===============================================\n');
    try {
        const benchmark = new PerformanceBenchmarkSuite(testDataPath);
        // Run the full benchmark suite
        await benchmark.runFullBenchmarkSuite();
        // Print detailed report
        benchmark.printFullReport();
        // Save report to file
        await benchmark.saveReport(outputPath);
    }
    catch (error) {
        console.error('❌ Benchmark failed:', error);
        process.exit(1);
    }
}
if (require.main === module) {
    main().catch(console.error);
}
export { PerformanceBenchmarkSuite };
//# sourceMappingURL=performance_benchmark_suite.js.map