/**
 * Dynamic Router
 *
 * Provides dynamic routing with tenant extraction, context building,
 * rate limiting, and feature flag gating.
 *
 * @module tenant-isolation/dynamic-router
 */
import { EventEmitter } from 'events';
import { RouteDefinition, ResolvedRoute, TenantContext } from './types.js';
import { TenantBoundaryEnforcer } from './boundary-enforcer.js';
/**
 * Request object interface
 */
export interface RouterRequest {
    method: string;
    path: string;
    headers: Record<string, string>;
    query: Record<string, string>;
    body?: any;
}
/**
 * DynamicRouter provides tenant-aware routing with context building,
 * rate limiting, and feature flag gating.
 */
export declare class DynamicRouter extends EventEmitter {
    /** Registered route definitions */
    private routes;
    /** Compiled route patterns */
    private compiledRoutes;
    /** Tenant extractors by type */
    private tenantExtractors;
    /** Boundary enforcer for tenant validation */
    private boundaryEnforcer;
    /** Rate limit tracking */
    private rateLimits;
    /** Resolution metrics */
    private metrics;
    constructor(boundaryEnforcer: TenantBoundaryEnforcer);
    /**
     * Register a new route
     * @param route - Route definition
     */
    registerRoute(route: RouteDefinition): void;
    /**
     * Unregister a route by pattern
     * @param pattern - Route pattern to remove
     */
    unregisterRoute(pattern: string): void;
    /**
     * Update an existing route
     * @param pattern - Route pattern to update
     * @param updates - Partial updates to apply
     */
    updateRoute(pattern: string, updates: Partial<RouteDefinition>): void;
    /**
     * Get all registered routes
     */
    getRoutes(): RouteDefinition[];
    /**
     * Resolve a request to a route with tenant context
     * @param request - Incoming request
     * @returns Resolved route or null if no match
     */
    resolve(request: RouterRequest): ResolvedRoute | null;
    /**
     * Extract tenant ID from request based on route configuration
     * @param request - Incoming request
     * @param route - Matched route
     * @returns Tenant ID or null
     */
    extractTenantId(request: RouterRequest, route: RouteDefinition): string | null;
    /**
     * Register a custom tenant extractor
     * @param name - Extractor name
     * @param extractor - Extractor function
     */
    registerTenantExtractor(name: string, extractor: (req: RouterRequest, route: RouteDefinition) => string | null): void;
    /**
     * Build tenant context from request
     * @param tenantId - Tenant identifier
     * @param request - Incoming request
     * @returns Tenant context
     */
    buildTenantContext(tenantId: string, request: RouterRequest): TenantContext;
    /**
     * Check if request passes rate limit
     * @param tenantId - Tenant identifier
     * @param route - Route definition
     * @returns True if within rate limit
     */
    checkRateLimit(tenantId: string, route: RouteDefinition): boolean;
    /**
     * Get current rate limit status for a tenant and route
     * @param tenantId - Tenant identifier
     * @param pattern - Route pattern
     * @returns Rate limit status or null
     */
    getRateLimitStatus(tenantId: string, pattern: string): {
        remaining: number;
        limit: number;
        resetAt: Date;
    } | null;
    /**
     * Check if request passes feature flag requirements
     * @param tenantId - Tenant identifier
     * @param route - Route definition
     * @returns True if all required feature flags are enabled
     */
    checkFeatureFlags(tenantId: string, route: RouteDefinition): boolean;
    /**
     * Create Express-compatible middleware
     * @returns Middleware function
     */
    createMiddleware(): (req: any, res: any, next: any) => void;
    /**
     * Create Koa-compatible middleware
     * @returns Middleware function
     */
    createKoaMiddleware(): (ctx: any, next: () => Promise<any>) => Promise<void>;
    /**
     * Initialize default tenant extractors
     */
    private initializeDefaultExtractors;
    /**
     * Compile route pattern to regex
     */
    private compileRoute;
    /**
     * Find matching route for request
     */
    private findMatchingRoute;
    /**
     * Sort routes by specificity
     */
    private sortRoutes;
    /**
     * Check permissions against route requirements
     */
    private checkPermissions;
    /**
     * Normalize request headers to lowercase keys
     */
    private normalizeHeaders;
    /**
     * Generate unique request ID
     */
    private generateRequestId;
    /**
     * Generate unique session ID
     */
    private generateSessionId;
    /**
     * Record resolution metrics
     */
    private recordMetrics;
    /**
     * Get router metrics
     */
    getMetrics(): {
        totalResolutions: number;
        successfulResolutions: number;
        failedResolutions: number;
        rateLimitedRequests: number;
        featureFlaggedRequests: number;
        avgResolveTimeMs: number;
        routeCount: number;
    };
    /**
     * Clear rate limit tracking (for testing)
     */
    clearRateLimits(): void;
    /**
     * Reset all metrics
     */
    resetMetrics(): void;
}
/**
 * Factory function to create a DynamicRouter
 */
export declare function createDynamicRouter(boundaryEnforcer: TenantBoundaryEnforcer): DynamicRouter;
//# sourceMappingURL=dynamic-router.d.ts.map