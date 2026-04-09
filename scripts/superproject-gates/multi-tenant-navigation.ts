/**
 * Multi-Tenant Navigation Architecture
 *
 * A vertically integrated navigation system designed to efficiently handle:
 * - Hundreds of domains (interface.tag.ooo, interface.o-gov.com, interface.decisioncall.com)
 * - Thousands of subdomains with tenant isolation
 * - Scalable page/dashboard/portal routing across multiple systems
 *
 * Key Features:
 * - Hierarchical menu structures with lazy loading
 * - Domain-aware navigation context switching
 * - Cached navigation trees with invalidation strategies
 * - Role-based access control (RBAC) integration
 * - Performance optimization for large-scale multi-tenant environments
 * - WSJF-based priority routing
 *
 * Integration Points:
 * - HostBill (billing platform navigation)
 * - WordPress (blog/CMS navigation)
 * - Flarum (forum navigation)
 * - Symfony/Oro (CRM navigation)
 * - StarlingX (infrastructure dashboards)
 */

import { WSJFCalculator, WSJFInput } from '../devops/hivelocity-device-manager';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Domain configuration for multi-tenant navigation
 */
export interface DomainConfig {
  /** Primary domain (e.g., 'interface.tag.ooo') */
  domain: string;
  /** Display name */
  name: string;
  /** Domain type for theming and routing */
  type: 'primary' | 'affiliate' | 'enterprise' | 'government' | 'education';
  /** Platform integrations enabled on this domain */
  platforms: PlatformType[];
  /** Default landing page after authentication */
  defaultLandingPath: string;
  /** Custom branding configuration */
  branding?: BrandingConfig;
  /** Subdomain pattern regex */
  subdomainPattern?: string;
  /** Maximum tenants allowed */
  maxTenants?: number;
  /** WSJF priority for resource allocation */
  wsjf?: WSJFInput;
}

export type PlatformType =
  | 'hostbill'
  | 'wordpress'
  | 'flarum'
  | 'symfony'
  | 'orocrm'
  | 'trading'
  | 'starlingx'
  | 'grafana'
  | 'prometheus'
  | 'custom';

export interface BrandingConfig {
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string;
  faviconUrl: string;
  customCss?: string;
}

/**
 * Tenant within a domain
 */
export interface Tenant {
  id: string;
  subdomain: string;
  name: string;
  domain: string;
  status: 'active' | 'suspended' | 'pending' | 'trial';
  createdAt: Date;
  expiresAt?: Date;
  features: TenantFeature[];
  navigationOverrides?: Partial<NavigationNode>[];
  /** Resource quotas */
  quotas: {
    maxUsers: number;
    maxStorageGB: number;
    maxDomains: number;
    maxApiRequestsPerDay: number;
  };
}

export interface TenantFeature {
  id: string;
  name: string;
  enabled: boolean;
  tier: 'free' | 'starter' | 'professional' | 'enterprise';
}

/**
 * Navigation node structure with lazy loading support
 */
export interface NavigationNode {
  id: string;
  label: string;
  icon?: string;
  path?: string;
  externalUrl?: string;
  platform?: PlatformType;
  /** Required roles to view this node */
  requiredRoles?: string[];
  /** Required permissions to view this node */
  requiredPermissions?: string[];
  /** Children - can be lazy loaded */
  children?: NavigationNode[] | LazyLoadConfig;
  /** Visibility conditions */
  conditions?: NavigationCondition[];
  /** Navigation badge (e.g., notification count) */
  badge?: NavigationBadge;
  /** Sort order */
  order?: number;
  /** Is this item collapsed by default */
  collapsed?: boolean;
  /** Custom metadata */
  metadata?: Record<string, unknown>;
}

export interface LazyLoadConfig {
  type: 'lazy';
  endpoint: string;
  cacheKey?: string;
  cacheTTL?: number;
  /** Pagination for large menus */
  pageSize?: number;
}

export interface NavigationCondition {
  type: 'feature_flag' | 'permission' | 'role' | 'date_range' | 'custom';
  value: string | string[];
  operator?: 'eq' | 'neq' | 'in' | 'not_in' | 'gt' | 'lt';
}

