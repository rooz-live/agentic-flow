/**
 * Risk Monitoring and Alerting System
 * 
 * Implements real-time risk monitoring with configurable thresholds,
 * multi-level alerting system, risk escalation workflows with automatic
 * notifications, risk dashboard with real-time status updates, and
 * risk trend monitoring with predictive alerting
 */

import { EventEmitter } from 'events';
import { OrchestrationFramework } from '../../core/orchestration-framework';

import {
  Risk,
  RiskAssessmentEvent,
  RiskSeverity,
  RiskStatus,
  ROAMCategory,
  RiskMetrics
} from '../core/types';

// Alert levels and types
export type AlertLevel = 'info' | 'warning' | 'critical' | 'emergency';
export type AlertType = 'threshold' | 'trend' | 'escalation' | 'prediction' | 'compliance' | 'system';

// Alert configuration
export interface AlertConfig {
  id: string;
  name: string;
  description: string;
  level: AlertLevel;
  type: AlertType;
  enabled: boolean;
  conditions: {
    metric: string;
    operator: '>' | '<' | '=' | '>=' | '<=' | 'changes' | 'rate';
    value?: number;
    rateThreshold?: number; // For rate-based alerts
    timeWindow?: number; // In minutes
  }[];
  filters?: {
    riskIds?: string[];
    severities?: RiskSeverity[];
    categories?: ROAMCategory[];
    domains?: string[];
    owners?: string[];
  };
  notificationChannels: ('email' | 'slack' | 'dashboard' | 'sms' | 'webhook')[];
  recipients: string[];
  escalationRules?: {
    delay: number; // in minutes
    level: AlertLevel;
    recipients: string[];
    conditions?: string[]; // Additional conditions for escalation
  }[];
  cooldownPeriod: number; // in minutes
  isActive: boolean;
  createdAt: Date;
  lastTriggered?: Date;
}

// Alert instance
export interface Alert {
  id: string;
  configId: string;
  level: AlertLevel;
  type: AlertType;
  title: string;
  message: string;
  riskIds: string[];
  triggeredAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
  escalated: boolean;
  escalationLevel: number;
  metadata: Record<string, any>;
  notificationsSent: {
    channel: string;
    recipient: string;
    sentAt: Date;
    status: 'sent' | 'failed' | 'pending';
  }[];
}

