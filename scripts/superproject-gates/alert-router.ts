/**
 * Alert Router - Phase 5.3
 *
 * Comprehensive alert routing for provider drift monitoring:
 * - SNS integration for AWS notifications
 * - Webhook integration for external systems
 * - Syslog sink integration for audit trail
 * - Incident timeline management
 *
 * Integrates with:
 * - HivelocityMonitor
 * - AWSHealthMonitor
 * - Syslog sink (TLS-enabled)
 */

import type { ProviderEvent } from './provider-drift-monitor';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Alert message for notifications
 */
export interface AlertMessage {
  severity: 'critical' | 'warning' | 'info';
  source: 'hivelocity' | 'aws' | 'synthetic';
  title: string;
  description: string;
  deviceId?: string;
  instanceName?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Payload for webhook alerts
 */
export interface AlertPayload {
  id: string;
  version: '1.0';
  message: AlertMessage;
  context: {
    environment: string;
    region?: string;
    accountId?: string;
  };
  actions?: AlertAction[];
}

/**
 * Suggested action for alert remediation
 */
export interface AlertAction {
  type: 'runbook' | 'link' | 'command';
  label: string;
  value: string;
}

/**
 * Event in an incident timeline
 */
export interface TimelineEvent {
  timestamp: Date;
  eventType: 'detection' | 'escalation' | 'action' | 'resolution' | 'note';
  description: string;
  source: string;
  severity?: 'critical' | 'warning' | 'info';
  metadata?: Record<string, unknown>;
}

/**
 * Incident timeline tracking
 */
export interface IncidentTimeline {
  incidentId: string;
  startTime: Date;
  endTime?: Date;
  status: 'active' | 'resolved';
  events: TimelineEvent[];
  affectedResources: string[];
}

/**
 * Alert configuration
 */
export interface AlertRouterConfig {
  environment: string;
  region?: string;
  accountId?: string;

  // SNS configuration
  sns?: {
    topicArn: string;
    region: string;
  };

  // Webhook configuration
  webhooks?: WebhookConfig[];

  // Syslog sink configuration
  syslogSink?: {
    host: string;
    port: number;
    protocol: 'tcp' | 'udp' | 'tls';
    facility: number;
    appName: string;
  };

  // Alert filtering
  minSeverity: 'critical' | 'warning' | 'info';
  suppressDuplicates: boolean;
  suppressionWindowMs: number;
}

/**
 * Webhook configuration
 */
export interface WebhookConfig {
  url: string;
  method: 'POST' | 'PUT';
  headers?: Record<string, string>;
  authentication?: {
    type: 'bearer' | 'basic' | 'header';
    token?: string;
    username?: string;
    password?: string;
    headerName?: string;
    headerValue?: string;
  };
  retries: number;
  timeoutMs: number;
}

/**
 * Syslog message format (RFC 5424)
 */
export interface SyslogMessage {
  facility: number;
  severity: number;
  timestamp: Date;
  hostname: string;
  appName: string;
  procId: string;
  msgId: string;
  structuredData: Record<string, Record<string, string>>;
  message: string;
}

/**
 * Alert delivery result
 */
export interface AlertDeliveryResult {
  channel: 'sns' | 'webhook' | 'syslog';
  success: boolean;
  timestamp: Date;
  error?: string;
  responseCode?: number;
  retries?: number;
}

// ============================================================================
// Alert Router Class
// ============================================================================

/**
 * Routes alerts to multiple destinations
 *
 * Supports:
 * - AWS SNS for push notifications
 * - Webhooks for integrations (Slack, PagerDuty, etc.)
 * - Syslog sink for audit trail
 */
export class AlertRouter {
  private config: AlertRouterConfig;
  private incidents: Map<string, IncidentTimeline> = new Map();
  private recentAlerts: Map<string, Date> = new Map();
  private deliveryLog: AlertDeliveryResult[] = [];

  constructor(config: AlertRouterConfig) {
    this.config = config;
  }