export interface NavigationBadge {
  type: 'count' | 'dot' | 'status';
  value?: number | string;
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  /** Dynamic badge fetching */
  dynamicEndpoint?: string;
}

/**
 * User context for navigation resolution
 */
export interface UserContext {
  userId: string;
  email: string;
  roles: string[];
  permissions: string[];
  tenantId: string;
  domain: string;
  subdomain?: string;
  preferences: {
    collapsedMenus: string[];
    favoriteItems: string[];
    recentItems: string[];
    theme: 'light' | 'dark' | 'system';
    language: string;
  };
}

/**
 * Cache entry for navigation trees
 */
export interface NavigationCacheEntry {
  key: string;
  tree: NavigationNode[];
  userContextHash: string;
  createdAt: number;
  expiresAt: number;
  hitCount: number;
  lastAccessedAt: number;
}

// ============================================================================
// Navigation Cache Manager
// ============================================================================

/**
 * LRU Cache for navigation trees with TTL support
 */
export class NavigationCacheManager {
  private cache = new Map<string, NavigationCacheEntry>();
  private maxSize: number;
  private defaultTTL: number;

  constructor(options: { maxSize?: number; defaultTTL?: number } = {}) {
    this.maxSize = options.maxSize || 10000;
    this.defaultTTL = options.defaultTTL || 300000; // 5 minutes
  }

  /**
   * Generate cache key from user context
   */
  generateCacheKey(context: UserContext): string {
    const roleHash = context.roles.sort().join(',');
    const permHash = context.permissions.slice(0, 10).join(',');
    return `nav:${context.domain}:${context.subdomain || '_root'}:${context.tenantId}:${roleHash}:${permHash}`;
  }

  /**
   * Get navigation tree from cache
   */
  get(key: string): NavigationNode[] | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Update hit count and access time
    entry.hitCount++;
    entry.lastAccessedAt = now;
    return entry.tree;
  }

  /**
   * Set navigation tree in cache
   */
  set(key: string, tree: NavigationNode[], contextHash: string, ttl?: number): void {
    // LRU eviction if at capacity
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    const now = Date.now();
    this.cache.set(key, {
      key,
      tree,
      userContextHash: contextHash,
      createdAt: now,
      expiresAt: now + (ttl || this.defaultTTL),
      hitCount: 0,
      lastAccessedAt: now,
    });
  }

  /**
   * Invalidate cache entries matching pattern
   */
  invalidate(pattern: string | RegExp): number {
    let invalidated = 0;
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        invalidated++;
      }
    }
    return invalidated;
  }

  /**
   * Invalidate all entries for a domain
   */
  invalidateDomain(domain: string): number {
    return this.invalidate(`^nav:${domain.replace(/\./g, '\\.')}:`);
  }

  /**
   * Invalidate all entries for a tenant
   */
  invalidateTenant(tenantId: string): number {
    return this.invalidate(`:${tenantId}:`);
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessedAt < oldestTime) {
        oldestTime = entry.lastAccessedAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; hitRate: number; avgAge: number } {
    const now = Date.now();
    let totalHits = 0;
    let totalAge = 0;

    for (const entry of this.cache.values()) {
      totalHits += entry.hitCount;
      totalAge += now - entry.createdAt;
    }

    return {
      size: this.cache.size,
      hitRate: this.cache.size > 0 ? totalHits / this.cache.size : 0,
      avgAge: this.cache.size > 0 ? totalAge / this.cache.size : 0,
    };
  }
}


// ============================================================================
// Domain Registry
// ============================================================================

/**
 * Registry for managing domain configurations
 */
export class DomainRegistry {
  private domains = new Map<string, DomainConfig>();
  private tenants = new Map<string, Tenant>();

  /**
   * Register a domain configuration
   */
  registerDomain(config: DomainConfig): void {
    this.domains.set(config.domain, config);
  }

  /**
   * Get domain configuration
   */
  getDomain(domain: string): DomainConfig | undefined {
    return this.domains.get(domain);
  }

  /**
   * Get all domains
   */
  getAllDomains(): DomainConfig[] {
    return Array.from(this.domains.values());
  }

  /**
   * Get domains by type
   */
  getDomainsByType(type: DomainConfig['type']): DomainConfig[] {
    return this.getAllDomains().filter((d) => d.type === type);
  }

