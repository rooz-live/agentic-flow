export interface Skill {
    name: string;
    circle: string;
    description?: string;
    confidence?: number;
    usage_count?: number;
    last_used?: string;
}
export interface SkillsCache {
    circle: string;
    skills: Skill[];
    cached_at: string;
    source: 'agentdb' | 'fallback' | 'local';
}
export interface SkillsFallbackOptions {
    circle: string;
    preferLocal?: boolean;
    mcpTimeout?: number;
    fallback?: 'empty' | 'cached';
    cachePath?: string;
}
/**
 * Manages skills retrieval with automatic fallback to cached data
 * when MCP server is unavailable
 */
export declare class SkillsFallbackManager {
    private rootDir;
    private cacheDir;
    private mcpTimeout;
    constructor(rootDir?: string, mcpTimeout?: number);
    /**
     * Get skills for a circle with automatic fallback
     */
    getSkills(options: SkillsFallbackOptions): Promise<Skill[]>;
    /**
     * Load skills from local cache
     */
    private loadCachedSkills;
    /**
     * Save skills to local cache
     */
    private saveCachedSkills;
    /**
     * Fetch skills from MCP server with timeout
     */
    private fetchFromMCP;
    /**
     * Get human-readable cache age
     */
    private getCacheAge;
    /**
     * Check if MCP is available
     */
    isMCPAvailable(): Promise<boolean>;
    /**
     * Export all skills to cache (for offline preparation)
     */
    exportAllSkills(circles?: string[]): Promise<void>;
    /**
     * Get cache statistics
     */
    getCacheStats(): Record<string, any>;
}
//# sourceMappingURL=skills-fallback.d.ts.map