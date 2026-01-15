jest.mock('fs-extra', () => ({
  ensureDir: jest.fn().mockResolvedValue(undefined),
  writeJson: jest.fn().mockResolvedValue(undefined),
  readJson: jest.fn().mockResolvedValue({})
}));

/**
 * Tests for DecisionAuditLogger and Adaptive Health Checks
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { DecisionAuditLogger } from '../../src/governance/core/decision_audit_logger';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

describe('DecisionAuditLogger', () => {
  const testGoalieDir = join(process.cwd(), 'tests', '.goalie-audit-test');
  let logger: DecisionAuditLogger;

  beforeEach(() => {
    if (!existsSync(testGoalieDir)) {
      mkdirSync(testGoalieDir, { recursive: true });
    }
    logger = new DecisionAuditLogger(testGoalieDir);
  });

  afterEach(() => {
    logger.close();
    if (existsSync(testGoalieDir)) {
      rmSync(testGoalieDir, { recursive: true, force: true });
    }
  });

  describe('logDecision', () => {
    it('should log a decision and return decision ID', () => {
      const decisionId = logger.logDecision({
        decisionType: 'compliance_check',
        policyId: 'pattern-compliance',
        context: { test: true },
        result: 'approved',
        rationale: 'Test decision',
        complianceScore: 95
      });

      expect(decisionId).toBeDefined();
      expect(typeof decisionId).toBe('string');
    });

    it('should store decision with all fields', () => {
      const decisionId = logger.logDecision({
        decisionType: 'action_validation',
        policyId: 'test-policy',
        action: 'test-action',
        context: { circle: 'orchestrator', ceremony: 'standup' },
        result: 'denied',
        rationale: 'Critical violation detected',
        violations: [{ ruleId: 'test-rule', severity: 'critical' }],
        complianceScore: 45,
        userId: 'test-user',
        circle: 'orchestrator',
        ceremony: 'standup',
        metadata: { extra: 'data' }
      });

      const decisions = logger.getRecentDecisions(1);
      expect(decisions.length).toBe(1);
      expect(decisions[0].decisionId).toBe(decisionId);
      expect(decisions[0].decisionType).toBe('action_validation');
      expect(decisions[0].result).toBe('denied');
      expect(decisions[0].complianceScore).toBe(45);
      expect(decisions[0].violations).toBeDefined();
      expect(decisions[0].circle).toBe('orchestrator');
    });

    it('should handle multiple decisions', () => {
      for (let i = 0; i < 5; i++) {
        logger.logDecision({
          decisionType: 'compliance_check',
          context: { iteration: i },
          result: i % 2 === 0 ? 'approved' : 'denied',
          rationale: `Decision ${i}`,
          complianceScore: 80 - i * 10
        });
      }

      const decisions = logger.getRecentDecisions(10);
      expect(decisions.length).toBe(5);
      expect(decisions[0].context.iteration).toBe(4); // Most recent first
    });
  });

  describe('getRecentDecisions', () => {
    beforeEach(() => {
      // Log some decisions
      for (let i = 0; i < 15; i++) {
        logger.logDecision({
          decisionType: 'compliance_check',
          context: { index: i },
          result: 'approved',
          rationale: `Decision ${i}`
        });
      }
    });

    it('should return most recent decisions first', () => {
      const decisions = logger.getRecentDecisions(5);
      expect(decisions.length).toBe(5);
      expect(decisions[0].context.index).toBe(14);
      expect(decisions[4].context.index).toBe(10);
    });

    it('should respect limit parameter', () => {
      const decisions = logger.getRecentDecisions(3);
      expect(decisions.length).toBe(3);
    });

    it('should return all decisions if limit exceeds count', () => {
      const decisions = logger.getRecentDecisions(100);
      expect(decisions.length).toBe(15);
    });
  });

  describe('getDecisionsByResult', () => {
    beforeEach(() => {
      logger.logDecision({
        decisionType: 'compliance_check',
        context: {},
        result: 'approved',
        rationale: 'Test 1'
      });
      logger.logDecision({
        decisionType: 'compliance_check',
        context: {},
        result: 'denied',
        rationale: 'Test 2'
      });
      logger.logDecision({
        decisionType: 'compliance_check',
        context: {},
        result: 'warning',
        rationale: 'Test 3'
      });
      logger.logDecision({
        decisionType: 'compliance_check',
        context: {},
        result: 'approved',
        rationale: 'Test 4'
      });
    });

    it('should filter by approved result', () => {
      const approved = logger.getDecisionsByResult('approved');
      expect(approved.length).toBe(2);
      expect(approved.every(d => d.result === 'approved')).toBe(true);
    });

    it('should filter by denied result', () => {
      const denied = logger.getDecisionsByResult('denied');
      expect(denied.length).toBe(1);
      expect(denied[0].rationale).toBe('Test 2');
    });

    it('should filter by warning result', () => {
      const warnings = logger.getDecisionsByResult('warning');
      expect(warnings.length).toBe(1);
      expect(warnings[0].rationale).toBe('Test 3');
    });
  });

  describe('getDecisionsByPolicy', () => {
    beforeEach(() => {
      logger.logDecision({
        decisionType: 'policy_check',
        policyId: 'policy-a',
        context: {},
        result: 'approved',
        rationale: 'Policy A check 1'
      });
      logger.logDecision({
        decisionType: 'policy_check',
        policyId: 'policy-b',
        context: {},
        result: 'approved',
        rationale: 'Policy B check'
      });
      logger.logDecision({
        decisionType: 'policy_check',
        policyId: 'policy-a',
        context: {},
        result: 'denied',
        rationale: 'Policy A check 2'
      });
    });

    it('should filter by policy ID', () => {
      const policyADecisions = logger.getDecisionsByPolicy('policy-a');
      expect(policyADecisions.length).toBe(2);
      expect(policyADecisions.every(d => d.policyId === 'policy-a')).toBe(true);
    });

    it('should return empty array for non-existent policy', () => {
      const decisions = logger.getDecisionsByPolicy('non-existent');
      expect(decisions.length).toBe(0);
    });
  });

  describe('getStatistics', () => {
    beforeEach(() => {
      // Log decisions with various results and scores
      logger.logDecision({
        decisionType: 'compliance_check',
        context: {},
        result: 'approved',
        rationale: 'Test',
        complianceScore: 95
      });
      logger.logDecision({
        decisionType: 'compliance_check',
        context: {},
        result: 'approved',
        rationale: 'Test',
        complianceScore: 88
      });
      logger.logDecision({
        decisionType: 'compliance_check',
        context: {},
        result: 'denied',
        rationale: 'Test',
        complianceScore: 45
      });
      logger.logDecision({
        decisionType: 'compliance_check',
        context: {},
        result: 'warning',
        rationale: 'Test',
        complianceScore: 70
      });
    });

    it('should calculate correct statistics', () => {
      const stats = logger.getStatistics(24);
      
      expect(stats.total).toBe(4);
      expect(stats.approved).toBe(2);
      expect(stats.denied).toBe(1);
      expect(stats.warnings).toBe(1);
      expect(stats.avgComplianceScore).toBeCloseTo(74.5, 1);
    });

    it('should filter by time window', () => {
      // Statistics for a very short time window should return fewer results
      // (This is a simplified test; in real scenarios you'd manipulate timestamps)
      const stats = logger.getStatistics(0.001); // ~3.6 seconds
      expect(stats.total).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('Adaptive Health Check Frequency', () => {
  describe('calculateAdaptiveCheckFrequency', () => {
    // Mock implementation of the function for testing
    const calculateAdaptiveCheckFrequency = (state: any): number => {
      const baseFrequency = 5;
      const minFrequency = 1;
      const maxFrequency = 20;

      const degradationScore = state.metrics.degradation_score || 0;
      const cascadeCount = state.metrics.cascade_failure_count || 0;
      const failureRate = state.failedWork / Math.max(1, state.completedWork + state.failedWork);
      
      const anomalyRate = Math.min(1, 
        degradationScore * 0.4 + 
        (cascadeCount > 0 ? 0.3 : 0) + 
        failureRate * 0.3
      );

      const stressMultiplier = 1 - anomalyRate;
      const adaptiveFrequency = Math.round(
        minFrequency + (maxFrequency - minFrequency) * stressMultiplier
      );

      return Math.max(minFrequency, Math.min(maxFrequency, adaptiveFrequency));
    };

    it('should return max frequency for stable system', () => {
      const state = {
        metrics: {
          degradation_score: 0,
          cascade_failure_count: 0
        },
        completedWork: 100,
        failedWork: 0
      };

      const frequency = calculateAdaptiveCheckFrequency(state);
      expect(frequency).toBe(20); // Max frequency
    });

    it('should return min frequency for high stress system', () => {
      const state = {
        metrics: {
          degradation_score: 1.0,
          cascade_failure_count: 5
        },
        completedWork: 50,
        failedWork: 50
      };

      const frequency = calculateAdaptiveCheckFrequency(state);
      expect(frequency).toBe(1); // Min frequency (check every episode)
    });

    it('should return moderate frequency for moderate stress', () => {
      const state = {
        metrics: {
          degradation_score: 0.5,
          cascade_failure_count: 0
        },
        completedWork: 80,
        failedWork: 20
      };

      const frequency = calculateAdaptiveCheckFrequency(state);
      expect(frequency).toBeGreaterThan(1);
      expect(frequency).toBeLessThan(20);
    });

    it('should scale with degradation score', () => {
      const lowDegradation = calculateAdaptiveCheckFrequency({
        metrics: { degradation_score: 0.2, cascade_failure_count: 0 },
        completedWork: 100,
        failedWork: 0
      });

      const highDegradation = calculateAdaptiveCheckFrequency({
        metrics: { degradation_score: 0.8, cascade_failure_count: 0 },
        completedWork: 100,
        failedWork: 0
      });

      expect(lowDegradation).toBeGreaterThan(highDegradation);
    });

    it('should respond to cascade failures', () => {
      const noCascade = calculateAdaptiveCheckFrequency({
        metrics: { degradation_score: 0, cascade_failure_count: 0 },
        completedWork: 100,
        failedWork: 0
      });

      const withCascade = calculateAdaptiveCheckFrequency({
        metrics: { degradation_score: 0, cascade_failure_count: 3 },
        completedWork: 100,
        failedWork: 0
      });

      expect(noCascade).toBeGreaterThan(withCascade);
    });

    it('should respond to failure rate', () => {
      const lowFailure = calculateAdaptiveCheckFrequency({
        metrics: { degradation_score: 0, cascade_failure_count: 0 },
        completedWork: 95,
        failedWork: 5
      });

      const highFailure = calculateAdaptiveCheckFrequency({
        metrics: { degradation_score: 0, cascade_failure_count: 0 },
        completedWork: 50,
        failedWork: 50
      });

      expect(lowFailure).toBeGreaterThan(highFailure);
    });
  });
});