  /**
   * Get domains by platform
   */
  getDomainsByPlatform(platform: PlatformType): DomainConfig[] {
    return this.getAllDomains().filter((d) => d.platforms.includes(platform));
  }

  /**
   * Register a tenant
   */
  registerTenant(tenant: Tenant): void {
    this.tenants.set(tenant.id, tenant);
  }

  /**
   * Get tenant by ID
   */
  getTenant(tenantId: string): Tenant | undefined {
    return this.tenants.get(tenantId);
  }

  /**
   * Get tenants for a domain
   */
  getTenantsByDomain(domain: string): Tenant[] {
    return Array.from(this.tenants.values()).filter((t) => t.domain === domain);
  }

  /**
   * Get tenant by subdomain
   */
  getTenantBySubdomain(domain: string, subdomain: string): Tenant | undefined {
    return Array.from(this.tenants.values()).find(
      (t) => t.domain === domain && t.subdomain === subdomain
    );
  }

  /**
   * Get domain statistics
   */
  getStats(): { domainCount: number; tenantCount: number; activeTenants: number } {
    const activeTenants = Array.from(this.tenants.values()).filter(
      (t) => t.status === 'active'
    ).length;

    return {
      domainCount: this.domains.size,
      tenantCount: this.tenants.size,
      activeTenants,
    };
  }
}

// ============================================================================
// RBAC Navigation Filter
// ============================================================================

/**
 * Role-Based Access Control filter for navigation nodes
 */
export class RBACNavigationFilter {
  /**
   * Filter navigation tree based on user context
   */
  filterTree(nodes: NavigationNode[], context: UserContext): NavigationNode[] {
    return nodes
      .filter((node) => this.isNodeVisible(node, context))
      .map((node) => this.filterNode(node, context));
  }

  /**
   * Check if a node is visible to the user
   */
  private isNodeVisible(node: NavigationNode, context: UserContext): boolean {
    // Check required roles
    if (node.requiredRoles && node.requiredRoles.length > 0) {
      const hasRole = node.requiredRoles.some((role) => context.roles.includes(role));
      if (!hasRole) return false;
    }

    // Check required permissions
    if (node.requiredPermissions && node.requiredPermissions.length > 0) {
      const hasPermission = node.requiredPermissions.some((perm) =>
        context.permissions.includes(perm)
      );
      if (!hasPermission) return false;
    }

    // Check conditions
    if (node.conditions && node.conditions.length > 0) {
      const conditionsMet = node.conditions.every((cond) =>
        this.evaluateCondition(cond, context)
      );
      if (!conditionsMet) return false;
    }

    return true;
  }

  /**
   * Filter a single node and its children
   */
  private filterNode(node: NavigationNode, context: UserContext): NavigationNode {
    const filtered = { ...node };

    if (Array.isArray(node.children)) {
      filtered.children = this.filterTree(node.children, context);
    }

    return filtered;
  }

  /**
   * Evaluate a navigation condition
   */
  private evaluateCondition(
    condition: NavigationCondition,
    context: UserContext
  ): boolean {
    switch (condition.type) {
      case 'role':
        return this.evaluateArrayCondition(condition, context.roles);
      case 'permission':
        return this.evaluateArrayCondition(condition, context.permissions);
      case 'feature_flag':
        // Feature flags would be checked against tenant features
        return true;
      case 'date_range':
        return this.evaluateDateCondition(condition);
      default:
        return true;
    }
  }

  private evaluateArrayCondition(
    condition: NavigationCondition,
    userValues: string[]
  ): boolean {
    const conditionValues = Array.isArray(condition.value)
      ? condition.value
      : [condition.value];

    switch (condition.operator) {
      case 'eq':
        return conditionValues.every((v) => userValues.includes(v));
      case 'neq':
        return !conditionValues.some((v) => userValues.includes(v));
      case 'in':
        return conditionValues.some((v) => userValues.includes(v));
      case 'not_in':
        return !conditionValues.some((v) => userValues.includes(v));
      default:
        return conditionValues.some((v) => userValues.includes(v));
    }
  }

  private evaluateDateCondition(condition: NavigationCondition): boolean {
    const now = new Date();
    const value = condition.value as string;
    const [start, end] = value.split(',').map((d) => new Date(d.trim()));

    if (start && now < start) return false;
    if (end && now > end) return false;
    return true;
  }
}

