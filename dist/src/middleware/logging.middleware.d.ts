/**
 * Logging Middleware
 * Request/response logging and monitoring
 */
import { Request, Response, NextFunction } from 'express';
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