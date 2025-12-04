/**
 * Affiliate Activities Unit Tests
 * 
 * Tests for activity logging, retrieval, and analytics.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { AffiliateStateTracker } from '../../src/affiliate/AffiliateStateTracker';
import { randomUUID } from 'crypto';

describe('Affiliate Activities', () => {
  let tracker: AffiliateStateTracker;

  beforeEach(() => {
    tracker = new AffiliateStateTracker({ dbPath: ':memory:', enableLearning: false });
  });

  afterEach(() => {
    tracker.close();
  });

  describe('Activity Logging', () => {
    it('should log affiliate activity', () => {
      const affiliateId = randomUUID();
      tracker.createAffiliate({ affiliateId, name: 'Activity Test', tier: 'standard' });
      
      const activity = tracker.logActivity({
        affiliateId,
        activityType: 'login',
        source: 'system',
        payload: { ip: '192.168.1.1' }
      });

      expect(activity).toBeDefined();
      expect(activity.affiliateId).toBe(affiliateId);
      expect(activity.activityType).toBe('login');
    });

    it('should retrieve activities for affiliate', () => {
      const affiliateId = randomUUID();
      tracker.createAffiliate({ affiliateId, name: 'Multi Activity', tier: 'premium' });
      
      tracker.logActivity({ affiliateId, activityType: 'login', source: 'system' });
      tracker.logActivity({ affiliateId, activityType: 'transaction', source: 'api' });
      tracker.logActivity({ affiliateId, activityType: 'referral', source: 'user' });

      const activities = tracker.getActivitiesByAffiliateId(affiliateId);
      expect(activities.length).toBe(3);
    });

    it('should retrieve activities with limit', () => {
      const affiliateId = randomUUID();
      tracker.createAffiliate({ affiliateId, name: 'Limit Test', tier: 'standard' });
      
      for (let i = 0; i < 10; i++) {
        tracker.logActivity({ affiliateId, activityType: 'login', source: 'system' });
      }

      const activities = tracker.getActivitiesByAffiliateId(affiliateId, 5);
      expect(activities.length).toBe(5);
    });
  });

  describe('Activity Data', () => {
    it('should store payload correctly', () => {
      const affiliateId = randomUUID();
      tracker.createAffiliate({ affiliateId, name: 'Payload Test', tier: 'enterprise' });
      
      const payload = { action: 'purchase', amount: 100.50, currency: 'USD' };
      const activity = tracker.logActivity({
        affiliateId,
        activityType: 'transaction',
        source: 'api',
        payload
      });

      expect(activity.payload).toEqual(payload);
    });

    it('should record correct activity types', () => {
      const affiliateId = randomUUID();
      tracker.createAffiliate({ affiliateId, name: 'Type Test', tier: 'standard' });
      
      const types = ['login', 'logout', 'transaction', 'referral', 'commission'] as const;
      
      for (const activityType of types) {
        tracker.logActivity({ affiliateId, activityType, source: 'system' });
      }

      const activities = tracker.getActivitiesByAffiliateId(affiliateId);
      expect(activities.length).toBe(types.length);
    });
  });
});