// ============================================================================
// Multi-Tenant Navigation Manager
// ============================================================================

/**
 * Main navigation manager for multi-tenant environments
 */
export class MultiTenantNavigationManager {
  private cache: NavigationCacheManager;
  private registry: DomainRegistry;
  private rbacFilter: RBACNavigationFilter;
  private baseNavigationTrees = new Map<string, NavigationNode[]>();

  constructor(options: { cacheMaxSize?: number; cacheTTL?: number } = {}) {
    this.cache = new NavigationCacheManager({
      maxSize: options.cacheMaxSize,
      defaultTTL: options.cacheTTL,
    });
    this.registry = new DomainRegistry();
    this.rbacFilter = new RBACNavigationFilter();
  }

  /**
   * Register a domain with its configuration
   */
  registerDomain(config: DomainConfig): void {
    this.registry.registerDomain(config);
  }

  /**
   * Register a tenant
   */
  registerTenant(tenant: Tenant): void {
    this.registry.registerTenant(tenant);
  }

  /**
   * Set base navigation tree for a platform
   */
  setBaseNavigation(platform: PlatformType, tree: NavigationNode[]): void {
    this.baseNavigationTrees.set(platform, tree);
  }

  /**
   * Get navigation tree for a user context
   */
  getNavigation(context: UserContext): NavigationNode[] {
    // Check cache first
    const cacheKey = this.cache.generateCacheKey(context);
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    // Build navigation tree
    const tree = this.buildNavigationTree(context);

    // Cache the result
    this.cache.set(cacheKey, tree, cacheKey);

    return tree;
  }

  /**
   * Build navigation tree for a user context
   */
  private buildNavigationTree(context: UserContext): NavigationNode[] {
    const domain = this.registry.getDomain(context.domain);
    if (!domain) return [];

    // Collect navigation from all enabled platforms
    const allNodes: NavigationNode[] = [];

    for (const platform of domain.platforms) {
      const baseTree = this.baseNavigationTrees.get(platform);
      if (baseTree) {
        allNodes.push(...baseTree);
      }
    }

    // Apply tenant overrides
    const tenant = this.registry.getTenant(context.tenantId);
    if (tenant?.navigationOverrides) {
      this.applyOverrides(allNodes, tenant.navigationOverrides);
    }

    // Filter by RBAC
    const filtered = this.rbacFilter.filterTree(allNodes, context);

    // Sort by order
    return this.sortNodes(filtered);
  }

  /**
   * Apply tenant navigation overrides
   */
  private applyOverrides(
    nodes: NavigationNode[],
    overrides: Partial<NavigationNode>[]
  ): void {
    for (const override of overrides) {
      if (!override.id) continue;

      const node = this.findNode(nodes, override.id);
      if (node) {
        Object.assign(node, override);
      }
    }
  }

  /**
   * Find a node by ID in the tree
   */
  private findNode(nodes: NavigationNode[], id: string): NavigationNode | null {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (Array.isArray(node.children)) {
        const found = this.findNode(node.children, id);
        if (found) return found;
      }
    }
    return null;
  }

  /**
   * Sort nodes by order property
   */
  private sortNodes(nodes: NavigationNode[]): NavigationNode[] {
    return nodes
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map((node) => ({
        ...node,
        children: Array.isArray(node.children)
          ? this.sortNodes(node.children)
          : node.children,
      }));
  }

  /**
   * Invalidate cache for a domain
   */
  invalidateDomainCache(domain: string): number {
    return this.cache.invalidateDomain(domain);
  }

  /**
   * Invalidate cache for a tenant
   */
  invalidateTenantCache(tenantId: string): number {
    return this.cache.invalidateTenant(tenantId);
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number; avgAge: number } {
    return this.cache.getStats();
  }

  /**
   * Get registry statistics
   */
  getRegistryStats(): { domainCount: number; tenantCount: number; activeTenants: number } {
    return this.registry.getStats();
  }
}



// ============================================================================
// Default Platform Navigation Trees
// ============================================================================

/**
 * Default navigation configurations for each platform
 */
