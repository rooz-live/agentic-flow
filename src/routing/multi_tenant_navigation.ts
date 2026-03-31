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
  user: { id: string; roles: string[] };
  activeSystem: string;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export class MultiTenantNavigationSystem {
  private navigationCache: Map<string, CacheEntry<NavigationNode[]>> = new Map();
  private domainRegistry: Map<string, Domain> = new Map();

  constructor(domains: Domain[] = []) {
    domains.forEach(d => this.registerDomain(d));
  }

  registerDomain(domain: Domain): void {
    this.domainRegistry.set(domain.host, domain);
  }

  resolveDomain(host: string): Domain | undefined {
    // Direct match
    if (this.domainRegistry.has(host)) {
      return this.domainRegistry.get(host);
    }

    // Subdomain resolution
    for (const [registeredHost, domain] of this.domainRegistry) {
      if (host.endsWith(`.${registeredHost}`)) {
        return domain;
      }
    }

    return undefined;
  }

  resolveSubdomain(host: string, domain: Domain): Subdomain | undefined {
    const prefix = host.replace(`.${domain.host}`, '');
    return domain.subdomains.find(s => s.prefix === prefix);
  }

  async getNavigation(context: NavigationContext): Promise<NavigationNode[]> {
    const cacheKey = this.buildCacheKey(context);

    // Check cache
    const cached = this.navigationCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }

    // Build navigation tree
    const navigation = await this.buildNavigationTree(context);

    // Cache result
    this.navigationCache.set(cacheKey, {
      data: navigation,
      timestamp: Date.now(),
      ttl: CACHE_TTL_MS,
    });

    return navigation;
  }

  private buildCacheKey(context: NavigationContext): string {
    return `${context.domain.id}:${context.subdomain?.id || 'root'}:${context.user.roles.sort().join(',')}`;
  }

  private async buildNavigationTree(context: NavigationContext): Promise<NavigationNode[]> {
    const baseNavigation = this.getSystemNavigation(context.domain.system);
    return this.filterByPermissions(baseNavigation, context.user.roles);
  }

  private getSystemNavigation(system: string): NavigationNode[] {
    const systems: Record<string, NavigationNode[]> = {
      hostbill: [
        { id: 'dashboard', label: 'Dashboard', path: '/', permissions: ['view'] },
        { id: 'clients', label: 'Clients', path: '/clients', permissions: ['clients.view'], children: [
          { id: 'clients-list', label: 'All Clients', path: '/clients/list', permissions: ['clients.view'] },
          { id: 'clients-add', label: 'Add Client', path: '/clients/add', permissions: ['clients.create'] },
        ]},
        { id: 'billing', label: 'Billing', path: '/billing', permissions: ['billing.view'], lazyLoad: true },
        { id: 'support', label: 'Support', path: '/support', permissions: ['support.view'] },
      ],
      wordpress: [
        { id: 'dashboard', label: 'Dashboard', path: '/wp-admin', permissions: ['view'] },
        { id: 'posts', label: 'Posts', path: '/wp-admin/edit.php', permissions: ['edit_posts'] },
        { id: 'pages', label: 'Pages', path: '/wp-admin/edit.php?post_type=page', permissions: ['edit_pages'] },
        { id: 'media', label: 'Media', path: '/wp-admin/upload.php', permissions: ['upload_files'] },
        { id: 'settings', label: 'Settings', path: '/wp-admin/options-general.php', permissions: ['manage_options'], lazyLoad: true },
      ],
      flarum: [
        { id: 'dashboard', label: 'Dashboard', path: '/admin', permissions: ['administrate'] },
        { id: 'discussions', label: 'Discussions', path: '/', permissions: ['view'] },
        { id: 'users', label: 'Users', path: '/admin#/users', permissions: ['administrate'] },
        { id: 'extensions', label: 'Extensions', path: '/admin#/extensions', permissions: ['administrate'], lazyLoad: true },
      ],
      symfony: [
        { id: 'dashboard', label: 'Dashboard', path: '/', permissions: ['view'] },
        { id: 'entities', label: 'Entities', path: '/admin/entities', permissions: ['ROLE_ADMIN'] },
        { id: 'logs', label: 'Logs', path: '/admin/logs', permissions: ['ROLE_SUPER_ADMIN'], lazyLoad: true },
      ],
      oro: [
        { id: 'dashboard', label: 'Dashboard', path: '/', permissions: ['view'] },
        { id: 'customers', label: 'Customers', path: '/customer', permissions: ['oro_customer_view'] },
        { id: 'sales', label: 'Sales', path: '/sales', permissions: ['oro_sales_view'] },
        { id: 'marketing', label: 'Marketing', path: '/marketing', permissions: ['oro_marketing_view'], lazyLoad: true },
      ],
      custom: [
        { id: 'dashboard', label: 'Dashboard', path: '/', permissions: ['view'] },
      ],
    };

    return systems[system] || systems.custom;
  }

  private filterByPermissions(nodes: NavigationNode[], userRoles: string[]): NavigationNode[] {
    return nodes
      .filter(node => this.hasPermission(node.permissions, userRoles))
      .map(node => ({
        ...node,
        children: node.children ? this.filterByPermissions(node.children, userRoles) : undefined,
      }));
  }

  private hasPermission(required: string[], userRoles: string[]): boolean {
    // Admin and super-admin bypass
    if (userRoles.includes('admin') || userRoles.includes('ROLE_SUPER_ADMIN')) {
      return true;
    }

    // Check if user has any required permission
    return required.some(req =>
      userRoles.includes(req) || userRoles.includes(`ROLE_${req.toUpperCase()}`)
    );
  }

  invalidateCache(domainId?: string): void {
    if (domainId) {
      for (const key of this.navigationCache.keys()) {
        if (key.startsWith(`${domainId}:`)) {
          this.navigationCache.delete(key);
        }
      }
    } else {
      this.navigationCache.clear();
    }
  }

  getDomainCount(): number {
    return this.domainRegistry.size;
  }

  listDomains(): Domain[] {
    return Array.from(this.domainRegistry.values());
  }
}

export function createNavigationContext(
  host: string,
  user: { id: string; roles: string[] },
  navigationSystem: MultiTenantNavigationSystem
): NavigationContext | null {
  const domain = navigationSystem.resolveDomain(host);
  if (!domain) return null;

  const subdomain = navigationSystem.resolveSubdomain(host, domain);

  return {
    domain,
    subdomain,
    user,
    activeSystem: domain.system,
  };
}
