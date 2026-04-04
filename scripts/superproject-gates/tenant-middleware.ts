/**
 * Tenant-Aware Routing and Middleware
 * 
 * Provides middleware for tenant-aware request routing, authentication,
 * and access control in multi-tenant affiliate platform
 */

import { EventEmitter } from 'events';
import {
  Tenant,
  TenantContext,
  AffiliateError,
  AffiliateEvent
} from '../types';
import { OrchestrationFramework } from '../../core/orchestration-framework';
import { WSJFScoringService } from '../../wsjf/scoring-service';
import { MultiTenantManager } from './multi-tenant-manager';
import { TenantIsolation } from './tenant-isolation';

export interface TenantRequest {
  tenantId: string;
  tenant: Tenant;
  context: TenantContext;
  userId?: string;
  permissions: string[];
  requestId: string;
  timestamp: Date;
  path: string;
  method: string;
  headers: Record<string, string>;
  query: Record<string, string>;
  body?: any;
}

export interface TenantResponse {
  status: number;
  headers: Record<string, string>;
  body?: any;
  error?: string;
  requestId: string;
  timestamp: Date;
  processingTime: number;
}

export interface MiddlewareConfig {
  enableRateLimiting: boolean;
  enableCaching: boolean;
  enableCompression: boolean;
  enableCORS: boolean;
  enableSecurity: boolean;
  defaultCacheTTL: number;
  maxRequestSize: number;
  timeoutMs: number;
}

export interface RouteHandler {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  handler: (req: TenantRequest) => Promise<TenantResponse>;
  requiredPermissions?: string[];
  rateLimit?: {
    requests: number;
    windowMs: number;
  };
  cache?: {
    enabled: boolean;
    ttl: number;
  };
}

export class TenantMiddleware extends EventEmitter {
  private routes: Map<string, RouteHandler[]> = new Map();
  private rateLimiters: Map<string, Map<string, number[]>> = new Map();
  private cache: Map<string, { data: any; expires: Date }> = new Map();
  private config: MiddlewareConfig;

  constructor(
    private orchestration: OrchestrationFramework,
    private wsjfService: WSJFScoringService,
    private multiTenantManager: MultiTenantManager,
    private tenantIsolation: TenantIsolation,
    config: Partial<MiddlewareConfig> = {}
  ) {
    super();
    this.config = {
      enableRateLimiting: true,
      enableCaching: true,
      enableCompression: true,
      enableCORS: true,
      enableSecurity: true,
      defaultCacheTTL: 300, // 5 minutes
      maxRequestSize: 10 * 1024 * 1024, // 10MB
      timeoutMs: 30000, // 30 seconds
      ...config
    };
    this.setupOrchestrationIntegration();
    this.startCleanupTimer();
  }

  /**
   * Setup integration with orchestration framework
   */
  private setupOrchestrationIntegration(): void {
    // Create purpose for request routing
    const routingPurpose = this.orchestration.createPurpose({
      name: 'Tenant-Aware Request Routing',
      description: 'Provide efficient and secure request routing for multi-tenant platform',
      objectives: [
        'Route requests to correct tenant context',
        'Enforce security and access controls',
        'Optimize request processing performance',
        'Maintain comprehensive request logging'
      ],
      keyResults: [
        '99.9% request routing accuracy',
        'Sub-100ms average response time',
        'Zero security breaches',
        'Complete request audit trail'
      ]
    });

    // Create domain for middleware operations
    const middlewareDomain = this.orchestration.createDomain({
      name: 'Middleware and Routing',
      purpose: 'Manage all request routing, middleware, and access control operations',
      boundaries: [
        'Request validation and routing',
        'Tenant context resolution',
        'Security and access control',
        'Performance optimization'
      ],
      accountabilities: [
        'Request routing accuracy',
        'Security enforcement',
        'Performance optimization',
        'Access control compliance'
      ]
    });

    console.log('[TENANT-MIDDLEWARE] Integrated with orchestration framework');
  }

