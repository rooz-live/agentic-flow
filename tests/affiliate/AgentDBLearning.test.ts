/**
 * AgentDB Learning Tests
 * Tests for ReflexionMemory and CausalRecall capabilities
 */

import {
  ReflexionMemory,
  CausalRecall,
  ReflexionPattern,
  CausalRelation,
  createReflexionMemory,
  createCausalRecall,
} from '../../src/integrations/agentdb_learning';

describe('AgentDB Learning Features', () => {
  describe('ReflexionMemory', () => {
    let memory: ReflexionMemory;

    beforeEach(() => {
      memory = createReflexionMemory({ dbPath: ':memory:' });
    });

    afterEach(() => {
      memory.close();
    });

    it('should create ReflexionMemory instance', () => {
      expect(memory).toBeInstanceOf(ReflexionMemory);
    });

    it('should store prediction patterns', () => {
      const pattern = memory.storePrediction(
        'affinity',
        'aff_1',
        { activityLevel: 'high', referralCount: 5 },
        { predictedTier: 'premium', confidence: 0.85 },
        0.85
      );

      expect(pattern.id).toMatch(/^pat_/);
      expect(pattern.patternType).toBe('affinity');
      expect(pattern.affiliateId).toBe('aff_1');
      expect(pattern.confidence).toBe(0.85);
      expect(pattern.success).toBe(false);
    });

    it('should emit pattern:stored event', (done) => {
      memory.on('pattern:stored', (pattern: ReflexionPattern) => {
        expect(pattern.patternType).toBe('tier_upgrade');
        done();
      });

      memory.storePrediction(
        'tier_upgrade',
        'aff_2',
        { monthlyRevenue: 5000 },
        { shouldUpgrade: true },
        0.9
      );
    });

    it('should evaluate predictions', () => {
      const pattern = memory.storePrediction(
        'risk',
        'aff_1',
        { suspiciousActivity: true },
        { riskLevel: 'high' },
        0.75
      );

      memory.evaluatePrediction(pattern.id, { actualRisk: 'high' }, true);

      const metrics = memory.getMetrics();
      expect(metrics.successful).toBe(1);
      expect(metrics.accuracy).toBe(1);
    });

    it('should retrieve similar patterns', () => {
      memory.storePrediction('affinity', 'aff_1', { x: 1 }, { y: 1 }, 0.8);
      memory.storePrediction('affinity', 'aff_1', { x: 2 }, { y: 2 }, 0.9);
      memory.storePrediction('behavior', 'aff_1', { z: 1 }, { w: 1 }, 0.7);

      const patterns = memory.getSimilarPatterns('aff_1', 'affinity');
      expect(patterns.length).toBe(2);
    });

    it('should retrieve successful patterns above confidence threshold', () => {
      const p1 = memory.storePrediction('tier_upgrade', 'aff_1', {}, {}, 0.8);
      const p2 = memory.storePrediction('tier_upgrade', 'aff_2', {}, {}, 0.6);
      
      memory.evaluatePrediction(p1.id, {}, true);
      memory.evaluatePrediction(p2.id, {}, true);

      const successful = memory.getSuccessfulPatterns('tier_upgrade', 0.7);
      expect(successful.length).toBe(1);
      expect(successful[0].confidence).toBe(0.8);
    });
  });

  describe('CausalRecall', () => {
    let causal: CausalRecall;

    beforeEach(() => {
      causal = createCausalRecall({ dbPath: ':memory:' });
    });

    afterEach(() => {
      causal.close();
    });

    it('should create CausalRecall instance', () => {
      expect(causal).toBeInstanceOf(CausalRecall);
    });

    it('should record causal links', () => {
      const relation = causal.recordCausalLink(
        'high_activity',
        'tier_upgrade',
        86400000, // 1 day
        'aff_1',
        { source: 'analysis' }
      );

      expect(relation.id).toMatch(/^caus_/);
      expect(relation.causeEvent).toBe('high_activity');
      expect(relation.effectEvent).toBe('tier_upgrade');
      expect(relation.occurrences).toBe(1);
      expect(relation.strength).toBe(0.5);
    });

    it('should strengthen existing relations on repeat', () => {
      causal.recordCausalLink('referral_spike', 'tier_upgrade', 1000);
      const updated = causal.recordCausalLink('referral_spike', 'tier_upgrade', 2000);

      expect(updated.occurrences).toBe(2);
      expect(updated.strength).toBe(0.55);
      expect(updated.avgTimeDeltaMs).toBe(1500);
    });

    it('should get causes of an effect', () => {
      causal.recordCausalLink('high_revenue', 'tier_upgrade', 1000);
      causal.recordCausalLink('many_referrals', 'tier_upgrade', 2000);
      causal.recordCausalLink('fraud_detected', 'suspension', 500);

      const causes = causal.getCauses('tier_upgrade');
      expect(causes.length).toBe(2);
    });

    it('should get effects of a cause', () => {
      causal.recordCausalLink('fraud_detected', 'suspension', 100);
      causal.recordCausalLink('fraud_detected', 'account_review', 200);

      const effects = causal.getEffects('fraud_detected');
      expect(effects.length).toBe(2);
    });

    it('should identify tier upgrade triggers', () => {
      const r1 = causal.recordCausalLink('high_activity', 'tier_upgrade', 1000);
      // Strengthen to reach threshold
      for (let i = 0; i < 3; i++) {
        causal.recordCausalLink('high_activity', 'tier_upgrade', 1000);
      }

      const triggers = causal.getTierUpgradeTriggers(0.6);
      expect(triggers.length).toBe(1);
      expect(triggers[0].causeEvent).toBe('high_activity');
    });

    it('should identify suspension precursors', () => {
      for (let i = 0; i < 4; i++) {
        causal.recordCausalLink('policy_violation', 'suspension', 500);
      }

      const precursors = causal.getSuspensionPrecursors(0.6);
      expect(precursors.length).toBe(1);
    });
  });
});

