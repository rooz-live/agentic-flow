/**
 * Edge Cache Manager for Multi-Tenant Navigation
 * 
 * Provides high-performance caching for navigation resolution with
 * support for LRU, LFU, and TTL-based eviction policies.
 * 
 * Performance targets from RUVECTOR_INTEGRATION_ARCHITECTURE.md:
 * - Cache Hit Rate Target: >95% after warmup
 * - Memory footprint: O(tenants * avg_tree_size)
 * - Edge locations: Support distributed caching
 * 
 * @module ruvector/edge-cache-manager
 */

import {
  EdgeCacheConfig,
  EdgeCacheEntry,
  EdgeCacheStats,
  NavigationNode,
  DEFAULT_EDGE_CACHE_CONFIG
} from './types.js';

/**
 * EdgeCacheManager provides caching for multi-tenant navigation resolution.
 * Implements LRU/LFU/TTL eviction policies for predictable memory usage.
 */
export class EdgeCacheManager {
  private cache: Map<string, EdgeCacheEntry>;
  private config: EdgeCacheConfig;
  private stats: {
    hits: number;
    misses: number;
    evictions: number;
    totalLatencyMs: number;
    operations: number;
  };
  private currentMemoryBytes: number;

  /**
   * Create a new EdgeCacheManager instance
   * @param config - Optional partial configuration (uses defaults for missing values)
   */
  constructor(config?: Partial<EdgeCacheConfig>) {
    this.config = { ...DEFAULT_EDGE_CACHE_CONFIG, ...config };
    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalLatencyMs: 0,
      operations: 0
    };
    this.currentMemoryBytes = 0;
  }

  /**
   * Get an entry from the cache
   * @param key - Cache key to retrieve
   * @returns The cache entry if found and not expired, null otherwise
   */
  get(key: string): EdgeCacheEntry | null {
    const startTime = performance.now();
    
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      this.recordLatency(startTime);
      return null;
    }

    // Check expiration
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.currentMemoryBytes -= entry.sizeBytes;
      this.stats.misses++;
      this.recordLatency(startTime);
      return null;
    }

    // Update access metadata for LRU/LFU
    entry.hits++;
    entry.lastAccessedAt = Date.now();
    
    this.stats.hits++;
    this.recordLatency(startTime);
    
    return entry;
  }

  /**
   * Store navigation nodes in the cache
   * @param key - Cache key
   * @param value - Navigation nodes to cache
   * @param ttlMs - Optional TTL override (uses default if not specified)
   */
  set(key: string, value: NavigationNode[], ttlMs?: number): void {
    const startTime = performance.now();
    const now = Date.now();
    const actualTTL = ttlMs ?? this.config.defaultTTLMs;
    
    // Calculate size estimate (rough approximation)
    const sizeBytes = this.estimateSize(value);
    
    // Check if we need to evict entries
    while (
      (this.cache.size >= this.config.maxEntries ||
        (this.config.maxMemoryBytes && this.currentMemoryBytes + sizeBytes > this.config.maxMemoryBytes)) &&
      this.cache.size > 0
    ) {
      this.evict();
    }

    // Remove existing entry if present
    const existing = this.cache.get(key);
    if (existing) {
      this.currentMemoryBytes -= existing.sizeBytes;
    }

    const entry: EdgeCacheEntry = {
      key,
      value,
      createdAt: now,
      expiresAt: now + actualTTL,
      hits: 0,
      lastAccessedAt: now,
      sizeBytes
    };

    this.cache.set(key, entry);
    this.currentMemoryBytes += sizeBytes;
    
    this.recordLatency(startTime);
  }

  /**
   * Invalidate cache entries matching a pattern
   * @param pattern - Pattern to match (supports * wildcard)
   * @returns Number of entries invalidated
   */
  invalidate(pattern: string): number {
    let count = 0;
    const regex = this.patternToRegex(pattern);
    
    for (const [key, entry] of this.cache.entries()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        this.currentMemoryBytes -= entry.sizeBytes;
        count++;
      }
    }
    
    this.stats.evictions += count;
    return count;
  }

  /**
   * Invalidate all cache entries for a specific tenant
   * @param tenantId - Tenant identifier
   * @returns Number of entries invalidated
   */
  invalidateTenant(tenantId: string): number {
    return this.invalidate(`tenant:${tenantId}:*`);
  }

  /**
   * Generate a cache key from context
   * @param tenantId - Tenant identifier
   * @param userId - User identifier
   * @param path - Navigation path
   * @returns Generated cache key
   */
  generateKey(tenantId: string, userId: string, path: string): string {
    // Include path and tenantId in key, but use a permission hash for userId
    // to allow sharing cache between users with same permissions
    return `tenant:${tenantId}:user:${userId}:path:${path}`;
  }

  /**
   * Generate a cache key based on permissions (for sharing between users)
   * @param tenantId - Tenant identifier
   * @param permissions - User permissions array
   * @param path - Navigation path
   * @returns Generated cache key
   */
  generatePermissionKey(tenantId: string, permissions: string[], path: string): string {
    const permHash = this.hashPermissions(permissions);
    return `tenant:${tenantId}:perm:${permHash}:path:${path}`;
  }

  /**
   * Get cache statistics
   * @returns Cache statistics including hit rate, entry count, and average latency
   */
  getStats(): EdgeCacheStats {
    const totalOps = this.stats.hits + this.stats.misses;
    const hitRate = totalOps > 0 ? this.stats.hits / totalOps : 0;
    const avgLatency = this.stats.operations > 0 
      ? this.stats.totalLatencyMs / this.stats.operations 
      : 0;

    return {
      hitRate,
      entries: this.cache.size,
      avgLatencyMs: avgLatency,
      hits: this.stats.hits,
      misses: this.stats.misses,
      evictions: this.stats.evictions,
      memoryUsageBytes: this.currentMemoryBytes
    };
  }

  /**
   * Get current number of cache entries
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.currentMemoryBytes = 0;
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalLatencyMs: 0,
      operations: 0
    };
  }

  /**
   * Get the configuration being used
   */
  getConfig(): EdgeCacheConfig {
    return { ...this.config };
  }

  /**
   * Check if an entry has expired
   */
  private isExpired(entry: EdgeCacheEntry): boolean {
    return Date.now() > entry.expiresAt;
  }

  /**
   * Evict an entry based on the configured eviction policy
   */
  private evict(): void {
    if (this.cache.size === 0) return;

    let keyToEvict: string | null = null;

    switch (this.config.evictionPolicy) {
      case 'lru':
        keyToEvict = this.findLRUKey();
        break;
      case 'lfu':
        keyToEvict = this.findLFUKey();
        break;
      case 'ttl':
        keyToEvict = this.findExpiredOrOldestKey();
        break;
      default:
        keyToEvict = this.findLRUKey(); // Default to LRU
    }

    if (keyToEvict) {
      const entry = this.cache.get(keyToEvict);
      if (entry) {
        this.currentMemoryBytes -= entry.sizeBytes;
      }
      this.cache.delete(keyToEvict);
      this.stats.evictions++;
    }
  }

  /**
   * Find the least recently used cache key
   */
  private findLRUKey(): string | null {
    let oldestTime = Infinity;
    let oldestKey: string | null = null;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessedAt < oldestTime) {
        oldestTime = entry.lastAccessedAt;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  /**
   * Find the least frequently used cache key
   */
  private findLFUKey(): string | null {
    let lowestHits = Infinity;
    let lowestKey: string | null = null;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.hits < lowestHits) {
        lowestHits = entry.hits;
        lowestKey = key;
      }
    }

    return lowestKey;
  }

  /**
   * Find expired entries first, then oldest if none expired
   */
  private findExpiredOrOldestKey(): string | null {
    const now = Date.now();
    
    // First, try to find an expired entry
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < now) {
        return key;
      }
    }

    // If no expired entries, find the one closest to expiration
    let soonestExpiry = Infinity;
    let soonestKey: string | null = null;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < soonestExpiry) {
        soonestExpiry = entry.expiresAt;
        soonestKey = key;
      }
    }

    return soonestKey;
  }

  /**
   * Convert a pattern with wildcards to a regex
   */
  private patternToRegex(pattern: string): RegExp {
    const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const withWildcards = escaped.replace(/\\\*/g, '.*');
    return new RegExp(`^${withWildcards}$`);
  }

  /**
   * Estimate the size of navigation nodes in bytes
   */
  private estimateSize(nodes: NavigationNode[]): number {
    // Rough estimation: JSON stringify length * 2 for UTF-16
    const jsonStr = JSON.stringify(nodes);
    return jsonStr.length * 2;
  }

  /**
   * Create a hash of permissions for cache key sharing
   */
  private hashPermissions(permissions: string[]): string {
    const sorted = [...permissions].sort();
    const combined = sorted.join('|');
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Record latency for statistics
   */
  private recordLatency(startTime: number): void {
    if (this.config.enableStats) {
      this.stats.totalLatencyMs += performance.now() - startTime;
      this.stats.operations++;
    }
  }
}

/**
 * Factory function to create an EdgeCacheManager
 * @param config - Optional configuration overrides
 * @returns Configured EdgeCacheManager instance
 */
export function createEdgeCacheManager(config?: Partial<EdgeCacheConfig>): EdgeCacheManager {
  return new EdgeCacheManager(config);
}
