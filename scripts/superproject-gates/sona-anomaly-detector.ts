/**
 * Sona Anomaly Detector
 * 
 * Implements anomaly detection using Z-score based statistical analysis
 * with rolling window statistics and multi-variate feature analysis.
 * 
 * This is the initial TypeScript implementation that will be replaced
 * with Rust FFI bindings to ruvector-sona when the native library is ready.
 * 
 * Performance targets from RUVECTOR_INTEGRATION_ARCHITECTURE.md:
 * - Anomaly Detection: <50ms (P99: 45ms)
 * - Memory footprint: <10MB for rolling window
 * 
 * Key features:
 * - Z-score based anomaly scoring
 * - Rolling window baseline calculation
 * - Multi-variate feature analysis with configurable weights
 * - Calibration save/load for Manthra layer integration
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';

import {
  SonaAnomalyConfig,
  AnomalyResult,
  MetricDataPoint,
  BaselineStats,
  CalibrationSnapshot,
  DetectorStats,
  DEFAULT_SONA_CONFIG,
  METRIC_FEATURES
} from './types.js';

/**
 * SonaAnomalyDetector - Z-score based anomaly detection
 * 
 * Implements statistical anomaly detection using:
 * - Rolling window statistics for baseline calculation
 * - Z-score based anomaly scoring
 * - Multi-variate feature analysis with configurable weights
 * - Isolation Forest algorithm (mocked until Rust FFI ready)
 */
export class SonaAnomalyDetector extends EventEmitter {
  private config: SonaAnomalyConfig;
  private history: MetricDataPoint[] = [];
  private baselineStats: BaselineStats | null = null;
  private stats: DetectorStats;
  private detectionLatencies: number[] = [];
  private readonly maxLatencyHistory = 1000;
  private calibrationId: string;

  constructor(config: Partial<SonaAnomalyConfig> = {}) {
    super();
    this.config = { ...DEFAULT_SONA_CONFIG, ...config };
    this.calibrationId = this.generateCalibrationId();
    this.stats = {
      totalDataPoints: 0,
      anomaliesDetected: 0,
      avgDetectionLatencyMs: 0,
      p99DetectionLatencyMs: 0,
      memoryUsageBytes: 0,
      calibrationCount: 0,
      lastCalibrationTimestamp: Date.now()
    };
  }

  /**
   * Add a new data point to the history window
   * Automatically evicts old data points based on configuration
   */
  public addDataPoint(point: MetricDataPoint): void {
    // Add to history
    this.history.push(point);
    
    // Evict old data points based on maxDataPointAge
    if (this.config.maxDataPointAge) {
      const cutoffTime = Date.now() - this.config.maxDataPointAge;
      this.history = this.history.filter(p => p.timestamp >= cutoffTime);
    }
    
    // Enforce window size limit
    while (this.history.length > this.config.windowSize) {
      this.history.shift();
    }
    
    // Update baseline statistics if we have enough samples
    if (this.history.length >= this.config.minSamples) {
      this.updateBaselineStats();
    }
    
    this.stats.totalDataPoints++;
    this.updateMemoryUsage();
  }

  /**
   * Detect anomaly in a given data point
   * Returns AnomalyResult with score, confidence, and contributing features
   */
  public detectAnomaly(point: MetricDataPoint): AnomalyResult {
    const startTime = performance.now();
    
    try {
      // Check if we have enough data for detection
      if (this.history.length < this.config.minSamples || !this.baselineStats) {
        return this.createDefaultResult(point, 'insufficient_data');
      }
      
      // Calculate Z-scores for each feature
      const zScores = this.calculateZScores(point);
      
      // Calculate weighted anomaly score
      const { score, contributingFeatures, featureScores } = this.calculateAnomalyScore(point, zScores);
      
      // Determine if this is an anomaly based on threshold
      const isAnomaly = score >= this.config.sensitivityThreshold;
      
      // Calculate confidence based on sample size and score stability
      const confidence = this.calculateConfidence(score);
      
      const result: AnomalyResult = {
        isAnomaly,
        score,
        confidence,
        contributingFeatures,
        timestamp: Date.now(),
        featureScores,
        zScores
      };
      
      // Update stats
      if (isAnomaly) {
        this.stats.anomaliesDetected++;
        this.emit('anomalyDetected', result, point);
      }
      
      return result;
    } finally {
      // Track detection latency
      const latency = performance.now() - startTime;
      this.recordLatency(latency);
    }
  }

