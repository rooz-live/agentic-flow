#!/usr/bin/env ts-node
/**
 * Generate Test Episodes - Populate agentdb.db
 * ==============================================
 * Generates synthetic episodes to achieve HIGH_CONFIDENCE thresholds (30+ episodes)
 * 
 * Usage:
 *   npx ts-node scripts/generate-test-episodes.ts --count 50 --circle orchestrator --ceremony standup
 */

import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import * as path from 'path';

const DB_PATH = process.env.AGENTDB_PATH || path.join(process.cwd(), 'agentdb.db');

interface EpisodeConfig {
  circle: string;
  ceremony: string;
  count: number;
  successRate: number; // 0-1
  meanReward: number;
  stdDevReward: number;
  meanLatencyMs: number;
  stdDevLatencyMs: number;
}

/**
 * Generate realistic episode data with statistical properties
 */
function generateEpisode(config: EpisodeConfig, index: number): any {
  // Normal distribution using Box-Muller transform
  const normal = (mean: number, stdDev: number): number => {
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + z0 * stdDev;
  };

  const success = Math.random() < config.successRate ? 1 : 0;
  
  // Generate reward based on success
  let reward: number;
  if (success) {
    reward = Math.max(0, Math.min(1, normal(config.meanReward, config.stdDevReward)));
  } else {
    // Failed episodes have lower rewards
    reward = Math.max(0, Math.min(1, normal(config.meanReward * 0.3, config.stdDevReward)));
  }

  const latencyMs = Math.max(100, normal(config.meanLatencyMs, config.stdDevLatencyMs));
  
  // Spread episodes over last 30 days
  const daysAgo = Math.floor(Math.random() * 30);
  const createdAt = Math.floor(Date.now() / 1000) - (daysAgo * 24 * 60 * 60);

  const taskId = `${config.circle}-${config.ceremony}-${Date.now()}-${index}`;
  
  return {
    session_id: `test-session-${Date.now()}-${index}`,
    task: `${config.circle}:${config.ceremony}`,
    input: JSON.stringify({ circle: config.circle, ceremony: config.ceremony }),
    output: success ? JSON.stringify({ status: 'success', result: reward }) : JSON.stringify({ status: 'failed' }),
    critique: null,
    success: success ? 1 : 0,
    reward,
    latency_ms: Math.floor(latencyMs),
    tokens_used: Math.floor(Math.random() * 5000) + 1000,
    tags: JSON.stringify([config.circle, config.ceremony, 'synthetic']),
    metadata: JSON.stringify({
      circle: config.circle,
      ceremony: config.ceremony,
      synthetic: true,
      batch: 'test-generation'
    }),
    created_at: createdAt
  };
}

/**
 * Check if episodes table exists and has correct schema
 */
async function ensureSchema(db: any): Promise<void> {
  const tableInfo = await db.all("SELECT sql FROM sqlite_master WHERE type='table' AND name='episodes'");
  
  if (tableInfo.length === 0) {
    console.log('Creating episodes table...');
    await db.exec(`
      CREATE TABLE IF NOT EXISTS episodes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ts INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        session_id TEXT NOT NULL,
        task TEXT NOT NULL,
        input TEXT,
        output TEXT,
        critique TEXT,
        reward REAL DEFAULT 0.0,
        success BOOLEAN DEFAULT 0,
        latency_ms INTEGER,
        tokens_used INTEGER,
        tags TEXT,
        metadata JSON,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      );
      CREATE INDEX IF NOT EXISTS idx_episodes_ts ON episodes(ts DESC);
      CREATE INDEX IF NOT EXISTS idx_episodes_session ON episodes(session_id);
      CREATE INDEX IF NOT EXISTS idx_episodes_reward ON episodes(reward DESC);
      CREATE INDEX IF NOT EXISTS idx_episodes_task ON episodes(task);
    `);
    console.log('✅ Episodes table created');
  }
}

/**
 * Insert episodes into database
 */