// Risk monitoring configuration
export interface RiskMonitoringConfig {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  monitoringInterval: number; // in minutes
  riskMetrics: {
    enabled: boolean;
    metrics: string[];
    aggregation: 'realtime' | 'periodic' | 'event_driven';
  };
  trendAnalysis: {
    enabled: boolean;
    lookbackPeriod: number; // in days
    predictionHorizon: number; // in days
    algorithms: ('linear_regression' | 'moving_average' | 'exponential_smoothing')[];
  };
  dashboard: {
    enabled: boolean;
    refreshInterval: number; // in seconds
    defaultViews: string[];
  };
  retention: {
    alerts: number; // in days
    metrics: number; // in days
    snapshots: number; // in days
  };
  integration: {
    orchestrationFramework: boolean;
    healthChecks: boolean;
    agentDB: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Risk monitoring snapshot
export interface RiskMonitoringSnapshot {
  id: string;
  timestamp: Date;
  totalRisks: number;
  risksByStatus: Record<RiskStatus, number>;
  risksBySeverity: Record<RiskSeverity, number>;
  risksByCategory: Record<ROAMCategory, number>;
  averageRiskScore: number;
  criticalRiskCount: number;
  highRiskCount: number;
  trends: {
    scoreTrend: 'increasing' | 'decreasing' | 'stable';
    newRisksTrend: 'increasing' | 'decreasing' | 'stable';
    resolutionTrend: 'improving' | 'deteriorating' | 'stable';
  };
  alerts: {
    active: number;
    critical: number;
    warning: number;
    info: number;
  };
  systemHealth: {
    monitoring: 'healthy' | 'warning' | 'critical';
    lastUpdate: Date;
    errors: string[];
  };
}

// Risk trend data
export interface RiskTrendData {
  riskId: string;
  metric: string;
  timestamps: Date[];
  values: number[];
  trend: {
    direction: 'increasing' | 'decreasing' | 'stable';
    slope: number;
    confidence: number;
  };
  prediction?: {
    nextValue: number;
    confidence: number;
    horizon: number;
  };
}

// Monitoring dashboard data
export interface MonitoringDashboardData {
  id: string;
  name: string;
  description: string;
  lastUpdated: Date;
  summary: {
    totalRisks: number;
    activeAlerts: number;
    criticalRisks: number;
    averageRiskScore: number;
    systemHealth: 'healthy' | 'warning' | 'critical';
  };
  riskDistribution: {
    byStatus: Record<RiskStatus, number>;
    bySeverity: Record<RiskSeverity, number>;
    byCategory: Record<ROAMCategory, number>;
  };
  recentAlerts: Alert[];
  riskTrends: RiskTrendData[];
  topRisks: Risk[];
  systemMetrics: {
    monitoringLag: number; // in minutes
    alertProcessingTime: number; // in seconds
    dataFreshness: number; // in minutes
  };
}

export class RiskMonitoringSystem extends EventEmitter {
  private config: RiskMonitoringConfig;
  private alertConfigs: Map<string, AlertConfig> = new Map();
  private alerts: Map<string, Alert> = new Map();
  private snapshots: RiskMonitoringSnapshot[] = [];
  private trendData: Map<string, RiskTrendData[]> = new Map();
  private monitoringInterval?: NodeJS.Timeout;
  private alertCooldowns: Map<string, Date> = new Map();
  private orchestrationFramework?: OrchestrationFramework;
  private risks: Map<string, Risk> = new Map();

  constructor(config: RiskMonitoringConfig, orchestrationFramework?: OrchestrationFramework) {
    super();
    this.config = config;
    this.orchestrationFramework = orchestrationFramework;

    // Initialize with default alert configurations
    this.initializeDefaultAlertConfigs();
  }

  private initializeDefaultAlertConfigs(): void {
    // Critical risk alert
    this.createAlertConfig({
      name: 'Critical Risk Alert',
      description: 'Alert when critical risks are detected',
      level: 'critical',
      type: 'threshold',
      enabled: true,
      conditions: [
        { metric: 'criticalRiskCount', operator: '>', value: 0 }
      ],
      notificationChannels: ['email', 'dashboard'],
      recipients: ['risk-team@company.com'],
      cooldownPeriod: 30
    });

    // High risk count alert
    this.createAlertConfig({
      name: 'High Risk Count Alert',
      description: 'Alert when number of high risks exceeds threshold',
      level: 'warning',
      type: 'threshold',
      enabled: true,
      conditions: [
        { metric: 'highRiskCount', operator: '>', value: 5 }
      ],
      notificationChannels: ['email', 'dashboard'],
      recipients: ['risk-team@company.com'],
      cooldownPeriod: 60
    });

    // Risk score trend alert
    this.createAlertConfig({
      name: 'Risk Score Trend Alert',
      description: 'Alert when average risk score is increasing',
      level: 'warning',
      type: 'trend',
      enabled: true,
      conditions: [
        { metric: 'averageRiskScore', operator: 'changes', rateThreshold: 0.1, timeWindow: 1440 } // 24 hours
      ],
      notificationChannels: ['dashboard'],
      recipients: ['risk-team@company.com'],
      cooldownPeriod: 240
    });

    // System health alert
    this.createAlertConfig({
      name: 'System Health Alert',
      description: 'Alert when monitoring system health is degraded',
      level: 'critical',
      type: 'system',
      enabled: true,
      conditions: [
        { metric: 'systemHealth', operator: '=', value: 0 } // 0 = critical
      ],
      notificationChannels: ['email', 'slack'],
      recipients: ['ops-team@company.com'],
      cooldownPeriod: 15
    });
  }

  // Configuration management
  public updateConfig(updates: Partial<RiskMonitoringConfig>): void {
    this.config = { ...this.config, ...updates, updatedAt: new Date() };

    // Restart monitoring if interval changed
    if (updates.monitoringInterval && this.monitoringInterval) {
      this.stopMonitoring();
      if (this.config.enabled) {
        this.startMonitoring();
      }
    }

    this.emit('monitoringConfigUpdated', {
      type: 'monitoring_config_updated',
      timestamp: new Date(),
      data: { config: this.config },
      description: 'Risk monitoring configuration updated'
    } as RiskAssessmentEvent);
  }

  // Alert configuration management
  public createAlertConfig(config: Omit<AlertConfig, 'id' | 'createdAt' | 'isActive'>): AlertConfig {
    const newConfig: AlertConfig = {
      ...config,
      id: this.generateId('alert-config'),
      createdAt: new Date(),
      isActive: true
    };

    this.alertConfigs.set(newConfig.id, newConfig);

    this.emit('alertConfigCreated', {
      type: 'alert_config_created',
      timestamp: new Date(),
      data: { config: newConfig },
      description: `Alert config created: ${newConfig.name}`
    } as RiskAssessmentEvent);

    return newConfig;
  }

  public updateAlertConfig(id: string, updates: Partial<AlertConfig>): AlertConfig | undefined {
    const config = this.alertConfigs.get(id);
    if (!config) {
      return undefined;
    }

    const updatedConfig = { ...config, ...updates };
    this.alertConfigs.set(id, updatedConfig);

    this.emit('alertConfigUpdated', {
      type: 'alert_config_updated',
      timestamp: new Date(),
      data: { config: updatedConfig },
      description: `Alert config updated: ${updatedConfig.name}`
    } as RiskAssessmentEvent);

    return updatedConfig;
  }

  public deleteAlertConfig(id: string): boolean {
    const config = this.alertConfigs.get(id);
    if (!config) {
      return false;
    }

    this.alertConfigs.delete(id);

    this.emit('alertConfigDeleted', {
      type: 'alert_config_deleted',
      timestamp: new Date(),
      data: { configId: id, configName: config.name },
      description: `Alert config deleted: ${config.name}`
    } as RiskAssessmentEvent);

    return true;
  }

  // Monitoring control
  public startMonitoring(): void {
    if (this.monitoringInterval) {
      return;
    }

    console.log(`[MONITORING] Starting risk monitoring (interval: ${this.config.monitoringInterval} minutes)`);

    this.monitoringInterval = setInterval(async () => {
      await this.performMonitoringCycle();
    }, this.config.monitoringInterval * 60 * 1000);

    // Perform initial monitoring cycle
    this.performMonitoringCycle();

    this.emit('monitoringStarted', {
      type: 'monitoring_started',
      timestamp: new Date(),
      data: { config: this.config },
      description: 'Risk monitoring system started'
    } as RiskAssessmentEvent);
  }

  public stopMonitoring(): void {
    if (!this.monitoringInterval) {
      return;
    }

    clearInterval(this.monitoringInterval);
    this.monitoringInterval = undefined;

    this.emit('monitoringStopped', {
      type: 'monitoring_stopped',
      timestamp: new Date(),
      data: { config: this.config },
      description: 'Risk monitoring system stopped'
    } as RiskAssessmentEvent);
  }

  // Main monitoring cycle
  private async performMonitoringCycle(): Promise<void> {
    try {
      console.log('[MONITORING] Performing monitoring cycle');

      // Create monitoring snapshot
      const snapshot = await this.createMonitoringSnapshot();
      this.snapshots.push(snapshot);

      // Analyze trends
      if (this.config.trendAnalysis.enabled) {
        await this.analyzeTrends();
      }

      // Check alert conditions
      await this.checkAlertConditions(snapshot);

      // Clean up old data
      this.cleanupOldData();

      // Update dashboard
      if (this.config.dashboard.enabled) {
        await this.updateDashboard();
      }

    } catch (error) {
      console.error('[MONITORING] Monitoring cycle failed:', error);
      this.emit('monitoringError', {
        type: 'monitoring_error',
        timestamp: new Date(),
        data: { error: error instanceof Error ? error.message : String(error) },
        description: 'Risk monitoring cycle failed'
      } as RiskAssessmentEvent);
    }
  }

  private async createMonitoringSnapshot(): Promise<RiskMonitoringSnapshot> {
    const now = new Date();
    const risks = Array.from(this.risks.values());

    // Calculate risk statistics
    const risksByStatus: Record<RiskStatus, number> = {
      identified: 0,
      assessing: 0,
      assessed: 0,
      mitigating: 0,
      monitoring: 0,
      closed: 0
    };

    const risksBySeverity: Record<RiskSeverity, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };

    const risksByCategory: Record<ROAMCategory, number> = {
      resolved: 0,
      owned: 0,
      accepted: 0,
      mitigated: 0
    };

    let totalScore = 0;
    let criticalRiskCount = 0;
    let highRiskCount = 0;

    for (const risk of risks) {
      risksByStatus[risk.status]++;
      risksBySeverity[risk.severity]++;
      risksByCategory[risk.category]++;
      
      totalScore += risk.score;
      
      if (risk.severity === 'critical') {
        criticalRiskCount++;
      } else if (risk.severity === 'high') {
        highRiskCount++;
      }
    }

    const averageRiskScore = risks.length > 0 ? totalScore / risks.length : 0;

    // Analyze trends
    const trends = this.calculateTrends(risks);

    // Calculate alert statistics
    const activeAlerts = Array.from(this.alerts.values()).filter(alert => !alert.resolvedAt);
    const alertStats = {
      active: activeAlerts.length,
      critical: activeAlerts.filter(alert => alert.level === 'critical').length,
      warning: activeAlerts.filter(alert => alert.level === 'warning').length,
      info: activeAlerts.filter(alert => alert.level === 'info').length
    };

    // Check system health
    const systemHealth = this.checkSystemHealth();

    const snapshot: RiskMonitoringSnapshot = {
      id: this.generateId('snapshot'),
      timestamp: now,
      totalRisks: risks.length,
      risksByStatus,
      risksBySeverity,
      risksByCategory,
      averageRiskScore,
      criticalRiskCount,
      highRiskCount,
      trends,
      alerts: alertStats,
      systemHealth
    };

    this.emit('snapshotCreated', {
      type: 'snapshot_created',
      timestamp: now,
      data: { snapshot },
      description: 'Risk monitoring snapshot created'
    } as RiskAssessmentEvent);

    return snapshot;
  }

  private calculateTrends(risks: Risk[]): RiskMonitoringSnapshot['trends'] {
    // Simple trend calculation - in a real implementation, this would be more sophisticated
    const recentSnapshots = this.snapshots.slice(-5); // Last 5 snapshots
    
    if (recentSnapshots.length < 2) {
      return {
        scoreTrend: 'stable',
        newRisksTrend: 'stable',
        resolutionTrend: 'stable'
      };
    }

    const oldest = recentSnapshots[0];
    const newest = recentSnapshots[recentSnapshots.length - 1];

    // Score trend
    const scoreChange = newest.averageRiskScore - oldest.averageRiskScore;
    const scoreTrend = scoreChange > 5 ? 'increasing' : scoreChange < -5 ? 'decreasing' : 'stable';

    // New risks trend
    const riskCountChange = newest.totalRisks - oldest.totalRisks;
    const newRisksTrend = riskCountChange > 2 ? 'increasing' : riskCountChange < -2 ? 'decreasing' : 'stable';

    // Resolution trend (based on closed risks)
    const closedRisksChange = newest.risksByStatus.closed - oldest.risksByStatus.closed;
    const resolutionTrend = closedRisksChange > 0 ? 'improving' : closedRisksChange < 0 ? 'deteriorating' : 'stable';

    return {
      scoreTrend,
      newRisksTrend,
      resolutionTrend
    };
  }

  private checkSystemHealth(): RiskMonitoringSnapshot['systemHealth'] {
    const now = new Date();
    const errors: string[] = [];

    // Check if monitoring is running
    if (!this.monitoringInterval) {
      errors.push('Monitoring is not running');
    }

    // Check last update time
    const lastSnapshot = this.snapshots[this.snapshots.length - 1];
    if (lastSnapshot) {
      const timeSinceLastUpdate = now.getTime() - lastSnapshot.timestamp.getTime();
      if (timeSinceLastUpdate > this.config.monitoringInterval * 60 * 1000 * 2) {
        errors.push('Monitoring cycle delayed');
      }
    } else {
      errors.push('No monitoring snapshots available');
    }

    // Check alert processing
    const failedAlerts = Array.from(this.alerts.values())
      .filter(alert => alert.notificationsSent.some(n => n.status === 'failed'));
    
    if (failedAlerts.length > 0) {
      errors.push(`${failedAlerts.length} failed notifications`);
    }

    const status = errors.length === 0 ? 'healthy' : errors.length <= 2 ? 'warning' : 'critical';

    return {
      monitoring: status,
      lastUpdate: now,
      errors
    };
  }

  private async analyzeTrends(): Promise<void> {
    console.log('[MONITORING] Analyzing risk trends');

    const risks = Array.from(this.risks.values());
    const lookbackPeriod = this.config.trendAnalysis.lookbackPeriod * 24 * 60 * 60 * 1000; // Convert to milliseconds
    const now = new Date();

    for (const risk of risks) {
      // Get historical data for this risk
      const historicalData = this.getHistoricalRiskData(risk.id, lookbackPeriod);
      
      if (historicalData.length < 3) {
        continue; // Not enough data for trend analysis
      }

      // Analyze score trend
      const scoreTrend = this.analyzeMetricTrend(historicalData.map(d => d.score));
      
      const trendData: RiskTrendData = {
        riskId: risk.id,
        metric: 'score',
        timestamps: historicalData.map(d => d.timestamp),
        values: historicalData.map(d => d.score),
        trend: scoreTrend
      };

      // Generate prediction if enabled
      if (this.config.trendAnalysis.algorithms.includes('linear_regression')) {
        trendData.prediction = this.predictNextValue(historicalData.map(d => d.score));
      }

      // Store trend data
      if (!this.trendData.has(risk.id)) {
        this.trendData.set(risk.id, []);
      }
      this.trendData.get(risk.id)!.push(trendData);

      // Check for predictive alerts
      if (trendData.prediction && trendData.prediction.nextValue > 80) {
        await this.triggerPredictiveAlert(risk, trendData);
      }
    }
  }

  private getHistoricalRiskData(riskId: string, lookbackPeriod: number): Array<{ timestamp: Date; score: number }> {
    // Get historical data from snapshots
    // In a real implementation, this would query a time-series database
    const historicalData: Array<{ timestamp: Date; score: number }> = [];
    
    for (const snapshot of this.snapshots) {
      // This is a simplified approach - in reality, we'd store individual risk scores in snapshots
      historicalData.push({
        timestamp: snapshot.timestamp,
        score: snapshot.averageRiskScore // Using average as placeholder
      });
    }

    return historicalData.filter(d => 
      new Date().getTime() - d.timestamp.getTime() <= lookbackPeriod
    );
  }

  private analyzeMetricTrend(values: number[]): RiskTrendData['trend'] {
    if (values.length < 2) {
      return { direction: 'stable', slope: 0, confidence: 0 };
    }

    // Simple linear regression
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = values;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((total, xi, i) => total + xi * y[i], 0);
    const sumXX = x.reduce((total, xi) => total + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    
    // Calculate R-squared for confidence
    const yMean = sumY / n;
    const totalSumSquares = y.reduce((total, yi) => total + Math.pow(yi - yMean, 2), 0);
    const residualSumSquares = y.reduce((total, yi, i) => {
      const predictedY = slope * x[i] + (sumY - slope * sumX) / n;
      return total + Math.pow(yi - predictedY, 2);
    }, 0);
    
    const rSquared = 1 - (residualSumSquares / totalSumSquares);
    const confidence = Math.max(0, Math.min(1, rSquared));

    let direction: 'increasing' | 'decreasing' | 'stable';
    if (Math.abs(slope) < 0.1) {
      direction = 'stable';
    } else if (slope > 0) {
      direction = 'increasing';
    } else {
      direction = 'decreasing';
    }

    return { direction, slope, confidence };
  }

  private predictNextValue(values: number[]): RiskTrendData['prediction'] {
    if (values.length < 3) {
      return undefined;
    }

    // Simple linear regression prediction
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = values;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((total, xi, i) => total + xi * y[i], 0);
    const sumXX = x.reduce((total, xi) => total + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const nextValue = slope * n + intercept;
    
    // Calculate confidence based on historical accuracy
    const predictions = x.map(xi => slope * xi + intercept);
    const errors = y.map((yi, i) => Math.abs(yi - predictions[i]));
    const averageError = errors.reduce((a, b) => a + b, 0) / errors.length;
    const confidence = Math.max(0, 1 - (averageError / Math.max(...y)));

    return {
      nextValue,
      confidence,
      horizon: this.config.trendAnalysis.predictionHorizon
    };
  }

  private async checkAlertConditions(snapshot: RiskMonitoringSnapshot): Promise<void> {
    console.log('[MONITORING] Checking alert conditions');

    for (const [configId, alertConfig] of this.alertConfigs.entries()) {
      if (!alertConfig.enabled || !alertConfig.isActive) {
        continue;
      }

      // Check cooldown period
      const lastTriggered = this.alertCooldowns.get(configId);
      if (lastTriggered) {
        const timeSinceLastTrigger = new Date().getTime() - lastTriggered.getTime();
        if (timeSinceLastTrigger < alertConfig.cooldownPeriod * 60 * 1000) {
          continue; // Still in cooldown period
        }
      }

      // Check alert conditions
      const shouldTrigger = await this.evaluateAlertConditions(alertConfig, snapshot);
      
      if (shouldTrigger) {
        await this.triggerAlert(alertConfig, snapshot);
        this.alertCooldowns.set(configId, new Date());
      }
    }
  }

  private async evaluateAlertConditions(alertConfig: AlertConfig, snapshot: RiskMonitoringSnapshot): Promise<boolean> {
    for (const condition of alertConfig.conditions) {
      let metricValue: number;

      // Get metric value
      switch (condition.metric) {
        case 'criticalRiskCount':
          metricValue = snapshot.criticalRiskCount;
          break;
        case 'highRiskCount':
          metricValue = snapshot.highRiskCount;
          break;
        case 'averageRiskScore':
          metricValue = snapshot.averageRiskScore;
          break;
        case 'totalRisks':
          metricValue = snapshot.totalRisks;
          break;
        case 'systemHealth':
          metricValue = snapshot.systemHealth.monitoring === 'healthy' ? 2 : 
                      snapshot.systemHealth.monitoring === 'warning' ? 1 : 0;
          break;
        default:
          console.warn(`[MONITORING] Unknown metric: ${condition.metric}`);
          continue;
      }

      // Evaluate condition
      let conditionMet = false;

      switch (condition.operator) {
        case '>':
          conditionMet = metricValue > (condition.value || 0);
          break;
        case '<':
          conditionMet = metricValue < (condition.value || 0);
          break;
        case '=':
          conditionMet = metricValue === (condition.value || 0);
          break;
        case '>=':
          conditionMet = metricValue >= (condition.value || 0);
          break;
        case '<=':
          conditionMet = metricValue <= (condition.value || 0);
          break;
        case 'changes':
          // For rate-based alerts, check if metric changed by rate threshold
          if (condition.timeWindow && condition.rateThreshold) {
            conditionMet = await this.checkRateChange(condition.metric, condition.rateThreshold, condition.timeWindow);
          }
          break;
      }

      if (conditionMet) {
        return true; // At least one condition met
      }
    }

    return false;
  }

  private async checkRateChange(metric: string, rateThreshold: number, timeWindow: number): Promise<boolean> {
    // Check if metric changed by rate threshold within time window
    const cutoffTime = new Date(new Date().getTime() - timeWindow * 60 * 1000);
    const recentSnapshots = this.snapshots.filter(s => s.timestamp >= cutoffTime);

    if (recentSnapshots.length < 2) {
      return false;
    }

    const oldest = recentSnapshots[0];
    const newest = recentSnapshots[recentSnapshots.length - 1];

    let oldValue: number;
    let newValue: number;

    switch (metric) {
      case 'averageRiskScore':
        oldValue = oldest.averageRiskScore;
        newValue = newest.averageRiskScore;
        break;
      case 'totalRisks':
        oldValue = oldest.totalRisks;
        newValue = newest.totalRisks;
        break;
      default:
        return false;
    }

    const rateChange = Math.abs(newValue - oldValue) / Math.max(oldValue, 1);
    return rateChange > rateThreshold;
  }

  private async triggerAlert(alertConfig: AlertConfig, snapshot: RiskMonitoringSnapshot): Promise<void> {
    console.log(`[MONITORING] Triggering alert: ${alertConfig.name}`);

    const alert: Alert = {
      id: this.generateId('alert'),
      configId: alertConfig.id,
      level: alertConfig.level,
      type: alertConfig.type,
      title: alertConfig.name,
      message: this.generateAlertMessage(alertConfig, snapshot),
      riskIds: [], // Would be populated based on specific risks that triggered the alert
      triggeredAt: new Date(),
      escalated: false,
      escalationLevel: 0,
      metadata: {
        snapshotId: snapshot.id,
        configName: alertConfig.name,
        triggeredBy: 'system'
      },
      notificationsSent: []
    };

    this.alerts.set(alert.id, alert);

    // Send notifications
    await this.sendAlertNotifications(alert, alertConfig);

    // Set up escalation if configured
    if (alertConfig.escalationRules && alertConfig.escalationRules.length > 0) {
      this.setupEscalation(alert, alertConfig);
    }

    this.emit('alertTriggered', {
      type: 'alert_triggered',
      timestamp: new Date(),
      data: { alert, config: alertConfig },
      description: `Alert triggered: ${alertConfig.name}`
    } as RiskAssessmentEvent);
  }

  private generateAlertMessage(alertConfig: AlertConfig, snapshot: RiskMonitoringSnapshot): string {
    switch (alertConfig.type) {
      case 'threshold':
        if (alertConfig.conditions.some(c => c.metric === 'criticalRiskCount')) {
          return `${snapshot.criticalRiskCount} critical risks detected requiring immediate attention`;
        }
        if (alertConfig.conditions.some(c => c.metric === 'highRiskCount')) {
          return `${snapshot.highRiskCount} high risks detected exceeding threshold`;
        }
        if (alertConfig.conditions.some(c => c.metric === 'averageRiskScore')) {
          return `Average risk score is ${snapshot.averageRiskScore.toFixed(1)} exceeding threshold`;
        }
        break;
      case 'trend':
        return `Risk score trend is ${snapshot.trends.scoreTrend} - requires investigation`;
      case 'system':
        return `System health is ${snapshot.systemHealth.monitoring} - ${snapshot.systemHealth.errors.join(', ')}`;
      default:
        return 'Alert condition met';
    }
    return 'Alert condition met';
  }

  private async sendAlertNotifications(alert: Alert, alertConfig: AlertConfig): Promise<void> {
    for (const channel of alertConfig.notificationChannels) {
      for (const recipient of alertConfig.recipients) {
        try {
          await this.sendNotification(channel, recipient, alert);
          
          alert.notificationsSent.push({
            channel,
            recipient,
            sentAt: new Date(),
            status: 'sent'
          });
        } catch (error) {
          console.error(`[MONITORING] Failed to send notification to ${recipient} via ${channel}:`, error);
          
          alert.notificationsSent.push({
            channel,
            recipient,
            sentAt: new Date(),
            status: 'failed'
          });
        }
      }
    }
  }

  private async sendNotification(channel: string, recipient: string, alert: Alert): Promise<void> {
    // In a real implementation, this would integrate with actual notification services
    console.log(`[MONITORING] Sending ${alert.level} alert to ${recipient} via ${channel}: ${alert.title}`);
    
    switch (channel) {
      case 'email':
        // Send email notification
        console.log(`[MONITORING] Email sent to ${recipient}: ${alert.message}`);
        break;
      case 'slack':
        // Send Slack notification
        console.log(`[MONITORING] Slack message sent to ${recipient}: ${alert.message}`);
        break;
      case 'dashboard':
        // Display on dashboard
        console.log(`[MONITORING] Dashboard alert for ${recipient}: ${alert.message}`);
        break;
      case 'sms':
        // Send SMS notification
        console.log(`[MONITORING] SMS sent to ${recipient}: ${alert.message}`);
        break;
      case 'webhook':
        // Send webhook notification
        console.log(`[MONITORING] Webhook sent to ${recipient}: ${alert.message}`);
        break;
    }
  }

  private setupEscalation(alert: Alert, alertConfig: AlertConfig): void {
    if (!alertConfig.escalationRules || alertConfig.escalationRules.length === 0) {
      return;
    }

    const escalationRule = alertConfig.escalationRules[alert.escalationLevel];
    if (!escalationRule) {
      return;
    }

    setTimeout(async () => {
      // Check if alert is still active and not escalated
      const currentAlert = this.alerts.get(alert.id);
      if (!currentAlert || currentAlert.resolvedAt || currentAlert.escalated) {
        return;
      }

      // Check additional escalation conditions if specified
      if (escalationRule.conditions) {
        const conditionsMet = await this.checkEscalationConditions(escalationRule.conditions, currentAlert);
        if (!conditionsMet) {
          return;
        }
      }

      // Escalate alert
      await this.escalateAlert(alert.id, escalationRule);
    }, escalationRule.delay * 60 * 1000); // Convert minutes to milliseconds
  }

  private async checkEscalationConditions(conditions: string[], alert: Alert): Promise<boolean> {
    // Check additional conditions for escalation
    // In a real implementation, this would be more sophisticated
    for (const condition of conditions) {
      switch (condition) {
        case 'not_acknowledged':
          if (alert.acknowledgedAt) {
            return false;
          }
          break;
        case 'critical_level':
          if (alert.level !== 'critical') {
            return false;
          }
          break;
        default:
          console.warn(`[MONITORING] Unknown escalation condition: ${condition}`);
      }
    }
    return true;
  }

  private async escalateAlert(alertId: string, escalationRule: AlertConfig['escalationRules'][0]): Promise<void> {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      return;
    }

    alert.escalated = true;
    alert.escalationLevel++;

    // Create escalated alert
    const escalatedAlert: Alert = {
      ...alert,
      id: this.generateId('alert'),
      level: escalationRule.level,
      title: `ESCALATED: ${alert.title}`,
      message: `Escalated alert: ${alert.message}`,
      triggeredAt: new Date(),
      notificationsSent: []
    };

    this.alerts.set(escalatedAlert.id, escalatedAlert);

    // Send escalation notifications
    for (const recipient of escalationRule.recipients) {
      for (const channel of ['email', 'slack']) {
        try {
          await this.sendNotification(channel, recipient, escalatedAlert);
          
          escalatedAlert.notificationsSent.push({
            channel,
            recipient,
            sentAt: new Date(),
            status: 'sent'
          });
        } catch (error) {
          console.error(`[MONITORING] Failed to send escalation notification:`, error);
        }
      }
    }

    this.emit('alertEscalated', {
      type: 'alert_escalated',
      timestamp: new Date(),
      data: { originalAlert: alert, escalatedAlert, escalationRule },
      description: `Alert escalated: ${alert.title}`
    } as RiskAssessmentEvent);
  }

  private async triggerPredictiveAlert(risk: Risk, trendData: RiskTrendData): Promise<void> {
    console.log(`[MONITORING] Triggering predictive alert for risk: ${risk.id}`);

    const alert: Alert = {
      id: this.generateId('alert'),
      configId: 'predictive-alert',
      level: 'warning',
      type: 'prediction',
      title: `Predictive Alert: Risk Score Increase`,
      message: `Risk "${risk.title}" is predicted to reach score ${trendData.prediction?.nextValue?.toFixed(1)} within ${trendData.prediction?.horizon} days`,
      riskIds: [risk.id],
      triggeredAt: new Date(),
      escalated: false,
      escalationLevel: 0,
      metadata: {
        riskId: risk.id,
        riskTitle: risk.title,
        prediction: trendData.prediction,
        trend: trendData.trend
      },
      notificationsSent: []
    };

    this.alerts.set(alert.id, alert);

    // Send notifications to risk owner
    if (risk.owner) {
      await this.sendNotification('email', risk.owner, alert);
      alert.notificationsSent.push({
        channel: 'email',
        recipient: risk.owner,
        sentAt: new Date(),
        status: 'sent'
      });
    }

    this.emit('predictiveAlertTriggered', {
      type: 'predictive_alert_triggered',
      timestamp: new Date(),
      data: { alert, risk, trendData },
      description: `Predictive alert triggered for risk: ${risk.title}`
    } as RiskAssessmentEvent);
  }

  private async updateDashboard(): Promise<void> {
    console.log('[MONITORING] Updating monitoring dashboard');

    const dashboardData = await this.generateDashboardData();

    this.emit('dashboardUpdated', {
      type: 'dashboard_updated',
      timestamp: new Date(),
      data: { dashboardData },
      description: 'Risk monitoring dashboard updated'
    } as RiskAssessmentEvent);
  }

  private async generateDashboardData(): Promise<MonitoringDashboardData> {
    const risks = Array.from(this.risks.values());
    const activeAlerts = Array.from(this.alerts.values()).filter(alert => !alert.resolvedAt);
    const recentAlerts = activeAlerts
      .sort((a, b) => b.triggeredAt.getTime() - a.triggeredAt.getTime())
      .slice(0, 10);

    // Get trend data for top risks
    const topRisks = risks
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    const riskTrends: RiskTrendData[] = [];
    for (const risk of topRisks) {
      const trends = this.trendData.get(risk.id);
      if (trends && trends.length > 0) {
        riskTrends.push(trends[trends.length - 1]); // Latest trend data
      }
    }

    // Calculate risk distribution
    const riskDistribution = {
      byStatus: risks.reduce((acc, risk) => {
        acc[risk.status]++;
        return acc;
      }, {} as Record<RiskStatus, number>),
      bySeverity: risks.reduce((acc, risk) => {
        acc[risk.severity]++;
        return acc;
      }, {} as Record<RiskSeverity, number>),
      byCategory: risks.reduce((acc, risk) => {
        acc[risk.category]++;
        return acc;
      }, {} as Record<ROAMCategory, number>)
    };

    // Calculate system metrics
    const lastSnapshot = this.snapshots[this.snapshots.length - 1];
    const systemMetrics = {
      monitoringLag: lastSnapshot ? (new Date().getTime() - lastSnapshot.timestamp.getTime()) / (1000 * 60) : 0,
      alertProcessingTime: 5, // Placeholder - would be calculated from actual data
      dataFreshness: lastSnapshot ? (new Date().getTime() - lastSnapshot.timestamp.getTime()) / (1000 * 60) : 0
    };

    const dashboardData: MonitoringDashboardData = {
      id: this.generateId('dashboard'),
      name: 'Risk Monitoring Dashboard',
      description: 'Real-time risk monitoring and alerting dashboard',
      lastUpdated: new Date(),
      summary: {
        totalRisks: risks.length,
        activeAlerts: activeAlerts.length,
        criticalRisks: risks.filter(r => r.severity === 'critical').length,
        averageRiskScore: risks.length > 0 ? risks.reduce((sum, r) => sum + r.score, 0) / risks.length : 0,
        systemHealth: lastSnapshot?.systemHealth.monitoring || 'healthy'
      },
      riskDistribution,
      recentAlerts,
      riskTrends,
      topRisks,
      systemMetrics
    };

    return dashboardData;
  }

  private cleanupOldData(): void {
    const now = new Date();

    // Clean up old snapshots
    const snapshotRetentionMs = this.config.retention.snapshots * 24 * 60 * 60 * 1000;
    this.snapshots = this.snapshots.filter(snapshot => 
      now.getTime() - snapshot.timestamp.getTime() <= snapshotRetentionMs
    );

    // Clean up old alerts
    const alertRetentionMs = this.config.retention.alerts * 24 * 60 * 60 * 1000;
    for (const [alertId, alert] of this.alerts.entries()) {
      if (now.getTime() - alert.triggeredAt.getTime() > alertRetentionMs) {
        this.alerts.delete(alertId);
      }
    }

    // Clean up old trend data
    const metricsRetentionMs = this.config.retention.metrics * 24 * 60 * 60 * 1000;
    for (const [riskId, trends] of this.trendData.entries()) {
      const filteredTrends = trends.filter(trend => 
        trend.timestamps.length > 0 && 
        now.getTime() - trend.timestamps[trend.timestamps.length - 1].getTime() <= metricsRetentionMs
      );
      
      if (filteredTrends.length === 0) {
        this.trendData.delete(riskId);
      } else {
        this.trendData.set(riskId, filteredTrends);
      }
    }

    // Clean up old cooldowns
    for (const [configId, cooldownTime] of this.alertCooldowns.entries()) {
      if (now.getTime() - cooldownTime.getTime() > 24 * 60 * 60 * 1000) { // 24 hours
        this.alertCooldowns.delete(configId);
      }
    }
  }

  // Risk data management
  public updateRisk(risk: Risk): void {
    this.risks.set(risk.id, risk);
    
    this.emit('riskUpdated', {
      type: 'risk_updated_in_monitoring',
      timestamp: new Date(),
      data: { risk },
      description: `Risk updated in monitoring: ${risk.title}`
    } as RiskAssessmentEvent);
  }

  public removeRisk(riskId: string): void {
    this.risks.delete(riskId);
    
    this.emit('riskRemoved', {
      type: 'risk_removed_from_monitoring',
      timestamp: new Date(),
      data: { riskId },
      description: `Risk removed from monitoring: ${riskId}`
    } as RiskAssessmentEvent);
  }

  // Alert management
  public acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert || alert.acknowledgedAt) {
      return false;
    }

    alert.acknowledgedAt = new Date();
    alert.acknowledgedBy = acknowledgedBy;

    this.emit('alertAcknowledged', {
      type: 'alert_acknowledged',
      timestamp: new Date(),
      data: { alert, acknowledgedBy },
      description: `Alert acknowledged: ${alert.title}`
    } as RiskAssessmentEvent);

    return true;
  }