  /**
   * Register route handler
   */
  public registerRoute(handler: RouteHandler): void {
    const key = `${handler.method}:${handler.path}`;
    const handlers = this.routes.get(key) || [];
    handlers.push(handler);
    this.routes.set(key, handlers);

    console.log(`[TENANT-MIDDLEWARE] Registered route: ${handler.method} ${handler.path}`);
  }

  /**
   * Process incoming request
   */
  public async processRequest(
    method: string,
    path: string,
    headers: Record<string, string>,
    query: Record<string, string>,
    body?: any,
    userId?: string
  ): Promise<TenantResponse> {
    const startTime = Date.now();
    const requestId = this.generateId('request');

    try {
      // Extract tenant information
      const tenantInfo = this.extractTenantInfo(headers, query, path);
      if (!tenantInfo) {
        return this.createErrorResponse(400, 'Tenant information required', requestId, startTime);
      }

      // Get tenant context
      const context = this.multiTenantManager.getTenantContext(tenantInfo.tenantId);
      if (!context) {
        return this.createErrorResponse(404, 'Tenant not found', requestId, startTime);
      }

      // Validate tenant access
      if (!this.multiTenantManager.validateTenantAccess(tenantInfo.tenantId, 'read', userId)) {
        return this.createErrorResponse(403, 'Access denied', requestId, startTime);
      }

      // Create tenant request object
      const tenantRequest: TenantRequest = {
        tenantId: tenantInfo.tenantId,
        tenant: context.tenant,
        context,
        userId,
        permissions: context.permissions,
        requestId,
        timestamp: new Date(),
        path,
        method: method as any,
        headers,
        query,
        body
      };

      // Apply middleware chain
      const response = await this.applyMiddlewareChain(tenantRequest);

      // Log request completion
      this.emitEvent('request_processed', {
        requestId,
        tenantId: tenantInfo.tenantId,
        method,
        path,
        status: response.status,
        processingTime: Date.now() - startTime
      });

      return response;

    } catch (error) {
      console.error(`[TENANT-MIDDLEWARE] Request processing failed:`, error);
      return this.createErrorResponse(500, 'Internal server error', requestId, startTime);
    }
  }

  /**
   * Apply middleware chain to request
   */
  private async applyMiddlewareChain(req: TenantRequest): Promise<TenantResponse> {
    // Security middleware
    if (this.config.enableSecurity) {
      const securityResult = await this.applySecurityMiddleware(req);
      if (securityResult.status !== 200) {
        return securityResult;
      }
    }

    // Rate limiting middleware
    if (this.config.enableRateLimiting) {
      const rateLimitResult = await this.applyRateLimitMiddleware(req);
      if (rateLimitResult.status !== 200) {
        return rateLimitResult;
      }
    }

    // Caching middleware (for GET requests)
    if (this.config.enableCaching && req.method === 'GET') {
      const cacheResult = await this.applyCacheMiddleware(req);
      if (cacheResult) {
        return cacheResult;
      }
    }

    // Route matching and execution
    const routeResult = await this.executeRoute(req);
    
    // Cache response if applicable
    if (this.config.enableCaching && req.method === 'GET' && routeResult.status === 200) {
      this.cacheResponse(req, routeResult);
    }

    return routeResult;
  }

  /**
   * Apply security middleware
   */
  private async applySecurityMiddleware(req: TenantRequest): Promise<TenantResponse> {
    // Validate request size
    const contentLength = parseInt(req.headers['content-length'] || '0');
    if (contentLength > this.config.maxRequestSize) {
      return this.createErrorResponse(413, 'Request entity too large', req.requestId);
    }

    // Validate headers
    const requiredHeaders = ['user-agent', 'accept'];
    for (const header of requiredHeaders) {
      if (!req.headers[header]) {
        return this.createErrorResponse(400, `Missing required header: ${header}`, req.requestId);
      }
    }

    // CORS headers if enabled
    if (this.config.enableCORS) {
      // CORS would be handled here
    }

    return this.createSuccessResponse({}, req.requestId);
  }

