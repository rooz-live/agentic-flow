import { EventEmitter } from 'events';
import { createWriteStream, WriteStream } from 'fs';
import { join } from 'path';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
  component?: string;
  userId?: string;
  requestId?: string;
  traceId?: string;
  spanId?: string;
  error?: Error;
  metadata?: Record<string, any>;
  tags?: string[];
}

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  FATAL = 'FATAL'
}

export interface LoggingConfig {
  service: string;
  version: string;
  environment: string;
  logLevel: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  enableRemote: boolean;
  remoteEndpoint?: string;
  logDirectory?: string;
  maxFileSize?: number;
  maxFiles?: number;
  enableStructuredLogging?: boolean;
  sanitizeErrors?: boolean;
}

export class CentralizedLogging {
  private config: LoggingConfig;
  private eventBus: EventEmitter;
  private fileStream?: WriteStream;
  private logBuffer: LogEntry[] = [];
  private flushInterval?: NodeJS.Timeout;

  constructor(config: LoggingConfig, eventBus: EventEmitter) {
    this.config = {
      logDirectory: './logs',
      maxFileSize: 100 * 1024 * 1024, // 100MB
      maxFiles: 10,
      enableStructuredLogging: true,
      sanitizeErrors: true,
      ...config
    };
    this.eventBus = eventBus;
    this.initializeLogging();
  }

  private initializeLogging(): void {
    if (this.config.enableFile) {
      this.initializeFileLogging();
    }

    // Start periodic flush
    this.flushInterval = setInterval(() => {
      this.flushLogs();
    }, 5000); // Flush every 5 seconds

    // Handle process exit
    process.on('exit', () => {
      this.flushLogs();
      this.closeFileLogging();
    });

    process.on('SIGINT', () => {
      this.flushLogs();
      this.closeFileLogging();
      process.exit(0);
    });

    console.log(`Centralized logging initialized for ${this.config.service}`);
  }

  private initializeFileLogging(): void {
    const logFile = join(this.config.logDirectory!, `${this.config.service}-${Date.now()}.log`);
    
    try {
      this.fileStream = createWriteStream(logFile, { flags: 'a' });
      
      // Write header for structured logging
      if (this.config.enableStructuredLogging) {
        this.fileStream.write('# Log started at ' + new Date().toISOString() + '\n');
      }
    } catch (error) {
      console.error('Failed to initialize file logging:', error);
    }
  }

  private closeFileLogging(): void {
    if (this.fileStream) {
      this.fileStream.end();
      this.fileStream = undefined;
    }
  }

