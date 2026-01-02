#!/usr/bin/env node
interface BenchmarkResult {
    test_name: string;
    original_time_ms: number;
    optimized_time_ms: number;
    improvement_factor: number;
    memory_original_mb: number;
    memory_optimized_mb: number;
    memory_improvement_factor: number;
    throughput_original_ops: number;
    throughput_optimized_ops: number;
    throughput_improvement_factor: number;
}
interface BenchmarkSuite {
    name: string;
    results: BenchmarkResult[];
    total_improvement: number;
    summary: string;
}
declare class PerformanceBenchmarkSuite {
    private testResults;
    private testDataPath;
    constructor(testDataPath?: string);
    runFullBenchmarkSuite(): Promise<BenchmarkSuite>;
    private ensureTestData;
    private countRecords;
    private generateTestData;
    private benchmarkJsonlProcessing;
    private measureOriginalJsonlProcessing;
    private measureOptimizedJsonlProcessing;
    private benchmarkAnomalyDetection;
    private measureAnomalyDetectionOriginal;
    private measureAnomalyDetectionOptimized;
    private benchmarkMemoryUsage;
    private measureMemoryAllocationPattern;
    private benchmarkCachingPerformance;
    private measureCachePerformance;
    private simulatePatternQuery;
    private benchmarkRealTimeProcessing;
    private measureRealTimeProcessing;
    private processBatch;
    private processEvent;
    private measureMemoryUsage;
    private printBenchmarkResult;
    private generateBenchmarkReport;
    printFullReport(): void;
    saveReport(outputPath?: string): Promise<void>;
}
export { PerformanceBenchmarkSuite, BenchmarkResult, BenchmarkSuite };
//# sourceMappingURL=performance_benchmark_suite.d.ts.map