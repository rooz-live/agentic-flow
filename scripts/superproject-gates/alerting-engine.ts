/**
 * Alerting Engine with Configurable Rules and Escalation
 * 
 * Implements comprehensive alerting system with rule evaluation,
 * escalation policies, multi-channel notifications, and auto-mitigation
 */

import { EventEmitter } from 'events';
import {
  Alert,
  AlertRule,
  AlertCondition,
  EscalationPolicy,
  EscalationLevel,
  NotificationChannel,
  Notification,
  NotificationType,
  Metric,
  MonitoringEvent,
  EventType
} from '../types';

export interface AlertingEngineConfig {
  evaluationInterval: number; // seconds
  maxConcurrentEvaluations: number;
  defaultCooldown: number; // seconds
  maxAlertsPerRule: number;
  autoResolution: boolean;
  notificationBatchSize: number;
  notificationRetryDelay: number; // seconds
  maxNotificationRetries: number;
}

export class AlertingEngine extends EventEmitter {
  private rules: Map<string, AlertRule> = new Map();
  private alerts: Map<string, Alert> = new Map();
  private escalationPolicies: Map<string, EscalationPolicy> = new Map();
  private notificationChannels: Map<string, NotificationChannel> = new Map();
  private notifications: Map<string, Notification> = new Map();
  
  private isRunning: boolean = false;
  private evaluationInterval: NodeJS.Timeout | null = null;
  private notificationInterval: NodeJS.Timeout | null = null;
  private metricsBuffer: Map<string, Metric[]> = new Map();
  
  private config: AlertingEngineConfig;

  constructor(config: Partial<AlertingEngineConfig> = {}) {
    super();
    
    this.config = {
      evaluationInterval: 30, // 30 seconds
      maxConcurrentEvaluations: 10,
      defaultCooldown: 300, // 5 minutes
      maxAlertsPerRule: 100,
      autoResolution: true,
      notificationBatchSize: 50,
      notificationRetryDelay: 60, // 1 minute
      maxNotificationRetries: 3,
      ...config
    };

    this.initializeDefaultComponents();
  }

  private initializeDefaultComponents(): void {
    // Create default escalation policies
    this.createDefaultEscalationPolicies();
    
    // Create default notification channels
    this.createDefaultNotificationChannels();
  }

  private createDefaultEscalationPolicies(): void {
    const defaultPolicy: EscalationPolicy = {
      id: 'default-escalation',
      name: 'Default Escalation Policy',
      levels: [
        {
          level: 1,
          delay: 0,
          notificationChannels: ['dashboard'],
          autoMitigation: false
        },
        {
          level: 2,
          delay: 300, // 5 minutes
          notificationChannels: ['email'],
          autoMitigation: false
        },
        {
          level: 3,
          delay: 900, // 15 minutes
          notificationChannels: ['email', 'webhook'],
          autoMitigation: true,
          mitigationActions: ['restart-service', 'scale-resources']
        }
      ]
    };

    this.escalationPolicies.set(defaultPolicy.id, defaultPolicy);
  }

