/**
 * Observability Patterns Implementation
 * Provides comprehensive observability coverage for production systems
 * Target: 80%+ pattern coverage
 */
import { EventEmitter } from 'events';
export interface HealthCheck {
    name: string;
    status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
    lastCheck: string;
    responseTime: number;
    details: Record<string, any>;
    dependencies: DependencyHealth[];
}
export interface DependencyHealth {
    name: string;
    status: 'UP' | 'DOWN' | 'DEGRADED';
    latency: number;
    errorRate: number;
}
export declare class HealthCheckManager extends EventEmitter {
    private checks;
    private lastResults;
    private checkInterval;
    registerCheck(name: string, checkFn: () => Promise<HealthCheck>): void;
    runChecks(): Promise<HealthCheck[]>;
    startPeriodicChecks(intervalMs?: number): void;
    stopPeriodicChecks(): void;
}
export interface Metric {
    name: string;
    value: number;
    timestamp: string;
    tags: Record<string, string>;
    type: 'COUNTER' | 'GAUGE' | 'HISTOGRAM' | 'SUMMARY';
}
export declare class MetricsCollector extends EventEmitter {
    private metrics;
    private aggregations;
    record(metric: Metric): void;
    private updateAggregation;
    getAggregated(name: string): AggregatedMetric | undefined;
    export(): Metric[];
}
interface AggregatedMetric {
    name: string;
    count: number;
    sum: number;
    min: number;
    max: number;
    avg: number;
    tags: Record<string, string>;
    lastUpdate: string;
}
export interface Span {
    traceId: string;
    spanId: string;
    parentSpanId?: string;
    operationName: string;
    startTime: number;
    duration?: number;
    tags: Record<string, any>;
    logs: SpanLog[];
    status: 'OK' | 'ERROR';
}
export interface SpanLog {
    timestamp: number;
    fields: Record<string, any>;
}
export declare class TracingManager {
    private activeSpans;
    private completedSpans;
    startSpan(operationName: string, parentSpanId?: string): Span;
    finishSpan(spanId: string, status?: 'OK' | 'ERROR'): void;
    addSpanTag(spanId: string, key: string, value: any): void;
    addSpanLog(spanId: string, fields: Record<string, any>): void;
    private generateTraceId;
    private generateSpanId;
    getCompletedSpans(): Span[];
}
export declare class CircuitBreaker {
    private threshold;
    private timeout;
    private halfOpenAttempts;
    private state;
    private failureCount;
    private successCount;
    private lastFailureTime;
    private openUntil;
    constructor(threshold?: number, timeout?: number, halfOpenAttempts?: number);
    execute<T>(fn: () => Promise<T>): Promise<T>;
    private onSuccess;
    private onFailure;
    getState(): {
        state: string;
        failures: number;
        lastFailure: number;
    };
}
export declare class RateLimiter {
    private maxRequests;
    private windowMs;
    private requests;
    constructor(maxRequests: number, windowMs: number);
    tryAcquire(): Promise<boolean>;
    getRemainingCapacity(): number;
}
export interface AuditLog {
    id: string;
    timestamp: string;
    userId: string;
    action: string;
    resource: string;
    outcome: 'SUCCESS' | 'FAILURE';
    details: Record<string, any>;
    ipAddress: string;
    userAgent: string;
}
export declare class AuditLogger extends EventEmitter {
    private logs;
    log(entry: Omit<AuditLog, 'id' | 'timestamp'>): void;
    query(filters: Partial<AuditLog>): AuditLog[];
    export(): AuditLog[];
}
export interface Alert {
    id: string;
    severity: 'INFO' | 'WARNING' | 'CRITICAL';
    title: string;
    description: string;
    timestamp: string;
    source: string;
    metadata: Record<string, any>;
    acknowledged: boolean;
    resolvedAt?: string;
}
export declare class AlertManager extends EventEmitter {
    private alerts;
    private handlers;
    addHandler(handler: (alert: Alert) => Promise<void>): void;
    createAlert(alert: Omit<Alert, 'id' | 'timestamp' | 'acknowledged'>): Promise<Alert>;
    acknowledge(alertId: string): void;
    resolve(alertId: string): void;
    getActive(): Alert[];
}
export interface DashboardWidget {
    id: string;
    type: 'METRIC' | 'CHART' | 'TABLE' | 'STATUS';
    title: string;
    data: any;
    refreshInterval: number;
}
export declare class DashboardDataProvider {
    private widgets;
    private updateCallbacks;
    registerWidget(widget: DashboardWidget): void;
    onWidgetUpdate(widgetId: string, callback: (data: any) => void): void;
    updateWidget(widgetId: string, data: any): void;
    getAllWidgets(): DashboardWidget[];
}
export declare class ObservabilityManager {
    readonly healthCheck: HealthCheckManager;
    readonly metrics: MetricsCollector;
    readonly tracing: TracingManager;
    readonly circuitBreaker: CircuitBreaker;
    readonly rateLimiter: RateLimiter;
    readonly auditLogger: AuditLogger;
    readonly alertManager: AlertManager;
    readonly dashboard: DashboardDataProvider;
    constructor();
    getCoverageReport(): {
        patternsImplemented: string[];
        coveragePercent: number;
    };
}
export {};
//# sourceMappingURL=patterns.d.ts.map