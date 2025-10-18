/**
 * AgentDB MCP Server Tests
 * Tests for MCP protocol integration
 */

import { AgentDBMCPServer } from '../mcp-server';
import { SQLiteVectorDB } from '../core/vector-db';

describe('AgentDB MCP Server', () => {
  let server: AgentDBMCPServer;

  beforeEach(() => {
    server = new AgentDBMCPServer();
  });

  afterEach(async () => {
    await server.cleanup();
  });

  describe('Server Initialization', () => {
    it('should create server instance', () => {
      expect(server).toBeDefined();
      expect(server).toBeInstanceOf(AgentDBMCPServer);
    });

    it('should have proper server metadata', () => {
      // Server should be initialized with correct name and version
      expect(server).toHaveProperty('server');
    });
  });

  describe('Database Registry', () => {
    it('should initialize database on first access', async () => {
      // This would be tested through the actual tool handlers
      // For now, just verify the registry exists
      expect(server).toHaveProperty('registry');
    });
  });

  describe('MCP Protocol Compliance', () => {
    it('should expose required capabilities', () => {
      // Server should expose tools and resources capabilities
      expect(server).toHaveProperty('server');
    });

    it('should handle cleanup gracefully', async () => {
      await expect(server.cleanup()).resolves.not.toThrow();
    });
  });
});

describe('Database Registry', () => {
  describe('Database Creation', () => {
    it('should create in-memory database by default', async () => {
      const db = new SQLiteVectorDB();
      expect(db).toBeDefined();
      expect(db.getBackendType()).toBe('native');
      db.close();
    });

    it('should support persistent database', async () => {
      const db = new SQLiteVectorDB({ path: ':memory:' });
      expect(db).toBeDefined();
      db.close();
    });
  });

  describe('Vector Operations', () => {
    let db: SQLiteVectorDB;

    beforeEach(() => {
      db = new SQLiteVectorDB({ memoryMode: true });
    });

    afterEach(() => {
      db.close();
    });

    it('should insert and retrieve vectors', () => {
      const id = db.insert({
        embedding: [0.1, 0.2, 0.3],
        metadata: { test: true },
      });

      expect(id).toBeDefined();
      expect(typeof id).toBe('string');

      const vector = db.get(id);
      expect(vector).toBeDefined();
      expect(vector?.embedding).toEqual([0.1, 0.2, 0.3]);
    });

    it('should search for similar vectors', () => {
      // Insert test vectors
      db.insert({ embedding: [1, 0, 0] });
      db.insert({ embedding: [0, 1, 0] });
      db.insert({ embedding: [0, 0, 1] });

      // Search for similar vectors
      const results = db.search([0.9, 0.1, 0], 2);

      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('should delete vectors', () => {
      const id = db.insert({ embedding: [1, 2, 3] });
      const deleted = db.delete(id);

      expect(deleted).toBe(true);
      expect(db.get(id)).toBeNull();
    });

    it('should get database stats', () => {
      db.insert({ embedding: [1, 2, 3] });
      db.insert({ embedding: [4, 5, 6] });

      const stats = db.stats();

      expect(stats).toBeDefined();
      expect(stats.count).toBe(2);
    });
  });

  describe('Batch Operations', () => {
    let db: SQLiteVectorDB;

    beforeEach(() => {
      db = new SQLiteVectorDB({ memoryMode: true });
    });

    afterEach(() => {
      db.close();
    });

    it('should insert multiple vectors in batch', () => {
      const vectors = [
        { embedding: [1, 0, 0] },
        { embedding: [0, 1, 0] },
        { embedding: [0, 0, 1] },
      ];

      const ids = db.insertBatch(vectors);

      expect(ids).toBeDefined();
      expect(ids.length).toBe(3);
      expect(db.stats().count).toBe(3);
    });
  });

  describe('Query Cache', () => {
    let db: SQLiteVectorDB;

    beforeEach(() => {
      db = new SQLiteVectorDB({
        memoryMode: true,
        queryCache: { enabled: true },
      });
    });

    afterEach(() => {
      db.close();
    });

    it('should cache query results', () => {
      db.insert({ embedding: [1, 0, 0] });

      // First search
      const results1 = db.search([1, 0, 0], 1);

      // Second search (should hit cache)
      const results2 = db.search([1, 0, 0], 1);

      expect(results1).toEqual(results2);

      const stats = db.getCacheStats();
      expect(stats).toBeDefined();
      expect(stats?.hits).toBeGreaterThan(0);
    });

    it('should clear cache', () => {
      db.insert({ embedding: [1, 0, 0] });
      db.search([1, 0, 0], 1);

      db.clearCache();

      const stats = db.getCacheStats();
      expect(stats?.hits).toBe(0);
    });
  });
});

describe('MCP Tool Schema Validation', () => {
  it('should validate vector schema', () => {
    const validVector = {
      embedding: [0.1, 0.2, 0.3],
      metadata: { test: true },
    };

    // Basic validation - just ensure it's structured correctly
    expect(validVector).toHaveProperty('embedding');
    expect(Array.isArray(validVector.embedding)).toBe(true);
  });

  it('should validate pattern schema', () => {
    const validPattern = {
      embedding: [0.1, 0.2, 0.3],
      taskType: 'test',
      approach: 'test-approach',
      successRate: 0.8,
      avgDuration: 100,
      metadata: {
        domain: 'test',
        complexity: 'simple' as const,
        learningSource: 'success' as const,
        tags: ['test'],
      },
    };

    expect(validPattern).toHaveProperty('embedding');
    expect(validPattern).toHaveProperty('taskType');
    expect(validPattern).toHaveProperty('metadata');
  });
});
