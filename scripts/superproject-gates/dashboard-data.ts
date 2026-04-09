/**
 * Monitoring Dashboard Data Provider
 *
 * Aggregates data from all monitoring components for dashboard display:
 * - Provider status summary
 * - Syslog health summary
 * - Alert summary
 * - Incident timeline
 *
 * @module monitoring/dashboard-data
 */

import { 
  ProviderHealthMonitor,
  AWSHealthStatus,
  HivelocityStatus,
  DriftReport,
  OverallHealthStatus,
} from './provider-health-monitor';

import {
  AlertRouter,
  Alert,
  AlertSeverity,
  AlertDeliveryResult,
} from './alert-router';

import {
  SyslogHealthMonitor,
  TLSStatus,
  CertStatus,
  IngestionMetrics,
  RetentionStatus,
  AnomalyReport,
} from './syslog-health-monitor';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Provider status for a single provider
 */
export interface ProviderStatusItem {
  provider: 'aws' | 'hivelocity';
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  instanceCount: number;
  healthyInstances: number;
  lastChecked: Date;
  issues: string[];
}

/**
 * Provider status summary
 */
export interface ProviderStatusSummary {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  providers: ProviderStatusItem[];
  drift: {
    hasDrift: boolean;
    itemCount: number;
    criticalCount: number;
  };
  lastUpdated: Date;
}

/**
 * Syslog health summary
 */
export interface SyslogHealthSummary {
  status: 'healthy' | 'degraded' | 'unhealthy';
  connection: {
    connected: boolean;
    latencyMs: number;
    protocol?: string;
  };
  certificate: {
    valid: boolean;
    daysUntilExpiry: number;
    warningLevel: 'ok' | 'warning' | 'critical';
  };
  ingestion: {
    logsPerMinute: number;
    droppedLogs: number;
    anomalyCount: number;
  };
  retention: {
    diskUsagePercent: number;
    oldestLogDays: number;
  };
  lastUpdated: Date;
}

/**
 * Alert summary statistics
 */
export interface AlertSummary {
  total: number;
  active: number;
  acknowledged: number;
  resolved: number;
  bySeverity: {
    critical: number;
    warning: number;
    info: number;
  };
  bySource: Record<string, number>;
  recentAlerts: Alert[];
  delivery: {
    total: number;
    successful: number;
    failed: number;
    byChannel: Record<string, { success: number; failed: number }>;
  };
  lastUpdated: Date;
}

/**
 * Timeline event for incidents
 */
export interface TimelineEvent {
  id: string;
  timestamp: Date;
  type: 'alert' | 'health_change' | 'drift_detected' | 'cert_warning' | 'ingestion_anomaly' | 'resolution';
  severity: 'critical' | 'warning' | 'info';
  source: string;
  title: string;
  description: string;
  metadata?: Record<string, unknown>;
}

/**
 * Dashboard refresh options
 */
export interface DashboardRefreshOptions {
  includeProviderStatus?: boolean;
  includeSyslogHealth?: boolean;
  includeAlertSummary?: boolean;
  includeTimeline?: boolean;
  timelineHours?: number;
}

/**
 * Complete dashboard data
 */
export interface DashboardData {
  providerStatus: ProviderStatusSummary;
  syslogHealth: SyslogHealthSummary;
  alertSummary: AlertSummary;
  timeline: TimelineEvent[];
  lastUpdated: Date;
}

// ============================================================================
// Monitoring Dashboard Class
// ============================================================================

/**
 * Monitoring dashboard data provider
 *
 * Aggregates data from:
 * - ProviderHealthMonitor
 * - AlertRouter
 * - SyslogHealthMonitor
 */
export class MonitoringDashboard {
  private providerMonitor: ProviderHealthMonitor;
  private alertRouter: AlertRouter;
  private syslogMonitor: SyslogHealthMonitor;
  private timelineEvents: TimelineEvent[] = [];
  private lastProviderStatus?: ProviderStatusSummary;
  private lastSyslogHealth?: SyslogHealthSummary;
  private lastAlertSummary?: AlertSummary;

  constructor(
    providerMonitor: ProviderHealthMonitor,
    alertRouter: AlertRouter,
    syslogMonitor: SyslogHealthMonitor
  ) {
    this.providerMonitor = providerMonitor;
    this.alertRouter = alertRouter;
    this.syslogMonitor = syslogMonitor;
  }

