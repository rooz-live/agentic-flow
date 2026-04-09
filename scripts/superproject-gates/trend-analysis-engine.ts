/**
 * Duration Metrics Trend Analysis Engine
 * 
 * Provides comprehensive historical tracking and trend analysis for duration_ms metrics
 * with pattern recognition, anomaly detection, and predictive analytics
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { DurationTrackingSystem, MetricDefinition, MetricValue } from './index';

export interface TrendAnalysisConfig {
  enabled: boolean;
  analysisInterval: number; // seconds
  historicalRetention: number; // days
  trendWindows: number[]; // minutes
  anomalyThreshold: number; // standard deviations
  predictionHorizon: number; // minutes
  patternRecognition: {
    enabled: boolean;
    minPatternLength: number;
    maxPatternLength: number;
    confidenceThreshold: number;
  };
  seasonalityDetection: {
    enabled: boolean;
    cycles: string[]; // 'hourly', 'daily', 'weekly', 'monthly'
    minDataPoints: number;
  };
}

export interface TrendData {
  metricId: string;
  component?: string;
  operation?: string;
  environment?: string;
  timestamp: Date;
  value: number;
  trend: {
    direction: 'increasing' | 'decreasing' | 'stable';
    slope: number;
    confidence: number;
    windowSize: number;
  };
  seasonality: {
    detected: boolean;
    cycles: SeasonalityCycle[];
  };
  anomalies: Anomaly[];
  patterns: Pattern[];
  prediction: Prediction;
}

export interface SeasonalityCycle {
  type: 'hourly' | 'daily' | 'weekly' | 'monthly';
  period: number;
  amplitude: number;
  phase: number;
  confidence: number;
}

export interface Anomaly {
  id: string;
  timestamp: Date;
  value: number;
  expectedValue: number;
  deviation: number;
  score: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'spike' | 'drop' | 'trend' | 'pattern';
  description: string;
}

export interface Pattern {
  id: string;
  type: 'recurring' | 'sequential' | 'cyclical' | 'seasonal';
  description: string;
  confidence: number;
  frequency: number;
  occurrences: number;
  firstSeen: Date;
  lastSeen: Date;
  nextExpected?: Date;
  duration: number;
  characteristics: Record<string, any>;
}

export interface Prediction {
  horizon: number; // minutes
  values: PredictedValue[];
  confidence: number;
  methodology: string;
  accuracy: number;
  lastUpdated: Date;
}

export interface PredictedValue {
  timestamp: Date;
  value: number;
  confidence: number;
  upperBound: number;
  lowerBound: number;
}

export interface TrendReport {
  id: string;
  name: string;
  description: string;
  timeRange: {
    start: Date;
    end: Date;
  };
  metrics: TrendData[];
  summary: {
    totalMetrics: number;
    totalAnomalies: number;
    totalPatterns: number;
    avgTrendSlope: number;
    avgConfidence: number;
    predictionAccuracy: number;
  };
  insights: TrendInsight[];
  recommendations: string[];
  generatedAt: Date;
}

export interface TrendInsight {
  id: string;
  type: 'trend' | 'anomaly' | 'pattern' | 'seasonality' | 'prediction';
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  description: string;
  impact: string;
  confidence: number;
  data: Record<string, any>;
}

export class DurationTrendAnalysisEngine extends EventEmitter {
  private config: TrendAnalysisConfig;
  private historicalData: Map<string, MetricValue[]> = new Map();
  private trendData: Map<string, TrendData> = new Map();
  private patterns: Map<string, Pattern[]> = new Map();
  private anomalies: Map<string, Anomaly[]> = new Map();
  private analysisInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private durationTrackingSystem: DurationTrackingSystem;

  constructor(config: Partial<TrendAnalysisConfig> = {}) {
    super();
    
    this.config = {
      enabled: true,
      analysisInterval: 300, // 5 minutes
      historicalRetention: 90, // 90 days
      trendWindows: [15, 60, 240, 1440], // 15min, 1hr, 4hr, 1day
      anomalyThreshold: 2.5, // 2.5 standard deviations
      predictionHorizon: 60, // 1 hour
      patternRecognition: {
        enabled: true,
        minPatternLength: 3,
        maxPatternLength: 24,
        confidenceThreshold: 0.7
      },
      seasonalityDetection: {
        enabled: true,
        cycles: ['hourly', 'daily', 'weekly', 'monthly'],
        minDataPoints: 144 // 6 days of hourly data
      },
      ...config
    };

    // Initialize duration tracking system
    this.durationTrackingSystem = new DurationTrackingSystem({
      enabled: true,
      environment: 'development',
      collectionInterval: 60,
      bufferSize: 10000,
      retentionDays: 30,
      qualityThresholds: {
        minQualityScore: 70,
        minCompleteness: 80,
        minAccuracy: 85,
        minConsistency: 75,
        maxOutlierDeviation: 3,
        maxMissingDataPercentage: 10
      },
      alerting: {
        enabled: true,
        defaultRules: [],
        escalationPolicies: [],
        notificationChannels: [],
        suppressionRules: []
      },
      aggregation: {
        enabled: true,
        defaultIntervals: ['1m', '5m', '15m', '1h', '1d', '1w', '1M'],
        defaultTypes: ['sum', 'avg', 'min', 'max', 'median', 'p95', 'p99'],
        defaultDimensions: ['component', 'operation', 'status'],
        maxAggregationAge: 90
      },
      validation: {
        enabled: true,
        validationInterval: 15,
        autoCorrection: false,
        correctionRules: [],
        dataQualityChecks: []
      },
      integration: {
        systems: [
          {
            name: 'duration_trend_analysis_engine',
            type: 'trend_analysis',
            enabled: true,
            configuration: {},
            mapping: {
              sourceField: 'trendAnalysisResult',
              targetField: 'trendData',
              transformation: 'trendAnalysisResult',
              required: true
            }
          }
        ],
        exportFormats: [],
        importFormats: [],
        syncInterval: 60
      }
    });

    this.setupEventForwarding();
  }

  /**
   * Start trend analysis engine
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[TREND_ANALYSIS] Trend analysis engine already running');
      return;
    }

    this.isRunning = true;
    console.log('[TREND_ANALYSIS] Starting duration trend analysis engine');

    // Start duration tracking system
    await this.durationTrackingSystem.start();

    // Load historical data
    await this.loadHistoricalData();

    // Start analysis interval
    this.analysisInterval = setInterval(() => {
      this.performTrendAnalysis();
    }, this.config.analysisInterval * 1000);

    console.log('[TREND_ANALYSIS] Trend analysis engine started');
    this.emit('started', { timestamp: new Date() });
  }

  /**
   * Stop trend analysis engine
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
    }

    // Stop duration tracking system
    await this.durationTrackingSystem.stop();

    console.log('[TREND_ANALYSIS] Trend analysis engine stopped');
    this.emit('stopped', { timestamp: new Date() });
  }

  /**
   * Load historical data
   */
  private async loadHistoricalData(): Promise<void> {
    try {
      console.log('[TREND_ANALYSIS] Loading historical data');

      const cutoffDate = new Date(Date.now() - this.config.historicalRetention * 24 * 60 * 60 * 1000);
      
      // Get metrics from duration tracking system
      const metrics = this.durationTrackingSystem.getMetrics({
        source: 'duration_trend_analysis_engine',
        timeRange: { start: cutoffDate, end: new Date() }
      });

      // Group metrics by key
      for (const metric of metrics) {
        const key = this.getMetricKey(metric);
        const existing = this.historicalData.get(key) || [];
        existing.push(metric);
        this.historicalData.set(key, existing);
      }

      console.log(`[TREND_ANALYSIS] Loaded ${metrics.length} historical data points`);
      this.emit('historicalDataLoaded', { 
        timestamp: new Date(),
        totalMetrics: metrics.length,
        cutoffDate
      });

    } catch (error) {
      console.error('[TREND_ANALYSIS] Error loading historical data:', error);
      this.emit('historicalDataError', { timestamp: new Date(), error });
    }
  }

  /**
   * Perform trend analysis
   */
  private async performTrendAnalysis(): Promise<void> {
    try {
      console.log('[TREND_ANALYSIS] Performing trend analysis');

      const startTime = Date.now();

      // Get recent metrics
      const recentMetrics = this.durationTrackingSystem.getMetrics({
        source: 'duration_trend_analysis_engine'
      });

      // Update historical data with recent metrics
      this.updateHistoricalData(recentMetrics);

      // Analyze trends for each metric
      for (const [key, metrics] of this.historicalData.entries()) {
        await this.analyzeMetricTrends(key, metrics);
      }

      // Clean up old data
      this.cleanupOldData();

      const analysisDuration = Date.now() - startTime;

      // Record trend analysis duration
      this.durationTrackingSystem.recordDuration(
        'trend_analysis_duration_ms',
        analysisDuration,
        {
          component: 'duration_trend_analysis_engine',
          operation: 'perform_trend_analysis',
          totalMetrics: recentMetrics.length,
          totalKeys: this.historicalData.size
        },
        {
          operationType: 'trend_analysis',
          totalMetrics: recentMetrics.length,
          totalKeys: this.historicalData.size
        }
      );

      console.log(`[TREND_ANALYSIS] Trend analysis completed in ${analysisDuration}ms`);
      this.emit('analysisCompleted', {
        timestamp: new Date(),
        totalMetrics: recentMetrics.length,
        analysisDuration,
        totalTrends: this.trendData.size
      });

    } catch (error) {
      console.error('[TREND_ANALYSIS] Error during trend analysis:', error);
      this.emit('analysisError', { timestamp: new Date(), error });
    }
  }

  /**
   * Update historical data with recent metrics
   */
  private updateHistoricalData(metrics: MetricValue[]): void {
    for (const metric of metrics) {
      const key = this.getMetricKey(metric);
      const existing = this.historicalData.get(key) || [];
      existing.push(metric);
      this.historicalData.set(key, existing);
    }
  }

  /**
   * Get metric key for grouping
   */
  private getMetricKey(metric: MetricValue): string {
    const component = metric.dimensions?.component || 'unknown';
    const operation = metric.dimensions?.operation || 'unknown';
    const environment = metric.environment || 'development';
    return `${metric.metricId}:${component}:${operation}:${environment}`;
  }

  /**
   * Parse metric key
   */
  private parseMetricKey(key: string): {
    metricId: string;
    component: string;
    operation: string;
    environment: string;
  } {
    const [metricId, component, operation, environment] = key.split(':');
    return {
      metricId: metricId || 'unknown',
      component: component || 'unknown',
      operation: operation || 'unknown',
      environment: environment || 'development'
    };
  }

  /**
   * Analyze trends for a specific metric
   */
  private async analyzeMetricTrends(key: string, metrics: MetricValue[]): Promise<void> {
    if (metrics.length < 10) return; // Need minimum data points

    const { metricId, component, operation, environment } = this.parseMetricKey(key);
    
    // Sort metrics by timestamp
    const sortedMetrics = metrics.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    // Calculate trend for different windows
    const trends = this.calculateTrends(sortedMetrics);
    
    // Detect seasonality
    const seasonality = this.detectSeasonality(sortedMetrics);
    
    // Detect anomalies
    const anomalies = this.detectAnomalies(sortedMetrics);
    
    // Recognize patterns
    const patterns = this.recognizePatterns(sortedMetrics);
    
    // Generate predictions
    const prediction = this.generatePrediction(sortedMetrics);
    
    // Create trend data
    const trendData: TrendData = {
      metricId,
      component,
      operation,
      environment,
      timestamp: new Date(),
      value: sortedMetrics[sortedMetrics.length - 1].value,
      trend: trends.primary,
      seasonality,
      anomalies,
      patterns,
      prediction
    };

    // Store trend data
    this.trendData.set(key, trendData);
    this.anomalies.set(key, anomalies);
    this.patterns.set(key, patterns);

    // Emit trend analysis event
    this.emit('trendAnalyzed', trendData);
  }

  /**
   * Calculate trends for different time windows
   */
  private calculateTrends(metrics: MetricValue[]): {
    primary: TrendData['trend'];
    all: TrendData['trend'][];
  } {
    const all: TrendData['trend'][] = [];
    
    for (const windowSize of this.config.trendWindows) {
      const windowMetrics = metrics.slice(-windowSize);
      if (windowMetrics.length < 3) continue;
      
      const trend = this.calculateLinearTrend(windowMetrics);
      all.push({
        ...trend,
        windowSize
      });
    }
    
    // Use the medium-term trend as primary
    const primary = all.find(t => t.windowSize === 60) || all[all.length - 1];
    
    return { primary, all };
  }

  /**
   * Calculate linear trend
   */
  private calculateLinearTrend(metrics: MetricValue[]): {
    direction: 'increasing' | 'decreasing' | 'stable';
    slope: number;
    confidence: number;
  } {
    const n = metrics.length;
    const x = metrics.map((_, i) => i);
    const y = metrics.map(m => m.value);
    
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Calculate R-squared for confidence
    const yMean = sumY / n;
    const totalSumSquares = y.reduce((sum, val) => sum + Math.pow(val - yMean, 2), 0);
    const residualSumSquares = y.reduce((sum, val, i) => {
      const predicted = slope * x[i] + intercept;
      return sum + Math.pow(val - predicted, 2);
    }, 0);
    
    const rSquared = 1 - (residualSumSquares / totalSumSquares);
    const confidence = Math.max(0, Math.min(1, rSquared));
    
    // Determine direction
    let direction: 'increasing' | 'decreasing' | 'stable';
    if (Math.abs(slope) < 0.01) {
      direction = 'stable';
    } else if (slope > 0) {
      direction = 'increasing';
    } else {
      direction = 'decreasing';
    }
    
    return { direction, slope, confidence };
  }

  /**
   * Detect seasonality
   */
  private detectSeasonality(metrics: MetricValue[]): TrendData['seasonality'] {
    if (!this.config.seasonalityDetection.enabled || metrics.length < this.config.seasonalityDetection.minDataPoints) {
      return { detected: false, cycles: [] };
    }
    
    const cycles: SeasonalityCycle[] = [];
    const values = metrics.map(m => m.value);
    
    for (const cycleType of this.config.seasonalityDetection.cycles) {
      const cycle = this.detectCycle(values, cycleType, metrics);
      if (cycle) {
        cycles.push(cycle);
      }
    }
    
    return {
      detected: cycles.length > 0,
      cycles
    };
  }

  /**
   * Detect specific cycle type
   */
  private detectCycle(
    values: number[],
    cycleType: 'hourly' | 'daily' | 'weekly' | 'monthly',
    metrics: MetricValue[]
  ): SeasonalityCycle | null {
    let period: number;
    
    switch (cycleType) {
      case 'hourly':
        period = 60; // 60 data points for hourly cycle (assuming 1-minute intervals)
        break;
      case 'daily':
        period = 1440; // 1440 data points for daily cycle
        break;
      case 'weekly':
        period = 10080; // 10080 data points for weekly cycle
        break;
      case 'monthly':
        period = 43200; // 43200 data points for monthly cycle
        break;
      default:
        return null;
    }
    
    if (values.length < period * 2) return null; // Need at least 2 cycles
    
    // Use autocorrelation to detect seasonality
    const autocorr = this.calculateAutocorrelation(values, period);
    const confidence = Math.min(1, Math.max(0, autocorr));
    
    if (confidence < 0.3) return null; // Low confidence
    
    // Calculate amplitude and phase
    const cycleData = this.extractCycleData(values, period);
    
    return {
      type: cycleType,
      period,
      amplitude: cycleData.amplitude,
      phase: cycleData.phase,
      confidence
    };
  }

  /**
   * Calculate autocorrelation
   */
  private calculateAutocorrelation(values: number[], lag: number): number {
    if (values.length <= lag) return 0;
    
    const n = values.length - lag;
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < n; i++) {
      const xDev = values[i] - mean;
      const yDev = values[i + lag] - mean;
      numerator += xDev * yDev;
      denominator += xDev * xDev;
    }
    
    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Extract cycle data
   */
  private extractCycleData(values: number[], period: number): {
    amplitude: number;
    phase: number;
  } {
    // Use simple sine wave fitting
    const n = Math.min(values.length, period * 2);
    const x = Array.from({ length: n }, (_, i) => (2 * Math.PI * i) / period);
    const y = values.slice(0, n);
    
    // Calculate sine and cosine components
    let sumSin = 0, sumCos = 0;
    for (let i = 0; i < n; i++) {
      sumSin += y[i] * Math.sin(x[i]);
      sumCos += y[i] * Math.cos(x[i]);
    }
    
    const amplitude = 2 * Math.sqrt(sumSin * sumSin + sumCos * sumCos) / n;
    const phase = Math.atan2(sumSin, sumCos);
    
    return { amplitude, phase };
  }

  /**
   * Detect anomalies
   */
  private detectAnomalies(metrics: MetricValue[]): Anomaly[] {
    const anomalies: Anomaly[] = [];
    const values = metrics.map(m => m.value);
    
    // Calculate rolling statistics
    const windowSize = Math.min(20, Math.floor(values.length / 4));
    
    for (let i = windowSize; i < values.length; i++) {
      const window = values.slice(i - windowSize, i);
      const mean = window.reduce((sum, val) => sum + val, 0) / window.length;
      const variance = window.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / window.length;
      const stdDev = Math.sqrt(variance);
      
      const currentValue = values[i];
      const deviation = Math.abs(currentValue - mean) / stdDev;
      
      if (deviation > this.config.anomalyThreshold) {
        const severity = this.getAnomalySeverity(deviation);
        const type = this.getAnomalyType(currentValue, mean, window);
        
        anomalies.push({
          id: uuidv4(),
          timestamp: metrics[i].timestamp,
          value: currentValue,
          expectedValue: mean,
          deviation,
          score: Math.min(1, deviation / this.config.anomalyThreshold),
          severity,
          type,
          description: this.generateAnomalyDescription(currentValue, mean, deviation, type)
        });
      }
    }
    
    return anomalies;
  }

  /**
   * Get anomaly severity
   */
  private getAnomalySeverity(deviation: number): Anomaly['severity'] {
    if (deviation > 4) return 'critical';
    if (deviation > 3) return 'high';
    if (deviation > 2) return 'medium';
    return 'low';
  }

  /**
   * Get anomaly type
   */
  private getAnomalyType(
    currentValue: number,
    mean: number,
    window: number[]
  ): Anomaly['type'] {
    if (currentValue > mean * 1.5) return 'spike';
    if (currentValue < mean * 0.5) return 'drop';
    
    // Check for trend anomaly
    const recentTrend = this.calculateLinearTrend(window.slice(-5).map((v, i) => ({
      value: v,
      timestamp: new Date(Date.now() - (5 - i) * 60000)
    } as MetricValue)));
    
    if (recentTrend.confidence > 0.7 && Math.abs(recentTrend.slope) > 0.1) {
      return 'trend';
    }
    
    return 'pattern';
  }

  /**
   * Generate anomaly description
   */
  private generateAnomalyDescription(
    currentValue: number,
    expectedValue: number,
    deviation: number,
    type: Anomaly['type']
  ): string {
    const percentage = ((currentValue - expectedValue) / expectedValue * 100).toFixed(1);
    
    switch (type) {
      case 'spike':
        return `Duration spike detected: ${currentValue.toFixed(2)}ms (${percentage}% above expected)`;
      case 'drop':
        return `Duration drop detected: ${currentValue.toFixed(2)}ms (${percentage}% below expected)`;
      case 'trend':
        return `Duration trend anomaly detected: ${currentValue.toFixed(2)}ms (${deviation.toFixed(1)}σ deviation)`;
      case 'pattern':
        return `Duration pattern anomaly detected: ${currentValue.toFixed(2)}ms (${deviation.toFixed(1)}σ deviation)`;
      default:
        return `Duration anomaly detected: ${currentValue.toFixed(2)}ms (${deviation.toFixed(1)}σ deviation)`;
    }
  }

  /**
   * Recognize patterns
   */
  private recognizePatterns(metrics: MetricValue[]): Pattern[] {
    if (!this.config.patternRecognition.enabled) return [];
    
    const patterns: Pattern[] = [];
    const values = metrics.map(m => m.value);
    
    // Look for recurring patterns
    for (const length of Array.from(
      { length: this.config.patternRecognition.maxPatternLength - this.config.patternRecognition.minPatternLength + 1 },
      (_, i) => i + this.config.patternRecognition.minPatternLength
    )) {
      const recurringPatterns = this.findRecurringPatterns(values, length);
      patterns.push(...recurringPatterns);
    }
    
    // Look for sequential patterns
    const sequentialPatterns = this.findSequentialPatterns(values);
    patterns.push(...sequentialPatterns);
    
    // Filter by confidence
    return patterns.filter(p => p.confidence >= this.config.patternRecognition.confidenceThreshold);
  }

  /**
   * Find recurring patterns
   */
  private findRecurringPatterns(values: number[], patternLength: number): Pattern[] {
    const patterns: Pattern[] = [];
    const patternMap = new Map<string, number[]>();
    
    // Extract all possible patterns of given length
    for (let i = 0; i <= values.length - patternLength; i++) {
      const pattern = values.slice(i, i + patternLength);
      const patternKey = this.patternToString(pattern);
      
      if (!patternMap.has(patternKey)) {
        patternMap.set(patternKey, []);
      }
      patternMap.get(patternKey)!.push(i);
    }
    
    // Find patterns that occur multiple times
    for (const [patternKey, positions] of patternMap.entries()) {
      if (positions.length >= 3) {
        const pattern = this.stringToPattern(patternKey);
        const confidence = Math.min(1, positions.length / (values.length / patternLength));
        
        patterns.push({
          id: uuidv4(),
          type: 'recurring',
          description: `Recurring pattern of length ${patternLength}`,
          confidence,
          frequency: positions.length,
          occurrences: positions.length,
          firstSeen: new Date(Date.now() - values.length * 60000 + positions[0] * 60000),
          lastSeen: new Date(Date.now() - values.length * 60000 + positions[positions.length - 1] * 60000),
          duration: patternLength,
          characteristics: {
            pattern,
            positions,
            averageValue: pattern.reduce((sum, val) => sum + val, 0) / pattern.length
          }
        });
      }
    }
    
    return patterns;
  }

  /**
   * Find sequential patterns
   */
  private findSequentialPatterns(values: number[]): Pattern[] {
    const patterns: Pattern[] = [];
    
    // Look for increasing/decreasing sequences
    let currentSequence: number[] = [];
    let currentDirection: 'increasing' | 'decreasing' | 'stable' | null = null;
    
    for (let i = 1; i < values.length; i++) {
      const diff = values[i] - values[i - 1];
      const direction = diff > 0.01 ? 'increasing' : diff < -0.01 ? 'decreasing' : 'stable';
      
      if (direction === currentDirection) {
        currentSequence.push(values[i]);
      } else {
        if (currentSequence.length >= 3) {
          patterns.push({
            id: uuidv4(),
            type: 'sequential',
            description: `${currentDirection} sequence of length ${currentSequence.length + 1}`,
            confidence: Math.min(1, (currentSequence.length + 1) / 10),
            frequency: 1,
            occurrences: 1,
            firstSeen: new Date(Date.now() - values.length * 60000 + (i - currentSequence.length) * 60000),
            lastSeen: new Date(Date.now() - values.length * 60000 + i * 60000),
            duration: currentSequence.length + 1,
            characteristics: {
              direction: currentDirection,
              values: [values[i - currentSequence.length - 1], ...currentSequence],
              averageChange: currentSequence.reduce((sum, val, idx) => {
                return sum + (val - (idx === 0 ? values[i - currentSequence.length - 1] : currentSequence[idx - 1]));
              }, 0) / currentSequence.length
            }
          });
        }
        
        currentSequence = [values[i]];
        currentDirection = direction;
      }
    }
    
    return patterns;
  }

  /**
   * Convert pattern to string
   */
  private patternToString(pattern: number[]): string {
    return pattern.map(v => v.toFixed(2)).join(',');
  }

  /**
   * Convert string to pattern
   */
  private stringToPattern(patternString: string): number[] {
    return patternString.split(',').map(v => parseFloat(v));
  }

  /**
   * Generate prediction
   */
  private generatePrediction(metrics: MetricValue[]): Prediction {
    const values = metrics.map(m => m.value);
    const horizon = this.config.predictionHorizon;
    
    // Use multiple methods for prediction
    const linearPrediction = this.linearPredict(values, horizon);
    const seasonalPrediction = this.seasonalPredict(values, horizon);
    const arimaPrediction = this.arimaPredict(values, horizon);
    
    // Combine predictions with weights
    const weights = { linear: 0.4, seasonal: 0.3, arima: 0.3 };
    const combinedPrediction = this.combinePredictions(
      [linearPrediction, seasonalPrediction, arimaPrediction],
      weights
    );
    
    return {
      horizon,
      values: combinedPrediction.values,
      confidence: combinedPrediction.confidence,
      methodology: 'weighted_ensemble',
      accuracy: this.calculatePredictionAccuracy(metrics, combinedPrediction.values),
      lastUpdated: new Date()
    };
  }

  /**
   * Linear prediction
   */
  private linearPredict(values: number[], horizon: number): Prediction {
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = values;
    
    // Simple linear regression
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    const predictedValues: PredictedValue[] = [];
    for (let i = 1; i <= horizon; i++) {
      const predictedValue = slope * (n + i - 1) + intercept;
      const confidence = Math.max(0.1, 1 - (i / horizon) * 0.5); // Decreasing confidence
      
      predictedValues.push({
        timestamp: new Date(Date.now() + i * 60000),
        value: predictedValue,
        confidence,
        upperBound: predictedValue + (1 - confidence) * predictedValue * 0.2,
        lowerBound: predictedValue - (1 - confidence) * predictedValue * 0.2
      });
    }
    
    return {
      horizon,
      values: predictedValues,
      confidence: 0.6,
      methodology: 'linear_regression',
      accuracy: 0,
      lastUpdated: new Date()
    };
  }

  /**
   * Seasonal prediction
   */
  private seasonalPredict(values: number[], horizon: number): Prediction {
    // Simple seasonal decomposition and prediction
    const seasonLength = 24; // Assuming hourly seasonality
    const seasons = Math.floor(values.length / seasonLength);
    
    if (seasons < 2) {
      return this.linearPredict(values, horizon);
    }
    
    // Calculate seasonal averages
    const seasonalAverages = Array.from({ length: seasonLength }, (_, i) => {
      let sum = 0;
      let count = 0;
      
      for (let s = 0; s < seasons; s++) {
        const index = s * seasonLength + i;
        if (index < values.length) {
          sum += values[index];
          count++;
        }
      }
      
      return count > 0 ? sum / count : 0;
    });
    
    const predictedValues: PredictedValue[] = [];
    const lastIndex = values.length - 1;
    const currentSeason = lastIndex % seasonLength;
    
    for (let i = 1; i <= horizon; i++) {
      const seasonIndex = (currentSeason + i) % seasonLength;
      const predictedValue = seasonalAverages[seasonIndex];
      const confidence = 0.7;
      
      predictedValues.push({
        timestamp: new Date(Date.now() + i * 60000),
        value: predictedValue,
        confidence,
        upperBound: predictedValue + predictedValue * 0.15,
        lowerBound: predictedValue - predictedValue * 0.15
      });
    }
    
    return {
      horizon,
      values: predictedValues,
      confidence: 0.7,
      methodology: 'seasonal_decomposition',
      accuracy: 0,
      lastUpdated: new Date()
    };
  }

  /**
   * ARIMA prediction (simplified)
   */
  private arimaPredict(values: number[], horizon: number): Prediction {
    // Simplified ARIMA(1,1,1) implementation
    if (values.length < 10) {
      return this.linearPredict(values, horizon);
    }
    
    // First difference
    const diff = [];
    for (let i = 1; i < values.length; i++) {
      diff.push(values[i] - values[i - 1]);
    }
    
    // Simple AR(1) on differenced series
    const n = diff.length;
    let sumXY = 0, sumXX = 0;
    for (let i = 1; i < n; i++) {
      sumXY += diff[i] * diff[i - 1];
      sumXX += diff[i - 1] * diff[i - 1];
    }
    
    const ar = sumXX > 0 ? sumXY / sumXX : 0;
    
    // Predict differences
    const predictedDiff = [];
    let lastDiff = diff[diff.length - 1];
    
    for (let i = 0; i < horizon; i++) {
      const nextDiff = ar * lastDiff;
      predictedDiff.push(nextDiff);
      lastDiff = nextDiff;
    }
    
    // Integrate back to original scale
    const predictedValues: PredictedValue[] = [];
    let lastValue = values[values.length - 1];
    
    for (let i = 0; i < horizon; i++) {
      const predictedValue = lastValue + predictedDiff[i];
      const confidence = Math.max(0.2, 0.8 - (i / horizon) * 0.3);
      
      predictedValues.push({
        timestamp: new Date(Date.now() + (i + 1) * 60000),
        value: predictedValue,
        confidence,
        upperBound: predictedValue + (1 - confidence) * Math.abs(predictedValue) * 0.25,
        lowerBound: predictedValue - (1 - confidence) * Math.abs(predictedValue) * 0.25
      });
      
      lastValue = predictedValue;
    }
    
    return {
      horizon,
      values: predictedValues,
      confidence: 0.65,
      methodology: 'arima',
      accuracy: 0,
      lastUpdated: new Date()
    };
  }

  /**
   * Combine predictions
   */
  private combinePredictions(
    predictions: Prediction[],
    weights: Record<string, number>
  ): Prediction {
    if (predictions.length === 0) {
      throw new Error('No predictions to combine');
    }
    
    const horizon = predictions[0].horizon;
    const combinedValues: PredictedValue[] = [];
    
    for (let i = 0; i < horizon; i++) {
      let weightedValue = 0;
      let weightedConfidence = 0;
      let totalWeight = 0;
      
      for (const [method, prediction] of Object.entries(predictions)) {
        const weight = weights[method] || 0;
        if (weight > 0 && i < prediction.values.length) {
          weightedValue += weight * prediction.values[i].value;
          weightedConfidence += weight * prediction.values[i].confidence;
          totalWeight += weight;
        }
      }
      
      if (totalWeight > 0) {
        combinedValues.push({
          timestamp: predictions[0].values[i].timestamp,
          value: weightedValue / totalWeight,
          confidence: weightedConfidence / totalWeight,
          upperBound: weightedValue / totalWeight + (1 - weightedConfidence / totalWeight) * weightedValue / totalWeight * 0.2,
          lowerBound: weightedValue / totalWeight - (1 - weightedConfidence / totalWeight) * weightedValue / totalWeight * 0.2
        });
      }
    }
    
    return {
      horizon,
      values: combinedValues,
      confidence: combinedValues.reduce((sum, v) => sum + v.confidence, 0) / combinedValues.length,
      methodology: 'weighted_ensemble',
      accuracy: 0,
      lastUpdated: new Date()
    };
  }

  /**
   * Calculate prediction accuracy
   */
  private calculatePredictionAccuracy(
    historicalMetrics: MetricValue[],
    predictedValues: PredictedValue[]
  ): number {
    if (historicalMetrics.length < predictedValues.length * 2) return 0;
    
    // Use last portion of historical data to validate
    const validationSize = Math.min(predictedValues.length, Math.floor(historicalMetrics.length / 4));
    const actualValues = historicalMetrics.slice(-validationSize).map(m => m.value);
    
    let totalError = 0;
    for (let i = 0; i < validationSize && i < predictedValues.length; i++) {
      const error = Math.abs(actualValues[i] - predictedValues[i].value);
      totalError += error / actualValues[i]; // Percentage error
    }
    
    const avgError = totalError / validationSize;
    return Math.max(0, 1 - avgError);
  }

  /**
   * Clean up old data
   */
  private cleanupOldData(): void {
    const cutoffDate = new Date(Date.now() - this.config.historicalRetention * 24 * 60 * 60 * 1000);
    
    for (const [key, metrics] of this.historicalData.entries()) {
      const filtered = metrics.filter(m => m.timestamp >= cutoffDate);
      this.historicalData.set(key, filtered);
    }
    
    console.log('[TREND_ANALYSIS] Cleaned up old historical data');
    this.emit('dataCleanup', { timestamp: new Date(), cutoffDate });
  }

  /**
   * Generate trend report
   */
  public async generateTrendReport(
    name: string,
    description: string,
    timeRange: { start: Date; end: Date },
    filters?: {
      metricId?: string;
      component?: string;
      operation?: string;
      environment?: string;
    }
  ): Promise<TrendReport> {
    const startTime = Date.now();
    
    // Get trend data for the report
    const trendData = Array.from(this.trendData.values()).filter(data => {
      if (data.timestamp < timeRange.start || data.timestamp > timeRange.end) {
        return false;
      }
      
      if (filters) {
        if (filters.metricId && data.metricId !== filters.metricId) return false;
        if (filters.component && data.component !== filters.component) return false;
        if (filters.operation && data.operation !== filters.operation) return false;
        if (filters.environment && data.environment !== filters.environment) return false;
      }
      
      return true;
    });
    
    // Calculate summary statistics
    const summary = this.calculateTrendSummary(trendData);
    
    // Generate insights
    const insights = this.generateTrendInsights(trendData, summary);
    
    // Generate recommendations
    const recommendations = this.generateTrendRecommendations(trendData, summary, insights);
    
    const report: TrendReport = {
      id: uuidv4(),
      name,
      description,
      timeRange,
      metrics: trendData,
      summary,
      insights,
      recommendations,
      generatedAt: new Date()
    };
    
    // Record report generation duration
    this.durationTrackingSystem.recordDuration(
      'trend_report_generation_duration_ms',
      Date.now() - startTime,
      {
        component: 'duration_trend_analysis_engine',
        operation: 'generate_report',
        reportId: report.id,
        totalMetrics: trendData.length
      },
      {
        operationType: 'report_generation',
        reportId: report.id,
        totalMetrics: trendData.length
      }
    );
    
    this.emit('reportGenerated', report);
    return report;
  }

  /**
   * Calculate trend summary
   */
  private calculateTrendSummary(trendData: TrendData[]): TrendReport['summary'] {
    if (trendData.length === 0) {
      return {
        totalMetrics: 0,
        totalAnomalies: 0,
        totalPatterns: 0,
        avgTrendSlope: 0,
        avgConfidence: 0,
        predictionAccuracy: 0
      };
    }
    
    const totalAnomalies = trendData.reduce((sum, data) => sum + data.anomalies.length, 0);
    const totalPatterns = trendData.reduce((sum, data) => sum + data.patterns.length, 0);
    const avgTrendSlope = trendData.reduce((sum, data) => sum + data.trend.slope, 0) / trendData.length;
    const avgConfidence = trendData.reduce((sum, data) => sum + data.trend.confidence, 0) / trendData.length;
    const predictionAccuracy = trendData.reduce((sum, data) => sum + data.prediction.accuracy, 0) / trendData.length;
    
    return {
      totalMetrics: trendData.length,
      totalAnomalies,
      totalPatterns,
      avgTrendSlope,
      avgConfidence,
      predictionAccuracy
    };
  }

  /**
   * Generate trend insights
   */
  private generateTrendInsights(
    trendData: TrendData[],
    summary: TrendReport['summary']
  ): TrendInsight[] {
    const insights: TrendInsight[] = [];
    
    // Overall trend insights
    if (summary.avgTrendSlope > 0.1) {
      insights.push({
        id: uuidv4(),
        type: 'trend',
        severity: 'warning',
        title: 'Increasing Duration Trend',
        description: `Average duration is increasing with slope of ${summary.avgTrendSlope.toFixed(3)}`,
        impact: 'Performance degradation over time',
        confidence: summary.avgConfidence,
        data: { slope: summary.avgTrendSlope, confidence: summary.avgConfidence }
      });
    } else if (summary.avgTrendSlope < -0.1) {
      insights.push({
        id: uuidv4(),
        type: 'trend',
        severity: 'info',
        title: 'Improving Duration Trend',
        description: `Average duration is improving with slope of ${summary.avgTrendSlope.toFixed(3)}`,
        impact: 'Performance improvement over time',
        confidence: summary.avgConfidence,
        data: { slope: summary.avgTrendSlope, confidence: summary.avgConfidence }
      });
    }
    
    // Anomaly insights
    if (summary.totalAnomalies > trendData.length * 0.1) {
      insights.push({
        id: uuidv4(),
        type: 'anomaly',
        severity: 'error',
        title: 'High Anomaly Rate',
        description: `High number of anomalies detected: ${summary.totalAnomalies}`,
        impact: 'System instability and unpredictable performance',
        confidence: 0.8,
        data: { totalAnomalies: summary.totalAnomalies, anomalyRate: summary.totalAnomalies / trendData.length }
      });
    }
    
    // Pattern insights
    if (summary.totalPatterns > 0) {
      insights.push({
        id: uuidv4(),
        type: 'pattern',
        severity: 'info',
        title: 'Recurring Patterns Detected',
        description: `${summary.totalPatterns} recurring patterns identified in duration metrics`,
        impact: 'Opportunity for optimization and prediction',
        confidence: 0.7,
        data: { totalPatterns: summary.totalPatterns }
      });
    }
    
    // Prediction accuracy insights
    if (summary.predictionAccuracy < 0.7) {
      insights.push({
        id: uuidv4(),
        type: 'prediction',
        severity: 'warning',
        title: 'Low Prediction Accuracy',
        description: `Prediction accuracy is ${ (summary.predictionAccuracy * 100).toFixed(1) }%`,
        impact: 'Reduced reliability of duration forecasts',
        confidence: 0.6,
        data: { accuracy: summary.predictionAccuracy }
      });
    }
    
    return insights;
  }

  /**
   * Generate trend recommendations
   */
  private generateTrendRecommendations(
    trendData: TrendData[],
    summary: TrendReport['summary'],
    insights: TrendInsight[]
  ): string[] {
    const recommendations: string[] = [];
    
    // Trend-based recommendations
    if (summary.avgTrendSlope > 0.1) {
      recommendations.push('Investigate root causes of increasing duration trends and implement optimization measures');
    }
    
    // Anomaly-based recommendations
    if (summary.totalAnomalies > trendData.length * 0.1) {
      recommendations.push('Review system stability and implement better error handling to reduce anomalies');
    }
    
    // Pattern-based recommendations
    if (summary.totalPatterns > 0) {
      recommendations.push('Leverage detected patterns for proactive performance management and capacity planning');
    }
    
    // Prediction-based recommendations
    if (summary.predictionAccuracy < 0.7) {
      recommendations.push('Improve data quality and consider additional prediction models to increase accuracy');
    }
    
    // General recommendations
    if (summary.avgConfidence < 0.6) {
      recommendations.push('Increase data collection frequency and improve data quality to boost analysis confidence');
    }
    
    return recommendations;
  }

  /**
   * Get trend data
   */
  public getTrendData(filter?: {
    metricId?: string;
    component?: string;
    operation?: string;
    environment?: string;
    timeRange?: { start: Date; end: Date };
  }): TrendData[] {
    let trendData = Array.from(this.trendData.values());
    
    if (filter) {
      if (filter.metricId) {
        trendData = trendData.filter(data => data.metricId === filter.metricId);
      }
      if (filter.component) {
        trendData = trendData.filter(data => data.component === filter.component);
      }
      if (filter.operation) {
        trendData = trendData.filter(data => data.operation === filter.operation);
      }
      if (filter.environment) {
        trendData = trendData.filter(data => data.environment === filter.environment);
      }
      if (filter.timeRange) {
        trendData = trendData.filter(data => 
          data.timestamp >= filter.timeRange.start && 
          data.timestamp <= filter.timeRange.end
        );
      }
    }
    
    return trendData;
  }

  /**
   * Get anomalies
   */
  public getAnomalies(filter?: {
    metricId?: string;
    component?: string;
    operation?: string;
    environment?: string;
    severity?: Anomaly['severity'];
    timeRange?: { start: Date; end: Date };
  }): Anomaly[] {
    const anomalies: Anomaly[] = [];
    
    for (const [key, metricAnomalies] of this.anomalies.entries()) {
      const { metricId, component, operation, environment } = this.parseMetricKey(key);
      
      for (const anomaly of metricAnomalies) {
        // Apply filters
        if (filter?.metricId && metricId !== filter.metricId) continue;
        if (filter?.component && component !== filter.component) continue;
        if (filter?.operation && operation !== filter.operation) continue;
        if (filter?.environment && environment !== filter.environment) continue;
        if (filter?.severity && anomaly.severity !== filter.severity) continue;
        if (filter?.timeRange && (anomaly.timestamp < filter.timeRange.start || anomaly.timestamp > filter.timeRange.end)) continue;
        
        anomalies.push({
          ...anomaly,
          metricId,
          component,
          operation,
          environment
        } as any);
      }
    }
    
    return anomalies;
  }

  /**
   * Get patterns
   */
  public getPatterns(filter?: {
    metricId?: string;
    component?: string;
    operation?: string;
    environment?: string;
    type?: Pattern['type'];
    timeRange?: { start: Date; end: Date };
  }): Pattern[] {
    const patterns: Pattern[] = [];
    
    for (const [key, metricPatterns] of this.patterns.entries()) {
      const { metricId, component, operation, environment } = this.parseMetricKey(key);
      
      for (const pattern of metricPatterns) {
        // Apply filters
        if (filter?.metricId && metricId !== filter.metricId) continue;
        if (filter?.component && component !== filter.component) continue;
        if (filter?.operation && operation !== filter.operation) continue;
        if (filter?.environment && environment !== filter.environment) continue;
        if (filter?.type && pattern.type !== filter.type) continue;
        if (filter?.timeRange && (pattern.lastSeen < filter.timeRange.start || pattern.firstSeen > filter.timeRange.end)) continue;
        
        patterns.push({
          ...pattern,
          metricId,
          component,
          operation,
          environment
        } as any);
      }
    }
    
    return patterns;
  }

  /**
   * Set up event forwarding
   */
  private setupEventForwarding(): void {
    // Forward trend analysis events to duration tracking system
    this.durationTrackingSystem.on('metric_collected', (data) => {
      this.emit('durationMetricCollected', {
        ...data,
        source: 'duration_trend_analysis_engine'
      });
    });

    this.durationTrackingSystem.on('quality_validated', (data) => {
      this.emit('durationQualityValidated', {
        ...data,
        source: 'duration_trend_analysis_engine'
      });
    });

    this.durationTrackingSystem.on('alert_triggered', (data) => {
      this.emit('durationAlertTriggered', {
        ...data,
        source: 'duration_trend_analysis_engine'
      });
    });

    this.durationTrackingSystem.on('aggregation_completed', (data) => {
      this.emit('durationAggregationCompleted', {
        ...data,
        source: 'duration_trend_analysis_engine'
      });
    });

    this.durationTrackingSystem.on('trend_detected', (data) => {
      this.emit('durationTrendDetected', {
        ...data,
        source: 'duration_trend_analysis_engine'
      });
    });

    this.durationTrackingSystem.on('anomaly_detected', (data) => {
      this.emit('durationAnomalyDetected', {
        ...data,
        source: 'duration_trend_analysis_engine'
      });
    });

    this.durationTrackingSystem.on('report_generated', (data) => {
      this.emit('durationReportGenerated', {
        ...data,
        source: 'duration_trend_analysis_engine'
      });
    });
  }
}