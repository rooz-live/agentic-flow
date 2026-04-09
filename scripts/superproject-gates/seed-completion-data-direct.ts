#!/usr/bin/env npx tsx
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DB_PATH = path.join(__dirname, '../agentdb.db');

console.log('Seeding data directly with better-sqlite3...');
console.log('DB Path:', DB_PATH);

const db = new Database(DB_PATH, { readonly: false });

// Set pragmas
db.pragma('journal_mode = DELETE');
db.pragma('synchronous = FULL');

console.log('Journal mode:', db.pragma('journal_mode', { simple: true }));

// Delete existing data
db.prepare('DELETE FROM completion_episodes').run();

// Insert data
const insertStmt = db.prepare(`
  INSERT INTO completion_episodes 
  (episode_id, circle, ceremony, outcome, completion_pct, confidence, timestamp)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const now = Date.now();

const episodes = [
  ['assessor_1', 'assessor', 'wsjf', 'partial', 35, 0.6, now - 3600000],
  ['orchestrator_1', 'orchestrator', 'standup', 'success', 60, 0.7, now - 1800000],
  ['analyst_1', 'analyst', 'refine', 'success', 95, 0.9, now - 2700000],
  ['innovator_1', 'innovator', 'retro', 'success', 100, 1.0, now - 3600000],
];

for (const ep of episodes) {
  const info = insertStmt.run(...ep);
  console.log(`Inserted episode: ${ep[0]}, changes: ${info.changes}`);
}

// Verify
const count = db.prepare('SELECT COUNT(*) as count FROM completion_episodes').get() as any;
console.log(`\nTotal episodes in database: ${count.count}`);

// Show data
const rows = db.prepare('SELECT * FROM completion_episodes').all();
console.log('\nEpisodes:');
console.log(JSON.stringify(rows, null, 2));

db.close();
console.log('\nDatabase closed. Data should now be persisted.');
