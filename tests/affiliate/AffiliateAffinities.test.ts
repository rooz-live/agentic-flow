/**
 * Affiliate Affinities Unit Tests
 * 
 * Tests for affinity scoring, relationship management, and graph analytics.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { AffiliateStateTracker } from '../../src/affiliate/AffiliateStateTracker';
import { randomUUID } from 'crypto';

describe('Affiliate Affinities', () => {
  let tracker: AffiliateStateTracker;

  beforeEach(() => {
    tracker = new AffiliateStateTracker({ dbPath: ':memory:', enableLearning: false });
  });

  afterEach(() => {
    tracker.close();
  });

  describe('Affinity Creation', () => {
    it('should create affinity between two affiliates', () => {
      const aff1Id = randomUUID();
      const aff2Id = randomUUID();
      tracker.createAffiliate({ affiliateId: aff1Id, name: 'Affiliate 1', tier: 'standard' });
      tracker.createAffiliate({ affiliateId: aff2Id, name: 'Affiliate 2', tier: 'premium' });
      
      const affinity = tracker.createAffinity({
        affiliateId1: aff1Id,
        affiliateId2: aff2Id,
        affinityScore: 0.85,
        relationshipType: 'peer',
        metadata: { projects: ['Project A'] }
      });

      expect(affinity).toBeDefined();
      expect(affinity.affiliateId1).toBe(aff1Id);
      expect(affinity.affiliateId2).toBe(aff2Id);
      expect(affinity.affinityScore).toBe(0.85);
    });

    it('should set default values for optional fields', () => {
      const aff1Id = randomUUID();
      const aff2Id = randomUUID();
      tracker.createAffiliate({ affiliateId: aff1Id, name: 'Test 1', tier: 'enterprise' });
      tracker.createAffiliate({ affiliateId: aff2Id, name: 'Test 2', tier: 'enterprise' });
      
      const affinity = tracker.createAffinity({
        affiliateId1: aff1Id,
        affiliateId2: aff2Id
      });

      expect(affinity.affinityScore).toBe(0.0);
      expect(affinity.confidence).toBe(0.5);
      expect(affinity.relationshipType).toBe('peer');
    });
  });

  describe('Affinity Retrieval', () => {
    it('should get all affinities for affiliate', () => {
      const aff1Id = randomUUID();
      const aff2Id = randomUUID();
      const aff3Id = randomUUID();
      tracker.createAffiliate({ affiliateId: aff1Id, name: 'Center', tier: 'enterprise' });
      tracker.createAffiliate({ affiliateId: aff2Id, name: 'Partner 1', tier: 'premium' });
      tracker.createAffiliate({ affiliateId: aff3Id, name: 'Partner 2', tier: 'standard' });
      
      tracker.createAffinity({ affiliateId1: aff1Id, affiliateId2: aff2Id, affinityScore: 0.9 });
      tracker.createAffinity({ affiliateId1: aff1Id, affiliateId2: aff3Id, affinityScore: 0.7 });

      const affinities = tracker.getAffinitiesForAffiliate(aff1Id);
      expect(affinities.length).toBe(2);
    });

    it('should get affinity by ID', () => {
      const aff1Id = randomUUID();
      const aff2Id = randomUUID();
      tracker.createAffiliate({ affiliateId: aff1Id, name: 'Test 1', tier: 'standard' });
      tracker.createAffiliate({ affiliateId: aff2Id, name: 'Test 2', tier: 'standard' });
      
      const created = tracker.createAffinity({
        affiliateId1: aff1Id,
        affiliateId2: aff2Id,
        affinityScore: 0.75
      });

      const retrieved = tracker.getAffinityById(created.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.affinityScore).toBe(0.75);
    });
  });

  describe('Affinity Updates', () => {
    it('should update affinity score', () => {
      const aff1Id = randomUUID();
      const aff2Id = randomUUID();
      tracker.createAffiliate({ affiliateId: aff1Id, name: 'Update 1', tier: 'premium' });
      tracker.createAffiliate({ affiliateId: aff2Id, name: 'Update 2', tier: 'premium' });
      
      tracker.createAffinity({
        affiliateId1: aff1Id,
        affiliateId2: aff2Id,
        affinityScore: 0.5
      });

      const updated = tracker.updateAffinityScore(aff1Id, aff2Id, 0.9);
      expect(updated).toBe(true);

      const affinities = tracker.getAffinitiesForAffiliate(aff1Id);
      expect(affinities[0].affinityScore).toBe(0.9);
    });

    it('should update affinity score with confidence', () => {
      const aff1Id = randomUUID();
      const aff2Id = randomUUID();
      tracker.createAffiliate({ affiliateId: aff1Id, name: 'Conf 1', tier: 'enterprise' });
      tracker.createAffiliate({ affiliateId: aff2Id, name: 'Conf 2', tier: 'enterprise' });
      
      tracker.createAffinity({
        affiliateId1: aff1Id,
        affiliateId2: aff2Id,
        affinityScore: 0.5,
        confidence: 0.5
      });

      tracker.updateAffinityScore(aff1Id, aff2Id, 0.95, 0.9);

      const affinities = tracker.getAffinitiesForAffiliate(aff1Id);
      expect(affinities[0].affinityScore).toBe(0.95);
      expect(affinities[0].confidence).toBe(0.9);
    });
  });
});
