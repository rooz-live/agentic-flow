/**
 * Dynamic Router
 * 
 * Provides dynamic routing with tenant extraction, context building,
 * rate limiting, and feature flag gating.
 * 
 * @module tenant-isolation/dynamic-router
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import {
  RouteDefinition,
  ResolvedRoute,
  TenantContext,
  RateLimitConfig,
  DEFAULT_RATE_LIMIT
} from './types.js';
import { TenantBoundaryEnforcer } from './boundary-enforcer.js';

/**
 * Rate limit tracking entry
 */
interface RateLimitEntry {
  tenantId: string;
  routePattern: string;
  requestCount: number;
  windowStart: number;
  windowMs: number;
}

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
 * Compiled route pattern
 */
interface CompiledRoute {
  definition: RouteDefinition;
  regex: RegExp;
  paramNames: string[];
}

/**
 * DynamicRouter provides tenant-aware routing with context building,
 * rate limiting, and feature flag gating.
 */
export class DynamicRouter extends EventEmitter {
  /** Registered route definitions */
  private routes: RouteDefinition[];
  /** Compiled route patterns */
  private compiledRoutes: CompiledRoute[];
  /** Tenant extractors by type */
  private tenantExtractors: Map<string, (req: RouterRequest, route: RouteDefinition) => string | null>;
  /** Boundary enforcer for tenant validation */
  private boundaryEnforcer: TenantBoundaryEnforcer;
  /** Rate limit tracking */
  private rateLimits: Map<string, RateLimitEntry>;
  /** Resolution metrics */
  private metrics: {
    totalResolutions: number;
    successfulResolutions: number;
    failedResolutions: number;
    rateLimitedRequests: number;
    featureFlaggedRequests: number;
    avgResolveTimeMs: number;
    resolveTimes: number[];
  };

  constructor(boundaryEnforcer: TenantBoundaryEnforcer) {
    super();
    this.routes = [];
    this.compiledRoutes = [];
    this.boundaryEnforcer = boundaryEnforcer;
    this.rateLimits = new Map();
    this.tenantExtractors = new Map();
    this.metrics = {
      totalResolutions: 0,
      successfulResolutions: 0,
      failedResolutions: 0,
      rateLimitedRequests: 0,
      featureFlaggedRequests: 0,
      avgResolveTimeMs: 0,
      resolveTimes: []
    };

    // Initialize default tenant extractors
    this.initializeDefaultExtractors();
  }

  // ============================================================================
  // Route Management
  // ============================================================================

  /**
   * Register a new route
   * @param route - Route definition
   */
  registerRoute(route: RouteDefinition): void {
    // Check for duplicate pattern
    if (this.routes.some(r => r.pattern === route.pattern)) {
      throw new Error(`Route pattern ${route.pattern} already registered`);
    }

    this.routes.push(route);
    this.compiledRoutes.push(this.compileRoute(route));

    // Sort routes by specificity (more specific patterns first)
    this.sortRoutes();

    this.emit('routeRegistered', route);
  }

  /**
   * Unregister a route by pattern
   * @param pattern - Route pattern to remove
   */
  unregisterRoute(pattern: string): void {
    const index = this.routes.findIndex(r => r.pattern === pattern);
    if (index === -1) {
      throw new Error(`Route pattern ${pattern} not found`);
    }

    const route = this.routes[index];
    this.routes.splice(index, 1);
    this.compiledRoutes.splice(index, 1);

    this.emit('routeUnregistered', route);
  }

  /**
   * Update an existing route
   * @param pattern - Route pattern to update
   * @param updates - Partial updates to apply
   */
  updateRoute(pattern: string, updates: Partial<RouteDefinition>): void {
    const index = this.routes.findIndex(r => r.pattern === pattern);
    if (index === -1) {
      throw new Error(`Route pattern ${pattern} not found`);
    }

    // Prevent changing the pattern
    const { pattern: _pattern, ...allowedUpdates } = updates;
    Object.assign(this.routes[index], allowedUpdates);

    // Recompile route
    this.compiledRoutes[index] = this.compileRoute(this.routes[index]);

    this.emit('routeUpdated', this.routes[index]);
  }

  /**
   * Get all registered routes
   */
  getRoutes(): RouteDefinition[] {
    return [...this.routes];
  }

  // ============================================================================
  // Request Resolution
  // ============================================================================