export const DEFAULT_PLATFORM_NAVIGATIONS: Record<PlatformType, NavigationNode[]> = {
  hostbill: [
    {
      id: 'hb-dashboard',
      label: 'Dashboard',
      icon: 'dashboard',
      path: '/billing/dashboard',
      order: 1,
    },
    {
      id: 'hb-clients',
      label: 'Clients',
      icon: 'users',
      path: '/billing/clients',
      order: 2,
      requiredRoles: ['admin', 'support'],
      children: [
        { id: 'hb-clients-list', label: 'All Clients', path: '/billing/clients/list' },
        { id: 'hb-clients-add', label: 'Add Client', path: '/billing/clients/add' },
      ],
    },
    {
      id: 'hb-orders',
      label: 'Orders',
      icon: 'shopping-cart',
      path: '/billing/orders',
      order: 3,
    },
    {
      id: 'hb-invoices',
      label: 'Invoices',
      icon: 'file-text',
      path: '/billing/invoices',
      order: 4,
    },
    {
      id: 'hb-support',
      label: 'Support',
      icon: 'headphones',
      path: '/billing/support',
      order: 5,
      badge: { type: 'count', dynamicEndpoint: '/api/support/unread-count' },
    },
  ],

  wordpress: [
    {
      id: 'wp-dashboard',
      label: 'Dashboard',
      icon: 'dashboard',
      path: '/blog/dashboard',
      order: 1,
    },
    {
      id: 'wp-posts',
      label: 'Posts',
      icon: 'edit',
      path: '/blog/posts',
      order: 2,
      children: [
        { id: 'wp-posts-all', label: 'All Posts', path: '/blog/posts' },
        { id: 'wp-posts-add', label: 'Add New', path: '/blog/posts/new' },
        { id: 'wp-categories', label: 'Categories', path: '/blog/categories' },
        { id: 'wp-tags', label: 'Tags', path: '/blog/tags' },
      ],
    },
    {
      id: 'wp-media',
      label: 'Media',
      icon: 'image',
      path: '/blog/media',
      order: 3,
    },
    {
      id: 'wp-pages',
      label: 'Pages',
      icon: 'file',
      path: '/blog/pages',
      order: 4,
    },
    {
      id: 'wp-comments',
      label: 'Comments',
      icon: 'message-circle',
      path: '/blog/comments',
      order: 5,
      badge: { type: 'count', dynamicEndpoint: '/api/blog/pending-comments' },
    },
  ],

  flarum: [
    {
      id: 'fl-home',
      label: 'Forum Home',
      icon: 'home',
      path: '/forum',
      order: 1,
    },
    {
      id: 'fl-discussions',
      label: 'Discussions',
      icon: 'message-square',
      path: '/forum/discussions',
      order: 2,
    },
    {
      id: 'fl-tags',
      label: 'Tags',
      icon: 'tag',
      path: '/forum/tags',
      order: 3,
    },
    {
      id: 'fl-members',
      label: 'Members',
      icon: 'users',
      path: '/forum/members',
      order: 4,
    },
    {
      id: 'fl-admin',
      label: 'Administration',
      icon: 'settings',
      path: '/forum/admin',
      order: 10,
      requiredRoles: ['admin', 'moderator'],
      children: [
        { id: 'fl-admin-dashboard', label: 'Dashboard', path: '/forum/admin' },
        { id: 'fl-admin-users', label: 'Users', path: '/forum/admin/users' },
        { id: 'fl-admin-extensions', label: 'Extensions', path: '/forum/admin/extensions' },
      ],
    },
  ],

  symfony: [
    {
      id: 'sf-dashboard',
      label: 'Dashboard',
      icon: 'dashboard',
      path: '/app/dashboard',
      order: 1,
    },
    {
      id: 'sf-entities',
      label: 'Entities',
      icon: 'database',
      path: '/app/entities',
      order: 2,
    },
  ],

  orocrm: [
    {
      id: 'oro-dashboard',
      label: 'Dashboard',
      icon: 'dashboard',
      path: '/crm/dashboard',
      order: 1,
    },
    {
      id: 'oro-accounts',
      label: 'Accounts',
      icon: 'briefcase',
      path: '/crm/accounts',
      order: 2,
    },
    {
      id: 'oro-contacts',
      label: 'Contacts',
      icon: 'users',
      path: '/crm/contacts',
      order: 3,
    },
    {
      id: 'oro-leads',
      label: 'Leads',
      icon: 'target',
      path: '/crm/leads',
      order: 4,
    },
    {
      id: 'oro-opportunities',
      label: 'Opportunities',
      icon: 'trending-up',
      path: '/crm/opportunities',
      order: 5,
    },
  ],

  trading: [
    {
      id: 'tr-dashboard',
      label: 'Trading Dashboard',
      icon: 'activity',
      path: '/trading/dashboard',
      order: 1,
    },
    {
      id: 'tr-portfolio',
      label: 'Portfolio',
      icon: 'pie-chart',
      path: '/trading/portfolio',
      order: 2,
    },
    {
      id: 'tr-orders',
      label: 'Orders',
      icon: 'list',
      path: '/trading/orders',
      order: 3,
    },
    {
      id: 'tr-analytics',
      label: 'Analytics',
      icon: 'bar-chart-2',
      path: '/trading/analytics',
      order: 4,
    },
  ],

  starlingx: [
    {
      id: 'stx-dashboard',
      label: 'Infrastructure',
      icon: 'server',
      path: '/infra/dashboard',
      order: 1,
    },
    {
      id: 'stx-hosts',
      label: 'Hosts',
      icon: 'hard-drive',
      path: '/infra/hosts',
      order: 2,
    },
    {
      id: 'stx-containers',
      label: 'Containers',
      icon: 'box',
      path: '/infra/containers',
      order: 3,
    },
    {
      id: 'stx-networking',
      label: 'Networking',
      icon: 'globe',
      path: '/infra/networking',
      order: 4,
    },
  ],

  grafana: [
    {
      id: 'gf-dashboards',
      label: 'Dashboards',
      icon: 'layout',
      path: '/monitoring/dashboards',
      order: 1,
    },
    {
      id: 'gf-explore',
      label: 'Explore',
      icon: 'compass',
      path: '/monitoring/explore',
      order: 2,
    },
    {
      id: 'gf-alerting',
      label: 'Alerting',
      icon: 'bell',
      path: '/monitoring/alerting',
      order: 3,
    },
  ],

  prometheus: [
    {
      id: 'pm-graph',
      label: 'Graph',
      icon: 'trending-up',
      path: '/metrics/graph',
      order: 1,
    },
    {
      id: 'pm-alerts',
      label: 'Alerts',
      icon: 'alert-triangle',
      path: '/metrics/alerts',
      order: 2,
    },
    {
      id: 'pm-targets',
      label: 'Targets',
      icon: 'target',
      path: '/metrics/targets',
      order: 3,
    },
  ],

  custom: [],
};

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a pre-configured navigation manager with default platform navigations
 */