  // Main logging methods
  debug(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, metadata);
  }

  info(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, metadata);
  }

  warn(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, metadata);
  }

  error(message: string, error?: Error, metadata?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, { ...metadata, error });
  }

  fatal(message: string, error?: Error, metadata?: Record<string, any>): void {
    this.log(LogLevel.FATAL, message, { ...metadata, error });
  }

  private log(level: LogLevel, message: string, metadata?: Record<string, any>): void {
    // Check log level
    if (!this.shouldLog(level)) {
      return;
    }

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message: this.sanitizeMessage(message),
      service: this.config.service,
      ...metadata
    };

    // Add trace context if available
    this.addTraceContext(logEntry);

    // Add to buffer
    this.logBuffer.push(logEntry);

    // Console logging
    if (this.config.enableConsole) {
      this.logToConsole(logEntry);
    }

    // Emit event for other systems
    this.eventBus.emit('log:created', logEntry);

    // Immediate flush for high severity logs
    if (level === LogLevel.ERROR || level === LogLevel.FATAL) {
      this.flushLogs();
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR, LogLevel.FATAL];
    const currentLevelIndex = levels.indexOf(this.config.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    
    return messageLevelIndex >= currentLevelIndex;
  }

  private sanitizeMessage(message: string): string {
    if (!this.config.sanitizeErrors) {
      return message;
    }

    // Remove potential sensitive information
    return message
      .replace(/password["\s]*[:=]["\s]*[^\\s]+/gi, 'password=***')
      .replace(/token["\s]*[:=]["\s]*[^\\s]+/gi, 'token=***')
      .replace(/api[_-]?key["\s]*[:=]["\s]*[^\\s]+/gi, 'api_key=***')
      .replace(/secret["\s]*[:=]["\s]*[^\\s]+/gi, 'secret=***');
  }

  private addTraceContext(logEntry: LogEntry): void {
    // Try to extract trace context from async storage or other means
    // This would integrate with the distributed tracing system
    try {
      // In a real implementation, this would get context from OpenTelemetry
      const traceId = this.getCurrentTraceId();
      const spanId = this.getCurrentSpanId();
      
      if (traceId) {
        logEntry.traceId = traceId;
      }
      
      if (spanId) {
        logEntry.spanId = spanId;
      }
    } catch (error) {
      // Ignore trace context errors
    }
  }

  private getCurrentTraceId(): string | undefined {
    // This would integrate with distributed tracing
    // For now, return undefined
    return undefined;
  }

  private getCurrentSpanId(): string | undefined {
    // This would integrate with distributed tracing
    // For now, return undefined
    return undefined;
  }

  private logToConsole(logEntry: LogEntry): void {
    const colorCode = this.getColorCode(logEntry.level);
    const resetCode = '\x1b[0m';
    
    const formattedMessage = this.config.enableStructuredLogging 
      ? JSON.stringify(logEntry, null, 2)
      : `${logEntry.timestamp} [${logEntry.level}] ${logEntry.service}: ${logEntry.message}`;

    console.log(`${colorCode}${formattedMessage}${resetCode}`);
  }

  private getColorCode(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG:
        return '\x1b[36m'; // Cyan
      case LogLevel.INFO:
        return '\x1b[32m'; // Green
      case LogLevel.WARN:
        return '\x1b[33m'; // Yellow
      case LogLevel.ERROR:
        return '\x1b[31m'; // Red
      case LogLevel.FATAL:
        return '\x1b[35m'; // Magenta
      default:
        return '\x1b[0m'; // Reset
    }
  }

  private async flushLogs(): Promise<void> {
    if (this.logBuffer.length === 0) {
      return;
    }

    const logsToFlush = [...this.logBuffer];
    this.logBuffer = [];

    try {
      // Write to file
      if (this.config.enableFile && this.fileStream) {
        for (const logEntry of logsToFlush) {
          const logLine = this.config.enableStructuredLogging 
            ? JSON.stringify(logEntry) + '\n'
            : `${logEntry.timestamp} [${logEntry.level}] ${logEntry.service}: ${logEntry.message}\n`;
          
          this.fileStream.write(logLine);
        }
      }

      // Send to remote endpoint
      if (this.config.enableRemote && this.config.remoteEndpoint) {
        await this.sendToRemoteEndpoint(logsToFlush);
      }

      // Send to log processing pipeline
      await this.sendToLogPipeline(logsToFlush);

    } catch (error) {
      console.error('Failed to flush logs:', error);
      // Re-add logs to buffer for retry
      this.logBuffer.unshift(...logsToFlush);
    }
  }

  private async sendToRemoteEndpoint(logs: LogEntry[]): Promise<void> {
    if (!this.config.remoteEndpoint) {
      return;
    }

    try {
      const response = await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': `${this.config.service}/${this.config.version}`
        },
        body: JSON.stringify({
          service: this.config.service,
          environment: this.config.environment,
          logs
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to send logs to remote endpoint:', error);
      throw error;
    }
  }

  private async sendToLogPipeline(logs: LogEntry[]): Promise<void> {
    try {
      // Send to Logstash or other log processing system
      const logstashEndpoint = process.env.LOGSTASH_ENDPOINT || 'http://localhost:5000';
      
      await fetch(logstashEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(logs)
      });
    } catch (error) {
      console.error('Failed to send logs to pipeline:', error);
      // Don't throw here to avoid infinite loops
    }
  }

  // Specialized logging methods
  logAgentActivity(
    agentId: string,
    agentType: string,
    activity: string,
    metadata?: Record<string, any>
  ): void {
    this.info(`Agent activity: ${activity}`, {
      component: 'agent-system',
      agentId,
      agentType,
      activity,
      ...metadata
    });
  }

  logDiscordActivity(
    eventType: string,
    guildId: string,
    channelId: string,
    userId: string,
    command?: string,
    metadata?: Record<string, any>
  ): void {
    this.info(`Discord activity: ${eventType}`, {
      component: 'discord-bot',
      discordGuildId: guildId,
      discordChannelId: channelId,
      discordUserId: userId,
      discordCommand: command,
      ...metadata
    });
  }

  logTradingActivity(
    symbol: string,
    orderType: string,
    activity: string,
    metadata?: Record<string, any>
  ): void {
    this.info(`Trading activity: ${activity}`, {
      component: 'trading-engine',
      tradingSymbol: symbol,
      tradingOrderType: orderType,
      ...metadata
    });
  }

  logPaymentActivity(
    paymentId: string,
    amount: number,
    currency: string,
    method: string,
    activity: string,
    metadata?: Record<string, any>
  ): void {
    this.info(`Payment activity: ${activity}`, {
      component: 'payment-system',
      paymentId,
      paymentAmount: amount,
      paymentCurrency: currency,
      paymentMethod: method,
      ...metadata
    });
  }

  logGovernanceActivity(
    decisionType: string,
    context: any,
    outcome: string,
    metadata?: Record<string, any>
  ): void {
    this.info(`Governance activity: ${decisionType} - ${outcome}`, {
      component: 'governance-system',
      governanceDecisionType: decisionType,
      governanceContext: context,
      governanceOutcome: outcome,
      ...metadata
    });
  }

  logSecurityEvent(
    eventType: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    description: string,
    metadata?: Record<string, any>
  ): void {
    const level = severity === 'critical' ? LogLevel.FATAL : 
                  severity === 'high' ? LogLevel.ERROR :
                  severity === 'medium' ? LogLevel.WARN : LogLevel.INFO;

    this.log(level, `Security event: ${eventType} - ${description}`, {
      component: 'security-system',
      securityEventType: eventType,
      securitySeverity: severity,
      securityDescription: description,
      ...metadata
    });
  }

  logPerformanceMetric(
    operation: string,
    duration: number,
    metadata?: Record<string, any>
  ): void {
    this.info(`Performance: ${operation} took ${duration}ms`, {
      component: 'performance',
      performanceOperation: operation,
      performanceDuration: duration,
      ...metadata
    });
  }

  logBusinessMetric(
    metricName: string,
    value: number,
    unit?: string,
    metadata?: Record<string, any>
  ): void {
    this.info(`Business metric: ${metricName} = ${value}${unit || ''}`, {
      component: 'business-intelligence',
      businessMetricName: metricName,
      businessMetricValue: value,
      businessMetricUnit: unit || 'count',
      ...metadata
    });
  }

  // Health check logging
  logHealthCheck(
    checkName: string,
    status: 'pass' | 'fail',
    duration: number,
    details?: string
  ): void {
    const level = status === 'pass' ? LogLevel.INFO : LogLevel.ERROR;
    const message = `Health check ${checkName}: ${status} (${duration}ms)${details ? ` - ${details}` : ''}`;
    
    this.log(level, message, {
      component: 'health-check',
      healthCheckName: checkName,
      healthCheckStatus: status,
      healthCheckDuration: duration,
      healthCheckDetails: details
    });
  }

  // Error correlation
  logErrorWithContext(
    error: Error,
    context: {
      operation?: string;
      userId?: string;
      requestId?: string;
      component?: string;
      metadata?: Record<string, any>;
    }
  ): void {
    this.error(error.message, error, {
      errorOperation: context.operation,
      userId: context.userId,
      requestId: context.requestId,
      component: context.component,
      ...context.metadata
    });
  }

  // Audit logging
  logAuditEvent(
    action: string,
    resource: string,
    userId: string,
    outcome: 'success' | 'failure',
    details?: Record<string, any>
  ): void {
    this.info(`Audit: ${action} on ${resource} by ${userId} - ${outcome}`, {
      component: 'audit',
      auditAction: action,
      auditResource: resource,
      auditUserId: userId,
      auditOutcome: outcome,
      auditDetails: details,
      tags: ['audit', 'compliance']
    });
  }

  // Cleanup
  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    
    this.flushLogs();
    this.closeFileLogging();
  }
}

export default CentralizedLogging;