/**
 * Core Duration Tracking System
 *
 * Implements standardized duration_ms tracking with quality assurance,
 * aggregation, monitoring, and alerting capabilities
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import {
    DurationAggregation,
    DurationAggregationType,
    DurationAlert,
    DurationAlertRule,
    DurationEventType,
    DurationMetric,
    DurationQuality,
    DurationQualityIssue,
    DurationTrackingConfig,
    DurationTrackingError,
    DurationTrend,
    TimeRange
} from './types';

export class DurationTracker extends EventEmitter {
  private metrics: Map<string, DurationMetric> = new Map();
  private aggregations: Map<string, DurationAggregation> = new Map();
  private alerts: Map<string, DurationAlert> = new Map();
  private trends: Map<string, DurationTrend> = new Map();
  private config: DurationTrackingConfig;
  private isRunning: boolean = false;
  private collectionInterval?: NodeJS.Timeout;
  private validationInterval?: NodeJS.Timeout;
  private aggregationInterval?: NodeJS.Timeout;

  constructor(config?: Partial<DurationTrackingConfig>) {
    super();
    this.config = this.createDefaultConfig(config);
    this.setupEventHandlers();
  }

  /**
   * Start the duration tracking system
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[DURATION_TRACKER] System already running');
      return;
    }

    this.isRunning = true;
    console.log('[DURATION_TRACKER] Starting duration tracking system');

    // Start collection interval
    this.collectionInterval = setInterval(async () => {
      await this.performCollection();
    }, this.config.collectionInterval * 1000);

    // Start validation interval
    if (this.config.validation.enabled) {
      this.validationInterval = setInterval(async () => {
        await this.performValidation();
      }, this.config.validation.validationInterval * 60 * 1000);
    }

    // Start aggregation interval
    if (this.config.aggregation.enabled) {
      this.aggregationInterval = setInterval(async () => {
        await this.performAggregation();
      }, 300000); // Every 5 minutes
    }

    console.log('[DURATION_TRACKER] Duration tracking system started');
    this.emitEvent('system_started', { environment: this.config.environment });
  }

  /**
   * Stop the duration tracking system
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = undefined;
    }

    if (this.validationInterval) {
      clearInterval(this.validationInterval);
      this.validationInterval = undefined;
    }

    if (this.aggregationInterval) {
      clearInterval(this.aggregationInterval);
      this.aggregationInterval = undefined;
    }

    console.log('[DURATION_TRACKER] Duration tracking system stopped');
    this.emitEvent('system_stopped', { environment: this.config.environment });
  }

  /**
   * Record a duration metric
   */
  public recordDuration(
    name: string,
    durationMs: number,
    metadata: Partial<DurationMetric['metadata']> = {},
    context: Partial<DurationMetric['context']> = {}
  ): DurationMetric {
    const metric: DurationMetric = {
      id: this.generateId('duration'),
      name,
      description: `Duration metric for ${name}`,
      category: this.inferCategory(name, metadata),
      type: this.inferType(name, context),
      unit: 'ms',
      source: this.inferSource(metadata),
      timestamp: new Date(),
      durationMs,
      metadata: {
        component: 'unknown',
        environment: this.config.environment,
        ...metadata
      },
      quality: this.assessInitialQuality(durationMs, metadata),
      tags: this.extractTags(name, metadata),
      context: {
        operationType: name,
        ...context
      }
    };

    // Validate the metric
    this.validateMetric(metric);

    // Store the metric
    this.metrics.set(metric.id, metric);

    // Emit event
    this.emitEvent('metric_collected', { metricId: metric.id, name, durationMs });

    // Check for immediate alerts
    this.checkImmediateAlerts(metric);

    console.log(`[DURATION_TRACKER] Recorded duration: ${name} = ${durationMs}ms`);
    return metric;
  }

  /**
   * Get duration metrics with filtering
   */
  public getMetrics(filters?: {
    category?: string;
    type?: string;
    source?: string;
    timeRange?: TimeRange;
    tags?: string[];
    component?: string;
    limit?: number;
  }): DurationMetric[] {
    let metrics = Array.from(this.metrics.values());

    if (filters) {
      if (filters.category) {
        metrics = metrics.filter(m => m.category === filters.category);
      }

      if (filters.type) {
        metrics = metrics.filter(m => m.type === filters.type);
      }

      if (filters.source) {
        metrics = metrics.filter(m => m.source === filters.source);
      }

      if (filters.timeRange) {
        metrics = metrics.filter(m =>
          m.timestamp >= filters.timeRange!.start &&
          m.timestamp <= filters.timeRange!.end
        );
      }

      if (filters.tags && filters.tags.length > 0) {
        metrics = metrics.filter(m =>
          filters.tags!.some(tag => m.tags.includes(tag))
        );
      }

      if (filters.component) {
        metrics = metrics.filter(m => m.metadata.component === filters.component);
      }

      if (filters.limit) {
        metrics = metrics.slice(0, filters.limit);
      }
    }

    // Sort by timestamp (newest first)
    metrics.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return metrics;
  }

  /**
   * Get duration aggregations
   */
  public getAggregations(metricId?: string): DurationAggregation[] {
    let aggregations = Array.from(this.aggregations.values());

    if (metricId) {
      aggregations = aggregations.filter(a => a.metricId === metricId);
    }

    return aggregations.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Get active alerts
   */
  public getActiveAlerts(): DurationAlert[] {
    return Array.from(this.alerts.values())
      .filter(alert => alert.status === 'active')
      .sort((a, b) => b.triggeredAt.getTime() - a.triggeredAt.getTime());
  }

  /**
   * Get trends
   */
  public getTrends(metricId?: string): DurationTrend[] {
    let trends = Array.from(this.trends.values());

    if (metricId) {
      trends = trends.filter(t => t.metricId === metricId);
    }

    return trends.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Create duration aggregation
   */
  public async createAggregation(
    metricId: string,
    timeRange: TimeRange,
    aggregationType: DurationAggregationType,
    dimensions: string[] = []
  ): Promise<DurationAggregation> {
    const metrics = this.getMetrics({
      timeRange,
      limit: 10000 // Reasonable limit for aggregation
    }).filter(m => m.id === metricId || this.shouldIncludeInAggregation(m, metricId));

    if (metrics.length === 0) {
      throw new DurationTrackingError(
        'NO_DATA',
        `No metrics found for aggregation of metric ${metricId}`,
        { metricId, timeRange, aggregationType }
      );
    }

    const aggregation: DurationAggregation = {
      id: this.generateId('aggregation'),
      metricId,
      timeRange,
      aggregationType,
      dimensions: dimensions.map(dim => ({
        name: dim,
        values: [...new Set(metrics.map(m => m.context[dim as keyof typeof m.context] || ''))],
        type: 'categorical'
      })),
      results: this.calculateAggregationResults(metrics, aggregationType, dimensions),
      metadata: {
        sampleSize: metrics.length,
        completeness: this.calculateCompleteness(metrics, timeRange),
        confidence: this.calculateConfidence(metrics),
        methodology: 'standard_aggregation',
        assumptions: ['data_is_complete', 'no_significant_outliers'],
        limitations: ['sample_size_limited', 'temporal_resolution']
      },
      createdAt: new Date()
    };

    this.aggregations.set(aggregation.id, aggregation);
    this.emitEvent('aggregation_completed', { aggregationId: aggregation.id, metricId });

    return aggregation;
  }

  /**
   * Create alert rule
   */
  public createAlertRule(rule: Omit<DurationAlertRule, 'id' | 'createdAt' | 'updatedAt'>): DurationAlertRule {
    const alertRule: DurationAlertRule = {
      ...rule,
      id: this.generateId('alert-rule'),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Store rule (would typically be persisted)
    this.config.alerting.defaultRules.push(alertRule);

    console.log(`[DURATION_TRACKER] Created alert rule: ${alertRule.name}`);
    return alertRule;
  }

  /**
   * Update configuration
   */
  public updateConfig(updates: Partial<DurationTrackingConfig>): void {
    this.config = { ...this.config, ...updates };
    this.emitEvent('configuration_updated', { updates });
  }

  /**
   * Get current configuration
   */
  public getConfig(): DurationTrackingConfig {
    return { ...this.config };
  }

  /**
   * Perform collection cycle
   */
  private async performCollection(): Promise<void> {
    try {
      // Clean up old metrics based on retention policy
      this.cleanupOldMetrics();

      // Emit collection event
      this.emitEvent('metric_collected', {
        metricsCount: this.metrics.size,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('[DURATION_TRACKER] Error during collection:', error);
      this.emitEvent('error_occurred', {
        error: error instanceof Error ? error.message : String(error),
        component: 'duration_tracker',
        operation: 'collection'
      });
    }
  }

  /**
   * Perform validation cycle
   */
  private async performValidation(): Promise<void> {
    try {
      console.log('[DURATION_TRACKER] Performing quality validation');

      const metrics = Array.from(this.metrics.values());
      const qualityIssues: DurationQualityIssue[] = [];

      for (const metric of metrics) {
        const issues = this.validateMetricQuality(metric);
        if (issues.length > 0) {
          qualityIssues.push(...issues);

          // Update metric quality
          metric.quality = this.updateQualityScore(metric.quality, issues);
          this.metrics.set(metric.id, metric);
        }
      }

      if (qualityIssues.length > 0) {
        this.emitEvent('quality_validated', {
          issuesCount: qualityIssues.length,
          timestamp: new Date()
        });
      }

    } catch (error) {
      console.error('[DURATION_TRACKER] Error during validation:', error);
      this.emitEvent('error_occurred', {
        error: error instanceof Error ? error.message : String(error),
        component: 'duration_tracker',
        operation: 'validation'
      });
    }
  }

  /**
   * Perform aggregation cycle
   */
  private async performAggregation(): Promise<void> {
    try {
      console.log('[DURATION_TRACKER] Performing aggregation');

      // Get recent metrics for aggregation
      const now = new Date();
      const timeRanges = this.config.aggregation.defaultIntervals.map(preset =>
        this.getTimeRangeFromPreset(preset, now)
      );

      for (const timeRange of timeRanges) {
        for (const aggregationType of this.config.aggregation.defaultTypes) {
          // Group metrics by name for aggregation
          const metricsByName = new Map<string, DurationMetric[]>();

          this.getMetrics({ timeRange }).forEach(metric => {
            if (!metricsByName.has(metric.name)) {
              metricsByName.set(metric.name, []);
            }
            metricsByName.get(metric.name)!.push(metric);
          });

          // Create aggregations for each metric name
          for (const [metricName, metrics] of metricsByName) {
            if (metrics.length > 0) {
              await this.createAggregation(
                metrics[0].id, // Use first metric's ID as representative
                timeRange,
                aggregationType,
                this.config.aggregation.defaultDimensions.map(d => d.name)
              );
            }
          }
        }
      }

    } catch (error) {
      console.error('[DURATION_TRACKER] Error during aggregation:', error);
      this.emitEvent('error_occurred', {
        error: error instanceof Error ? error.message : String(error),
        component: 'duration_tracker',
        operation: 'aggregation'
      });
    }
  }

  /**
   * Validate a single metric
   */
  private validateMetric(metric: DurationMetric): void {
    const errors: string[] = [];

    // Basic validation
    if (!metric.name || metric.name.trim() === '') {
      errors.push('Metric name is required');
    }

    if (metric.durationMs < 0) {
      errors.push('Duration cannot be negative');
    }

    if (metric.durationMs > 86400000) { // 24 hours in ms
      errors.push('Duration exceeds 24 hours, may be incorrect');
    }

    // Quality validation
    if (metric.quality.score < this.config.qualityThresholds.minQualityScore) {
      errors.push(`Quality score ${metric.quality.score} below threshold ${this.config.qualityThresholds.minQualityScore}`);
    }

    if (errors.length > 0) {
      throw new DurationTrackingError(
        'VALIDATION_FAILED',
        `Metric validation failed: ${errors.join(', ')}`,
        { metricId: metric.id, errors }
      );
    }
  }

  /**
   * Validate metric quality
   */
  private validateMetricQuality(metric: DurationMetric): DurationQualityIssue[] {
    const issues: DurationQualityIssue[] = [];

    // Check for negative duration
    if (metric.durationMs < 0) {
      issues.push({
        id: this.generateId('issue'),
        type: 'negative_duration',
        severity: 'critical',
        description: 'Duration is negative',
        detectedAt: new Date()
      });
    }

    // Check for extreme outliers
    const similarMetrics = this.getMetrics({
      category: metric.category,
      timeRange: {
        start: new Date(metric.timestamp.getTime() - 3600000), // 1 hour ago
        end: new Date(metric.timestamp.getTime() + 3600000)   // 1 hour later
      }
    });

    if (similarMetrics.length > 5) {
      const durations = similarMetrics.map(m => m.durationMs);
      const mean = durations.reduce((a, b) => a + b, 0) / durations.length;
      const stdDev = Math.sqrt(durations.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / durations.length);

      if (Math.abs(metric.durationMs - mean) > this.config.qualityThresholds.maxOutlierDeviation * stdDev) {
        issues.push({
          id: this.generateId('issue'),
          type: 'extreme_outlier',
          severity: 'medium',
          description: `Duration ${metric.durationMs}ms is ${Math.abs(metric.durationMs - mean) / stdDev} standard deviations from mean`,
          detectedAt: new Date()
        });
      }
    }

    // Check for missing context
    if (!metric.metadata.component || metric.metadata.component === 'unknown') {
      issues.push({
        id: this.generateId('issue'),
        type: 'missing_context',
        severity: 'low',
        description: 'Component information is missing',
        detectedAt: new Date()
      });
    }

    return issues;
  }

  /**
   * Check for immediate alerts
   */
  private checkImmediateAlerts(metric: DurationMetric): void {
    for (const rule of this.config.alerting.defaultRules) {
      if (!rule.enabled) continue;

      for (const condition of rule.conditions) {
        if (this.evaluateAlertCondition(metric, condition)) {
          this.createAlert(rule, metric, condition);
          break; // Only create one alert per rule per metric
        }
      }
    }
  }

  /**
   * Evaluate alert condition
   */
  private evaluateAlertCondition(metric: DurationMetric, condition: any): boolean {
    // Simple evaluation for common operators
    switch (condition.operator) {
      case 'gt':
        return metric.durationMs > condition.threshold;
      case 'lt':
        return metric.durationMs < condition.threshold;
      case 'gte':
        return metric.durationMs >= condition.threshold;
      case 'lte':
        return metric.durationMs <= condition.threshold;
      default:
        return false;
    }
  }

  /**
   * Create alert
   */
  private createAlert(rule: DurationAlertRule, metric: DurationMetric, condition: any): void {
    const alert: DurationAlert = {
      id: this.generateId('alert'),
      ruleId: rule.id,
      metricId: metric.id,
      type: 'threshold_breach',
      severity: rule.actions.find(a => a.type === 'notify') ? 'warning' : 'error',
      status: 'active',
      title: `Duration threshold breach for ${metric.name}`,
      message: `${metric.name} duration ${metric.durationMs}ms ${condition.operator} threshold ${condition.threshold}ms`,
      triggeredAt: new Date(),
      context: {
        currentValue: metric.durationMs,
        threshold: condition.threshold,
        timeWindow: { start: metric.timestamp, end: metric.timestamp },
        affectedComponents: [metric.metadata.component],
        businessImpact: 'Performance degradation detected',
        recommendedActions: rule.actions.map(a => a.description)
      },
      actions: rule.actions,
      escalationLevel: 0
    };

    this.alerts.set(alert.id, alert);
    this.emitEvent('alert_triggered', { alertId: alert.id, ruleId: rule.id });
  }

  /**
   * Calculate aggregation results
   */
  private calculateAggregationResults(
    metrics: DurationMetric[],
    aggregationType: DurationAggregationType,
    dimensions: string[]
  ): any[] {
    const durations = metrics.map(m => m.durationMs);

    switch (aggregationType) {
      case 'sum':
        return [{
          dimension: {},
          value: durations.reduce((a, b) => a + b, 0),
          count: durations.length,
          confidence: 0.95
        }];

      case 'average':
        return [{
          dimension: {},
          value: durations.reduce((a, b) => a + b, 0) / durations.length,
          count: durations.length,
          confidence: 0.95
        }];

      case 'min':
        return [{
          dimension: {},
          value: Math.min(...durations),
          count: durations.length,
          confidence: 0.95
        }];

      case 'max':
        return [{
          dimension: {},
          value: Math.max(...durations),
          count: durations.length,
          confidence: 0.95
        }];

      case 'median':
        const sorted = [...durations].sort((a, b) => a - b);
        const median = sorted.length % 2 === 0
          ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
          : sorted[Math.floor(sorted.length / 2)];
        return [{
          dimension: {},
          value: median,
          count: durations.length,
          confidence: 0.95
        }];

      default:
        return [{
          dimension: {},
          value: 0,
          count: 0,
          confidence: 0
        }];
    }
  }

  /**
   * Helper methods
   */
  private createDefaultConfig(config?: Partial<DurationTrackingConfig>): DurationTrackingConfig {
    return {
      enabled: true,
      environment: 'development',
      collectionInterval: 60, // 1 minute
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
        defaultIntervals: ['last_hour', 'last_day', 'last_week'],
        defaultTypes: ['average', 'min', 'max', 'median'],
        defaultDimensions: [],
        maxAggregationAge: 90
      },
      validation: {
        enabled: true,
        validationInterval: 15, // 15 minutes
        autoCorrection: false,
        correctionRules: [],
        dataQualityChecks: []
      },
      integration: {
        systems: [],
        exportFormats: [],
        importFormats: [],
        syncInterval: 60
      },
      ...config
    };
  }

  private inferCategory(name: string, metadata: any): DurationMetric['category'] {
    const lowerName = name.toLowerCase();

    if (lowerName.includes('execution') || lowerName.includes('process')) return 'execution';
    if (lowerName.includes('workflow') || lowerName.includes('stage')) return 'workflow';
    if (lowerName.includes('api') || lowerName.includes('request')) return 'api';
    if (lowerName.includes('database') || lowerName.includes('query')) return 'database';
    if (lowerName.includes('network') || lowerName.includes('connection')) return 'network';
    if (lowerName.includes('io') || lowerName.includes('file')) return 'io';

    return 'processing';
  }

  private inferType(name: string, context: any): DurationMetric['type'] {
    const lowerName = name.toLowerCase();

    if (lowerName.includes('latency') || lowerName.includes('response')) return 'response_time';
    if (lowerName.includes('wait') || lowerName.includes('queue')) return 'wait_time';
    if (lowerName.includes('cycle')) return 'cycle_time';
    if (lowerName.includes('lead')) return 'lead_time';

    return 'duration';
  }

  private inferSource(metadata: any): DurationMetric['source'] {
    if (metadata.component?.includes('execution')) return 'execution_tracker';
    if (metadata.component?.includes('workflow')) return 'lean_workflow';
    if (metadata.component?.includes('wsjf')) return 'wsjf_calculator';
    if (metadata.component?.includes('economic')) return 'economic_tracker';
    if (metadata.component?.includes('monitoring')) return 'monitoring_system';

    return 'automated';
  }

  private assessInitialQuality(durationMs: number, metadata: any): DurationQuality {
    let score = 100;
    const issues: DurationQualityIssue[] = [];

    if (durationMs < 0) {
      score -= 50;
      issues.push({
        id: this.generateId('issue'),
        type: 'negative_duration',
        severity: 'critical',
        description: 'Duration is negative',
        detectedAt: new Date()
      });
    }

    if (durationMs > 86400000) { // 24 hours
      score -= 20;
      issues.push({
        id: this.generateId('issue'),
        type: 'extreme_outlier',
        severity: 'medium',
        description: 'Duration exceeds 24 hours',
        detectedAt: new Date()
      });
    }

    return {
      score: Math.max(0, score),
      completeness: metadata.component ? 100 : 80,
      accuracy: 95,
      consistency: 90,
      validity: score >= 70 ? 'valid' : 'suspect',
      issues,
      lastValidated: new Date()
    };
  }

  private extractTags(name: string, metadata: any): string[] {
    const tags: string[] = [];

    // Extract tags from name
    const nameParts = name.toLowerCase().split('_');
    tags.push(...nameParts.filter(part => part.length > 2));

    // Extract tags from metadata
    if (metadata.circle) tags.push(metadata.circle);
    if (metadata.domain) tags.push(metadata.domain);
    if (metadata.environment) tags.push(metadata.environment);

    return [...new Set(tags)];
  }

  private shouldIncludeInAggregation(metric: DurationMetric, metricId: string): boolean {
    // Include if it's the target metric or if no specific metric was requested
    return metricId === 'all' || metric.name === metricId;
  }

  private calculateCompleteness(metrics: DurationMetric[], timeRange: TimeRange): number {
    // Simple completeness calculation based on expected data points
    const expectedPoints = (timeRange.end.getTime() - timeRange.start.getTime()) / (this.config.collectionInterval * 1000);
    return Math.min(100, (metrics.length / expectedPoints) * 100);
  }

  private calculateConfidence(metrics: DurationMetric[]): number {
    // Simple confidence based on sample size
    if (metrics.length < 10) return 0.5;
    if (metrics.length < 50) return 0.8;
    return 0.95;
  }

  private updateQualityScore(current: DurationQuality, issues: DurationQualityIssue[]): DurationQuality {
    let newScore = current.score;

    for (const issue of issues) {
      switch (issue.severity) {
        case 'critical': newScore -= 30; break;
        case 'high': newScore -= 20; break;
        case 'medium': newScore -= 10; break;
        case 'low': newScore -= 5; break;
      }
    }

    return {
      ...current,
      score: Math.max(0, newScore),
      validity: newScore >= this.config.qualityThresholds.minQualityScore ? 'valid' : 'invalid',
      issues: [...current.issues, ...issues],
      lastValidated: new Date()
    };
  }

  private cleanupOldMetrics(): void {
    const cutoffDate = new Date(Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000);

    for (const [id, metric] of this.metrics.entries()) {
      if (metric.timestamp < cutoffDate) {
        this.metrics.delete(id);
      }
    }

    // Also cleanup old aggregations
    for (const [id, aggregation] of this.aggregations.entries()) {
      if (aggregation.createdAt < cutoffDate) {
        this.aggregations.delete(id);
      }
    }
  }

  private getTimeRangeFromPreset(preset: string, now: Date): TimeRange {
    const presets: Record<string, () => TimeRange> = {
      'last_minute': () => ({ start: new Date(now.getTime() - 60000), end: now }),
      'last_5_minutes': () => ({ start: new Date(now.getTime() - 300000), end: now }),
      'last_15_minutes': () => ({ start: new Date(now.getTime() - 900000), end: now }),
      'last_hour': () => ({ start: new Date(now.getTime() - 3600000), end: now }),
      'last_6_hours': () => ({ start: new Date(now.getTime() - 21600000), end: now }),
      'last_12_hours': () => ({ start: new Date(now.getTime() - 43200000), end: now }),
      'last_day': () => ({ start: new Date(now.getTime() - 86400000), end: now }),
      'last_week': () => ({ start: new Date(now.getTime() - 604800000), end: now }),
      'last_month': () => ({ start: new Date(now.getTime() - 2592000000), end: now }),
      'last_quarter': () => ({ start: new Date(now.getTime() - 7776000000), end: now }),
      'last_year': () => ({ start: new Date(now.getTime() - 31536000000), end: now })
    };

    return presets[preset]?.() || { start: new Date(0), end: now };
  }

  private setupEventHandlers(): void {
    // Set up any additional event handlers here
  }

  private emitEvent(type: DurationEventType, data: any): void {
    this.emit(type, {
      id: this.generateId('event'),
      type,
      timestamp: new Date(),
      source: 'duration_tracker',
      data
    });
  }

  private generateId(type: string): string {
    return `${type}-${uuidv4()}`;
  }
}
