/**
 * System Adapters - Multi-Tenant Navigation
 *
 * Provides unified routing layer across multiple platforms:
 * - HostBill: Billing and subscription management
 * - WordPress: Content management system
 * - Flarum: Forum platform
 * - Symfony/Oro: Enterprise application platform
 * - Custom systems: Any additional platform integrations
 *
 * Principles:
 * - Manthra: Directed thought-power applied to system integration logic
 * - Yasna: Disciplined alignment through consistent adapter interfaces
 * - Mithra: Binding force preventing system integration drift
 *
 * @module multi-tenant-navigation/system-adapters
 */

import {
  SystemAdapter,
  SystemRoute,
  SystemAdapterConfig,
  SystemHealthStatus,
  UnifiedRoute,
  UnifiedRoutingConfig,
  DEFAULT_UNIFIED_ROUTING_CONFIG,
  TenantPlatform
} from './types.js';

/**
 * HostBill system adapter for billing and subscription management
 */
export class HostBillAdapter implements SystemAdapter {
  readonly platform: TenantPlatform = 'hostbill';
  private config: SystemAdapterConfig;
  private routes: Map<string, SystemRoute>;

  constructor(config: SystemAdapterConfig) {
    this.config = config;
    this.routes = new Map();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    const baseRoutes: SystemRoute[] = [
      { id: 'hb-dashboard', path: '/dashboard', label: 'Dashboard' },
      { id: 'hb-clients', path: '/clients', label: 'Clients' },
      { id: 'hb-client-add', path: '/clients/add', label: 'Add Client' },
      { id: 'hb-invoices', path: '/billing/invoices', label: 'Invoices' },
      { id: 'hb-payments', path: '/billing/payments', label: 'Payments' },
      { id: 'hb-services', path: '/services', label: 'Services' },
      { id: 'hb-tickets', path: '/support/tickets', label: 'Support Tickets' }
    ];

    baseRoutes.forEach(route => this.routes.set(route.id, route));
  }

  async getRoute(path: string): Promise<SystemRoute | null> {
    for (const route of this.routes.values()) {
      if (path === route.path || path.startsWith(route.path + '/')) {
        return route;
      }
    }
    return null;
  }

  async resolveRoute(path: string): Promise<UnifiedRoute> {
    const route = await this.getRoute(path);
    return {
      platform: this.platform,
      path,
      label: route?.label ?? 'Unknown',
      url: `${this.config.baseUrl}${path}`,
      metadata: {
        system: 'hostbill',
        apiEndpoint: this.config.apiEndpoint
      }
    };
  }

  async getHealth(): Promise<SystemHealthStatus> {
    // Simulated health check - in production, make actual API call
    return {
      platform: this.platform,
      status: 'healthy',
      responseTime: Math.random() * 100,
      lastChecked: new Date()
    };
  }

  getRoutes(): SystemRoute[] {
    return Array.from(this.routes.values());
  }
}

/**
 * WordPress system adapter for content management
 */
export class WordPressAdapter implements SystemAdapter {
  readonly platform: TenantPlatform = 'wordpress';
  private config: SystemAdapterConfig;
  private routes: Map<string, SystemRoute>;

  constructor(config: SystemAdapterConfig) {
    this.config = config;
    this.routes = new Map();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    const baseRoutes: SystemRoute[] = [
      { id: 'wp-dashboard', path: '/wp-admin', label: 'Dashboard' },
      { id: 'wp-posts', path: '/wp-admin/edit.php', label: 'All Posts' },
      { id: 'wp-post-add', path: '/wp-admin/post-new.php', label: 'Add New Post' },
      { id: 'wp-media', path: '/wp-admin/upload.php', label: 'Media Library' },
      { id: 'wp-pages', path: '/wp-admin/edit.php?post_type=page', label: 'All Pages' },
      { id: 'wp-comments', path: '/wp-admin/edit-comments.php', label: 'Comments' },
      { id: 'wp-plugins', path: '/wp-admin/plugins.php', label: 'Plugins' },
      { id: 'wp-settings', path: '/wp-admin/options-general.php', label: 'Settings' }
    ];

    baseRoutes.forEach(route => this.routes.set(route.id, route));
  }

  async getRoute(path: string): Promise<SystemRoute | null> {
    for (const route of this.routes.values()) {
      if (path === route.path || path.startsWith(route.path + '?')) {
        return route;
      }
    }
    return null;
  }

  async resolveRoute(path: string): Promise<UnifiedRoute> {
    const route = await this.getRoute(path);
    return {
      platform: this.platform,
      path,
      label: route?.label ?? 'Unknown',
      url: `${this.config.baseUrl}${path}`,
      metadata: {
        system: 'wordpress',
        apiEndpoint: this.config.apiEndpoint
      }
    };
  }

