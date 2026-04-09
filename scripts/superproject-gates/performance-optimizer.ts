/**
 * Performance Optimizer - Multi-Tenant Navigation
 *
 * Implements multi-level caching and optimization for large-scale
 * multi-tenant navigation environments.
 *
 * Performance targets:
 * - Navigation Resolution: <100ms
 * - Cache Hit Rate: >95% after warmup
 * - Memory footprint: Optimized for 100+ domains
 *
 * Principles:
 * - Manthra: Directed thought-power applied to performance logic
 * - Yasna: Disciplined alignment through consistent optimization interfaces
 * - Mithra: Binding force preventing performance drift
 *
 * @module multi-tenant-navigation/performance-optimizer
 */

import {
  NavigationNode,
  CacheLevel,
  CacheEntry,
  PerformanceMetrics,
  PerformanceOptimizerConfig,
  PreloadConfig,
  CDNConfig,
  DEFAULT_PERFORMANCE_OPTIMIZER_CONFIG
} from './types.js';

/**
 * PerformanceOptimizer provides multi-level caching and optimization
 */
export class PerformanceOptimizer {
  private config: PerformanceOptimizerConfig;
  private clientCache: Map<string, CacheEntry>;
  private edgeCache: Map<string, CacheEntry>;
  private serverCache: Map<string, CacheEntry>;
  private metrics: PerformanceMetrics;
  private preloadQueue: Map<string, PreloadConfig>;
  private cdnConfig: CDNConfig;

  constructor(config?: Partial<PerformanceOptimizerConfig>) {
    this.config = { ...DEFAULT_PERFORMANCE_OPTIMIZER_CONFIG, ...config };
    this.clientCache = new Map();
    this.edgeCache = new Map();
    this.serverCache = new Map();
    this.preloadQueue = new Map();
    this.cdnConfig = {
      enabled: this.config.cdnEnabled,
      baseUrl: this.config.cdnBaseUrl,
      staticAssetPaths: this.config.cdnStaticPaths
    };
    this.metrics = this.initializeMetrics();
  }

  /**
   * Get navigation nodes with multi-level caching
   * @param cacheKey - Cache key for the navigation
   * @returns Navigation nodes and cache level
   */
  async getNavigation(cacheKey: string): Promise<{
    nodes: NavigationNode[];
    level: CacheLevel;
  }> {
    const startTime = performance.now();

    // Try client cache first
    if (this.config.clientCacheEnabled) {
      const clientEntry = this.clientCache.get(cacheKey);
      if (clientEntry && !this.isExpired(clientEntry)) {
        this.recordMetrics('client', performance.now() - startTime, true);
        return { nodes: clientEntry.value, level: 'client' };
      }
    }

    // Try edge cache
    if (this.config.edgeCacheEnabled) {
      const edgeEntry = this.edgeCache.get(cacheKey);
      if (edgeEntry && !this.isExpired(edgeEntry)) {
        this.recordMetrics('edge', performance.now() - startTime, true);
        // Promote to client cache
        if (this.config.clientCacheEnabled) {
          this.setClientCache(cacheKey, edgeEntry.value);
        }
        return { nodes: edgeEntry.value, level: 'edge' };
      }
    }

    // Try server cache
    if (this.config.serverCacheEnabled) {
      const serverEntry = this.serverCache.get(cacheKey);
      if (serverEntry && !this.isExpired(serverEntry)) {
        this.recordMetrics('server', performance.now() - startTime, true);
        // Promote to edge and client cache
        if (this.config.edgeCacheEnabled) {
          this.setEdgeCache(cacheKey, serverEntry.value);
        }
        if (this.config.clientCacheEnabled) {
          this.setClientCache(cacheKey, serverEntry.value);
        }
        return { nodes: serverEntry.value, level: 'server' };
      }
    }

    // Cache miss
    this.recordMetrics('server', performance.now() - startTime, false);
    return { nodes: [], level: 'server' };
  }

  /**
   * Set navigation nodes in cache
   * @param cacheKey - Cache key
   * @param nodes - Navigation nodes to cache
   * @param level - Cache level to set (default: all)
   */
  setNavigation(
    cacheKey: string,
    nodes: NavigationNode[],
    level?: CacheLevel
  ): void {
    const targetLevel = level ?? 'all';

    if (targetLevel === 'all' || targetLevel === 'server') {
      this.setServerCache(cacheKey, nodes);
    }
    if (targetLevel === 'all' || targetLevel === 'edge') {
      this.setEdgeCache(cacheKey, nodes);
    }
    if (targetLevel === 'all' || targetLevel === 'client') {
      this.setClientCache(cacheKey, nodes);
    }
  }