  private createDefaultNotificationChannels(): void {
    // Dashboard notification channel
    const dashboardChannel: NotificationChannel = {
      id: 'dashboard',
      name: 'Dashboard Notifications',
      type: 'dashboard',
      enabled: true,
      config: {},
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Email notification channel
    const emailChannel: NotificationChannel = {
      id: 'email',
      name: 'Email Notifications',
      type: 'email',
      enabled: false,
      config: {
        recipients: ['admin@example.com'],
        subject: 'Agentic Flow Alert',
        template: 'default'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Webhook notification channel
    const webhookChannel: NotificationChannel = {
      id: 'webhook',
      name: 'Webhook Notifications',
      type: 'webhook',
      enabled: false,
      config: {
        url: 'https://hooks.slack.com/services/...',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.notificationChannels.set(dashboardChannel.id, dashboardChannel);
    this.notificationChannels.set(emailChannel.id, emailChannel);
    this.notificationChannels.set(webhookChannel.id, webhookChannel);
  }

  public async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[ALERTING] Alerting engine already running');
      return;
    }

    this.isRunning = true;
    console.log('[ALERTING] Starting alerting engine');

    // Start rule evaluation interval
    this.evaluationInterval = setInterval(() => {
      this.evaluateRules();
    }, this.config.evaluationInterval * 1000);

    // Start notification processing interval
    this.notificationInterval = setInterval(() => {
      this.processNotifications();
    }, 5000); // Every 5 seconds

    // Perform initial evaluation
    await this.evaluateRules();

    console.log('[ALERTING] Alerting engine started');
  }

  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    if (this.evaluationInterval) {
      clearInterval(this.evaluationInterval);
      this.evaluationInterval = null;
    }

    if (this.notificationInterval) {
      clearInterval(this.notificationInterval);
      this.notificationInterval = null;
    }

    console.log('[ALERTING] Alerting engine stopped');
  }

  // Rule Management
  public createRule(rule: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt'>): AlertRule {
    const id = this.generateId('alert-rule');
    const newRule: AlertRule = {
      ...rule,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.rules.set(id, newRule);
    this.emit('ruleCreated', newRule);
    
    console.log(`[ALERTING] Created alert rule: ${newRule.name}`);
    return newRule;
  }

  public updateRule(id: string, updates: Partial<AlertRule>): AlertRule | null {
    const rule = this.rules.get(id);
    if (!rule) {
      return null;
    }

    const updatedRule: AlertRule = {
      ...rule,
      ...updates,
      updatedAt: new Date()
    };

    this.rules.set(id, updatedRule);
    this.emit('ruleUpdated', updatedRule);
    
    console.log(`[ALERTING] Updated alert rule: ${updatedRule.name}`);
    return updatedRule;
  }

  public deleteRule(id: string): boolean {
    const rule = this.rules.get(id);
    if (!rule) {
      return false;
    }

    this.rules.delete(id);
    
    // Resolve any active alerts for this rule
    const activeAlerts = Array.from(this.alerts.values())
      .filter(alert => alert.ruleId === id && alert.status === 'firing');
    
    for (const alert of activeAlerts) {
      this.resolveAlert(alert.id, 'Rule deleted');
    }

    this.emit('ruleDeleted', { id, name: rule.name });
    console.log(`[ALERTING] Deleted alert rule: ${rule.name}`);
    return true;
  }

  public getRule(id: string): AlertRule | undefined {
    return this.rules.get(id);
  }

  public getAllRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  // Alert Management
  public getAlert(id: string): Alert | undefined {
    return this.alerts.get(id);
  }

  public getAllAlerts(filters?: {
    status?: Alert['status'];
    severity?: Alert['severity'];
    ruleId?: string;
  }): Alert[] {
    let alerts = Array.from(this.alerts.values());

    if (filters) {
      if (filters.status) {
        alerts = alerts.filter(alert => alert.status === filters.status);
      }
      if (filters.severity) {
        alerts = alerts.filter(alert => alert.severity === filters.severity);
      }
      if (filters.ruleId) {
        alerts = alerts.filter(alert => alert.ruleId === filters.ruleId);
      }
    }

    return alerts.sort((a, b) => b.triggeredAt.getTime() - a.triggeredAt.getTime());
  }

  public acknowledgeAlert(id: string, acknowledgedBy: string): boolean {
    const alert = this.alerts.get(id);
    if (!alert || alert.status !== 'firing') {
      return false;
    }

    alert.status = 'acknowledged';
    alert.acknowledgedAt = new Date();
    alert.acknowledgedBy = acknowledgedBy;

    this.alerts.set(id, alert);
    this.emit('alertAcknowledged', alert);
    
    console.log(`[ALERTING] Alert acknowledged: ${alert.id} by ${acknowledgedBy}`);
    return true;
  }

  public resolveAlert(id: string, resolvedBy?: string): boolean {
    const alert = this.alerts.get(id);
    if (!alert || alert.status === 'resolved') {
      return false;
    }

    alert.status = 'resolved';
    alert.resolvedAt = new Date();
    if (resolvedBy) {
      alert.resolvedBy = resolvedBy;
    }

    this.alerts.set(id, alert);
    this.emit('alertResolved', alert);
    
    console.log(`[ALERTING] Alert resolved: ${alert.id}${resolvedBy ? ` by ${resolvedBy}` : ''}`);
    return true;
  }

  // Escalation Policy Management
  public createEscalationPolicy(policy: Omit<EscalationPolicy, 'id'>): EscalationPolicy {
    const id = this.generateId('escalation-policy');
    const newPolicy: EscalationPolicy = { ...policy, id };
    this.escalationPolicies.set(id, newPolicy);
    return newPolicy;
  }

  public getEscalationPolicy(id: string): EscalationPolicy | undefined {
    return this.escalationPolicies.get(id);
  }

  // Notification Channel Management
  public createNotificationChannel(channel: Omit<NotificationChannel, 'id' | 'createdAt' | 'updatedAt'>): NotificationChannel {
    const id = this.generateId('notification-channel');
    const newChannel: NotificationChannel = {
      ...channel,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.notificationChannels.set(id, newChannel);
    return newChannel;
  }

  public updateNotificationChannel(id: string, updates: Partial<NotificationChannel>): NotificationChannel | null {
    const channel = this.notificationChannels.get(id);
    if (!channel) {
      return null;
    }

    const updatedChannel: NotificationChannel = {
      ...channel,
      ...updates,
      updatedAt: new Date()
    };

    this.notificationChannels.set(id, updatedChannel);
    return updatedChannel;
  }

  public getNotificationChannel(id: string): NotificationChannel | undefined {
    return this.notificationChannels.get(id);
  }

  public getAllNotificationChannels(): NotificationChannel[] {
    return Array.from(this.notificationChannels.values());
  }

  // Metrics Processing
  public addMetrics(metrics: Metric[]): void {
    for (const metric of metrics) {
      const buffer = this.metricsBuffer.get(metric.id) || [];
      buffer.push(metric);
      
      // Keep only recent metrics (last hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentMetrics = buffer.filter(m => m.timestamp >= oneHourAgo);
      
      this.metricsBuffer.set(metric.id, recentMetrics);
    }
  }

  private async evaluateRules(): Promise<void> {
    const enabledRules = Array.from(this.rules.values()).filter(rule => rule.enabled);
    
    for (const rule of enabledRules) {
      try {
        await this.evaluateRule(rule);
      } catch (error) {
        console.error(`[ALERTING] Error evaluating rule ${rule.name}:`, error);
      }
    }
  }

  private async evaluateRule(rule: AlertRule): Promise<void> {
    const metrics = this.metricsBuffer.get(rule.metricId) || [];
    if (metrics.length === 0) {
      return;
    }

    // Check cooldown
    const lastAlert = Array.from(this.alerts.values())
      .filter(alert => alert.ruleId === rule.id && alert.status === 'firing')
      .sort((a, b) => b.triggeredAt.getTime() - a.triggeredAt.getTime())[0];

    if (lastAlert && (Date.now() - lastAlert.triggeredAt.getTime()) < rule.cooldown * 1000) {
      return;
    }

    // Evaluate condition
    const condition = rule.condition;
    const timeWindow = condition.timeWindow || 300; // 5 minutes default
    const cutoffTime = new Date(Date.now() - timeWindow * 1000);
    const recentMetrics = metrics.filter(m => m.timestamp >= cutoffTime);

    if (recentMetrics.length === 0) {
      return;
    }

    let value: number;
    if (condition.aggregation) {
      value = this.calculateAggregation(recentMetrics, condition.aggregation);
    } else {
      value = recentMetrics[recentMetrics.length - 1].value;
    }

    const isTriggered = this.evaluateCondition(value, rule.threshold, condition.operator);

    if (isTriggered) {
      await this.triggerAlert(rule, value);
    } else if (this.config.autoResolution) {
      // Auto-resolve alerts for this rule if condition is no longer met
      const activeAlerts = Array.from(this.alerts.values())
        .filter(alert => alert.ruleId === rule.id && alert.status === 'firing');
      
      for (const alert of activeAlerts) {
        this.resolveAlert(alert.id, 'Auto-resolution');
      }
    }
  }

  private calculateAggregation(metrics: Metric[], aggregation: string): number {
    const values = metrics.map(m => m.value);
    
    switch (aggregation) {
      case 'avg':
        return values.reduce((sum, val) => sum + val, 0) / values.length;
      case 'sum':
        return values.reduce((sum, val) => sum + val, 0);
      case 'min':
        return Math.min(...values);
      case 'max':
        return Math.max(...values);
      case 'count':
        return values.length;
      default:
        return values[values.length - 1];
    }
  }

  private evaluateCondition(value: number, threshold: number, operator: string): boolean {
    switch (operator) {
      case '>':
        return value > threshold;
      case '<':
        return value < threshold;
      case '>=':
        return value >= threshold;
      case '<=':
        return value <= threshold;
      case '==':
        return value === threshold;
      case '!=':
        return value !== threshold;
      default:
        return false;
    }
  }

  private async triggerAlert(rule: AlertRule, value: number): Promise<void> {
    // Check if we already have too many alerts for this rule
    const activeAlerts = Array.from(this.alerts.values())
      .filter(alert => alert.ruleId === rule.id && alert.status === 'firing');
    
    if (activeAlerts.length >= this.config.maxAlertsPerRule) {
      console.warn(`[ALERTING] Max alerts reached for rule ${rule.name}`);
      return;
    }

    // Check if there's already a similar alert
    const similarAlert = activeAlerts.find(alert => 
      Math.abs(alert.value - value) < (rule.threshold * 0.1) // Within 10% of threshold
    );

    if (similarAlert) {
      return; // Don't create duplicate alerts
    }

    const id = this.generateId('alert');
    const alert: Alert = {
      id,
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      status: 'firing',
      message: `${rule.name}: ${value} ${rule.threshold} ${rule.condition.operator}`,
      value,
      threshold: rule.threshold,
      triggeredAt: new Date(),
      labels: {
        rule: rule.name,
        metric: rule.metricId,
        severity: rule.severity
      },
      annotations: {
        description: rule.description,
        condition: JSON.stringify(rule.condition)
      },
      escalationLevel: 1
    };

    this.alerts.set(id, alert);
    this.emit('alertTriggered', alert);
    
    console.log(`[ALERTING] Alert triggered: ${alert.message}`);

    // Create notifications
    await this.createNotifications(alert, rule);
  }

  private async createNotifications(alert: Alert, rule: AlertRule): Promise<void> {
    const policy = rule.escalationPolicy ? 
      this.escalationPolicies.get(rule.escalationPolicy) :
      this.escalationPolicies.get('default-escalation');

    if (!policy) {
      return;
    }

    const escalationLevel = policy.levels.find(level => level.level === 1);
    if (!escalationLevel) {
      return;
    }

    for (const channelId of escalationLevel.notificationChannels) {
      const channel = this.notificationChannels.get(channelId);
      if (!channel || !channel.enabled) {
        continue;
      }

      const notification = this.createNotification(alert, channel);
      this.notifications.set(notification.id, notification);
    }
  }

  private createNotification(alert: Alert, channel: NotificationChannel): Notification {
    const id = this.generateId('notification');
    
    let recipient = '';
    const subject = `Alert: ${alert.ruleName}`;
    const message = alert.message;

    switch (channel.type) {
      case 'email':
        recipient = (channel.config.recipients as string[])?.join(',') || '';
        break;
      case 'webhook':
        recipient = channel.config.url || '';
        break;
      case 'slack':
        recipient = channel.config.channel || '';
        break;
      default:
        recipient = 'dashboard';
    }

    const notification: Notification = {
      id,
      channelId: channel.id,
      alertId: alert.id,
      type: channel.type,
      status: 'pending',
      recipient,
      subject,
      message,
      retryCount: 0,
      maxRetries: this.config.maxNotificationRetries
    };

    return notification;
  }

  private async processNotifications(): Promise<void> {
    const pendingNotifications = Array.from(this.notifications.values())
      .filter(n => n.status === 'pending' || n.status === 'retrying')
      .slice(0, this.config.notificationBatchSize);

    for (const notification of pendingNotifications) {
      try {
        await this.sendNotification(notification);
      } catch (error) {
        console.error(`[ALERTING] Failed to send notification ${notification.id}:`, error);
        this.handleNotificationFailure(notification);
      }
    }
  }

  private async sendNotification(notification: Notification): Promise<void> {
    const channel = this.notificationChannels.get(notification.channelId);
    if (!channel) {
      throw new Error(`Notification channel not found: ${notification.channelId}`);
    }

    // Simulate sending notification
    await new Promise(resolve => setTimeout(resolve, 100));

    notification.status = 'sent';
    notification.sentAt = new Date();
    this.notifications.set(notification.id, notification);

    this.emit('notificationSent', notification);
    console.log(`[ALERTING] Notification sent: ${notification.id} via ${channel.type}`);
  }

  private handleNotificationFailure(notification: Notification): void {
    notification.retryCount++;
    
    if (notification.retryCount >= notification.maxRetries) {
      notification.status = 'failed';
      console.error(`[ALERTING] Notification failed permanently: ${notification.id}`);
    } else {
      notification.status = 'retrying';
      // Schedule retry with exponential backoff
      const delay = this.config.notificationRetryDelay * Math.pow(2, notification.retryCount - 1);
      setTimeout(() => {
        this.notifications.set(notification.id, notification);
      }, delay * 1000);
    }
  }

  // Escalation Management
  private async processEscalations(): Promise<void> {
    const firingAlerts = Array.from(this.alerts.values())
      .filter(alert => alert.status === 'firing');

    for (const alert of firingAlerts) {
      const rule = this.rules.get(alert.ruleId);
      if (!rule || !rule.escalationPolicy) {
        continue;
      }

      const policy = this.escalationPolicies.get(rule.escalationPolicy);
      if (!policy) {
        continue;
      }

      await this.checkEscalation(alert, rule, policy);
    }
  }

  private async checkEscalation(alert: Alert, rule: AlertRule, policy: EscalationPolicy): Promise<void> {
    const currentLevel = alert.escalationLevel || 1;
    const nextLevel = policy.levels.find(level => level.level === currentLevel + 1);
    
    if (!nextLevel) {
      return; // Already at max escalation level
    }

    const timeSinceTriggered = Date.now() - alert.triggeredAt.getTime();
    if (timeSinceTriggered < nextLevel.delay * 1000) {
      return; // Not time for escalation yet
    }

    // Escalate alert
    alert.escalationLevel = currentLevel + 1;
    this.alerts.set(alert.id, alert);

    // Create notifications for next level
    for (const channelId of nextLevel.notificationChannels) {
      const channel = this.notificationChannels.get(channelId);
      if (!channel || !channel.enabled) {
        continue;
      }

      const notification = this.createNotification(alert, channel);
      this.notifications.set(notification.id, notification);
    }

    // Execute auto-mitigation actions if configured
    if (nextLevel.autoMitigation && nextLevel.mitigationActions) {
      await this.executeMitigationActions(alert, nextLevel.mitigationActions);
    }

    this.emit('alertEscalated', { alert, level: currentLevel + 1 });
    console.log(`[ALERTING] Alert escalated: ${alert.id} to level ${currentLevel + 1}`);
  }

  private async executeMitigationActions(alert: Alert, actions: string[]): Promise<void> {
    for (const action of actions) {
      try {
        console.log(`[ALERTING] Executing mitigation action: ${action} for alert ${alert.id}`);
        
        // Simulate mitigation action execution
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        this.emit('mitigationActionExecuted', { alertId: alert.id, action });
      } catch (error) {
        console.error(`[ALERTING] Mitigation action failed: ${action}`, error);
      }
    }
  }

  // Statistics and Monitoring
  public getStatistics(): {
    totalRules: number;
    enabledRules: number;
    totalAlerts: number;
    firingAlerts: number;
    resolvedAlerts: number;
    totalNotifications: number;
    pendingNotifications: number;
    failedNotifications: number;
  } {
    const rules = Array.from(this.rules.values());
    const alerts = Array.from(this.alerts.values());
    const notifications = Array.from(this.notifications.values());

    return {
      totalRules: rules.length,
      enabledRules: rules.filter(r => r.enabled).length,
      totalAlerts: alerts.length,
      firingAlerts: alerts.filter(a => a.status === 'firing').length,
      resolvedAlerts: alerts.filter(a => a.status === 'resolved').length,
      totalNotifications: notifications.length,
      pendingNotifications: notifications.filter(n => n.status === 'pending').length,
      failedNotifications: notifications.filter(n => n.status === 'failed').length
    };
  }

  private generateId(type: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `${type}-${timestamp}-${random}`;
  }
}