  async getHealth(): Promise<SystemHealthStatus> {
    return {
      platform: this.platform,
      status: 'healthy',
      responseTime: Math.random() * 80,
      lastChecked: new Date()
    };
  }

  getRoutes(): SystemRoute[] {
    return Array.from(this.routes.values());
  }
}

/**
 * Flarum system adapter for forum platform
 */
export class FlarumAdapter implements SystemAdapter {
  readonly platform: TenantPlatform = 'flarum';
  private config: SystemAdapterConfig;
  private routes: Map<string, SystemRoute>;

  constructor(config: SystemAdapterConfig) {
    this.config = config;
    this.routes = new Map();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    const baseRoutes: SystemRoute[] = [
      { id: 'fl-home', path: '/', label: 'Home' },
      { id: 'fl-all', path: '/all', label: 'All Discussions' },
      { id: 'fl-following', path: '/following', label: 'Following' },
      { id: 'fl-tags', path: '/tags', label: 'Tags' },
      { id: 'fl-groups', path: '/groups', label: 'Groups' },
      { id: 'fl-admin', path: '/admin', label: 'Administration' },
      { id: 'fl-profile', path: '/u/', label: 'Profile' }
    ];

    baseRoutes.forEach(route => this.routes.set(route.id, route));
  }

  async getRoute(path: string): Promise<SystemRoute | null> {
    for (const route of this.routes.values()) {
      if (path === route.path || path.startsWith(route.path + '/') || path.startsWith(route.path + '?')) {
        return route;
      }
    }
    return null;
  }

  async resolveRoute(path: string): Promise<UnifiedRoute> {
    const route = await this.getRoute(path);
    return {
      platform: this.platform,
      path,
      label: route?.label ?? 'Unknown',
      url: `${this.config.baseUrl}${path}`,
      metadata: {
        system: 'flarum',
        apiEndpoint: this.config.apiEndpoint
      }
    };
  }

  async getHealth(): Promise<SystemHealthStatus> {
    return {
      platform: this.platform,
      status: 'healthy',
      responseTime: Math.random() * 60,
      lastChecked: new Date()
    };
  }

  getRoutes(): SystemRoute[] {
    return Array.from(this.routes.values());
  }
}

/**
 * Symfony/Oro system adapter for enterprise applications
 */
export class SymfonyAdapter implements SystemAdapter {
  readonly platform: TenantPlatform = 'symfony';
  private config: SystemAdapterConfig;
  private routes: Map<string, SystemRoute>;

  constructor(config: SystemAdapterConfig) {
    this.config = config;
    this.routes = new Map();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    const baseRoutes: SystemRoute[] = [
      { id: 'sy-dashboard', path: '/dashboard', label: 'Dashboard' },
      { id: 'sy-opportunities', path: '/sales/opportunities', label: 'Opportunities' },
      { id: 'sy-quotes', path: '/sales/quotes', label: 'Quotes' },
      { id: 'sy-orders', path: '/sales/orders', label: 'Orders' },
      { id: 'sy-accounts', path: '/customers/accounts', label: 'Accounts' },
      { id: 'sy-contacts', path: '/customers/contacts', label: 'Contacts' },
      { id: 'sy-campaigns', path: '/marketing/campaigns', label: 'Campaigns' },
      { id: 'sy-settings', path: '/settings/system', label: 'Settings' }
    ];

    baseRoutes.forEach(route => this.routes.set(route.id, route));
  }

  async getRoute(path: string): Promise<SystemRoute | null> {
    for (const route of this.routes.values()) {
      if (path === route.path || path.startsWith(route.path + '/')) {
        return route;
      }
    }
    return null;
  }

  async resolveRoute(path: string): Promise<UnifiedRoute> {
    const route = await this.getRoute(path);
    return {
      platform: this.platform,
      path,
      label: route?.label ?? 'Unknown',
      url: `${this.config.baseUrl}${path}`,
      metadata: {
        system: 'symfony',
        apiEndpoint: this.config.apiEndpoint
      }
    };
  }

  async getHealth(): Promise<SystemHealthStatus> {
    return {
      platform: this.platform,
      status: 'healthy',
      responseTime: Math.random() * 120,
      lastChecked: new Date()
    };
  }

  getRoutes(): SystemRoute[] {
    return Array.from(this.routes.values());
  }
}

/**
 * Custom system adapter for any additional platform integrations
 */
export class CustomAdapter implements SystemAdapter {
  readonly platform: TenantPlatform = 'general';
  private config: SystemAdapterConfig;
  private routes: Map<string, SystemRoute>;

  constructor(config: SystemAdapterConfig) {
    this.config = config;
    this.routes = new Map();
    // Initialize with custom routes if provided
    if (config.customRoutes) {
      config.customRoutes.forEach(route => this.routes.set(route.id, route));
    }
  }