  // ==========================================================================
  // Dashboard Data Methods
  // ==========================================================================

  /**
   * Get provider status summary
   */
  async getProviderStatus(): Promise<ProviderStatusSummary> {
    const overallHealth = await this.providerMonitor.getOverallHealth();
    const providers: ProviderStatusItem[] = [];

    // Process AWS provider
    if (overallHealth.providers.aws) {
      const awsProvider = overallHealth.providers.aws;
      const instances = Array.from(awsProvider.instances.entries());
      const healthyCount = instances.filter(
        ([, status]) => status.instanceState === 'running' && status.systemChecks === 'ok'
      ).length;

      const issues: string[] = [];
      for (const [id, status] of instances) {
        if (status.instanceState !== 'running') {
          issues.push(`Instance ${id} is ${status.instanceState}`);
        }
        if (status.systemChecks !== 'ok') {
          issues.push(`Instance ${id} system checks: ${status.systemChecks}`);
        }
      }

      providers.push({
        provider: 'aws',
        status: awsProvider.status,
        instanceCount: instances.length,
        healthyInstances: healthyCount,
        lastChecked: new Date(),
        issues,
      });
    }

    // Process Hivelocity provider
    if (overallHealth.providers.hivelocity) {
      const hivelocityProvider = overallHealth.providers.hivelocity;
      const devices = Array.from(hivelocityProvider.devices.entries());
      const healthyCount = devices.filter(
        ([, status]) => status.powerState === 'on' && status.networkState === 'up'
      ).length;

      const issues: string[] = [];
      for (const [id, status] of devices) {
        if (status.powerState !== 'on') {
          issues.push(`Device ${id} power is ${status.powerState}`);
        }
        if (status.networkState !== 'up') {
          issues.push(`Device ${id} network is ${status.networkState}`);
        }
        if (!status.ipmiAvailable) {
          issues.push(`Device ${id} IPMI unavailable`);
        }
      }

      providers.push({
        provider: 'hivelocity',
        status: hivelocityProvider.status,
        instanceCount: devices.length,
        healthyInstances: healthyCount,
        lastChecked: new Date(),
        issues,
      });
    }

    const drift = overallHealth.drift;

    const summary: ProviderStatusSummary = {
      overall: overallHealth.status,
      providers,
      drift: {
        hasDrift: drift.hasDrift,
        itemCount: drift.driftItems.length,
        criticalCount: drift.driftItems.filter(d => d.severity === 'critical').length,
      },
      lastUpdated: new Date(),
    };

    this.lastProviderStatus = summary;

    // Add timeline events for drift
    if (drift.hasDrift && drift.driftItems.length > 0) {
      for (const item of drift.driftItems) {
        this.addTimelineEvent({
          id: `drift-${item.resource}-${Date.now()}`,
          timestamp: item.detectedAt,
          type: 'drift_detected',
          severity: item.severity,
          source: item.resource.split(':')[0],
          title: `Configuration drift detected`,
          description: `${item.resource}: ${item.property} expected ${item.expected}, actual ${item.actual}`,
          metadata: item,
        });
      }
    }

    return summary;
  }