  /**
   * Send alert to SNS topic
   */
  async sendSNSAlert(topic: string, message: AlertMessage): Promise<void> {
    if (!this.shouldSendAlert(message)) {
      return;
    }

    const payload = this.createAlertPayload(message);

    try {
      // In production, use AWS SDK:
      // const snsClient = new SNSClient({ region: this.config.sns?.region });
      // await snsClient.send(new PublishCommand({
      //   TopicArn: topic,
      //   Message: JSON.stringify(payload),
      //   Subject: `[${message.severity.toUpperCase()}] ${message.title}`,
      //   MessageAttributes: {
      //     severity: { DataType: 'String', StringValue: message.severity },
      //     source: { DataType: 'String', StringValue: message.source },
      //   },
      // }));

      // Simulated SNS publish
      console.log(`[SNS] Publishing to ${topic}:`, payload);

      this.logDelivery({
        channel: 'sns',
        success: true,
        timestamp: new Date(),
      });

      this.markAlertSent(message);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[SNS] Failed to publish alert: ${errorMessage}`);

      this.logDelivery({
        channel: 'sns',
        success: false,
        timestamp: new Date(),
        error: errorMessage,
      });

      throw new Error(`SNS alert failed: ${errorMessage}`);
    }
  }

  /**
   * Send alert to webhook
   */
  async sendWebhookAlert(url: string, payload: AlertPayload): Promise<void> {
    const webhookConfig = this.config.webhooks?.find(w => w.url === url) || {
      url,
      method: 'POST' as const,
      retries: 3,
      timeoutMs: 5000,
    };

    let lastError: Error | undefined;
    let attempts = 0;

    while (attempts <= webhookConfig.retries) {
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'User-Agent': 'AlertRouter/1.0',
          ...webhookConfig.headers,
        };

        // Add authentication header
        if (webhookConfig.authentication) {
          const auth = webhookConfig.authentication;
          if (auth.type === 'bearer' && auth.token) {
            headers['Authorization'] = `Bearer ${auth.token}`;
          } else if (auth.type === 'basic' && auth.username && auth.password) {
            const credentials = Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
            headers['Authorization'] = `Basic ${credentials}`;
          } else if (auth.type === 'header' && auth.headerName && auth.headerValue) {
            headers[auth.headerName] = auth.headerValue;
          }
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), webhookConfig.timeoutMs);

        const response = await fetch(url, {
          method: webhookConfig.method,
          headers,
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        this.logDelivery({
          channel: 'webhook',
          success: true,
          timestamp: new Date(),
          responseCode: response.status,
          retries: attempts,
        });

        this.markAlertSent(payload.message);
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        attempts++;

        if (attempts <= webhookConfig.retries) {
          // Exponential backoff
          await this.delay(Math.pow(2, attempts) * 100);
        }
      }
    }

    this.logDelivery({
      channel: 'webhook',
      success: false,
      timestamp: new Date(),
      error: lastError?.message,
      retries: attempts,
    });

    throw new Error(`Webhook alert failed after ${attempts} attempts: ${lastError?.message}`);
  }

  /**
   * Log event to syslog sink
   */
  async logToSyslogSink(event: ProviderEvent): Promise<void> {
    const syslogConfig = this.config.syslogSink;

    if (!syslogConfig) {
      console.warn('[Syslog] Sink not configured, skipping');
      return;
    }

    const severityMap: Record<string, number> = {
      'critical': 2, // Critical
      'error': 3, // Error
      'warning': 4, // Warning
      'info': 6, // Informational
    };

    const syslogMessage: SyslogMessage = {
      facility: syslogConfig.facility,
      severity: severityMap[event.severity] || 6,
      timestamp: event.timestamp,
      hostname: this.getHostname(),
      appName: syslogConfig.appName,
      procId: process.pid.toString(),
      msgId: event.eventId,
      structuredData: {
        'provider@52311': {
          name: event.provider,
          eventType: event.eventType,
        },
        'meta@52311': Object.fromEntries(
          Object.entries(event.details).map(([k, v]) => [k, String(v)])
        ),
      },
      message: event.message,
    };

    try {
      await this.sendSyslogMessage(syslogConfig, syslogMessage);

      this.logDelivery({
        channel: 'syslog',
        success: true,
        timestamp: new Date(),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logDelivery({
        channel: 'syslog',
        success: false,
        timestamp: new Date(),
        error: errorMessage,
      });

      console.error(`[Syslog] Failed to send message: ${errorMessage}`);
    }
  }

  /**
   * Create incident timeline from events
   */
  createIncidentTimeline(events: ProviderEvent[]): IncidentTimeline {
    if (events.length === 0) {
      throw new Error('Cannot create timeline from empty events');
    }

    // Sort events by timestamp
    const sortedEvents = [...events].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );

    const incidentId = `inc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = sortedEvents[0].timestamp;

    // Collect affected resources
    const affectedResources = new Set<string>();
    sortedEvents.forEach(event => {
      if (event.details.deviceId) {
        affectedResources.add(String(event.details.deviceId));
      }
      if (event.details.instanceName) {
        affectedResources.add(String(event.details.instanceName));
      }
      if (event.details.target) {
        affectedResources.add(String(event.details.target));
      }
    });

    // Convert provider events to timeline events
    const timelineEvents: TimelineEvent[] = sortedEvents.map((event, index) => ({
      timestamp: event.timestamp,
      eventType: this.mapEventType(event.eventType, index, sortedEvents.length),
      description: event.message,
      source: event.provider,
      severity: event.severity === 'error' ? 'critical' : 
                event.severity === 'warning' ? 'warning' : 'info',
      metadata: event.details,
    }));

    // Determine if incident is resolved
    const lastEvent = sortedEvents[sortedEvents.length - 1];
    const isResolved = lastEvent.eventType === 'health_change' && 
                       lastEvent.severity === 'info';

    const timeline: IncidentTimeline = {
      incidentId,
      startTime,
      endTime: isResolved ? lastEvent.timestamp : undefined,
      status: isResolved ? 'resolved' : 'active',
      events: timelineEvents,
      affectedResources: Array.from(affectedResources),
    };

    // Store timeline
    this.incidents.set(incidentId, timeline);

    return timeline;
  }

  /**
   * Get incident by ID
   */
  getIncident(incidentId: string): IncidentTimeline | undefined {
    return this.incidents.get(incidentId);
  }

  /**
   * Get all active incidents
   */
  getActiveIncidents(): IncidentTimeline[] {
    return Array.from(this.incidents.values())
      .filter(inc => inc.status === 'active');
  }

  /**
   * Update incident status
   */
  updateIncidentStatus(
    incidentId: string,
    status: 'active' | 'resolved',
    note?: string
  ): IncidentTimeline | undefined {
    const incident = this.incidents.get(incidentId);
    if (!incident) return undefined;

    incident.status = status;

    if (status === 'resolved') {
      incident.endTime = new Date();
    }

    if (note) {
      incident.events.push({
        timestamp: new Date(),
        eventType: 'note',
        description: note,
        source: 'manual',
      });
    }

    return incident;
  }

  /**
   * Add event to existing incident
   */
  addEventToIncident(
    incidentId: string,
    event: TimelineEvent
  ): IncidentTimeline | undefined {
    const incident = this.incidents.get(incidentId);
    if (!incident) return undefined;

    incident.events.push(event);

    // Update end time if resolved
    if (event.eventType === 'resolution') {
      incident.status = 'resolved';
      incident.endTime = event.timestamp;
    }

    return incident;
  }

  /**
   * Get delivery log
   */
  getDeliveryLog(since?: Date): AlertDeliveryResult[] {
    if (!since) return [...this.deliveryLog];
    return this.deliveryLog.filter(d => d.timestamp >= since);
  }

  /**
   * Get delivery statistics
   */
  getDeliveryStats(): {
    total: number;
    successful: number;
    failed: number;
    byChannel: Record<string, { success: number; failed: number }>;
  } {
    const stats = {
      total: this.deliveryLog.length,
      successful: 0,
      failed: 0,
      byChannel: {} as Record<string, { success: number; failed: number }>,
    };

    for (const delivery of this.deliveryLog) {
      if (delivery.success) {
        stats.successful++;
      } else {
        stats.failed++;
      }

      if (!stats.byChannel[delivery.channel]) {
        stats.byChannel[delivery.channel] = { success: 0, failed: 0 };
      }

      if (delivery.success) {
        stats.byChannel[delivery.channel].success++;
      } else {
        stats.byChannel[delivery.channel].failed++;
      }
    }

    return stats;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Check if alert should be sent (filtering)
   */
  private shouldSendAlert(message: AlertMessage): boolean {
    // Check severity threshold
    const severityOrder = ['info', 'warning', 'critical'];
    if (
      severityOrder.indexOf(message.severity) <
      severityOrder.indexOf(this.config.minSeverity)
    ) {
      return false;
    }

    // Check duplicate suppression
    if (this.config.suppressDuplicates) {
      const alertKey = this.getAlertKey(message);
      const lastSent = this.recentAlerts.get(alertKey);

      if (lastSent) {
        const timeSinceLastSent = Date.now() - lastSent.getTime();
        if (timeSinceLastSent < this.config.suppressionWindowMs) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Mark alert as sent for duplicate suppression
   */
  private markAlertSent(message: AlertMessage): void {
    if (this.config.suppressDuplicates) {
      const alertKey = this.getAlertKey(message);
      this.recentAlerts.set(alertKey, new Date());

      // Clean up old entries
      const cutoff = Date.now() - this.config.suppressionWindowMs;
      for (const [key, timestamp] of this.recentAlerts) {
        if (timestamp.getTime() < cutoff) {
          this.recentAlerts.delete(key);
        }
      }
    }
  }

  /**
   * Get unique key for alert deduplication
   */
  private getAlertKey(message: AlertMessage): string {
    return `${message.source}:${message.severity}:${message.title}:${message.deviceId || message.instanceName || ''}`;
  }

  /**
   * Create alert payload from message
   */
  private createAlertPayload(message: AlertMessage): AlertPayload {
    const actions: AlertAction[] = [];

    // Add suggested actions based on severity
    if (message.severity === 'critical') {
      actions.push({
        type: 'runbook',
        label: 'View Runbook',
        value: `https://wiki.internal/runbooks/${message.source}-incident`,
      });
    }

    return {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      version: '1.0',
      message,
      context: {
        environment: this.config.environment,
        region: this.config.region,
        accountId: this.config.accountId,
      },
      actions,
    };
  }

  /**
   * Map provider event type to timeline event type
   */
  private mapEventType(
    eventType: string,
    index: number,
    total: number
  ): TimelineEvent['eventType'] {
    if (index === 0) return 'detection';
    if (index === total - 1 && eventType === 'health_change') return 'resolution';
    if (eventType === 'alert') return 'escalation';
    return 'action';
  }

  /**
   * Log delivery result
   */
  private logDelivery(result: AlertDeliveryResult): void {
    this.deliveryLog.push(result);

    // Keep only last 1000 delivery records
    if (this.deliveryLog.length > 1000) {
      this.deliveryLog = this.deliveryLog.slice(-1000);
    }
  }

  /**
   * Send syslog message to sink
   */
  private async sendSyslogMessage(
    config: NonNullable<AlertRouterConfig['syslogSink']>,
    message: SyslogMessage
  ): Promise<void> {
    const formattedMessage = this.formatSyslogMessage(message);

    // In production, use net module for TCP/TLS:
    // const socket = config.protocol === 'tls' 
    //   ? tls.connect({ host: config.host, port: config.port })
    //   : net.connect({ host: config.host, port: config.port });

    // For now, log to console
    console.log(`[Syslog -> ${config.host}:${config.port}] ${formattedMessage}`);
  }

  /**
   * Format syslog message according to RFC 5424
   */
  private formatSyslogMessage(message: SyslogMessage): string {
    const pri = message.facility * 8 + message.severity;
    const timestamp = message.timestamp.toISOString();
    const hostname = message.hostname || '-';
    const appName = message.appName || '-';
    const procId = message.procId || '-';
    const msgId = message.msgId || '-';

    // Format structured data
    let sd = '';
    for (const [id, params] of Object.entries(message.structuredData)) {
      const paramStr = Object.entries(params)
        .map(([k, v]) => `${k}="${this.escapeSDValue(v)}"`)
        .join(' ');
      sd += `[${id} ${paramStr}]`;
    }

    if (!sd) sd = '-';

    return `<${pri}>1 ${timestamp} ${hostname} ${appName} ${procId} ${msgId} ${sd} ${message.message}`;
  }

  /**
   * Escape structured data value per RFC 5424
   */
  private escapeSDValue(value: string): string {
    return value
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\]/g, '\\]');
  }

  /**
   * Get hostname for syslog messages
   */
  private getHostname(): string {
    return process.env.HOSTNAME || process.env.HOST || 'alert-router';
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create alert router with default configuration
 */
export function createDefaultAlertRouter(
  environment = 'development'
): AlertRouter {
  return new AlertRouter({
    environment,
    minSeverity: 'warning',
    suppressDuplicates: true,
    suppressionWindowMs: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Create alert router from environment variables
 */
export function createAlertRouterFromEnv(): AlertRouter {
  const config: AlertRouterConfig = {
    environment: process.env.NODE_ENV || 'development',
    region: process.env.AWS_REGION,
    accountId: process.env.AWS_ACCOUNT_ID,
    minSeverity: (process.env.ALERT_MIN_SEVERITY as AlertRouterConfig['minSeverity']) || 'warning',
    suppressDuplicates: process.env.ALERT_SUPPRESS_DUPLICATES !== 'false',
    suppressionWindowMs: parseInt(process.env.ALERT_SUPPRESSION_WINDOW_MS || '300000', 10),
  };

  // Configure SNS if topic ARN is set
  if (process.env.SNS_TOPIC_ARN) {
    config.sns = {
      topicArn: process.env.SNS_TOPIC_ARN,
      region: process.env.AWS_REGION || 'us-east-1',
    };
  }

  // Configure webhooks if URL is set
  if (process.env.ALERT_WEBHOOK_URL) {
    config.webhooks = [{
      url: process.env.ALERT_WEBHOOK_URL,
      method: 'POST',
      retries: 3,
      timeoutMs: 5000,
    }];
  }

  // Configure syslog sink if host is set
  if (process.env.SYSLOG_SINK_HOST) {
    config.syslogSink = {
      host: process.env.SYSLOG_SINK_HOST,
      port: parseInt(process.env.SYSLOG_SINK_PORT || '6514', 10),
      protocol: (process.env.SYSLOG_PROTOCOL as 'tcp' | 'udp' | 'tls') || 'tls',
      facility: parseInt(process.env.SYSLOG_FACILITY || '1', 10), // user-level
      appName: process.env.SYSLOG_APP_NAME || 'provider-drift-monitor',
    };
  }

  return new AlertRouter(config);
}

/**
 * Create production alert router for syslog sink monitoring
 */
export function createSyslogSinkAlertRouter(
  sinkHost: string,
  snsTopicArn?: string,
  webhookUrl?: string
): AlertRouter {
  const config: AlertRouterConfig = {
    environment: 'production',
    region: 'us-east-1',
    minSeverity: 'warning',
    suppressDuplicates: true,
    suppressionWindowMs: 5 * 60 * 1000,

    syslogSink: {
      host: sinkHost,
      port: 6514,
      protocol: 'tls',
      facility: 1,
      appName: 'provider-drift-monitor',
    },
  };

  if (snsTopicArn) {
    config.sns = {
      topicArn: snsTopicArn,
      region: 'us-east-1',
    };
  }

  if (webhookUrl) {
    config.webhooks = [{
      url: webhookUrl,
      method: 'POST',
      retries: 3,
      timeoutMs: 5000,
    }];
  }

  return new AlertRouter(config);
}
