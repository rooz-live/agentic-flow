/**
 * Database Connection Module
 * Manages SQLite connection and provides query interface
 */
import { Database } from 'sqlite';
/**
 * Initialize database connection and schema
 */
export declare function initDatabase(): Promise<Database>;
/**
 * Get database instance (initializes if needed)
 */
export declare function getDatabase(): Promise<Database>;
/**
 * Close database connection
 */
export declare function closeDatabase(): Promise<void>;
/**
 * Execute raw SQL query
 */
export declare function query<T = any>(sql: string, params?: any[]): Promise<T[]>;
/**
 * Execute single row query
 */
export declare function queryOne<T = any>(sql: string, params?: any[]): Promise<T | undefined>;
/**
 * Execute insert/update/delete query
 */
export declare function execute(sql: string, params?: any[]): Promise<{
    lastID: number;
    changes: number;
}>;
/**
 * Transaction helper
 */
export declare function transaction<T>(callback: (db: Database) => Promise<T>): Promise<T>;
/**
 * Health check
 */
export declare function healthCheck(): Promise<{
    status: string;
    path: string;
    tables: number;
}>;
//# sourceMappingURL=connection.d.ts.map