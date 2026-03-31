/**
 * AffiliateStateTracker Unit Tests
 *
 * Tests for affiliate state management, CRUD operations, and state machine transitions.
 * Target: >90% coverage for src/affiliate/AffiliateStateTracker.ts
 */

import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { randomUUID } from 'crypto';
import { AffiliateStateTracker } from '../../src/affiliate/AffiliateStateTracker';

describe('AffiliateStateTracker', () => {
  let tracker: AffiliateStateTracker;

  beforeEach(() => {
    // Use in-memory database for tests
    tracker = new AffiliateStateTracker({ dbPath: ':memory:', enableLearning: false });
  });

  afterEach(() => {
    tracker.close();
  });

  describe('Affiliate CRUD Operations', () => {
    it('should create a new affiliate with default state', () => {
      const affiliateId = randomUUID();
      const affiliate = tracker.createAffiliate({
        affiliateId,
        name: 'Test Affiliate',
        tier: 'standard',
        metadata: { source: 'test' }
      });

      expect(affiliate).toBeDefined();
      expect(affiliate.id).toBeDefined();
      expect(affiliate.name).toBe('Test Affiliate');
      expect(affiliate.tier).toBe('standard');
      expect(affiliate.status).toBe('pending');
    });

    it('should get affiliate by ID', () => {
      const affiliateId = randomUUID();
      const created = tracker.createAffiliate({ affiliateId, name: 'Get Test', tier: 'premium' });
      const retrieved = tracker.getAffiliateById(affiliateId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.affiliateId).toBe(affiliateId);
      expect(retrieved?.name).toBe('Get Test');
    });

    it('should return null for non-existent affiliate', () => {
      const result = tracker.getAffiliateById('non-existent-id');
      expect(result).toBeNull();
    });

    it('should update affiliate properties', () => {
      const affiliateId = randomUUID();
      tracker.createAffiliate({ affiliateId, name: 'Update Test', tier: 'standard' });

      const updated = tracker.updateAffiliate(affiliateId, {
        name: 'Updated Name',
        tier: 'enterprise'
      });

      expect(updated).toBeDefined();
      expect(updated?.name).toBe('Updated Name');
      expect(updated?.tier).toBe('enterprise');
    });

    it('should list all affiliates', () => {
      tracker.createAffiliate({ affiliateId: randomUUID(), name: 'Affiliate 1', tier: 'standard' });
      tracker.createAffiliate({ affiliateId: randomUUID(), name: 'Affiliate 2', tier: 'premium' });
      tracker.createAffiliate({ affiliateId: randomUUID(), name: 'Affiliate 3', tier: 'enterprise' });

      const affiliates = tracker.getAllAffiliates();
      expect(affiliates.length).toBe(3);
    });

    it('should filter affiliates by status', () => {
      const aff1Id = randomUUID();
      const aff2Id = randomUUID();
      tracker.createAffiliate({ affiliateId: aff1Id, name: 'Pending', tier: 'standard' });
      tracker.createAffiliate({ affiliateId: aff2Id, name: 'Active', tier: 'premium' });

      // Transition one to active
      tracker.transitionStatus(aff2Id, 'active');

      const pendingAffiliates = tracker.getAffiliatesByStatus('pending');
      const activeAffiliates = tracker.getAffiliatesByStatus('active');

      expect(pendingAffiliates.length).toBe(1);
      expect(activeAffiliates.length).toBe(1);
    });

    it('should filter affiliates by tier', () => {
      tracker.createAffiliate({ affiliateId: randomUUID(), name: 'Standard 1', tier: 'standard' });
      tracker.createAffiliate({ affiliateId: randomUUID(), name: 'Standard 2', tier: 'standard' });
      tracker.createAffiliate({ affiliateId: randomUUID(), name: 'Enterprise 1', tier: 'enterprise' });

      const standardAffiliates = tracker.getAffiliatesByTier('standard');
      expect(standardAffiliates.length).toBe(2);
    });
  });

  describe('State Machine Transitions', () => {
    it('should allow valid state transitions', () => {
      const affiliateId = randomUUID();
      tracker.createAffiliate({ affiliateId, name: 'Transition Test', tier: 'standard' });

      // pending -> active is valid
      const result = tracker.transitionStatus(affiliateId, 'active');
      expect(result.success).toBe(true);
      expect(result.newStatus).toBe('active');
    });

    it('should reject invalid state transitions', () => {
      const affiliateId = randomUUID();
      tracker.createAffiliate({ affiliateId, name: 'Invalid Transition', tier: 'standard' });

      // First transition to active, then archived
      tracker.transitionStatus(affiliateId, 'active');
      tracker.transitionStatus(affiliateId, 'archived');

      // archived -> active is not valid (archived is terminal)
      const result = tracker.transitionStatus(affiliateId, 'active');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid');
    });

    it('should track state transition history via activities', () => {
      const affiliateId = randomUUID();
      tracker.createAffiliate({ affiliateId, name: 'History Test', tier: 'standard' });

      tracker.transitionStatus(affiliateId, 'active');
      tracker.transitionStatus(affiliateId, 'suspended');

      const activities = tracker.getActivitiesByAffiliateId(affiliateId);

      expect(activities.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Delete Operations', () => {
    it('should delete an affiliate', () => {
      const affiliateId = randomUUID();
      tracker.createAffiliate({ affiliateId, name: 'Delete Test', tier: 'standard' });

      const result = tracker.deleteAffiliate(affiliateId);
      expect(result).toBe(true);

      const deleted = tracker.getAffiliateById(affiliateId);
      expect(deleted).toBeNull();
    });

    it('should return false when deleting non-existent affiliate', () => {
      const result = tracker.deleteAffiliate('non-existent-id');
      expect(result).toBe(false);
    });
  });

  describe('State Machine Helpers', () => {
    it('should check if transition is allowed', () => {
      expect(tracker.canTransition('pending', 'active')).toBe(true);
      expect(tracker.canTransition('archived', 'active')).toBe(false);
    });

    it('should get valid transitions for a status', () => {
      const validFromPending = tracker.getValidTransitions('pending');
      expect(validFromPending).toContain('active');
      expect(validFromPending).toContain('archived');

      const validFromArchived = tracker.getValidTransitions('archived');
      expect(validFromArchived.length).toBe(0);
    });
  });

  describe('Event Handling', () => {
    it('should register and trigger event handlers', () => {
      let eventReceived = false;
      tracker.onEvent('state_created', () => {
        eventReceived = true;
      });

      const affiliateId = randomUUID();
      tracker.createAffiliate({ affiliateId, name: 'Event Test', tier: 'standard' });

      expect(eventReceived).toBe(true);
    });

    it('should handle multiple event handlers for same event type', () => {
      let handler1Called = false;
      let handler2Called = false;

      tracker.onEvent('state_created', () => { handler1Called = true; });
      tracker.onEvent('state_created', () => { handler2Called = true; });

      const affiliateId = randomUUID();
      tracker.createAffiliate({ affiliateId, name: 'Multi Handler Test', tier: 'standard' });

      expect(handler1Called).toBe(true);
      expect(handler2Called).toBe(true);
    });
  });

  describe('Statistics', () => {
    it('should return statistics', () => {
      const aff1 = randomUUID();
      const aff2 = randomUUID();
      tracker.createAffiliate({ affiliateId: aff1, name: 'Stats 1', tier: 'standard' });
      tracker.createAffiliate({ affiliateId: aff2, name: 'Stats 2', tier: 'premium' });
      tracker.transitionStatus(aff1, 'active');

      tracker.createRisk({ affiliateId: aff1, riskType: 'compliance', severity: 'high' });
      tracker.createAffinity({ affiliateId1: aff1, affiliateId2: aff2, affinityScore: 0.8 });

      const stats = tracker.getStatistics();
      expect(stats).toBeDefined();
      expect(stats.affiliates).toBeDefined();
      expect(stats.risks).toBeDefined();
      expect(stats.affinities).toBeDefined();
    });
  });

  describe('Affinity Edge Cases', () => {
    it('should return false when updating non-existent affinity', () => {
      const result = tracker.updateAffinityScore('non-existent-1', 'non-existent-2', 0.9);
      expect(result).toBe(false);
    });
  });
});
