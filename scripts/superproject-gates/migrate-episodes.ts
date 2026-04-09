#!/usr/bin/env tsx
/**
 * Migrate existing episodes to include circle/ceremony in metadata
 * This enables causal learning by providing the required metadata fields
 */

import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'agentdb.db');

if (!fs.existsSync(DB_PATH)) {
  console.error('❌ Database not found:', DB_PATH);
  process.exit(1);
}

console.log('🔄 Migrating episode metadata...\n');

const db = new Database(DB_PATH);

try {
  // Count total episodes
  const {count: totalEpisodes} = db.prepare('SELECT COUNT(*) as count FROM episodes').get() as {count: number};
  console.log(`📊 Total episodes: ${totalEpisodes}`);
  
  if (totalEpisodes === 0) {
    console.log('✅ No episodes to migrate');
    process.exit(0);
  }
  
  // Update episodes with circle/ceremony extracted from task field
  console.log('🔧 Extracting circle/ceremony from task field...\n');
  
  const updateStmt = db.prepare(`
    UPDATE episodes
    SET metadata = json_insert(
      COALESCE(metadata, '{}'),
      '$.circle',
      CASE
        WHEN task LIKE '%orchestrator%' THEN 'orchestrator'
        WHEN task LIKE '%assessor%' THEN 'assessor'
        WHEN task LIKE '%innovator%' THEN 'innovator'
        WHEN task LIKE '%analyst%' THEN 'analyst'
        WHEN task LIKE '%seeker%' THEN 'seeker'
        WHEN task LIKE '%intuitive%' THEN 'intuitive'
        ELSE 'unknown'
      END,
      '$.ceremony',
      CASE
        WHEN task LIKE '%standup%' THEN 'standup'
        WHEN task LIKE '%wsjf%' THEN 'wsjf'
        WHEN task LIKE '%review%' THEN 'review'
        WHEN task LIKE '%retro%' THEN 'retro'
        WHEN task LIKE '%refine%' THEN 'refine'
        WHEN task LIKE '%replenish%' THEN 'replenish'
        WHEN task LIKE '%synthesis%' THEN 'synthesis'
        ELSE 'unknown'
      END
    )
    WHERE json_extract(metadata, '$.circle') IS NULL
       OR json_extract(metadata, '$.ceremony') IS NULL
  `);
  
  const result = updateStmt.run();
  console.log(`✅ Updated ${result.changes} episodes\n`);
  
  // Verify migration
  console.log('📊 Verification:\n');
  const verifyStmt = db.prepare(`
    SELECT 
      json_extract(metadata, '$.circle') as circle,
      json_extract(metadata, '$.ceremony') as ceremony,
      COUNT(*) as count
    FROM episodes
    WHERE json_extract(metadata, '$.circle') IS NOT NULL
    GROUP BY circle, ceremony
    ORDER BY count DESC
    LIMIT 20
  `);
  
  const results = verifyStmt.all() as Array<{circle: string; ceremony: string; count: number}>;
  
  console.log('Circle/Ceremony Distribution:');
  console.log('─'.repeat(60));
  results.forEach(row => {
    console.log(`${row.circle}/${row.ceremony}`.padEnd(30) + `${row.count} episodes`);
  });
  
  console.log('\n🧠 Episodes now ready for causal learning!');
  console.log('\nNext steps:');
  console.log('  1. Run: npx agentdb learner run 1 0.3 0.5 false');
  console.log('  2. Verify: npx agentdb stats');
  
} catch (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
} finally {
  db.close();
}
