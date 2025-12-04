#!/usr/bin/env node
import { Transform } from 'stream';
interface PatternMetric {
    ts: string;
    run: string;
    run_id: string;
    iteration: number;
    circle: string;
    depth: number;
    pattern: string;
    mode: string;
    mutation: boolean;
    gate: string;
    framework?: string;
    scheduler?: string;
    tags?: string[];
    economic?: {
        cod: number;
        wsjf_score: number;
    };
    [key: string]: any;
}
interface ProcessingMetrics {
    totalRecords: number;
    processingTime: number;
    recordsPerSecond: number;
    memoryUsage: NodeJS.MemoryUsage;
    anomaliesFound: number;
}
interface Anomaly {
    type: string;
    pattern: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    evidence: any;
    recommendation: string;
}
declare class StreamingJsonlProcessor {
    private readonly bufferSize;
    private processedCount;
    constructor(bufferSize?: number);
    processJsonlFile(filePath: string): Promise<ProcessingMetrics>;
}
declare class PatternAnalyzerTransform extends Transform {
    processedCount: number;
    anomalies: Anomaly[];
    private readonly patternStats;
    private readonly slidingWindow;
    private readonly anomalyDetector;
    constructor();
    _transform(metric: PatternMetric, encoding: BufferEncoding, callback: Function): void;
    _flush(callback: Function): void;
    private updatePatternStats;
    private detectAnomaliesBatch;
    private extractMetricValue;
}
declare class OptimizedAnomalyDetector {
    detectAnomalies(metrics: PatternMetric[], patternStats: Map<string, PatternStats>): Anomaly[];
    private detectStatisticalAnomalies;
    private calculateSeverity;
    private groupByPattern;
    private extractMetricValue;
}
interface PatternStats {
    count: number;
    sum: number;
    sumSquares: number;
    min: number;
    max: number;
    lastSeen: Date;
}
export { StreamingJsonlProcessor, PatternAnalyzerTransform, OptimizedAnomalyDetector, ProcessingMetrics, Anomaly, PatternMetric };
//# sourceMappingURL=optimized_pattern_analyzer.d.ts.map