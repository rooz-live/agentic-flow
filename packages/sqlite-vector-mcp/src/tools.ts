/**
 * SQLiteVector MCP Server - Tool Definitions
 * MCP tools for vector database operations
 */

import { z } from 'zod';
import { ToolParametersSchema } from './types.js';

export const tools = [
  {
    name: 'sqlite_vector_create',
    description: 'Create a new SQLite vector database with specified configuration. Supports multiple distance metrics (euclidean, cosine, dot) and index types (flat, ivf, hnsw).',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Database file path (e.g., ./data/vectors.db)',
        },
        dimensions: {
          type: 'number',
          description: 'Vector dimensions (1-4096)',
          minimum: 1,
          maximum: 4096,
        },
        metric: {
          type: 'string',
          enum: ['euclidean', 'cosine', 'dot'],
          description: 'Distance metric for similarity search',
          default: 'cosine',
        },
        indexType: {
          type: 'string',
          enum: ['flat', 'ivf', 'hnsw'],
          description: 'Index type for search optimization',
          default: 'hnsw',
        },
        efConstruction: {
          type: 'number',
          description: 'HNSW index construction parameter (4-512)',
          minimum: 4,
          maximum: 512,
          default: 200,
        },
        efSearch: {
          type: 'number',
          description: 'HNSW search parameter (1-512)',
          minimum: 1,
          maximum: 512,
          default: 50,
        },
        M: {
          type: 'number',
          description: 'HNSW M parameter (4-64)',
          minimum: 4,
          maximum: 64,
          default: 16,
        },
      },
      required: ['path', 'dimensions'],
    },
  },
  {
    name: 'sqlite_vector_insert',
    description: 'Insert a single vector into the database with optional metadata. Returns the vector ID.',
    inputSchema: {
      type: 'object',
      properties: {
        dbPath: {
          type: 'string',
          description: 'Database file path',
        },
        vector: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Optional vector ID (auto-generated if not provided)',
            },
            vector: {
              type: 'array',
              items: { type: 'number' },
              description: 'Vector values (must match database dimensions)',
            },
            metadata: {
              type: 'object',
              description: 'Optional metadata as key-value pairs',
            },
            timestamp: {
              type: 'number',
              description: 'Optional timestamp (auto-generated if not provided)',
            },
          },
          required: ['vector'],
        },
      },
      required: ['dbPath', 'vector'],
    },
  },
  {
    name: 'sqlite_vector_insert_batch',
    description: 'Insert multiple vectors in batch for better performance. Supports up to 10,000 vectors per batch with transaction optimization.',
    inputSchema: {
      type: 'object',
      properties: {
        dbPath: {
          type: 'string',
          description: 'Database file path',
        },
        vectors: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              vector: {
                type: 'array',
                items: { type: 'number' },
              },
              metadata: { type: 'object' },
              timestamp: { type: 'number' },
            },
            required: ['vector'],
          },
          description: 'Array of vectors to insert',
        },
        batchSize: {
          type: 'number',
          description: 'Batch size for transaction optimization (1-10000)',
          minimum: 1,
          maximum: 10000,
          default: 1000,
        },
      },
      required: ['dbPath', 'vectors'],
    },
  },
  {
    name: 'sqlite_vector_search',
    description: 'Perform k-nearest neighbor search to find similar vectors. Supports metadata filtering and configurable result details.',
    inputSchema: {
      type: 'object',
      properties: {
        dbPath: {
          type: 'string',
          description: 'Database file path',
        },
        query: {
          type: 'array',
          items: { type: 'number' },
          description: 'Query vector (must match database dimensions)',
        },
        k: {
          type: 'number',
          description: 'Number of nearest neighbors to return (1-1000)',
          minimum: 1,
          maximum: 1000,
          default: 10,
        },
        filter: {
          type: 'object',
          description: 'Optional metadata filter (key-value pairs)',
        },
        includeMetadata: {
          type: 'boolean',
          description: 'Include metadata in results',
          default: true,
        },
        includeVectors: {
          type: 'boolean',
          description: 'Include vector values in results',
          default: false,
        },
      },
      required: ['dbPath', 'query'],
    },
  },
  {
    name: 'sqlite_vector_update',
    description: 'Update an existing vector by ID. Can update vector values, metadata, or both.',
    inputSchema: {
      type: 'object',
      properties: {
        dbPath: {
          type: 'string',
          description: 'Database file path',
        },
        id: {
          type: 'string',
          description: 'Vector ID to update',
        },
        vector: {
          type: 'array',
          items: { type: 'number' },
          description: 'New vector values (optional)',
        },
        metadata: {
          type: 'object',
          description: 'New metadata (optional)',
        },
      },
      required: ['dbPath', 'id'],
    },
  },
  {
    name: 'sqlite_vector_delete',
    description: 'Delete a vector by ID from the database.',
    inputSchema: {
      type: 'object',
      properties: {
        dbPath: {
          type: 'string',
          description: 'Database file path',
        },
        id: {
          type: 'string',
          description: 'Vector ID to delete',
        },
      },
      required: ['dbPath', 'id'],
    },
  },
  {
    name: 'sqlite_vector_sync',
    description: 'Synchronize database with remote server using QUIC protocol. Supports push, pull, and bidirectional sync with optional compression and encryption.',
    inputSchema: {
      type: 'object',
      properties: {
        dbPath: {
          type: 'string',
          description: 'Database file path',
        },
        remoteUrl: {
          type: 'string',
          description: 'Remote QUIC server URL',
        },
        mode: {
          type: 'string',
          enum: ['push', 'pull', 'bidirectional'],
          description: 'Synchronization mode',
          default: 'bidirectional',
        },
        compression: {
          type: 'boolean',
          description: 'Enable compression',
          default: true,
        },
        encryption: {
          type: 'boolean',
          description: 'Enable encryption',
          default: true,
        },
      },
      required: ['dbPath', 'remoteUrl'],
    },
  },
  {
    name: 'sqlite_vector_stats',
    description: 'Get comprehensive database statistics including vector count, disk size, memory usage, and query performance metrics.',
    inputSchema: {
      type: 'object',
      properties: {
        dbPath: {
          type: 'string',
          description: 'Database file path',
        },
      },
      required: ['dbPath'],
    },
  },
  {
    name: 'sqlite_vector_save_session',
    description: 'Save current database state as a named session for later restoration. Includes all vectors and metadata.',
    inputSchema: {
      type: 'object',
      properties: {
        dbPath: {
          type: 'string',
          description: 'Database file path',
        },
        sessionId: {
          type: 'string',
          description: 'Unique session identifier',
        },
        metadata: {
          type: 'object',
          description: 'Optional session metadata',
        },
      },
      required: ['dbPath', 'sessionId'],
    },
  },
  {
    name: 'sqlite_vector_restore_session',
    description: 'Restore database state from a previously saved session. Replaces current vectors with session data.',
    inputSchema: {
      type: 'object',
      properties: {
        dbPath: {
          type: 'string',
          description: 'Database file path',
        },
        sessionId: {
          type: 'string',
          description: 'Session identifier to restore',
        },
      },
      required: ['dbPath', 'sessionId'],
    },
  },
] as const;

export type ToolName = typeof tools[number]['name'];
