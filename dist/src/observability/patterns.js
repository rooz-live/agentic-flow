/**
 * Observability Patterns Implementation
 * Provides comprehensive observability coverage for production systems
 * Target: 80%+ pattern coverage
 */
import { EventEmitter } from 'events';
export class HealthCheckManager extends EventEmitter {
    checks = new Map();
    lastResults = new Map();
    checkInterval = null;
    registerCheck(name, checkFn) {
        this.checks.set(name, checkFn);
    }
    async runChecks() {
        const results = [];
        for (const [name, checkFn] of this.checks) {
            try {
                const result = await checkFn();
                this.lastResults.set(name, result);
                results.push(result);
                this.emit('check:complete', result);
            }
            catch (error) {
                const errorResult = {
                    name,
                    status: 'UNHEALTHY',
                    lastCheck: new Date().toISOString(),
                    responseTime: 0,
                    details: { error: String(error) },
                    dependencies: [],
                };
                results.push(errorResult);
                this.emit('check:error', errorResult);
            }
        }
        return results;
    }
    startPeriodicChecks(intervalMs = 30000) {
        this.checkInterval = setInterval(() => {
            this.runChecks().catch(console.error);
        }, intervalMs);
    }
    stopPeriodicChecks() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }
}
export class MetricsCollector extends EventEmitter {
    metrics = new Map();
    aggregations = new Map();
    record(metric) {
        const key = `${metric.name}:${JSON.stringify(metric.tags)}`;
        if (!this.metrics.has(key)) {
            this.metrics.set(key, []);
        }
        this.metrics.get(key).push(metric);
        this.updateAggregation(key, metric);
        this.emit('metric:recorded', metric);
    }
    updateAggregation(key, metric) {
        const existing = this.aggregations.get(key);
        if (!existing) {
            this.aggregations.set(key, {
                name: metric.name,
                count: 1,
                sum: metric.value,
                min: metric.value,
                max: metric.value,
                avg: metric.value,
                tags: metric.tags,
                lastUpdate: metric.timestamp,
            });
        }
        else {
            existing.count++;
            existing.sum += metric.value;
            existing.min = Math.min(existing.min, metric.value);
            existing.max = Math.max(existing.max, metric.value);
            existing.avg = existing.sum / existing.count;
            existing.lastUpdate = metric.timestamp;
        }
    }
    getAggregated(name) {
        for (const [key, agg] of this.aggregations) {
            if (agg.name === name) {
                return agg;
            }
        }
        return undefined;
    }
    export() {
        const allMetrics = [];
        for (const metrics of this.metrics.values()) {
            allMetrics.push(...metrics);
        }
        return allMetrics;
    }
}
export class TracingManager {
    activeSpans = new Map();
    completedSpans = [];
    startSpan(operationName, parentSpanId) {
        const span = {
            traceId: this.generateTraceId(),
            spanId: this.generateSpanId(),
            parentSpanId,
            operationName,
            startTime: Date.now(),
            tags: {},
            logs: [],
            status: 'OK',
        };
        this.activeSpans.set(span.spanId, span);
        return span;
    }
    finishSpan(spanId, status = 'OK') {
        const span = this.activeSpans.get(spanId);
        if (span) {
            span.duration = Date.now() - span.startTime;
            span.status = status;
            this.completedSpans.push(span);
            this.activeSpans.delete(spanId);
        }
    }
    addSpanTag(spanId, key, value) {
        const span = this.activeSpans.get(spanId);
        if (span) {
            span.tags[key] = value;
        }
    }
    addSpanLog(spanId, fields) {
        const span = this.activeSpans.get(spanId);
        if (span) {
            span.logs.push({
                timestamp: Date.now(),
                fields,
            });
        }
    }
    generateTraceId() {
        return `trace_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    }
    generateSpanId() {
        return `span_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    }
    getCompletedSpans() {
        return [...this.completedSpans];
    }
}
// ========================================
// 4. Circuit Breaker Pattern
// ========================================
export class CircuitBreaker {
    threshold;
    timeout;
    halfOpenAttempts;
    state = 'CLOSED';
    failureCount = 0;
    successCount = 0;
    lastFailureTime = 0;
    openUntil = 0;
    constructor(threshold = 5, timeout = 60000, halfOpenAttempts = 3) {
        this.threshold = threshold;
        this.timeout = timeout;
        this.halfOpenAttempts = halfOpenAttempts;
    }
    async execute(fn) {
        if (this.state === 'OPEN') {
            if (Date.now() >= this.openUntil) {
                this.state = 'HALF_OPEN';
                this.successCount = 0;
            }
            else {
                throw new Error('Circuit breaker is OPEN');
            }
        }
        try {
            const result = await fn();
            this.onSuccess();
            return result;
        }
        catch (error) {
            this.onFailure();
            throw error;
        }
    }
    onSuccess() {
        this.failureCount = 0;
        if (this.state === 'HALF_OPEN') {
            this.successCount++;
            if (this.successCount >= this.halfOpenAttempts) {
                this.state = 'CLOSED';
            }
        }
    }
    onFailure() {
        this.failureCount++;
        this.lastFailureTime = Date.now();
        if (this.failureCount >= this.threshold) {
            this.state = 'OPEN';
            this.openUntil = Date.now() + this.timeout;
        }
    }
    getState() {
        return {
            state: this.state,
            failures: this.failureCount,
            lastFailure: this.lastFailureTime,
        };
    }
}
// ========================================
// 5. Rate Limiting Pattern
// ========================================
export class RateLimiter {
    maxRequests;
    windowMs;
    requests = [];
    constructor(maxRequests, windowMs) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
    }
    async tryAcquire() {
        const now = Date.now();
        const windowStart = now - this.windowMs;
        // Remove old requests
        this.requests = this.requests.filter(time => time > windowStart);
        if (this.requests.length < this.maxRequests) {
            this.requests.push(now);
            return true;
        }
        return false;
    }
    getRemainingCapacity() {
        const now = Date.now();
        const windowStart = now - this.windowMs;
        this.requests = this.requests.filter(time => time > windowStart);
        return Math.max(0, this.maxRequests - this.requests.length);
    }
}
export class AuditLogger extends EventEmitter {
    logs = [];
    log(entry) {
        const auditLog = {
            id: `audit_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            timestamp: new Date().toISOString(),
            ...entry,
        };
        this.logs.push(auditLog);
        this.emit('audit:logged', auditLog);
    }
    query(filters) {
        return this.logs.filter(log => {
            for (const [key, value] of Object.entries(filters)) {
                if (log[key] !== value) {
                    return false;
                }
            }
            return true;
        });
    }
    export() {
        return [...this.logs];
    }
}
export class AlertManager extends EventEmitter {
    alerts = [];
    handlers = [];
    addHandler(handler) {
        this.handlers.push(handler);
    }
    async createAlert(alert) {
        const newAlert = {
            id: `alert_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            timestamp: new Date().toISOString(),
            acknowledged: false,
            ...alert,
        };
        this.alerts.push(newAlert);
        this.emit('alert:created', newAlert);
        // Notify handlers
        await Promise.all(this.handlers.map(h => h(newAlert).catch(console.error)));
        return newAlert;
    }
    acknowledge(alertId) {
        const alert = this.alerts.find(a => a.id === alertId);
        if (alert) {
            alert.acknowledged = true;
            this.emit('alert:acknowledged', alert);
        }
    }
    resolve(alertId) {
        const alert = this.alerts.find(a => a.id === alertId);
        if (alert) {
            alert.resolvedAt = new Date().toISOString();
            this.emit('alert:resolved', alert);
        }
    }
    getActive() {
        return this.alerts.filter(a => !a.resolvedAt);
    }
}
export class DashboardDataProvider {
    widgets = new Map();
    updateCallbacks = new Map();
    registerWidget(widget) {
        this.widgets.set(widget.id, widget);
    }
    onWidgetUpdate(widgetId, callback) {
        this.updateCallbacks.set(widgetId, callback);
    }
    updateWidget(widgetId, data) {
        const widget = this.widgets.get(widgetId);
        if (widget) {
            widget.data = data;
            const callback = this.updateCallbacks.get(widgetId);
            if (callback) {
                callback(data);
            }
        }
    }
    getAllWidgets() {
        return Array.from(this.widgets.values());
    }
}
// ========================================
// Unified Observability Manager
// ========================================
export class ObservabilityManager {
    healthCheck;
    metrics;
    tracing;
    circuitBreaker;
    rateLimiter;
    auditLogger;
    alertManager;
    dashboard;
    constructor() {
        this.healthCheck = new HealthCheckManager();
        this.metrics = new MetricsCollector();
        this.tracing = new TracingManager();
        this.circuitBreaker = new CircuitBreaker();
        this.rateLimiter = new RateLimiter(100, 60000); // 100 req/min
        this.auditLogger = new AuditLogger();
        this.alertManager = new AlertManager();
        this.dashboard = new DashboardDataProvider();
    }
    getCoverageReport() {
        const patterns = [
            'Health Checks',
            'Metrics Collection',
            'Distributed Tracing',
            'Circuit Breaker',
            'Rate Limiting',
            'Audit Logging',
            'Alerting',
            'Dashboard Data',
        ];
        return {
            patternsImplemented: patterns,
            coveragePercent: 100, // All 8 patterns implemented
        };
    }
}
//# sourceMappingURL=patterns.js.map