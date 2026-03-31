import { Metrics } from '../notifications/metrics';
import { EventEmitter } from 'events';

export interface EnhancedMetricsConfig {
  service: string;
  version: string;
  environment: string;
  enableTracing?: boolean;
  enableProfiling?: boolean;
  customLabels?: Record<string, string>;
}

export class EnhancedMetrics implements Metrics {
  private baseMetrics: Metrics;
  private config: EnhancedMetricsConfig;
  private eventBus: EventEmitter;
  private startTime: number = Date.now();

  constructor(baseMetrics: Metrics, config: EnhancedMetricsConfig, eventBus: EventEmitter) {
    this.baseMetrics = baseMetrics;
    this.config = config;
    this.eventBus = eventBus;
    this.initializeMetrics();
  }

  private initializeMetrics(): void {
    // Initialize base metrics with common labels
    this.baseMetrics.gauge('service_start_time', Date.now());
    this.baseMetrics.gauge('service_version', 1, {
      service: this.config.service,
      version: this.config.version,
      environment: this.config.environment,
      ...this.config.customLabels
    });
  }

  // Counter metrics
  inc(name: string, value: number = 1, labels?: Record<string, string | number>): void {
    const enhancedLabels = {
      service: this.config.service,
      environment: this.config.environment,
      ...this.config.customLabels,
      ...labels
    };

    this.baseMetrics.inc(name, value, enhancedLabels);
    
    // Emit event for tracing
    this.eventBus.emit('metric:counter', {
      name,
      value,
      labels: enhancedLabels,
      timestamp: Date.now()
    });
  }

  // Gauge metrics
  gauge(name: string, value: number, labels?: Record<string, string | number>): void {
    const enhancedLabels = {
      service: this.config.service,
      environment: this.config.environment,
      ...this.config.customLabels,
      ...labels
    };

    this.baseMetrics.gauge(name, value, enhancedLabels);
    
    // Emit event for tracing
    this.eventBus.emit('metric:gauge', {
      name,
      value,
      labels: enhancedLabels,
      timestamp: Date.now()
    });
  }

  // Histogram metrics
  observe(name: string, value: number, labels?: Record<string, string | number>): void {
    const enhancedLabels = {
      service: this.config.service,
      environment: this.config.environment,
      ...this.config.customLabels,
      ...labels
    };

    this.baseMetrics.observe(name, value, enhancedLabels);
    
    // Emit event for tracing
    this.eventBus.emit('metric:histogram', {
      name,
      value,
      labels: enhancedLabels,
      timestamp: Date.now()
    });
  }

  // Application-specific metrics
  recordHttpRequest(method: string, route: string, statusCode: number, duration: number): void {
    this.inc('http_requests_total', 1, {
      method,
      route,
      status_code: statusCode.toString(),
      status_class: this.getStatusClass(statusCode)
    });

    this.observe('http_request_duration_ms', duration, {
      method,
      route,
      status_code: statusCode.toString()
    });

    // Record error rate
    if (statusCode >= 400) {
      this.inc('http_errors_total', 1, {
        method,
        route,
        status_code: statusCode.toString(),
        error_type: statusCode >= 500 ? 'server_error' : 'client_error'
      });
    }
  }

  recordDatabaseQuery(operation: string, table: string, duration: number, success: boolean): void {
    this.observe('db_query_duration_ms', duration, {
      operation,
      table,
      success: success.toString()
    });

    if (!success) {
      this.inc('db_query_errors_total', 1, {
        operation,
        table
      });
    }
  }

  recordCacheOperation(operation: 'hit' | 'miss' | 'set' | 'delete', key: string): void {
    this.inc('cache_operations_total', 1, {
      operation,
      key_pattern: this.getKeyPattern(key)
    });

    if (operation === 'hit') {
      this.inc('cache_hits_total', 1, {
        key_pattern: this.getKeyPattern(key)
      });
    } else if (operation === 'miss') {
      this.inc('cache_misses_total', 1, {
        key_pattern: this.getKeyPattern(key)
      });
    }
  }

  recordAgentActivity(agentId: string, agentType: string, taskType: string, duration: number, success: boolean): void {
    this.inc('agent_tasks_total', 1, {
      agent_id: agentId,
      agent_type: agentType,
      task_type: taskType,
      success: success.toString()
    });

    this.observe('agent_task_duration_ms', duration, {
      agent_id: agentId,
      agent_type: agentType,
      task_type: taskType
    });

    if (!success) {
      this.inc('agent_task_failures_total', 1, {
        agent_id: agentId,
        agent_type: agentType,
        task_type: taskType
      });
    }
  }

  recordDiscordActivity(eventType: string, command?: string, duration?: number, success?: boolean): void {
    this.inc('discord_events_total', 1, {
      event_type: eventType,
      command: command || 'unknown'
    });

    if (command) {
      this.inc('discord_commands_total', 1, {
        command,
        success: (success !== undefined ? success : true).toString()
      });
    }

    if (duration !== undefined) {
      this.observe('discord_command_duration_ms', duration, {
        command: command || 'unknown'
      });
    }

    if (success === false) {
      this.inc('discord_command_failures_total', 1, {
        command: command || 'unknown'
      });
    }
  }

