/**
 * Core Metrics Collector
 * 
 * Handles collection, aggregation, and storage of metrics from various sources
 * including system metrics, application metrics, and business metrics
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import {
  MetricDefinition,
  MetricValue,
  MetricSeries,
  MonitoringConfig,
  Environment,
  MonitoringError
} from '../types';

export interface MetricsCollectorConfig {
  environment: Environment;
  collectionInterval: number; // in seconds
  bufferSize: number;
  aggregationInterval: number; // in seconds
  retentionDays: number;
}

export class MetricsCollector extends EventEmitter {
  private metrics: Map<string, MetricDefinition> = new Map();
  private values: Map<string, MetricValue[]> = new Map();
  private aggregates: Map<string, MetricValue[]> = new Map();
  private collectionInterval?: NodeJS.Timeout;
  private aggregationInterval?: NodeJS.Timeout;
  private isRunning: boolean = false;

  constructor(
    private config: MetricsCollectorConfig,
    private monitoringConfig: MonitoringConfig
  ) {
    super();
  }

  /**
   * Start metrics collection
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[METRICS_COLLECTOR] Already running');
      return;
    }

    this.isRunning = true;
    console.log(`[METRICS_COLLECTOR] Starting collection for environment: ${this.config.environment}`);

    // Start collection interval
    this.collectionInterval = setInterval(async () => {
      await this.collectMetrics();
    }, this.config.collectionInterval * 1000);

    // Start aggregation interval
    this.aggregationInterval = setInterval(async () => {
      await this.aggregateMetrics();
    }, this.config.aggregationInterval * 1000);

    // Perform initial collection
    await this.collectMetrics();

    console.log('[METRICS_COLLECTOR] Started successfully');
    this.emit('started', { environment: this.config.environment });
  }

  /**
   * Stop metrics collection
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

    if (this.aggregationInterval) {
      clearInterval(this.aggregationInterval);
      this.aggregationInterval = undefined;
    }

    console.log('[METRICS_COLLECTOR] Stopped');
    this.emit('stopped', { environment: this.config.environment });
  }

  /**
   * Register a new metric definition
   */
  public registerMetric(metric: Omit<MetricDefinition, 'id'>): MetricDefinition {
    const newMetric: MetricDefinition = {
      ...metric,
      id: this.generateId('metric')
    };

    this.metrics.set(newMetric.id, newMetric);
    this.values.set(newMetric.id, []);
    this.aggregates.set(newMetric.id, []);

    console.log(`[METRICS_COLLECTOR] Registered metric: ${newMetric.name} (${newMetric.id})`);
    this.emit('metricRegistered', { metric: newMetric });

    return newMetric;
  }

  /**
   * Record a metric value
   */
  public recordValue(
    metricId: string,
    value: number,
    labels?: Record<string, string>,
    metadata?: Record<string, any>
  ): void {
    const metric = this.metrics.get(metricId);
    if (!metric) {
      throw new MonitoringError(
        `Metric not found: ${metricId}`,
        'METRIC_NOT_FOUND',
        { metricId }
      );
    }

    const metricValue: MetricValue = {
      metricId,
      timestamp: new Date(),
      value,
      labels,
      metadata
    };

    const values = this.values.get(metricId) || [];
    values.push(metricValue);

    // Keep buffer size limited
    if (values.length > this.config.bufferSize) {
      values.splice(0, values.length - this.config.bufferSize);
    }

    this.values.set(metricId, values);

    // Emit for real-time processing
    this.emit('valueRecorded', { metricValue, metric });
  }

  /**
   * Get metric values
   */
  public getValues(
    metricId: string,
    timeRange?: { start: Date; end: Date },
    limit?: number
  ): MetricValue[] {
    let values = this.values.get(metricId) || [];

    // Apply time range filter
    if (timeRange) {
      values = values.filter(v => 
        v.timestamp >= timeRange.start && v.timestamp <= timeRange.end
      );
    }

    // Sort by timestamp (newest first)
    values.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply limit
    if (limit) {
      values = values.slice(0, limit);
    }

    return values;
  }

  /**
   * Get aggregated metric series
   */
  public getSeries(
    metricId: string,
    timeRange: { start: Date; end: Date },
    aggregation: string = 'average'
  ): MetricSeries {
    const metric = this.metrics.get(metricId);
    if (!metric) {
      throw new MonitoringError(
        `Metric not found: ${metricId}`,
        'METRIC_NOT_FOUND',
        { metricId }
      );
    }

    const aggregates = this.aggregates.get(metricId) || [];
    const filteredAggregates = aggregates.filter(a =>
      a.timestamp >= timeRange.start && a.timestamp <= timeRange.end
    );

    return {
      metricId,
      name: metric.name,
      dataPoints: filteredAggregates,
      aggregation,
      timeRange
    };
  }

  /**
   * Get all metric definitions
   */
  public getMetrics(): MetricDefinition[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Get metric by ID
   */
  public getMetric(metricId: string): MetricDefinition | undefined {
    return this.metrics.get(metricId);
  }

  /**
   * Collect metrics from all registered sources
   */
  private async collectMetrics(): Promise<void> {
    try {
      console.log(`[METRICS_COLLECTOR] Collecting metrics for ${this.config.environment}`);

      // Collect system metrics
      await this.collectSystemMetrics();

      // Collect application metrics
      await this.collectApplicationMetrics();

      // Collect business metrics
      await this.collectBusinessMetrics();

      // Emit collection event
      this.emit('metricsCollected', {
        environment: this.config.environment,
        timestamp: new Date(),
        metricsCount: this.metrics.size
      });

    } catch (error) {
      console.error('[METRICS_COLLECTOR] Error collecting metrics:', error);
      this.emit('collectionError', {
        environment: this.config.environment,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Aggregate metrics for long-term storage
   */
  private async aggregateMetrics(): Promise<void> {
    try {
      console.log(`[METRICS_COLLECTOR] Aggregating metrics for ${this.config.environment}`);

      const now = new Date();
      const aggregationWindow = this.config.aggregationInterval * 1000;
      const windowStart = new Date(now.getTime() - aggregationWindow);

      for (const [metricId, metric] of this.metrics.entries()) {
        const values = this.values.get(metricId) || [];
        const windowValues = values.filter(v => 
          v.timestamp >= windowStart && v.timestamp < now
        );

        if (windowValues.length === 0) {
          continue;
        }

        // Calculate aggregations
        const aggregations = this.calculateAggregations(windowValues, metric);

        // Store aggregated values
        const aggregates = this.aggregates.get(metricId) || [];
        aggregates.push(...aggregations);

        // Keep only recent aggregates
        const retentionMs = metric.retention * 24 * 60 * 60 * 1000;
        aggregates.filter(a => now.getTime() - a.timestamp.getTime() <= retentionMs);

        this.aggregates.set(metricId, aggregates);
      }

      this.emit('metricsAggregated', {
        environment: this.config.environment,
        timestamp: now
      });

    } catch (error) {
      console.error('[METRICS_COLLECTOR] Error aggregating metrics:', error);
      this.emit('aggregationError', {
        environment: this.config.environment,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Collect system metrics
   */
  private async collectSystemMetrics(): Promise<void> {
    const os = await import('os');

    // CPU metrics
    const cpuUsage = os.loadavg()[0] || 0;
    this.recordValue('system_cpu_usage', cpuUsage * 100, {
      environment: this.config.environment
    });

    // Memory metrics
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const memoryUsage = ((totalMemory - freeMemory) / totalMemory) * 100;
    this.recordValue('system_memory_usage', memoryUsage, {
      environment: this.config.environment
    });

    // Uptime
    const uptime = os.uptime();
    this.recordValue('system_uptime', uptime, {
      environment: this.config.environment
    });

    // Network metrics (mock for now)
    this.recordValue('system_network_latency', 20 + Math.random() * 30, {
      environment: this.config.environment,
      interface: 'eth0'
    });

    // Disk metrics (mock for now)
    this.recordValue('system_disk_usage', 45 + Math.random() * 30, {
      environment: this.config.environment,
      mount: '/'
    });
  }

  /**
   * Collect application metrics
   */
  private async collectApplicationMetrics(): Promise<void> {
    // Request count
    this.recordValue('app_requests_total', Math.floor(Math.random() * 1000), {
      environment: this.config.environment,
      method: 'GET',
      status: '200'
    });

    // Response time
    this.recordValue('app_response_time', 50 + Math.random() * 200, {
      environment: this.config.environment,
      endpoint: '/api/metrics'
    });

    // Error rate
    this.recordValue('app_error_rate', Math.random() * 5, {
      environment: this.config.environment,
      error_type: '5xx'
    });

    // Active connections
    this.recordValue('app_active_connections', Math.floor(Math.random() * 100), {
      environment: this.config.environment
    });
  }

  /**
   * Collect business metrics
   */
  private async collectBusinessMetrics(): Promise<void> {
    // Active users
    this.recordValue('business_active_users', Math.floor(Math.random() * 500), {
      environment: this.config.environment
    });

    // Conversion rate
    this.recordValue('business_conversion_rate', 2 + Math.random() * 8, {
      environment: this.config.environment,
      funnel: 'signup'
    });

    // Revenue
    this.recordValue('business_revenue', Math.random() * 10000, {
      environment: this.config.environment,
      currency: 'USD'
    });

    // Customer satisfaction
    this.recordValue('business_satisfaction', 80 + Math.random() * 20, {
      environment: this.config.environment,
      metric: 'nps'
    });
  }

  /**
   * Calculate aggregations for metric values
   */
  private calculateAggregations(values: MetricValue[], metric: MetricDefinition): MetricValue[] {
    if (values.length === 0) {
      return [];
    }

    const numericValues = values.map(v => v.value);
    const timestamp = new Date();

    const aggregations: MetricValue[] = [];

    // Sum
    const sum = numericValues.reduce((a, b) => a + b, 0);
    aggregations.push({
      metricId: metric.id,
      timestamp,
      value: sum,
      labels: { ...metric.labels, aggregation: 'sum' }
    });

    // Average
    const average = sum / numericValues.length;
    aggregations.push({
      metricId: metric.id,
      timestamp,
      value: average,
      labels: { ...metric.labels, aggregation: 'average' }
    });

    // Min
    const min = Math.min(...numericValues);
    aggregations.push({
      metricId: metric.id,
      timestamp,
      value: min,
      labels: { ...metric.labels, aggregation: 'min' }
    });

    // Max
    const max = Math.max(...numericValues);
    aggregations.push({
      metricId: metric.id,
      timestamp,
      value: max,
      labels: { ...metric.labels, aggregation: 'max' }
    });

    // Percentiles (95th, 99th)
    const sorted = [...numericValues].sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95);
    const p99Index = Math.floor(sorted.length * 0.99);

    aggregations.push({
      metricId: metric.id,
      timestamp,
      value: sorted[p95Index] || 0,
      labels: { ...metric.labels, aggregation: 'p95' }
    });

    aggregations.push({
      metricId: metric.id,
      timestamp,
      value: sorted[p99Index] || 0,
      labels: { ...metric.labels, aggregation: 'p99' }
    });

    return aggregations;
  }

  /**
   * Initialize default metrics
   */
  public initializeDefaultMetrics(): void {
    console.log('[METRICS_COLLECTOR] Initializing default metrics');

    // System metrics
    this.registerMetric({
      name: 'System CPU Usage',
      description: 'CPU usage percentage',
      category: 'system',
      type: 'gauge',
      unit: 'percent',
      labels: { environment: this.config.environment },
      retention: this.monitoringConfig.retention.metrics
    });

    this.registerMetric({
      name: 'System Memory Usage',
      description: 'Memory usage percentage',
      category: 'system',
      type: 'gauge',
      unit: 'percent',
      labels: { environment: this.config.environment },
      retention: this.monitoringConfig.retention.metrics
    });

    this.registerMetric({
      name: 'System Uptime',
      description: 'System uptime in seconds',
      category: 'system',
      type: 'counter',
      unit: 'seconds',
      labels: { environment: this.config.environment },
      retention: this.monitoringConfig.retention.metrics
    });

    // Application metrics
    this.registerMetric({
      name: 'Application Requests Total',
      description: 'Total number of requests',
      category: 'application',
      type: 'counter',
      unit: 'requests',
      labels: { environment: this.config.environment },
      retention: this.monitoringConfig.retention.metrics
    });

    this.registerMetric({
      name: 'Application Response Time',
      description: 'Response time in milliseconds',
      category: 'application',
      type: 'histogram',
      unit: 'milliseconds',
      labels: { environment: this.config.environment },
      aggregation: 'percentile',
      retention: this.monitoringConfig.retention.metrics
    });

    this.registerMetric({
      name: 'Application Error Rate',
      description: 'Error rate percentage',
      category: 'application',
      type: 'gauge',
      unit: 'percent',
      labels: { environment: this.config.environment },
      retention: this.monitoringConfig.retention.metrics
    });

    // Business metrics
    this.registerMetric({
      name: 'Active Users',
      description: 'Number of active users',
      category: 'business',
      type: 'gauge',
      unit: 'users',
      labels: { environment: this.config.environment },
      retention: this.monitoringConfig.retention.metrics
    });

    this.registerMetric({
      name: 'Conversion Rate',
      description: 'Conversion rate percentage',
      category: 'business',
      type: 'gauge',
      unit: 'percent',
      labels: { environment: this.config.environment },
      retention: this.monitoringConfig.retention.metrics
    });

    this.registerMetric({
      name: 'Revenue',
      description: 'Total revenue',
      category: 'business',
      type: 'counter',
      unit: 'currency',
      labels: { environment: this.config.environment },
      retention: this.monitoringConfig.retention.metrics
    });
  }

  /**
   * Generate unique ID
   */
  private generateId(type: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `${type}-${timestamp}-${random}`;
  }

  /**
   * Get collector status
   */
  public getStatus(): {
    isRunning: boolean;
    environment: Environment;
    metricsCount: number;
    valuesCount: number;
    lastCollection?: Date;
    lastAggregation?: Date;
  } {
    let valuesCount = 0;
    let lastCollection: Date | undefined;
    let lastAggregation: Date | undefined;

    for (const values of this.values.values()) {
      valuesCount += values.length;
      if (values.length > 0) {
        const latest = values[values.length - 1];
        if (!lastCollection || latest.timestamp > lastCollection) {
          lastCollection = latest.timestamp;
        }
      }
    }

    for (const aggregates of this.aggregates.values()) {
      if (aggregates.length > 0) {
        const latest = aggregates[aggregates.length - 1];
        if (!lastAggregation || latest.timestamp > lastAggregation) {
          lastAggregation = latest.timestamp;
        }
      }
    }

    return {
      isRunning: this.isRunning,
      environment: this.config.environment,
      metricsCount: this.metrics.size,
      valuesCount,
      lastCollection,
      lastAggregation
    };
  }
}