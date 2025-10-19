/**
 * SQLiteVector - Main Export
 *
 * Ultra-fast SQLite vector database for agentic systems
 * with QUIC synchronization and ReasoningBank integration
 */

// Main database class
export { SqliteVectorDB } from './sqlite-vector-db';

// Configuration
export { ConfigBuilder, createConfig, Presets, loadConfig, validateConfig } from './config';

// Types
export * from './types';

// Re-export for convenience
import { createConfig, Presets } from './config';
import { SqliteVectorDB } from './sqlite-vector-db';

export default {
  SqliteVectorDB,
  createConfig,
  Presets,
};
