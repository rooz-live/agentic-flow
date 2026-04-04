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
import { SonaAnomalyConfig, AnomalyResult, MetricDataPoint, BaselineStats, CalibrationSnapshot, DetectorStats } from './types.js';
/**
 * SonaAnomalyDetector - Z-score based anomaly detection
 *
 * Implements statistical anomaly detection using:
 * - Rolling window statistics for baseline calculation
 * - Z-score based anomaly scoring
 * - Multi-variate feature analysis with configurable weights
 * - Isolation Forest algorithm (mocked until Rust FFI ready)
 */
export declare class SonaAnomalyDetector extends EventEmitter {
    private config;
    private history;
    private baselineStats;
    private stats;
    private detectionLatencies;
    private readonly maxLatencyHistory;
    private calibrationId;
    constructor(config?: Partial<SonaAnomalyConfig>);
    /**
     * Add a new data point to the history window
     * Automatically evicts old data points based on configuration
     */
    addDataPoint(point: MetricDataPoint): void;
    /**
     * Detect anomaly in a given data point
     * Returns AnomalyResult with score, confidence, and contributing features
     */
    detectAnomaly(point: MetricDataPoint): AnomalyResult;
    /**
     * Get current baseline statistics
     */
    getBaselineStats(): BaselineStats;
    /**
     * Save current calibration state for Manthra layer
     * Allows preserving anomaly detection state across deployments
     */
    saveCalibration(): CalibrationSnapshot;
    /**
     * Load a previously saved calibration
     * Restores anomaly detection state from Manthra layer
     */
    loadCalibration(snapshot: CalibrationSnapshot): void;
    /**
     * Get detector performance statistics
     */
    getStats(): DetectorStats;
    /**
     * Reset the detector to initial state
     */
    reset(): void;
    /**
     * Update configuration
     */
    updateConfig(config: Partial<SonaAnomalyConfig>): void;
    /**
     * Get current configuration
     */
    getConfig(): SonaAnomalyConfig;
    /**
     * Calculate Z-score for each feature in the data point
     */
    private calculateZScores;
    /**
     * Calculate Z-score for a single value
     * Z = (X - μ) / σ
     */
    private calculateZScore;
    /**
     * Calculate weighted anomaly score from Z-scores
     */
    private calculateAnomalyScore;
    /**
     * Calculate confidence level based on sample size and score stability
     */
    private calculateConfidence;
    /**
     * Update baseline statistics from history window
     */
    private updateBaselineStats;
    /**
     * Get feature value from a data point
     */
    private getFeatureValue;
    /**
     * Calculate mean of an array of numbers
     */
    private calculateMean;
    /**
     * Calculate standard deviation
     */
    private calculateStdDev;
    /**
     * Create a default result when detection cannot be performed
     */
    private createDefaultResult;
    /**
     * Record detection latency for performance tracking
     */
    private recordLatency;
    /**
     * Calculate P99 latency
     */
    private calculateP99;
    /**
     * Update memory usage estimate
     */
    private updateMemoryUsage;
    /**
     * Generate a unique calibration ID
     */
    private generateCalibrationId;
    /**
     * Calculate calibration hash for integrity verification
     */
    private calculateCalibrationHash;
}
/**
 * Factory function to create a SonaAnomalyDetector with common presets
 */
export declare function createSonaDetector(preset: 'default' | 'sensitive' | 'conservative' | 'custom', customConfig?: Partial<SonaAnomalyConfig>): SonaAnomalyDetector;
//# sourceMappingURL=sona-anomaly-detector.d.ts.map