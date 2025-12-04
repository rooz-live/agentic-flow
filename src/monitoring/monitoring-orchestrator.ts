import { EventEmitter } from 'events';
import { Metrics } from '../notifications/metrics';
import { EnhancedMetrics } from './enhanced-metrics';
import { DistributedTracing } from './distributed-tracing';
import { CentralizedLogging, LogLevel } from './centralized-logging';
import { SecurityMonitoring } from './security-monitoring';
import { AutomationSelfHealing } from './automation-self-healing';

export interface MonitoringOrchestratorConfig {
  service: {
    name: string;
    version: string;
    environment: string;
  };
  metrics: {
    enabled: boolean;
    provider: 'prometheus' | 'otel' | 'custom';
    endpoint?: string;
    sampleRate?: number;
  };
  tracing: {
    enabled: boolean;
    provider: 'jaeger' | 'otel' | 'zipkin';
    endpoint?: string;
    sampleRate?: number;
  };
  logging: {
    enabled: boolean;
    level: LogLevel;
    provider: 'elk' | 'file' | 'console';
    endpoint?: string;
    structured: boolean;
  };
  security: {
    enabled: boolean;
    anomalyDetection: boolean;
    threatIntelligence: boolean;
  };
  automation: {
    enabled: boolean;
    selfHealing: boolean;
  };
  healthChecks: Array<{
    name: string;
    endpoint: string;
    interval: number;
    timeout: number;
  }>;
}

export class MonitoringOrchestrator {
  private config: MonitoringOrchestratorConfig;
  private eventBus: EventEmitter;
  private baseMetrics: Metrics;
  private enhancedMetrics: EnhancedMetrics;
  private tracing: DistributedTracing;
  private logging: CentralizedLogging;
  private security: SecurityMonitoring;
  private automation: AutomationSelfHealing;
  private isInitialized: boolean = false;

  constructor(config: MonitoringOrchestratorConfig) {
    this.config = config;
    this.eventBus = new EventEmitter();
    this.initialize();
  }

  private async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Initialize base metrics
      this.baseMetrics = this.createMetricsProvider();

      // Initialize enhanced metrics
      this.enhancedMetrics = new EnhancedMetrics(
        this.baseMetrics,
        {
          service: this.config.service.name,
          version: this.config.service.version,
          environment: this.config.service.environment
        },
        this.eventBus
      );

      // Initialize logging
      this.logging = new CentralizedLogging(
        {
          service: this.config.service.name,
          version: this.config.service.version,
          environment: this.config.service.environment,
          logLevel: this.config.logging.level,
          enableConsole: true,
          enableFile: this.config.logging.provider === 'file',
          enableRemote: this.config.logging.provider === 'elk',
          remoteEndpoint: this.config.logging.endpoint,
          enableStructuredLogging: this.config.logging.structured,
          sanitizeErrors: true
        },
        this.eventBus
      );

      // Initialize tracing
      this.tracing = new DistributedTracing(
        {
          serviceName: this.config.service.name,
          serviceVersion: this.config.service.version,
          environment: this.config.service.environment,
          endpoint: this.config.tracing.endpoint || 'http://localhost:14268',
          sampleRate: this.config.tracing.sampleRate || 1.0,
          enableAutoInstrumentation: true
        },
        this.eventBus
      );

      // Initialize security monitoring
      this.security = new SecurityMonitoring(
        {
          enableRealTimeMonitoring: this.config.security.enabled,
          enableAnomalyDetection: this.config.security.anomalyDetection,
          enableThreatIntelligence: this.config.security.threatIntelligence,
          rateLimitThresholds: {
            'login_attempts_per_minute': 5,
            'api_requests_per_minute': 100,
            'failed_auth_per_hour': 10
          }
        },
        this.eventBus,
        this.enhancedMetrics,
        this.logging
      );

      // Initialize automation and self-healing
      this.automation = new AutomationSelfHealing(
        {
          enableAutomation: this.config.automation.enabled,
          enableSelfHealing: this.config.automation.selfHealing,
          healthChecks: this.config.healthChecks.map(hc => ({
            id: hc.name,
            name: hc.name,
            endpoint: hc.endpoint,
            method: 'GET',
            expectedStatus: 200,
            timeout: hc.timeout,
            interval: hc.interval,
            retries: 3
          })),
          automationRules: this.getDefaultAutomationRules(),
          maintenanceWindows: {
            startHour: 22,
            endHour: 6,
            daysOfWeek: [0, 6]
          }
        },
        this.eventBus,
        this.enhancedMetrics,
        this.logging,
        this.security
      );

      // Setup cross-component event integration
      this.setupCrossComponentIntegration();

