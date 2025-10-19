/**
 * SQLiteVector MCP Server - Main Server Implementation
 * Production-ready MCP server for Claude Code integration
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { DatabaseRegistry, SQLiteVectorDB } from './database.js';
import { ResourceHandler } from './resources.js';
import { tools } from './tools.js';
import { ToolParametersSchema, DatabaseConfig } from './types.js';

export class SQLiteVectorMCPServer {
  private server: Server;
  private registry: DatabaseRegistry;
  private resourceHandler: ResourceHandler;

  constructor() {
    this.registry = new DatabaseRegistry();
    this.resourceHandler = new ResourceHandler(this.registry);

    this.server = new Server(
      {
        name: 'sqlite-vector-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    this.setupHandlers();
    this.setupErrorHandlers();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools,
    }));

    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () =>
      this.resourceHandler.listResources()
    );

    // Read resource
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) =>
      this.resourceHandler.readResource(request.params.uri)
    );

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'sqlite_vector_create':
            return await this.handleCreate(args);

          case 'sqlite_vector_insert':
            return await this.handleInsert(args);

          case 'sqlite_vector_insert_batch':
            return await this.handleInsertBatch(args);

          case 'sqlite_vector_search':
            return await this.handleSearch(args);

          case 'sqlite_vector_update':
            return await this.handleUpdate(args);

          case 'sqlite_vector_delete':
            return await this.handleDelete(args);

          case 'sqlite_vector_sync':
            return await this.handleSync(args);

          case 'sqlite_vector_stats':
            return await this.handleStats(args);

          case 'sqlite_vector_save_session':
            return await this.handleSaveSession(args);

          case 'sqlite_vector_restore_session':
            return await this.handleRestoreSession(args);

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                error: errorMessage,
                tool: name,
                timestamp: Date.now(),
              }, null, 2),
            },
          ],
          isError: true,
        };
      }
    });
  }

  private setupErrorHandlers() {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.cleanup();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await this.cleanup();
      process.exit(0);
    });
  }

  private async handleCreate(args: any) {
    const params = ToolParametersSchema.create.parse(args);
    const db = await this.registry.getOrCreate(params);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            database: params.path,
            config: params,
            message: 'Vector database created successfully',
          }, null, 2),
        },
      ],
    };
  }

  private async handleInsert(args: any) {
    const params = ToolParametersSchema.insert.parse(args);
    const config: DatabaseConfig = {
      path: params.dbPath,
      dimensions: params.vector.vector.length,
      metric: 'cosine',
      indexType: 'hnsw',
    };

    const db = await this.registry.getOrCreate(config);
    const id = await db.insert(params.vector);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            id,
            message: 'Vector inserted successfully',
          }, null, 2),
        },
      ],
    };
  }

  private async handleInsertBatch(args: any) {
    const params = ToolParametersSchema.insertBatch.parse(args);
    const config: DatabaseConfig = {
      path: params.dbPath,
      dimensions: params.vectors[0].vector.length,
      metric: 'cosine',
      indexType: 'hnsw',
    };

    const db = await this.registry.getOrCreate(config);
    const ids = await db.insertBatch(params.vectors, params.batchSize);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            inserted: ids.length,
            ids,
            message: `${ids.length} vectors inserted successfully`,
          }, null, 2),
        },
      ],
    };
  }

  private async handleSearch(args: any) {
    const params = ToolParametersSchema.search.parse(args);
    const config: DatabaseConfig = {
      path: params.dbPath,
      dimensions: params.query.length,
      metric: 'cosine',
      indexType: 'hnsw',
    };

    const db = await this.registry.getOrCreate(config);
    const results = await db.search({
      query: params.query,
      k: params.k || 10,
      filter: params.filter,
      includeMetadata: params.includeMetadata ?? true,
      includeVectors: params.includeVectors ?? false,
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            results,
            count: results.length,
            message: `Found ${results.length} similar vectors`,
          }, null, 2),
        },
      ],
    };
  }

  private async handleUpdate(args: any) {
    const params = ToolParametersSchema.update.parse(args);
    const db = this.registry.get(params.dbPath);

    if (!db) {
      throw new Error(`Database not found: ${params.dbPath}`);
    }

    await db.update(params.id, params.vector, params.metadata);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            id: params.id,
            message: 'Vector updated successfully',
          }, null, 2),
        },
      ],
    };
  }

  private async handleDelete(args: any) {
    const params = ToolParametersSchema.delete.parse(args);
    const db = this.registry.get(params.dbPath);

    if (!db) {
      throw new Error(`Database not found: ${params.dbPath}`);
    }

    await db.delete(params.id);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            id: params.id,
            message: 'Vector deleted successfully',
          }, null, 2),
        },
      ],
    };
  }

  private async handleSync(args: any) {
    const params = ToolParametersSchema.sync.parse(args);
    const db = this.registry.get(params.dbPath);

    if (!db) {
      throw new Error(`Database not found: ${params.dbPath}`);
    }

    const result = await db.sync({
      remoteUrl: params.remoteUrl,
      mode: params.mode || 'bidirectional',
      compression: params.compression ?? true,
      encryption: params.encryption ?? true,
      batchSize: 1000,
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            ...result,
            message: 'Synchronization completed',
          }, null, 2),
        },
      ],
    };
  }

  private async handleStats(args: any) {
    const params = ToolParametersSchema.stats.parse(args);
    const db = this.registry.get(params.dbPath);

    if (!db) {
      throw new Error(`Database not found: ${params.dbPath}`);
    }

    const stats = await db.getStats();

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            stats,
            message: 'Statistics retrieved successfully',
          }, null, 2),
        },
      ],
    };
  }

  private async handleSaveSession(args: any) {
    const params = ToolParametersSchema.saveSession.parse(args);
    const db = this.registry.get(params.dbPath);

    if (!db) {
      throw new Error(`Database not found: ${params.dbPath}`);
    }

    await db.saveSession(params.sessionId, params.metadata);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            sessionId: params.sessionId,
            message: 'Session saved successfully',
          }, null, 2),
        },
      ],
    };
  }

  private async handleRestoreSession(args: any) {
    const params = ToolParametersSchema.restoreSession.parse(args);
    const db = this.registry.get(params.dbPath);

    if (!db) {
      throw new Error(`Database not found: ${params.dbPath}`);
    }

    const session = await db.restoreSession(params.sessionId);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            session: {
              sessionId: session.sessionId,
              vectorCount: session.vectors.length,
              metadata: session.metadata,
              timestamp: session.timestamp,
            },
            message: 'Session restored successfully',
          }, null, 2),
        },
      ],
    };
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('SQLiteVector MCP Server started');
  }

  async cleanup() {
    console.error('Shutting down SQLiteVector MCP Server...');
    this.registry.closeAll();
    await this.server.close();
  }
}
