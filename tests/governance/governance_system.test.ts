/**
 * Tests for GovernanceSystem
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { GovernanceSystem, ComplianceCheck, ComplianceViolation } from '../../src/governance/core/governance_system';
import { DecisionAuditLogger } from '../../src/governance/core/decision_audit_logger';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';

describe('GovernanceSystem', () => {
  const testGoalieDir = join(process.cwd(), 'tests', '.goalie-test');
  let governance: GovernanceSystem;

  beforeEach(() => {
    // Create test directory
    if (!existsSync(testGoalieDir)) {
      mkdirSync(testGoalieDir, { recursive: true });
    }

    governance = new GovernanceSystem({ 
      goalieDir: testGoalieDir,
      autoLogDecisions: true
    });
  });

  afterEach(() => {
    // Cleanup test directory
    if (existsSync(testGoalieDir)) {
      rmSync(testGoalieDir, { recursive: true, force: true });
    }
  });

  describe('initialization', () => {
    it('should initialize with default policies', async () => {
      await governance.initialize();
      const policies = await governance.getPolicies();
      expect(policies.length).toBeGreaterThan(0);
      expect(policies[0].id).toBe('pattern-compliance');
    });

    it('should have default compliance rules', async () => {
      const policies = await governance.getPolicies();
      const patternPolicy = policies.find(p => p.id === 'pattern-compliance');
      expect(patternPolicy).toBeDefined();
      expect(patternPolicy?.rules.length).toBeGreaterThan(0);
    });
  });

  describe('checkCompliance', () => {
    it('should return warning when no pattern events exist', async () => {
      const checks = await governance.checkCompliance();
      expect(checks.length).toBeGreaterThan(0);
      expect(checks[0].status).toBe('warning');
      expect(checks[0].details[0]).toContain('No pattern events found');
    });

    it('should detect frequency violations', async () => {
      // Create pattern metrics with excessive safe-degrade events
      const events = [];
      const now = Date.now();
      for (let i = 0; i < 25; i++) {
        events.push({
          ts: new Date(now - i * 60000).toISOString(),
          pattern: 'safe-degrade',
          mode: 'enforcement',
          mutation: false,
          gate: 'health',
          circle: 'orchestrator'
        });
      }

      const metricsPath = join(testGoalieDir, 'pattern_metrics.jsonl');
      writeFileSync(metricsPath, events.map(e => JSON.stringify(e)).join('\\n'));

      const checks = await governance.checkCompliance();
      const patternCheck = checks.find(c => c.area === 'pattern-compliance');
      
      expect(patternCheck).toBeDefined();
      expect(patternCheck?.status).toBe('non-compliant');
      expect(patternCheck?.violations?.length).toBeGreaterThan(0);
      
      const frequencyViolation = patternCheck?.violations?.find(
        v => v.ruleId === 'safe-degrade-frequency'
      );
      expect(frequencyViolation).toBeDefined();
      expect(frequencyViolation?.count).toBe(25);
    });

    it('should detect mode violations', async () => {
      // Create pattern metrics with wrong mode
      const events = [
        {
          ts: new Date().toISOString(),
          pattern: 'guardrail-lock',
          mode: 'advisory', // Should be enforcement
          mutation: false,
          gate: 'governance',
          circle: 'orchestrator'
        }
      ];

      const metricsPath = join(testGoalieDir, 'pattern_metrics.jsonl');
      writeFileSync(metricsPath, events.map(e => JSON.stringify(e)).join('\\n'));

      const checks = await governance.checkCompliance();
      const patternCheck = checks.find(c => c.area === 'pattern-compliance');
      
      expect(patternCheck?.violations?.length).toBeGreaterThan(0);
      const modeViolation = patternCheck?.violations?.find(
        v => v.ruleId === 'guardrail-lock-enforcement'
      );
      expect(modeViolation).toBeDefined();
      expect(modeViolation?.severity).toBe('critical');
    });

    it('should detect gate violations', async () => {
      // Create pattern metrics with wrong gate
      const events = [
        {
          ts: new Date().toISOString(),
          pattern: 'autocommit-shadow',
          mode: 'enforcement',
          mutation: true,
          gate: 'health', // Should be governance
          circle: 'orchestrator'
        }
      ];

      const metricsPath = join(testGoalieDir, 'pattern_metrics.jsonl');
      writeFileSync(metricsPath, events.map(e => JSON.stringify(e)).join('\\n'));

      const checks = await governance.checkCompliance();
      const patternCheck = checks.find(c => c.area === 'pattern-compliance');
      
      const gateViolation = patternCheck?.violations?.find(
        v => v.ruleId === 'autocommit-governance'
      );
      expect(gateViolation).toBeDefined();
    });

    it('should calculate compliance scores correctly', async () => {
      // Create compliant events
      const events = [
        {
          ts: new Date().toISOString(),
          pattern: 'safe-degrade',
          mode: 'enforcement',
          mutation: false,
          gate: 'health',
          circle: 'orchestrator'
        }
      ];

      const metricsPath = join(testGoalieDir, 'pattern_metrics.jsonl');
      writeFileSync(metricsPath, events.map(e => JSON.stringify(e)).join('\\n'));

      const checks = await governance.checkCompliance();
      const patternCheck = checks.find(c => c.area === 'pattern-compliance');
      
      expect(patternCheck?.status).toBe('compliant');
      expect(patternCheck?.score).toBe(100);
    });

    it('should filter by area', async () => {
      const checks = await governance.checkCompliance('pattern-compliance');
      expect(checks.length).toBe(1);
      expect(checks[0].area).toBe('pattern-compliance');
    });
  });

  describe('validateAction', () => {
    it('should approve actions when compliant', async () => {
      const events = [
        {
          ts: new Date().toISOString(),
          pattern: 'safe-degrade',
          mode: 'enforcement',
          mutation: false,
          gate: 'health',
          circle: 'orchestrator'
        }
      ];

      const metricsPath = join(testGoalieDir, 'pattern_metrics.jsonl');
      writeFileSync(metricsPath, events.map(e => JSON.stringify(e)).join('\\n'));

      const approved = await governance.validateAction('test-action', {
        circle: 'orchestrator',
        ceremony: 'standup'
      });

      expect(approved).toBe(true);
    });

    it('should block actions with critical violations', async () => {
      // Create critical violation
      const events = [
        {
          ts: new Date().toISOString(),
          pattern: 'guardrail-lock',
          mode: 'advisory', // Critical: Should be enforcement
          mutation: false,
          gate: 'governance',
          circle: 'orchestrator'
        }
      ];

      const metricsPath = join(testGoalieDir, 'pattern_metrics.jsonl');
      writeFileSync(metricsPath, events.map(e => JSON.stringify(e)).join('\\n'));

      const approved = await governance.validateAction('test-action');

      expect(approved).toBe(false);
    });

    it('should respect strict mode', async () => {
      const strictGovernance = new GovernanceSystem({ 
        goalieDir: testGoalieDir,
        strictMode: true
      });

      // Create medium severity violation
      const events = [
        {
          ts: new Date().toISOString(),
          pattern: 'autocommit-shadow',
          mode: 'enforcement',
          mutation: true,
          gate: 'health', // Should be governance (medium severity)
          circle: 'orchestrator'
        }
      ];

      const metricsPath = join(testGoalieDir, 'pattern_metrics.jsonl');
      writeFileSync(metricsPath, events.map(e => JSON.stringify(e)).join('\\n'));

      const approved = await strictGovernance.validateAction('test-action');

      // In strict mode, even medium violations should block
      expect(approved).toBe(false);
    });
  });

  describe('decision audit logging', () => {
    it('should log compliance checks', async () => {
      const events = [
        {
          ts: new Date().toISOString(),
          pattern: 'safe-degrade',
          mode: 'enforcement',
          mutation: false,
          gate: 'health',
          circle: 'orchestrator'
        }
      ];

      const metricsPath = join(testGoalieDir, 'pattern_metrics.jsonl');
      writeFileSync(metricsPath, events.map(e => JSON.stringify(e)).join('\\n'));

      await governance.checkCompliance();

      // Check if decision was logged
      const auditLogger = new DecisionAuditLogger(testGoalieDir);
      const decisions = auditLogger.getRecentDecisions(10);
      
      expect(decisions.length).toBeGreaterThan(0);
      expect(decisions[0].decisionType).toBe('compliance_check');
      expect(decisions[0].result).toBe('approved');
      
      auditLogger.close();
    });

    it('should log action validations', async () => {
      await governance.validateAction('test-action', {
        circle: 'orchestrator',
        ceremony: 'standup'
      });

      const auditLogger = new DecisionAuditLogger(testGoalieDir);
      const decisions = auditLogger.getRecentDecisions(10);
      
      const actionDecision = decisions.find(d => d.decisionType === 'action_validation');
      expect(actionDecision).toBeDefined();
      expect(actionDecision?.action).toBe('test-action');
      
      auditLogger.close();
    });

    it('should include violation details in logs', async () => {
      // Create violation
      const events = [
        {
          ts: new Date().toISOString(),
          pattern: 'guardrail-lock',
          mode: 'advisory',
          mutation: false,
          gate: 'governance',
          circle: 'orchestrator'
        }
      ];

      const metricsPath = join(testGoalieDir, 'pattern_metrics.jsonl');
      writeFileSync(metricsPath, events.map(e => JSON.stringify(e)).join('\\n'));

      await governance.checkCompliance();

      const auditLogger = new DecisionAuditLogger(testGoalieDir);
      const decisions = auditLogger.getRecentDecisions(10);
      
      expect(decisions[0].violations).toBeDefined();
      expect(decisions[0].violations!.length).toBeGreaterThan(0);
      expect(decisions[0].result).toBe('denied');
      
      auditLogger.close();
    });
  });

  describe('policy management', () => {
    it('should get all active policies', async () => {
      const policies = await governance.getPolicies();
      expect(policies.every(p => p.status === 'active')).toBe(true);
    });

    it('should get policy by id', async () => {
      const policy = await governance.getPolicy('pattern-compliance');
      expect(policy).toBeDefined();
      expect(policy?.id).toBe('pattern-compliance');
    });

    it('should return null for non-existent policy', async () => {
      const policy = await governance.getPolicy('non-existent');
      expect(policy).toBeNull();
    });
  });
});
