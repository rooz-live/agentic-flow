/**
 * Menu Builder - Multi-Tenant Navigation
 *
 * Builds hierarchical menu structures with lazy loading support.
 * Supports up to 5 levels deep navigation with cached navigation trees.
 *
 * Principles:
 * - Manthra: Directed thought-power applied to menu hierarchy logic
 * - Yasna: Disciplined alignment through consistent menu interfaces
 * - Mithra: Binding force preventing menu structure drift
 *
 * @module multi-tenant-navigation/menu-builder
 */

import {
  NavigationNode,
  MenuTree,
  MenuBuilderConfig,
  MenuCacheEntry,
  MenuPriority,
  DEFAULT_MENU_BUILDER_CONFIG
} from './types.js';

/**
 * MenuBuilder creates hierarchical menu structures with lazy loading
 */
export class MenuBuilder {
  private config: MenuBuilderConfig;
  private cache: Map<string, MenuCacheEntry>;
  private accessCounts: Map<string, number>;
  private lazyLoaders: Map<string, () => Promise<NavigationNode[]>>;

  constructor(config?: Partial<MenuBuilderConfig>) {
    this.config = { ...DEFAULT_MENU_BUILDER_CONFIG, ...config };
    this.cache = new Map();
    this.accessCounts = new Map();
    this.lazyLoaders = new Map();
  }

  /**
   * Build a menu tree from navigation nodes
   * @param nodes - Navigation nodes to build tree from
   * @param options - Build options
   * @returns Built menu tree
   */
  buildMenu(nodes: NavigationNode[], options?: { maxDepth?: number }): MenuTree {
    const maxDepth = options?.maxDepth ?? this.config.maxDepth;
    const tree = this.buildTreeRecursive(nodes, 0, maxDepth);
    const cacheKey = this.generateCacheKey(nodes, options);

    return {
      nodes: tree,
      maxDepth,
      nodeCount: this.countNodes(tree),
      lastBuilt: new Date(),
      cacheKey
    };
  }

  /**
   * Build menu tree with role filtering
   * @param nodes - Navigation nodes
   * @param roles - User roles to filter by
   * @param options - Build options
   * @returns Filtered menu tree
   */
  buildMenuWithRoles(
    nodes: NavigationNode[],
    roles: string[],
    options?: { maxDepth?: number }
  ): MenuTree {
    const filteredNodes = this.filterByRoles(nodes, roles);
    return this.buildMenu(filteredNodes, options);
  }

  /**
   * Build menu tree with permission filtering
   * @param nodes - Navigation nodes
   * @param permissions - User permissions to filter by
   * @param options - Build options
   * @returns Filtered menu tree
   */
  buildMenuWithPermissions(
    nodes: NavigationNode[],
    permissions: string[],
    options?: { maxDepth?: number }
  ): MenuTree {
    const filteredNodes = this.filterByPermissions(nodes, permissions);
    return this.buildMenu(filteredNodes, options);
  }

  /**
   * Register a lazy loader for a menu node
   * @param nodeId - Node identifier
   * @param loader - Async function to load children
   */
  registerLazyLoader(nodeId: string, loader: () => Promise<NavigationNode[]>): void {
    this.lazyLoaders.set(nodeId, loader);
  }

  /**
   * Load children for a lazy-loaded node
   * @param nodeId - Node identifier
   * @returns Children nodes
   */
  async loadLazyChildren(nodeId: string): Promise<NavigationNode[]> {
    const loader = this.lazyLoaders.get(nodeId);
    if (!loader) {
      throw new Error(`No lazy loader registered for node: ${nodeId}`);
    }

    const children = await loader();

    // Cache the loaded children
    const cacheKey = `lazy:${nodeId}`;
    this.cache.set(cacheKey, {
      key: cacheKey,
      nodes: children,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.config.lazyLoadCacheTTL),
      accessCount: 0
    });