  /**
   * Invalidate cache entries
   * @param cacheKey - Cache key to invalidate
   * @param level - Cache level to invalidate (default: all)
   */
  invalidateCache(cacheKey: string, level?: CacheLevel): void {
    const targetLevel = level ?? 'all';

    if (targetLevel === 'all' || targetLevel === 'client') {
      this.clientCache.delete(cacheKey);
    }
    if (targetLevel === 'all' || targetLevel === 'edge') {
      this.edgeCache.delete(cacheKey);
    }
    if (targetLevel === 'all' || targetLevel === 'server') {
      this.serverCache.delete(cacheKey);
    }
  }

  /**
   * Invalidate all cache entries matching a pattern
   * @param pattern - Pattern to match (supports * wildcard)
   * @param level - Cache level to invalidate (default: all)
   */
  invalidateCachePattern(pattern: string, level?: CacheLevel): void {
    const regex = this.patternToRegex(pattern);
    const targetLevel = level ?? 'all';

    const invalidateInCache = (cache: Map<string, CacheEntry>): void => {
      for (const key of cache.keys()) {
        if (regex.test(key)) {
          cache.delete(key);
        }
      }
    };

    if (targetLevel === 'all' || targetLevel === 'client') {
      invalidateInCache(this.clientCache);
    }
    if (targetLevel === 'all' || targetLevel === 'edge') {
      invalidateInCache(this.edgeCache);
    }
    if (targetLevel === 'all' || targetLevel === 'server') {
      invalidateInCache(this.serverCache);
    }
  }

  /**
   * Clear all cache levels
   */
  clearAllCache(): void {
    this.clientCache.clear();
    this.edgeCache.clear();
    this.serverCache.clear();
    this.metrics = this.initializeMetrics();
  }

  /**
   * Preload navigation data for frequently accessed items
   * @param config - Preload configuration
   */
  preload(config: PreloadConfig): void {
    const preloadKey = `${config.cacheKey}:preload`;
    this.preloadQueue.set(preloadKey, config);

    // Set in all cache levels
    this.setNavigation(config.cacheKey, config.nodes, 'all');

    // Record preload metrics
    this.metrics.preloadedItems++;
  }

  /**
   * Get preloaded items
   * @returns Map of preloaded configurations
   */
  getPreloadedItems(): Map<string, PreloadConfig> {
    return new Map(this.preloadQueue);
  }

  /**
   * Clear preload queue
   */
  clearPreloadQueue(): void {
    this.preloadQueue.clear();
  }

  /**
   * Get CDN URL for a static asset
   * @param path - Asset path
   * @returns CDN URL or null if CDN is disabled
   */
  getCDNUrl(path: string): string | null {
    if (!this.cdnConfig.enabled || !this.cdnConfig.baseUrl) {
      return null;
    }

    // Check if path matches static asset patterns
    const isStaticAsset = this.cdnConfig.staticAssetPaths.some(pattern => {
      const regex = new RegExp(pattern);
      return regex.test(path);
    });

    if (isStaticAsset) {
      return `${this.cdnConfig.baseUrl}${path}`;
    }

    return null;
  }

  /**
   * Update CDN configuration
   * @param updates - Partial CDN configuration updates
   */
  updateCDNConfig(updates: Partial<CDNConfig>): void {
    this.cdnConfig = { ...this.cdnConfig, ...updates };
  }

