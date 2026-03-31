#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { Readable, Transform } from 'stream';

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

// Optimized streaming JSONL processor
class StreamingJsonlProcessor {
  private readonly bufferSize: number;
  private processedCount = 0;

  constructor(bufferSize = 1000) {
    this.bufferSize = bufferSize;
  }

  async processJsonlFile(filePath: string): Promise<ProcessingMetrics> {
    const startTime = performance.now();
    const startMemory = process.memoryUsage();

    return new Promise((resolve, reject) => {
      const readStream = fs.createReadStream(filePath, {
        encoding: 'utf8',
        highWaterMark: 64 * 1024 // 64KB chunks
      });

      const processor = new JsonlTransformStream(this.bufferSize);
      const analyzer = new PatternAnalyzerTransform();

      readStream
        .pipe(processor)
        .pipe(analyzer)
        .on('finish', () => {
          const processingTime = performance.now() - startTime;
          const endMemory = process.memoryUsage();

          resolve({
            totalRecords: analyzer.processedCount,
            processingTime,
            recordsPerSecond: (analyzer.processedCount / processingTime) * 1000,
            memoryUsage: {
              rss: endMemory.rss - startMemory.rss,
              heapUsed: endMemory.heapUsed - startMemory.heapUsed,
              heapTotal: endMemory.heapTotal - startMemory.heapTotal,
              external: endMemory.external - startMemory.external,
              arrayBuffers: endMemory.arrayBuffers - startMemory.arrayBuffers
            },
            anomaliesFound: analyzer.anomalies.length
          });
        })
        .on('error', reject);
    });
  }
}

// Transform stream for parsing JSONL
class JsonlTransformStream extends Transform {
  private buffer = '';
  private readonly maxBufferSize: number;

  constructor(private batchSize: number, maxBufferSize = 1024 * 1024) {
    super({ objectMode: true });
    this.maxBufferSize = maxBufferSize;
  }

  _transform(chunk: string, encoding: BufferEncoding, callback: Function): void {
    this.buffer += chunk;

    // Prevent buffer overflow
    if (this.buffer.length > this.maxBufferSize) {
      const lines = this.buffer.split('\n');
      this.buffer = lines.pop() || '';

      for (const line of lines) {
        this.processLine(line);
      }
    }

    callback();
  }

  _flush(callback: Function): void {
    if (this.buffer.trim()) {
      this.processLine(this.buffer);
    }
    callback();
  }

  private processLine(line: string): void {
    if (!line.trim()) return;

    try {
      const record = JSON.parse(line) as PatternMetric;
      this.push(record);
    } catch (error) {
      // Log invalid lines but continue processing
      if (process.env.DEBUG) {
        console.warn(`Invalid JSON line: ${line.substring(0, 100)}...`);
      }
    }
  }
}

// Optimized pattern analyzer with real-time processing
class PatternAnalyzerTransform extends Transform {
  public processedCount = 0;
  public anomalies: Anomaly[] = [];

  private readonly patternStats = new Map<string, PatternStats>();
  private readonly slidingWindow = new CircularBuffer<PatternMetric>(10000);
  private readonly anomalyDetector = new OptimizedAnomalyDetector();

  constructor() {
    super({ objectMode: true });
  }

  _transform(metric: PatternMetric, encoding: BufferEncoding, callback: Function): void {
    this.processedCount++;

    // Add to sliding window for real-time analysis
    this.slidingWindow.push(metric);

    // Update pattern statistics
    this.updatePatternStats(metric);

    // Check for anomalies in batches
    if (this.processedCount % 100 === 0) {
      this.detectAnomaliesBatch();
    }

    // Continue processing
    callback();
  }

  _flush(callback: Function): void {
    this.detectAnomaliesBatch();
    callback();
  }

  private updatePatternStats(metric: PatternMetric): void {
    const pattern = metric.pattern;
    const existing = this.patternStats.get(pattern) || {
      count: 0,
      sum: 0,
      sumSquares: 0,
      min: Infinity,
      max: -Infinity,
      lastSeen: new Date(0)
    };

    const value = this.extractMetricValue(metric);

    existing.count++;
    existing.sum += value;
    existing.sumSquares += value * value;
    existing.min = Math.min(existing.min, value);
    existing.max = Math.max(existing.max, value);
    existing.lastSeen = new Date(metric.ts);

    this.patternStats.set(pattern, existing);
  }

  private detectAnomaliesBatch(): void {
    const recentMetrics = this.slidingWindow.toArray();
    const batchAnomalies = this.anomalyDetector.detectAnomalies(recentMetrics, this.patternStats);
    this.anomalies.push(...batchAnomalies);
  }

  private extractMetricValue(metric: PatternMetric): number {
    // Extract a numeric value for statistical analysis
    return metric.economic?.cod || metric.depth || 1;
  }
}

// Circular buffer for O(1) operations
class CircularBuffer<T> {
  private buffer: T[];
  private head = 0;
  private tail = 0;
  private size = 0;

  constructor(private capacity: number) {
    this.buffer = new Array(capacity);
  }

  push(item: T): void {
    this.buffer[this.tail] = item;
    this.tail = (this.tail + 1) % this.capacity;

    if (this.size < this.capacity) {
      this.size++;
    } else {
      this.head = (this.head + 1) % this.capacity;
    }
  }

