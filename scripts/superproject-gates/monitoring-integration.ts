/**
 * Duration Tracking Integration with Monitoring Analytics System
 * 
 * Provides seamless integration between duration tracking components and the existing
 * monitoring analytics system for unified metrics management
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { DurationTrackingSystem } from '../index';
import { DurationValidationEngine } from '../../monitoring-analytics/core/validation-engine';
import { DurationAggregationEngine } from '../aggregation-engine';
import { DurationAlertingEngine } from '../../monitoring-analytics/core/duration-alerting-engine';
import { DurationTrendAnalysisEngine } from '../trend-analysis-engine';
import { MetricsCollector, MetricsCollectorConfig } from '../../monitoring-analytics/core/metrics-collector';
import {
  MetricDefinition,
  MetricValue,
  MonitoringConfig,
  Environment,
  MonitoringError
} from '../../monitoring-analytics/types';

export interface DurationMonitoringIntegrationConfig {
  enabled: boolean;
  environment: Environment;
  metricsCollector: Partial<MetricsCollectorConfig>;
  durationTracking: {
    enabled: boolean;
    collectionInterval: number;
    bufferSize: number;
    retentionDays: number;
  };
  validation: {
    enabled: boolean;
    validationInterval: number;
    autoCorrection: boolean;
  };
  aggregation: {
    enabled: boolean;
    aggregationInterval: number;
    defaultIntervals: string[];
    defaultAggregations: string[];
  };
  alerting: {
    enabled: boolean;
    evaluationInterval: number;
    maxConcurrentAlerts: number;
    defaultCooldown: number;
  };
  trendAnalysis: {
    enabled: boolean;
    analysisInterval: number;
    historicalRetention: number;
    predictionHorizon: number;
  };
  synchronization: {
    enabled: boolean;
    syncInterval: number;
    batchSize: number;
    retryAttempts: number;
  };
}

export interface IntegrationMetrics {
  totalDurationMetrics: number;
  totalValidationResults: number;
  totalAggregatedMetrics: number;
  totalAlerts: number;
  totalTrends: number;
  syncStatus: {
    lastSync: Date;
    totalSynced: number;
    failedSyncs: number;
    averageSyncDuration: number;
  };
  systemHealth: {
    durationTracking: 'healthy' | 'warning' | 'critical';
    validation: 'healthy' | 'warning' | 'critical';
    aggregation: 'healthy' | 'warning' | 'critical';
    alerting: 'healthy' | 'warning' | 'critical';
    trendAnalysis: 'healthy' | 'warning' | 'critical';
  };
}

export class DurationMonitoringIntegration extends EventEmitter {
  private config: DurationMonitoringIntegrationConfig;
  private isRunning: boolean = false;
  private syncInterval: NodeJS.Timeout | null = null;
  
  // Core components
  private durationTrackingSystem: DurationTrackingSystem;
  private validationEngine: DurationValidationEngine;
  private aggregationEngine: DurationAggregationEngine;
  private alertingEngine: DurationAlertingEngine;
  private trendAnalysisEngine: DurationTrendAnalysisEngine;
  private metricsCollector: MetricsCollector;
  
  // Integration state
  private integrationMetrics: IntegrationMetrics;
  private lastSyncTime: Date = new Date();
  private syncQueue: any[] = [];
  private syncErrors: Map<string, Error> = new Map();

  constructor(
    config: DurationMonitoringIntegrationConfig,
    monitoringConfig: MonitoringConfig
  ) {
    super();
    
    this.config = config;
    
    // Initialize integration metrics
    this.integrationMetrics = {
      totalDurationMetrics: 0,
      totalValidationResults: 0,
      totalAggregatedMetrics: 0,
      totalAlerts: 0,
      totalTrends: 0,
      syncStatus: {
        lastSync: new Date(),
        totalSynced: 0,
        failedSyncs: 0,
        averageSyncDuration: 0
      },
      systemHealth: {
        durationTracking: 'healthy',
        validation: 'healthy',
        aggregation: 'healthy',
        alerting: 'healthy',
        trendAnalysis: 'healthy'
      }
    };

    // Initialize core components
    this.initializeComponents(monitoringConfig);
    this.setupEventForwarding();
  }

  /**
   * Start integration
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[DURATION_INTEGRATION] Integration already running');
      return;
    }

    this.isRunning = true;
    console.log('[DURATION_INTEGRATION] Starting duration monitoring integration');

    try {
      // Start all components
      await this.durationTrackingSystem.start();
      await this.validationEngine.start();
      await this.aggregationEngine.start();
      await this.alertingEngine.start();
      await this.trendAnalysisEngine.start();
      await this.metricsCollector.start();

      // Register duration metrics with monitoring system
      await this.registerDurationMetrics();

      // Start synchronization
      if (this.config.synchronization.enabled) {
        this.startSynchronization();
      }

      console.log('[DURATION_INTEGRATION] Integration started successfully');
      this.emit('started', { timestamp: new Date() });

    } catch (error) {
      console.error('[DURATION_INTEGRATION] Failed to start integration:', error);
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * Stop integration
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    // Stop synchronization
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    // Stop all components
    await this.trendAnalysisEngine.stop();
    await this.alertingEngine.stop();
    await this.aggregationEngine.stop();
    await this.validationEngine.stop();
    await this.durationTrackingSystem.stop();
    await this.metricsCollector.stop();

    console.log('[DURATION_INTEGRATION] Integration stopped');
    this.emit('stopped', { timestamp: new Date() });
  }

  /**
   * Initialize core components
   */
  private initializeComponents(monitoringConfig: MonitoringConfig): void {
    // Initialize duration tracking system
    this.durationTrackingSystem = new DurationTrackingSystem({
      enabled: this.config.durationTracking.enabled,
      environment: this.config.environment,
      collectionInterval: this.config.durationTracking.collectionInterval,
      bufferSize: this.config.durationTracking.bufferSize,
      retentionDays: this.config.durationTracking.retentionDays,
      qualityThresholds: {
        minQualityScore: 70,
        minCompleteness: 80,
        minAccuracy: 85,
        minConsistency: 75,
        maxOutlierDeviation: 3,
        maxMissingDataPercentage: 10
      },
      alerting: {
        enabled: this.config.alerting.enabled,
        defaultRules: [],
        escalationPolicies: [],
        notificationChannels: [],
        suppressionRules: []
      },
      aggregation: {
        enabled: this.config.aggregation.enabled,
        defaultIntervals: this.config.aggregation.defaultIntervals,
        defaultTypes: this.config.aggregation.defaultAggregations,
        defaultDimensions: ['component', 'operation', 'status'],
        maxAggregationAge: 90
      },
      validation: {
        enabled: this.config.validation.enabled,
        validationInterval: this.config.validation.validationInterval,
        autoCorrection: this.config.validation.autoCorrection,
        correctionRules: [],
        dataQualityChecks: []
      },
      integration: {
        systems: [],
        exportFormats: [],
        importFormats: [],
        syncInterval: this.config.synchronization.syncInterval
      }
    });

    // Initialize validation engine
    this.validationEngine = new DurationValidationEngine();

    // Initialize aggregation engine
    this.aggregationEngine = new DurationAggregationEngine({
      enabled: this.config.aggregation.enabled,
      defaultIntervals: this.config.aggregation.defaultIntervals,
      defaultAggregations: this.config.aggregation.defaultAggregations,
      defaultDimensions: ['component', 'operation', 'status'],
      maxAggregationAge: 90,
      batchSize: 1000,
      processingInterval: this.config.aggregation.aggregationInterval,
      retentionPolicy: {
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

    // Initialize alerting engine
    this.alertingEngine = new DurationAlertingEngine({
      enabled: this.config.alerting.enabled,
      evaluationInterval: this.config.alerting.evaluationInterval,
      maxConcurrentAlerts: this.config.alerting.maxConcurrentAlerts,
      defaultCooldown: this.config.alerting.defaultCooldown,
      suppressionDuration: 60,
      batchNotifications: true,
      batchDelay: 30,
      defaultRules: [],
      escalationPolicies: [],
      notificationChannels: new Map(),
      suppressionRules: []
    });

    // Initialize trend analysis engine
    this.trendAnalysisEngine = new DurationTrendAnalysisEngine({
      enabled: this.config.trendAnalysis.enabled,
      analysisInterval: this.config.trendAnalysis.analysisInterval,
      historicalRetention: this.config.trendAnalysis.historicalRetention,
      trendWindows: [15, 60, 240, 1440],
      anomalyThreshold: 2.5,
      predictionHorizon: this.config.trendAnalysis.predictionHorizon,
      patternRecognition: {
        enabled: true,
        minPatternLength: 3,
        maxPatternLength: 24,
        confidenceThreshold: 0.7
      },
      seasonalityDetection: {
        enabled: true,
        cycles: ['hourly', 'daily', 'weekly', 'monthly'],
        minDataPoints: 144
      }
    });

    // Initialize metrics collector
    const metricsCollectorConfig: MetricsCollectorConfig = {
      environment: this.config.environment,
      collectionInterval: 60,
      bufferSize: 10000,
      aggregationInterval: 300,
      retentionDays: 30,
      ...this.config.metricsCollector
    };

    this.metricsCollector = new MetricsCollector(metricsCollectorConfig, monitoringConfig);
  }

  /**
   * Set up event forwarding between components
   */
  private setupEventForwarding(): void {
    // Duration tracking events
    this.durationTrackingSystem.on('metric_collected', (data) => {
      this.handleDurationMetricCollected(data);
    });

    this.durationTrackingSystem.on('quality_validated', (data) => {
      this.handleDurationQualityValidated(data);
    });

    this.durationTrackingSystem.on('alert_triggered', (data) => {
      this.handleDurationAlertTriggered(data);
    });

    // Validation engine events
    this.validationEngine.on('validationResult', (data) => {
      this.handleValidationResult(data);
    });

    this.validationEngine.on('qualityMetrics', (data) => {
      this.handleQualityMetrics(data);
    });

    // Aggregation engine events
    this.aggregationEngine.on('metricAggregated', (data) => {
      this.handleMetricAggregated(data);
    });

    this.aggregationEngine.on('reportGenerated', (data) => {
      this.handleAggregationReport(data);
    });

    // Alerting engine events
    this.alertingEngine.on('alertTriggered', (data) => {
      this.handleAlertTriggered(data);
    });

    this.alertingEngine.on('alertResolved', (data) => {
      this.handleAlertResolved(data);
    });

    // Trend analysis engine events
    this.trendAnalysisEngine.on('trendAnalyzed', (data) => {
      this.handleTrendAnalyzed(data);
    });

    this.trendAnalysisEngine.on('anomalyDetected', (data) => {
      this.handleAnomalyDetected(data);
    });

    this.trendAnalysisEngine.on('reportGenerated', (data) => {
      this.handleTrendReport(data);
    });

    // Metrics collector events
    this.metricsCollector.on('valueRecorded', (data) => {
      this.handleMetricValueRecorded(data);
    });

    this.metricsCollector.on('metricsAggregated', (data) => {
      this.handleMetricsAggregated(data);
    });
  }

  /**
   * Register duration metrics with monitoring system
   */
  private async registerDurationMetrics(): Promise<void> {
    console.log('[DURATION_INTEGRATION] Registering duration metrics with monitoring system');

    // Register core duration metrics
    const durationMetrics = [
      {
        name: 'Duration Metric',
        description: 'Duration measurement in milliseconds',
        category: 'duration',
        type: 'counter' as const,
        unit: 'milliseconds',
        labels: { component: '', operation: '', status: '' },
        retention: 30
      },
      {
        name: 'Duration Validation Result',
        description: 'Duration validation result',
        category: 'validation',
        type: 'gauge' as const,
        unit: 'boolean',
        labels: { rule: '', metric: '', severity: '' },
        retention: 30
      },
      {
        name: 'Duration Aggregation',
        description: 'Aggregated duration metrics',
        category: 'aggregation',
        type: 'gauge' as const,
        unit: 'milliseconds',
        labels: { interval: '', aggregation: '', component: '' },
        retention: 90
      },
      {
        name: 'Duration Alert',
        description: 'Duration alert status',
        category: 'alert',
        type: 'gauge' as const,
        unit: 'boolean',
        labels: { rule: '', severity: '', component: '' },
        retention: 30
      },
      {
        name: 'Duration Trend',
        description: 'Duration trend analysis',
        category: 'trend',
        type: 'gauge' as const,
        unit: 'number',
        labels: { direction: '', confidence: '', component: '' },
        retention: 90
      }
    ];

    for (const metric of durationMetrics) {
      this.metricsCollector.registerMetric(metric);
    }

    console.log('[DURATION_INTEGRATION] Duration metrics registered successfully');
  }

  /**
   * Handle duration metric collected event
   */
  private handleDurationMetricCollected(data: any): void {
    // Record in monitoring system
    this.metricsCollector.recordValue('duration_metric', data.value, {
      component: data.dimensions?.component || 'unknown',
      operation: data.dimensions?.operation || 'unknown',
      status: data.dimensions?.status || 'unknown'
    });

    // Update integration metrics
    this.integrationMetrics.totalDurationMetrics++;
    
    // Add to sync queue
    this.addToSyncQueue({
      type: 'duration_metric',
      data,
      timestamp: new Date()
    });

    this.emit('durationMetricIntegrated', data);
  }

  /**
   * Handle duration quality validated event
   */
  private handleDurationQualityValidated(data: any): void {
    // Record validation result in monitoring system
    this.metricsCollector.recordValue('duration_validation_result', data.passed ? 1 : 0, {
      rule: data.ruleId,
      metric: data.metricId,
      severity: data.severity
    });

    this.emit('durationQualityIntegrated', data);
  }

  /**
   * Handle duration alert triggered event
   */
  private handleDurationAlertTriggered(data: any): void {
    // Record alert in monitoring system
    this.metricsCollector.recordValue('duration_alert', 1, {
      rule: data.ruleId,
      severity: data.severity,
      component: data.component
    });

    // Update integration metrics
    this.integrationMetrics.totalAlerts++;

    this.emit('durationAlertIntegrated', data);
  }

  /**
   * Handle validation result event
   */
  private handleValidationResult(data: any): void {
    // Update integration metrics
    this.integrationMetrics.totalValidationResults++;

    // Record in monitoring system
    this.metricsCollector.recordValue('duration_validation_result', data.passed ? 1 : 0, {
      rule: data.ruleId,
      metric: data.metricId,
      severity: data.severity
    });

    this.emit('validationIntegrated', data);
  }

  /**
   * Handle quality metrics event
   */
  private handleQualityMetrics(data: any): void {
    // Record quality metrics in monitoring system
    this.metricsCollector.recordValue('duration_quality_score', data.overall.score, {
      metric: 'overall'
    });

    this.metricsCollector.recordValue('duration_quality_completeness', data.overall.completeness, {
      metric: 'overall'
    });

    this.metricsCollector.recordValue('duration_quality_accuracy', data.overall.accuracy, {
      metric: 'overall'
    });

    this.emit('qualityMetricsIntegrated', data);
  }

  /**
   * Handle metric aggregated event
   */
  private handleMetricAggregated(data: any): void {
    // Update integration metrics
    this.integrationMetrics.totalAggregatedMetrics++;

    // Record in monitoring system
    this.metricsCollector.recordValue('duration_aggregation', data.value, {
      interval: data.interval,
      aggregation: data.aggregation,
      component: data.dimensions?.component || 'unknown'
    });

    this.emit('aggregationIntegrated', data);
  }

  /**
   * Handle aggregation report event
   */
  private handleAggregationReport(data: any): void {
    // Record report metrics in monitoring system
    this.metricsCollector.recordValue('aggregation_report_generated', 1, {
      report_id: data.id,
      total_metrics: data.summary.totalMetrics
    });

    this.emit('aggregationReportIntegrated', data);
  }

  /**
   * Handle alert triggered event
   */
  private handleAlertTriggered(data: any): void {
    // Update integration metrics
    this.integrationMetrics.totalAlerts++;

    // Record in monitoring system
    this.metricsCollector.recordValue('duration_alert', 1, {
      rule: data.ruleId,
      severity: data.severity,
      component: data.component
    });

    this.emit('alertIntegrated', data);
  }

  /**
   * Handle alert resolved event
   */
  private handleAlertResolved(data: any): void {
    // Record alert resolution in monitoring system
    this.metricsCollector.recordValue('duration_alert_resolved', 1, {
      rule: data.ruleId,
      severity: data.severity,
      component: data.component
    });

    this.emit('alertResolutionIntegrated', data);
  }

  /**
   * Handle trend analyzed event
   */
  private handleTrendAnalyzed(data: any): void {
    // Update integration metrics
    this.integrationMetrics.totalTrends++;

    // Record trend in monitoring system
    this.metricsCollector.recordValue('duration_trend', data.trend.slope, {
      direction: data.trend.direction,
      confidence: data.trend.confidence.toString(),
      component: data.component
    });

    this.emit('trendIntegrated', data);
  }

  /**
   * Handle anomaly detected event
   */
  private handleAnomalyDetected(data: any): void {
    // Record anomaly in monitoring system
    this.metricsCollector.recordValue('duration_anomaly', data.score, {
      type: data.type,
      severity: data.severity,
      component: data.component
    });

    this.emit('anomalyIntegrated', data);
  }

  /**
   * Handle trend report event
   */
  private handleTrendReport(data: any): void {
    // Record report metrics in monitoring system
    this.metricsCollector.recordValue('trend_report_generated', 1, {
      report_id: data.id,
      total_metrics: data.summary.totalMetrics,
      total_anomalies: data.summary.totalAnomalies
    });

    this.emit('trendReportIntegrated', data);
  }

  /**
   * Handle metric value recorded event
   */
  private handleMetricValueRecorded(data: any): void {
    // Forward to duration tracking system if it's a duration-related metric
    if (data.metricValue.metricId.includes('duration')) {
      this.durationTrackingSystem.recordDuration(
        data.metricValue.metricId,
        data.metricValue.value,
        data.metricValue.labels,
        data.metricValue.metadata
      );
    }

    this.emit('metricValueIntegrated', data);
  }

  /**
   * Handle metrics aggregated event
   */
  private handleMetricsAggregated(data: any): void {
    // Forward to aggregation engine if it's duration-related
    // This would need more sophisticated routing logic
    this.emit('metricsAggregationIntegrated', data);
  }

  /**
   * Start synchronization between systems
   */
  private startSynchronization(): void {
    console.log('[DURATION_INTEGRATION] Starting synchronization');

    this.syncInterval = setInterval(async () => {
      await this.performSynchronization();
    }, this.config.synchronization.syncInterval * 1000);

    // Perform initial sync
    this.performSynchronization();
  }

  /**
   * Perform synchronization between systems
   */
  private async performSynchronization(): Promise<void> {
    const startTime = Date.now();

    try {
      console.log('[DURATION_INTEGRATION] Performing synchronization');

      // Process sync queue
      await this.processSyncQueue();

      // Sync metrics between systems
      await this.syncMetricsBetweenSystems();

      // Update system health
      this.updateSystemHealth();

      // Update sync status
      const syncDuration = Date.now() - startTime;
      this.updateSyncStatus(syncDuration);

      console.log(`[DURATION_INTEGRATION] Synchronization completed in ${syncDuration}ms`);
      this.emit('synchronizationCompleted', {
        timestamp: new Date(),
        duration: syncDuration,
        totalSynced: this.integrationMetrics.syncStatus.totalSynced
      });

    } catch (error) {
      console.error('[DURATION_INTEGRATION] Synchronization failed:', error);
      this.integrationMetrics.syncStatus.failedSyncs++;
      this.syncErrors.set('sync', error as Error);
      
      this.emit('synchronizationError', {
        timestamp: new Date(),
        error
      });
    }
  }

  /**
   * Add item to sync queue
   */
  private addToSyncQueue(item: any): void {
    this.syncQueue.push(item);
    
    // Limit queue size
    if (this.syncQueue.length > this.config.synchronization.batchSize) {
      this.syncQueue.splice(0, this.syncQueue.length - this.config.synchronization.batchSize);
    }
  }

  /**
   * Process sync queue
   */
  private async processSyncQueue(): Promise<void> {
    if (this.syncQueue.length === 0) return;

    const batchSize = Math.min(this.config.synchronization.batchSize, this.syncQueue.length);
    const batch = this.syncQueue.splice(0, batchSize);

    for (const item of batch) {
      try {
        await this.processSyncItem(item);
        this.integrationMetrics.syncStatus.totalSynced++;
      } catch (error) {
        console.error('[DURATION_INTEGRATION] Error processing sync item:', error);
        this.integrationMetrics.syncStatus.failedSyncs++;
      }
    }
  }

  /**
   * Process individual sync item
   */
  private async processSyncItem(item: any): Promise<void> {
    switch (item.type) {
      case 'duration_metric':
        // Already handled in event handlers
        break;
      case 'validation_result':
        // Already handled in event handlers
        break;
      case 'aggregation':
        // Already handled in event handlers
        break;
      case 'alert':
        // Already handled in event handlers
        break;
      case 'trend':
        // Already handled in event handlers
        break;
      default:
        console.warn(`[DURATION_INTEGRATION] Unknown sync item type: ${item.type}`);
    }
  }

  /**
   * Sync metrics between systems
   */
  private async syncMetricsBetweenSystems(): Promise<void> {
    // Get duration metrics from tracking system
    const durationMetrics = this.durationTrackingSystem.getMetrics({
      source: 'duration_monitoring_integration'
    });

    // Sync to monitoring system
    for (const metric of durationMetrics) {
      this.metricsCollector.recordValue(
        `duration_${metric.metricId}`,
        metric.value,
        metric.dimensions,
        metric.metadata
      );
    }

    // Get aggregated metrics from aggregation engine
    const aggregatedMetrics = this.aggregationEngine.getAggregatedMetrics();

    // Sync to monitoring system
    for (const metric of aggregatedMetrics) {
      this.metricsCollector.recordValue(
        `duration_aggregated_${metric.metricId}`,
        metric.value,
        {
          interval: metric.interval,
          aggregation: metric.aggregation,
          ...metric.dimensions
        },
        metric.metadata
      );
    }
  }

  /**
   * Update system health
   */
  private updateSystemHealth(): void {
    // Check health of each component
    this.integrationMetrics.systemHealth.durationTracking = 
      this.durationTrackingSystem ? 'healthy' : 'critical';
    
    this.integrationMetrics.systemHealth.validation = 
      this.validationEngine ? 'healthy' : 'critical';
    
    this.integrationMetrics.systemHealth.aggregation = 
      this.aggregationEngine ? 'healthy' : 'critical';
    
    this.integrationMetrics.systemHealth.alerting = 
      this.alertingEngine ? 'healthy' : 'critical';
    
    this.integrationMetrics.systemHealth.trendAnalysis = 
      this.trendAnalysisEngine ? 'healthy' : 'critical';
  }

  /**
   * Update sync status
   */
  private updateSyncStatus(syncDuration: number): void {
    this.integrationMetrics.syncStatus.lastSync = new Date();
    
    // Update average sync duration
    const totalSyncs = this.integrationMetrics.syncStatus.totalSynced + 
                        this.integrationMetrics.syncStatus.failedSyncs;
    if (totalSyncs > 0) {
      this.integrationMetrics.syncStatus.averageSyncDuration = 
        (this.integrationMetrics.syncStatus.averageSyncDuration * (totalSyncs - 1) + syncDuration) / totalSyncs;
    }
  }

  /**
   * Get integration metrics
   */
  public getIntegrationMetrics(): IntegrationMetrics {
    return { ...this.integrationMetrics };
  }

  /**
   * Get system health
   */
  public getSystemHealth(): IntegrationMetrics['systemHealth'] {
    return { ...this.integrationMetrics.systemHealth };
  }

  /**
   * Get sync status
   */
  public getSyncStatus(): IntegrationMetrics['syncStatus'] {
    return { ...this.integrationMetrics.syncStatus };
  }

  /**
   * Force synchronization
   */
  public async forceSynchronization(): Promise<void> {
    console.log('[DURATION_INTEGRATION] Forcing synchronization');
    await this.performSynchronization();
  }

  /**
   * Get component status
   */
  public getComponentStatus(): {
    durationTracking: boolean;
    validation: boolean;
    aggregation: boolean;
    alerting: boolean;
    trendAnalysis: boolean;
    metricsCollector: boolean;
  } {
    return {
      durationTracking: this.durationTrackingSystem ? true : false,
      validation: this.validationEngine ? true : false,
      aggregation: this.aggregationEngine ? true : false,
      alerting: this.alertingEngine ? true : false,
      trendAnalysis: this.trendAnalysisEngine ? true : false,
      metricsCollector: this.metricsCollector ? true : false
    };
  }

  /**
   * Get component instances for direct access
   */
  public getComponents(): {
    durationTracking: DurationTrackingSystem;
    validation: DurationValidationEngine;
    aggregation: DurationAggregationEngine;
    alerting: DurationAlertingEngine;
    trendAnalysis: DurationTrendAnalysisEngine;
    metricsCollector: MetricsCollector;
  } {
    return {
      durationTracking: this.durationTrackingSystem,
      validation: this.validationEngine,
      aggregation: this.aggregationEngine,
      alerting: this.alertingEngine,
      trendAnalysis: this.trendAnalysisEngine,
      metricsCollector: this.metricsCollector
    };
  }
}