  /**
   * Get current baseline statistics
   */
  public getBaselineStats(): BaselineStats {
    if (!this.baselineStats) {
      return {
        means: {},
        stdDevs: {},
        sampleCount: 0,
        lastUpdated: Date.now(),
        mins: {},
        maxs: {}
      };
    }
    return { ...this.baselineStats };
  }

  /**
   * Save current calibration state for Manthra layer
   * Allows preserving anomaly detection state across deployments
   */
  public saveCalibration(): CalibrationSnapshot {
    const snapshot: CalibrationSnapshot = {
      id: this.calibrationId,
      version: '1.0.0',
      timestamp: Date.now(),
      config: { ...this.config },
      baselineStats: this.getBaselineStats(),
      historyWindow: [...this.history],
      calibrationHash: '',  // Will be calculated below
      metadata: {
        environment: process.env.NODE_ENV || 'development'
      }
    };
    
    // Calculate calibration hash for integrity verification
    snapshot.calibrationHash = this.calculateCalibrationHash(snapshot);
    
    this.stats.calibrationCount++;
    this.stats.lastCalibrationTimestamp = Date.now();
    
    this.emit('calibrationSaved', snapshot);
    
    return snapshot;
  }

  /**
   * Load a previously saved calibration
   * Restores anomaly detection state from Manthra layer
   */
  public loadCalibration(snapshot: CalibrationSnapshot): void {
    // Verify calibration hash
    const expectedHash = this.calculateCalibrationHash({
      ...snapshot,
      calibrationHash: ''
    });
    
    if (snapshot.calibrationHash !== expectedHash) {
      throw new Error('Calibration hash mismatch - snapshot may be corrupted');
    }
    
    // Restore state
    this.config = { ...DEFAULT_SONA_CONFIG, ...snapshot.config };
    this.history = [...snapshot.historyWindow];
    this.baselineStats = snapshot.baselineStats;
    this.calibrationId = snapshot.id;
    
    // Update stats
    this.stats.calibrationCount++;
    this.stats.lastCalibrationTimestamp = Date.now();
    
    this.emit('calibrationLoaded', snapshot);
    
    console.log(`[SONA] Calibration loaded: ${snapshot.id} (${this.history.length} data points restored)`);
  }

  /**
   * Get detector performance statistics
   */
  public getStats(): DetectorStats {
    this.updateMemoryUsage();
    return { ...this.stats };
  }

  /**
   * Reset the detector to initial state
   */
  public reset(): void {
    this.history = [];
    this.baselineStats = null;
    this.calibrationId = this.generateCalibrationId();
    this.detectionLatencies = [];
    this.stats = {
      totalDataPoints: 0,
      anomaliesDetected: 0,
      avgDetectionLatencyMs: 0,
      p99DetectionLatencyMs: 0,
      memoryUsageBytes: 0,
      calibrationCount: 0,
      lastCalibrationTimestamp: Date.now()
    };
    
    this.emit('reset');
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<SonaAnomalyConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Recalculate baseline if window size changed
    if (config.windowSize !== undefined) {
      while (this.history.length > this.config.windowSize) {
        this.history.shift();
      }
      this.updateBaselineStats();
    }
    
    this.emit('configUpdated', this.config);
  }

  /**
   * Get current configuration
   */
  public getConfig(): SonaAnomalyConfig {
    return { ...this.config };
  }

  // ==================== Private Methods ====================

  /**
   * Calculate Z-score for each feature in the data point
   */
  private calculateZScores(point: MetricDataPoint): Record<string, number> {
    if (!this.baselineStats) {
      return {};
    }
    
    const zScores: Record<string, number> = {};
    
    // Calculate Z-score for each core metric
    const metrics: Record<string, number> = {
      [METRIC_FEATURES.CPU]: point.cpu,
      [METRIC_FEATURES.MEMORY]: point.memory,
      [METRIC_FEATURES.HIT_RATE]: point.hitRate,
      [METRIC_FEATURES.LATENCY]: point.latency
    };
    
    for (const [feature, value] of Object.entries(metrics)) {
      const mean = this.baselineStats.means[feature] || 0;
      const stdDev = this.baselineStats.stdDevs[feature] || 1;
      zScores[feature] = this.calculateZScore(value, mean, stdDev);
    }
    
    // Include custom metrics if present
    if (point.custom) {
      for (const [feature, value] of Object.entries(point.custom)) {
        const mean = this.baselineStats.means[feature] || 0;
        const stdDev = this.baselineStats.stdDevs[feature] || 1;
        zScores[feature] = this.calculateZScore(value, mean, stdDev);
      }
    }
    
    return zScores;
  }