  /**
   * Apply rate limiting middleware
   */
  private async applyRateLimitMiddleware(req: TenantRequest): Promise<TenantResponse> {
    const key = `${req.tenantId}:${req.userId || 'anonymous'}`;
    const now = Date.now();
    const windowMs = 60000; // 1 minute window
    const maxRequests = 1000; // Max requests per minute

    if (!this.rateLimiters.has(req.tenantId)) {
      this.rateLimiters.set(req.tenantId, new Map());
    }

    const tenantLimiter = this.rateLimiters.get(req.tenantId)!;
    if (!tenantLimiter.has(key)) {
      tenantLimiter.set(key, []);
    }

    const requests = tenantLimiter.get(key)!;
    
    // Remove old requests outside the window
    const validRequests = requests.filter(timestamp => now - timestamp < windowMs);
    tenantLimiter.set(key, validRequests);

    // Check rate limit
    if (validRequests.length >= maxRequests) {
      return this.createErrorResponse(429, 'Too many requests', req.requestId);
    }

    // Add current request
    validRequests.push(now);

    return this.createSuccessResponse({}, req.requestId);
  }

  /**
   * Apply cache middleware
   */
  private async applyCacheMiddleware(req: TenantRequest): Promise<TenantResponse | null> {
    const cacheKey = this.generateCacheKey(req);
    const cached = this.cache.get(cacheKey);

    if (cached && cached.expires > new Date()) {
      return {
        ...cached.data,
        headers: {
          ...cached.data.headers,
          'x-cache': 'HIT'
        }
      };
    }

    return null;
  }

  /**
   * Execute matching route
   */
  private async executeRoute(req: TenantRequest): Promise<TenantResponse> {
    const key = `${req.method}:${req.path}`;
    const handlers = this.routes.get(key) || [];

    for (const handler of handlers) {
      // Check permissions
      if (handler.requiredPermissions) {
        const hasPermission = handler.requiredPermissions.every(permission =>
          req.permissions.includes(permission)
        );
        if (!hasPermission) {
          return this.createErrorResponse(403, 'Insufficient permissions', req.requestId);
        }
      }

      // Execute handler
      try {
        const response = await handler.handler(req);
        return response;
      } catch (error) {
        console.error(`[TENANT-MIDDLEWARE] Route handler failed:`, error);
        return this.createErrorResponse(500, 'Route handler error', req.requestId);
      }
    }

    return this.createErrorResponse(404, 'Route not found', req.requestId);
  }

  /**
   * Cache response
   */
  private cacheResponse(req: TenantRequest, response: TenantResponse): void {
    const cacheKey = this.generateCacheKey(req);
    const ttl = this.config.defaultCacheTTL * 1000; // Convert to milliseconds

    this.cache.set(cacheKey, {
      data: {
        ...response,
        headers: {
          ...response.headers,
          'x-cache': 'MISS'
        }
      },
      expires: new Date(Date.now() + ttl)
    });
  }

  /**
   * Extract tenant information from request
   */
  private extractTenantInfo(
    headers: Record<string, string>,
    query: Record<string, string>,
    path: string
  ): { tenantId: string; domain?: string } | null {
    // Try header first
    const tenantId = headers['x-tenant-id'] || headers['tenant-id'];
    if (tenantId) {
      return { tenantId };
    }

    // Try query parameter
    const queryTenant = query.tenant || query.tenantId;
    if (queryTenant) {
      return { tenantId: queryTenant };
    }

    // Try subdomain
    const host = headers.host;
    if (host) {
      const subdomain = host.split('.')[0];
      if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
        return { tenantId: subdomain, domain: host };
      }
    }

    // Try path parameter
    const pathMatch = path.match(/^\/tenant\/([^\/]+)/);
    if (pathMatch) {
      return { tenantId: pathMatch[1] };
    }

    return null;
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(req: TenantRequest): string {
    const keyData = {
      tenantId: req.tenantId,
      method: req.method,
      path: req.path,
      query: req.query,
      userId: req.userId
    };
    return `cache_${Buffer.from(JSON.stringify(keyData)).toString('base64')}`;
  }

