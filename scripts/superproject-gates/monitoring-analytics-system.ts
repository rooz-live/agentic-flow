/**
 * Monitoring Analytics System with Real-time Data Processing
 * 
 * Implements comprehensive analytics engine with real-time data collection,
 * processing, aggregation, and advanced analytics capabilities
 */

import { EventEmitter } from 'events';
import {
  Metric,
  MetricDefinition,
  AnalyticsQuery,
  AnalyticsResult,
  AnalyticsDataPoint,
  AnalyticsAggregation,
  TimeRange,
  MonitoringEvent,
  EventType,
  ApiResponse,
  PaginatedResponse
} from './types';

export interface MonitoringAnalyticsConfig {
  collectionInterval: number; // seconds
  batchSize: number;
  compression: boolean;
  storageBackend: 'memory' | 'file' | 'database';
  retentionPolicies: Array<{
    pattern: string;
    duration: number; // days
    aggregation?: string;
  }>;
  maxConcurrentQueries: number;
  queryTimeout: number; // seconds
  cacheEnabled: boolean;
  cacheTimeout: number; // seconds
}

export class MonitoringAnalyticsSystem extends EventEmitter {
  private metrics: Map<string, Metric[]> = new Map();
  private metricDefinitions: Map<string, MetricDefinition> = new Map();
  private queries: Map<string, AnalyticsQuery> = new Map();
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  
  private isRunning: boolean = false;
  private collectionInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  private config: MonitoringAnalyticsConfig;
  private queryCounter: number = 0;

  constructor(config: Partial<MonitoringAnalyticsConfig> = {}) {
    super();
    
    this.config = {
      collectionInterval: 10, // 10 seconds
      batchSize: 1000,
      compression: true,
      storageBackend: 'memory',
      retentionPolicies: [
        { pattern: '*', duration: 7 }, // Default 7 days
        { pattern: 'system.*', duration: 30, aggregation: '1h' },
        { pattern: 'business.*', duration: 90, aggregation: '1d' }
      ],
      maxConcurrentQueries: 10,
      queryTimeout: 30, // 30 seconds
      cacheEnabled: true,
      cacheTimeout: 300, // 5 minutes
      ...config
    };

    this.initializeMetricDefinitions();
  }

  private initializeMetricDefinitions(): void {
    // System metrics
    this.createMetricDefinition({
      name: 'system.cpu.usage',
      description: 'System CPU usage percentage',
      unit: 'percent',
      type: 'gauge',
      tags: ['host', 'region', 'environment'],
      aggregation: 'average',
      retention: 30
    });

    this.createMetricDefinition({
      name: 'system.memory.usage',
      description: 'System memory usage percentage',
      unit: 'percent',
      type: 'gauge',
      tags: ['host', 'region', 'environment'],
      aggregation: 'average',
      retention: 30
    });

    this.createMetricDefinition({
      name: 'system.disk.usage',
      description: 'System disk usage percentage',
      unit: 'percent',
      type: 'gauge',
      tags: ['host', 'device', 'environment'],
      aggregation: 'average',
      retention: 30
    });

    this.createMetricDefinition({
      name: 'system.network.latency',
      description: 'Network latency in milliseconds',
      unit: 'ms',
      type: 'timer',
      tags: ['host', 'target', 'environment'],
      aggregation: 'average',
      retention: 7
    });

    // Application metrics
    this.createMetricDefinition({
      name: 'app.requests.total',
      description: 'Total number of HTTP requests',
      unit: 'count',
      type: 'counter',
      tags: ['service', 'method', 'status', 'environment'],
      aggregation: 'sum',
      retention: 90
    });

    this.createMetricDefinition({
      name: 'app.response.time',
      description: 'Application response time in milliseconds',
      unit: 'ms',
      type: 'timer',
      tags: ['service', 'endpoint', 'environment'],
      aggregation: 'average',
      retention: 30
    });

    this.createMetricDefinition({
      name: 'app.errors.total',
      description: 'Total number of application errors',
      unit: 'count',
      type: 'counter',
      tags: ['service', 'error_type', 'environment'],
      aggregation: 'sum',
      retention: 90
    });

    // Business metrics
    this.createMetricDefinition({
      name: 'business.revenue',
      description: 'Revenue generated',
      unit: 'currency',
      type: 'counter',
      tags: ['product', 'region', 'customer_segment'],
      aggregation: 'sum',
      retention: 365
    });

    this.createMetricDefinition({
      name: 'business.orders',
      description: 'Number of orders placed',
      unit: 'count',
      type: 'counter',
      tags: ['product', 'region', 'customer_type'],
      aggregation: 'sum',
      retention: 365
    });

    this.createMetricDefinition({
      name: 'business.users.active',
      description: 'Number of active users',
      unit: 'count',
      type: 'gauge',
      tags: ['segment', 'region'],
      aggregation: 'average',
      retention: 90
    });
  }