  /**
   * Calculate Z-score for a single value
   * Z = (X - μ) / σ
   */
  private calculateZScore(value: number, mean: number, stdDev: number): number {
    if (stdDev === 0 || isNaN(stdDev)) {
      return 0;
    }
    return (value - mean) / stdDev;
  }

  /**
   * Calculate weighted anomaly score from Z-scores
   */
  private calculateAnomalyScore(
    point: MetricDataPoint,
    zScores: Record<string, number>
  ): { score: number; contributingFeatures: string[]; featureScores: Record<string, number> } {
    const featureScores: Record<string, number> = {};
    const contributingFeatures: string[] = [];
    let totalWeight = 0;
    let weightedSum = 0;
    
    const zScoreThreshold = this.config.zScoreThreshold || 2.5;
    
    for (const [feature, zScore] of Object.entries(zScores)) {
      const weight = this.config.featureWeights[feature] || 1.0;
      
      // Normalize Z-score to 0-1 range using sigmoid-like function
      // Higher absolute Z-score = higher anomaly contribution
      const absZScore = Math.abs(zScore);
      const normalizedScore = 1 / (1 + Math.exp(-0.5 * (absZScore - zScoreThreshold)));
      
      featureScores[feature] = normalizedScore;
      weightedSum += normalizedScore * weight;
      totalWeight += weight;
      
      // Track contributing features (those with high Z-scores)
      if (absZScore >= zScoreThreshold) {
        contributingFeatures.push(feature);
      }
    }
    
    // Final score is weighted average
    const score = totalWeight > 0 ? weightedSum / totalWeight : 0;
    
    return { score, contributingFeatures, featureScores };
  }

  /**
   * Calculate confidence level based on sample size and score stability
   */
  private calculateConfidence(score: number): number {
    // Base confidence from sample size (min 0.5, max 1.0)
    const sampleConfidence = Math.min(1.0, 0.5 + (this.history.length / this.config.windowSize) * 0.5);
    
    // Score clarity (how far from decision boundary)
    const boundaryDistance = Math.abs(score - this.config.sensitivityThreshold);
    const scoreConfidence = Math.min(1.0, boundaryDistance * 2);
    
    // Combined confidence
    return sampleConfidence * 0.6 + scoreConfidence * 0.4;
  }

  /**
   * Update baseline statistics from history window
   */
  private updateBaselineStats(): void {
    if (this.history.length === 0) {
      return;
    }
    
    const features = [
      METRIC_FEATURES.CPU,
      METRIC_FEATURES.MEMORY,
      METRIC_FEATURES.HIT_RATE,
      METRIC_FEATURES.LATENCY
    ];
    
    const means: Record<string, number> = {};
    const stdDevs: Record<string, number> = {};
    const mins: Record<string, number> = {};
    const maxs: Record<string, number> = {};
    
    for (const feature of features) {
      const values = this.history.map(p => this.getFeatureValue(p, feature));
      means[feature] = this.calculateMean(values);
      stdDevs[feature] = this.calculateStdDev(values, means[feature]);
      mins[feature] = Math.min(...values);
      maxs[feature] = Math.max(...values);
    }
    
    // Include custom metrics if present in any data point
    const customFeatures = new Set<string>();
    for (const point of this.history) {
      if (point.custom) {
        Object.keys(point.custom).forEach(f => customFeatures.add(f));
      }
    }
    
    for (const feature of customFeatures) {
      const values = this.history
        .filter(p => p.custom?.[feature] !== undefined)
        .map(p => p.custom![feature]);
      
      if (values.length > 0) {
        means[feature] = this.calculateMean(values);
        stdDevs[feature] = this.calculateStdDev(values, means[feature]);
        mins[feature] = Math.min(...values);
        maxs[feature] = Math.max(...values);
      }
    }
    
    this.baselineStats = {
      means,
      stdDevs,
      sampleCount: this.history.length,
      lastUpdated: Date.now(),
      mins,
      maxs
    };
  }

