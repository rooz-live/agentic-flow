/**
 * Multi-Tenant Navigation System
 *
 * Implements hierarchical navigation with:
 * - Lazy loading for performance at scale (100s of domains, 1000s of subdomains)
 * - Domain-aware context switching
 * - Cached navigation trees with invalidation
 * - Role-based access control integration
 *
 * Philosophical Alignment (Manthra-Yasna-Mithra):
 * - Manthra: Directed attention through lazy loading and iteration budgets
 * - Yasna: Alignment via RBAC and domain context
 * - Mithra: Binding coherence through cache invalidation and validation
 */
export interface Domain {
    id: string;
    name: string;
    host: string;
    subdomains: Subdomain[];
    system: 'hostbill' | 'wordpress' | 'flarum' | 'symfony' | 'oro' | 'custom';
    metadata?: Record<string, unknown>;
}
export interface Subdomain {
    id: string;
    name: string;
    prefix: string;
    tenantId: string;
    roles: string[];
}
export interface NavigationNode {
    id: string;
    label: string;
    path: string;
    icon?: string;
    children?: NavigationNode[];
    permissions: string[];
    lazyLoad?: boolean;
    system?: string;
}
export interface NavigationContext {
    domain: Domain;
    subdomain?: Subdomain;
    user: {
        id: string;
        roles: string[];
    };
    activeSystem: string;
}
export interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number;
}
export declare class MultiTenantNavigationSystem {
    private navigationCache;
    private domainRegistry;
    constructor(domains?: Domain[]);
    registerDomain(domain: Domain): void;
    resolveDomain(host: string): Domain | undefined;
    resolveSubdomain(host: string, domain: Domain): Subdomain | undefined;
    getNavigation(context: NavigationContext): Promise<NavigationNode[]>;
    private buildCacheKey;
    private buildNavigationTree;
    private getSystemNavigation;
    private filterByPermissions;
    private hasPermission;
    invalidateCache(domainId?: string): void;
    getDomainCount(): number;
    listDomains(): Domain[];
}
export declare function createNavigationContext(host: string, user: {
    id: string;
    roles: string[];
}, navigationSystem: MultiTenantNavigationSystem): NavigationContext | null;
//# sourceMappingURL=multi_tenant_navigation.d.ts.map