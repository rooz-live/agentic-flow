/**
 * MCP Cache Manager
 * Last-known-good context caching with TTL and fallback logic
 */
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
export class MCPCacheManager {
    cacheDir;
    defaultTTL;
    maxCacheSize;
    constructor(options = {}) {
        this.cacheDir = options.cacheDir || path.join(process.cwd(), '.cache', 'mcp');
        this.defaultTTL = options.defaultTTL || 86400; // 24 hours
        this.maxCacheSize = options.maxCacheSize || 100; // 100 MB
        this.ensureCacheDir();
    }
    ensureCacheDir() {
        if (!fs.existsSync(this.cacheDir)) {
            fs.mkdirSync(this.cacheDir, { recursive: true });
        }
    }
    getCacheKey(provider, tool, args) {
        const argsStr = JSON.stringify(args);
        const hash = crypto.createHash('sha256').update(argsStr).digest('hex').substring(0, 16);
        return `${provider}/${tool}_${hash}.json`;
    }
    getCachePath(cacheKey) {
        return path.join(this.cacheDir, cacheKey);
    }
    /**
     * Save response to cache
     */
    async saveToCache(provider, tool, args, response, ttl) {
        try {
            const cacheKey = this.getCacheKey(provider, tool, args);
            const cachePath = this.getCachePath(cacheKey);
            // Ensure provider directory exists
            const providerDir = path.dirname(cachePath);
            if (!fs.existsSync(providerDir)) {
                fs.mkdirSync(providerDir, { recursive: true });
            }
            const entry = {
                provider,
                tool,
                args,
                response,
                timestamp: new Date().toISOString(),
                ttl_seconds: ttl || this.defaultTTL,
                hash: this.getCacheKey(provider, tool, args),
            };
            fs.writeFileSync(cachePath, JSON.stringify(entry, null, 2));
        }
        catch (error) {
            console.error(`Failed to save cache for ${provider}/${tool}:`, error);
        }
    }
    /**
     * Load response from cache
     */
    async loadFromCache(provider, tool, args) {
        try {
            const cacheKey = this.getCacheKey(provider, tool, args);
            const cachePath = this.getCachePath(cacheKey);
            if (!fs.existsSync(cachePath)) {
                return null;
            }
            const content = fs.readFileSync(cachePath, 'utf-8');
            const entry = JSON.parse(content);
            // Check if cache is expired
            if (this.isCacheExpired(entry)) {
                // Delete expired cache
                fs.unlinkSync(cachePath);
                return null;
            }
            return entry.response;
        }
        catch (error) {
            console.error(`Failed to load cache for ${provider}/${tool}:`, error);
            return null;
        }
    }
    /**
     * Check if cache entry is expired
     */
    isCacheExpired(entry) {
        const now = Date.now();
        const entryTime = new Date(entry.timestamp).getTime();
        const ttlMs = entry.ttl_seconds * 1000;
        return now - entryTime > ttlMs;
    }
    /**
     * Clear cache for specific provider
     */
    async clearProviderCache(provider) {
        const providerDir = path.join(this.cacheDir, provider);
        if (fs.existsSync(providerDir)) {
            fs.rmSync(providerDir, { recursive: true, force: true });
        }
    }
    /**
     * Clear all cache
     */
    async clearAllCache() {
        if (fs.existsSync(this.cacheDir)) {
            fs.rmSync(this.cacheDir, { recursive: true, force: true });
            this.ensureCacheDir();
        }
    }
    /**
     * Get cache statistics
     */
    async getCacheStats() {
        const stats = {
            totalEntries: 0,
            totalSize: 0,
            providerCounts: {},
            oldestEntry: undefined,
            newestEntry: undefined,
        };
        if (!fs.existsSync(this.cacheDir)) {
            return stats;
        }
        const providers = fs.readdirSync(this.cacheDir);
        let oldestTime = Infinity;
        let newestTime = 0;
        for (const provider of providers) {
            const providerDir = path.join(this.cacheDir, provider);
            if (!fs.statSync(providerDir).isDirectory())
                continue;
            const files = fs.readdirSync(providerDir);
            stats.providerCounts[provider] = files.length;
            stats.totalEntries += files.length;
            for (const file of files) {
                const filePath = path.join(providerDir, file);
                const stat = fs.statSync(filePath);
                stats.totalSize += stat.size;
                // Track oldest and newest
                const mtime = stat.mtimeMs;
                if (mtime < oldestTime) {
                    oldestTime = mtime;
                    stats.oldestEntry = new Date(mtime).toISOString();
                }
                if (mtime > newestTime) {
                    newestTime = mtime;
                    stats.newestEntry = new Date(mtime).toISOString();
                }
            }
        }
        return stats;
    }
    /**
     * Cleanup expired cache entries
     */
    async cleanupExpired() {
        let deletedCount = 0;
        if (!fs.existsSync(this.cacheDir)) {
            return deletedCount;
        }
        const providers = fs.readdirSync(this.cacheDir);
        for (const provider of providers) {
            const providerDir = path.join(this.cacheDir, provider);
            if (!fs.statSync(providerDir).isDirectory())
                continue;
            const files = fs.readdirSync(providerDir);
            for (const file of files) {
                const filePath = path.join(providerDir, file);
                try {
                    const content = fs.readFileSync(filePath, 'utf-8');
                    const entry = JSON.parse(content);
                    if (this.isCacheExpired(entry)) {
                        fs.unlinkSync(filePath);
                        deletedCount++;
                    }
                }
                catch (error) {
                    // Invalid cache file, delete it
                    fs.unlinkSync(filePath);
                    deletedCount++;
                }
            }
        }
        return deletedCount;
    }
    /**
     * Enforce cache size limit
     */
    async enforceSizeLimit() {
        const stats = await this.getCacheStats();
        const sizeMB = stats.totalSize / (1024 * 1024);
        if (sizeMB <= this.maxCacheSize) {
            return 0;
        }
        // Delete oldest entries until under limit
        let deletedCount = 0;
        const providers = fs.readdirSync(this.cacheDir);
        const allEntries = [];
        for (const provider of providers) {
            const providerDir = path.join(this.cacheDir, provider);
            if (!fs.statSync(providerDir).isDirectory())
                continue;
            const files = fs.readdirSync(providerDir);
            for (const file of files) {
                const filePath = path.join(providerDir, file);
                const stat = fs.statSync(filePath);
                allEntries.push({ path: filePath, mtime: stat.mtimeMs });
            }
        }
        // Sort by modification time (oldest first)
        allEntries.sort((a, b) => a.mtime - b.mtime);
        let currentSize = stats.totalSize;
        const targetSize = this.maxCacheSize * 0.8 * 1024 * 1024; // 80% of max
        for (const entry of allEntries) {
            if (currentSize <= targetSize)
                break;
            const stat = fs.statSync(entry.path);
            fs.unlinkSync(entry.path);
            currentSize -= stat.size;
            deletedCount++;
        }
        return deletedCount;
    }
}
// Singleton instance
export const globalCacheManager = new MCPCacheManager();
//# sourceMappingURL=mcp-cache-manager.js.map