  /**
   * Resolve a request to a route with tenant context
   * @param request - Incoming request
   * @returns Resolved route or null if no match
   */
  resolve(request: RouterRequest): ResolvedRoute | null {
    const startTime = performance.now();
    this.metrics.totalResolutions++;

    try {
      // Find matching route
      const matchResult = this.findMatchingRoute(request);
      if (!matchResult) {
        this.metrics.failedResolutions++;
        return null;
      }

      const { compiled, params } = matchResult;
      const route = compiled.definition;

      // Extract tenant ID
      const tenantId = this.extractTenantId(request, route);
      if (!tenantId) {
        this.metrics.failedResolutions++;
        this.emit('tenantExtractionFailed', { request, route });
        return null;
      }

      // Validate tenant exists and is active
      const tenant = this.boundaryEnforcer.getTenant(tenantId);
      if (!tenant || tenant.status !== 'active') {
        this.metrics.failedResolutions++;
        this.emit('tenantValidationFailed', { tenantId, tenant });
        return null;
      }

      // Check rate limit
      if (!this.checkRateLimit(tenantId, route)) {
        this.metrics.rateLimitedRequests++;
        this.emit('rateLimitExceeded', { tenantId, route });
        return null;
      }

      // Check feature flags
      if (!this.checkFeatureFlags(tenantId, route)) {
        this.metrics.featureFlaggedRequests++;
        this.emit('featureFlagBlocked', { tenantId, route });
        return null;
      }

      // Build tenant context
      const tenantContext = this.buildTenantContext(tenantId, request);

      // Check required permissions
      if (!this.checkPermissions(tenantContext, route)) {
        this.metrics.failedResolutions++;
        this.emit('permissionDenied', { tenantContext, route });
        return null;
      }

      const resolveTimeMs = performance.now() - startTime;
      this.recordMetrics(resolveTimeMs);
      this.metrics.successfulResolutions++;

      const resolved: ResolvedRoute = {
        handler: route.handler,
        tenantContext,
        params,
        matchedPattern: route.pattern,
        permissions: tenantContext.permissions,
        resolveTimeMs
      };

      this.emit('routeResolved', resolved);

      return resolved;

    } catch (error) {
      this.metrics.failedResolutions++;
      this.emit('resolutionError', { request, error });
      return null;
    }
  }

  // ============================================================================
  // Tenant Extraction
  // ============================================================================

  /**
   * Extract tenant ID from request based on route configuration
   * @param request - Incoming request
   * @param route - Matched route
   * @returns Tenant ID or null
   */
  extractTenantId(request: RouterRequest, route: RouteDefinition): string | null {
    const extractor = this.tenantExtractors.get(route.tenantExtractor);
    if (!extractor) {
      return null;
    }

    return extractor(request, route);
  }

  /**
   * Register a custom tenant extractor
   * @param name - Extractor name
   * @param extractor - Extractor function
   */
  registerTenantExtractor(
    name: string,
    extractor: (req: RouterRequest, route: RouteDefinition) => string | null
  ): void {
    this.tenantExtractors.set(name, extractor);
  }

  // ============================================================================
  // Context Building
  // ============================================================================

  /**
   * Build tenant context from request
   * @param tenantId - Tenant identifier
   * @param request - Incoming request
   * @returns Tenant context
   */
  buildTenantContext(tenantId: string, request: RouterRequest): TenantContext {
    // Extract user information from headers (simplified)
    const userId = request.headers['x-user-id'] || 'anonymous';
    const sessionId = request.headers['x-session-id'] || this.generateSessionId();
    
    // Parse permissions from header
    const permissionsHeader = request.headers['x-permissions'] || '';
    const permissions = permissionsHeader ? permissionsHeader.split(',').map(p => p.trim()) : [];
    
    // Parse roles from header
    const rolesHeader = request.headers['x-roles'] || '';
    const effectiveRoles = rolesHeader ? rolesHeader.split(',').map(r => r.trim()) : [];

    // Get inherited permissions
    const inheritedPermissions = this.boundaryEnforcer.getEffectivePermissions(tenantId, []);

    // Get source IP
    const sourceIp = request.headers['x-forwarded-for'] || 
                     request.headers['x-real-ip'] || 
                     '0.0.0.0';

    return {
      tenantId,
      userId,
      sessionId,
      permissions,
      effectiveRoles,
      inheritedPermissions,
      requestId: this.generateRequestId(),
      timestamp: new Date(),
      sourceIp,
      userAgent: request.headers['user-agent'] || 'unknown'
    };
  }

  // ============================================================================
  // Rate Limiting
  // ============================================================================

