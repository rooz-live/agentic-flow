import * as fs from 'fs';
import * as path from 'path';

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
export class SkillsFallbackManager {
  private rootDir: string;
  private cacheDir: string;
  private mcpTimeout: number;

  constructor(rootDir?: string, mcpTimeout: number = 3000) {
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
  async getSkills(options: SkillsFallbackOptions): Promise<Skill[]> {
    const {
      circle,
      preferLocal = true,
      mcpTimeout = this.mcpTimeout,
      fallback = 'cached',
    } = options;

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
    } catch (err) {
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
  private loadCachedSkills(circle: string): SkillsCache | null {
    const cachePath = path.join(this.cacheDir, `${circle}.json`);
    
    if (!fs.existsSync(cachePath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(cachePath, 'utf8');
      return JSON.parse(content) as SkillsCache;
    } catch (err) {
      console.error(`Failed to read cache for ${circle}:`, err);
      return null;
    }
  }

  /**
   * Save skills to local cache
   */
  private saveCachedSkills(
    circle: string,
    skills: Skill[],
    source: SkillsCache['source']
  ): void {
    const cachePath = path.join(this.cacheDir, `${circle}.json`);
    
    const cache: SkillsCache = {
      circle,
      skills,
      cached_at: new Date().toISOString(),
      source,
    };

    try {
      fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2), 'utf8');
    } catch (err) {
      console.error(`Failed to save cache for ${circle}:`, err);
    }
  }

  /**
   * Fetch skills from MCP server with timeout
   */
  private async fetchFromMCP(circle: string, timeout: number): Promise<Skill[]> {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    return new Promise<Skill[]>(async (resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`MCP timeout after ${timeout}ms`));
      }, timeout);

      try {
        const { stdout, stderr } = await execAsync(
          `npx agentdb skill export --circle "${circle}" --json`,
          { timeout }
        );

        clearTimeout(timer);

        if (stderr && !stdout) {
          reject(new Error(stderr));
          return;
        }

        try {
          const data = JSON.parse(stdout);
          resolve(data.skills || []);
        } catch (parseErr) {
          reject(new Error(`Failed to parse MCP response: ${parseErr}`));
        }
      } catch (err) {
        clearTimeout(timer);
        reject(err);
      }
    });
  }

  /**
   * Get human-readable cache age
   */
  private getCacheAge(cachedAt: string): string {
    const now = new Date();
    const cached = new Date(cachedAt);
    const diffMs = now.getTime() - cached.getTime();
    
    const minutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return 'just now';
  }

  /**
   * Check if MCP is available
   */
  async isMCPAvailable(): Promise<boolean> {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    try {
      await execAsync('npx agentdb --version', {
        timeout: this.mcpTimeout,
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Export all skills to cache (for offline preparation)
   */
  async exportAllSkills(circles?: string[]): Promise<void> {
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
      } catch (err) {
        console.log(`  ⚠️  Failed to export ${circle} (using fallback)`);
        this.saveCachedSkills(circle, [], 'fallback');
      }
    }

    console.log(`✅ Skills cache exported to ${this.cacheDir}`);
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): Record<string, any> {
    const stats: Record<string, any> = {};

    try {
      const files = fs.readdirSync(this.cacheDir);
      
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        
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
    } catch (err) {
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
