/**
 * Affiliate Risks Unit Tests
 * 
 * Tests for risk assessment, ROAM integration, and risk lifecycle.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { AffiliateStateTracker } from '../../src/affiliate/AffiliateStateTracker';
import { randomUUID } from 'crypto';

describe('Affiliate Risks', () => {
  let tracker: AffiliateStateTracker;

  beforeEach(() => {
    tracker = new AffiliateStateTracker({ dbPath: ':memory:', enableLearning: false });
  });

  afterEach(() => {
    tracker.close();
  });

  describe('Risk Creation', () => {
    it('should create a risk for affiliate', () => {
      const affiliateId = randomUUID();
      tracker.createAffiliate({ affiliateId, name: 'Risk Test', tier: 'standard' });
      
      const risk = tracker.createRisk({
        affiliateId,
        riskType: 'compliance',
        severity: 'high',
        description: 'Missing KYC documentation',
        roamStatus: 'owned'
      });

      expect(risk).toBeDefined();
      expect(risk.affiliateId).toBe(affiliateId);
      expect(risk.severity).toBe('high');
      expect(risk.roamStatus).toBe('owned');
    });

    it('should validate severity levels', () => {
      const affiliateId = randomUUID();
      tracker.createAffiliate({ affiliateId, name: 'Severity Test', tier: 'premium' });
      
      const lowRisk = tracker.createRisk({
        affiliateId,
        riskType: 'operational',
        severity: 'low',
        description: 'Minor issue'
      });

      const criticalRisk = tracker.createRisk({
        affiliateId,
        riskType: 'financial',
        severity: 'critical',
        description: 'Major issue'
      });

      expect(lowRisk.severity).toBe('low');
      expect(criticalRisk.severity).toBe('critical');
    });
  });

  describe('Risk Retrieval', () => {
    it('should get all risks for affiliate', () => {
      const affiliateId = randomUUID();
      tracker.createAffiliate({ affiliateId, name: 'Multi Risk', tier: 'enterprise' });
      
      tracker.createRisk({ affiliateId, riskType: 'compliance', severity: 'high', description: 'R1' });
      tracker.createRisk({ affiliateId, riskType: 'financial', severity: 'medium', description: 'R2' });
      tracker.createRisk({ affiliateId, riskType: 'operational', severity: 'low', description: 'R3' });

      const risks = tracker.getRisksByAffiliateId(affiliateId);
      expect(risks.length).toBe(3);
    });

    it('should get risks by ROAM status', () => {
      const affiliateId = randomUUID();
      tracker.createAffiliate({ affiliateId, name: 'ROAM Test', tier: 'standard' });
      
      tracker.createRisk({ affiliateId, riskType: 'compliance', severity: 'high', roamStatus: 'resolved' });
      tracker.createRisk({ affiliateId, riskType: 'financial', severity: 'medium', roamStatus: 'owned' });
      tracker.createRisk({ affiliateId, riskType: 'operational', severity: 'low', roamStatus: 'owned' });

      const ownedRisks = tracker.getRisksByRoamStatus('owned');
      expect(ownedRisks.length).toBe(2);
    });
  });

  describe('Risk Data', () => {
    it('should store mitigation plan', () => {
      const affiliateId = randomUUID();
      tracker.createAffiliate({ affiliateId, name: 'Mitigation Test', tier: 'premium' });
      
      const risk = tracker.createRisk({
        affiliateId,
        riskType: 'compliance',
        severity: 'high',
        description: 'Compliance issue',
        mitigationPlan: 'Submit required documentation within 30 days',
        owner: 'compliance-team'
      });

      expect(risk.mitigationPlan).toBe('Submit required documentation within 30 days');
      expect(risk.owner).toBe('compliance-team');
    });

    it('should store evidence as JSON', () => {
      const affiliateId = randomUUID();
      tracker.createAffiliate({ affiliateId, name: 'Evidence Test', tier: 'enterprise' });
      
      const evidence = { documents: ['doc1.pdf', 'doc2.pdf'], verified: true };
      const risk = tracker.createRisk({
        affiliateId,
        riskType: 'fraud',
        severity: 'critical',
        evidence
      });

      expect(risk.evidence).toEqual(evidence);
    });
  });
});
