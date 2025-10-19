/**
 * SQLiteVector MCP Server - Resource Handlers
 * MCP resources for database introspection and monitoring
 */

import { DatabaseRegistry } from './database.js';

export class ResourceHandler {
  constructor(private registry: DatabaseRegistry) {}

  /**
   * List all available resources
   */
  async listResources() {
    return {
      resources: [
        {
          uri: 'sqlite-vector://databases',
          name: 'Active Databases',
          description: 'List all active vector databases',
          mimeType: 'application/json',
        },
        {
          uri: 'sqlite-vector://stats/{dbPath}',
          name: 'Database Statistics',
          description: 'Comprehensive statistics for a specific database',
          mimeType: 'application/json',
        },
        {
          uri: 'sqlite-vector://health',
          name: 'Health Status',
          description: 'MCP server health and performance metrics',
          mimeType: 'application/json',
        },
      ],
    };
  }

  /**
   * Read a specific resource
   */
  async readResource(uri: string) {
    const url = new URL(uri);

    switch (url.protocol) {
      case 'sqlite-vector:':
        return this.handleSQLiteVectorResource(url);
      default:
        throw new Error(`Unsupported protocol: ${url.protocol}`);
    }
  }

  private async handleSQLiteVectorResource(url: URL) {
    const path = url.pathname.replace(/^\/\//, '');

    switch (path) {
      case 'databases':
        return this.listDatabases();

      case 'health':
        return this.getHealthStatus();

      default:
        // Handle stats/{dbPath}
        if (path.startsWith('stats/')) {
          const dbPath = path.substring(6);
          return this.getDatabaseStats(dbPath);
        }
        throw new Error(`Unknown resource path: ${path}`);
    }
  }

  /**
   * List all active databases
   */
  private async listDatabases() {
    const databases: Array<{
      path: string;
      vectorCount: number;
      dimensions: number;
      lastAccessed: number;
    }> = [];

    // Note: In production, track database metadata in registry
    // This is a simplified implementation

    return {
      contents: [
        {
          uri: 'sqlite-vector://databases',
          mimeType: 'application/json',
          text: JSON.stringify({
            databases,
            total: databases.length,
            timestamp: Date.now(),
          }, null, 2),
        },
      ],
    };
  }

  /**
   * Get comprehensive database statistics
   */
  private async getDatabaseStats(dbPath: string) {
    const db = this.registry.get(dbPath);

    if (!db) {
      throw new Error(`Database not found: ${dbPath}`);
    }

    const stats = await db.getStats();

    return {
      contents: [
        {
          uri: `sqlite-vector://stats/${dbPath}`,
          mimeType: 'application/json',
          text: JSON.stringify({
            database: dbPath,
            stats,
            timestamp: Date.now(),
          }, null, 2),
        },
      ],
    };
  }

  /**
   * Get MCP server health status
   */
  private async getHealthStatus() {
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();

    return {
      contents: [
        {
          uri: 'sqlite-vector://health',
          mimeType: 'application/json',
          text: JSON.stringify({
            status: 'healthy',
            uptime: uptime,
            memory: {
              heapUsed: memoryUsage.heapUsed,
              heapTotal: memoryUsage.heapTotal,
              external: memoryUsage.external,
              rss: memoryUsage.rss,
            },
            process: {
              pid: process.pid,
              version: process.version,
              platform: process.platform,
            },
            timestamp: Date.now(),
          }, null, 2),
        },
      ],
    };
  }
}
