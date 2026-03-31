import { EventEmitter } from 'events';
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
export declare enum LogLevel {
    DEBUG = "DEBUG",
    INFO = "INFO",
    WARN = "WARN",
    ERROR = "ERROR",
    FATAL = "FATAL"
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
export declare class CentralizedLogging {
    private config;
    private eventBus;
    private fileStream?;
    private logBuffer;
    private flushInterval?;
    constructor(config: LoggingConfig, eventBus: EventEmitter);
    private initializeLogging;
    private initializeFileLogging;
    private closeFileLogging;
    debug(message: string, metadata?: Record<string, any>): void;
    info(message: string, metadata?: Record<string, any>): void;
    warn(message: string, metadata?: Record<string, any>): void;
    error(message: string, error?: Error, metadata?: Record<string, any>): void;
    fatal(message: string, error?: Error, metadata?: Record<string, any>): void;
    private log;
    private shouldLog;
    private sanitizeMessage;
    private addTraceContext;
    private getCurrentTraceId;
    private getCurrentSpanId;
    private logToConsole;
    private getColorCode;
    private flushLogs;
    private sendToRemoteEndpoint;
    private sendToLogPipeline;
    logAgentActivity(agentId: string, agentType: string, activity: string, metadata?: Record<string, any>): void;
    logDiscordActivity(eventType: string, guildId: string, channelId: string, userId: string, command?: string, metadata?: Record<string, any>): void;
    logTradingActivity(symbol: string, orderType: string, activity: string, metadata?: Record<string, any>): void;
    logPaymentActivity(paymentId: string, amount: number, currency: string, method: string, activity: string, metadata?: Record<string, any>): void;
    logGovernanceActivity(decisionType: string, context: any, outcome: string, metadata?: Record<string, any>): void;
    logSecurityEvent(eventType: string, severity: 'low' | 'medium' | 'high' | 'critical', description: string, metadata?: Record<string, any>): void;
    logPerformanceMetric(operation: string, duration: number, metadata?: Record<string, any>): void;
    logBusinessMetric(metricName: string, value: number, unit?: string, metadata?: Record<string, any>): void;
    logHealthCheck(checkName: string, status: 'pass' | 'fail', duration: number, details?: string): void;
    logErrorWithContext(error: Error, context: {
        operation?: string;
        userId?: string;
        requestId?: string;
        component?: string;
        metadata?: Record<string, any>;
    }): void;
    logAuditEvent(action: string, resource: string, userId: string, outcome: 'success' | 'failure', details?: Record<string, any>): void;
    destroy(): void;
}
export default CentralizedLogging;
//# sourceMappingURL=centralized-logging.d.ts.map