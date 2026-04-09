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
import { WSJFInput } from '../devops/hivelocity-device-manager';
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
export type PlatformType = 'hostbill' | 'wordpress' | 'flarum' | 'symfony' | 'orocrm' | 'trading' | 'starlingx' | 'grafana' | 'prometheus' | 'custom';
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
/**
 * LRU Cache for navigation trees with TTL support
 */
export declare class NavigationCacheManager {
    private cache;
    private maxSize;
    private defaultTTL;
    constructor(options?: {
        maxSize?: number;
        defaultTTL?: number;
    });
    /**
     * Generate cache key from user context
     */
    generateCacheKey(context: UserContext): string;
    /**
     * Get navigation tree from cache
     */
    get(key: string): NavigationNode[] | null;
    /**
     * Set navigation tree in cache
     */
    set(key: string, tree: NavigationNode[], contextHash: string, ttl?: number): void;
    /**
     * Invalidate cache entries matching pattern
     */
    invalidate(pattern: string | RegExp): number;
    /**
     * Invalidate all entries for a domain
     */
    invalidateDomain(domain: string): number;
    /**
     * Invalidate all entries for a tenant
     */
    invalidateTenant(tenantId: string): number;
    /**
     * Evict least recently used entry
     */
    private evictLRU;
    /**
     * Get cache statistics
     */
    getStats(): {
        size: number;
        hitRate: number;
        avgAge: number;
    };
}
/**
 * Registry for managing domain configurations
 */
export declare class DomainRegistry {
    private domains;
    private tenants;
    /**
     * Register a domain configuration
     */
    registerDomain(config: DomainConfig): void;
    /**
     * Get domain configuration
     */
    getDomain(domain: string): DomainConfig | undefined;
    /**
     * Get all domains
     */
    getAllDomains(): DomainConfig[];
    /**
     * Get domains by type
     */
    getDomainsByType(type: DomainConfig['type']): DomainConfig[];
    /**
     * Get domains by platform
     */
    getDomainsByPlatform(platform: PlatformType): DomainConfig[];
    /**
     * Register a tenant
     */
    registerTenant(tenant: Tenant): void;
    /**
     * Get tenant by ID
     */
    getTenant(tenantId: string): Tenant | undefined;
    /**
     * Get tenants for a domain
     */
    getTenantsByDomain(domain: string): Tenant[];
    /**
     * Get tenant by subdomain
     */
    getTenantBySubdomain(domain: string, subdomain: string): Tenant | undefined;
    /**
     * Get domain statistics
     */
    getStats(): {
        domainCount: number;
        tenantCount: number;
        activeTenants: number;
    };
}
/**
 * Role-Based Access Control filter for navigation nodes
 */
export declare class RBACNavigationFilter {
    /**
     * Filter navigation tree based on user context
     */
    filterTree(nodes: NavigationNode[], context: UserContext): NavigationNode[];
    /**
     * Check if a node is visible to the user
     */
    private isNodeVisible;
    /**
     * Filter a single node and its children
     */
    private filterNode;
    /**
     * Evaluate a navigation condition
     */
    private evaluateCondition;
    private evaluateArrayCondition;
    private evaluateDateCondition;
}
/**
 * Main navigation manager for multi-tenant environments
 */
export declare class MultiTenantNavigationManager {
    private cache;
    private registry;
    private rbacFilter;
    private baseNavigationTrees;
    constructor(options?: {
        cacheMaxSize?: number;
        cacheTTL?: number;
    });
    /**
     * Register a domain with its configuration
     */
    registerDomain(config: DomainConfig): void;
    /**
     * Register a tenant
     */
    registerTenant(tenant: Tenant): void;
    /**
     * Set base navigation tree for a platform
     */
    setBaseNavigation(platform: PlatformType, tree: NavigationNode[]): void;
    /**
     * Get navigation tree for a user context
     */
    getNavigation(context: UserContext): NavigationNode[];
    /**
     * Build navigation tree for a user context
     */
    private buildNavigationTree;
    /**
     * Apply tenant navigation overrides
     */
    private applyOverrides;
    /**
     * Find a node by ID in the tree
     */
    private findNode;
    /**
     * Sort nodes by order property
     */
    private sortNodes;
    /**
     * Invalidate cache for a domain
     */
    invalidateDomainCache(domain: string): number;
    /**
     * Invalidate cache for a tenant
     */
    invalidateTenantCache(tenantId: string): number;
    /**
     * Get cache statistics
     */
    getCacheStats(): {
        size: number;
        hitRate: number;
        avgAge: number;
    };
    /**
     * Get registry statistics
     */
    getRegistryStats(): {
        domainCount: number;
        tenantCount: number;
        activeTenants: number;
    };
}
/**
 * Default navigation configurations for each platform
 */
export declare const DEFAULT_PLATFORM_NAVIGATIONS: Record<PlatformType, NavigationNode[]>;
/**
 * Create a pre-configured navigation manager with default platform navigations
 */
export declare function createNavigationManager(options?: {
    cacheMaxSize?: number;
    cacheTTL?: number;
}): MultiTenantNavigationManager;
/**
 * Create default domain configurations for the TAG ecosystem
 */
export declare function createDefaultDomainConfigs(): DomainConfig[];
//# sourceMappingURL=multi-tenant-navigation.d.ts.map