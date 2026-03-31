import * as fs from 'fs';
import * as path from 'path';
/**
 * Manages skills retrieval with automatic fallback to cached data
 * when MCP server is unavailable
 */
export class SkillsFallbackManager {
    rootDir;
    cacheDir;
    mcpTimeout;
    constructor(rootDir, mcpTimeout = 3000) {
        this.rootDir = rootDir || process.cwd();
        this.cacheDir = path.join(this.rootDir, '.cache', 'skills');
        this.mcpTimeout = mcpTimeout;
        // Ensure cache directory exists
        if (!fs.existsSync(this.cacheDir)) {
            fs.mkdirSync(this.cacheDir, { recursive: true });
        }
    }
    /**
     * Get skills for a circle with automatic fallback
     */
    async getSkills(options) {
        const { circle, preferLocal = true, mcpTimeout = this.mcpTimeout, fallback = 'cached', } = options;
        // 1. Try local cache first (fastest)
        if (preferLocal) {
            const cachedSkills = this.loadCachedSkills(circle);
            if (cachedSkills) {
                console.log(`📦 Using cached skills for ${circle}`);
                return cachedSkills.skills;
            }
        }
        // 2. Try MCP with timeout
        try {
            const skills = await this.fetchFromMCP(circle, mcpTimeout);
            // Cache for next time
            this.saveCachedSkills(circle, skills, 'agentdb');
            console.log(`✅ Fetched ${skills.length} skills from MCP for ${circle}`);
            return skills;
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            console.warn(`⚠️  MCP unavailable: ${errorMessage}`);
        }
        // 3. Fallback strategy
        if (fallback === 'cached') {
            const cachedSkills = this.loadCachedSkills(circle);
            if (cachedSkills) {
                const age = this.getCacheAge(cachedSkills.cached_at);
                console.log(`📦 Using stale cache for ${circle} (${age} old)`);
                return cachedSkills.skills;
            }
        }
        // 4. Empty set (last resort)
        console.log(`⚠️  No skills available for ${circle}`);
        return [];
    }
    /**
     * Load skills from local cache
     */
    loadCachedSkills(circle) {
        const cachePath = path.join(this.cacheDir, `${circle}.json`);
        if (!fs.existsSync(cachePath)) {
            return null;
        }
        try {
            const content = fs.readFileSync(cachePath, 'utf8');
            return JSON.parse(content);
        }
        catch (err) {
            console.error(`Failed to read cache for ${circle}:`, err);
            return null;
        }
    }
    /**
     * Save skills to local cache
     */
    saveCachedSkills(circle, skills, source) {
        const cachePath = path.join(this.cacheDir, `${circle}.json`);
        const cache = {
            circle,
            skills,
            cached_at: new Date().toISOString(),
            source,
        };
        try {
            fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2), 'utf8');
        }
        catch (err) {
            console.error(`Failed to save cache for ${circle}:`, err);
        }
    }
    /**
     * Fetch skills from MCP server with timeout
     */
    async fetchFromMCP(circle, timeout) {
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        return new Promise(async (resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error(`MCP timeout after ${timeout}ms`));
            }, timeout);
            try {
                const { stdout, stderr } = await execAsync(`npx agentdb skill export --circle "${circle}" --json`, { timeout });
                clearTimeout(timer);
                if (stderr && !stdout) {
                    reject(new Error(stderr));
                    return;
                }
                try {
                    const data = JSON.parse(stdout);
                    resolve(data.skills || []);
                }
                catch (parseErr) {
                    reject(new Error(`Failed to parse MCP response: ${parseErr}`));
                }
            }
            catch (err) {
                clearTimeout(timer);
                reject(err);
            }
        });
    }
    /**
     * Get human-readable cache age
     */
    getCacheAge(cachedAt) {
        const now = new Date();
        const cached = new Date(cachedAt);
        const diffMs = now.getTime() - cached.getTime();
        const minutes = Math.floor(diffMs / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        if (days > 0)
            return `${days}d`;
        if (hours > 0)
            return `${hours}h`;
        if (minutes > 0)
            return `${minutes}m`;
        return 'just now';
    }
    /**
     * Check if MCP is available
     */
    async isMCPAvailable() {
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        try {
            await execAsync('npx agentdb --version', {
                timeout: this.mcpTimeout,
            });
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Export all skills to cache (for offline preparation)
     */
    async exportAllSkills(circles) {
        const defaultCircles = [
            'orchestrator',
            'assessor',
            'innovator',
            'analyst',
            'seeker',
            'intuitive',
        ];
        const circlesToExport = circles || defaultCircles;
        console.log(`📦 Exporting skills cache for ${circlesToExport.length} circles...`);
        for (const circle of circlesToExport) {
            try {
                const skills = await this.fetchFromMCP(circle, this.mcpTimeout);
                this.saveCachedSkills(circle, skills, 'agentdb');
                console.log(`  ✅ Cached ${skills.length} skills for ${circle}`);
            }
            catch (err) {
                console.log(`  ⚠️  Failed to export ${circle} (using fallback)`);
                this.saveCachedSkills(circle, [], 'fallback');
            }
        }
        console.log(`✅ Skills cache exported to ${this.cacheDir}`);
    }
    /**
     * Get cache statistics
     */
    getCacheStats() {
        const stats = {};
        try {
            const files = fs.readdirSync(this.cacheDir);
            for (const file of files) {
                if (!file.endsWith('.json'))
                    continue;
                const circle = file.replace('.json', '');
                const cache = this.loadCachedSkills(circle);
                if (cache) {
                    stats[circle] = {
                        skills_count: cache.skills.length,
                        cached_at: cache.cached_at,
                        age: this.getCacheAge(cache.cached_at),
                        source: cache.source,
                    };
                }
            }
        }
        catch (err) {
            console.error('Failed to get cache stats:', err);
        }
        return stats;
    }
}
// CLI usage
if (require.main === module) {
    const manager = new SkillsFallbackManager();
    const command = process.argv[2];
    const arg = process.argv[3];
    (async () => {
        switch (command) {
            case 'export':
                await manager.exportAllSkills();
                break;
            case 'get':
                if (!arg) {
                    console.error('Usage: ts-node skills-fallback.ts get <circle>');
                    process.exit(1);
                }
                const skills = await manager.getSkills({ circle: arg });
                console.log(JSON.stringify(skills, null, 2));
                break;
            case 'stats':
                const stats = manager.getCacheStats();
                console.log(JSON.stringify(stats, null, 2));
                break;
            case 'check':
                const isAvailable = await manager.isMCPAvailable();
                console.log(isAvailable ? '✅ MCP available' : '⚠️  MCP unavailable');
                process.exit(isAvailable ? 0 : 1);
                break;
            default:
                console.log(`
Skills Fallback Manager

Usage:
  npx ts-node skills-fallback.ts <command> [args]

Commands:
  export           Export all skills to cache
  get <circle>     Get skills for a circle
  stats            Show cache statistics
  check            Check if MCP is available

Examples:
  npx ts-node skills-fallback.ts export
  npx ts-node skills-fallback.ts get orchestrator
  npx ts-node skills-fallback.ts stats
  npx ts-node skills-fallback.ts check
        `);
                break;
        }
    })().catch(console.error);
}
//# sourceMappingURL=skills-fallback.js.map