  toArray(): T[] {
    const result: T[] = [];
    for (let i = 0; i < this.size; i++) {
      const index = (this.head + i) % this.capacity;
      result.push(this.buffer[index]);
    }
    return result;
  }
}

// High-performance anomaly detector
class OptimizedAnomalyDetector {
  detectAnomalies(metrics: PatternMetric[], patternStats: Map<string, PatternStats>): Anomaly[] {
    const anomalies: Anomaly[] = [];
    const patternGroups = this.groupByPattern(metrics);

    for (const [pattern, patternMetrics] of Object.entries(patternGroups)) {
      const stats = patternStats.get(pattern);
      if (!stats || patternMetrics.length < 5) continue;

      // Statistical anomaly detection
      const anomaliesForPattern = this.detectStatisticalAnomalies(pattern, patternMetrics, stats);
      anomalies.push(...anomaliesForPattern);
    }

    return anomalies;
  }

  private detectStatisticalAnomalies(pattern: string, metrics: PatternMetric[], stats: PatternStats): Anomaly[] {
    const anomalies: Anomaly[] = [];

    if (stats.count < 2) return anomalies;

    const mean = stats.sum / stats.count;
    const variance = (stats.sumSquares / stats.count) - (mean * mean);
    const stdDev = Math.sqrt(Math.max(0, variance));

    // Check recent metrics for outliers
    for (const metric of metrics.slice(-10)) {
      const value = this.extractMetricValue(metric);
      const zScore = stdDev > 0 ? (value - mean) / stdDev : 0;

      if (Math.abs(zScore) > 2.5) {
        anomalies.push({
          type: 'statistical_outlier',
          pattern,
          severity: this.calculateSeverity(zScore),
          description: `Statistical anomaly detected: z-score ${zScore.toFixed(2)}`,
          evidence: { value, mean, stdDev, zScore },
          recommendation: `Investigate ${pattern} pattern for unexpected behavior`
        });
      }
    }

    return anomalies;
  }

  private calculateSeverity(zScore: number): 'low' | 'medium' | 'high' | 'critical' {
    const absZ = Math.abs(zScore);
    if (absZ > 4) return 'critical';
    if (absZ > 3) return 'high';
    if (absZ > 2.5) return 'medium';
    return 'low';
  }

  private groupByPattern(metrics: PatternMetric[]): Record<string, PatternMetric[]> {
    return metrics.reduce((acc, metric) => {
      if (!acc[metric.pattern]) {
        acc[metric.pattern] = [];
      }
      acc[metric.pattern].push(metric);
      return acc;
    }, {} as Record<string, PatternMetric[]>);
  }

  private extractMetricValue(metric: PatternMetric): number {
    return metric.economic?.cod || metric.depth || 1;
  }
}

// Pattern statistics interface
interface PatternStats {
  count: number;
  sum: number;
  sumSquares: number;
  min: number;
  max: number;
  lastSeen: Date;
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const filePath = args[0] || path.join(process.cwd(), '.goalie', 'pattern_metrics.jsonl');
  const jsonMode = args.includes('--json');

  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }

  console.log(`Analyzing pattern metrics: ${filePath}`);

  const processor = new StreamingJsonlProcessor();

  try {
    const metrics = await processor.processJsonlFile(filePath);

    if (jsonMode) {
      console.log(JSON.stringify(metrics, null, 2));
    } else {
      console.log('\n=== Performance Analysis Results ===');
      console.log(`Total Records Processed: ${metrics.totalRecords.toLocaleString()}`);
      console.log(`Processing Time: ${metrics.processingTime.toFixed(2)}ms`);
      console.log(`Records per Second: ${metrics.recordsPerSecond.toFixed(0)}`);
      console.log(`Memory Used: ${(metrics.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`Anomalies Detected: ${metrics.anomaliesFound}`);

      console.log('\n=== Performance Metrics ===');
      console.log(`CPU Efficiency: ${(metrics.recordsPerSecond / 1000).toFixed(2)}K records/sec`);
      console.log(`Memory Efficiency: ${(metrics.totalRecords / (metrics.memoryUsage.heapUsed / 1024 / 1024)).toFixed(0)} records/MB`);

      if (metrics.anomaliesFound > 0) {
        console.log('\n=== Recommendations ===');
        console.log('• Anomalies detected - review pattern behavior');
        console.log('• Consider adjusting anomaly detection thresholds');
        console.log('• Monitor pattern frequency and distribution');
      }

      console.log('\n=== Optimization Status ===');
      if (metrics.recordsPerSecond > 10000) {
        console.log('✅ Excellent processing performance');
      } else if (metrics.recordsPerSecond > 5000) {
        console.log('⚠️  Good performance, room for improvement');
      } else {
        console.log('❌ Poor performance, optimization recommended');
      }

      const memoryEfficiency = metrics.totalRecords / (metrics.memoryUsage.heapUsed / 1024 / 1024);
      if (memoryEfficiency > 1000) {
        console.log('✅ Excellent memory efficiency');
      } else if (memoryEfficiency > 500) {
        console.log('⚠️  Good memory efficiency, room for improvement');
      } else {
        console.log('❌ Poor memory efficiency, optimization needed');
      }
    }
  } catch (error) {
    console.error('Analysis failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export {
  StreamingJsonlProcessor,
  PatternAnalyzerTransform,
  OptimizedAnomalyDetector,
  ProcessingMetrics,
  Anomaly,
  PatternMetric
};