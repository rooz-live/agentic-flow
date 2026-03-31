/**
 * ConceptNet Integration Tests
 *
 * Tests semantic relationship queries for affiliate affinity scoring.
 * Uses mocked responses when API is unavailable.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  ConceptNetClient,
  createConceptNetClient,
  type ConceptNetResponse,
  type ConceptNetEdge,
} from '../../src/integrations/conceptnet_integration';

// Mock response for testing
const mockConceptNetResponse: ConceptNetResponse = {
  '@id': '/c/en/partner',
  edges: [
    {
      start: { '@id': '/c/en/partner', label: 'partner', language: 'en' },
      end: { '@id': '/c/en/business', label: 'business', language: 'en' },
      rel: { '@id': '/r/RelatedTo', label: 'RelatedTo' },
      weight: 4.5,
      surfaceText: 'partner is related to business',
      sources: [{ '@id': '/s/conceptnet/4' }],
    },
    {
      start: { '@id': '/c/en/partner', label: 'partner', language: 'en' },
      end: { '@id': '/c/en/collaboration', label: 'collaboration', language: 'en' },
      rel: { '@id': '/r/RelatedTo', label: 'RelatedTo' },
      weight: 3.8,
      surfaceText: 'partner is related to collaboration',
      sources: [{ '@id': '/s/conceptnet/4' }],
    },
    {
      start: { '@id': '/c/en/partner', label: 'partner', language: 'en' },
      end: { '@id': '/c/en/trust', label: 'trust', language: 'en' },
      rel: { '@id': '/r/HasProperty', label: 'HasProperty' },
      weight: 2.5,
      surfaceText: 'partners have trust',
      sources: [{ '@id': '/s/conceptnet/4' }],
    },
  ],
};

describe('ConceptNetIntegration', () => {
  let client: ConceptNetClient;

  beforeEach(() => {
    client = createConceptNetClient({ enableCache: true, timeout: 3000 });
    // Mock fetch for API calls
    (global as any).fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockConceptNetResponse),
      })
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
    client.clearCache();
  });

  describe('Client Creation', () => {
    it('should create client with default config', () => {
      const defaultClient = createConceptNetClient();
      expect(defaultClient).toBeInstanceOf(ConceptNetClient);
      const status = defaultClient.getStatus();
      expect(status.cacheSize).toBe(0);
    });

    it('should create client with custom config', () => {
      const customClient = createConceptNetClient({
        language: 'de',
        maxEdges: 50,
        cacheTTLMs: 7200000,
      });
      expect(customClient).toBeInstanceOf(ConceptNetClient);
    });
  });

  describe('Concept Queries', () => {
    it('should query a concept successfully', async () => {
      const result = await client.queryConcept('partner');
      expect(result).not.toBeNull();
      expect(result?.edges).toHaveLength(3);
      expect(result?.edges[0].start.label).toBe('partner');
    });

    it('should return cached results on subsequent queries', async () => {
      await client.queryConcept('partner');
      await client.queryConcept('partner');
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should handle API errors gracefully', async () => {
      (global as any).fetch = jest.fn(() => Promise.resolve({ ok: false, status: 502 }));
      const result = await client.queryConcept('nonexistent');
      expect(result).toBeNull();
      expect(client.getStatus().available).toBe(false);
    });

    it('should handle network timeouts', async () => {
      (global as any).fetch = jest.fn(() => Promise.reject(new Error('Timeout')));
      const result = await client.queryConcept('timeout_test');
      expect(result).toBeNull();
    });
  });

  describe('Relationship Queries', () => {
    it('should find relationships between concepts', async () => {
      const edges = await client.getRelationship('partner', 'business');
      expect(edges).toHaveLength(1);
      expect(edges[0].rel.label).toBe('RelatedTo');
    });

    it('should return empty array when no relationship found', async () => {
      const edges = await client.getRelationship('partner', 'unrelated_concept');
      expect(edges).toHaveLength(0);
    });
  });

  describe('Affiliate Semantic Scoring', () => {
    it('should calculate semantic scores for affiliate concepts', async () => {
      const scores = await client.calculateAffiliateSemanticScore('aff-001', ['partner', 'sales']);
      expect(scores).toHaveLength(2);
      expect(scores[0].affiliateId).toBe('aff-001');
      expect(scores[0].semanticScore).toBeGreaterThan(0);
    });

    it('should include related concepts in scores', async () => {
      const scores = await client.calculateAffiliateSemanticScore('aff-002', ['partner']);
      expect(scores[0].relatedConcepts.length).toBeGreaterThan(0);
      expect(scores[0].relatedConcepts[0]).toHaveProperty('concept');
      expect(scores[0].relatedConcepts[0]).toHaveProperty('relation');
      expect(scores[0].relatedConcepts[0]).toHaveProperty('weight');
    });

    it('should calculate confidence based on edge count', async () => {
      const scores = await client.calculateAffiliateSemanticScore('aff-003', ['partner']);
      expect(scores[0].confidence).toBeLessThan(1);
      expect(scores[0].confidence).toBeGreaterThan(0);
    });
  });

  describe('Health Check & Status', () => {
    it('should perform health check', async () => {
      const isHealthy = await client.healthCheck();
      expect(isHealthy).toBe(true);
    });

    it('should report status correctly', () => {
      const status = client.getStatus();
      expect(status).toHaveProperty('available');
      expect(status).toHaveProperty('lastCheck');
      expect(status).toHaveProperty('cacheSize');
    });
  });

  describe('Cache Management', () => {
    it('should clear cache on demand', async () => {
      await client.queryConcept('partner');
      expect(client.getStatus().cacheSize).toBe(1);
      client.clearCache();
      expect(client.getStatus().cacheSize).toBe(0);
    });
  });
});