  async getRoute(path: string): Promise<SystemRoute | null> {
    for (const route of this.routes.values()) {
      if (path === route.path || path.startsWith(route.path + '/')) {
        return route;
      }
    }
    return null;
  }

  async resolveRoute(path: string): Promise<UnifiedRoute> {
    const route = await this.getRoute(path);
    return {
      platform: this.platform,
      path,
      label: route?.label ?? 'Unknown',
      url: `${this.config.baseUrl}${path}`,
      metadata: {
        system: 'custom',
        apiEndpoint: this.config.apiEndpoint
      }
    };
  }

  async getHealth(): Promise<SystemHealthStatus> {
    return {
      platform: this.platform,
      status: 'healthy',
      responseTime: Math.random() * 100,
      lastChecked: new Date()
    };
  }

  getRoutes(): SystemRoute[] {
    return Array.from(this.routes.values());
  }

  addRoute(route: SystemRoute): void {
    this.routes.set(route.id, route);
  }

  removeRoute(routeId: string): boolean {
    return this.routes.delete(routeId);
  }
}

/**
 * Unified routing layer for cross-platform navigation
 */
export class UnifiedRoutingLayer {
  private adapters: Map<TenantPlatform, SystemAdapter>;
  private config: UnifiedRoutingConfig;

  constructor(config?: Partial<UnifiedRoutingConfig>) {
    this.config = { ...DEFAULT_UNIFIED_ROUTING_CONFIG, ...config };
    this.adapters = new Map();
  }

  /**
   * Register a system adapter
   * @param adapter - System adapter to register
   */
  registerAdapter(adapter: SystemAdapter): void {
    this.adapters.set(adapter.platform, adapter);
  }

  /**
   * Get adapter for a platform
   * @param platform - Platform identifier
   * @returns System adapter or null if not found
   */
  getAdapter(platform: TenantPlatform): SystemAdapter | null {
    return this.adapters.get(platform) ?? null;
  }

  /**
   * Resolve a route across all platforms
   * @param platform - Target platform
   * @param path - Route path
   * @returns Unified route
   */
  async resolveRoute(platform: TenantPlatform, path: string): Promise<UnifiedRoute> {
    const adapter = this.adapters.get(platform);
    if (!adapter) {
      throw new Error(`No adapter registered for platform: ${platform}`);
    }
    return adapter.resolveRoute(path);
  }

  /**
   * Resolve route by hostname (auto-detect platform)
   * @param hostname - Request hostname
   * @param path - Route path
   * @returns Unified route
   */
  async resolveRouteByHostname(hostname: string, path: string): Promise<UnifiedRoute> {
    // Detect platform from hostname
    const platform = this.detectPlatformFromHostname(hostname);
    return this.resolveRoute(platform, path);
  }

  /**
   * Get health status for all systems
   * @returns Array of health statuses
   */
  async getSystemHealth(): Promise<SystemHealthStatus[]> {
    const healthPromises = Array.from(this.adapters.values()).map(adapter =>
      adapter.getHealth()
    );
    return Promise.all(healthPromises);
  }

  /**
   * Get all routes for a platform
   * @param platform - Platform identifier
   * @returns Array of system routes
   */
  getRoutesForPlatform(platform: TenantPlatform): SystemRoute[] {
    const adapter = this.adapters.get(platform);
    return adapter?.getRoutes() ?? [];
  }

  /**
   * Get all routes across all platforms
   * @returns Map of platform to routes
   */
  getAllRoutes(): Map<TenantPlatform, SystemRoute[]> {
    const result = new Map<TenantPlatform, SystemRoute[]>();
    for (const [platform, adapter] of this.adapters.entries()) {
      result.set(platform, adapter.getRoutes());
    }
    return result;
  }

  /**
   * Detect platform from hostname
   * @param hostname - Request hostname
   * @returns Detected platform
   */
  private detectPlatformFromHostname(hostname: string): TenantPlatform {
    // Simple detection logic - can be enhanced with configuration
    if (hostname.includes('billing') || hostname.includes('hostbill')) {
      return 'hostbill';
    }
    if (hostname.includes('blog') || hostname.includes('wp')) {
      return 'wordpress';
    }
    if (hostname.includes('forum') || hostname.includes('flarum')) {
      return 'flarum';
    }
    if (hostname.includes('crm') || hostname.includes('oro')) {
      return 'symfony';
    }
    return 'general';
  }
}

/**
 * Factory function to create a UnifiedRoutingLayer
 * @param config - Optional configuration overrides
 * @returns Configured UnifiedRoutingLayer instance
 */
export function createUnifiedRouting(config?: Partial<UnifiedRoutingConfig>): UnifiedRoutingLayer {
  return new UnifiedRoutingLayer(config);
}
