/**
 * JWT Authentication Middleware
 * Protects API endpoints and validates user tokens
 */
import jwt from 'jsonwebtoken';
const JWT_SECRET = process.env.JWT_SECRET || 'yo-life-dev-secret-change-in-prod';
const JWT_EXPIRES_IN = '24h';
/**
 * Generate a JWT token for a user
 */
export function generateToken(payload) {
    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
        issuer: 'yo.life',
        audience: 'yo.life-api'
    });
}
/**
 * Verify and decode a JWT token
 */
export function verifyToken(token) {
    try {
        const decoded = jwt.verify(token, JWT_SECRET, {
            issuer: 'yo.life',
            audience: 'yo.life-api'
        });
        return decoded;
    }
    catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            console.error('Token expired:', error.message);
        }
        else if (error instanceof jwt.JsonWebTokenError) {
            console.error('Invalid token:', error.message);
        }
        else {
            console.error('Token verification error:', error);
        }
        return null;
    }
}
/**
 * Authentication middleware
 * Validates JWT token from Authorization header
 */
export function authenticate(req, res, next) {
    try {
        // Extract token from Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            res.status(401).json({
                error: 'Unauthorized',
                message: 'No authorization header provided'
            });
            return;
        }
        // Check for Bearer token format
        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid authorization format. Use: Bearer <token>'
            });
            return;
        }
        const token = parts[1];
        // Verify token
        const decoded = verifyToken(token);
        if (!decoded) {
            res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid or expired token'
            });
            return;
        }
        // Attach user to request
        req.user = decoded;
        next();
    }
    catch (error) {
        console.error('Authentication error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Authentication failed'
        });
    }
}
/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't block unauthenticated requests
 */
export function optionalAuthenticate(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader) {
            const parts = authHeader.split(' ');
            if (parts.length === 2 && parts[0] === 'Bearer') {
                const token = parts[1];
                const decoded = verifyToken(token);
                if (decoded) {
                    req.user = decoded;
                }
            }
        }
        next();
    }
    catch (error) {
        console.error('Optional authentication error:', error);
        next();
    }
}
/**
 * Role-based authorization middleware
 * Requires authentication first
 */
export function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({
                error: 'Unauthorized',
                message: 'Authentication required'
            });
            return;
        }
        if (!allowedRoles.includes(req.user.role)) {
            res.status(403).json({
                error: 'Forbidden',
                message: `Access denied. Required roles: ${allowedRoles.join(', ')}`
            });
            return;
        }
        next();
    };
}
/**
 * Circle access middleware
 * Checks if user has access to a specific circle
 */
export function requireCircleAccess(req, res, next) {
    if (!req.user) {
        res.status(401).json({
            error: 'Unauthorized',
            message: 'Authentication required'
        });
        return;
    }
    const { circleName } = req.params;
    // Admin can access all circles
    if (req.user.role === 'admin') {
        next();
        return;
    }
    // Check if user has access to the requested circle
    const userCircles = req.user.circles || [];
    if (!userCircles.includes(circleName)) {
        res.status(403).json({
            error: 'Forbidden',
            message: `Access denied to circle: ${circleName}`
        });
        return;
    }
    next();
}
/**
 * API key authentication middleware (for service-to-service calls)
 */
export function authenticateApiKey(req, res, next) {
    const apiKey = req.headers['x-api-key'];
    const validApiKeys = (process.env.API_KEYS || '').split(',').filter(k => k);
    if (!apiKey || !validApiKeys.includes(apiKey)) {
        res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid API key'
        });
        return;
    }
    // Set a system user for API key requests
    req.user = {
        id: 'system',
        email: 'system@yo.life',
        role: 'service'
    };
    next();
}
/**
 * Combined auth middleware (supports both JWT and API key)
 */
export function flexibleAuth(req, res, next) {
    // Try API key first
    const apiKey = req.headers['x-api-key'];
    const validApiKeys = (process.env.API_KEYS || '').split(',').filter(k => k);
    if (apiKey && validApiKeys.includes(apiKey)) {
        req.user = {
            id: 'system',
            email: 'system@yo.life',
            role: 'service'
        };
        next();
        return;
    }
    // Fall back to JWT
    authenticate(req, res, next);
}
// Mock user database (replace with real DB in production)
const MOCK_USERS = [
    {
        id: 'user-1',
        email: 'admin@yo.life',
        password: 'admin123', // In production, use bcrypt
        role: 'admin',
        circles: ['orchestrator', 'assessor', 'innovator', 'analyst', 'seeker', 'intuitive']
    },
    {
        id: 'user-2',
        email: 'orchestrator@yo.life',
        password: 'orch123',
        role: 'circle_lead',
        circles: ['orchestrator']
    }
];
/**
 * Validate login credentials and generate token
 */
export async function login(credentials) {
    const user = MOCK_USERS.find(u => u.email === credentials.email && u.password === credentials.password);
    if (!user) {
        return null;
    }
    const payload = {
        id: user.id,
        email: user.email,
        role: user.role,
        circles: user.circles
    };
    const token = generateToken(payload);
    return {
        token,
        user: payload
    };
}
//# sourceMappingURL=auth.js.map