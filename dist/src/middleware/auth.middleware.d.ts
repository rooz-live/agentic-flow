/**
 * Authentication Middleware
 * Validates API requests and manages authentication
 */
import { Request, Response, NextFunction } from 'express';
interface AuthRequest extends Request {
    userId?: string;
    sessionId?: string;
}
/**
 * Authentication middleware
 * In production, integrate with proper auth service (JWT, OAuth, etc.)
 */
export declare function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void;
/**
 * Optional middleware to require provider role
 */
export declare function requireProviderRole(req: AuthRequest, res: Response, next: NextFunction): void;
export {};
//# sourceMappingURL=auth.middleware.d.ts.map