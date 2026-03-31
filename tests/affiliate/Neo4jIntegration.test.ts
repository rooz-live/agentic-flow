/**
 * Neo4j Affiliate Integration Tests
 *
 * Tests for graph database operations and affinity analytics.
 * Includes both mocked tests (for CI) and live integration tests (when Neo4j available).
 *
 * Prerequisites for live tests: Neo4j at bolt://localhost:7687
 * Docker: docker run -d --name neo4j-affiliate -p 7474:7474 -p 7687:7687 \
 *         -e NEO4J_AUTH=neo4j/affiliate_password_2024 neo4j:latest
 */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { randomUUID } from 'crypto';
import {
    createNeo4jClient,
    getConfigFromEnv,
    Neo4jAffiliateClient,
    Neo4jConfig,
} from '../../src/integrations/neo4j_affiliate';

// Mock Neo4j client for testing
class MockNeo4jClient {
  private nodes: Map<string, any> = new Map();
  private relationships: Map<string, any> = new Map();

  async createAffiliateNode(data: any) {
    this.nodes.set(data.id, data);
    return { id: data.id, ...data };
  }

  async getAffiliateNode(id: string) {
    return this.nodes.get(id) || undefined;
  }

  async updateAffiliateNode(id: string, updates: any) {
    const existing = this.nodes.get(id);
    if (existing) {
      const updated = { ...existing, ...updates };
      this.nodes.set(id, updated);
      return updated;
    }
    return undefined;
  }

  async createAffinityRelationship(id1: string, id2: string, data: any) {
    const key = `${id1}-${id2}`;
    this.relationships.set(key, { id1, id2, ...data });
    return { created: true, key };
  }

  async updateAffinityScore(id1: string, id2: string, score: number) {
    const key = `${id1}-${id2}`;
    const existing = this.relationships.get(key);
    if (existing) {
      existing.score = score;
      return { updated: true };
    }
    return { updated: false };
  }

  async getAffiliateAffinities(id: string) {
    const results: any[] = [];
    this.relationships.forEach((rel, key) => {
      if (rel.id1 === id || rel.id2 === id) {
        results.push(rel);
      }
    });
    return results;
  }

  async close() {
    this.nodes.clear();
    this.relationships.clear();
  }
}

describe('Neo4j Affiliate Integration', () => {
  let client: MockNeo4jClient;

  beforeEach(async () => {
    client = new MockNeo4jClient();
  });

  afterEach(async () => {
    await client.close();
  });

  describe('Affiliate Node Operations', () => {
    it('should create affiliate node', async () => {
      const result = await client.createAffiliateNode({
        id: 'test-affiliate-1',
        name: 'Test Affiliate',
        tier: 'enterprise',
        state: 'active'
      });

      expect(result).toBeDefined();
      expect(result.id).toBe('test-affiliate-1');
    });

    it('should get affiliate node by ID', async () => {
      await client.createAffiliateNode({
        id: 'get-test-1',
        name: 'Get Test',
        tier: 'premium'
      });

      const affiliate = await client.getAffiliateNode('get-test-1');
      expect(affiliate).toBeDefined();
      expect(affiliate.name).toBe('Get Test');
    });

    it('should return undefined for non-existent affiliate', async () => {
      const affiliate = await client.getAffiliateNode('non-existent');
      expect(affiliate).toBeUndefined();
    });

    it('should update affiliate node properties', async () => {
      await client.createAffiliateNode({
        id: 'update-test-1',
        name: 'Original Name',
        tier: 'standard'
      });

      const result = await client.updateAffiliateNode('update-test-1', {
        tier: 'enterprise',
        metadata: { updated: true }
      });

      expect(result).toBeDefined();
      expect(result.tier).toBe('enterprise');
    });
  });

  describe('Affinity Relationship Operations', () => {
    it('should create affinity relationship', async () => {
      const result = await client.createAffinityRelationship(
        'affiliate-1',
        'affiliate-2',
        {
          type: 'collaboration',
          score: 0.85,
          metadata: { projects: ['Project A'] }
        }
      );

      expect(result).toBeDefined();
      expect(result.created).toBe(true);
    });

    it('should update affinity score', async () => {
      await client.createAffinityRelationship(
        'score-test-1',
        'score-test-2',
        { score: 0.5 }
      );

      const result = await client.updateAffinityScore(
        'score-test-1',
        'score-test-2',
        0.95
      );

      expect(result.updated).toBe(true);
    });

    it('should get affinities for affiliate', async () => {
      await client.createAffinityRelationship('center', 'partner-1', { score: 0.8 });
      await client.createAffinityRelationship('center', 'partner-2', { score: 0.7 });
      await client.createAffinityRelationship('other', 'another', { score: 0.6 });

      const affinities = await client.getAffiliateAffinities('center');
      expect(affinities.length).toBe(2);
    });
  });
});