  /**
   * Get syslog health summary
   */
  async getSyslogHealth(): Promise<SyslogHealthSummary> {
    const healthCheck = await this.syslogMonitor.runHealthCheck();

    const now = new Date();
    const oldestLogDays = healthCheck.retention.oldestLog
      ? Math.floor((now.getTime() - healthCheck.retention.oldestLog.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    const summary: SyslogHealthSummary = {
      status: healthCheck.overallHealth,
      connection: {
        connected: healthCheck.tlsStatus.connected,
        latencyMs: healthCheck.tlsStatus.latencyMs,
        protocol: healthCheck.tlsStatus.protocol,
      },
      certificate: {
        valid: healthCheck.certStatus.valid,
        daysUntilExpiry: healthCheck.certStatus.daysUntilExpiry,
        warningLevel: healthCheck.certStatus.warningLevel,
      },
      ingestion: {
        logsPerMinute: healthCheck.metrics.totalLogsPerMinute,
        droppedLogs: healthCheck.metrics.droppedLogs,
        anomalyCount: healthCheck.anomalies.anomalies.length,
      },
      retention: {
        diskUsagePercent: healthCheck.retention.diskUsagePercent,
        oldestLogDays,
      },
      lastUpdated: new Date(),
    };

    this.lastSyslogHealth = summary;

    // Add timeline events for certificate warnings
    if (healthCheck.certStatus.warningLevel !== 'ok') {
      this.addTimelineEvent({
        id: `cert-${Date.now()}`,
        timestamp: new Date(),
        type: 'cert_warning',
        severity: healthCheck.certStatus.warningLevel,
        source: 'syslog-sink',
        title: `TLS certificate expiring soon`,
        description: `Certificate expires in ${healthCheck.certStatus.daysUntilExpiry} days`,
        metadata: healthCheck.certStatus,
      });
    }

    // Add timeline events for anomalies
    for (const anomaly of healthCheck.anomalies.anomalies) {
      this.addTimelineEvent({
        id: `anomaly-${anomaly.type}-${Date.now()}`,
        timestamp: anomaly.detectedAt,
        type: 'ingestion_anomaly',
        severity: anomaly.severity,
        source: 'syslog-sink',
        title: `Ingestion anomaly: ${anomaly.type}`,
        description: anomaly.message,
        metadata: anomaly.details,
      });
    }

    return summary;
  }

  /**
   * Get alert summary
   */
  async getAlertSummary(): Promise<AlertSummary> {
    const activeAlerts = await this.alertRouter.getActiveAlerts();
    const allAlerts = await this.alertRouter.getAlertHistory(
      new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
    );
    const deliveryStats = this.alertRouter.getDeliveryStats();

    // Count by severity
    const bySeverity = {
      critical: 0,
      warning: 0,
      info: 0,
    };

    // Count by source
    const bySource: Record<string, number> = {};

    // Count by status
    let acknowledged = 0;
    let resolved = 0;

    for (const alert of allAlerts) {
      bySeverity[alert.severity]++;
      bySource[alert.source] = (bySource[alert.source] || 0) + 1;

      if (alert.status === 'acknowledged') acknowledged++;
      if (alert.status === 'resolved') resolved++;
    }

    const summary: AlertSummary = {
      total: allAlerts.length,
      active: activeAlerts.length,
      acknowledged,
      resolved,
      bySeverity,
      bySource,
      recentAlerts: allAlerts.slice(0, 10),
      delivery: deliveryStats,
      lastUpdated: new Date(),
    };

    this.lastAlertSummary = summary;

    // Add timeline events for recent alerts
    for (const alert of allAlerts.slice(0, 5)) {
      this.addTimelineEvent({
        id: `alert-${alert.id}`,
        timestamp: alert.createdAt,
        type: 'alert',
        severity: alert.severity,
        source: alert.source,
        title: alert.message,
        description: `Alert from ${alert.source}`,
        metadata: alert.details,
      });
    }

    return summary;
  }

  /**
   * Get incident timeline
   *
   * @param hours - Number of hours to look back
   */
  async getIncidentTimeline(hours: number = 24): Promise<TimelineEvent[]> {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    // Filter and sort timeline events
    const events = this.timelineEvents
      .filter(e => e.timestamp >= cutoff)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return events;
  }

  /**
   * Get complete dashboard data
   */
  async getDashboardData(options: DashboardRefreshOptions = {}): Promise<DashboardData> {
    const {
      includeProviderStatus = true,
      includeSyslogHealth = true,
      includeAlertSummary = true,
      includeTimeline = true,
      timelineHours = 24,
    } = options;

    const promises: Promise<unknown>[] = [];

    if (includeProviderStatus) {
      promises.push(this.getProviderStatus());
    }
    if (includeSyslogHealth) {
      promises.push(this.getSyslogHealth());
    }
    if (includeAlertSummary) {
      promises.push(this.getAlertSummary());
    }

    await Promise.all(promises);

    return {
      providerStatus: this.lastProviderStatus || this.getEmptyProviderStatus(),
      syslogHealth: this.lastSyslogHealth || this.getEmptySyslogHealth(),
      alertSummary: this.lastAlertSummary || this.getEmptyAlertSummary(),
      timeline: includeTimeline ? await this.getIncidentTimeline(timelineHours) : [],
      lastUpdated: new Date(),
    };
  }

  /**
   * Get cached dashboard data (no refresh)
   */
  getCachedDashboardData(): DashboardData | null {
    if (!this.lastProviderStatus && !this.lastSyslogHealth && !this.lastAlertSummary) {
      return null;
    }

    return {
      providerStatus: this.lastProviderStatus || this.getEmptyProviderStatus(),
      syslogHealth: this.lastSyslogHealth || this.getEmptySyslogHealth(),
      alertSummary: this.lastAlertSummary || this.getEmptyAlertSummary(),
      timeline: this.timelineEvents.slice(0, 50),
      lastUpdated: new Date(),
    };
  }

  // ==========================================================================
  // Timeline Management
  // ==========================================================================

  /**
   * Add event to timeline
   */
  addTimelineEvent(event: TimelineEvent): void {
    // Check for duplicate
    const exists = this.timelineEvents.some(e => e.id === event.id);
    if (exists) return;

    this.timelineEvents.push(event);

    // Keep only last 500 events
    if (this.timelineEvents.length > 500) {
      this.timelineEvents = this.timelineEvents.slice(-500);
    }
  }

  /**
   * Clear old timeline events
   */
  clearOldTimelineEvents(olderThanHours: number = 48): void {
    const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    this.timelineEvents = this.timelineEvents.filter(e => e.timestamp >= cutoff);
  }

  // ==========================================================================
  // Health Status Helpers
  // ==========================================================================

  /**
   * Get quick health status (cached)
   */
  getQuickHealthStatus(): {
    provider: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
    syslog: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
    alerts: { active: number; critical: number };
  } {
    return {
      provider: this.lastProviderStatus?.overall || 'unknown',
      syslog: this.lastSyslogHealth?.status || 'unknown',
      alerts: {
        active: this.lastAlertSummary?.active || 0,
        critical: this.lastAlertSummary?.bySeverity.critical || 0,
      },
    };
  }

  // ==========================================================================
  // Private Helpers
  // ==========================================================================

  private getEmptyProviderStatus(): ProviderStatusSummary {
    return {
      overall: 'unknown' as 'healthy',
      providers: [],
      drift: {
        hasDrift: false,
        itemCount: 0,
        criticalCount: 0,
      },
      lastUpdated: new Date(),
    };
  }

  private getEmptySyslogHealth(): SyslogHealthSummary {
    return {
      status: 'unknown' as 'healthy',
      connection: {
        connected: false,
        latencyMs: 0,
      },
      certificate: {
        valid: false,
        daysUntilExpiry: -1,
        warningLevel: 'critical',
      },
      ingestion: {
        logsPerMinute: 0,
        droppedLogs: 0,
        anomalyCount: 0,
      },
      retention: {
        diskUsagePercent: 0,
        oldestLogDays: 0,
      },
      lastUpdated: new Date(),
    };
  }

  private getEmptyAlertSummary(): AlertSummary {
    return {
      total: 0,
      active: 0,
      acknowledged: 0,
      resolved: 0,
      bySeverity: {
        critical: 0,
        warning: 0,
        info: 0,
      },
      bySource: {},
      recentAlerts: [],
      delivery: {
        total: 0,
        successful: 0,
        failed: 0,
        byChannel: {},
      },
      lastUpdated: new Date(),
    };
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create monitoring dashboard from individual monitors
 */
export function createMonitoringDashboard(
  providerMonitor: ProviderHealthMonitor,
  alertRouter: AlertRouter,
  syslogMonitor: SyslogHealthMonitor
): MonitoringDashboard {
  return new MonitoringDashboard(providerMonitor, alertRouter, syslogMonitor);
}

/**
 * Create monitoring dashboard from environment variables
 *
 * This requires the individual monitors to be created from env first.
 */
export function createMonitoringDashboardFromEnv(): MonitoringDashboard {
  // Import factory functions (would be circular in real implementation)
  // For now, create minimal monitors
  const providerMonitor = new (require('./provider-health-monitor').ProviderHealthMonitor)({
    retryAttempts: 3,
    retryDelayMs: 1000,
    timeoutMs: 10000,
    aws: process.env.AWS_REGION ? { region: process.env.AWS_REGION } : undefined,
    hivelocity: process.env.HIVELOCITY_API_KEY ? { apiKey: process.env.HIVELOCITY_API_KEY } : undefined,
  });

  const alertRouter = new (require('./alert-router').AlertRouter)({
    environment: process.env.NODE_ENV || 'development',
    suppressDuplicates: true,
    suppressionWindowMs: 300000,
    retryAttempts: 3,
    retryDelayMs: 1000,
    severityRouting: {
      critical: { sns: true, webhook: true, slack: true, syslog: true },
      warning: { sns: false, webhook: true, slack: true, syslog: true },
      info: { sns: false, webhook: false, slack: false, syslog: true },
    },
  });

  const syslogHost = process.env.SYSLOG_SINK_HOST;
  const syslogMonitor = new (require('./syslog-health-monitor').SyslogHealthMonitor)({
    sinkHost: syslogHost || 'localhost',
    sinkPort: parseInt(process.env.SYSLOG_SINK_PORT || '6514', 10),
    protocol: 'tls',
    certExpiryWarningDays: 30,
    certExpiryCriticalDays: 7,
    connectionTimeoutMs: 10000,
    readTimeoutMs: 5000,
    sources: [],
    baseline: {
      expectedAuthLogsPerMinute: 10,
      expectedSystemLogsPerMinute: 20,
      maxLatencyMs: 100,
      maxGapSeconds: 300,
      minRateThreshold: 50,
      maxRateThreshold: 200,
    },
  });

  return new MonitoringDashboard(providerMonitor, alertRouter, syslogMonitor);
}

/**
 * Create production monitoring dashboard
 */
export function createProductionDashboard(
  awsInstanceId: string,
  hivelocityDeviceId: string,
  syslogSinkHost: string,
  slackWebhookUrl?: string
): MonitoringDashboard {
  const { ProviderHealthMonitor } = require('./provider-health-monitor');
  const { AlertRouter } = require('./alert-router');
  const { SyslogHealthMonitor } = require('./syslog-health-monitor');

  const providerMonitor = new ProviderHealthMonitor({
    retryAttempts: 3,
    retryDelayMs: 1000,
    timeoutMs: 10000,
    aws: {
      region: process.env.AWS_REGION || 'us-east-1',
    },
    hivelocity: process.env.HIVELOCITY_API_KEY ? {
      apiKey: process.env.HIVELOCITY_API_KEY,
    } : undefined,
    expectedConfig: {
      aws: {
        instances: new Map([
          [awsInstanceId, { state: 'running' as const, ports: [22, 6514] }],
        ]),
      },
      hivelocity: process.env.HIVELOCITY_API_KEY ? {
        devices: new Map([
          [hivelocityDeviceId, { powerState: 'on' as const, networkState: 'up' as const, ipmiAvailable: true }],
        ]),
      } : undefined,
    },
  });

  const alertRouter = new AlertRouter({
    environment: 'production',
    region: 'us-east-1',
    suppressDuplicates: true,
    suppressionWindowMs: 300000,
    retryAttempts: 3,
    retryDelayMs: 1000,
    slack: slackWebhookUrl ? {
      webhookUrl: slackWebhookUrl,
      username: 'Production Monitoring',
      iconEmoji: ':robot_face:',
    } : undefined,
    syslogSink: {
      host: syslogSinkHost,
      port: 6514,
      protocol: 'tls',
      facility: 1,
      appName: 'monitoring-dashboard',
    },
    severityRouting: {
      critical: { sns: true, webhook: true, slack: true, syslog: true },
      warning: { sns: false, webhook: true, slack: true, syslog: true },
      info: { sns: false, webhook: false, slack: false, syslog: true },
    },
  });

  const syslogMonitor = new SyslogHealthMonitor({
    sinkHost: syslogSinkHost,
    sinkPort: 6514,
    protocol: 'tls',
    certExpiryWarningDays: 30,
    certExpiryCriticalDays: 7,
    connectionTimeoutMs: 10000,
    readTimeoutMs: 5000,
    sources: [
      {
        name: 'starlingx',
        host: '23.92.79.2',
        expectedLogsPerMinute: 30,
        logTypes: ['auth', 'system'],
      },
    ],
    baseline: {
      expectedAuthLogsPerMinute: 10,
      expectedSystemLogsPerMinute: 20,
      maxLatencyMs: 100,
      maxGapSeconds: 300,
      minRateThreshold: 50,
      maxRateThreshold: 200,
    },
  });

  return new MonitoringDashboard(providerMonitor, alertRouter, syslogMonitor);
}
