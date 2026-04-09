/**
 * Duration Metrics Aggregation Engine
 * 
 * Provides comprehensive aggregation and reporting capabilities for duration_ms metrics
 * across different time dimensions, components, and contexts
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { DurationTrackingSystem, MetricDefinition, MetricValue } from './index';

export interface AggregationRule {
  id: string;
  name: string;
  description: string;
  metricId: string;
  enabled: boolean;
  environment: string[];
  intervals: string[]; // e.g., ['1m', '5m', '15m', '1h', '1d', '1w', '1M']
  aggregations: string[]; // e.g., ['sum', 'avg', 'min', 'max', 'median', 'p95', 'p99']
  dimensions: string[]; // e.g., ['component', 'operation', 'status']
  filters: Record<string, any>;
  retention: {
    raw: number; // days
    '1m': number; // days
    '5m': number; // days
    '15m': number; // days
    '1h': number; // days
    '1d': number; // days
    '1w': number; // days
    '1M': number; // days
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface AggregatedMetric {
  id: string;
  metricId: string;
  interval: string;
  aggregation: string;
  timestamp: Date;
  value: number;
  count: number;
  sum: number;
  min: number;
  max: number;
  avg: number;
  median: number;
  p95: number;
  p99: number;
  dimensions: Record<string, string>;
  metadata: Record<string, any>;
}

export interface AggregationReport {
  id: string;
  name: string;
  description: string;
  timeRange: {
    start: Date;
    end: Date;
  };
  metrics: AggregatedMetric[];
  summary: {
    totalMetrics: number;
    totalIntervals: number;
    totalAggregations: number;
    dataPoints: number;
    completeness: number;
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
    p95Duration: number;
    p99Duration: number;
  };
  trends: {
    overall: 'improving' | 'stable' | 'degrading';
    byInterval: Record<string, 'improving' | 'stable' | 'degrading'>;
    byDimension: Record<string, 'improving' | 'stable' | 'degrading'>;
  };
  insights: string[];
  recommendations: string[];
  generatedAt: Date;
}

export interface AggregationConfig {
  enabled: boolean;
  defaultIntervals: string[];
  defaultAggregations: string[];
  defaultDimensions: string[];
  maxAggregationAge: number; // days
  batchSize: number;
  processingInterval: number; // seconds
  retentionPolicy: {
    raw: number; // days
    '1m': number; // days
    '5m': number; // days
    '15m': number; // days
    '1h': number; // days
    '1d': number; // days
    '1w': number; // days
    '1M': number; // days
  };
}

export class DurationAggregationEngine extends EventEmitter {
  private rules: Map<string, AggregationRule> = new Map();
  private aggregatedMetrics: Map<string, AggregatedMetric[]> = new Map();
  private config: AggregationConfig;
  private isRunning: boolean = false;
  private processingInterval: NodeJS.Timeout | null = null;
  private durationTrackingSystem: DurationTrackingSystem;

  constructor(config: Partial<AggregationConfig> = {}) {
    super();
    
    this.config = {
      enabled: true,
      defaultIntervals: ['1m', '5m', '15m', '1h', '1d', '1w', '1M'],
      defaultAggregations: ['sum', 'avg', 'min', 'max', 'median', 'p95', 'p99'],
      defaultDimensions: ['component', 'operation', 'status'],
      maxAggregationAge: 90,
      batchSize: 1000,
      processingInterval: 60, // 1 minute
      retentionPolicy: {
        raw: 7,
        '1m': 30,
        '5m': 60,
        '15m': 90,
        '1h': 180,
        '1d': 365,
        '1w': 730,
        '1M': 1825
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
        defaultIntervals: this.config.defaultIntervals,
        defaultTypes: this.config.defaultAggregations,
        defaultDimensions: this.config.defaultDimensions,
        maxAggregationAge: this.config.maxAggregationAge
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
            name: 'duration_aggregation_engine',
            type: 'aggregation',
            enabled: true,
            configuration: {},
            mapping: {
              sourceField: 'aggregationResult',
              targetField: 'aggregatedMetric',
              transformation: 'aggregationResult',
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
    this.initializeDefaultRules();
  }

  /**
   * Start aggregation engine
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[AGGREGATION_ENGINE] Aggregation engine already running');
      return;
    }

    this.isRunning = true;
    console.log('[AGGREGATION_ENGINE] Starting duration aggregation engine');

    // Start duration tracking system
    await this.durationTrackingSystem.start();

    // Start processing interval
    this.processingInterval = setInterval(() => {
      this.processAggregations();
    }, this.config.processingInterval * 1000);

    console.log('[AGGREGATION_ENGINE] Aggregation engine started');
    this.emit('started', { timestamp: new Date() });
  }

  /**
   * Stop aggregation engine
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    // Stop duration tracking system
    await this.durationTrackingSystem.stop();

    console.log('[AGGREGATION_ENGINE] Aggregation engine stopped');
    this.emit('stopped', { timestamp: new Date() });
  }

  /**
   * Initialize default aggregation rules
   */
  private initializeDefaultRules(): void {
    // Duration aggregation rule for all duration_ms metrics
    this.createRule({
      id: 'duration_ms_aggregation',
      name: 'Duration Metrics Aggregation',
      description: 'Aggregates all duration_ms metrics across all intervals and dimensions',
      metricId: 'duration_ms',
      enabled: true,
      environment: ['development', 'staging', 'production'],
      intervals: this.config.defaultIntervals,
      aggregations: this.config.defaultAggregations,
      dimensions: this.config.defaultDimensions,
      filters: {},
      retention: this.config.retentionPolicy
    });

    // Component-specific duration aggregation
    this.createRule({
      id: 'component_duration_aggregation',
      name: 'Component Duration Aggregation',
      description: 'Aggregates duration metrics by component',
      metricId: 'duration_ms',
      enabled: true,
      environment: ['development', 'staging', 'production'],
      intervals: ['1m', '5m', '15m', '1h'],
      aggregations: ['avg', 'min', 'max', 'p95', 'p99'],
      dimensions: ['component'],
      filters: {},
      retention: {
        raw: 7,
        '1m': 30,
        '5m': 60,
        '15m': 90,
        '1h': 180,
        '1d': 365,
        '1w': 730,
        '1M': 1825
      }
    });

    // Operation-specific duration aggregation
    this.createRule({
      id: 'operation_duration_aggregation',
      name: 'Operation Duration Aggregation',
      description: 'Aggregates duration metrics by operation type',
      metricId: 'duration_ms',
      enabled: true,
      environment: ['development', 'staging', 'production'],
      intervals: ['5m', '15m', '1h', '1d'],
      aggregations: ['avg', 'min', 'max', 'p95', 'p99'],
      dimensions: ['operation'],
      filters: {},
      retention: {
        raw: 7,
        '1m': 30,
        '5m': 60,
        '15m': 90,
        '1h': 180,
        '1d': 365,
        '1w': 730,
        '1M': 1825
      }
    });
  }

  /**
   * Create an aggregation rule
   */
  private createRule(rule: Omit<AggregationRule, 'id' | 'createdAt' | 'updatedAt'>): void {
    const fullRule: AggregationRule = {
      ...rule,
      id: rule.id || uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.rules.set(fullRule.id, fullRule);
    console.log(`[AGGREGATION_ENGINE] Created aggregation rule: ${fullRule.name} (${fullRule.id})`);
  }

  /**
   * Process aggregations
   */
  private async processAggregations(): Promise<void> {
    try {
      console.log('[AGGREGATION_ENGINE] Processing aggregations');

      const startTime = Date.now();

      // Get metrics from duration tracking system
      const metrics = this.durationTrackingSystem.getMetrics({
        source: 'duration_aggregation_engine'
      });

      // Group metrics by rule
      const metricsByRule = new Map<string, MetricValue[]>();
      metrics.forEach(metric => {
        const rules = Array.from(this.rules.values()).filter(rule => 
          rule.metricId === metric.metricId && rule.enabled
        );
        
        rules.forEach(rule => {
          const existing = metricsByRule.get(rule.id) || [];
          existing.push(metric);
          metricsByRule.set(rule.id, existing);
        });
      });

      // Process each rule
      for (const [ruleId, ruleMetrics] of metricsByRule.entries()) {
        const rule = this.rules.get(ruleId);
        if (!rule) continue;

        await this.processRule(rule, ruleMetrics);
      }

      const processingDuration = Date.now() - startTime;

      // Record aggregation processing duration
      this.durationTrackingSystem.recordDuration(
        'aggregation_processing_duration_ms',
        processingDuration,
        {
          component: 'duration_aggregation_engine',
          operation: 'process_aggregations',
          totalMetrics: metrics.length,
          totalRules: this.rules.size
        },
        {
          operationType: 'aggregation_processing',
          totalMetrics: metrics.length,
          totalRules: this.rules.size
        }
      );

      console.log(`[AGGREGATION_ENGINE] Aggregation processing completed in ${processingDuration}ms`);
      this.emit('aggregationCompleted', {
        timestamp: new Date(),
        totalMetrics: metrics.length,
        processingDuration
      });

    } catch (error) {
      console.error('[AGGREGATION_ENGINE] Error during aggregation processing:', error);
      this.emit('aggregationError', { timestamp: new Date(), error });
    }
  }

  /**
   * Process a specific aggregation rule
   */
  private async processRule(rule: AggregationRule, metrics: MetricValue[]): Promise<void> {
    for (const interval of rule.intervals) {
      for (const aggregation of rule.aggregations) {
        await this.aggregateMetrics(rule, metrics, interval, aggregation);
      }
    }
  }

  /**
   * Aggregate metrics for a specific interval and aggregation type
   */
  private async aggregateMetrics(
    rule: AggregationRule,
    metrics: MetricValue[],
    interval: string,
    aggregation: string
  ): Promise<void> {
    // Group metrics by time window and dimensions
    const timeWindows = this.groupMetricsByTimeWindow(metrics, interval);
    
    for (const [timeWindowKey, windowMetrics] of timeWindows.entries()) {
      // Group by dimensions
      const dimensionGroups = this.groupMetricsByDimensions(windowMetrics, rule.dimensions);
      
      for (const [dimensionKey, dimensionMetrics] of dimensionGroups.entries()) {
        const aggregatedValue = this.calculateAggregation(dimensionMetrics, aggregation);
        
        if (aggregatedValue !== null) {
          const aggregatedMetric: AggregatedMetric = {
            id: uuidv4(),
            metricId: rule.metricId,
            interval,
            aggregation,
            timestamp: this.parseTimeWindowKey(timeWindowKey),
            value: aggregatedValue,
            count: dimensionMetrics.length,
            sum: this.calculateAggregation(dimensionMetrics, 'sum') || 0,
            min: this.calculateAggregation(dimensionMetrics, 'min') || 0,
            max: this.calculateAggregation(dimensionMetrics, 'max') || 0,
            avg: this.calculateAggregation(dimensionMetrics, 'avg') || 0,
            median: this.calculateAggregation(dimensionMetrics, 'median') || 0,
            p95: this.calculateAggregation(dimensionMetrics, 'p95') || 0,
            p99: this.calculateAggregation(dimensionMetrics, 'p99') || 0,
            dimensions: this.parseDimensionKey(dimensionKey),
            metadata: {
              ruleId: rule.id,
              aggregationType: aggregation,
              interval,
              processedAt: new Date()
            }
          };

          // Store aggregated metric
          this.storeAggregatedMetric(aggregatedMetric);

          // Record aggregation duration
          this.durationTrackingSystem.recordDuration(
            'metric_aggregation_duration_ms',
            Date.now() - new Date().getTime(),
            {
              component: 'duration_aggregation_engine',
              operation: 'aggregate_metrics',
              metricId: rule.metricId,
              interval,
              aggregation,
              value: aggregatedValue
            },
            {
              operationType: 'metric_aggregation',
              metricId: rule.metricId,
              interval,
              aggregation,
              value: aggregatedValue
            }
          );
        }
      }
    }
  }

  /**
   * Group metrics by time window
   */
  private groupMetricsByTimeWindow(metrics: MetricValue[], interval: string): Map<string, MetricValue[]> {
    const timeWindows = new Map<string, MetricValue[]>();
    
    for (const metric of metrics) {
      const timeWindowKey = this.getTimeWindowKey(metric.timestamp, interval);
      const existing = timeWindows.get(timeWindowKey) || [];
      existing.push(metric);
      timeWindows.set(timeWindowKey, existing);
    }
    
    return timeWindows;
  }

  /**
   * Get time window key for a timestamp and interval
   */
  private getTimeWindowKey(timestamp: Date, interval: string): string {
    const date = new Date(timestamp);
    
    switch (interval) {
      case '1m':
        return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}`;
      case '5m':
        const minute5 = Math.floor(date.getMinutes() / 5) * 5;
        return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}-${minute5}`;
      case '15m':
        const minute15 = Math.floor(date.getMinutes() / 15) * 15;
        return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}-${minute15}`;
      case '1h':
        return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
      case '1d':
        return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      case '1w':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        return `${weekStart.getFullYear()}-W${Math.ceil((weekStart.getDate() + 1) / 7)}`;
      case '1M':
        return `${date.getFullYear()}-${date.getMonth()}`;
      default:
        return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    }
  }

  /**
   * Parse time window key to date
   */
  private parseTimeWindowKey(timeWindowKey: string): Date {
    const parts = timeWindowKey.split('-');
    
    if (parts.length === 5) {
      // YYYY-M-D-H-M
      return new Date(
        parseInt(parts[0]),
        parseInt(parts[1]),
        parseInt(parts[2]),
        parseInt(parts[3]),
        parseInt(parts[4])
      );
    } else if (parts.length === 4) {
      // YYYY-M-D-H
      return new Date(
        parseInt(parts[0]),
        parseInt(parts[1]),
        parseInt(parts[2]),
        parseInt(parts[3])
      );
    } else if (parts.length === 3) {
      // YYYY-M-D
      return new Date(
        parseInt(parts[0]),
        parseInt(parts[1]),
        parseInt(parts[2])
      );
    } else {
      return new Date();
    }
  }

  /**
   * Group metrics by dimensions
   */
  private groupMetricsByDimensions(metrics: MetricValue[], dimensions: string[]): Map<string, MetricValue[]> {
    const dimensionGroups = new Map<string, MetricValue[]>();
    
    for (const metric of metrics) {
      const dimensionKey = this.getDimensionKey(metric, dimensions);
      const existing = dimensionGroups.get(dimensionKey) || [];
      existing.push(metric);
      dimensionGroups.set(dimensionKey, existing);
    }
    
    return dimensionGroups;
  }

  /**
   * Get dimension key for a metric
   */
  private getDimensionKey(metric: MetricValue, dimensions: string[]): string {
    const dimensionValues: string[] = [];
    
    for (const dimension of dimensions) {
      const value = metric.dimensions[dimension] || 'unknown';
      dimensionValues.push(`${dimension}:${value}`);
    }
    
    return dimensionValues.join('|');
  }

  /**
   * Parse dimension key to dimensions object
   */
  private parseDimensionKey(dimensionKey: string): Record<string, string> {
    const dimensions: Record<string, string> = {};
    
    if (dimensionKey) {
      const pairs = dimensionKey.split('|');
      for (const pair of pairs) {
        const [key, value] = pair.split(':');
        if (key && value) {
          dimensions[key] = value;
        }
      }
    }
    
    return dimensions;
  }

  /**
   * Calculate aggregation for a set of metrics
   */
  private calculateAggregation(metrics: MetricValue[], aggregation: string): number | null {
    if (metrics.length === 0) return null;
    
    const values = metrics.map(m => m.value).filter(v => v !== null && v !== undefined);
    
    if (values.length === 0) return null;
    
    switch (aggregation) {
      case 'sum':
        return values.reduce((sum, v) => sum + v, 0);
      case 'avg':
        return values.reduce((sum, v) => sum + v, 0) / values.length;
      case 'min':
        return Math.min(...values);
      case 'max':
        return Math.max(...values);
      case 'median':
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 0 
          ? (sorted[mid - 1] + sorted[mid]) / 2 
          : sorted[mid];
      case 'p95':
        const p95Index = Math.floor(values.length * 0.95);
        return [...values].sort((a, b) => a - b)[p95Index];
      case 'p99':
        const p99Index = Math.floor(values.length * 0.99);
        return [...values].sort((a, b) => a - b)[p99Index];
      default:
        return null;
    }
  }

  /**
   * Store aggregated metric
   */
  private storeAggregatedMetric(metric: AggregatedMetric): void {
    const key = `${metric.metricId}:${metric.interval}:${metric.aggregation}`;
    const existing = this.aggregatedMetrics.get(key) || [];
    existing.push(metric);
    this.aggregatedMetrics.set(key, existing);
    
    // Emit aggregation event
    this.emit('metricAggregated', metric);
  }

  /**
   * Get aggregated metrics
   */
  public getAggregatedMetrics(filter?: {
    metricId?: string;
    interval?: string;
    aggregation?: string;
    dimensions?: Record<string, string>;
    timeRange?: { start: Date; end: Date };
  }): AggregatedMetric[] {
    let metrics: AggregatedMetric[] = [];
    
    if (filter) {
      // Filter by key if specific metric, interval, and aggregation are provided
      if (filter.metricId && filter.interval && filter.aggregation) {
        const key = `${filter.metricId}:${filter.interval}:${filter.aggregation}`;
        metrics = this.aggregatedMetrics.get(key) || [];
      } else {
        // Get all metrics and filter manually
        metrics = Array.from(this.aggregatedMetrics.values()).flat();
      }
      
      // Apply filters
      if (filter.metricId) {
        metrics = metrics.filter(m => m.metricId === filter.metricId);
      }
      
      if (filter.interval) {
        metrics = metrics.filter(m => m.interval === filter.interval);
      }
      
      if (filter.aggregation) {
        metrics = metrics.filter(m => m.aggregation === filter.aggregation);
      }
      
      if (filter.dimensions) {
        metrics = metrics.filter(m => {
          for (const [key, value] of Object.entries(filter.dimensions)) {
            if (m.dimensions[key] !== value) {
              return false;
            }
          }
          return true;
        });
      }
      
      if (filter.timeRange) {
        metrics = metrics.filter(m => 
          m.timestamp >= filter.timeRange.start && 
          m.timestamp <= filter.timeRange.end
        );
      }
    } else {
      // Return all metrics
      metrics = Array.from(this.aggregatedMetrics.values()).flat();
    }
    
    return metrics;
  }

  /**
   * Generate aggregation report
   */
  public async generateAggregationReport(
    name: string,
    description: string,
    timeRange: { start: Date; end: Date },
    filters?: {
      metricId?: string;
      interval?: string;
      aggregation?: string;
      dimensions?: Record<string, string>;
    }
  ): Promise<AggregationReport> {
    const startTime = Date.now();
    
    // Get metrics for the report
    const metrics = this.getAggregatedMetrics({
      ...filters,
      timeRange
    });
    
    // Calculate summary statistics
    const summary = this.calculateSummaryStatistics(metrics);
    
    // Analyze trends
    const trends = this.analyzeTrends(metrics, timeRange);
    
    // Generate insights
    const insights = this.generateInsights(metrics, summary, trends);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(metrics, summary, trends, insights);
    
    const report: AggregationReport = {
      id: uuidv4(),
      name,
      description,
      timeRange,
      metrics,
      summary,
      trends,
      insights,
      recommendations,
      generatedAt: new Date()
    };
    
    // Record report generation duration
    this.durationTrackingSystem.recordDuration(
      'aggregation_report_generation_duration_ms',
      Date.now() - startTime,
      {
        component: 'duration_aggregation_engine',
        operation: 'generate_report',
        reportId: report.id,
        totalMetrics: metrics.length
      },
      {
        operationType: 'report_generation',
        reportId: report.id,
        totalMetrics: metrics.length
      }
    );
    
    this.emit('reportGenerated', report);
    return report;
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummaryStatistics(metrics: AggregatedMetric[]): AggregationReport['summary'] {
    if (metrics.length === 0) {
      return {
        totalMetrics: 0,
        totalIntervals: 0,
        totalAggregations: 0,
        dataPoints: 0,
        completeness: 0,
        avgDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        p95Duration: 0,
        p99Duration: 0
      };
    }
    
    const values = metrics.map(m => m.value).filter(v => v !== null && v !== undefined);
    const intervals = new Set(metrics.map(m => m.interval));
    const aggregations = new Set(metrics.map(m => m.aggregation));
    const dataPoints = metrics.reduce((sum, m) => sum + m.count, 0);
    
    const sorted = [...values].sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95);
    const p99Index = Math.floor(sorted.length * 0.99);
    
    return {
      totalMetrics: metrics.length,
      totalIntervals: intervals.size,
      totalAggregations: aggregations.size,
      dataPoints,
      completeness: (dataPoints / metrics.length) * 100,
      avgDuration: values.reduce((sum, v) => sum + v, 0) / values.length,
      minDuration: Math.min(...values),
      maxDuration: Math.max(...values),
      p95Duration: sorted[p95Index] || 0,
      p99Duration: sorted[p99Index] || 0
    };
  }

  /**
   * Analyze trends
   */
  private analyzeTrends(
    metrics: AggregatedMetric[],
    timeRange: { start: Date; end: Date }
  ): AggregationReport['trends'] {
    // Group metrics by interval
    const metricsByInterval = new Map<string, AggregatedMetric[]>();
    metrics.forEach(metric => {
      const existing = metricsByInterval.get(metric.interval) || [];
      existing.push(metric);
      metricsByInterval.set(metric.interval, existing);
    });
    
    // Group metrics by dimension
    const metricsByDimension = new Map<string, AggregatedMetric[]>();
    metrics.forEach(metric => {
      const dimensionKey = Object.entries(metric.dimensions)
        .map(([k, v]) => `${k}:${v}`)
        .join('|');
      const existing = metricsByDimension.get(dimensionKey) || [];
      existing.push(metric);
      metricsByDimension.set(dimensionKey, existing);
    });
    
    // Calculate trends for each group
    const trendsByInterval: Record<string, 'improving' | 'stable' | 'degrading'> = {};
    const trendsByDimension: Record<string, 'improving' | 'stable' | 'degrading'> = {};
    
    for (const [interval, intervalMetrics] of metricsByInterval.entries()) {
      trendsByInterval[interval] = this.calculateTrend(intervalMetrics);
    }
    
    for (const [dimension, dimensionMetrics] of metricsByDimension.entries()) {
      trendsByDimension[dimension] = this.calculateTrend(dimensionMetrics);
    }
    
    // Calculate overall trend
    const allTrends = [...Object.values(trendsByInterval), ...Object.values(trendsByDimension)];
    const improvingCount = allTrends.filter(t => t === 'improving').length;
    const degradingCount = allTrends.filter(t => t === 'degrading').length;
    
    let overall: 'improving' | 'stable' | 'degrading';
    if (improvingCount > degradingCount) {
      overall = 'improving';
    } else if (degradingCount > improvingCount) {
      overall = 'degrading';
    } else {
      overall = 'stable';
    }
    
    return {
      overall,
      byInterval: trendsByInterval,
      byDimension: trendsByDimension
    };
  }

  /**
   * Calculate trend for a set of metrics
   */
  private calculateTrend(metrics: AggregatedMetric[]): 'improving' | 'stable' | 'degrading' {
    if (metrics.length < 3) return 'stable';
    
    // Sort by timestamp
    const sorted = metrics.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    // Calculate trend using linear regression
    const n = sorted.length;
    const x = sorted.map((_, i) => i);
    const y = sorted.map(m => m.value);
    
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    
    // Determine trend based on slope
    if (slope > 0.1) {
      return 'degrading'; // Duration increasing = degrading
    } else if (slope < -0.1) {
      return 'improving'; // Duration decreasing = improving
    } else {
      return 'stable';
    }
  }

  /**
   * Generate insights
   */
  private generateInsights(
    metrics: AggregatedMetric[],
    summary: AggregationReport['summary'],
    trends: AggregationReport['trends']
  ): string[] {
    const insights: string[] = [];
    
    // Overall performance insights
    if (summary.avgDuration > 60000) {
      insights.push('Average duration exceeds 1 minute, indicating potential performance issues');
    }
    
    if (summary.p99Duration > summary.avgDuration * 5) {
      insights.push('P99 duration is significantly higher than average, suggesting performance outliers');
    }
    
    // Trend insights
    if (trends.overall === 'degrading') {
      insights.push('Overall duration metrics are trending upward, indicating performance degradation');
    } else if (trends.overall === 'improving') {
      insights.push('Overall duration metrics are trending downward, indicating performance improvements');
    }
    
    // Interval-specific insights
    for (const [interval, trend] of Object.entries(trends.byInterval)) {
      if (trend === 'degrading') {
        insights.push(`${interval} interval shows degrading performance trend`);
      }
    }
    
    // Dimension-specific insights
    for (const [dimension, trend] of Object.entries(trends.byDimension)) {
      if (trend === 'degrading') {
        insights.push(`${dimension} shows degrading performance trend`);
      }
    }
    
    // Data quality insights
    if (summary.completeness < 90) {
      insights.push(`Data completeness is ${summary.completeness.toFixed(1)}%, below optimal threshold`);
    }
    
    return insights;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    metrics: AggregatedMetric[],
    summary: AggregationReport['summary'],
    trends: AggregationReport['trends'],
    insights: string[]
  ): string[] {
    const recommendations: string[] = [];
    
    // Performance recommendations
    if (summary.avgDuration > 60000) {
      recommendations.push('Consider optimizing slow operations to reduce average duration below 1 minute');
    }
    
    if (summary.p99Duration > summary.avgDuration * 5) {
      recommendations.push('Investigate and address performance outliers causing high P99 duration');
    }
    
    // Trend-based recommendations
    if (trends.overall === 'degrading') {
      recommendations.push('Implement performance monitoring and optimization initiatives to address degrading trends');
    }
    
    // Interval-specific recommendations
    for (const [interval, trend] of Object.entries(trends.byInterval)) {
      if (trend === 'degrading') {
        recommendations.push(`Focus optimization efforts on ${interval} interval performance`);
      }
    }
    
    // Dimension-specific recommendations
    for (const [dimension, trend] of Object.entries(trends.byDimension)) {
      if (trend === 'degrading') {
        recommendations.push(`Optimize performance for ${dimension} component/operation`);
      }
    }
    
    // Data quality recommendations
    if (summary.completeness < 90) {
      recommendations.push('Improve data collection processes to increase completeness above 90%');
    }
    
    return recommendations;
  }

  /**
   * Set up event forwarding
   */
  private setupEventForwarding(): void {
    // Forward aggregation events to duration tracking system
    this.durationTrackingSystem.on('metric_collected', (data) => {
      this.emit('durationMetricCollected', {
        ...data,
        source: 'duration_aggregation_engine'
      });
    });

    this.durationTrackingSystem.on('quality_validated', (data) => {
      this.emit('durationQualityValidated', {
        ...data,
        source: 'duration_aggregation_engine'
      });
    });

    this.durationTrackingSystem.on('alert_triggered', (data) => {
      this.emit('durationAlertTriggered', {
        ...data,
        source: 'duration_aggregation_engine'
      });
    });

    this.durationTrackingSystem.on('aggregation_completed', (data) => {
      this.emit('durationAggregationCompleted', {
        ...data,
        source: 'duration_aggregation_engine'
      });
    });

    this.durationTrackingSystem.on('trend_detected', (data) => {
      this.emit('durationTrendDetected', {
        ...data,
        source: 'duration_aggregation_engine'
      });
    });

    this.durationTrackingSystem.on('anomaly_detected', (data) => {
      this.emit('durationAnomalyDetected', {
        ...data,
        source: 'duration_aggregation_engine'
      });
    });

    this.durationTrackingSystem.on('report_generated', (data) => {
      this.emit('durationReportGenerated', {
        ...data,
        source: 'duration_aggregation_engine'
      });
    });
  }

  /**
   * Clean up old aggregated metrics based on retention policy
   */
  public async cleanupOldMetrics(): Promise<void> {
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - this.config.maxAggregationAge * 24 * 60 * 60 * 1000);
    
    for (const [key, metrics] of this.aggregatedMetrics.entries()) {
      const filtered = metrics.filter(m => m.timestamp >= cutoffDate);
      this.aggregatedMetrics.set(key, filtered);
    }
    
    console.log('[AGGREGATION_ENGINE] Cleaned up old aggregated metrics');
    this.emit('cleanupCompleted', { timestamp: now, cutoffDate });
  }

  /**
   * Get aggregation rules
   */
  public getRules(): AggregationRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Update aggregation rule
   */
  public updateRule(ruleId: string, updates: Partial<AggregationRule>): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) return false;
    
    const updatedRule = {
      ...rule,
      ...updates,
      updatedAt: new Date()
    };
    
    this.rules.set(ruleId, updatedRule);
    return true;
  }

  /**
   * Delete aggregation rule
   */
  public deleteRule(ruleId: string): boolean {
    return this.rules.delete(ruleId);
  }
}