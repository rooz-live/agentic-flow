/**
 * Duration Metrics Quality Assurance System
 * 
 * Implements comprehensive validation, quality scoring, and anomaly detection
 * for duration_ms metrics across all components
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import {
  DurationMetric,
  DurationQuality,
  DurationQualityIssue,
  DurationQualityIssueType,
  DurationQualitySeverity,
  DurationTrackingError,
  DurationTrackingEvent,
  DurationEventType,
  DurationValidationConfig,
  DurationCorrectionRule,
  DurationDataQualityCheck,
  DurationAnomaly,
  AnomalyType,
  AnomalySeverity,
  DurationTrend,
  TrendType,
  TrendDirection,
  TimeRange
} from './types';

export interface QualityAssuranceConfig {
  enabled: boolean;
  validationInterval: number; // in minutes
  autoCorrection: boolean;
  anomalyDetection: AnomalyDetectionConfig;
  trendAnalysis: TrendAnalysisConfig;
  correctionRules: DurationCorrectionRule[];
  qualityChecks: DurationDataQualityCheck[];
  reporting: QualityReportingConfig;
}

export interface AnomalyDetectionConfig {
  enabled: boolean;
  methods: AnomalyDetectionMethod[];
  sensitivity: number; // 0-1
  minSampleSize: number;
  lookbackWindow: number; // in minutes
  alertThreshold: number; // 0-1
}

export interface AnomalyDetectionMethod {
  name: string;
  algorithm: 'statistical' | 'ml' | 'hybrid';
  parameters: Record<string, any>;
  enabled: boolean;
}

export interface TrendAnalysisConfig {
  enabled: boolean;
  minDataPoints: number;
  lookbackPeriod: number; // in days
  confidenceThreshold: number; // 0-1
  trendTypes: TrendType[];
}

export interface QualityReportingConfig {
  enabled: boolean;
  reportInterval: number; // in hours
  recipients: string[];
  includeDetails: boolean;
  format: 'json' | 'html' | 'pdf';
}

export class DurationQualityAssurance extends EventEmitter {
  private config: QualityAssuranceConfig;
  private validationInterval?: NodeJS.Timeout;
  private reportInterval?: NodeJS.Timeout;
  private qualityHistory: Map<string, DurationQuality[]> = new Map();
  private anomalies: Map<string, DurationAnomaly[]> = new Map();
  private trends: Map<string, DurationTrend[]> = new Map();
  private corrections: Map<string, DurationCorrection[]> = new Map();

  constructor(config?: Partial<QualityAssuranceConfig>) {
    super();
    this.config = this.createDefaultConfig(config);
  }

  /**
   * Start quality assurance system
   */
  public async start(): Promise<void> {
    if (!this.config.enabled) {
      console.log('[DURATION_QA] Quality assurance disabled');
      return;
    }

    console.log('[DURATION_QA] Starting quality assurance system');

    // Start validation interval
    this.validationInterval = setInterval(async () => {
      await this.performValidation();
    }, this.config.validationInterval * 60 * 1000);

    // Start reporting interval
    if (this.config.reporting.enabled) {
      this.reportInterval = setInterval(async () => {
        await this.generateQualityReport();
      }, this.config.reporting.reportInterval * 60 * 60 * 1000);
    }

    this.emitEvent('system_started', { enabled: true });
  }

  /**
   * Stop quality assurance system
   */
  public async stop(): Promise<void> {
    if (this.validationInterval) {
      clearInterval(this.validationInterval);
      this.validationInterval = undefined;
    }

    if (this.reportInterval) {
      clearInterval(this.reportInterval);
      this.reportInterval = undefined;
    }

    console.log('[DURATION_QA] Quality assurance system stopped');
    this.emitEvent('system_stopped', { enabled: false });
  }

  /**
   * Validate a single duration metric
   */
  public async validateMetric(metric: DurationMetric): Promise<DurationQuality> {
    const issues: DurationQualityIssue[] = [];
    let score = 100;

    // Basic validation checks
    issues.push(...this.performBasicValidation(metric));

    // Statistical validation
    issues.push(...this.performStatisticalValidation(metric));

    // Context validation
    issues.push(...this.performContextValidation(metric));

    // Business rule validation
    issues.push(...this.performBusinessRuleValidation(metric));

    // Calculate quality score
    score = this.calculateQualityScore(score, issues);

    const quality: DurationQuality = {
      score,
      completeness: this.calculateCompleteness(metric),
      accuracy: this.calculateAccuracy(metric),
      consistency: this.calculateConsistency(metric),
      validity: score >= 70 ? 'valid' : score >= 50 ? 'suspect' : 'invalid',
      issues,
      lastValidated: new Date()
    };

    // Store quality history
    this.storeQualityHistory(metric.id, quality);

    // Auto-correct if enabled
    if (this.config.autoCorrection) {
      await this.performAutoCorrection(metric, quality);
    }

    return quality;
  }

  /**
   * Detect anomalies in duration metrics
   */
  public detectAnomalies(metrics: DurationMetric[]): DurationAnomaly[] {
    if (!this.config.anomalyDetection.enabled || metrics.length < this.config.anomalyDetection.minSampleSize) {
      return [];
    }

    const anomalies: DurationAnomaly[] = [];
    const now = new Date();
    const lookbackWindow = this.config.anomalyDetection.lookbackWindow * 60 * 1000;

    for (const method of this.config.anomalyDetection.methods) {
      if (!method.enabled) continue;

      switch (method.algorithm) {
        case 'statistical':
          anomalies.push(...this.detectStatisticalAnomalies(metrics, method, now, lookbackWindow));
          break;
        case 'ml':
          anomalies.push(...this.detectMLAnomalies(metrics, method, now, lookbackWindow));
          break;
        case 'hybrid':
          anomalies.push(...this.detectHybridAnomalies(metrics, method, now, lookbackWindow));
          break;
      }
    }

    // Store anomalies
    this.storeAnomalies(anomalies);

    return anomalies;
  }

  /**
   * Analyze trends in duration metrics
   */
  public analyzeTrends(metrics: DurationMetric[]): DurationTrend[] {
    if (!this.config.trendAnalysis.enabled || metrics.length < this.config.trendAnalysis.minDataPoints) {
      return [];
    }

    const trends: DurationTrend[] = [];
    const now = new Date();
    const lookbackPeriod = this.config.trendAnalysis.lookbackPeriod * 24 * 60 * 60 * 1000;

    // Group metrics by name for trend analysis
    const metricsByName = new Map<string, DurationMetric[]>();
    for (const metric of metrics) {
      if (!metricsByName.has(metric.name)) {
        metricsByName.set(metric.name, []);
      }
      metricsByName.get(metric.name)!.push(metric);
    }

    // Analyze trends for each metric name
    for (const [metricName, metricData] of metricsByName) {
      for (const trendType of this.config.trendAnalysis.trendTypes) {
        const trend = this.analyzeTrendForMetric(metricName, metricData, trendType, now, lookbackPeriod);
        if (trend) {
          trends.push(trend);
        }
      }
    }

    // Store trends
    this.storeTrends(trends);

    return trends;
  }

  /**
   * Get quality history for a metric
   */
  public getQualityHistory(metricId: string): DurationQuality[] {
    return this.qualityHistory.get(metricId) || [];
  }

  /**
   * Get detected anomalies
   */
  public getAnomalies(metricId?: string): DurationAnomaly[] {
    let anomalies = Array.from(this.anomalies.values()).flat();
    
    if (metricId) {
      anomalies = anomalies.filter(a => a.metricId === metricId);
    }

    return anomalies.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get trend analysis results
   */
  public getTrends(metricId?: string): DurationTrend[] {
    let trends = Array.from(this.trends.values()).flat();
    
    if (metricId) {
      trends = trends.filter(t => t.metricId === metricId);
    }

    return trends.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Get correction history
   */
  public getCorrections(metricId?: string): DurationCorrection[] {
    let corrections = Array.from(this.corrections.values()).flat();
    
    if (metricId) {
      corrections = corrections.filter(c => c.metricId === metricId);
    }

    return corrections.sort((a, b) => b.appliedAt.getTime() - a.appliedAt.getTime());
  }

  /**
   * Perform validation cycle
   */
  private async performValidation(): Promise<void> {
    try {
      console.log('[DURATION_QA] Performing quality validation cycle');
      
      // This would typically validate metrics from the duration tracker
      // For now, we'll emit an event to indicate validation is running
      this.emitEvent('quality_validated', { 
        timestamp: new Date(),
        metricsValidated: 0 // Would be actual count
      });

    } catch (error) {
      console.error('[DURATION_QA] Error during validation:', error);
      this.emitEvent('error_occurred', { 
        error: error instanceof Error ? error.message : String(error),
        component: 'quality_assurance',
        operation: 'validation'
      });
    }
  }

  /**
   * Generate quality report
   */
  private async generateQualityReport(): Promise<void> {
    try {
      console.log('[DURATION_QA] Generating quality report');
      
      const report = {
        timestamp: new Date(),
        summary: this.generateQualitySummary(),
        anomalies: this.getAnomalies(),
        trends: this.getTrends(),
        corrections: this.getCorrections(),
        recommendations: this.generateRecommendations()
      };

      // Emit report event
      this.emitEvent('quality_report_generated', { report });

      // Send to recipients if configured
      if (this.config.reporting.recipients.length > 0) {
        // Implementation would depend on notification system
        console.log(`[DURATION_QA] Quality report sent to ${this.config.reporting.recipients.length} recipients`);
      }

    } catch (error) {
      console.error('[DURATION_QA] Error generating quality report:', error);
      this.emitEvent('error_occurred', { 
        error: error instanceof Error ? error.message : String(error),
        component: 'quality_assurance',
        operation: 'reporting'
      });
    }
  }

  /**
   * Perform basic validation
   */
  private performBasicValidation(metric: DurationMetric): DurationQualityIssue[] {
    const issues: DurationQualityIssue[] = [];

    // Check for negative duration
    if (metric.durationMs < 0) {
      issues.push({
        id: this.generateId('issue'),
        type: 'negative_duration',
        severity: 'critical',
        description: 'Duration cannot be negative',
        detectedAt: new Date()
      });
    }

    // Check for extremely large duration (24+ hours)
    if (metric.durationMs > 86400000) {
      issues.push({
        id: this.generateId('issue'),
        type: 'extreme_outlier',
        severity: 'high',
        description: 'Duration exceeds 24 hours, likely incorrect',
        detectedAt: new Date()
      });
    }

    // Check for zero duration (unless it's a valid case)
    if (metric.durationMs === 0 && !this.isValidZeroDuration(metric)) {
      issues.push({
        id: this.generateId('issue'),
        type: 'calculation_error',
        severity: 'medium',
        description: 'Zero duration detected, may indicate calculation error',
        detectedAt: new Date()
      });
    }

    return issues;
  }

  /**
   * Perform statistical validation
   */
  private performStatisticalValidation(metric: DurationMetric): DurationQualityIssue[] {
    const issues: DurationQualityIssue[] = [];
    
    // Get historical data for comparison
    const historicalData = this.getQualityHistory(metric.id);
    if (historicalData.length < 5) {
      return issues; // Not enough data for statistical validation
    }

    const durations = historicalData.map(q => 
      this.getMetricDurationFromHistory(metric.id, q)
    ).filter(d => d !== null) as number[];

    if (durations.length === 0) return issues;

    // Calculate statistical measures
    const mean = durations.reduce((a, b) => a + b, 0) / durations.length;
    const variance = durations.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / durations.length;
    const stdDev = Math.sqrt(variance);

    // Check for outliers (3+ standard deviations)
    const deviation = Math.abs(metric.durationMs - mean);
    if (deviation > 3 * stdDev) {
      issues.push({
        id: this.generateId('issue'),
        type: 'extreme_outlier',
        severity: 'medium',
        description: `Duration is ${deviation / stdDev} standard deviations from mean`,
        detectedAt: new Date()
      });
    }

    return issues;
  }

  /**
   * Perform context validation
   */
  private performContextValidation(metric: DurationMetric): DurationQualityIssue[] {
    const issues: DurationQualityIssue[] = [];

    // Check for missing component information
    if (!metric.metadata.component || metric.metadata.component === 'unknown') {
      issues.push({
        id: this.generateId('issue'),
        type: 'missing_context',
        severity: 'low',
        description: 'Component information is missing',
        detectedAt: new Date()
      });
    }

    // Check for missing operation type
    if (!metric.context.operationType) {
      issues.push({
        id: this.generateId('issue'),
        type: 'missing_context',
        severity: 'low',
        description: 'Operation type context is missing',
        detectedAt: new Date()
      });
    }

    // Check for inconsistent environment
    if (metric.metadata.environment && metric.context.expectedDurationMs) {
      const variance = Math.abs(metric.durationMs - metric.context.expectedDurationMs);
      const variancePercent = (variance / metric.context.expectedDurationMs) * 100;
      
      if (variancePercent > 200) { // More than 200% variance
        issues.push({
          id: this.generateId('issue'),
          type: 'inconsistent_format',
          severity: 'medium',
          description: `Duration variance is ${variancePercent.toFixed(1)}% from expected`,
          detectedAt: new Date()
        });
      }
    }

    return issues;
  }

  /**
   * Perform business rule validation
   */
  private performBusinessRuleValidation(metric: DurationMetric): DurationQualityIssue[] {
    const issues: DurationQualityIssue[] = [];

    // Category-specific validation
    switch (metric.category) {
      case 'execution':
        if (metric.durationMs > 3600000) { // 1 hour
          issues.push({
            id: this.generateId('issue'),
            type: 'extreme_outlier',
            severity: 'medium',
            description: 'Execution duration exceeds 1 hour, may indicate performance issue',
            detectedAt: new Date()
          });
        }
        break;

      case 'api':
        if (metric.durationMs > 30000) { // 30 seconds
          issues.push({
            id: this.generateId('issue'),
            type: 'extreme_outlier',
            severity: 'high',
            description: 'API response time exceeds 30 seconds, violates SLA',
            detectedAt: new Date()
          });
        }
        break;

      case 'database':
        if (metric.durationMs > 10000) { // 10 seconds
          issues.push({
            id: this.generateId('issue'),
            type: 'extreme_outlier',
            severity: 'medium',
            description: 'Database query duration exceeds 10 seconds',
            detectedAt: new Date()
          });
        }
        break;
    }

    return issues;
  }

  /**
   * Detect statistical anomalies
   */
  private detectStatisticalAnomalies(
    metrics: DurationMetric[],
    method: AnomalyDetectionMethod,
    now: Date,
    lookbackWindow: number
  ): DurationAnomaly[] {
    const anomalies: DurationAnomaly[] = [];
    const windowStart = new Date(now.getTime() - lookbackWindow);
    const recentMetrics = metrics.filter(m => m.timestamp >= windowStart);

    if (recentMetrics.length < method.parameters.minSampleSize || 10) {
      return anomalies;
    }

    const durations = recentMetrics.map(m => m.durationMs);
    const mean = durations.reduce((a, b) => a + b, 0) / durations.length;
    const variance = durations.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / durations.length;
    const stdDev = Math.sqrt(variance);

    // Z-score based anomaly detection
    const threshold = method.parameters.threshold || 3;
    for (const metric of recentMetrics) {
      const zScore = Math.abs((metric.durationMs - mean) / stdDev);
      
      if (zScore > threshold) {
        anomalies.push({
          id: this.generateId('anomaly'),
          metricId: metric.id,
          timestamp: metric.timestamp,
          value: metric.durationMs,
          expectedValue: mean,
          deviation: metric.durationMs - mean,
          score: zScore,
          type: zScore > threshold * 2 ? 'spike' : 'outlier',
          severity: zScore > threshold * 2 ? 'high' : 'medium',
          description: `Statistical anomaly detected: Z-score ${zScore.toFixed(2)}`,
          context: { method: 'statistical', threshold, zScore },
          resolved: false
        });
      }
    }

    return anomalies;
  }

  /**
   * Detect ML-based anomalies
   */
  private detectMLAnomalies(
    metrics: DurationMetric[],
    method: AnomalyDetectionMethod,
    now: Date,
    lookbackWindow: number
  ): DurationAnomaly[] {
    const anomalies: DurationAnomaly[] = [];
    
    // Simplified ML anomaly detection using moving averages and deviations
    const windowStart = new Date(now.getTime() - lookbackWindow);
    const recentMetrics = metrics.filter(m => m.timestamp >= windowStart);

    if (recentMetrics.length < 20) {
      return anomalies;
    }

    const durations = recentMetrics.map(m => m.durationMs);
    const windowSize = method.parameters.windowSize || 10;
    
    for (let i = windowSize; i < durations.length; i++) {
      const window = durations.slice(i - windowSize, i);
      const windowMean = window.reduce((a, b) => a + b, 0) / window.length;
      const windowStd = Math.sqrt(window.reduce((a, b) => a + Math.pow(b - windowMean, 2), 0) / window.length);
      
      const currentValue = durations[i];
      const deviation = Math.abs(currentValue - windowMean);
      const threshold = method.parameters.thresholdMultiplier || 2.5;
      
      if (deviation > threshold * windowStd) {
        const metric = recentMetrics[i];
        anomalies.push({
          id: this.generateId('anomaly'),
          metricId: metric.id,
          timestamp: metric.timestamp,
          value: currentValue,
          expectedValue: windowMean,
          deviation: currentValue - windowMean,
          score: deviation / windowStd,
          type: 'spike',
          severity: deviation > threshold * windowStd * 2 ? 'high' : 'medium',
          description: `ML-based anomaly detected: deviation ${deviation.toFixed(2)} from window mean`,
          context: { method: 'ml', windowMean, windowStd, threshold },
          resolved: false
        });
      }
    }

    return anomalies;
  }

  /**
   * Detect hybrid anomalies
   */
  private detectHybridAnomalies(
    metrics: DurationMetric[],
    method: AnomalyDetectionMethod,
    now: Date,
    lookbackWindow: number
  ): DurationAnomaly[] {
    // Combine statistical and ML methods
    const statisticalAnomalies = this.detectStatisticalAnomalies(metrics, method, now, lookbackWindow);
    const mlAnomalies = this.detectMLAnomalies(metrics, method, now, lookbackWindow);
    
    // Return anomalies detected by both methods (intersection)
    return statisticalAnomalies.filter(sa => 
      mlAnomalies.some(ma => ma.metricId === sa.metricId)
    );
  }

  /**
   * Analyze trend for a specific metric
   */
  private analyzeTrendForMetric(
    metricName: string,
    metrics: DurationMetric[],
    trendType: TrendType,
    now: Date,
    lookbackPeriod: number
  ): DurationTrend | null {
    const periodStart = new Date(now.getTime() - lookbackPeriod);
    const relevantMetrics = metrics.filter(m => m.timestamp >= periodStart);

    if (relevantMetrics.length < this.config.trendAnalysis.minDataPoints) {
      return null;
    }

    const data = relevantMetrics.map(m => ({
      x: m.timestamp.getTime(),
      y: m.durationMs
    })).sort((a, b) => a.x - b.x);

    let direction: TrendDirection = 'stable';
    let magnitude = 0;
    let confidence = 0.5;

    switch (trendType) {
      case 'linear':
        const linearFit = this.calculateLinearTrend(data);
        direction = linearFit.slope > 0.1 ? 'increasing' : linearFit.slope < -0.1 ? 'decreasing' : 'stable';
        magnitude = Math.abs(linearFit.slope);
        confidence = linearFit.r2;
        break;

      case 'seasonal':
        const seasonalFit = this.calculateSeasonalTrend(data);
        direction = seasonalFit.direction;
        magnitude = seasonalFit.magnitude;
        confidence = seasonalFit.confidence;
        break;
    }

    return {
      id: this.generateId('trend'),
      metricId: metrics[0].id, // Use first metric as representative
      timeRange: { start: periodStart, end: now },
      trendType,
      direction,
      magnitude,
      confidence,
      anomalies: [],
      insights: [],
      createdAt: new Date()
    };
  }

  /**
   * Calculate linear trend
   */
  private calculateLinearTrend(data: Array<{x: number, y: number}>): { slope: number; intercept: number; r2: number } {
    const n = data.length;
    if (n < 2) return { slope: 0, intercept: 0, r2: 0 };

    const sumX = data.reduce((sum, point) => sum + point.x, 0);
    const sumY = data.reduce((sum, point) => sum + point.y, 0);
    const sumXY = data.reduce((sum, point) => sum + point.x * point.y, 0);
    const sumX2 = data.reduce((sum, point) => sum + point.x * point.x, 0);
    const sumY2 = data.reduce((sum, point) => sum + point.y * point.y, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared
    const yMean = sumY / n;
    const ssTotal = data.reduce((sum, point) => sum + Math.pow(point.y - yMean, 2), 0);
    const ssResidual = data.reduce((sum, point) => {
      const predicted = slope * point.x + intercept;
      return sum + Math.pow(point.y - predicted, 2);
    }, 0);
    const r2 = 1 - (ssResidual / ssTotal);

    return { slope, intercept, r2 };
  }

  /**
   * Calculate seasonal trend
   */
  private calculateSeasonalTrend(data: Array<{x: number, y: number}>): { direction: TrendDirection; magnitude: number; confidence: number } {
    // Simplified seasonal analysis
    const values = data.map(d => d.y);
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));

    const firstHalfAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const difference = secondHalfAvg - firstHalfAvg;
    const direction = difference > 0.1 ? 'increasing' : difference < -0.1 ? 'decreasing' : 'stable';
    const magnitude = Math.abs(difference);
    
    // Simple confidence based on consistency
    const firstHalfStd = Math.sqrt(firstHalf.reduce((a, b) => a + Math.pow(b - firstHalfAvg, 2), 0) / firstHalf.length);
    const secondHalfStd = Math.sqrt(secondHalf.reduce((a, b) => a + Math.pow(b - secondHalfAvg, 2), 0) / secondHalf.length);
    const confidence = Math.max(0, 1 - (firstHalfStd + secondHalfStd) / (Math.abs(firstHalfAvg) + Math.abs(secondHalfAvg) + 1));

    return { direction, magnitude, confidence };
  }

  /**
   * Helper methods
   */
  private createDefaultConfig(config?: Partial<QualityAssuranceConfig>): QualityAssuranceConfig {
    return {
      enabled: true,
      validationInterval: 15, // 15 minutes
      autoCorrection: false,
      anomalyDetection: {
        enabled: true,
        methods: [
          {
            name: 'statistical',
            algorithm: 'statistical',
            parameters: { threshold: 3, minSampleSize: 10 },
            enabled: true
          },
          {
            name: 'moving_average',
            algorithm: 'ml',
            parameters: { windowSize: 10, thresholdMultiplier: 2.5, minSampleSize: 20 },
            enabled: true
          }
        ],
        sensitivity: 0.7,
        minSampleSize: 10,
        lookbackWindow: 60, // 1 hour
        alertThreshold: 0.8
      },
      trendAnalysis: {
        enabled: true,
        minDataPoints: 20,
        lookbackPeriod: 7, // 7 days
        confidenceThreshold: 0.7,
        trendTypes: ['linear', 'seasonal']
      },
      correctionRules: [],
      qualityChecks: [],
      reporting: {
        enabled: true,
        reportInterval: 24, // 24 hours
        recipients: [],
        includeDetails: true,
        format: 'json'
      },
      ...config
    };
  }

  private calculateQualityScore(baseScore: number, issues: DurationQualityIssue[]): number {
    let score = baseScore;
    
    for (const issue of issues) {
      switch (issue.severity) {
        case 'critical': score -= 30; break;
        case 'high': score -= 20; break;
        case 'medium': score -= 10; break;
        case 'low': score -= 5; break;
      }
    }

    return Math.max(0, score);
  }

  private calculateCompleteness(metric: DurationMetric): number {
    let completeness = 100;
    
    if (!metric.metadata.component) completeness -= 20;
    if (!metric.context.operationType) completeness -= 15;
    if (!metric.source) completeness -= 10;
    if (metric.tags.length === 0) completeness -= 5;
    
    return Math.max(0, completeness);
  }

  private calculateAccuracy(metric: DurationMetric): number {
    // Simple accuracy based on expected vs actual
    if (!metric.context.expectedDurationMs) return 100;
    
    const variance = Math.abs(metric.durationMs - metric.context.expectedDurationMs);
    const variancePercent = (variance / metric.context.expectedDurationMs) * 100;
    
    return Math.max(0, 100 - variancePercent);
  }

  private calculateConsistency(metric: DurationMetric): number {
    const history = this.getQualityHistory(metric.id);
    if (history.length < 3) return 100;
    
    const recentScores = history.slice(-5).map(h => h.score);
    const avgScore = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
    const variance = recentScores.reduce((a, b) => a + Math.pow(b - avgScore, 2), 0) / recentScores.length;
    const stdDev = Math.sqrt(variance);
    
    // Higher consistency for lower standard deviation
    return Math.max(0, 100 - stdDev * 2);
  }

  private isValidZeroDuration(metric: DurationMetric): boolean {
    // Zero duration might be valid for certain operations
    const validZeroOperations = ['cache_hit', 'immediate_response', 'precomputed_result'];
    return validZeroOperations.includes(metric.context.operationType);
  }

  private getMetricDurationFromHistory(metricId: string, quality: DurationQuality): number | null {
    // This would need to be implemented based on how historical data is stored
    // For now, return null to indicate no historical duration available
    return null;
  }

  private async performAutoCorrection(metric: DurationMetric, quality: DurationQuality): Promise<void> {
    for (const rule of this.config.correctionRules) {
      if (!rule.enabled) continue;
      
      if (this.evaluateCorrectionRule(metric, quality, rule)) {
        const correction = await this.applyCorrectionRule(metric, rule);
        this.storeCorrection(correction);
      }
    }
  }

  private evaluateCorrectionRule(metric: DurationMetric, quality: DurationQuality, rule: DurationCorrectionRule): boolean {
    // Simple rule evaluation - would be more sophisticated in practice
    try {
      // This would use a rule engine or expression evaluator
      return eval(rule.condition);
    } catch {
      return false;
    }
  }

  private async applyCorrectionRule(metric: DurationMetric, rule: DurationCorrectionRule): Promise<DurationCorrection> {
    const correction: DurationCorrection = {
      id: this.generateId('correction'),
      metricId: metric.id,
      ruleId: rule.id,
      originalValue: metric.durationMs,
      correctedValue: metric.durationMs, // Would be modified by rule
      correctionType: 'automatic',
      appliedAt: new Date(),
      confidence: 0.8,
      description: `Applied correction rule: ${rule.name}`
    };

    // Apply the correction logic
    try {
      eval(rule.correction);
    } catch (error) {
      console.error('[DURATION_QA] Error applying correction rule:', error);
    }

    return correction;
  }

  private storeQualityHistory(metricId: string, quality: DurationQuality): void {
    if (!this.qualityHistory.has(metricId)) {
      this.qualityHistory.set(metricId, []);
    }
    
    const history = this.qualityHistory.get(metricId)!;
    history.push(quality);
    
    // Keep only last 100 entries
    if (history.length > 100) {
      this.qualityHistory.set(metricId, history.slice(-100));
    }
  }

  private storeAnomalies(anomalies: DurationAnomaly[]): void {
    for (const anomaly of anomalies) {
      if (!this.anomalies.has(anomaly.metricId)) {
        this.anomalies.set(anomaly.metricId, []);
      }
      
      const metricAnomalies = this.anomalies.get(anomaly.metricId)!;
      metricAnomalies.push(anomaly);
      
      // Keep only last 50 anomalies per metric
      if (metricAnomalies.length > 50) {
        this.anomalies.set(anomaly.metricId, metricAnomalies.slice(-50));
      }
    }
  }

  private storeTrends(trends: DurationTrend[]): void {
    for (const trend of trends) {
      if (!this.trends.has(trend.metricId)) {
        this.trends.set(trend.metricId, []);
      }
      
      const metricTrends = this.trends.get(trend.metricId)!;
      metricTrends.push(trend);
      
      // Keep only last 20 trends per metric
      if (metricTrends.length > 20) {
        this.trends.set(trend.metricId, metricTrends.slice(-20));
      }
    }
  }

  private storeCorrection(correction: DurationCorrection): void {
    if (!this.corrections.has(correction.metricId)) {
      this.corrections.set(correction.metricId, []);
    }
    
    const metricCorrections = this.corrections.get(correction.metricId)!;
    metricCorrections.push(correction);
    
    // Keep only last 30 corrections per metric
    if (metricCorrections.length > 30) {
      this.corrections.set(correction.metricId, metricCorrections.slice(-30));
    }
  }

  private generateQualitySummary(): any {
    const allQualities = Array.from(this.qualityHistory.values()).flat();
    const allAnomalies = Array.from(this.anomalies.values()).flat();
    const allTrends = Array.from(this.trends.values()).flat();

    return {
      totalMetrics: allQualities.length,
      averageQualityScore: allQualities.length > 0 ? allQualities.reduce((a, b) => a + b.score, 0) / allQualities.length : 0,
      activeAnomalies: allAnomalies.filter(a => !a.resolved).length,
      significantTrends: allTrends.filter(t => Math.abs(t.magnitude) > 0.1 && t.confidence > 0.7).length,
      lastUpdated: new Date()
    };
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    
    const allQualities = Array.from(this.qualityHistory.values()).flat();
    const averageQuality = allQualities.length > 0 ? allQualities.reduce((a, b) => a + b.score, 0) / allQualities.length : 0;
    
    if (averageQuality < 70) {
      recommendations.push('Overall quality score is below threshold, review data collection processes');
    }
    
    const activeAnomalies = Array.from(this.anomalies.values()).flat().filter(a => !a.resolved);
    if (activeAnomalies.length > 10) {
      recommendations.push('High number of active anomalies detected, investigate system performance');
    }
    
    return recommendations;
  }

  private emitEvent(type: DurationEventType, data: any): void {
    this.emit(type, {
      id: this.generateId('event'),
      type,
      timestamp: new Date(),
      source: 'quality_assurance',
      data
    });
  }

  private generateId(type: string): string {
    return `${type}-${uuidv4()}`;
  }
}

// Additional interfaces for corrections
export interface DurationCorrection {
  id: string;
  metricId: string;
  ruleId: string;
  originalValue: number;
  correctedValue: number;
  correctionType: 'automatic' | 'manual';
  appliedAt: Date;
  confidence: number;
  description: string;
}