  public async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[ANALYTICS] Monitoring analytics system already running');
      return;
    }

    this.isRunning = true;
    console.log('[ANALYTICS] Starting monitoring analytics system');

    // Start metrics collection
    this.collectionInterval = setInterval(() => {
      this.collectMetrics();
    }, this.config.collectionInterval * 1000);

    // Start cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldData();
    }, 60 * 60 * 1000); // Every hour

    // Perform initial collection
    await this.collectMetrics();

    console.log('[ANALYTICS] Monitoring analytics system started');
  }

  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    console.log('[ANALYTICS] Monitoring analytics system stopped');
  }

  // Metric Management
  public createMetricDefinition(definition: Omit<MetricDefinition, 'id'>): MetricDefinition {
    const id = definition.name.replace(/\./g, '_');
    const newDefinition: MetricDefinition = { ...definition, id };
    this.metricDefinitions.set(id, newDefinition);
    return newDefinition;
  }

  public getMetricDefinition(id: string): MetricDefinition | undefined {
    return this.metricDefinitions.get(id);
  }

  public getAllMetricDefinitions(): MetricDefinition[] {
    return Array.from(this.metricDefinitions.values());
  }

  public addMetrics(metrics: Metric[]): void {
    for (const metric of metrics) {
      const metricList = this.metrics.get(metric.id) || [];
      metricList.push(metric);
      
      // Apply retention policy
      const definition = this.metricDefinitions.get(metric.id);
      if (definition) {
        const cutoffTime = new Date(Date.now() - definition.retention * 24 * 60 * 60 * 1000);
        const filteredMetrics = metricList.filter(m => m.timestamp >= cutoffTime);
        this.metrics.set(metric.id, filteredMetrics);
      } else {
        // Default retention of 7 days
        const cutoffTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const filteredMetrics = metricList.filter(m => m.timestamp >= cutoffTime);
        this.metrics.set(metric.id, filteredMetrics);
      }
    }

    this.emit('metricsAdded', metrics);
  }

  public getMetrics(
    metricId: string,
    timeRange?: TimeRange,
    tags?: Record<string, string>
  ): Metric[] {
    let metrics = this.metrics.get(metricId) || [];

    // Apply time range filter
    if (timeRange) {
      metrics = metrics.filter(m => 
        m.timestamp >= timeRange.from && m.timestamp <= timeRange.to
      );
    }

    // Apply tag filters
    if (tags) {
      metrics = metrics.filter(m => {
        for (const [key, value] of Object.entries(tags)) {
          if (m.tags[key] !== value) {
            return false;
          }
        }
        return true;
      });
    }

    return metrics.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  // Query Management
  public createQuery(query: Omit<AnalyticsQuery, 'id'>): AnalyticsQuery {
    const id = this.generateId('query');
    const newQuery: AnalyticsQuery = { ...query, id };
    this.queries.set(id, newQuery);
    return newQuery;
  }

  public getQuery(id: string): AnalyticsQuery | undefined {
    return this.queries.get(id);
  }

  public getAllQueries(): AnalyticsQuery[] {
    return Array.from(this.queries.values());
  }

  public async executeQuery(queryId: string): Promise<AnalyticsResult> {
    const query = this.queries.get(queryId);
    if (!query) {
      throw new Error(`Query not found: ${queryId}`);
    }

    // Check cache first
    if (this.config.cacheEnabled) {
      const cacheKey = this.generateCacheKey(query);
      const cached = this.cache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < this.config.cacheTimeout * 1000) {
        return cached.data;
      }
    }

    const startTime = Date.now();
    
    try {
      const result = await this.performQuery(query);
      const executionTime = Date.now() - startTime;

      const analyticsResult: AnalyticsResult = {
        queryId,
        data: result.data,
        metadata: {
          totalRows: result.data.length,
          executionTime,
          cached: false
        },
        timeRange: query.timeRange
      };

      // Cache result
      if (this.config.cacheEnabled) {
        const cacheKey = this.generateCacheKey(query);
        this.cache.set(cacheKey, {
          data: analyticsResult,
          timestamp: Date.now()
        });
      }

      this.emit('queryExecuted', { query, result: analyticsResult });
      return analyticsResult;
    } catch (error) {
      console.error(`[ANALYTICS] Query execution failed: ${queryId}`, error);
      throw error;
    }
  }

  private async performQuery(query: AnalyticsQuery): Promise<{ data: AnalyticsDataPoint[] }> {
    // Parse query and extract metric names
    const metricNames = this.extractMetricNames(query.query);
    const data: AnalyticsDataPoint[] = [];

    for (const metricName of metricNames) {
      const metricId = metricName.replace(/\./g, '_');
      const metrics = this.getMetrics(metricId, query.timeRange, query.filters);

      if (metrics.length === 0) {
        continue;
      }

      // Group metrics by timestamp and apply aggregations
      const groupedMetrics = this.groupMetricsByTime(metrics, query.groupBy);
      
      for (const [timestampKey, metricGroup] of Object.entries(groupedMetrics)) {
        const timestamp = new Date(parseInt(timestampKey));
        const dimensions: Record<string, string> = {};
        const metricsData: Record<string, number> = {};

        // Extract dimensions from tags
        if (query.groupBy && query.groupBy.length > 0) {
          for (const groupBy of query.groupBy) {
            dimensions[groupBy] = metricGroup[0].tags[groupBy] || 'unknown';
          }
        }

        // Apply aggregations
        if (query.aggregation) {
          metricsData[metricName] = this.applyAggregation(
            metricGroup.map(m => m.value),
            query.aggregation
          );
        } else {
          // Default to latest value
          metricsData[metricName] = metricGroup[metricGroup.length - 1].value;
        }

        data.push({
          timestamp,
          dimensions,
          metrics: metricsData
        });
      }
    }

    // Apply ordering
    if (query.orderBy && query.orderBy.length > 0) {
      const order = query.orderBy[0];
      data.sort((a, b) => {
        const aValue = a.metrics[order.field] || a.timestamp.getTime();
        const bValue = b.metrics[order.field] || b.timestamp.getTime();
        
        if (order.direction === 'asc') {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        } else {
          return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
        }
      });
    }

    // Apply limit
    if (query.limit) {
      data.splice(query.limit);
    }

    return { data };
  }

  private extractMetricNames(query: string): string[] {
    // Simple query parser - in production, this would be more sophisticated
    const metricPattern = /from\s+(\w+)/gi;
    const matches = query.match(metricPattern);
    return matches ? matches.map(m => m.replace(/from\s+/i, '')) : [];
  }

  private groupMetricsByTime(
    metrics: Metric[],
    groupBy?: string[]
  ): Record<string, Metric[]> {
    const grouped: Record<string, Metric[]> = {};

    for (const metric of metrics) {
      // Create grouping key
      const timeKey = metric.timestamp.getTime().toString();
      let groupKey = timeKey;

      if (groupBy && groupBy.length > 0) {
        const tagValues = groupBy.map(tag => metric.tags[tag] || 'unknown');
        groupKey = `${timeKey}:${tagValues.join(':')}`;
      }

      if (!grouped[groupKey]) {
        grouped[groupKey] = [];
      }
      grouped[groupKey].push(metric);
    }

    return grouped;
  }

  private applyAggregation(values: number[], aggregation: AnalyticsAggregation): number {
    if (values.length === 0) {
      return 0;
    }

    switch (aggregation.function) {
      case 'sum':
        return values.reduce((sum, val) => sum + val, 0);
      case 'avg':
        return values.reduce((sum, val) => sum + val, 0) / values.length;
      case 'min':
        return Math.min(...values);
      case 'max':
        return Math.max(...values);
      case 'count':
        return values.length;
      case 'percentile':
        if (aggregation.percentile) {
          const sorted = [...values].sort((a, b) => a - b);
          const index = Math.ceil((aggregation.percentile / 100) * sorted.length) - 1;
          return sorted[Math.max(0, index)];
        }
        return values[values.length - 1];
      default:
        return values[values.length - 1];
    }
  }

  // Real-time Analytics
  public async getRealTimeMetrics(metricIds: string[]): Promise<Record<string, Metric>> {
    const result: Record<string, Metric> = {};

    for (const metricId of metricIds) {
      const metrics = this.metrics.get(metricId) || [];
      if (metrics.length > 0) {
        result[metricId] = metrics[metrics.length - 1];
      }
    }

    return result;
  }

  public async getAggregatedMetrics(
    metricId: string,
    aggregation: string,
    timeRange: TimeRange
  ): Promise<Array<{ timestamp: Date; value: number }>> {
    const metrics = this.getMetrics(metricId, timeRange);
    const aggregationInterval = this.parseAggregationInterval(aggregation);
    const result: Array<{ timestamp: Date; value: number }> = [];

    let currentTime = new Date(timeRange.from);
    
    while (currentTime < timeRange.to) {
      const windowEnd = new Date(currentTime.getTime() + aggregationInterval);
      const windowMetrics = metrics.filter(m => 
        m.timestamp >= currentTime && m.timestamp < windowEnd
      );

      if (windowMetrics.length > 0) {
        const value = this.applyAggregation(
          windowMetrics.map(m => m.value),
          { function: 'avg' as const }
        );
        result.push({ timestamp: new Date(currentTime), value });
      }

      currentTime = windowEnd;
    }

    return result;
  }

  private parseAggregationInterval(aggregation: string): number {
    // Parse intervals like "1h", "5m", "30s"
    const match = aggregation.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 60 * 60 * 1000; // Default 1 hour
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return 60 * 60 * 1000;
    }
  }

  // Predictive Analytics
  public async generateForecast(
    metricId: string,
    timeRange: TimeRange,
    forecastHorizon: number // hours
  ): Promise<Array<{ timestamp: Date; value: number; confidence: number }>> {
    const metrics = this.getMetrics(metricId, timeRange);
    
    if (metrics.length < 10) {
      throw new Error('Insufficient data for forecasting');
    }

    // Simple linear regression for demonstration
    // In production, this would use more sophisticated algorithms
    const values = metrics.map(m => m.value);
    const timestamps = metrics.map(m => m.timestamp.getTime());
    
    const forecast = this.linearRegression(timestamps, values, forecastHorizon);
    
    return forecast.map(point => ({
      timestamp: new Date(point.timestamp),
      value: point.value,
      confidence: 0.8 // Mock confidence score
    }));
  }

  private linearRegression(
    x: number[],
    y: number[],
    forecastHorizon: number
  ): Array<{ timestamp: number; value: number }> {
    const n = x.length;
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const lastTimestamp = Math.max(...x);
    const interval = (x[1] - x[0]) || 3600000; // Default 1 hour
    const forecastPoints: Array<{ timestamp: number; value: number }> = [];

    for (let i = 1; i <= forecastHorizon; i++) {
      const futureTimestamp = lastTimestamp + (i * interval);
      const value = slope * futureTimestamp + intercept;
      forecastPoints.push({ timestamp: futureTimestamp, value });
    }

    return forecastPoints;
  }

  // Anomaly Detection
  public async detectAnomalies(
    metricId: string,
    timeRange: TimeRange,
    threshold: number = 2.0 // Standard deviations
  ): Promise<Array<{ timestamp: Date; value: number; anomalyScore: number }>> {
    const metrics = this.getMetrics(metricId, timeRange);
    const values = metrics.map(m => m.value);
    
    if (values.length < 30) {
      throw new Error('Insufficient data for anomaly detection');
    }

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    const anomalies: Array<{ timestamp: Date; value: number; anomalyScore: number }> = [];

    for (let i = 0; i < metrics.length; i++) {
      const metric = metrics[i];
      const zScore = Math.abs((metric.value - mean) / stdDev);
      
      if (zScore > threshold) {
        anomalies.push({
          timestamp: metric.timestamp,
          value: metric.value,
          anomalyScore: zScore
        });
      }
    }

    return anomalies;
  }

  // Data Management
  private async collectMetrics(): Promise<void> {
    try {
      // Simulate metrics collection
      const mockMetrics = this.generateMockMetrics();
      this.addMetrics(mockMetrics);
      
      this.emit('metricsCollected', mockMetrics);
    } catch (error) {
      console.error('[ANALYTICS] Metrics collection failed:', error);
    }
  }

  private generateMockMetrics(): Metric[] {
    const metrics: Metric[] = [];
    const now = new Date();

    // System metrics
    metrics.push({
      id: 'system_cpu_usage',
      name: 'system.cpu.usage',
      value: 20 + Math.random() * 60,
      unit: 'percent',
      timestamp: now,
      tags: { host: 'server-1', region: 'us-east', environment: 'production' },
      source: 'system-monitor',
      type: 'gauge'
    });

    metrics.push({
      id: 'system_memory_usage',
      name: 'system.memory.usage',
      value: 40 + Math.random() * 40,
      unit: 'percent',
      timestamp: now,
      tags: { host: 'server-1', region: 'us-east', environment: 'production' },
      source: 'system-monitor',
      type: 'gauge'
    });

    metrics.push({
      id: 'app_requests_total',
      name: 'app.requests.total',
      value: Math.floor(100 + Math.random() * 500),
      unit: 'count',
      timestamp: now,
      tags: { service: 'api', method: 'GET', status: '200', environment: 'production' },
      source: 'application',
      type: 'counter'
    });

    metrics.push({
      id: 'app_response_time',
      name: 'app.response.time',
      value: 50 + Math.random() * 200,
      unit: 'ms',
      timestamp: now,
      tags: { service: 'api', endpoint: '/api/users', environment: 'production' },
      source: 'application',
      type: 'timer'
    });

    return metrics;
  }

  private cleanupOldData(): void {
    const now = Date.now();
    
    for (const [metricId, metrics] of this.metrics.entries()) {
      const definition = this.metricDefinitions.get(metricId);
      const retentionMs = (definition?.retention || 7) * 24 * 60 * 60 * 1000;
      const cutoffTime = new Date(now - retentionMs);
      
      const filteredMetrics = metrics.filter(m => m.timestamp >= cutoffTime);
      this.metrics.set(metricId, filteredMetrics);
    }

    // Clean up cache
    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp > this.config.cacheTimeout * 1000) {
        this.cache.delete(key);
      }
    }

    this.emit('cleanupCompleted');
  }

  private generateCacheKey(query: AnalyticsQuery): string {
    return `${query.query}:${query.timeRange.from.getTime()}:${query.timeRange.to.getTime()}`;
  }

  private generateId(type: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `${type}-${timestamp}-${random}`;
  }

  // Statistics and Health
  public getStatistics(): {
    totalMetrics: number;
    totalMetricDefinitions: number;
    totalQueries: number;
    cacheSize: number;
    memoryUsage: number;
  } {
    let totalMetrics = 0;
    for (const metrics of this.metrics.values()) {
      totalMetrics += metrics.length;
    }

    return {
      totalMetrics,
      totalMetricDefinitions: this.metricDefinitions.size,
      totalQueries: this.queries.size,
      cacheSize: this.cache.size,
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024 // MB
    };
  }

  public exportData(
    metricIds: string[],
    timeRange: TimeRange,
    format: 'json' | 'csv' = 'json'
  ): string {
    const data: any[] = [];

    for (const metricId of metricIds) {
      const metrics = this.getMetrics(metricId, timeRange);
      
      for (const metric of metrics) {
        data.push({
          timestamp: metric.timestamp.toISOString(),
          metric: metric.name,
          value: metric.value,
          unit: metric.unit,
          tags: metric.tags,
          source: metric.source
        });
      }
    }

    if (format === 'csv') {
      if (data.length === 0) return '';
      
      const headers = Object.keys(data[0]);
      const csvRows = [headers.join(',')];
      
      for (const row of data) {
        const values = headers.map(header => {
          const value = row[header];
          if (typeof value === 'object') {
            return JSON.stringify(value);
          }
          return value;
        });
        csvRows.push(values.join(','));
      }
      
      return csvRows.join('\n');
    }

    return JSON.stringify(data, null, 2);
  }
}