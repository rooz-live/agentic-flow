/**
 * Logging Middleware
 * Request/response logging and monitoring
 *
 * OBSERVABILITY: Emits pattern metrics to .goalie/pattern_metrics.jsonl
 * for API gateway latency tracking (CONSOLIDATED_ACTIONS: full-stack observability)
 */
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
// Latency SLO thresholds (in ms)
const LATENCY_SLO = {
    P50: 100,
    P90: 500,
    P99: 1000,
    CRITICAL: 5000
};
/**
 * Emit API gateway latency metric to Goalie pattern_metrics.jsonl
 */
function emitApiGatewayMetric(entry) {
    if (!entry.duration || !entry.statusCode)
        return;
    const latencyBucket = entry.duration <= LATENCY_SLO.P50 ? 'p50' :
        entry.duration <= LATENCY_SLO.P90 ? 'p90' :
            entry.duration <= LATENCY_SLO.P99 ? 'p99' : 'critical';
    const metric = {
        ts: new Date().toISOString(),
        pattern: 'api-gateway-latency',
        circle: 'analyst',
        depth: 2,
        event_type: 'observability',
        method: entry.method,
        path: entry.path,
        status_code: entry.statusCode,
        latency_ms: entry.duration,
        latency_bucket: latencyBucket,
        slo_met: entry.duration <= LATENCY_SLO.P90,
        alignment_score: { manthra: 0.9, yasna: 0.95, mithra: 0.92 },
        consequence_tracking: true
    };
    try {
        const metricsPath = path.resolve(process.cwd(), '.goalie/pattern_metrics.jsonl');
        fs.appendFileSync(metricsPath, JSON.stringify(metric) + '\n');
    }
    catch (err) {
        // Silently fail if .goalie directory doesn't exist (non-production)
    }
}
/**
 * Logging middleware
 */
export function loggingMiddleware(req, res, next) {
    const requestId = uuidv4();
    const startTime = Date.now();
    // Attach request ID to request object
    req.requestId = requestId;
    // Create log entry
    const logEntry = {
        requestId,
        timestamp: new Date(),
        method: req.method,
        path: req.path,
        userId: req.userId,
        ip: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent']
    };
    // Log request
    console.log(`[${logEntry.timestamp.toISOString()}] ${logEntry.method} ${logEntry.path} - RequestID: ${requestId}`);
    // Capture response
    const originalSend = res.send;
    res.send = function (data) {
        const duration = Date.now() - startTime;
        logEntry.statusCode = res.statusCode;
        logEntry.duration = duration;
        // Log response
        const statusColor = res.statusCode >= 500 ? '\x1b[31m' :
            res.statusCode >= 400 ? '\x1b[33m' :
                res.statusCode >= 300 ? '\x1b[36m' :
                    '\x1b[32m';
        const resetColor = '\x1b[0m';
        console.log(`[${new Date().toISOString()}] ${statusColor}${res.statusCode}${resetColor} ${logEntry.method} ${logEntry.path} - ${duration}ms`);
        // Store log entry (in production, send to logging service)
        storeLogEntry(logEntry);
        return originalSend.call(this, data);
    };
    // Capture errors
    res.on('error', (error) => {
        logEntry.error = error.message;
        console.error(`[${new Date().toISOString()}] ERROR ${logEntry.method} ${logEntry.path}:`, error);
        storeLogEntry(logEntry);
    });
    next();
}
/**
 * Store log entry
 */
function storeLogEntry(entry) {
    // In production, send to logging service (CloudWatch, Datadog, etc.)
    // For now, just track metrics
    if (entry.statusCode && entry.statusCode >= 400) {
        console.error(`Error log entry:`, JSON.stringify(entry, null, 2));
    }
    // Track performance metrics
    if (entry.duration && entry.duration > 5000) {
        console.warn(`Slow request detected: ${entry.path} took ${entry.duration}ms`);
    }
    // Emit API gateway latency metric to Goalie observability
    // (CONSOLIDATED_ACTIONS: full-stack observability coverage)
    emitApiGatewayMetric(entry);
}
/**
 * Error logging utility
 */
export function logError(context, error, metadata) {
    const errorLog = {
        timestamp: new Date().toISOString(),
        context,
        error: {
            name: error.name,
            message: error.message,
            stack: error.stack
        },
        metadata
    };
    console.error(`[ERROR] ${context}:`, JSON.stringify(errorLog, null, 2));
    // In production, send to error tracking service (Sentry, Rollbar, etc.)
}
/**
 * Performance logging utility
 */
export function logPerformance(operation, duration, metadata) {
    const perfLog = {
        timestamp: new Date().toISOString(),
        operation,
        duration,
        metadata
    };
    if (duration > 1000) {
        console.warn(`[PERFORMANCE] Slow operation: ${operation} took ${duration}ms`);
    }
    else {
        console.log(`[PERFORMANCE] ${operation}: ${duration}ms`);
    }
    // In production, send to APM service (New Relic, AppDynamics, etc.)
}
//# sourceMappingURL=logging.middleware.js.map