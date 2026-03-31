/**
 * aidefence Affiliate Security Integration Tests
 */

import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { AffiliateStateTracker } from '../../src/affiliate/AffiliateStateTracker';
import {
    AffiliateSecurityMonitor,
    createSecurityMonitor,
    SecurityAlert
} from '../../src/integrations/aidefence/affiliate_security';

describe('Affiliate Security Integration', () => {
  let tracker: AffiliateStateTracker;
  let monitor: AffiliateSecurityMonitor;

  beforeEach(() => {
    tracker = new AffiliateStateTracker({ dbPath: ':memory:', enableLearning: false });
    monitor = createSecurityMonitor(tracker, {
      rapidStatusChangeThreshold: 3,
      rapidStatusChangeWindowMs: 5000,
      alertCooldownMs: 100,
      enableAutoRiskCreation: true,
    });
  });

  afterEach(() => {
    tracker.close();
  });

  describe('Monitor Creation', () => {
    it('should create security monitor with default config', () => {
      const defaultMonitor = createSecurityMonitor(tracker);
      expect(defaultMonitor).toBeInstanceOf(AffiliateSecurityMonitor);
    });

    it('should create security monitor with custom config', () => {
      expect(monitor).toBeInstanceOf(AffiliateSecurityMonitor);
    });
  });

  describe('Alert Management', () => {
    it('should start with no alerts', () => {
      const alerts = monitor.getAlerts();
      expect(alerts).toHaveLength(0);
    });

    it('should track security metrics', () => {
      const metrics = monitor.getSecurityMetrics();
      expect(metrics.totalAlerts).toBe(0);
      expect(metrics.affiliatesWithAlerts).toBe(0);
    });

    it('should clear alerts', () => {
      monitor.clearAlerts();
      expect(monitor.getAlerts()).toHaveLength(0);
    });
  });

  describe('Rapid Status Change Detection', () => {
    it('should emit alert event when listener attached', (done) => {
      const affiliateId = `aff_test_${Date.now()}`;
      tracker.createAffiliate({
        affiliateId,
        name: 'Test Affiliate',
        status: 'pending',
        tier: 'standard',
      });

      monitor.on('security:alert', (alert: SecurityAlert) => {
        expect(alert.alertType).toBe('rapid_status_change');
        expect(alert.affiliateId).toBe(affiliateId);
        expect(alert.severity).toBe('high');
        done();
      });

      // Trigger rapid status changes
      tracker.transitionStatus(affiliateId, 'active');
      tracker.transitionStatus(affiliateId, 'suspended');
      tracker.transitionStatus(affiliateId, 'active');
    });
  });

  describe('ROAM Integration', () => {
    it('should auto-create ROAM risk when alert generated', (done) => {
      const affiliateId = `aff_risk_${Date.now()}`;
      tracker.createAffiliate({
        affiliateId,
        name: 'Risk Test Affiliate',
        status: 'pending',
        tier: 'standard',
      });

      monitor.on('roam:risk_created', (data: { riskId: string; alert: SecurityAlert }) => {
        try {
          expect(data.riskId).toBeDefined();
          expect(data.riskId).toMatch(/^risk_\d+$/);

          // Verify risk was created in tracker
          const risks = tracker.getRisksByAffiliateId(affiliateId);
          expect(risks.length).toBeGreaterThan(0);
          expect(risks[0].riskType).toBe('security');
          expect(risks[0].severity).toBe('high');
          done();
        } catch (error) {
          done(error as Error);
        }
      });

      // Trigger rapid status changes
      tracker.transitionStatus(affiliateId, 'active');
      tracker.transitionStatus(affiliateId, 'suspended');
      tracker.transitionStatus(affiliateId, 'active');
    });
  });

  describe('Alert Filtering', () => {
    it('should filter alerts by affiliate', () => {
      const alerts = monitor.getAlertsByAffiliate('aff_nonexistent');
      expect(alerts).toHaveLength(0);
    });

    it('should filter alerts by severity', () => {
      const criticalAlerts = monitor.getAlertsBySeverity('critical');
      expect(criticalAlerts).toHaveLength(0);
    });

    it('should filter alerts by date', () => {
      const futureDate = new Date(Date.now() + 100000);
      const alerts = monitor.getAlerts(futureDate);
      expect(alerts).toHaveLength(0);
    });
  });
});
