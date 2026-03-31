/**
 * Tests for Multi-Tenant Navigation System
 */

import { DomainRouter } from '../../src/routing/domain_router';
import {
    Domain,
    MultiTenantNavigationSystem,
    NavigationContext
} from '../../src/routing/multi_tenant_navigation';

describe('MultiTenantNavigationSystem', () => {
  let navSystem: MultiTenantNavigationSystem;

  beforeEach(() => {
    const testDomains: Domain[] = [
      {
        id: 'test-domain',
        name: 'Test Domain',
        host: 'test.example.com',
        system: 'hostbill',
        subdomains: [
          { id: 'admin', name: 'Admin', prefix: 'admin', tenantId: 'admin', roles: ['admin'] },
          { id: 'client', name: 'Client', prefix: 'client', tenantId: 'client', roles: ['client'] },
        ],
      },
      {
        id: 'wp-domain',
        name: 'WordPress Domain',
        host: 'blog.example.com',
        system: 'wordpress',
        subdomains: [],
      },
    ];

    navSystem = new MultiTenantNavigationSystem(testDomains);
  });

  describe('Domain Resolution', () => {
    test('should resolve direct domain match', () => {
      const domain = navSystem.resolveDomain('test.example.com');
      expect(domain).toBeDefined();
      expect(domain?.id).toBe('test-domain');
    });

    test('should resolve subdomain', () => {
      const domain = navSystem.resolveDomain('admin.test.example.com');
      expect(domain).toBeDefined();
      expect(domain?.id).toBe('test-domain');
    });

    test('should return undefined for unknown domain', () => {
      const domain = navSystem.resolveDomain('unknown.com');
      expect(domain).toBeUndefined();
    });
  });

  describe('Navigation Building', () => {
    test('should build navigation for hostbill system', async () => {
      const context: NavigationContext = {
        domain: navSystem.resolveDomain('test.example.com')!,
        user: { id: 'user1', roles: ['admin'] },
        activeSystem: 'hostbill',
      };

      const nav = await navSystem.getNavigation(context);
      expect(nav.length).toBeGreaterThan(0);
      expect(nav.some(n => n.id === 'dashboard')).toBe(true);
    });

    test('should filter navigation by permissions', async () => {
      const adminContext: NavigationContext = {
        domain: navSystem.resolveDomain('test.example.com')!,
        user: { id: 'user1', roles: ['admin'] },
        activeSystem: 'hostbill',
      };

      const clientContext: NavigationContext = {
        domain: navSystem.resolveDomain('test.example.com')!,
        user: { id: 'user2', roles: ['view'] },
        activeSystem: 'hostbill',
      };

      const adminNav = await navSystem.getNavigation(adminContext);
      const clientNav = await navSystem.getNavigation(clientContext);

      expect(adminNav.length).toBeGreaterThanOrEqual(clientNav.length);
    });
  });

  describe('Caching', () => {
    test('should cache navigation results', async () => {
      const context: NavigationContext = {
        domain: navSystem.resolveDomain('test.example.com')!,
        user: { id: 'user1', roles: ['admin'] },
        activeSystem: 'hostbill',
      };

      const nav1 = await navSystem.getNavigation(context);
      const nav2 = await navSystem.getNavigation(context);

      expect(nav1).toEqual(nav2);
    });

    test('should invalidate cache by domain', async () => {
      const context: NavigationContext = {
        domain: navSystem.resolveDomain('test.example.com')!,
        user: { id: 'user1', roles: ['admin'] },
        activeSystem: 'hostbill',
      };

      await navSystem.getNavigation(context);
      navSystem.invalidateCache('test-domain');

      // Should rebuild navigation (no error thrown)
      const nav = await navSystem.getNavigation(context);
      expect(nav).toBeDefined();
    });
  });
});

describe('DomainRouter', () => {
  let router: DomainRouter;

  beforeEach(() => {
    router = new DomainRouter();
  });

  test('should route interface.tag.ooo correctly', () => {
    const result = router.route('interface.tag.ooo');
    expect(result).toBeDefined();
    expect(result?.system).toBe('hostbill');
  });

  test('should route subdomain correctly', () => {
    const result = router.route('admin.interface.tag.ooo');
    expect(result).toBeDefined();
    expect(result?.subdomain?.prefix).toBe('admin');
    expect(result?.tenantId).toBe('admin');
  });

  test('should return null for unknown domain in strict mode', () => {
    const result = router.route('unknown.example.com');
    expect(result).toBeNull();
  });

  test('should count domains correctly', () => {
    expect(router.getDomainCount()).toBeGreaterThan(0);
  });

  test('should count subdomains correctly', () => {
    expect(router.getSubdomainCount()).toBeGreaterThan(0);
  });
});