    return children;
  }

  /**
   * Get menu tree from cache
   * @param cacheKey - Cache key
   * @returns Cached menu tree or null
   */
  getCachedMenu(cacheKey: string): MenuTree | null {
    const entry = this.cache.get(cacheKey);
    if (!entry) {
      return null;
    }

    // Check expiration
    if (Date.now() > entry.expiresAt.getTime()) {
      this.cache.delete(cacheKey);
      return null;
    }

    // Update access count
    entry.accessCount++;
    this.cache.set(cacheKey, entry);

    return {
      nodes: entry.nodes,
      maxDepth: this.config.maxDepth,
      nodeCount: this.countNodes(entry.nodes),
      lastBuilt: entry.createdAt,
      cacheKey
    };
  }

  /**
   * Cache a menu tree
   * @param tree - Menu tree to cache
   * @param ttl - Time-to-live in milliseconds (uses default if not specified)
   */
  cacheMenu(tree: MenuTree, ttl?: number): void {
    const actualTTL = ttl ?? this.config.cacheTTL;
    const entry: MenuCacheEntry = {
      key: tree.cacheKey,
      nodes: tree.nodes,
      createdAt: tree.lastBuilt,
      expiresAt: new Date(Date.now() + actualTTL),
      accessCount: 0
    };
    this.cache.set(tree.cacheKey, entry);
  }

  /**
   * Invalidate cache for a specific key
   * @param cacheKey - Cache key to invalidate
   */
  invalidateCache(cacheKey: string): void {
    this.cache.delete(cacheKey);
  }

  /**
   * Invalidate all cache entries matching a pattern
   * @param pattern - Pattern to match (supports * wildcard)
   */
  invalidateCachePattern(pattern: string): void {
    const regex = this.patternToRegex(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   * @returns Cache statistics
   */
  getCacheStats(): {
    size: number;
    keys: string[];
    totalAccessCount: number;
  } {
    let totalAccessCount = 0;
    for (const entry of this.cache.values()) {
      totalAccessCount += entry.accessCount;
    }

    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      totalAccessCount
    };
  }

  /**
   * Prioritize menu items based on usage
   * @param nodes - Navigation nodes to prioritize
   * @returns Prioritized nodes
   */
  prioritizeNodes(nodes: NavigationNode[]): NavigationNode[] {
    return [...nodes].sort((a, b) => {
      const priorityA = this.getNodePriority(a);
      const priorityB = this.getNodePriority(b);
      return priorityB - priorityA; // Higher priority first
    });
  }

  /**
   * Get menu items based on search query
   * @param nodes - Navigation nodes to search
   * @param query - Search query
   * @returns Matching nodes
   */
  searchMenu(nodes: NavigationNode[], query: string): NavigationNode[] {
    const lowerQuery = query.toLowerCase();
    const results: NavigationNode[] = [];

    const searchRecursive = (node: NavigationNode, depth: number = 0): void => {
      // Check if node matches query
      if (
        node.label.toLowerCase().includes(lowerQuery) ||
        node.id.toLowerCase().includes(lowerQuery)
      ) {
        results.push(node);
      }

      // Search children
      if (node.children && depth < this.config.maxDepth) {
        for (const child of node.children) {
          searchRecursive(child, depth + 1);
        }
      }
    };

    for (const node of nodes) {
      searchRecursive(node);
    }

    return results;
  }

  /**
   * Get breadcrumbs for a path
   * @param nodes - Navigation nodes
   * @param path - Target path
   * @returns Breadcrumb nodes
   */
  getBreadcrumbs(nodes: NavigationNode[], path: string): NavigationNode[] {
    const breadcrumbs: NavigationNode[] = [];
    this.findPathRecursive(nodes, path, [], breadcrumbs);
    return breadcrumbs;
  }

  /**
   * Flatten menu tree to a single level
   * @param nodes - Navigation nodes
   * @returns Flattened nodes
   */
  flattenMenu(nodes: NavigationNode[]): NavigationNode[] {
    const flattened: NavigationNode[] = [];

    const flattenRecursive = (node: NavigationNode): void => {
      flattened.push(node);
      if (node.children) {
        for (const child of node.children) {
          flattenRecursive(child);
        }
      }
    };

    for (const node of nodes) {
      flattenRecursive(node);
    }

    return flattened;
  }

  /**
   * Get menu tree depth
   * @param nodes - Navigation nodes
   * @returns Maximum depth
   */
  getTreeDepth(nodes: NavigationNode[]): number {
    let maxDepth = 0;

    const calculateDepth = (node: NavigationNode, currentDepth: number): void => {
      if (currentDepth > maxDepth) {
        maxDepth = currentDepth;
      }
      if (node.children) {
        for (const child of node.children) {
          calculateDepth(child, currentDepth + 1);
        }
      }
    };

    for (const node of nodes) {
      calculateDepth(node, 1);
    }

    return maxDepth;
  }

  /**
   * Build tree recursively with depth limit
   */
  private buildTreeRecursive(
    nodes: NavigationNode[],
    currentDepth: number,
    maxDepth: number
  ): NavigationNode[] {
    if (currentDepth >= maxDepth) {
      return [];
    }

    return nodes.map(node => ({
      ...node,
      children: node.children
        ? this.buildTreeRecursive(node.children, currentDepth + 1, maxDepth)
        : undefined
    }));
  }

  /**
   * Filter nodes by roles
   */
  private filterByRoles(nodes: NavigationNode[], roles: string[]): NavigationNode[] {
    const roleSet = new Set(roles);

    return nodes
      .filter(node => {
        if (!node.roles || node.roles.length === 0) {
          return true;
        }
        return node.roles.some(role => roleSet.has(role));
      })
      .map(node => ({
        ...node,
        children: node.children
          ? this.filterByRoles(node.children, roles)
          : undefined
      }));
  }

  /**
   * Filter nodes by permissions
   */
  private filterByPermissions(
    nodes: NavigationNode[],
    permissions: string[]
  ): NavigationNode[] {
    const permSet = new Set(permissions);

    return nodes
      .filter(node => {
        if (!node.permissions || node.permissions.length === 0) {
          return true;
        }
        return node.permissions.some(perm => permSet.has(perm));
      })
      .map(node => ({
        ...node,
        children: node.children
          ? this.filterByPermissions(node.children, permissions)
          : undefined
      }));
  }

  /**
   * Generate cache key from nodes and options
   */
  private generateCacheKey(
    nodes: NavigationNode[],
    options?: { maxDepth?: number }
  ): string {
    const nodeIds = nodes.map(n => n.id).sort().join(',');
    const depth = options?.maxDepth ?? this.config.maxDepth;
    return `menu:${nodeIds}:${depth}`;
  }

  /**
   * Count nodes in tree
   */
  private countNodes(nodes: NavigationNode[]): number {
    let count = 0;

    const countRecursive = (node: NavigationNode): void => {
      count++;
      if (node.children) {
        for (const child of node.children) {
          countRecursive(child);
        }
      }
    };

    for (const node of nodes) {
      countRecursive(node);
    }

    return count;
  }

  /**
   * Get node priority based on access count and metadata
   */
  private getNodePriority(node: NavigationNode): number {
    const accessCount = this.accessCounts.get(node.id) ?? 0;
    const metadataPriority = node.metadata?.priority ?? MenuPriority.MEDIUM;

    // Combine access count and metadata priority
    return accessCount + metadataPriority;
  }

  /**
   * Find path recursively for breadcrumbs
   */
  private findPathRecursive(
    nodes: NavigationNode[],
    path: string,
    currentPath: NavigationNode[],
    result: NavigationNode[]
  ): boolean {
    for (const node of nodes) {
      const newPath = [...currentPath, node];

      if (node.path === path) {
        result.push(...newPath);
        return true;
      }

      if (node.children) {
        if (this.findPathRecursive(node.children, path, newPath, result)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Convert pattern with wildcards to regex
   */
  private patternToRegex(pattern: string): RegExp {
    const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const withWildcards = escaped.replace(/\\\*/g, '.*');
    return new RegExp(`^${withWildcards}$`);
  }
}

/**
 * Factory function to create a MenuBuilder
 * @param config - Optional configuration overrides
 * @returns Configured MenuBuilder instance
 */
export function createMenuBuilder(config?: Partial<MenuBuilderConfig>): MenuBuilder {
  return new MenuBuilder(config);
}