  /**
   * Get performance metrics
   * @returns Current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    const totalRequests = this.metrics.clientHits + this.metrics.clientMisses +
      this.metrics.edgeHits + this.metrics.edgeMisses +
      this.metrics.serverHits + this.metrics.serverMisses;

    const totalHits = this.metrics.clientHits + this.metrics.edgeHits + this.metrics.serverHits;
    const totalMisses = this.metrics.clientMisses + this.metrics.edgeMisses + this.metrics.serverMisses;

    const cacheHitRate = totalRequests > 0 ? totalHits / totalRequests : 0;

    return {
      ...this.metrics,
      totalRequests,
      totalHits,
      totalMisses,
      cacheHitRate,
      avgResponseTime: totalRequests > 0
        ? this.metrics.totalResponseTime / totalRequests
        : 0
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = this.initializeMetrics();
  }

  /**
   * Get cache statistics for a specific level
   * @param level - Cache level
   * @returns Cache statistics
   */
  getCacheStats(level: CacheLevel): {
    size: number;
    hits: number;
    misses: number;
    hitRate: number;
  } {
    let cache: Map<string, CacheEntry>;
    let hits: number;
    let misses: number;

    switch (level) {
      case 'client':
        cache = this.clientCache;
        hits = this.metrics.clientHits;
        misses = this.metrics.clientMisses;
        break;
      case 'edge':
        cache = this.edgeCache;
        hits = this.metrics.edgeHits;
        misses = this.metrics.edgeMisses;
        break;
      case 'server':
        cache = this.serverCache;
        hits = this.metrics.serverHits;
        misses = this.metrics.serverMisses;
        break;
    }

    const total = hits + misses;
    return {
      size: cache.size,
      hits,
      misses,
      hitRate: total > 0 ? hits / total : 0
    };
  }

  /**
   * Get configuration
   * @returns Current configuration
   */
  getConfig(): PerformanceOptimizerConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   * @param updates - Partial configuration updates
   */
  updateConfig(updates: Partial<PerformanceOptimizerConfig>): void {
    this.config = { ...this.config, ...updates };
    this.cdnConfig.enabled = this.config.cdnEnabled;
    this.cdnConfig.baseUrl = this.config.cdnBaseUrl;
    this.cdnConfig.staticAssetPaths = this.config.cdnStaticPaths;
  }

  /**
   * Set client cache entry
   */
  private setClientCache(cacheKey: string, nodes: NavigationNode[]): void {
    const entry: CacheEntry = {
      key: cacheKey,
      value: nodes,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.config.clientCacheTTL),
      size: this.estimateSize(nodes)
    };
    this.clientCache.set(cacheKey, entry);
  }

  /**
   * Set edge cache entry
   */
  private setEdgeCache(cacheKey: string, nodes: NavigationNode[]): void {
    const entry: CacheEntry = {
      key: cacheKey,
      value: nodes,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.config.edgeCacheTTL),
      size: this.estimateSize(nodes)
    };
    this.edgeCache.set(cacheKey, entry);
  }

  /**
   * Set server cache entry
   */
  private setServerCache(cacheKey: string, nodes: NavigationNode[]): void {
    const entry: CacheEntry = {
      key: cacheKey,
      value: nodes,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.config.serverCacheTTL),
      size: this.estimateSize(nodes)
    };
    this.serverCache.set(cacheKey, entry);
  }

  /**
   * Check if cache entry is expired
   */
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() > entry.expiresAt.getTime();
  }

  /**
   * Estimate size of navigation nodes in bytes
   */
  private estimateSize(nodes: NavigationNode[]): number {
    const jsonStr = JSON.stringify(nodes);
    return jsonStr.length * 2; // UTF-16 encoding
  }

  /**
   * Record performance metrics
   */
  private recordMetrics(level: CacheLevel, responseTime: number, hit: boolean): void {
    this.metrics.totalResponseTime += responseTime;

    switch (level) {
      case 'client':
        if (hit) {
          this.metrics.clientHits++;
        } else {
          this.metrics.clientMisses++;
        }
        break;
      case 'edge':
        if (hit) {
          this.metrics.edgeHits++;
        } else {
          this.metrics.edgeMisses++;
        }
        break;
      case 'server':
        if (hit) {
          this.metrics.serverHits++;
        } else {
          this.metrics.serverMisses++;
        }
        break;
    }

    // Track response time for P99 calculation
    this.metrics.responseTimes.push(responseTime);
    if (this.metrics.responseTimes.length > 1000) {
      this.metrics.responseTimes.shift();
    }
  }

  /**
   * Initialize metrics
   */
  private initializeMetrics(): PerformanceMetrics {
    return {
      clientHits: 0,
      clientMisses: 0,
      edgeHits: 0,
      edgeMisses: 0,
      serverHits: 0,
      serverMisses: 0,
      totalResponseTime: 0,
      responseTimes: [],
      preloadedItems: 0
    };
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
 * Factory function to create a PerformanceOptimizer
 * @param config - Optional configuration overrides
 * @returns Configured PerformanceOptimizer instance
 */
export function createPerformanceOptimizer(config?: Partial<PerformanceOptimizerConfig>): PerformanceOptimizer {
  return new PerformanceOptimizer(config);
}