async function insertEpisodes(db: any, episodes: any[]): Promise<number> {
  let inserted = 0;
  
  for (const episode of episodes) {
    try {
      await db.run(`
        INSERT INTO episodes (session_id, task, input, output, critique, success, reward, latency_ms, tokens_used, tags, metadata, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        episode.session_id,
        episode.task,
        episode.input,
        episode.output,
        episode.critique,
        episode.success,
        episode.reward,
        episode.latency_ms,
        episode.tokens_used,
        episode.tags,
        episode.metadata,
        episode.created_at
      ]);
      inserted++;
    } catch (error: any) {
      if (error.code !== 'SQLITE_CONSTRAINT') {
        console.error(`Error inserting episode:`, error.message);
      }
    }
  }
  
  return inserted;
}

/**
 * Generate and insert test episodes
 */
async function generateTestEpisodes(config: EpisodeConfig): Promise<void> {
  console.log('📊 Episode Generator Starting...');
  console.log(`Target: ${config.count} episodes for ${config.circle}:${config.ceremony}`);
  console.log(`Success rate: ${(config.successRate * 100).toFixed(1)}%`);
  console.log(`Mean reward: ${config.meanReward.toFixed(3)} ± ${config.stdDevReward.toFixed(3)}`);
  console.log('');

  // Open database
  const db = await open({
    filename: DB_PATH,
    driver: sqlite3.Database
  });

  try {
    // Ensure schema exists
    await ensureSchema(db);

    // Check existing episodes
    const existing = await db.get(
      "SELECT COUNT(*) as count FROM episodes WHERE task LIKE ?",
      [`%${config.circle}%${config.ceremony}%`]
    );
    console.log(`Existing episodes: ${existing.count}`);

    // Generate episodes
    console.log(`Generating ${config.count} new episodes...`);
    const episodes: any[] = [];
    for (let i = 0; i < config.count; i++) {
      episodes.push(generateEpisode(config, i));
    }

    // Insert episodes
    const inserted = await insertEpisodes(db, episodes);
    console.log(`✅ Inserted ${inserted} episodes`);

    // Verify
    const final = await db.get(
      "SELECT COUNT(*) as count FROM episodes WHERE task LIKE ?",
      [`%${config.circle}%${config.ceremony}%`]
    );
    console.log(`Total episodes now: ${final.count}`);

    // Show statistics
    const stats = await db.get(`
      SELECT 
        COUNT(*) as total,
        SUM(success) as successes,
        AVG(reward) as avg_reward,
        AVG(latency_ms) as avg_latency,
        MIN(created_at) as first_episode,
        MAX(created_at) as last_episode
      FROM episodes 
      WHERE task LIKE ?
    `, [`%${config.circle}%${config.ceremony}%`]);

    console.log('\n📈 Statistics:');
    console.log(`  Total episodes: ${stats.total}`);
    console.log(`  Success rate: ${((stats.successes / stats.total) * 100).toFixed(1)}%`);
    console.log(`  Avg reward: ${stats.avg_reward.toFixed(3)}`);
    console.log(`  Avg latency: ${Math.floor(stats.avg_latency)}ms`);
    console.log(`  Date range: ${new Date(stats.first_episode * 1000).toISOString()} to ${new Date(stats.last_episode * 1000).toISOString()}`);

    // Test threshold calculation
    console.log('\n🧪 Testing threshold calculations...');
    const { spawn } = require('child_process');
    const thresholdScript = path.join(process.cwd(), 'scripts', 'ay-dynamic-thresholds.sh');
    
    const child = spawn('bash', [thresholdScript, 'all', config.circle, config.ceremony], {
      env: { ...process.env, AGENTDB_PATH: DB_PATH }
    });

    child.stdout.on('data', (data: Buffer) => {
      console.log(data.toString());
    });

    child.stderr.on('data', (data: Buffer) => {
      console.error(data.toString());
    });

    await new Promise((resolve) => child.on('close', resolve));

  } finally {
    await db.close();
  }
}

// Parse CLI arguments
const args = process.argv.slice(2);
const getArg = (flag: string, defaultValue: string): string => {
  const index = args.indexOf(flag);
  return index !== -1 && args[index + 1] ? args[index + 1] : defaultValue;
};

const config: EpisodeConfig = {
  circle: getArg('--circle', 'orchestrator'),
  ceremony: getArg('--ceremony', 'standup'),
  count: parseInt(getArg('--count', '50'), 10),
  successRate: parseFloat(getArg('--success-rate', '0.75')),
  meanReward: parseFloat(getArg('--mean-reward', '0.80')),
  stdDevReward: parseFloat(getArg('--stddev-reward', '0.12')),
  meanLatencyMs: parseFloat(getArg('--mean-latency', '2000')),
  stdDevLatencyMs: parseFloat(getArg('--stddev-latency', '500'))
};

// Run generator
generateTestEpisodes(config)
  .then(() => {
    console.log('\n✅ Episode generation complete!');
    console.log('\nNext steps:');
    console.log('  1. Verify thresholds: ./scripts/ay-dynamic-thresholds.sh all orchestrator standup');
    console.log('  2. Test TypeScript integration with enhanced functions');
    console.log('  3. Deploy health check endpoints');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Episode generation failed:', error);
    process.exit(1);
  });