  public resolveAlert(alertId: string, resolvedBy: string, resolution?: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert || alert.resolvedAt) {
      return false;
    }

    alert.resolvedAt = new Date();
    alert.resolvedBy = resolvedBy;
    if (resolution) {
      alert.metadata.resolution = resolution;
    }

    this.emit('alertResolved', {
      type: 'alert_resolved',
      timestamp: new Date(),
      data: { alert, resolvedBy, resolution },
      description: `Alert resolved: ${alert.title}`
    } as RiskAssessmentEvent);

    return true;
  }

  // Query methods
  public getConfig(): RiskMonitoringConfig {
    return this.config;
  }

  public getAlertConfig(id: string): AlertConfig | undefined {
    return this.alertConfigs.get(id);
  }

  public getAllAlertConfigs(): AlertConfig[] {
    return Array.from(this.alertConfigs.values());
  }

  public getAlert(id: string): Alert | undefined {
    return this.alerts.get(id);
  }

  public getAllAlerts(): Alert[] {
    return Array.from(this.alerts.values());
  }

  public getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter(alert => !alert.resolvedAt);
  }

  public getAlertsByLevel(level: AlertLevel): Alert[] {
    return Array.from(this.alerts.values()).filter(alert => alert.level === level);
  }

  public getSnapshots(limit?: number): RiskMonitoringSnapshot[] {
    return limit ? this.snapshots.slice(-limit) : [...this.snapshots];
  }

  public getLatestSnapshot(): RiskMonitoringSnapshot | undefined {
    return this.snapshots[this.snapshots.length - 1];
  }

  public getTrendData(riskId: string): RiskTrendData[] {
    return this.trendData.get(riskId) || [];
  }

  public async getDashboardData(): Promise<MonitoringDashboardData> {
    return this.generateDashboardData();
  }

  // Utility methods
  private generateId(type: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `${type}-${timestamp}-${random}`;
  }

  // Cleanup
  public async shutdown(): Promise<void> {
    console.log('[MONITORING] Shutting down risk monitoring system');

    this.stopMonitoring();
    
    this.alertConfigs.clear();
    this.alerts.clear();
    this.snapshots = [];
    this.trendData.clear();
    this.alertCooldowns.clear();
    this.risks.clear();

    console.log('[MONITORING] Risk monitoring system shutdown completed');
  }
}