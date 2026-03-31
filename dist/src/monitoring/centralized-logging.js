import { createWriteStream } from 'fs';
import { join } from 'path';
export var LogLevel;
(function (LogLevel) {
    LogLevel["DEBUG"] = "DEBUG";
    LogLevel["INFO"] = "INFO";
    LogLevel["WARN"] = "WARN";
    LogLevel["ERROR"] = "ERROR";
    LogLevel["FATAL"] = "FATAL";
})(LogLevel || (LogLevel = {}));
export class CentralizedLogging {
    config;
    eventBus;
    fileStream;
    logBuffer = [];
    flushInterval;
    constructor(config, eventBus) {
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
    initializeLogging() {
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
    initializeFileLogging() {
        const logFile = join(this.config.logDirectory, `${this.config.service}-${Date.now()}.log`);
        try {
            this.fileStream = createWriteStream(logFile, { flags: 'a' });
            // Write header for structured logging
            if (this.config.enableStructuredLogging) {
                this.fileStream.write('# Log started at ' + new Date().toISOString() + '\n');
            }
        }
        catch (error) {
            console.error('Failed to initialize file logging:', error);
        }
    }
    closeFileLogging() {
        if (this.fileStream) {
            this.fileStream.end();
            this.fileStream = undefined;
        }
    }
    // Main logging methods
    debug(message, metadata) {
        this.log(LogLevel.DEBUG, message, metadata);
    }
    info(message, metadata) {
        this.log(LogLevel.INFO, message, metadata);
    }
    warn(message, metadata) {
        this.log(LogLevel.WARN, message, metadata);
    }
    error(message, error, metadata) {
        this.log(LogLevel.ERROR, message, { ...metadata, error });
    }
    fatal(message, error, metadata) {
        this.log(LogLevel.FATAL, message, { ...metadata, error });
    }
    log(level, message, metadata) {
        // Check log level
        if (!this.shouldLog(level)) {
            return;
        }
        const logEntry = {
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
    shouldLog(level) {
        const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR, LogLevel.FATAL];
        const currentLevelIndex = levels.indexOf(this.config.logLevel);
        const messageLevelIndex = levels.indexOf(level);
        return messageLevelIndex >= currentLevelIndex;
    }
    sanitizeMessage(message) {
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
    addTraceContext(logEntry) {
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
        }
        catch (error) {
            // Ignore trace context errors
        }
    }
    getCurrentTraceId() {
        // This would integrate with distributed tracing
        // For now, return undefined
        return undefined;
    }
    getCurrentSpanId() {
        // This would integrate with distributed tracing
        // For now, return undefined
        return undefined;
    }
    logToConsole(logEntry) {
        const colorCode = this.getColorCode(logEntry.level);
        const resetCode = '\x1b[0m';
        const formattedMessage = this.config.enableStructuredLogging
            ? JSON.stringify(logEntry, null, 2)
            : `${logEntry.timestamp} [${logEntry.level}] ${logEntry.service}: ${logEntry.message}`;
        console.log(`${colorCode}${formattedMessage}${resetCode}`);
    }
    getColorCode(level) {
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
    async flushLogs() {
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
        }
        catch (error) {
            console.error('Failed to flush logs:', error);
            // Re-add logs to buffer for retry
            this.logBuffer.unshift(...logsToFlush);
        }
    }
    async sendToRemoteEndpoint(logs) {
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
        }
        catch (error) {
            console.error('Failed to send logs to remote endpoint:', error);
            throw error;
        }
    }
    async sendToLogPipeline(logs) {
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
        }
        catch (error) {
            console.error('Failed to send logs to pipeline:', error);
            // Don't throw here to avoid infinite loops
        }
    }
    // Specialized logging methods
    logAgentActivity(agentId, agentType, activity, metadata) {
        this.info(`Agent activity: ${activity}`, {
            component: 'agent-system',
            agentId,
            agentType,
            activity,
            ...metadata
        });
    }
    logDiscordActivity(eventType, guildId, channelId, userId, command, metadata) {
        this.info(`Discord activity: ${eventType}`, {
            component: 'discord-bot',
            discordGuildId: guildId,
            discordChannelId: channelId,
            discordUserId: userId,
            discordCommand: command,
            ...metadata
        });
    }
    logTradingActivity(symbol, orderType, activity, metadata) {
        this.info(`Trading activity: ${activity}`, {
            component: 'trading-engine',
            tradingSymbol: symbol,
            tradingOrderType: orderType,
            ...metadata
        });
    }
    logPaymentActivity(paymentId, amount, currency, method, activity, metadata) {
        this.info(`Payment activity: ${activity}`, {
            component: 'payment-system',
            paymentId,
            paymentAmount: amount,
            paymentCurrency: currency,
            paymentMethod: method,
            ...metadata
        });
    }
    logGovernanceActivity(decisionType, context, outcome, metadata) {
        this.info(`Governance activity: ${decisionType} - ${outcome}`, {
            component: 'governance-system',
            governanceDecisionType: decisionType,
            governanceContext: context,
            governanceOutcome: outcome,
            ...metadata
        });
    }
    logSecurityEvent(eventType, severity, description, metadata) {
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
    logPerformanceMetric(operation, duration, metadata) {
        this.info(`Performance: ${operation} took ${duration}ms`, {
            component: 'performance',
            performanceOperation: operation,
            performanceDuration: duration,
            ...metadata
        });
    }
    logBusinessMetric(metricName, value, unit, metadata) {
        this.info(`Business metric: ${metricName} = ${value}${unit || ''}`, {
            component: 'business-intelligence',
            businessMetricName: metricName,
            businessMetricValue: value,
            businessMetricUnit: unit || 'count',
            ...metadata
        });
    }
    // Health check logging
    logHealthCheck(checkName, status, duration, details) {
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
    logErrorWithContext(error, context) {
        this.error(error.message, error, {
            errorOperation: context.operation,
            userId: context.userId,
            requestId: context.requestId,
            component: context.component,
            ...context.metadata
        });
    }
    // Audit logging
    logAuditEvent(action, resource, userId, outcome, details) {
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
    destroy() {
        if (this.flushInterval) {
            clearInterval(this.flushInterval);
        }
        this.flushLogs();
        this.closeFileLogging();
    }
}
export default CentralizedLogging;
//# sourceMappingURL=centralized-logging.js.map