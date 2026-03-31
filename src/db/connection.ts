/**
 * Database Connection Module
 * Manages SQLite connection and provides query interface
 */

import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import { promises as fs } from 'fs';

const DB_DIR = path.resolve(__dirname, '../../.db');
const DB_PATH = path.join(DB_DIR, 'yolife.db');
const SCHEMA_PATH = path.resolve(__dirname, 'schema.sql');

let db: Database | null = null;

/**
 * Initialize database connection and schema
 */
export async function initDatabase(): Promise<Database> {
  if (db) {
    return db;
  }

  try {
    // Ensure database directory exists
    await fs.mkdir(DB_DIR, { recursive: true });

    // Open database connection
    db = await open({
      filename: DB_PATH,
      driver: sqlite3.Database
    });

    console.log(`✅ Database connected: ${DB_PATH}`);

    // Enable foreign keys
    await db.exec('PRAGMA foreign_keys = ON;');

    // Load and execute schema
    const schema = await fs.readFile(SCHEMA_PATH, 'utf-8');
    await db.exec(schema);

    console.log('✅ Database schema initialized');

    return db;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

/**
 * Get database instance (initializes if needed)
 */
export async function getDatabase(): Promise<Database> {
  if (!db) {
    return initDatabase();
  }
  return db;
}

/**
 * Close database connection
 */
export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
    console.log('✅ Database connection closed');
  }
}

/**
 * Execute raw SQL query
 */
export async function query<T = any>(sql: string, params?: any[]): Promise<T[]> {
  const database = await getDatabase();
  return database.all<T[]>(sql, params);
}

/**
 * Execute single row query
 */
export async function queryOne<T = any>(sql: string, params?: any[]): Promise<T | undefined> {
  const database = await getDatabase();
  return database.get<T>(sql, params);
}

/**
 * Execute insert/update/delete query
 */
export async function execute(sql: string, params?: any[]): Promise<{ lastID: number; changes: number }> {
  const database = await getDatabase();
  const result = await database.run(sql, params);
  return {
    lastID: result.lastID ?? 0,
    changes: result.changes ?? 0
  };
}

/**
 * Transaction helper
 */
export async function transaction<T>(callback: (db: Database) => Promise<T>): Promise<T> {
  const database = await getDatabase();
  
  try {
    await database.exec('BEGIN TRANSACTION');
    const result = await callback(database);
    await database.exec('COMMIT');
    return result;
  } catch (error) {
    await database.exec('ROLLBACK');
    throw error;
  }
}

/**
 * Health check
 */
export async function healthCheck(): Promise<{ status: string; path: string; tables: number }> {
  try {
    const database = await getDatabase();
    const tables = await database.all<{ count: number }[]>(
      "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'"
    );
    
    return {
      status: 'connected',
      path: DB_PATH,
      tables: tables[0].count
    };
  } catch (error) {
    return {
      status: 'error',
      path: DB_PATH,
      tables: 0
    };
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeDatabase();
  process.exit(0);
});
