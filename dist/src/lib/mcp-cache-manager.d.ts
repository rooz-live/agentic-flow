/**
 * MCP Cache Manager
 * Last-known-good context caching with TTL and fallback logic
 */
export interface CacheEntry {
    provider: string;
    tool: string;
    args: any;
    response: any;
    timestamp: string;
    ttl_seconds: number;
    hash: string;
}
export interface CacheOptions {
    cacheDir?: string;
    defaultTTL?: number;
    maxCacheSize?: number;
}
export declare class MCPCacheManager {
    private cacheDir;
    private defaultTTL;
    private maxCacheSize;
    constructor(options?: CacheOptions);
    private ensureCacheDir;
    private getCacheKey;
    private getCachePath;
    /**
     * Save response to cache
     */
    saveToCache(provider: string, tool: string, args: any, response: any, ttl?: number): Promise<void>;
    /**
     * Load response from cache
     */
    loadFromCache(provider: string, tool: string, args: any): Promise<any | null>;
    /**
     * Check if cache entry is expired
     */
    private isCacheExpired;
    /**
     * Clear cache for specific provider
     */
    clearProviderCache(provider: string): Promise<void>;
    /**
     * Clear all cache
     */
    clearAllCache(): Promise<void>;
    /**
     * Get cache statistics
     */
    getCacheStats(): Promise<{
        totalEntries: number;
        totalSize: number;
        providerCounts: Record<string, number>;
        oldestEntry?: string;
        newestEntry?: string;
    }>;
    /**
     * Cleanup expired cache entries
     */
    cleanupExpired(): Promise<number>;
    /**
     * Enforce cache size limit
     */
    enforceSizeLimit(): Promise<number>;
}
export declare const globalCacheManager: MCPCacheManager;
//# sourceMappingURL=mcp-cache-manager.d.ts.map