  /**
   * Create success response
   */
  private createSuccessResponse(
    body: any,
    requestId: string,
    headers: Record<string, string> = {}
  ): TenantResponse {
    return {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'x-request-id': requestId,
        ...headers
      },
      body,
      requestId,
      timestamp: new Date(),
      processingTime: 0
    };
  }

  /**
   * Create error response
   */
  private createErrorResponse(
    status: number,
    error: string,
    requestId: string,
    startTime?: number
  ): TenantResponse {
    return {
      status,
      headers: {
        'content-type': 'application/json',
        'x-request-id': requestId
      },
      body: {
        error,
        status,
        requestId,
        timestamp: new Date().toISOString()
      },
      error,
      requestId,
      timestamp: new Date(),
      processingTime: startTime ? Date.now() - startTime : 0
    };
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    setInterval(() => {
      this.performCleanup();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Perform cleanup of expired data
   */
  private performCleanup(): void {
    // Clean up expired cache entries
    const now = new Date();
    for (const [key, value] of this.cache.entries()) {
      if (value.expires <= now) {
        this.cache.delete(key);
      }
    }

    // Clean up old rate limit entries
    const cutoffTime = Date.now() - 60000; // 1 minute ago
    for (const [tenantId, limiter] of this.rateLimiters.entries()) {
      for (const [key, requests] of limiter.entries()) {
        const validRequests = requests.filter(timestamp => timestamp > cutoffTime);
        if (validRequests.length === 0) {
          limiter.delete(key);
        } else {
          limiter.set(key, validRequests);
        }
      }
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(type: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `${type}-${timestamp}-${random}`;
  }

  /**
   * Emit affiliate event
   */
  private emitEvent(type: AffiliateEvent['type'], data: Record<string, any>): void {
    const event: AffiliateEvent = {
      id: this.generateId('event'),
      type,
      timestamp: new Date(),
      data,
      metadata: {}
    };

    this.emit('affiliateEvent', event);
  }

  // Public utility methods
  public getRegisteredRoutes(): Array<{ method: string; path: string; handlerCount: number }> {
    const routes: Array<{ method: string; path: string; handlerCount: number }> = [];
    
    for (const [key, handlers] of this.routes.entries()) {
      const [method, path] = key.split(':');
      routes.push({
        method,
        path,
        handlerCount: handlers.length
      });
    }

    return routes;
  }

  public getCacheStats(): {
    size: number;
    hitRate: number;
    entries: Array<{ key: string; expires: Date; size: number }>;
  } {
    const entries = Array.from(this.cache.entries()).map(([key, value]) => ({
      key,
      expires: value.expires,
      size: JSON.stringify(value.data).length
    }));

    return {
      size: this.cache.size,
      hitRate: 0.85, // This would be calculated from actual metrics
      entries
    };
  }

  public getRateLimitStats(): Array<{
    tenantId: string;
    activeLimits: number;
    totalRequests: number;
  }> {
    const stats: Array<{
      tenantId: string;
      activeLimits: number;
      totalRequests: number;
    }> = [];

    for (const [tenantId, limiter] of this.rateLimiters.entries()) {
      let totalRequests = 0;
      for (const requests of limiter.values()) {
        totalRequests += requests.length;
      }

      stats.push({
        tenantId,
        activeLimits: limiter.size,
        totalRequests
      });
    }

    return stats;
  }

  public clearCache(tenantId?: string): void {
    if (tenantId) {
      // Clear cache for specific tenant
      for (const [key] of this.cache.entries()) {
        if (key.includes(`"tenantId":"${tenantId}"`)) {
          this.cache.delete(key);
        }
      }
    } else {
      // Clear all cache
      this.cache.clear();
    }

    console.log(`[TENANT-MIDDLEWARE] Cache cleared for tenant: ${tenantId || 'all'}`);
  }

  public resetRateLimits(tenantId?: string): void {
    if (tenantId) {
      this.rateLimiters.delete(tenantId);
    } else {
      this.rateLimiters.clear();
    }

    console.log(`[TENANT-MIDDLEWARE] Rate limits reset for tenant: ${tenantId || 'all'}`);
  }

  /**
   * Dispose of middleware resources
   */
  public dispose(): void {
    this.rateLimiters.clear();
    this.removeAllListeners();
  }
}