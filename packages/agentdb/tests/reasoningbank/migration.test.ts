/**
 * Migration Tests
 *
 * Tests for legacy database migration utilities
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { migrateLegacyDatabase, validateMigration } from '../../src/reasoningbank/migration/migrate';

describe('Migration Utilities', () => {
  const testSourcePath = '.test/legacy-memory.db';
  const testDestPath = '.test/agentdb-migrated.db';

  beforeEach(async () => {
    // Create test legacy database
    await createTestLegacyDatabase(testSourcePath);
  });

  afterEach(async () => {
    const fs = await import('fs/promises');
    try {
      await fs.rm('.test', { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  it('should migrate legacy database successfully', async () => {
    const result = await migrateLegacyDatabase(testSourcePath, testDestPath);

    expect(result.patternsMigrated).toBeGreaterThan(0);
    expect(result.duration).toBeGreaterThan(0);
    expect(result.backupPath).toBeDefined();
    expect(result.errors.length).toBe(0);
  });

  it('should create backup before migration', async () => {
    const result = await migrateLegacyDatabase(testSourcePath, testDestPath);

    const fs = await import('fs/promises');
    const backupExists = await fs.access(result.backupPath)
      .then(() => true)
      .catch(() => false);

    expect(backupExists).toBe(true);
  });

  it('should validate migrated data', async () => {
    await migrateLegacyDatabase(testSourcePath, testDestPath);

    const validation = await validateMigration(testSourcePath, testDestPath);

    expect(validation.valid).toBe(true);
    expect(validation.issues.length).toBe(0);
  });

  it('should handle migration errors gracefully', async () => {
    const invalidPath = '.test/nonexistent.db';

    await expect(
      migrateLegacyDatabase(invalidPath, testDestPath)
    ).rejects.toThrow();
  });
});

/**
 * Create test legacy database
 */
async function createTestLegacyDatabase(path: string): Promise<void> {
  const Database = await import('better-sqlite3');
  const fs = await import('fs/promises');

  // Ensure directory exists
  await fs.mkdir('.test', { recursive: true });

  const db = new (Database.default as any)(path);

  // Create legacy schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS reasoning_patterns (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      domain TEXT NOT NULL,
      pattern_data TEXT NOT NULL,
      confidence REAL NOT NULL,
      usage_count INTEGER DEFAULT 0,
      success_count INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      last_used INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS trajectories (
      id TEXT PRIMARY KEY,
      domain TEXT,
      data TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);

  // Insert test data
  const insertPattern = db.prepare(`
    INSERT INTO reasoning_patterns VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (let i = 0; i < 10; i++) {
    const embedding = new Array(768).fill(0.5 + i * 0.05);
    insertPattern.run(
      `pattern-${i}`,
      'pattern',
      'test',
      JSON.stringify({ embedding, pattern: { index: i } }),
      0.8,
      i,
      i,
      Date.now(),
      Date.now()
    );
  }

  db.close();
}