  /**
   * Check if request passes rate limit
   * @param tenantId - Tenant identifier
   * @param route - Route definition
   * @returns True if within rate limit
   */
  checkRateLimit(tenantId: string, route: RouteDefinition): boolean {
    if (!route.rateLimit) {
      return true;
    }

    const key = `${tenantId}:${route.pattern}`;
    const now = Date.now();
    let entry = this.rateLimits.get(key);

    if (!entry) {
      // First request
      entry = {
        tenantId,
        routePattern: route.pattern,
        requestCount: 1,
        windowStart: now,
        windowMs: route.rateLimit.windowMs
      };
      this.rateLimits.set(key, entry);
      return true;
    }

    // Check if window has expired
    if (now - entry.windowStart > entry.windowMs) {
      // Reset window
      entry.requestCount = 1;
      entry.windowStart = now;
      return true;
    }

    // Check count
    if (entry.requestCount >= route.rateLimit.requests) {
      return false;
    }

    entry.requestCount++;
    return true;
  }

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
  } | null {
    const route = this.routes.find(r => r.pattern === pattern);
    if (!route?.rateLimit) {
      return null;
    }

    const key = `${tenantId}:${pattern}`;
    const entry = this.rateLimits.get(key);

    if (!entry) {
      return {
        remaining: route.rateLimit.requests,
        limit: route.rateLimit.requests,
        resetAt: new Date(Date.now() + route.rateLimit.windowMs)
      };
    }

    const now = Date.now();
    if (now - entry.windowStart > entry.windowMs) {
      return {
        remaining: route.rateLimit.requests,
        limit: route.rateLimit.requests,
        resetAt: new Date(now + route.rateLimit.windowMs)
      };
    }

    return {
      remaining: Math.max(0, route.rateLimit.requests - entry.requestCount),
      limit: route.rateLimit.requests,
      resetAt: new Date(entry.windowStart + entry.windowMs)
    };
  }

  // ============================================================================
  // Feature Flag Gate
  // ============================================================================

  /**
   * Check if request passes feature flag requirements
   * @param tenantId - Tenant identifier
   * @param route - Route definition
   * @returns True if all required feature flags are enabled
   */
  checkFeatureFlags(tenantId: string, route: RouteDefinition): boolean {
    if (!route.featureFlags || route.featureFlags.length === 0) {
      return true;
    }

    return route.featureFlags.every(flag =>
      this.boundaryEnforcer.isFeatureEnabled(tenantId, flag)
    );
  }

  // ============================================================================
  // Middleware Generation
  // ============================================================================

  /**
   * Create Express-compatible middleware
   * @returns Middleware function
   */
  createMiddleware(): (req: any, res: any, next: any) => void {
    return (req: any, res: any, next: any) => {
      // Build router request from Express request
      const routerRequest: RouterRequest = {
        method: req.method,
        path: req.path || req.url,
        headers: this.normalizeHeaders(req.headers),
        query: req.query || {}
      };

      // Resolve route
      const resolved = this.resolve(routerRequest);

      if (!resolved) {
        // No route matched or validation failed
        res.status(404).json({ error: 'Route not found or access denied' });
        return;
      }

      // Attach resolved info to request
      req.tenantContext = resolved.tenantContext;
      req.routeParams = resolved.params;
      req.matchedRoute = resolved.matchedPattern;

      next();
    };
  }

  /**
   * Create Koa-compatible middleware
   * @returns Middleware function
   */
  createKoaMiddleware(): (ctx: any, next: () => Promise<any>) => Promise<void> {
    return async (ctx: any, next: () => Promise<any>) => {
      const routerRequest: RouterRequest = {
        method: ctx.method,
        path: ctx.path,
        headers: this.normalizeHeaders(ctx.headers),
        query: ctx.query || {}
      };

      const resolved = this.resolve(routerRequest);

      if (!resolved) {
        ctx.status = 404;
        ctx.body = { error: 'Route not found or access denied' };
        return;
      }

      ctx.state.tenantContext = resolved.tenantContext;
      ctx.state.routeParams = resolved.params;
      ctx.state.matchedRoute = resolved.matchedPattern;

      await next();
    };
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /**
   * Initialize default tenant extractors
   */
  private initializeDefaultExtractors(): void {
    // Path-based extraction (e.g., /:tenant/api/...)
    this.tenantExtractors.set('path', (req, route) => {
      const compiled = this.compiledRoutes.find(c => c.definition === route);
      if (!compiled) return null;

      const match = req.path.match(compiled.regex);
      if (!match) return null;

      const paramIndex = compiled.paramNames.indexOf(route.tenantParam);
      if (paramIndex === -1) return null;

      return match[paramIndex + 1] || null;
    });

    // Subdomain-based extraction (e.g., tenant.example.com)
    this.tenantExtractors.set('subdomain', (req, route) => {
      const host = req.headers['host'] || '';
      const parts = host.split('.');
      
      // Assume first part is tenant if more than 2 parts
      if (parts.length > 2) {
        return parts[0];
      }
      
      return null;
    });

    // Header-based extraction (e.g., X-Tenant-ID header)
    this.tenantExtractors.set('header', (req, route) => {
      const headerName = route.tenantParam || 'x-tenant-id';
      return req.headers[headerName.toLowerCase()] || null;
    });

    // Query-based extraction (e.g., ?tenant=xxx)
    this.tenantExtractors.set('query', (req, route) => {
      const paramName = route.tenantParam || 'tenant';
      return req.query[paramName] || null;
    });
  }

  /**
   * Compile route pattern to regex
   */
  private compileRoute(route: RouteDefinition): CompiledRoute {
    const paramNames: string[] = [];
    
    // Convert pattern to regex
    // Supports: :param, :param?, *
    const regexPattern = route.pattern
      .replace(/\*/g, '.*')
      .replace(/:(\w+)\?/g, (_, name) => {
        paramNames.push(name);
        return '([^/]*)';
      })
      .replace(/:(\w+)/g, (_, name) => {
        paramNames.push(name);
        return '([^/]+)';
      });

    return {
      definition: route,
      regex: new RegExp(`^${regexPattern}$`),
      paramNames
    };
  }

  /**
   * Find matching route for request
   */
  private findMatchingRoute(request: RouterRequest): {
    compiled: CompiledRoute;
    params: Record<string, string>;
  } | null {
    for (const compiled of this.compiledRoutes) {
      const match = request.path.match(compiled.regex);
      if (match) {
        const params: Record<string, string> = {};
        compiled.paramNames.forEach((name, index) => {
          params[name] = match[index + 1] || '';
        });
        return { compiled, params };
      }
    }
    return null;
  }

  /**
   * Sort routes by specificity
   */
  private sortRoutes(): void {
    // Sort so more specific routes come first
    // Routes with more segments and fewer wildcards are more specific
    const getSpecificity = (pattern: string): number => {
      const segments = pattern.split('/').filter(s => s);
      let score = segments.length * 10;
      
      // Penalize wildcards
      score -= (pattern.match(/\*/g) || []).length * 5;
      
      // Penalize optional params
      score -= (pattern.match(/\?/g) || []).length * 2;
      
      return score;
    };

    const indices = this.routes.map((_, i) => i);
    indices.sort((a, b) => {
      return getSpecificity(this.routes[b].pattern) - getSpecificity(this.routes[a].pattern);
    });

    this.routes = indices.map(i => this.routes[i]);
    this.compiledRoutes = indices.map(i => this.compiledRoutes[i]);
  }

  /**
   * Check permissions against route requirements
   */
  private checkPermissions(context: TenantContext, route: RouteDefinition): boolean {
    if (route.requiredPermissions.length === 0) {
      return true;
    }

    const allPermissions = new Set([
      ...context.permissions,
      ...context.inheritedPermissions
    ]);

    // Check if user has all required permissions
    return route.requiredPermissions.every(perm => allPermissions.has(perm));
  }

  /**
   * Normalize request headers to lowercase keys
   */
  private normalizeHeaders(headers: Record<string, any>): Record<string, string> {
    const normalized: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
      normalized[key.toLowerCase()] = String(value);
    }
    return normalized;
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `sess-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Record resolution metrics
   */
  private recordMetrics(resolveTimeMs: number): void {
    this.metrics.resolveTimes.push(resolveTimeMs);
    
    // Keep only last 1000 times
    if (this.metrics.resolveTimes.length > 1000) {
      this.metrics.resolveTimes.shift();
    }

    // Update average
    const sum = this.metrics.resolveTimes.reduce((a, b) => a + b, 0);
    this.metrics.avgResolveTimeMs = sum / this.metrics.resolveTimes.length;
  }

  // ============================================================================
  // Statistics & Monitoring
  // ============================================================================

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
  } {
    return {
      totalResolutions: this.metrics.totalResolutions,
      successfulResolutions: this.metrics.successfulResolutions,
      failedResolutions: this.metrics.failedResolutions,
      rateLimitedRequests: this.metrics.rateLimitedRequests,
      featureFlaggedRequests: this.metrics.featureFlaggedRequests,
      avgResolveTimeMs: this.metrics.avgResolveTimeMs,
      routeCount: this.routes.length
    };
  }

  /**
   * Clear rate limit tracking (for testing)
   */
  clearRateLimits(): void {
    this.rateLimits.clear();
  }

  /**
   * Reset all metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalResolutions: 0,
      successfulResolutions: 0,
      failedResolutions: 0,
      rateLimitedRequests: 0,
      featureFlaggedRequests: 0,
      avgResolveTimeMs: 0,
      resolveTimes: []
    };
  }
}

/**
 * Factory function to create a DynamicRouter
 */
export function createDynamicRouter(
  boundaryEnforcer: TenantBoundaryEnforcer
): DynamicRouter {
  return new DynamicRouter(boundaryEnforcer);
}