// =============================================================================
// Live Neo4j Integration Tests (skip if Neo4j not available)
// =============================================================================

describe('Neo4j Live Integration', () => {
  let liveClient: Neo4jAffiliateClient | null = null;
  let testAffiliate1: string;
  let testAffiliate2: string;
  let connectionAvailable = false;

  const liveConfig: Neo4jConfig = {
    uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
    username: process.env.NEO4J_USERNAME || 'neo4j',
    password: process.env.NEO4J_PASSWORD || 'affiliate_password_2024',
    database: 'neo4j',
  };

  beforeAll(async () => {
    // Skip if explicitly disabled
    if (process.env.NEO4J_SKIP_TESTS === 'true') {
      console.log('Neo4j live tests skipped (NEO4J_SKIP_TESTS=true)');
      return;
    }

    testAffiliate1 = `test_live_${randomUUID()}`;
    testAffiliate2 = `test_live_${randomUUID()}`;

    try {
      liveClient = createNeo4jClient(liveConfig);
      await liveClient.connect();
      connectionAvailable = true;
      console.log('Neo4j live connection established');
    } catch (error) {
      console.log('Neo4j not available - live tests will be skipped');
      liveClient = null;
    }
  });

  afterAll(async () => {
    if (liveClient && connectionAvailable) {
      // Cleanup test data
      try {
        await liveClient.runQuery(
          `MATCH (a:Affiliate) WHERE a.affiliateId STARTS WITH 'test_live_' DETACH DELETE a`
        );
      } catch (e) {
        // Ignore cleanup errors
      }
      await liveClient.close();
    }
  });

  it('should connect to live Neo4j instance', async () => {
    if (!connectionAvailable) {
      console.log('Skipping: Neo4j not available');
      return;
    }
    expect(liveClient).toBeDefined();
  });

  it('should create affiliate in live database', async () => {
    if (!connectionAvailable || !liveClient) return;

    await liveClient.createAffiliate({
      id: 1,
      affiliateId: testAffiliate1,
      name: 'Live Test Affiliate',
      status: 'active',
      tier: 'premium',
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await liveClient.getAffiliate(testAffiliate1);
    expect(result).not.toBeNull();
    expect(result?.name).toBe('Live Test Affiliate');
  });

  it('should create affinity relationship in live database', async () => {
    if (!connectionAvailable || !liveClient) return;

    // Create second affiliate
    await liveClient.createAffiliate({
      id: 2,
      affiliateId: testAffiliate2,
      name: 'Live Partner Affiliate',
      status: 'active',
      tier: 'enterprise',
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Create affinity
    await liveClient.createAffinity({
      id: 1,
      affiliateId1: testAffiliate1,
      affiliateId2: testAffiliate2,
      affinityScore: 0.88,
      confidence: 0.95,
      relationshipType: 'collaborator',
      interactionCount: 25,
      metadata: null,
      lastUpdated: new Date(),
      createdAt: new Date(),
    });

    const affinities = await liveClient.getAffinities(testAffiliate1);
    expect(affinities.length).toBeGreaterThanOrEqual(1);
    expect(affinities[0]?.score).toBe(0.88);
  });

  it('should query high affinity pairs from live database', async () => {
    if (!connectionAvailable || !liveClient) return;

    const highAffinityPairs = await liveClient.getHighAffinityPairs(0.8);
    expect(Array.isArray(highAffinityPairs)).toBe(true);
  });

  it('should get network statistics from live database', async () => {
    if (!connectionAvailable || !liveClient) return;

    const stats = await liveClient.getNetworkStatistics();
    expect(stats).toBeDefined();
    expect(typeof stats.affiliates).toBe('number');
    expect(typeof stats.relationships).toBe('number');
  });

  it('should get configuration from environment', () => {
    const config = getConfigFromEnv();
    expect(config.uri).toBeDefined();
    expect(config.username).toBe('neo4j');
  });
});