export function createNavigationManager(
  options: { cacheMaxSize?: number; cacheTTL?: number } = {}
): MultiTenantNavigationManager {
  const manager = new MultiTenantNavigationManager(options);

  // Register default platform navigations
  for (const [platform, tree] of Object.entries(DEFAULT_PLATFORM_NAVIGATIONS)) {
    manager.setBaseNavigation(platform as PlatformType, tree);
  }

  return manager;
}

/**
 * Create default domain configurations for the TAG ecosystem
 */
export function createDefaultDomainConfigs(): DomainConfig[] {
  return [
    {
      domain: 'interface.tag.ooo',
      name: 'TAG Interface',
      type: 'primary',
      platforms: ['hostbill', 'wordpress', 'flarum', 'orocrm', 'trading', 'grafana'],
      defaultLandingPath: '/dashboard',
      maxTenants: 10000,
    },
    {
      domain: 'interface.o-gov.com',
      name: 'O-Gov Interface',
      type: 'government',
      platforms: ['hostbill', 'wordpress', 'symfony'],
      defaultLandingPath: '/gov/dashboard',
      maxTenants: 1000,
    },
    {
      domain: 'interface.decisioncall.com',
      name: 'DecisionCall Interface',
      type: 'enterprise',
      platforms: ['hostbill', 'orocrm', 'trading'],
      defaultLandingPath: '/enterprise/dashboard',
      maxTenants: 5000,
    },
  ];
}
