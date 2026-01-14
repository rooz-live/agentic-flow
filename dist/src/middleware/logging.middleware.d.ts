/**
 * Logging Middleware
 * Request/response logging and monitoring
 *
 * OBSERVABILITY: Emits pattern metrics to .goalie/pattern_metrics.jsonl
 * for API gateway latency tracking (CONSOLIDATED_ACTIONS: full-stack observability)
 */
import { NextFunction, Request, Response } from 'express';
/**
 * Logging middleware
 */
export declare function loggingMiddleware(req: Request, res: Response, next: NextFunction): void;
/**
 * Error logging utility
 */
export declare function logError(context: string, error: Error, metadata?: any): void;
/**
 * Performance logging utility
 */
export declare function logPerformance(operation: string, duration: number, metadata?: any): void;
//# sourceMappingURL=logging.middleware.d.ts.map