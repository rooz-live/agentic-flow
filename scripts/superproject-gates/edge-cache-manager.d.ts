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
import { EdgeCacheConfig, EdgeCacheEntry, EdgeCacheStats, NavigationNode } from './types.js';
/**
 * EdgeCacheManager provides caching for multi-tenant navigation resolution.
 * Implements LRU/LFU/TTL eviction policies for predictable memory usage.
 */
export declare class EdgeCacheManager {
    private cache;
    private config;
    private stats;
    private currentMemoryBytes;
    /**
     * Create a new EdgeCacheManager instance
     * @param config - Optional partial configuration (uses defaults for missing values)
     */
    constructor(config?: Partial<EdgeCacheConfig>);
    /**
     * Get an entry from the cache
     * @param key - Cache key to retrieve
     * @returns The cache entry if found and not expired, null otherwise
     */
    get(key: string): EdgeCacheEntry | null;
    /**
     * Store navigation nodes in the cache
     * @param key - Cache key
     * @param value - Navigation nodes to cache
     * @param ttlMs - Optional TTL override (uses default if not specified)
     */
    set(key: string, value: NavigationNode[], ttlMs?: number): void;
    /**
     * Invalidate cache entries matching a pattern
     * @param pattern - Pattern to match (supports * wildcard)
     * @returns Number of entries invalidated
     */
    invalidate(pattern: string): number;
    /**
     * Invalidate all cache entries for a specific tenant
     * @param tenantId - Tenant identifier
     * @returns Number of entries invalidated
     */
    invalidateTenant(tenantId: string): number;
    /**
     * Generate a cache key from context
     * @param tenantId - Tenant identifier
     * @param userId - User identifier
     * @param path - Navigation path
     * @returns Generated cache key
     */
    generateKey(tenantId: string, userId: string, path: string): string;
    /**
     * Generate a cache key based on permissions (for sharing between users)
     * @param tenantId - Tenant identifier
     * @param permissions - User permissions array
     * @param path - Navigation path
     * @returns Generated cache key
     */
    generatePermissionKey(tenantId: string, permissions: string[], path: string): string;
    /**
     * Get cache statistics
     * @returns Cache statistics including hit rate, entry count, and average latency
     */
    getStats(): EdgeCacheStats;
    /**
     * Get current number of cache entries
     */
    get size(): number;
    /**
     * Clear all cache entries
     */
    clear(): void;
    /**
     * Get the configuration being used
     */
    getConfig(): EdgeCacheConfig;
    /**
     * Check if an entry has expired
     */
    private isExpired;
    /**
     * Evict an entry based on the configured eviction policy
     */
    private evict;
    /**
     * Find the least recently used cache key
     */
    private findLRUKey;
    /**
     * Find the least frequently used cache key
     */
    private findLFUKey;
    /**
     * Find expired entries first, then oldest if none expired
     */
    private findExpiredOrOldestKey;
    /**
     * Convert a pattern with wildcards to a regex
     */
    private patternToRegex;
    /**
     * Estimate the size of navigation nodes in bytes
     */
    private estimateSize;
    /**
     * Create a hash of permissions for cache key sharing
     */
    private hashPermissions;
    /**
     * Record latency for statistics
     */
    private recordLatency;
}
/**
 * Factory function to create an EdgeCacheManager
 * @param config - Optional configuration overrides
 * @returns Configured EdgeCacheManager instance
 */
export declare function createEdgeCacheManager(config?: Partial<EdgeCacheConfig>): EdgeCacheManager;
//# sourceMappingURL=edge-cache-manager.d.ts.map