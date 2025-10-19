/**
 * SQLiteVector MCP Server - Type Definitions
 * Production-ready types for vector database operations
 */

import { z } from 'zod';

// Vector operations
export const VectorSchema = z.object({
  id: z.string().optional(),
  vector: z.array(z.number()),
  metadata: z.record(z.any()).optional(),
  timestamp: z.number().optional(),
});

export type Vector = z.infer<typeof VectorSchema>;

// Database configuration
export const DatabaseConfigSchema = z.object({
  path: z.string(),
  dimensions: z.number().min(1).max(4096),
  metric: z.enum(['euclidean', 'cosine', 'dot']).default('cosine'),
  indexType: z.enum(['flat', 'ivf', 'hnsw']).default('hnsw'),
  efConstruction: z.number().min(4).max(512).default(200),
  efSearch: z.number().min(1).max(512).default(50),
  M: z.number().min(4).max(64).default(16),
});

export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;

// Search configuration
export const SearchConfigSchema = z.object({
  query: z.array(z.number()),
  k: z.number().min(1).max(1000).default(10),
  filter: z.record(z.any()).optional(),
  includeMetadata: z.boolean().default(true),
  includeVectors: z.boolean().default(false),
});

export type SearchConfig = z.infer<typeof SearchConfigSchema>;

// Batch operations
export const BatchInsertSchema = z.object({
  vectors: z.array(VectorSchema),
  batchSize: z.number().min(1).max(10000).default(1000),
});

export type BatchInsert = z.infer<typeof BatchInsertSchema>;

// QUIC synchronization
export const SyncConfigSchema = z.object({
  remoteUrl: z.string().url(),
  mode: z.enum(['push', 'pull', 'bidirectional']).default('bidirectional'),
  compression: z.boolean().default(true),
  encryption: z.boolean().default(true),
  batchSize: z.number().min(1).max(10000).default(1000),
});

export type SyncConfig = z.infer<typeof SyncConfigSchema>;

// Session management
export const SessionSchema = z.object({
  sessionId: z.string(),
  metadata: z.record(z.any()).optional(),
  vectors: z.array(VectorSchema),
  config: DatabaseConfigSchema.partial(),
  timestamp: z.number(),
});

export type Session = z.infer<typeof SessionSchema>;

// Statistics
export interface DatabaseStats {
  vectorCount: number;
  dimensions: number;
  indexType: string;
  metric: string;
  diskSize: number;
  memoryUsage: number;
  lastModified: number;
  averageQueryTime: number;
}

// MCP Tool Parameters
export const ToolParametersSchema = {
  create: DatabaseConfigSchema,
  insert: z.object({
    dbPath: z.string(),
    vector: VectorSchema,
  }),
  insertBatch: z.object({
    dbPath: z.string(),
    vectors: z.array(VectorSchema),
    batchSize: z.number().optional(),
  }),
  search: z.object({
    dbPath: z.string(),
    query: z.array(z.number()),
    k: z.number().optional(),
    filter: z.record(z.any()).optional(),
    includeMetadata: z.boolean().optional(),
    includeVectors: z.boolean().optional(),
  }),
  update: z.object({
    dbPath: z.string(),
    id: z.string(),
    vector: z.array(z.number()).optional(),
    metadata: z.record(z.any()).optional(),
  }),
  delete: z.object({
    dbPath: z.string(),
    id: z.string(),
  }),
  sync: z.object({
    dbPath: z.string(),
    remoteUrl: z.string().url(),
    mode: z.enum(['push', 'pull', 'bidirectional']).optional(),
    compression: z.boolean().optional(),
    encryption: z.boolean().optional(),
  }),
  stats: z.object({
    dbPath: z.string(),
  }),
  saveSession: z.object({
    dbPath: z.string(),
    sessionId: z.string(),
    metadata: z.record(z.any()).optional(),
  }),
  restoreSession: z.object({
    dbPath: z.string(),
    sessionId: z.string(),
  }),
};

export type ToolParameters = {
  [K in keyof typeof ToolParametersSchema]: z.infer<typeof ToolParametersSchema[K]>;
};

// Error types
export class SQLiteVectorError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'SQLiteVectorError';
  }
}

export class DatabaseNotFoundError extends SQLiteVectorError {
  constructor(path: string) {
    super(`Database not found: ${path}`, 'DB_NOT_FOUND', { path });
  }
}

export class InvalidVectorError extends SQLiteVectorError {
  constructor(reason: string, details?: any) {
    super(`Invalid vector: ${reason}`, 'INVALID_VECTOR', details);
  }
}

export class SyncError extends SQLiteVectorError {
  constructor(reason: string, details?: any) {
    super(`Synchronization failed: ${reason}`, 'SYNC_ERROR', details);
  }
}
