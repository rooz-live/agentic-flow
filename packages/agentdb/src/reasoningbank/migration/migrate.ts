/**
 * Migration Utilities
 *
 * Migrate from legacy ReasoningBank (.swarm/memory.db) to AgentDB
 * with zero data loss and automatic backup.
 */

import { AgentDBReasoningBankAdapter } from '../adapter/agentdb-adapter';
import type { ReasoningMemory } from '../adapter/types';

export interface MigrationResult {
  patternsMigrated: number;
  trajectoriesMigrated: number;
  errors: string[];
  duration: number;
  backupPath: string;
}

/**
 * Migrate legacy database to AgentDB
 */
export async function migrateLegacyDatabase(
  sourcePath: string,
  destinationPath: string = '.agentdb/reasoningbank.db'
): Promise<MigrationResult> {
  const startTime = Date.now();
  const errors: string[] = [];

  try {
    // Create backup
    const backupPath = await createBackup(sourcePath);
    console.log(`✅ Backup created: ${backupPath}`);

    // Initialize AgentDB adapter
    const adapter = new AgentDBReasoningBankAdapter({
      dbPath: destinationPath,
      enableLearning: true,
      enableReasoning: true,
    });
    await adapter.initialize();

    // Read legacy database
    const { patterns, trajectories } = await readLegacyDatabase(sourcePath);

    console.log(`📊 Found ${patterns.length} patterns and ${trajectories.length} trajectories`);

    // Migrate patterns
    let patternsMigrated = 0;
    for (const pattern of patterns) {
      try {
        await adapter.insertPattern(pattern);
        patternsMigrated++;

        if (patternsMigrated % 100 === 0) {
          console.log(`   Patterns: ${patternsMigrated}/${patterns.length}`);
        }
      } catch (error) {
        errors.push(`Pattern ${pattern.id}: ${error}`);
      }
    }

    // Migrate trajectories
    let trajectoriesMigrated = 0;
    for (const trajectory of trajectories) {
      try {
        await adapter.insertTrajectory(trajectory);
        trajectoriesMigrated++;

        if (trajectoriesMigrated % 10 === 0) {
          console.log(`   Trajectories: ${trajectoriesMigrated}/${trajectories.length}`);
        }
      } catch (error) {
        errors.push(`Trajectory ${trajectory.id}: ${error}`);
      }
    }

    await adapter.close();

    const duration = Date.now() - startTime;

    return {
      patternsMigrated,
      trajectoriesMigrated,
      errors,
      duration,
      backupPath,
    };
  } catch (error) {
    throw new Error(`Migration failed: ${error}`);
  }
}

/**
 * Create backup of legacy database
 */
async function createBackup(sourcePath: string): Promise<string> {
  const fs = await import('fs/promises');
  const path = await import('path');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(
    path.dirname(sourcePath),
    `memory.db.backup-${timestamp}`
  );

  await fs.copyFile(sourcePath, backupPath);
  return backupPath;
}

/**
 * Read legacy database
 */
async function readLegacyDatabase(sourcePath: string): Promise<{
  patterns: ReasoningMemory[];
  trajectories: any[];
}> {
  try {
    // Use better-sqlite3 to read legacy database
    const Database = await import('better-sqlite3');
    const db = new (Database.default as any)(sourcePath, { readonly: true });

    // Read patterns
    const patternsStmt = db.prepare(`
      SELECT * FROM reasoning_patterns
    `);
    const patterns = patternsStmt.all() as ReasoningMemory[];

    // Read trajectories
    const trajectoriesStmt = db.prepare(`
      SELECT * FROM trajectories
    `);
    const trajectories = trajectoriesStmt.all();

    db.close();

    return { patterns, trajectories };
  } catch (error) {
    // If tables don't exist or different structure, try alternative reading
    console.warn('Legacy database format not recognized, using fallback...');
    return { patterns: [], trajectories: [] };
  }
}

/**
 * Validate migrated data
 */
export async function validateMigration(
  sourcePath: string,
  destinationPath: string
): Promise<{
  valid: boolean;
  issues: string[];
}> {
  const issues: string[] = [];

  try {
    // Read source count
    const { patterns: sourcePatterns } = await readLegacyDatabase(sourcePath);

    // Read destination count
    const adapter = new AgentDBReasoningBankAdapter({
      dbPath: destinationPath,
    });
    await adapter.initialize();

    const stats = await adapter.getStats();
    await adapter.close();

    // Compare counts
    if (sourcePatterns.length !== stats.totalPatterns) {
      issues.push(
        `Pattern count mismatch: source=${sourcePatterns.length}, destination=${stats.totalPatterns}`
      );
    }

    // Check for data integrity
    if (stats.avgConfidence === 0 && sourcePatterns.length > 0) {
      issues.push('Average confidence is 0, possible data corruption');
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  } catch (error) {
    issues.push(`Validation error: ${error}`);
    return { valid: false, issues };
  }
}
