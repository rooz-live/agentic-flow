/**
 * Duration Metrics Alerting Engine
 * 
 * Provides comprehensive monitoring and alerting capabilities for duration_ms metrics
 * with configurable rules, escalation policies, and notification channels
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { DurationTrackingSystem } from '../../duration-tracking';
import {
  AlertRule,
  AlertCondition,
  AlertAction,
  Alert,
  AlertStatus,
  AlertSeverity,
  Environment,
  MonitoringError,
  NotificationChannel,
  EscalationPolicy,
  SuppressionRule
} from '../types';

export interface DurationAlertRule extends AlertRule {
  metricId: string;
  durationThresholds: {
    warning: number;
    error: number;
    critical: number;
  };
  trendAnalysis: {
    enabled: boolean;
    windowSize: number; // minutes
    threshold: number; // percentage change
  };
  anomalyDetection: {
    enabled: boolean;
    sensitivity: 'low' | 'medium' | 'high';
    windowSize: number; // minutes
  };
  components: string[];
  operations: string[];
  environments: Environment[];
}

export interface DurationAlert extends Alert {
  metricId: string;
  currentValue: number;
  thresholdValue: number;
  thresholdType: 'warning' | 'error' | 'critical';
  component?: string;
  operation?: string;
  environment: Environment;
  trendData?: {
    direction: 'increasing' | 'decreasing' | 'stable';
    percentage: number;
    windowSize: number;
  };
  anomalyData?: {
    score: number;
    sensitivity: string;
    windowSize: number;
  };
  durationAnalysis?: {
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
    p95Duration: number;
    p99Duration: number;
    sampleSize: number;
  };
}

export interface DurationAlertingConfig {
  enabled: boolean;
  evaluationInterval: number; // seconds
  maxConcurrentAlerts: number;
  defaultCooldown: number; // minutes
  suppressionDuration: number; // minutes
  batchNotifications: boolean;
  batchDelay: number; // seconds
  defaultRules: DurationAlertRule[];
  escalationPolicies: EscalationPolicy[];
  notificationChannels: Map<string, NotificationChannel>;
  suppressionRules: SuppressionRule[];
}

export class DurationAlertingEngine extends EventEmitter {
  private config: DurationAlertingConfig;
  private rules: Map<string, DurationAlertRule> = new Map();
  private alerts: Map<string, DurationAlert> = new Map();
  private activeAlerts: Map<string, DurationAlert> = new Map();
  private suppressedAlerts: Map<string, Date> = new Map();
  private evaluationInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private durationTrackingSystem: DurationTrackingSystem;

  constructor(config: Partial<DurationAlertingConfig> = {}) {
    super();
    
    this.config = {
      enabled: true,
      evaluationInterval: 60, // 1 minute
      maxConcurrentAlerts: 100,
      defaultCooldown: 5, // 5 minutes
      suppressionDuration: 60, // 1 hour
      batchNotifications: true,
      batchDelay: 30, // 30 seconds
      defaultRules: [],
      escalationPolicies: [],
      notificationChannels: new Map(),
      suppressionRules: [],
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
            name: 'duration_alerting_engine',
            type: 'alerting',
            enabled: true,
            configuration: {},
            mapping: {
              sourceField: 'alertEvent',
              targetField: 'durationAlert',
              transformation: 'alertEvent',
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
   * Start alerting engine
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[DURATION_ALERTING] Alerting engine already running');
      return;
    }

    this.isRunning = true;
    console.log('[DURATION_ALERTING] Starting duration alerting engine');

    // Start duration tracking system
    await this.durationTrackingSystem.start();

    // Start evaluation interval
    this.evaluationInterval = setInterval(() => {
      this.evaluateAlerts();
    }, this.config.evaluationInterval * 1000);

    console.log('[DURATION_ALERTING] Alerting engine started');
    this.emit('started', { timestamp: new Date() });
  }

  /**
   * Stop alerting engine
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.evaluationInterval) {
      clearInterval(this.evaluationInterval);
      this.evaluationInterval = null;
    }

    // Stop duration tracking system
    await this.durationTrackingSystem.stop();

    console.log('[DURATION_ALERTING] Alerting engine stopped');
    this.emit('stopped', { timestamp: new Date() });
  }

  /**
   * Initialize default alert rules
   */
  private initializeDefaultRules(): void {
    // High duration alert rule
    this.createRule({
      id: 'high_duration_alert',
      name: 'High Duration Alert',
      description: 'Alert when duration exceeds threshold',
      metricId: 'duration_ms',
      enabled: true,
      severity: 'warning',
      conditions: [
        {
          metricId: 'duration_ms',
          operator: 'gt',
          threshold: 30000, // 30 seconds
          duration: 300, // 5 minutes
          aggregation: 'avg'
        }
      ],
      actions: [
        {
          type: 'alert',
          description: 'Notify team of high duration'
        }
      ],
      cooldownPeriod: 15,
      escalationPolicy: {
        levels: [
          {
            level: 1,
            delay: 5,
            actions: [
              {
                type: 'alert',
                description: 'Escalate to team lead'
              }
            ]
          }
        ],
        repeatInterval: 30,
        maxEscalations: 3
      },
      durationThresholds: {
        warning: 30000, // 30 seconds
        error: 60000, // 1 minute
        critical: 300000 // 5 minutes
      },
      trendAnalysis: {
        enabled: true,
        windowSize: 60, // 1 hour
        threshold: 20 // 20% change
      },
      anomalyDetection: {
        enabled: true,
        sensitivity: 'medium',
        windowSize: 60 // 1 hour
      },
      components: [],
      operations: [],
      environments: ['development', 'staging', 'production']
    });

    // Duration trend alert rule
    this.createRule({
      id: 'duration_trend_alert',
      name: 'Duration Trend Alert',
      description: 'Alert when duration shows concerning trend',
      metricId: 'duration_ms',
      enabled: true,
      severity: 'warning',
      conditions: [
        {
          metricId: 'duration_ms',
          operator: 'trend',
          threshold: 25, // 25% increase
          duration: 1800, // 30 minutes
          aggregation: 'avg'
        }
      ],
      actions: [
        {
          type: 'alert',
          description: 'Notify team of duration trend'
        }
      ],
      cooldownPeriod: 30,
      escalationPolicy: {
        levels: [
          {
            level: 1,
            delay: 10,
            actions: [
              {
                type: 'alert',
                description: 'Escalate to team lead'
              }
            ]
          }
        ],
        repeatInterval: 60,
        maxEscalations: 2
      },
      durationThresholds: {
        warning: 30000,
        error: 60000,
        critical: 300000
      },
      trendAnalysis: {
        enabled: true,
        windowSize: 120, // 2 hours
        threshold: 25 // 25% change
      },
      anomalyDetection: {
        enabled: false,
        sensitivity: 'medium',
        windowSize: 60
      },
      components: [],
      operations: [],
      environments: ['development', 'staging', 'production']
    });

    // Duration anomaly alert rule
    this.createRule({
      id: 'duration_anomaly_alert',
      name: 'Duration Anomaly Alert',
      description: 'Alert when duration shows anomalous patterns',
      metricId: 'duration_ms',
      enabled: true,
      severity: 'error',
      conditions: [
        {
          metricId: 'duration_ms',
          operator: 'anomaly',
          threshold: 0.8, // 80% anomaly score
          duration: 900, // 15 minutes
          aggregation: 'avg'
        }
      ],
      actions: [
        {
          type: 'alert',
          description: 'Notify team of duration anomaly'
        }
      ],
      cooldownPeriod: 10,
      escalationPolicy: {
        levels: [
          {
            level: 1,
            delay: 5,
            actions: [
              {
                type: 'alert',
                description: 'Escalate to team lead'
              }
            ]
          },
          {
            level: 2,
            delay: 15,
            actions: [
              {
                type: 'alert',
                description: 'Escalate to management'
              }
            ]
          }
        ],
        repeatInterval: 30,
        maxEscalations: 3
      },
      durationThresholds: {
        warning: 30000,
        error: 60000,
        critical: 300000
      },
      trendAnalysis: {
        enabled: true,
        windowSize: 60,
        threshold: 20
      },
      anomalyDetection: {
        enabled: true,
        sensitivity: 'high',
        windowSize: 60
      },
      components: [],
      operations: [],
      environments: ['development', 'staging', 'production']
    });
  }

  /**
   * Create an alert rule
   */
  public createRule(rule: Omit<DurationAlertRule, 'id' | 'createdAt' | 'updatedAt'>): string {
    const fullRule: DurationAlertRule = {
      ...rule,
      id: rule.id || uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.rules.set(fullRule.id, fullRule);
    console.log(`[DURATION_ALERTING] Created alert rule: ${fullRule.name} (${fullRule.id})`);
    this.emit('ruleCreated', fullRule);
    return fullRule.id;
  }

  /**
   * Evaluate alerts
   */
  private async evaluateAlerts(): Promise<void> {
    try {
      console.log('[DURATION_ALERTING] Evaluating alerts');

      const startTime = Date.now();

      // Get metrics from duration tracking system
      const metrics = this.durationTrackingSystem.getMetrics({
        source: 'duration_alerting_engine'
      });

      // Group metrics by rule
      const metricsByRule = this.groupMetricsByRule(metrics);

      // Evaluate each rule
      for (const [ruleId, ruleMetrics] of metricsByRule.entries()) {
        const rule = this.rules.get(ruleId);
        if (!rule || !rule.enabled) continue;

        await this.evaluateRule(rule, ruleMetrics);
      }

      // Check for alert suppression and cooldown
      await this.processAlertLifecycle();

      const evaluationDuration = Date.now() - startTime;

      // Record alert evaluation duration
      this.durationTrackingSystem.recordDuration(
        'alert_evaluation_duration_ms',
        evaluationDuration,
        {
          component: 'duration_alerting_engine',
          operation: 'evaluate_alerts',
          totalMetrics: metrics.length,
          totalRules: this.rules.size,
          activeAlerts: this.activeAlerts.size
        },
        {
          operationType: 'alert_evaluation',
          totalMetrics: metrics.length,
          totalRules: this.rules.size,
          activeAlerts: this.activeAlerts.size
        }
      );

      console.log(`[DURATION_ALERTING] Alert evaluation completed in ${evaluationDuration}ms`);
      this.emit('evaluationCompleted', {
        timestamp: new Date(),
        totalMetrics: metrics.length,
        evaluationDuration,
        activeAlerts: this.activeAlerts.size
      });

    } catch (error) {
      console.error('[DURATION_ALERTING] Error during alert evaluation:', error);
      this.emit('evaluationError', { timestamp: new Date(), error });
    }
  }

  /**
   * Group metrics by rule
   */
  private groupMetricsByRule(metrics: any[]): Map<string, any[]> {
    const metricsByRule = new Map<string, any[]>();

    for (const metric of metrics) {
      const rules = Array.from(this.rules.values()).filter(rule => 
        rule.metricId === metric.metricId && rule.enabled
      );

      for (const rule of rules) {
        // Check if metric matches rule filters
        if (this.metricMatchesRule(metric, rule)) {
          const existing = metricsByRule.get(rule.id) || [];
          existing.push(metric);
          metricsByRule.set(rule.id, existing);
        }
      }
    }

    return metricsByRule;
  }

  /**
   * Check if metric matches rule filters
   */
  private metricMatchesRule(metric: any, rule: DurationAlertRule): boolean {
    // Check component filter
    if (rule.components.length > 0) {
      const metricComponent = metric.dimensions?.component || 'unknown';
      if (!rule.components.includes(metricComponent)) {
        return false;
      }
    }

    // Check operation filter
    if (rule.operations.length > 0) {
      const metricOperation = metric.dimensions?.operation || 'unknown';
      if (!rule.operations.includes(metricOperation)) {
        return false;
      }
    }

    // Check environment filter
    if (rule.environments.length > 0) {
      const metricEnvironment = metric.environment || 'development';
      if (!rule.environments.includes(metricEnvironment as Environment)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Evaluate a specific rule
   */
  private async evaluateRule(rule: DurationAlertRule, metrics: any[]): Promise<void> {
    for (const condition of rule.conditions) {
      await this.evaluateCondition(rule, condition, metrics);
    }
  }

  /**
   * Evaluate a specific condition
   */
  private async evaluateCondition(
    rule: DurationAlertRule,
    condition: AlertCondition,
    metrics: any[]
  ): Promise<void> {
    // Group metrics by component and operation for evaluation
    const metricGroups = this.groupMetricsForEvaluation(metrics);

    for (const [groupKey, groupMetrics] of metricGroups.entries()) {
      const { component, operation, environment } = this.parseGroupKey(groupKey);
      
      // Evaluate condition for this group
      const evaluation = await this.evaluateConditionForGroup(condition, groupMetrics);
      
      if (evaluation.triggered) {
        await this.triggerAlert(rule, condition, evaluation, {
          component,
          operation,
          environment
        });
      } else {
        await this.checkAlertResolution(rule, condition, {
          component,
          operation,
          environment
        });
      }
    }
  }

  /**
   * Group metrics for evaluation
   */
  private groupMetricsForEvaluation(metrics: any[]): Map<string, any[]> {
    const groups = new Map<string, any[]>();

    for (const metric of metrics) {
      const component = metric.dimensions?.component || 'unknown';
      const operation = metric.dimensions?.operation || 'unknown';
      const environment = metric.environment || 'development';
      
      const groupKey = `${component}:${operation}:${environment}`;
      const existing = groups.get(groupKey) || [];
      existing.push(metric);
      groups.set(groupKey, existing);
    }

    return groups;
  }

  /**
   * Parse group key
   */
  private parseGroupKey(groupKey: string): {
    component: string;
    operation: string;
    environment: string;
  } {
    const [component, operation, environment] = groupKey.split(':');
    return {
      component: component || 'unknown',
      operation: operation || 'unknown',
      environment: environment || 'development'
    };
  }

  /**
   * Evaluate condition for a specific metric group
   */
  private async evaluateConditionForGroup(
    condition: AlertCondition,
    metrics: any[]
  ): Promise<{
    triggered: boolean;
    value: number;
    threshold: number;
    details: any;
  }> {
    const { operator, threshold, duration, aggregation } = condition;
    
    // Filter metrics within the duration window
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - duration * 1000);
    const recentMetrics = metrics.filter(m => m.timestamp >= cutoffTime);

    if (recentMetrics.length === 0) {
      return {
        triggered: false,
        value: 0,
        threshold,
        details: { reason: 'No recent metrics' }
      };
    }

    // Calculate aggregated value
    let aggregatedValue: number;
    switch (aggregation) {
      case 'sum':
        aggregatedValue = recentMetrics.reduce((sum, m) => sum + m.value, 0);
        break;
      case 'avg':
        aggregatedValue = recentMetrics.reduce((sum, m) => sum + m.value, 0) / recentMetrics.length;
        break;
      case 'min':
        aggregatedValue = Math.min(...recentMetrics.map(m => m.value));
        break;
      case 'max':
        aggregatedValue = Math.max(...recentMetrics.map(m => m.value));
        break;
      case 'median':
        const sorted = [...recentMetrics.map(m => m.value)].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        aggregatedValue = sorted.length % 2 === 0 
          ? (sorted[mid - 1] + sorted[mid]) / 2 
          : sorted[mid];
        break;
      case 'p95':
        const p95Index = Math.floor(recentMetrics.length * 0.95);
        aggregatedValue = [...recentMetrics.map(m => m.value)].sort((a, b) => a - b)[p95Index];
        break;
      case 'p99':
        const p99Index = Math.floor(recentMetrics.length * 0.99);
        aggregatedValue = [...recentMetrics.map(m => m.value)].sort((a, b) => a - b)[p99Index];
        break;
      case 'trend':
        aggregatedValue = this.calculateTrend(recentMetrics);
        break;
      case 'anomaly':
        aggregatedValue = this.calculateAnomalyScore(recentMetrics);
        break;
      default:
        aggregatedValue = recentMetrics.reduce((sum, m) => sum + m.value, 0) / recentMetrics.length;
    }

    // Evaluate condition
    let triggered = false;
    switch (operator) {
      case 'gt':
        triggered = aggregatedValue > threshold;
        break;
      case 'gte':
        triggered = aggregatedValue >= threshold;
        break;
      case 'lt':
        triggered = aggregatedValue < threshold;
        break;
      case 'lte':
        triggered = aggregatedValue <= threshold;
        break;
      case 'eq':
        triggered = aggregatedValue === threshold;
        break;
      case 'ne':
        triggered = aggregatedValue !== threshold;
        break;
      case 'trend':
        triggered = Math.abs(aggregatedValue) > threshold;
        break;
      case 'anomaly':
        triggered = aggregatedValue > threshold;
        break;
      default:
        triggered = false;
    }

    return {
      triggered,
      value: aggregatedValue,
      threshold,
      details: {
        operator,
        aggregation,
        sampleSize: recentMetrics.length,
        timeWindow: duration
      }
    };
  }

  /**
   * Calculate trend
   */
  private calculateTrend(metrics: any[]): number {
    if (metrics.length < 3) return 0;

    // Sort by timestamp
    const sorted = metrics.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    // Calculate linear regression
    const n = sorted.length;
    const x = sorted.map((_, i) => i);
    const y = sorted.map(m => m.value);
    
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    
    // Return percentage change
    const avgY = sumY / n;
    return avgY > 0 ? (slope / avgY) * 100 : 0;
  }

  /**
   * Calculate anomaly score
   */
  private calculateAnomalyScore(metrics: any[]): number {
    if (metrics.length < 3) return 0;

    const values = metrics.map(m => m.value);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    // Calculate Z-scores and find the maximum
    const zScores = values.map(v => Math.abs((v - mean) / stdDev));
    const maxZScore = Math.max(...zScores);

    // Normalize to 0-1 range (capped at 3 standard deviations)
    return Math.min(maxZScore / 3, 1);
  }

  /**
   * Trigger an alert
   */
  private async triggerAlert(
    rule: DurationAlertRule,
    condition: AlertCondition,
    evaluation: any,
    context: {
      component: string;
      operation: string;
      environment: Environment;
    }
  ): Promise<void> {
    const alertId = `${rule.id}:${context.component}:${context.operation}:${context.environment}`;
    
    // Check if alert is already active
    if (this.activeAlerts.has(alertId)) {
      return; // Alert already active
    }

    // Check if alert is suppressed
    if (this.isAlertSuppressed(alertId)) {
      return; // Alert is suppressed
    }

    // Check cooldown period
    if (this.isAlertInCooldown(alertId, rule.cooldownPeriod)) {
      return; // Alert is in cooldown
    }

    // Determine threshold type and severity
    const thresholdType = this.determineThresholdType(evaluation.value, rule.durationThresholds);
    const severity = this.determineSeverity(thresholdType, rule.severity);

    // Create alert
    const alert: DurationAlert = {
      id: alertId,
      ruleId: rule.id,
      ruleName: rule.name,
      metricId: rule.metricId,
      currentValue: evaluation.value,
      thresholdValue: evaluation.threshold,
      thresholdType,
      component: context.component,
      operation: context.operation,
      environment: context.environment,
      severity,
      status: 'active',
      message: this.generateAlertMessage(rule, condition, evaluation, context),
      details: {
        condition,
        evaluation,
        rule,
        context
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      acknowledgedAt: undefined,
      resolvedAt: undefined,
      acknowledgedBy: undefined,
      resolvedBy: undefined,
      resolution: undefined,
      metadata: {
        evaluationTime: new Date(),
        sampleSize: evaluation.details.sampleSize,
        timeWindow: evaluation.details.timeWindow
      }
    };

    // Add trend data if trend analysis is enabled
    if (rule.trendAnalysis.enabled) {
      alert.trendData = await this.calculateTrendData(rule, context);
    }

    // Add anomaly data if anomaly detection is enabled
    if (rule.anomalyDetection.enabled) {
      alert.anomalyData = await this.calculateAnomalyData(rule, context);
    }

    // Add duration analysis
    alert.durationAnalysis = await this.calculateDurationAnalysis(rule, context);

    // Store alert
    this.alerts.set(alertId, alert);
    this.activeAlerts.set(alertId, alert);

    // Record alert creation duration
    this.durationTrackingSystem.recordDuration(
      'alert_creation_duration_ms',
      Date.now() - new Date().getTime(),
      {
        component: 'duration_alerting_engine',
        operation: 'create_alert',
        alertId,
        ruleId: rule.id,
        severity,
        thresholdType
      },
      {
        operationType: 'alert_creation',
        alertId,
        ruleId: rule.id,
        severity,
        thresholdType
      }
    );

    // Execute alert actions
    await this.executeAlertActions(rule, alert);

    console.log(`[DURATION_ALERTING] Alert triggered: ${alert.message}`);
    this.emit('alertTriggered', alert);
  }

  /**
   * Determine threshold type
   */
  private determineThresholdType(
    value: number,
    thresholds: { warning: number; error: number; critical: number }
  ): 'warning' | 'error' | 'critical' {
    if (value >= thresholds.critical) {
      return 'critical';
    } else if (value >= thresholds.error) {
      return 'error';
    } else if (value >= thresholds.warning) {
      return 'warning';
    }
    return 'warning';
  }

  /**
   * Determine severity
   */
  private determineSeverity(
    thresholdType: 'warning' | 'error' | 'critical',
    ruleSeverity: AlertSeverity
  ): AlertSeverity {
    if (thresholdType === 'critical') {
      return 'critical';
    } else if (thresholdType === 'error') {
      return ruleSeverity === 'info' ? 'error' : ruleSeverity;
    }
    return ruleSeverity;
  }

  /**
   * Generate alert message
   */
  private generateAlertMessage(
    rule: DurationAlertRule,
    condition: AlertCondition,
    evaluation: any,
    context: {
      component: string;
      operation: string;
      environment: Environment;
    }
  ): string {
    const { component, operation, environment } = context;
    const { operator, threshold, aggregation } = condition;
    const { value } = evaluation;
    
    let message = `Duration alert triggered for ${rule.metricId}`;
    
    if (component !== 'unknown') {
      message += ` in component ${component}`;
    }
    
    if (operation !== 'unknown') {
      message += ` for operation ${operation}`;
    }
    
    message += ` in ${environment} environment`;
    
    message += `. ${aggregation} duration (${value.toFixed(2)}ms) is ${operator} threshold (${threshold}ms)`;
    
    return message;
  }

  /**
   * Calculate trend data
   */
  private async calculateTrendData(
    rule: DurationAlertRule,
    context: {
      component: string;
      operation: string;
      environment: Environment;
    }
  ): Promise<any> {
    const { windowSize, threshold } = rule.trendAnalysis;
    
    // Get metrics for trend analysis
    const cutoffTime = new Date(Date.now() - windowSize * 60 * 1000);
    const metrics = this.durationTrackingSystem.getMetrics({
      source: 'duration_alerting_engine',
      timeRange: { start: cutoffTime, end: new Date() },
      filters: {
        component: context.component,
        operation: context.operation,
        environment: context.environment
      }
    });

    if (metrics.length < 3) {
      return {
        direction: 'stable',
        percentage: 0,
        windowSize
      };
    }

    const trend = this.calculateTrend(metrics);
    const direction = trend > threshold ? 'increasing' : trend < -threshold ? 'decreasing' : 'stable';

    return {
      direction,
      percentage: Math.abs(trend),
      windowSize
    };
  }

  /**
   * Calculate anomaly data
   */
  private async calculateAnomalyData(
    rule: DurationAlertRule,
    context: {
      component: string;
      operation: string;
      environment: Environment;
    }
  ): Promise<any> {
    const { windowSize, sensitivity } = rule.anomalyDetection;
    
    // Get metrics for anomaly detection
    const cutoffTime = new Date(Date.now() - windowSize * 60 * 1000);
    const metrics = this.durationTrackingSystem.getMetrics({
      source: 'duration_alerting_engine',
      timeRange: { start: cutoffTime, end: new Date() },
      filters: {
        component: context.component,
        operation: context.operation,
        environment: context.environment
      }
    });

    if (metrics.length < 3) {
      return {
        score: 0,
        sensitivity,
        windowSize
      };
    }

    const score = this.calculateAnomalyScore(metrics);

    return {
      score,
      sensitivity,
      windowSize
    };
  }

  /**
   * Calculate duration analysis
   */
  private async calculateDurationAnalysis(
    rule: DurationAlertRule,
    context: {
      component: string;
      operation: string;
      environment: Environment;
    }
  ): Promise<any> {
    // Get recent metrics for analysis
    const cutoffTime = new Date(Date.now() - 60 * 60 * 1000); // Last hour
    const metrics = this.durationTrackingSystem.getMetrics({
      source: 'duration_alerting_engine',
      timeRange: { start: cutoffTime, end: new Date() },
      filters: {
        component: context.component,
        operation: context.operation,
        environment: context.environment
      }
    });

    if (metrics.length === 0) {
      return {
        avgDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        p95Duration: 0,
        p99Duration: 0,
        sampleSize: 0
      };
    }

    const values = metrics.map(m => m.value);
    const sorted = [...values].sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95);
    const p99Index = Math.floor(sorted.length * 0.99);

    return {
      avgDuration: values.reduce((sum, v) => sum + v, 0) / values.length,
      minDuration: Math.min(...values),
      maxDuration: Math.max(...values),
      p95Duration: sorted[p95Index] || 0,
      p99Duration: sorted[p99Index] || 0,
      sampleSize: values.length
    };
  }

  /**
   * Execute alert actions
   */
  private async executeAlertActions(rule: DurationAlertRule, alert: DurationAlert): Promise<void> {
    for (const action of rule.actions) {
      try {
        await this.executeAlertAction(action, alert);
      } catch (error) {
        console.error(`[DURATION_ALERTING] Error executing action ${action.type}:`, error);
      }
    }
  }

  /**
   * Execute a specific alert action
   */
  private async executeAlertAction(action: AlertAction, alert: DurationAlert): Promise<void> {
    switch (action.type) {
      case 'alert':
        // Send notification through configured channels
        await this.sendNotification(alert, action);
        break;
      case 'log':
        console.log(`[DURATION_ALERTING] Alert: ${alert.message}`);
        break;
      case 'webhook':
        await this.sendWebhook(alert, action);
        break;
      case 'email':
        await this.sendEmail(alert, action);
        break;
      case 'slack':
        await this.sendSlack(alert, action);
        break;
      default:
        console.log(`[DURATION_ALERTING] Unknown action type: ${action.type}`);
    }
  }

  /**
   * Send notification
   */
  private async sendNotification(alert: DurationAlert, action: AlertAction): Promise<void> {
    // This would integrate with the monitoring system's notification channels
    console.log(`[DURATION_ALERTING] Notification sent for alert ${alert.id}: ${alert.message}`);
    this.emit('notificationSent', { alert, action });
  }

  /**
   * Send webhook
   */
  private async sendWebhook(alert: DurationAlert, action: AlertAction): Promise<void> {
    const webhookUrl = action.config?.url;
    if (!webhookUrl) {
      console.error('[DURATION_ALERTING] Webhook URL not configured');
      return;
    }

    const payload = {
      alert: {
        id: alert.id,
        message: alert.message,
        severity: alert.severity,
        component: alert.component,
        operation: alert.operation,
        environment: alert.environment,
        currentValue: alert.currentValue,
        thresholdValue: alert.thresholdValue,
        thresholdType: alert.thresholdType,
        createdAt: alert.createdAt
      }
    };

    // This would make an actual HTTP request
    console.log(`[DURATION_ALERTING] Webhook sent to ${webhookUrl}:`, payload);
    this.emit('webhookSent', { alert, payload });
  }

  /**
   * Send email
   */
  private async sendEmail(alert: DurationAlert, action: AlertAction): Promise<void> {
    const recipients = action.config?.recipients;
    if (!recipients || recipients.length === 0) {
      console.error('[DURATION_ALERTING] Email recipients not configured');
      return;
    }

    const emailContent = {
      to: recipients,
      subject: `Duration Alert: ${alert.message}`,
      body: `
        Alert Details:
        - ID: ${alert.id}
        - Message: ${alert.message}
        - Severity: ${alert.severity}
        - Component: ${alert.component}
        - Operation: ${alert.operation}
        - Environment: ${alert.environment}
        - Current Value: ${alert.currentValue}ms
        - Threshold: ${alert.thresholdValue}ms
        - Threshold Type: ${alert.thresholdType}
        - Created At: ${alert.createdAt}
        
        Additional Details:
        ${JSON.stringify(alert.details, null, 2)}
      `
    };

    // This would send an actual email
    console.log(`[DURATION_ALERTING] Email sent to ${recipients.join(', ')}:`, emailContent);
    this.emit('emailSent', { alert, emailContent });
  }

  /**
   * Send Slack message
   */
  private async sendSlack(alert: DurationAlert, action: AlertAction): Promise<void> {
    const channel = action.config?.channel;
    if (!channel) {
      console.error('[DURATION_ALERTING] Slack channel not configured');
      return;
    }

    const slackMessage = {
      channel,
      text: `🚨 Duration Alert: ${alert.message}`,
      attachments: [
        {
          color: this.getSlackColor(alert.severity),
          fields: [
            { title: 'Severity', value: alert.severity, short: true },
            { title: 'Component', value: alert.component, short: true },
            { title: 'Operation', value: alert.operation, short: true },
            { title: 'Environment', value: alert.environment, short: true },
            { title: 'Current Value', value: `${alert.currentValue}ms`, short: true },
            { title: 'Threshold', value: `${alert.thresholdValue}ms`, short: true }
          ],
          timestamp: Math.floor(alert.createdAt.getTime() / 1000)
        }
      ]
    };

    // This would send an actual Slack message
    console.log(`[DURATION_ALERTING] Slack message sent to ${channel}:`, slackMessage);
    this.emit('slackSent', { alert, slackMessage });
  }

  /**
   * Get Slack color based on severity
   */
  private getSlackColor(severity: AlertSeverity): string {
    switch (severity) {
      case 'critical':
        return 'danger';
      case 'error':
        return 'warning';
      case 'warning':
        return 'warning';
      case 'info':
        return 'good';
      default:
        return 'good';
    }
  }

  /**
   * Check if alert is suppressed
   */
  private isAlertSuppressed(alertId: string): boolean {
    const suppressedUntil = this.suppressedAlerts.get(alertId);
    if (!suppressedUntil) return false;
    
    return suppressedUntil > new Date();
  }

  /**
   * Check if alert is in cooldown
   */
  private isAlertInCooldown(alertId: string, cooldownMinutes: number): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;
    
    const cooldownEnd = new Date(alert.createdAt.getTime() + cooldownMinutes * 60 * 1000);
    return cooldownEnd > new Date();
  }

  /**
   * Process alert lifecycle (suppression, resolution, etc.)
   */
  private async processAlertLifecycle(): Promise<void> {
    // Clean up expired suppressions
    const now = new Date();
    for (const [alertId, suppressedUntil] of this.suppressedAlerts.entries()) {
      if (suppressedUntil <= now) {
        this.suppressedAlerts.delete(alertId);
      }
    }

    // Check for alert resolution
    for (const [alertId, alert] of this.activeAlerts.entries()) {
      const rule = this.rules.get(alert.ruleId);
      if (!rule) continue;

      // Get recent metrics to check if condition is still met
      const metrics = this.durationTrackingSystem.getMetrics({
        source: 'duration_alerting_engine',
        filters: {
          component: alert.component,
          operation: alert.operation,
          environment: alert.environment
        }
      });

      const condition = rule.conditions[0]; // Check first condition
      if (condition) {
        const evaluation = await this.evaluateConditionForGroup(condition, metrics);
        
        if (!evaluation.triggered) {
          await this.resolveAlert(alertId, 'Condition no longer met');
        }
      }
    }
  }

  /**
   * Check alert resolution
   */
  private async checkAlertResolution(
    rule: DurationAlertRule,
    condition: AlertCondition,
    context: {
      component: string;
      operation: string;
      environment: Environment;
    }
  ): Promise<void> {
    const alertId = `${rule.id}:${context.component}:${context.operation}:${context.environment}`;
    const alert = this.activeAlerts.get(alertId);
    
    if (alert) {
      await this.resolveAlert(alertId, 'Condition resolved');
    }
  }

  /**
   * Resolve an alert
   */
  private async resolveAlert(alertId: string, resolution: string): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return;

    // Update alert
    alert.status = 'resolved';
    alert.resolvedAt = new Date();
    alert.resolution = resolution;

    // Move from active to resolved
    this.activeAlerts.delete(alertId);
    this.alerts.set(alertId, alert);

    // Record alert resolution duration
    this.durationTrackingSystem.recordDuration(
      'alert_resolution_duration_ms',
      Date.now() - alert.createdAt.getTime(),
      {
        component: 'duration_alerting_engine',
        operation: 'resolve_alert',
        alertId,
        ruleId: alert.ruleId,
        resolution
      },
      {
        operationType: 'alert_resolution',
        alertId,
        ruleId: alert.ruleId,
        resolution
      }
    );

    console.log(`[DURATION_ALERTING] Alert resolved: ${alert.message}`);
    this.emit('alertResolved', alert);
  }

  /**
   * Acknowledge an alert
   */
  public async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<boolean> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return false;

    alert.status = 'acknowledged';
    alert.acknowledgedAt = new Date();
    alert.acknowledgedBy = acknowledgedBy;

    // Record alert acknowledgment duration
    this.durationTrackingSystem.recordDuration(
      'alert_acknowledgment_duration_ms',
      Date.now() - alert.createdAt.getTime(),
      {
        component: 'duration_alerting_engine',
        operation: 'acknowledge_alert',
        alertId,
        acknowledgedBy
      },
      {
        operationType: 'alert_acknowledgment',
        alertId,
        acknowledgedBy
      }
    );

    console.log(`[DURATION_ALERTING] Alert acknowledged: ${alert.message} by ${acknowledgedBy}`);
    this.emit('alertAcknowledged', alert);
    return true;
  }

  /**
   * Suppress an alert
   */
  public async suppressAlert(alertId: string, durationMinutes: number): Promise<boolean> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return false;

    const suppressedUntil = new Date(Date.now() + durationMinutes * 60 * 1000);
    this.suppressedAlerts.set(alertId, suppressedUntil);

    console.log(`[DURATION_ALERTING] Alert suppressed: ${alert.message} until ${suppressedUntil}`);
    this.emit('alertSuppressed', { alert, suppressedUntil });
    return true;
  }

  /**
   * Get alerts
   */
  public getAlerts(filter?: {
    status?: AlertStatus;
    severity?: AlertSeverity;
    ruleId?: string;
    component?: string;
    operation?: string;
    environment?: Environment;
  }): DurationAlert[] {
    let alerts = Array.from(this.alerts.values());

    if (filter) {
      if (filter.status) {
        alerts = alerts.filter(a => a.status === filter.status);
      }
      if (filter.severity) {
        alerts = alerts.filter(a => a.severity === filter.severity);
      }
      if (filter.ruleId) {
        alerts = alerts.filter(a => a.ruleId === filter.ruleId);
      }
      if (filter.component) {
        alerts = alerts.filter(a => a.component === filter.component);
      }
      if (filter.operation) {
        alerts = alerts.filter(a => a.operation === filter.operation);
      }
      if (filter.environment) {
        alerts = alerts.filter(a => a.environment === filter.environment);
      }
    }

    return alerts;
  }

  /**
   * Get active alerts
   */
  public getActiveAlerts(): DurationAlert[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Get alert rules
   */
  public getRules(): DurationAlertRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Update alert rule
   */
  public updateRule(ruleId: string, updates: Partial<DurationAlertRule>): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) return false;

    const updatedRule = {
      ...rule,
      ...updates,
      updatedAt: new Date()
    };

    this.rules.set(ruleId, updatedRule);
    this.emit('ruleUpdated', updatedRule);
    return true;
  }

  /**
   * Delete alert rule
   */
  public deleteRule(ruleId: string): boolean {
    const deleted = this.rules.delete(ruleId);
    if (deleted) {
      this.emit('ruleDeleted', { ruleId });
    }
    return deleted;
  }

  /**
   * Set up event forwarding
   */
  private setupEventForwarding(): void {
    // Forward alerting events to duration tracking system
    this.durationTrackingSystem.on('metric_collected', (data) => {
      this.emit('durationMetricCollected', {
        ...data,
        source: 'duration_alerting_engine'
      });
    });

    this.durationTrackingSystem.on('quality_validated', (data) => {
      this.emit('durationQualityValidated', {
        ...data,
        source: 'duration_alerting_engine'
      });
    });

    this.durationTrackingSystem.on('alert_triggered', (data) => {
      this.emit('durationAlertTriggered', {
        ...data,
        source: 'duration_alerting_engine'
      });
    });

    this.durationTrackingSystem.on('aggregation_completed', (data) => {
      this.emit('durationAggregationCompleted', {
        ...data,
        source: 'duration_alerting_engine'
      });
    });

    this.durationTrackingSystem.on('trend_detected', (data) => {
      this.emit('durationTrendDetected', {
        ...data,
        source: 'duration_alerting_engine'
      });
    });

    this.durationTrackingSystem.on('anomaly_detected', (data) => {
      this.emit('durationAnomalyDetected', {
        ...data,
        source: 'duration_alerting_engine'
      });
    });

    this.durationTrackingSystem.on('report_generated', (data) => {
      this.emit('durationReportGenerated', {
        ...data,
        source: 'duration_alerting_engine'
      });
    });
  }
}