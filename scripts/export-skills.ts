#!/usr/bin/env npx tsx
/**
 * export-skills.ts - TypeScript skills export tool
 * Exports AgentDB skills to local cache with validation
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface Skill {
  name: string;
  type?: string;
  reward?: number;
  count?: number;
  description?: string;
  category?: string;
  success_rate?: number;
}

interface CacheMetadata {
  exported_at: string;
  circles_count: number;
  exported_count: number;
  mcp_available: boolean;
  skills_total: number;
}

const CIRCLES = ['orchestrator', 'assessor', 'innovator', 'analyst', 'seeker', 'intuitive'];
const REPO_ROOT = path.resolve(__dirname, '..');
const CACHE_DIR = path.join(REPO_ROOT, '.cache', 'skills');
const LOCAL_SKILLS_STORE = path.join(REPO_ROOT, 'reports', 'skills-store.json');

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(level: 'info' | 'success' | 'warn' | 'error', message: string) {
  const prefix = {
    info: `${colors.cyan}[INFO]${colors.reset}`,
    success: `${colors.green}[✓]${colors.reset}`,
    warn: `${colors.yellow}[⚠]${colors.reset}`,
    error: `${colors.red}[✗]${colors.reset}`,
  };
  console.log(`${prefix[level]} ${message}`);
}

async function checkMcpHealth(): Promise<boolean> {
  try {
    execSync('bash scripts/mcp-health-check.sh', { stdio: 'ignore', cwd: REPO_ROOT });
    return true;
  } catch {
    return false;
  }
}

function readLocalSkillsStore(): Skill[] | null {
  try {
    if (!fs.existsSync(LOCAL_SKILLS_STORE)) return null;
    const raw = fs.readFileSync(LOCAL_SKILLS_STORE, 'utf8');
    const parsed = JSON.parse(raw);
    const skills = parsed?.skills;
    if (!Array.isArray(skills)) return null;
    return skills.filter((s: any) => s && typeof s.name === 'string' && s.name.trim().length > 0);
  } catch {
    return null;
  }
}

function extractSkillNames(skills: Skill[]): string[] {
  const names = skills
    .map(s => (s?.name || '').trim())
    .filter(Boolean);
  return Array.from(new Set(names));
}

function parseSkillSearchOutput(output: string): Skill[] {
  const lines = output
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  const candidates = lines
    .map(l => l.replace(/^[•\-\*]\s+/, ''))
    .filter(l => /^[a-zA-Z0-9_-]{2,}$/.test(l));

  return candidates.map(name => ({ name }));
}

async function exportSkillsForCircle(circle: string): Promise<{ skills: Skill[]; source: string } | null> {
  const local = readLocalSkillsStore();
  if (local && local.length > 0) {
    return { skills: local, source: 'local_store' };
  }

  try {
    const output = execSync(`npx agentdb skill search "${circle}" 50`, {
      encoding: 'utf8',
      cwd: REPO_ROOT,
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    const parsed = parseSkillSearchOutput(output);
    if (parsed.length > 0) {
      return { skills: parsed, source: 'agentdb_search' };
    }
    return null;
  } catch {
    return null;
  }
}

async function createEmptyCache(circle: string): Promise<void> {
  const cacheFile = path.join(CACHE_DIR, `${circle}.json`);
  const emptyCache = {
    circle,
    skills: [],
    cached_at: new Date().toISOString(),
    source: 'fallback',
  };
  fs.writeFileSync(cacheFile, JSON.stringify(emptyCache, null, 2));
}

async function exportAllSkills(): Promise<void> {
  log('info', 'Starting skills export...');

  // Ensure cache directory exists
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    log('info', `Created cache directory: ${CACHE_DIR}`);
  }

  // Check MCP availability
  const mcpAvailable = await checkMcpHealth();
  if (!mcpAvailable) {
    log('warn', 'MCP server unavailable - creating empty cache files');
  }

  let exportedCount = 0;
  let totalSkills = 0;

  // Export each circle
  for (const circle of CIRCLES) {
    log('info', `Exporting skills for circle: ${circle}`);

    const exported = await exportSkillsForCircle(circle);
    if (exported?.skills?.length) {
      const skillNames = extractSkillNames(exported.skills);
      const cacheFile = path.join(CACHE_DIR, `${circle}.json`);
      const cacheData = {
        circle,
        skills: skillNames,
        cached_at: new Date().toISOString(),
        source: exported.source,
        skills_count: skillNames.length,
      };

      fs.writeFileSync(cacheFile, JSON.stringify(cacheData, null, 2));
      log('success', `Exported ${skillNames.length} skills for ${circle}`);
      exportedCount++;
      totalSkills += skillNames.length;
    } else {
      if (mcpAvailable) {
        log('error', `Failed to export skills for ${circle}`);
      }
      await createEmptyCache(circle);
      log('warn', `Created empty cache for ${circle}`);
    }
  }

  // Create metadata file
  const metadata: CacheMetadata = {
    exported_at: new Date().toISOString(),
    circles_count: CIRCLES.length,
    exported_count: exportedCount,
    mcp_available: mcpAvailable,
    skills_total: totalSkills,
  };

  fs.writeFileSync(
    path.join(CACHE_DIR, '_metadata.json'),
    JSON.stringify(metadata, null, 2)
  );

  // Summary
  console.log('');
  log('success', `Skills cache export complete: ${exportedCount}/${CIRCLES.length} circles`);
  log('info', `Total skills cached: ${totalSkills}`);
  log('info', `Cache location: ${CACHE_DIR}`);

  if (!mcpAvailable) {
    console.log('');
    log('warn', 'MCP was offline - empty caches created for fallback');
    log('info', 'Start MCP and re-run to populate cache: npm run cache:export');
  }
}

// Main execution
if (require.main === module) {
  exportAllSkills().catch((error) => {
    log('error', `Export failed: ${error.message}`);
    process.exit(1);
  });
}

export { exportAllSkills };
