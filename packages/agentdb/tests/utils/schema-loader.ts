/**
 * Schema Loader Utility
 *
 * Centralized schema loading for test environments.
 * Resolves schemas from package root regardless of compiled vs. source context.
 */

import * as fs from 'fs';
import * as path from 'path';
import type Database from 'better-sqlite3';

export interface SchemaLoaderOptions {
  /**
   * Base directory to search for schemas.
   * Defaults to package root (../../ from compiled test location).
   */
  baseDir?: string;

  /**
   * Whether to throw if schema files are missing.
   * Default: true
   */
  throwOnMissing?: boolean;

  /**
   * Additional schema files to load (relative to baseDir/src/schemas/).
   * Default: ['schema.sql', 'frontier-schema.sql']
   */
  schemas?: string[];
}

/**
 * Loads AgentDB schemas into a database instance.
 *
 * Attempts multiple resolution strategies:
 * 1. Relative to process.cwd() (for source context)
 * 2. Relative to __dirname (for compiled context)
 * 3. Relative to package root (fallback)
 *
 * @param db - better-sqlite3 database instance
 * @param options - Configuration options
 * @throws Error if schema files not found and throwOnMissing=true
 */
export function loadSchemas(
  db: Database.Database,
  options: SchemaLoaderOptions = {}
): void {
  const {
    baseDir,
    throwOnMissing = true,
    schemas = ['schema.sql', 'frontier-schema.sql'],
  } = options;

  const resolutionStrategies = [
    // Strategy 1: Relative to process.cwd() (source context)
    () => process.cwd(),

    // Strategy 2: Relative to __dirname (compiled context)
    () => path.join(__dirname, '../../../'),

    // Strategy 3: Explicit baseDir if provided
    ...(baseDir ? [() => baseDir] : []),
  ];

  const schemaDir = 'src/schemas';
  const loadedSchemas: string[] = [];
  const missingSchemas: string[] = [];

  for (const schemaFile of schemas) {
    let schemaLoaded = false;

    for (const getBaseDir of resolutionStrategies) {
      const base = getBaseDir();
      const schemaPath = path.join(base, schemaDir, schemaFile);

      if (fs.existsSync(schemaPath)) {
        try {
          const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
          db.exec(schemaContent);
          loadedSchemas.push(schemaPath);
          schemaLoaded = true;
          break; // Success - move to next schema
        } catch (error) {
          // Schema file exists but failed to execute
          if (throwOnMissing) {
            throw new Error(
              `Failed to execute schema ${schemaFile}: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        }
      }
    }

    if (!schemaLoaded) {
      missingSchemas.push(schemaFile);
    }
  }

  // Report results
  if (missingSchemas.length > 0 && throwOnMissing) {
    throw new Error(
      `Schema files not found: ${missingSchemas.join(', ')}. ` +
      `Tried resolution strategies: cwd=${process.cwd()}, __dirname=${__dirname}`
    );
  }

  if (loadedSchemas.length === 0 && schemas.length > 0) {
    console.warn(
      `⚠️  No schemas loaded. Expected: ${schemas.join(', ')}`
    );
  } else {
    console.log(
      `✅ Loaded ${loadedSchemas.length} schema(s): ${loadedSchemas.map(p => path.basename(p)).join(', ')}`
    );
  }
}

/**
 * Validates that expected tables exist in the database.
 *
 * @param db - better-sqlite3 database instance
 * @param expectedTables - Array of table names to validate
 * @returns Array of missing table names
 */
export function validateTables(
  db: Database.Database,
  expectedTables: string[]
): string[] {
  const missingTables: string[] = [];

  for (const tableName of expectedTables) {
    const result = db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
      )
      .get(tableName);

    if (!result) {
      missingTables.push(tableName);
    }
  }

  return missingTables;
}

/**
 * Loads schemas and validates expected tables.
 *
 * Convenience function that combines loadSchemas + validateTables.
 *
 * @param db - better-sqlite3 database instance
 * @param options - Schema loader options
 * @param expectedTables - Tables to validate (default: ['episodes'])
 * @throws Error if tables missing after schema load
 */
export function loadAndValidateSchemas(
  db: Database.Database,
  options: SchemaLoaderOptions = {},
  expectedTables: string[] = ['episodes']
): void {
  loadSchemas(db, options);

  const missingTables = validateTables(db, expectedTables);
  if (missingTables.length > 0) {
    throw new Error(
      `Schema validation failed. Missing tables: ${missingTables.join(', ')}`
    );
  }

  console.log(
    `✅ Schema validation passed. Found tables: ${expectedTables.join(', ')}`
  );
}
