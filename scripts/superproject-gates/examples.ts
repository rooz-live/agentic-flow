/**
 * Multi-Tenant Navigation Examples
 *
 * Demonstrates usage of multi-tenant navigation system
 */

import {
  createNavigationManager,
  createRouter,
  getPlatformNavigation,
  TenantContext,
  NavigationTree,
} from './index';

// ============================================================================
// Example 1: Basic Platform Navigation
// ============================================================================

/**
 * Example: Get navigation for WordPress platform
 */
async function example1_WordPressNavigation() {
  const context: TenantContext = {
    platform: 'wordpress',
    domain: 'blog.example.com',
    userId: 'user-123',
    role: 'admin',
    permissions: ['read', 'write', 'publish'],
    metadata: {
      siteName: 'My Blog',
      locale: 'en-US',
    },
  };

  const navigation = await getPlatformNavigation('wordpress', 'blog.example.com', context);
  console.log('WordPress Navigation:', navigation);
  // Output: Navigation tree with all nodes accessible to admin
}

/**
 * Example: Get navigation for Flarum forum
 */
async function example2_FlarumNavigation() {
  const context: TenantContext = {
    platform: 'flarum',
    domain: 'forum.example.com',
    userId: 'user-456',
    role: 'user',
    permissions: ['read', 'write'],
    metadata: {
      forumName: 'Community Forum',
      locale: 'en-US',
    },
  };

  const navigation = await getPlatformNavigation('flarum', 'forum.example.com', context);
  console.log('Flarum Navigation:', navigation);
  // Output: Navigation tree with user-accessible nodes
}

// ============================================================================
// Example 2: Context Switching
// ============================================================================

/**
 * Example: Switch between platforms with context preservation
 */
async function example3_ContextSwitching() {
  const manager = createNavigationManager({
    strategy: 'hybrid',
    ttl: 300, // 5 minutes
    maxSize: 50,
    persistence: true,
  });

  // Switch to HostBill platform
  const hostbillContext: TenantContext = {
    platform: 'hostbill',
    domain: 'billing.example.com',
    userId: 'admin-789',
    role: 'admin',
    permissions: ['all'],
    metadata: {},
  };

  manager.setContext(hostbillContext);
  const hostbillNav = await manager.getNavigation('hostbill', 'billing.example.com');
  console.log('HostBill Navigation:', hostbillNav);

  // Switch to WordPress platform
  const wordpressContext: TenantContext = {
    platform: 'wordpress',
    domain: 'blog.example.com',
    userId: 'editor-123',
    role: 'manager',
    permissions: ['read', 'write', 'publish', 'edit'],
    metadata: {},
  };

  manager.setContext(wordpressContext);
  const wordpressNav = await manager.getNavigation('wordpress', 'blog.example.com');
  console.log('WordPress Navigation:', wordpressNav);
  // Cache is automatically invalidated on context switch
}

// ============================================================================
// Example 3: Lazy Loading
// ============================================================================

/**
 * Example: Lazy load navigation subtrees
 */
async function example4_LazyLoading() {
  const router = createRouter(
    createNavigationManager(),
    'wordpress',
    'blog.example.com'
  );

  // Navigate to posts section
  const postsNode = await router.navigate('/wp-admin/edit.php');
  console.log('Posts Node:', postsNode);

  // Lazy load specific subtree
  const mediaNode = await router.loadSubtree('wp-media', 'wordpress');
  console.log('Media Subtree:', mediaNode);
}

// ============================================================================
// Example 4: Breadcrumbs
// ============================================================================

/**
 * Example: Generate breadcrumb trail
 */
async function example5_Breadcrumbs() {
  const router = createRouter(
    createNavigationManager(),
    'flarum',
    'forum.example.com'
  );

  const breadcrumbs = await router.getBreadcrumbs('/groups/my-group/discussion-123');
  console.log('Breadcrumbs:', breadcrumbs);
  // Output: [
  //   { id: 'fl-home', label: 'Home', path: '/' },
  //   { id: 'fl-groups', label: 'Groups', path: '/groups' },
  //   { id: 'fl-my-groups', label: 'My Groups', path: '/groups/my' },
  //   { id: 'discussion-123', label: 'Discussion', path: '/groups/my-group/discussion-123' }
  // ]
}

// ============================================================================
// Example 5: Cache Management
// ============================================================================

/**
 * Example: Cache invalidation strategies
 */
async function example6_CacheManagement() {
  const manager = createNavigationManager({
    strategy: 'event-based',
    ttl: 600, // 10 minutes
    maxSize: 100,
    persistence: false,
  });

  // Load navigation (cached)
  const nav1 = await manager.getNavigation('wordpress', 'blog.example.com');
  console.log('First Load (cached):', nav1);

  // Invalidate cache by event
  manager.invalidateByEvent('navigation-updated', { nodeId: 'wp-posts' });

  // Load navigation (reloaded)
  const nav2 = await manager.getNavigation('wordpress', 'blog.example.com');
  console.log('Second Load (reloaded):', nav2);

  // Get cache statistics
  const stats = manager.getCacheStats();
  console.log('Cache Stats:', stats);
  // Output: { size: 1, keys: ['wordpress:blog.example.com'] }
}