  /**
   * Get feature value from a data point
   */
  private getFeatureValue(point: MetricDataPoint, feature: string): number {
    switch (feature) {
      case METRIC_FEATURES.CPU:
        return point.cpu;
      case METRIC_FEATURES.MEMORY:
        return point.memory;
      case METRIC_FEATURES.HIT_RATE:
        return point.hitRate;
      case METRIC_FEATURES.LATENCY:
        return point.latency;
      default:
        return point.custom?.[feature] ?? 0;
    }
  }

  /**
   * Calculate mean of an array of numbers
   */
  private calculateMean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Calculate standard deviation
   */
  private calculateStdDev(values: number[], mean: number): number {
    if (values.length < 2) return 0;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    return Math.sqrt(avgSquaredDiff);
  }

  /**
   * Create a default result when detection cannot be performed
   */
  private createDefaultResult(point: MetricDataPoint, reason: string): AnomalyResult {
    return {
      isAnomaly: false,
      score: 0,
      confidence: 0,
      contributingFeatures: [],
      timestamp: Date.now(),
      featureScores: {},
      zScores: {}
    };
  }

  /**
   * Record detection latency for performance tracking
   */
  private recordLatency(latencyMs: number): void {
    this.detectionLatencies.push(latencyMs);
    
    // Limit latency history
    while (this.detectionLatencies.length > this.maxLatencyHistory) {
      this.detectionLatencies.shift();
    }
    
    // Update stats
    this.stats.avgDetectionLatencyMs = this.calculateMean(this.detectionLatencies);
    this.stats.p99DetectionLatencyMs = this.calculateP99(this.detectionLatencies);
  }

  /**
   * Calculate P99 latency
   */
  private calculateP99(latencies: number[]): number {
    if (latencies.length === 0) return 0;
    const sorted = [...latencies].sort((a, b) => a - b);
    const p99Index = Math.floor(latencies.length * 0.99);
    return sorted[p99Index] || sorted[sorted.length - 1];
  }

  /**
   * Update memory usage estimate
   */
  private updateMemoryUsage(): void {
    // Estimate memory usage (rough calculation)
    // Each MetricDataPoint is ~100 bytes, plus overhead
    const dataPointSize = 100;
    const overhead = 1000;
    this.stats.memoryUsageBytes = this.history.length * dataPointSize + overhead;
  }

  /**
   * Generate a unique calibration ID
   */
  private generateCalibrationId(): string {
    return `sona-cal-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }

  /**
   * Calculate calibration hash for integrity verification
   */
  private calculateCalibrationHash(snapshot: Omit<CalibrationSnapshot, 'calibrationHash'> & { calibrationHash: string }): string {
    const hashData = JSON.stringify({
      id: snapshot.id,
      version: snapshot.version,
      timestamp: snapshot.timestamp,
      config: snapshot.config,
      baselineStats: snapshot.baselineStats,
      historyLength: snapshot.historyWindow.length
    });
    
    return crypto.createHash('sha256').update(hashData).digest('hex').substring(0, 16);
  }
}

/**
 * Factory function to create a SonaAnomalyDetector with common presets
 */
export function createSonaDetector(
  preset: 'default' | 'sensitive' | 'conservative' | 'custom',
  customConfig?: Partial<SonaAnomalyConfig>
): SonaAnomalyDetector {
  const presets: Record<string, Partial<SonaAnomalyConfig>> = {
    default: DEFAULT_SONA_CONFIG,
    sensitive: {
      ...DEFAULT_SONA_CONFIG,
      sensitivityThreshold: 0.6,
      zScoreThreshold: 2.0,
      minSamples: 5
    },
    conservative: {
      ...DEFAULT_SONA_CONFIG,
      sensitivityThreshold: 0.85,
      zScoreThreshold: 3.0,
      minSamples: 20
    },
    custom: customConfig || DEFAULT_SONA_CONFIG
  };
  
  return new SonaAnomalyDetector(presets[preset] || DEFAULT_SONA_CONFIG);
}
