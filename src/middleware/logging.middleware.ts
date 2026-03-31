/**
 * Logging Middleware
 * Request/response logging and monitoring
 *
 * OBSERVABILITY: Emits pattern metrics to .goalie/pattern_metrics.jsonl
 * for API gateway latency tracking (CONSOLIDATED_ACTIONS: full-stack observability)
 */

import { NextFunction, Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

interface LogEntry {
  requestId: string;
  timestamp: Date;
  method: string;
  path: string;
  statusCode?: number;
  duration?: number;
  userId?: string;
  ip?: string;
  userAgent?: string;
  error?: string;
}

/**
 * API Gateway Latency Metrics for Goalie observability
 */
interface ApiGatewayMetric {
  ts: string;
  pattern: string;
  circle: string;
  depth: number;
  event_type: string;
  method: string;
  path: string;
  status_code: number;
  latency_ms: number;
  latency_bucket: string;
  slo_met: boolean;
  alignment_score: { manthra: number; yasna: number; mithra: number };
  consequence_tracking: boolean;
}

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
function emitApiGatewayMetric(entry: LogEntry): void {
  if (!entry.duration || !entry.statusCode) return;

  const latencyBucket =
    entry.duration <= LATENCY_SLO.P50 ? 'p50' :
    entry.duration <= LATENCY_SLO.P90 ? 'p90' :
    entry.duration <= LATENCY_SLO.P99 ? 'p99' : 'critical';

  const metric: ApiGatewayMetric = {
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
  } catch (err) {
    // Silently fail if .goalie directory doesn't exist (non-production)
  }
}

/**
 * Logging middleware
 */
export function loggingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId = uuidv4();
  const startTime = Date.now();

  // Attach request ID to request object
  (req as any).requestId = requestId;

  // Create log entry
  const logEntry: LogEntry = {
    requestId,
    timestamp: new Date(),
    method: req.method,
    path: req.path,
    userId: (req as any).userId,
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.headers['user-agent']
  };

  // Log request
  console.log(
    `[${logEntry.timestamp.toISOString()}] ${logEntry.method} ${logEntry.path} - RequestID: ${requestId}`
  );

  // Capture response
  const originalSend = res.send;
  res.send = function (data: any): Response {
    const duration = Date.now() - startTime;

    logEntry.statusCode = res.statusCode;
    logEntry.duration = duration;

    // Log response
    const statusColor = res.statusCode >= 500 ? '\x1b[31m' :
                       res.statusCode >= 400 ? '\x1b[33m' :
                       res.statusCode >= 300 ? '\x1b[36m' :
                       '\x1b[32m';
    const resetColor = '\x1b[0m';

    console.log(
      `[${new Date().toISOString()}] ${statusColor}${res.statusCode}${resetColor} ${logEntry.method} ${logEntry.path} - ${duration}ms`
    );

    // Store log entry (in production, send to logging service)
    storeLogEntry(logEntry);

    return originalSend.call(this, data);
  };

  // Capture errors
  res.on('error', (error: Error) => {
    logEntry.error = error.message;
    console.error(
      `[${new Date().toISOString()}] ERROR ${logEntry.method} ${logEntry.path}:`,
      error
    );
    storeLogEntry(logEntry);
  });

  next();
}

/**
 * Store log entry
 */
function storeLogEntry(entry: LogEntry): void {
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
export function logError(context: string, error: Error, metadata?: any): void {
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
export function logPerformance(operation: string, duration: number, metadata?: any): void {
  const perfLog = {
    timestamp: new Date().toISOString(),
    operation,
    duration,
    metadata
  };

  if (duration > 1000) {
    console.warn(`[PERFORMANCE] Slow operation: ${operation} took ${duration}ms`);
  } else {
    console.log(`[PERFORMANCE] ${operation}: ${duration}ms`);
  }

  // In production, send to APM service (New Relic, AppDynamics, etc.)
}