// ============================================================================
// Example 6: Role-Based Filtering
// ============================================================================

/**
 * Example: Filter navigation by user role
 */
async function example7_RoleBasedFiltering() {
  const adminContext: TenantContext = {
    platform: 'hostbill',
    domain: 'billing.example.com',
    userId: 'admin-789',
    role: 'admin',
    permissions: ['all'],
    metadata: {},
  };

  const userContext: TenantContext = {
    platform: 'hostbill',
    domain: 'billing.example.com',
    userId: 'user-456',
    role: 'user',
    permissions: ['read'],
    metadata: {},
  };

  const manager = createNavigationManager();

  // Admin sees all navigation
  manager.setContext(adminContext);
  const adminNav = await manager.getNavigation('hostbill', 'billing.example.com');
  console.log('Admin Navigation:', adminNav.tree.length, 'nodes');

  // User sees limited navigation
  manager.setContext(userContext);
  const userNav = await manager.getNavigation('hostbill', 'billing.example.com');
  console.log('User Navigation:', userNav.tree.length, 'nodes');
}

// ============================================================================
// Example 7: Cross-Platform Routing
// ============================================================================

/**
 * Example: Route across multiple platforms
 */
async function example8_CrossPlatformRouting() {
  const manager = createNavigationManager();

  // Create routers for each platform
  const hostbillRouter = createRouter(manager, 'hostbill', 'billing.example.com');
  const wordpressRouter = createRouter(manager, 'wordpress', 'blog.example.com');
  const flarumRouter = createRouter(manager, 'flarum', 'forum.example.com');

  // Navigate on each platform
  const billingNode = await hostbillRouter.navigate('/billing/invoices');
  const blogNode = await wordpressRouter.navigate('/wp-admin/edit.php');
  const forumNode = await flarumRouter.navigate('/groups/my-group');

  console.log('Cross-Platform Navigation:', {
    billing: billingNode,
    blog: blogNode,
    forum: forumNode,
  });
}

// ============================================================================
// Example 8: Multi-Domain Support
// ============================================================================

/**
 * Example: Support multiple domains per platform
 */
async function example9_MultiDomainSupport() {
  const manager = createNavigationManager();

  // Same platform, different domains
  const blog1Nav = await manager.getNavigation('wordpress', 'blog.example.com');
  const blog2Nav = await manager.getNavigation('wordpress', 'blog2.example.com');
  const blog3Nav = await manager.getNavigation('wordpress', 'blog3.example.com');

  console.log('Multi-Domain Navigation:', {
    'blog.example.com': blog1Nav.tree.length,
    'blog2.example.com': blog2Nav.tree.length,
    'blog3.example.com': blog3Nav.tree.length,
  });
}

// ============================================================================
// Example 9: Custom Navigation
// ============================================================================

/**
 * Example: Extend with custom navigation
 */
async function example10_CustomNavigation() {
  const manager = createNavigationManager();

  const context: TenantContext = {
    platform: 'general',
    domain: 'custom.example.com',
    userId: 'user-999',
    role: 'admin',
    permissions: ['all'],
    metadata: {
      customApp: true,
    },
  };

  manager.setContext(context);

  // Custom navigation can be loaded dynamically
  const customNav: NavigationTree = {
    platform: 'general',
    domain: 'custom.example.com',
    tree: [
      {
        id: 'custom-dashboard',
        type: 'link',
        label: 'Dashboard',
        icon: 'layout-dashboard',
        path: '/dashboard',
        roles: ['admin', 'user'],
      },
      {
        id: 'custom-analytics',
        type: 'group',
        label: 'Analytics',
        icon: 'bar-chart',
        children: [
          {
            id: 'custom-reports',
            type: 'link',
            label: 'Reports',
            path: '/analytics/reports',
          },
          {
            id: 'custom-metrics',
            type: 'link',
            label: 'Metrics',
            path: '/analytics/metrics',
          },
        ],
      },
    ],
    version: '1.0.0',
    lastModified: new Date(),
    cacheTTL: 300,
  };

  console.log('Custom Navigation:', customNav);
}

// ============================================================================
// Export Examples
// ============================================================================

export {
  example1_WordPressNavigation,
  example2_FlarumNavigation,
  example3_ContextSwitching,
  example4_LazyLoading,
  example5_Breadcrumbs,
  example6_CacheManagement,
  example7_RoleBasedFiltering,
  example8_CrossPlatformRouting,
  example9_MultiDomainSupport,
  example10_CustomNavigation,
};