  recordTradingActivity(symbol: string, orderType: string, quantity: number, price: number, success: boolean): void {
    this.inc('trading_orders_total', 1, {
      symbol,
      order_type: orderType,
      success: success.toString()
    });

    this.gauge('trading_position_size', quantity, {
      symbol,
      order_type: orderType
    });

    this.gauge('trading_order_price', price, {
      symbol,
      order_type: orderType
    });

    if (!success) {
      this.inc('trading_order_failures_total', 1, {
        symbol,
        order_type: orderType
      });
    }
  }

  recordPaymentActivity(paymentId: string, amount: number, currency: string, method: string, success: boolean): void {
    this.inc('payment_transactions_total', 1, {
      payment_method: method,
      currency,
      success: success.toString()
    });

    this.observe('payment_amount', amount, {
      payment_method: method,
      currency
    });

    if (!success) {
      this.inc('payment_transactions_failed_total', 1, {
        payment_method: method,
        currency
      });
    }
  }

  recordGovernanceActivity(decisionType: string, duration: number, outcome: 'approved' | 'rejected' | 'escalated'): void {
    this.inc('governance_decisions_total', 1, {
      decision_type: decisionType,
      outcome
    });

    this.observe('governance_decision_duration_ms', duration, {
      decision_type: decisionType
    });

    if (outcome === 'rejected') {
      this.inc('governance_rejections_total', 1, {
        decision_type: decisionType
      });
    }
  }

  recordSecurityEvent(eventType: string, severity: 'low' | 'medium' | 'high' | 'critical', userId?: string): void {
    this.inc('security_events_total', 1, {
      event_type: eventType,
      severity
    });

    if (userId) {
      this.inc('security_events_by_user_total', 1, {
        event_type: eventType,
        severity,
        user_id: userId
      });
    }
  }

  recordBusinessMetric(metricName: string, value: number, unit?: string): void {
    this.gauge(`business_${metricName}`, value, {
      unit: unit || 'count'
    });
  }

  recordSystemHealth(component: string, status: 'healthy' | 'degraded' | 'unhealthy'): void {
    this.gauge('system_health_status', status === 'healthy' ? 1 : status === 'degraded' ? 0.5 : 0, {
      component
    });
  }

  recordResourceUsage(resourceType: 'cpu' | 'memory' | 'disk' | 'network', usage: number, total: number): void {
    const percentage = (usage / total) * 100;
    this.gauge(`resource_${resourceType}_usage_percent`, percentage);
    this.gauge(`resource_${resourceType}_usage_bytes`, usage);
    this.gauge(`resource_${resourceType}_total_bytes`, total);
  }

  recordSLACompliance(serviceName: string, slaType: string, compliance: number): void {
    this.gauge('sla_compliance_percent', compliance, {
      service_name: serviceName,
      sla_type: slaType
    });

    if (compliance < 99) {
      this.inc('sla_breaches_total', 1, {
        service_name: serviceName,
        sla_type: slaType,
        severity: compliance < 95 ? 'critical' : 'warning'
      });
    }
  }

  // Utility methods
  private getStatusClass(statusCode: number): string {
    if (statusCode < 200) return 'informational';
    if (statusCode < 300) return 'success';
    if (statusCode < 400) return 'redirection';
    if (statusCode < 500) return 'client_error';
    return 'server_error';
  }

  private getKeyPattern(key: string): string {
    // Extract pattern from cache key for grouping
    if (key.includes('user:')) return 'user_data';
    if (key.includes('session:')) return 'session_data';
    if (key.includes('config:')) return 'config_data';
    if (key.includes('cache:')) return 'cache_data';
    return 'other';
  }

  // Health check metrics
  recordHealthCheck(checkName: string, status: 'pass' | 'fail', duration: number): void {
    this.inc('health_checks_total', 1, {
      check_name: checkName,
      status
    });

    this.observe('health_check_duration_ms', duration, {
      check_name: checkName
    });

    if (status === 'fail') {
      this.inc('health_check_failures_total', 1, {
        check_name: checkName
      });
    }
  }

  // Error tracking
  recordError(errorType: string, errorMessage: string, context?: Record<string, any>): void {
    this.inc('errors_total', 1, {
      error_type: errorType
    });

    this.inc('error_messages_total', 1, {
      error_type: errorType,
      error_message: errorMessage.substring(0, 100) // Truncate for labeling
    });

    // Emit detailed error event for logging
    this.eventBus.emit('error:recorded', {
      errorType,
      errorMessage,
      context,
      timestamp: Date.now(),
      service: this.config.service
    });
  }

  // Performance profiling
  startTimer(name: string, labels?: Record<string, string | number>): () => void {
    const startTime = process.hrtime.bigint();
    
    return () => {
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
      
      this.observe(name, duration, labels);
    };
  }

  // Batch operations
  recordBatchOperation(operationType: string, itemCount: number, duration: number, success: boolean): void {
    this.inc('batch_operations_total', 1, {
      operation_type: operationType,
      success: success.toString()
    });

    this.gauge('batch_operation_size', itemCount, {
      operation_type: operationType
    });

    this.observe('batch_operation_duration_ms', duration, {
      operation_type: operationType
    });
  }

  // Custom metrics for extensibility
  recordCustomMetric(name: string, value: number, type: 'counter' | 'gauge' | 'histogram', labels?: Record<string, string | number>): void {
    switch (type) {
      case 'counter':
        this.inc(name, value, labels);
        break;
      case 'gauge':
        this.gauge(name, value, labels);
        break;
      case 'histogram':
        this.observe(name, value, labels);
        break;
      default:
        console.warn(`Unknown metric type: ${type}`);
    }
  }
}

export default EnhancedMetrics;