      this.isInitialized = true;
      this.logging.info('Monitoring orchestrator initialized successfully', {
        component: 'monitoring-orchestrator',
        service: this.config.service.name,
        environment: this.config.service.environment
      });

    } catch (error) {
      console.error('Failed to initialize monitoring orchestrator:', error);
      throw error;
    }
  }

  private createMetricsProvider(): Metrics {
    // This would create the appropriate metrics provider based on config
    // For now, we'll use a simple implementation
    try {
      // Try to use prom-client if available
      const promClient = require('prom-client');
      const { PromMetrics } = require('../notifications/prom_metrics');
      return new PromMetrics();
    } catch {
      // Fallback to no-op metrics
      const { NoopMetrics } = require('../notifications/metrics');
      return new NoopMetrics();
    }
  }

  private setupCrossComponentIntegration(): void {
    // Forward metrics events to enhanced metrics
    this.eventBus.on('metric:counter', (data: any) => {
      this.enhancedMetrics.inc(data.name, data.value, data.labels);
    });

    this.eventBus.on('metric:gauge', (data: any) => {
      this.enhancedMetrics.gauge(data.name, data.value, data.labels);
    });

    this.eventBus.on('metric:histogram', (data: any) => {
      this.enhancedMetrics.observe(data.name, data.value, data.labels);
    });

    // Forward log events to centralized logging
    this.eventBus.on('log:created', (logEntry: any) => {
      this.logging.log(logEntry.level, logEntry.message, logEntry.metadata);
    });

    // Forward security events to security monitoring
    this.eventBus.on('security:event', (event: any) => {
      this.security.recordSecurityEvent(
        event.eventType,
        event.severity,
        event.source,
        event.details,
        {
          userId: event.userId,
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
          resource: event.resource,
          action: event.action,
          outcome: event.outcome
        }
      );
    });

    // Forward service failures to automation
    this.eventBus.on('service:failure', (failure: any) => {
      this.automation.handleServiceFailure(failure);
    });

    // Setup middleware for HTTP requests
    this.setupHTTPMiddleware();
  }

  private setupHTTPMiddleware(): void {
    // This would integrate with Express.js or other web framework
    // For now, we'll provide a middleware function
    this.eventBus.emit('middleware:http', this.createHTTPMiddleware());
  }

  private createHTTPMiddleware(): any {
    return (req: any, res: any, next: any) => {
      const startTime = Date.now();
      const requestId = this.generateRequestId();

      // Add trace context
      const traceHeaders = this.tracing.injectTraceContext({});
      Object.assign(req.headers, traceHeaders);

      // Start trace span
      return this.tracing.withSpan({
        name: 'http_request',
        kind: 'server' as any,
        attributes: {
          'http.method': req.method,
          'http.url': req.url,
          'http.user_agent': req.headers['user-agent'] || 'unknown',
          'http.remote_addr': req.ip || 'unknown'
        }
      }, async (span) => {
        try {
          // Log request
          this.logging.info(`${req.method} ${req.url}`, {
            component: 'http-server',
            requestId,
            method: req.method,
            url: req.url,
            userAgent: req.headers['user-agent'],
            ip: req.ip
          });

          // Record metrics
          this.enhancedMetrics.recordHttpRequest(
            req.method,
            req.url,
            res.statusCode,
            Date.now() - startTime
          );

          // Continue with request
          await next();

          // Log response
          this.logging.info(`${req.method} ${req.url} - ${res.statusCode}`, {
            component: 'http-server',
            requestId,
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            duration: Date.now() - startTime
          });

        } catch (error) {
          this.logging.error(`HTTP request error: ${req.method} ${req.url}`, error, {
            component: 'http-server',
            requestId,
            method: req.method,
            url: req.url
          });

          span.recordException(error instanceof Error ? error : new Error(String(error)));
          throw error;
        }
      });
    };
  }

  private getDefaultAutomationRules(): any[] {
    return [
      {
        id: 'auto_restart_high_cpu',
        name: 'Auto Restart on High CPU',
        description: 'Automatically restart services when CPU usage is high',
        enabled: true,
        trigger: {
          metricName: 'cpu_usage_percent',
          operator: 'gt',
          threshold: 90,
          duration: 300 // 5 minutes
        },
        actions: [
          {
            type: 'send_alert',
            parameters: {
              message: 'High CPU usage detected - considering restart',
              severity: 'warning',
              channels: ['email', 'slack']
            }
          },
          {
            type: 'restart_service',
            parameters: {
              serviceName: 'agentic-flow-app'
            }
          }
        ],
        cooldownPeriod: 600, // 10 minutes
        maxExecutionsPerHour: 2
      },
      {
        id: 'auto_scale_high_memory',
        name: 'Auto Scale on High Memory',
        description: 'Automatically scale services when memory usage is high',
        enabled: true,
        trigger: {
          metricName: 'memory_usage_percent',
          operator: 'gt',
          threshold: 85,
          duration: 300 // 5 minutes
        },
        actions: [
          {
            type: 'send_alert',
            parameters: {
              message: 'High memory usage detected - scaling up',
              severity: 'warning',
              channels: ['email', 'slack']
            }
          },
          {
            type: 'scale_up',
            parameters: {
              serviceName: 'agentic-flow-app',
              instances: 1
            }
          }
        ],
        cooldownPeriod: 900, // 15 minutes
        maxExecutionsPerHour: 2
      },
      {
        id: 'auto_clear_cache_low_disk',
        name: 'Auto Clear Cache on Low Disk',
        description: 'Automatically clear cache when disk space is low',
        enabled: true,
        trigger: {
          metricName: 'disk_usage_percent',
          operator: 'gt',
          threshold: 90,
          duration: 180 // 3 minutes
        },
        actions: [
          {
            type: 'send_alert',
            parameters: {
              message: 'Low disk space detected - clearing cache',
              severity: 'critical',
              channels: ['email', 'slack', 'discord']
            }
          },
          {
            type: 'clear_cache',
            parameters: {
              cacheType: 'all'
            }
          }
        ],
        cooldownPeriod: 1800, // 30 minutes
        maxExecutionsPerHour: 1
      },
      {
        id: 'security_block_brute_force',
        name: 'Auto Block Brute Force',
        description: 'Automatically block IPs with brute force attacks',
        enabled: true,
        trigger: {
          metricName: 'security_events_total',
          operator: 'gt',
          threshold: 5,
          duration: 60, // 1 minute
          labels: {
            event_type: 'authentication_failure'
          }
        },
        actions: [
          {
            type: 'block_ip',
            parameters: {
              ipAddress: '{{ip}}', // Would be dynamically replaced
              reason: 'Brute force attack detected'
            }
          },
          {
            type: 'send_alert',
            parameters: {
              message: 'Brute force attack detected - IP blocked',
              severity: 'critical',
              channels: ['email', 'slack', 'discord']
            }
          }
        ],
        cooldownPeriod: 300, // 5 minutes
        maxExecutionsPerHour: 10
      }
    ];
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public API methods
  async start(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    this.logging.info('Monitoring orchestrator started', {
      component: 'monitoring-orchestrator',
      service: this.config.service.name
    });

    // Start background tasks
    this.startBackgroundTasks();
  }

  private startBackgroundTasks(): void {
    // Periodic health checks
    setInterval(() => {
      this.performHealthChecks();
    }, 60000); // Every minute

    // Periodic metrics collection
    setInterval(() => {
      this.collectSystemMetrics();
    }, 30000); // Every 30 seconds

    // Periodic cleanup
    setInterval(() => {
      this.performCleanup();
    }, 3600000); // Every hour
  }

  private async performHealthChecks(): Promise<void> {
    for (const healthCheck of this.config.healthChecks) {
      try {
        const response = await fetch(healthCheck.endpoint, {
          method: 'GET',
          timeout: healthCheck.timeout * 1000
        });

        const isHealthy = response.status === 200;
        
        this.enhancedMetrics.recordHealthCheck(
          healthCheck.name,
          isHealthy ? 'pass' : 'fail',
          Date.now() - (response as any).startTime || 0,
          isHealthy ? null : `Status: ${response.status}`
        );

        if (!isHealthy) {
          this.eventBus.emit('health:check_failed', {
            healthCheck,
            status: response.status
          });
        }

      } catch (error) {
        this.enhancedMetrics.recordHealthCheck(
          healthCheck.name,
          'fail',
          healthCheck.timeout * 1000,
          error instanceof Error ? error.message : 'Unknown error'
        );

        this.eventBus.emit('health:check_failed', {
          healthCheck,
          error
        });
      }
    }
  }

  private collectSystemMetrics(): void {
    // This would collect system metrics
    // For now, we'll record some basic metrics
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    this.enhancedMetrics.recordResourceUsage('memory', memUsage.heapUsed, memUsage.heapTotal);
    this.enhancedMetrics.recordResourceUsage('cpu', cpuUsage.user, 100); // Normalize
  }

  private performCleanup(): void {
    // Clean up old logs, metrics, etc.
    this.logging.info('Performing periodic cleanup', {
      component: 'monitoring-orchestrator',
      action: 'cleanup'
    });
  }

  // Component integration methods
  recordAgentActivity(agentId: string, agentType: string, taskType: string, duration: number, success: boolean): void {
    this.enhancedMetrics.recordAgentActivity(agentId, agentType, taskType, duration, success);
  }

  recordDiscordActivity(eventType: string, command?: string, duration?: number, success?: boolean): void {
    this.enhancedMetrics.recordDiscordActivity(eventType, command, duration, success);
  }

  recordTradingActivity(symbol: string, orderType: string, quantity: number, price: number, success: boolean): void {
    this.enhancedMetrics.recordTradingActivity(symbol, orderType, quantity, price, success);
  }

  recordPaymentActivity(paymentId: string, amount: number, currency: string, method: string, success: boolean): void {
    this.enhancedMetrics.recordPaymentActivity(paymentId, amount, currency, method, success);
  }

  recordGovernanceActivity(decisionType: string, duration: number, outcome: 'approved' | 'rejected' | 'escalated'): void {
    this.enhancedMetrics.recordGovernanceActivity(decisionType, duration, outcome);
  }

  recordSecurityEvent(eventType: any, severity: any, source: string, details: any): void {
    this.security.recordSecurityEvent(eventType, severity, source, details);
  }

  recordBusinessMetric(metricName: string, value: number, unit?: string): void {
    this.enhancedMetrics.recordBusinessMetric(metricName, value, unit);
  }

  // Tracing methods
  async traceAgentActivity(agentId: string, agentType: string, taskType: string, taskData: any, fn: any): Promise<any> {
    return this.tracing.traceAgentActivity(agentId, agentType, taskType, taskData, fn);
  }

  async traceDiscordActivity(eventType: string, guildId: string, channelId: string, userId: string, command?: string, fn: any): Promise<any> {
    return this.tracing.traceDiscordActivity(eventType, guildId, channelId, userId, command, fn);
  }

  async traceTradingActivity(symbol: string, orderType: string, orderData: any, fn: any): Promise<any> {
    return this.tracing.traceTradingActivity(symbol, orderType, orderData, fn);
  }

  async tracePaymentActivity(paymentId: string, amount: number, currency: string, method: string, fn: any): Promise<any> {
    return this.tracing.tracePaymentActivity(paymentId, amount, currency, method, fn);
  }

  async traceGovernanceActivity(decisionType: string, context: any, fn: any): Promise<any> {
    return this.tracing.traceGovernanceActivity(decisionType, context, fn);
  }

  // Health and status methods
  getHealthStatus(): {
    overall: 'healthy' | 'degraded' | 'unhealthy';
    components: Record<string, 'healthy' | 'degraded' | 'unhealthy'>;
    lastCheck: string;
  } {
    const components: Record<string, 'healthy' | 'degraded' | 'unhealthy'> = {};
    let healthyCount = 0;
    let totalCount = 0;

    for (const healthCheck of this.config.healthChecks) {
      const result = this.automation.getHealthCheckResults().get(healthCheck.name);
      if (result) {
        components[healthCheck.name] = result.status;
        totalCount++;
        if (result.status === 'healthy') {
          healthyCount++;
        }
      }
    }

    let overall: 'healthy' | 'degraded' | 'unhealthy';
    if (healthyCount === totalCount) {
      overall = 'healthy';
    } else if (healthyCount > totalCount / 2) {
      overall = 'degraded';
    } else {
      overall = 'unhealthy';
    }

    return {
      overall,
      components,
      lastCheck: new Date().toISOString()
    };
  }

  getMetrics(): any {
    return this.enhancedMetrics;
  }

  getSecurityStatus(): any {
    return this.security.getSecurityMetrics();
  }

  getAutomationStatus(): any {
    return {
      activeHealing: this.automation.getActiveHealing(),
      automationRules: this.automation.getAutomationRules()
    };
  }

  async stop(): Promise<void> {
    this.logging.info('Monitoring orchestrator stopping', {
      component: 'monitoring-orchestrator'
    });

    // Stop all components
    if (this.tracing) {
      await this.tracing.shutdown();
    }

    if (this.automation) {
      this.automation.destroy();
    }

    if (this.logging) {
      this.logging.destroy();
    }

    this.isInitialized = false;
  }

  // Configuration methods
  updateConfig(updates: Partial<MonitoringOrchestratorConfig>): void {
    Object.assign(this.config, updates);
    this.logging.info('Monitoring orchestrator configuration updated', {
      component: 'monitoring-orchestrator',
      updates
    });
  }

  getConfig(): MonitoringOrchestratorConfig {
    return { ...this.config };
  }
}

export default MonitoringOrchestrator;