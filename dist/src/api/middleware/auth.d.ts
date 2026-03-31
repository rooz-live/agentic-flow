/**
 * JWT Authentication Middleware
 * Protects API endpoints and validates user tokens
 */
import { Request, Response, NextFunction } from 'express';
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email: string;
                role: string;
                circles?: string[];
            };
        }
    }
}
interface TokenPayload {
    id: string;
    email: string;
    role: string;
    circles?: string[];
}
/**
 * Generate a JWT token for a user
 */
export declare function generateToken(payload: TokenPayload): string;
/**
 * Verify and decode a JWT token
 */
export declare function verifyToken(token: string): TokenPayload | null;
/**
 * Authentication middleware
 * Validates JWT token from Authorization header
 */
export declare function authenticate(req: Request, res: Response, next: NextFunction): void;
/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't block unauthenticated requests
 */
export declare function optionalAuthenticate(req: Request, res: Response, next: NextFunction): void;
/**
 * Role-based authorization middleware
 * Requires authentication first
 */
export declare function requireRole(...allowedRoles: string[]): (req: Request, res: Response, next: NextFunction) => void;
/**
 * Circle access middleware
 * Checks if user has access to a specific circle
 */
export declare function requireCircleAccess(req: Request, res: Response, next: NextFunction): void;
/**
 * API key authentication middleware (for service-to-service calls)
 */
export declare function authenticateApiKey(req: Request, res: Response, next: NextFunction): void;
/**
 * Combined auth middleware (supports both JWT and API key)
 */
export declare function flexibleAuth(req: Request, res: Response, next: NextFunction): void;
/**
 * Login endpoint helper
 * Returns a JWT token for valid credentials
 */
export interface LoginCredentials {
    email: string;
    password: string;
}
export interface LoginResponse {
    token: string;
    user: {
        id: string;
        email: string;
        role: string;
        circles?: string[];
    };
}
/**
 * Validate login credentials and generate token
 */
export declare function login(credentials: LoginCredentials): Promise<LoginResponse | null>;
export {};
//# sourceMappingURL=auth.d.ts.map