/**
 * AffiliateStateTracker Unit Tests
 *
 * Tests for affiliate state management, CRUD operations, and state machine transitions.
 * Target: >90% coverage for src/affiliate/AffiliateStateTracker.ts
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { jest as vi } from '@jest/globals';
import Database from 'better-sqlite3';
import { AffiliateStateTracker } from '../../src/affiliate/AffiliateStateTracker';
import { 
  AffiliateState, 
  AffiliateActivity, 
  AffiliateRisk, 
  AffiliateAffinity,
  STATE_TRANSITIONS 
} from '../../src/affiliate/types';

describe('AffiliateStateTracker', () => {
  let tracker: AffiliateStateTracker;
  let testDbPath: string;

  beforeEach(() => {
    // Use in-memory database for tests
    testDbPath = ':memory:';
    tracker = new AffiliateStateTracker(testDbPath);
  });

  afterEach(() => {
    tracker.close();
  });

  describe('Affiliate CRUD Operations', () => {
    it('should create a new affiliate with default state', () => {
      const affiliate = tracker.createAffiliate({
        name: 'Test Affiliate',
        tier: 'bronze',
        metadata: { source: 'test' }
      });

      expect(affiliate).toBeDefined();
      expect(affiliate.id).toBeDefined();
      expect(affiliate.name).toBe('Test Affiliate');
      expect(affiliate.tier).toBe('bronze');
      expect(affiliate.state).toBe('pending');
    });

    it('should get affiliate by ID', () => {
      const created = tracker.createAffiliate({ name: 'Get Test', tier: 'silver' });
      const retrieved = tracker.getAffiliate(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.name).toBe('Get Test');
    });

    it('should return undefined for non-existent affiliate', () => {
      const result = tracker.getAffiliate('non-existent-id');
      expect(result).toBeUndefined();
    });

    it('should update affiliate properties', () => {
      const affiliate = tracker.createAffiliate({ name: 'Update Test', tier: 'bronze' });
      
      const updated = tracker.updateAffiliate(affiliate.id, {
        name: 'Updated Name',
        tier: 'gold'
      });

      expect(updated).toBeDefined();
      expect(updated?.name).toBe('Updated Name');
      expect(updated?.tier).toBe('gold');
    });

    it('should list all affiliates', () => {
      tracker.createAffiliate({ name: 'Affiliate 1', tier: 'bronze' });
      tracker.createAffiliate({ name: 'Affiliate 2', tier: 'silver' });
      tracker.createAffiliate({ name: 'Affiliate 3', tier: 'gold' });

      const affiliates = tracker.listAffiliates();
      expect(affiliates.length).toBe(3);
    });

    it('should filter affiliates by state', () => {
      const aff1 = tracker.createAffiliate({ name: 'Pending', tier: 'bronze' });
      const aff2 = tracker.createAffiliate({ name: 'Active', tier: 'silver' });
      
      // Transition one to active
      tracker.transitionState(aff2.id, 'active');

      const pendingAffiliates = tracker.listAffiliates({ state: 'pending' });
      const activeAffiliates = tracker.listAffiliates({ state: 'active' });

      expect(pendingAffiliates.length).toBe(1);
      expect(activeAffiliates.length).toBe(1);
    });

    it('should filter affiliates by tier', () => {
      tracker.createAffiliate({ name: 'Bronze 1', tier: 'bronze' });
      tracker.createAffiliate({ name: 'Bronze 2', tier: 'bronze' });
      tracker.createAffiliate({ name: 'Gold 1', tier: 'gold' });

      const bronzeAffiliates = tracker.listAffiliates({ tier: 'bronze' });
      expect(bronzeAffiliates.length).toBe(2);
    });
  });

  describe('State Machine Transitions', () => {
    it('should allow valid state transitions', () => {
      const affiliate = tracker.createAffiliate({ name: 'Transition Test', tier: 'bronze' });
      
      // pending -> active is valid
      const result = tracker.transitionState(affiliate.id, 'active');
      expect(result.success).toBe(true);
      expect(result.newState).toBe('active');
    });

    it('should reject invalid state transitions', () => {
      const affiliate = tracker.createAffiliate({ name: 'Invalid Transition', tier: 'bronze' });
      
      // pending -> archived is not valid (must go through active first)
      const result = tracker.transitionState(affiliate.id, 'archived');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid transition');
    });

    it('should track state transition history', () => {
      const affiliate = tracker.createAffiliate({ name: 'History Test', tier: 'bronze' });
      
      tracker.transitionState(affiliate.id, 'active');
      tracker.transitionState(affiliate.id, 'suspended');
      
      const activities = tracker.getAffiliateActivities(affiliate.id);
      const stateChanges = activities.filter(a => a.activity_type === 'state_change');
      
      expect(stateChanges.length).toBeGreaterThanOrEqual(2);
    });
  });
});

