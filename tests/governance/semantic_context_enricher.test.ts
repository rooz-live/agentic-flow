/**
 * Tests for SemanticContextEnricher (P1-TIME)
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { SemanticContextEnricher, SemanticContext, EnrichedPatternEvent } from '../../src/governance/core/semantic_context_enricher';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('SemanticContextEnricher', () => {
  let testDir: string;
  let enricher: SemanticContextEnricher;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'semantic-test-'));
    enricher = new SemanticContextEnricher({
      goalieDir: testDir,
      enableHistoricalAnalysis: true
    });
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('enrichEvent', () => {
    it('should enrich a circuit-breaker event with full context', () => {
      const event = {
        ts: new Date().toISOString(),
        pattern: 'circuit-breaker',
        mode: 'enforcement',
        mutation: false,
        gate: 'health',
        circle: 'orchestrator',
        correlation_id: 'test-123'
      };

      const enriched = enricher.enrichEvent(event, {});

      expect(enriched.semantic_context).toBeDefined();
      expect(enriched.semantic_context?.rationale).toContain('cascading failures');
      expect(enriched.semantic_context?.trigger.type).toBe('threshold_exceeded');
      expect(enriched.semantic_context?.trigger.severity).toBe('critical');
      expect(enriched.semantic_context?.decision_maker).toBe('circuit_breaker');
      expect(enriched.semantic_context?.confidence).toBeGreaterThan(0.5);
    });

    it('should enrich a health check event', () => {
      const event = {
        ts: new Date().toISOString(),
        pattern: 'health-check',
        mode: 'advisory',
        mutation: false,
        gate: 'health',
        circle: 'assessor'
      };

      const enriched = enricher.enrichEvent(event, {});

      expect(enriched.semantic_context?.rationale).toContain('Health check');
      expect(enriched.semantic_context?.trigger.type).toBe('scheduled');
      expect(enriched.semantic_context?.decision_maker).toBe('health_monitor');
      expect(enriched.semantic_context?.expected_outcome).toContain('health metrics');
    });

    it('should enrich a guardrail enforcement event', () => {
      const event = {
        ts: new Date().toISOString(),
        pattern: 'guardrail-lock',
        mode: 'enforcement',
        mutation: false,
        gate: 'governance',
        circle: 'orchestrator'
      };

      const enriched = enricher.enrichEvent(event, {});

      expect(enriched.semantic_context?.rationale).toContain('Guardrail enforcement');
      expect(enriched.semantic_context?.trigger.type).toBe('policy_violation');
      expect(enriched.semantic_context?.trigger.severity).toBe('medium');
      expect(enriched.semantic_context?.compliance.aligned_policies).toContain('pattern-compliance-guardrail-lock');
    });

    it('should enrich an adaptive mutation event', () => {
      const event = {
        ts: new Date().toISOString(),
        pattern: 'adaptive-threshold',
        mode: 'mutation',
        mutation: true,
        gate: 'wsjf',
        circle: 'innovator'
      };

      const enriched = enricher.enrichEvent(event, {});

      expect(enriched.semantic_context?.rationale).toContain('Adaptive mutation');
      expect(enriched.semantic_context?.trigger.type).toBe('adaptive_learning');
      expect(enriched.semantic_context?.decision_maker).toBe('adaptive_agent');
      expect(enriched.semantic_context?.risk_assessment?.residual_risks).toContain('Adaptive changes may introduce unexpected behavior');
    });

    it('should preserve custom rationale when provided', () => {
      const event = {
        ts: new Date().toISOString(),
        pattern: 'custom-pattern',
        mode: 'advisory',
        mutation: false,
        gate: 'focus',
        circle: 'seeker'
      };

      const customRationale = 'Custom business logic requires this pattern';
      const enriched = enricher.enrichEvent(event, {
        rationale: customRationale
      });

      expect(enriched.semantic_context?.rationale).toBe(customRationale);
    });

    it('should include decision factors when economic data present', () => {
      const event = {
        ts: new Date().toISOString(),
        pattern: 'wsjf-optimization',
        mode: 'advisory',
        mutation: false,
        gate: 'wsjf',
        circle: 'orchestrator',
        economic: {
          cod: 50,
          wsjf_score: 25.5
        }
      };

      const enriched = enricher.enrichEvent(event, {});

      expect(enriched.semantic_context?.decision_factors).toBeDefined();
      const economicFactor = enriched.semantic_context?.decision_factors?.find(f => f.factor === 'Economic Value');
      expect(economicFactor).toBeDefined();
      expect(economicFactor?.weight).toBe(0.3);
      expect(economicFactor?.reasoning).toContain('25.5');
    });

    it('should include alternatives for circuit-breaker events', () => {
      const event = {
        ts: new Date().toISOString(),
        pattern: 'circuit-breaker',
        mode: 'enforcement',
        mutation: false,
        gate: 'health',
        circle: 'orchestrator'
      };

      const enriched = enricher.enrichEvent(event, {});

      expect(enriched.semantic_context?.alternatives_considered).toBeDefined();
      expect(enriched.semantic_context?.alternatives_considered?.length).toBeGreaterThan(0);
      expect(enriched.semantic_context?.alternatives_considered).toContain('Continue with increased error logging');
    });

    it('should include success criteria for health checks', () => {
      const event = {
        ts: new Date().toISOString(),
        pattern: 'health-monitor',
        mode: 'advisory',
        mutation: false,
        gate: 'health',
        circle: 'assessor'
      };

      const enriched = enricher.enrichEvent(event, {});

      expect(enriched.semantic_context?.success_criteria).toBeDefined();
      expect(enriched.semantic_context?.success_criteria?.length).toBeGreaterThan(0);
      expect(enriched.semantic_context?.success_criteria?.some(c => c.includes('health metrics'))).toBe(true);
    });

    it('should calculate risk assessment', () => {
      const event = {
        ts: new Date().toISOString(),
        pattern: 'safe-degrade',
        mode: 'enforcement',
        mutation: false,
        gate: 'health',
        circle: 'orchestrator'
      };

      const enriched = enricher.enrichEvent(event, {
        trigger: {
          type: 'cascade_prevention',
          description: 'System stress',
          severity: 'high'
        }
      });

      expect(enriched.semantic_context?.risk_assessment).toBeDefined();
      expect(enriched.semantic_context?.risk_assessment?.pre_action_risk).toBe(60);
      expect(enriched.semantic_context?.risk_assessment?.post_action_risk).toBe(12);
      expect(enriched.semantic_context?.risk_assessment?.risk_reduction).toBe(48);
    });

    it('should identify stakeholders', () => {
      const event = {
        ts: new Date().toISOString(),
        pattern: 'circuit-breaker',
        mode: 'enforcement',
        mutation: false,
        gate: 'health',
        circle: 'orchestrator'
      };

      const enriched = enricher.enrichEvent(event, {});

      expect(enriched.semantic_context?.stakeholders).toBeDefined();
      expect(enriched.semantic_context?.stakeholders?.circle).toBe('orchestrator');
      expect(enriched.semantic_context?.stakeholders?.ceremony).toBe('health');
      expect(enriched.semantic_context?.stakeholders?.affected_systems).toContain('load-balancer');
    });

    it('should assess compliance impact', () => {
      const event = {
        ts: new Date().toISOString(),
        pattern: 'governance-check',
        mode: 'enforcement',
        mutation: false,
        gate: 'governance',
        circle: 'orchestrator'
      };

      const enriched = enricher.enrichEvent(event, {});

      expect(enriched.semantic_context?.compliance).toBeDefined();
      expect(enriched.semantic_context?.compliance.overall_compliance_impact).toBe(20);
      expect(enriched.semantic_context?.compliance.aligned_policies.length).toBeGreaterThan(0);
    });

    it('should detect compliance conflicts', () => {
      const event = {
        ts: new Date().toISOString(),
        pattern: 'governance-check',
        mode: 'advisory', // Conflict: advisory mode with governance gate
        mutation: false,
        gate: 'governance',
        circle: 'orchestrator'
      };

      const enriched = enricher.enrichEvent(event, {});

      expect(enriched.semantic_context?.compliance.potential_conflicts.length).toBeGreaterThan(0);
      expect(enriched.semantic_context?.compliance.potential_conflicts[0]).toContain('Advisory mode conflicts');
    });

    it('should add outcome tracking', () => {
      const event = {
        ts: new Date().toISOString(),
        pattern: 'test-pattern',
        mode: 'advisory',
        mutation: false,
        gate: 'wsjf',
        circle: 'seeker'
      };

      const enriched = enricher.enrichEvent(event, {
        expected_outcome: 'Improve throughput by 20%'
      });

      expect(enriched.outcome_tracking).toBeDefined();
      expect(enriched.outcome_tracking?.expected_duration_ms).toBe(60000);
      expect(enriched.outcome_tracking?.expected_impact_score).toBeGreaterThan(0);
      expect(enriched.outcome_tracking?.actual_outcome).toBe('pending');
      expect(enriched.outcome_tracking?.verification_timestamp).toBeDefined();
    });

    it('should calculate confidence based on mode and gate', () => {
      const enforcementEvent = {
        ts: new Date().toISOString(),
        pattern: 'test',
        mode: 'enforcement',
        mutation: false,
        gate: 'governance',
        circle: 'orchestrator'
      };

      const advisoryEvent = {
        ...enforcementEvent,
        mode: 'advisory',
        gate: 'focus'
      };

      const enrichedEnforcement = enricher.enrichEvent(enforcementEvent, {});
      const enrichedAdvisory = enricher.enrichEvent(advisoryEvent, {});

      expect(enrichedEnforcement.semantic_context?.confidence).toBeGreaterThan(
        enrichedAdvisory.semantic_context?.confidence || 0
      );
    });
  });

  describe('writeEnrichedEvent', () => {
    it('should write enriched event to pattern metrics file', () => {
      const metricsPath = path.join(testDir, 'pattern_metrics.jsonl');
      const event = {
        ts: new Date().toISOString(),
        pattern: 'test-pattern',
        mode: 'advisory',
        mutation: false,
        gate: 'wsjf',
        circle: 'seeker'
      };

      const enriched = enricher.enrichEvent(event, {});
      enricher.writeEnrichedEvent(enriched);

      expect(fs.existsSync(metricsPath)).toBe(true);
      const content = fs.readFileSync(metricsPath, 'utf-8');
      expect(content.trim()).toBeTruthy();
      
      const parsed = JSON.parse(content.trim());
      expect(parsed.semantic_context).toBeDefined();
      expect(parsed.pattern).toBe('test-pattern');
    });

    it('should append multiple enriched events', () => {
      const metricsPath = path.join(testDir, 'pattern_metrics.jsonl');
      
      for (let i = 0; i < 3; i++) {
        const event = {
          ts: new Date().toISOString(),
          pattern: `pattern-${i}`,
          mode: 'advisory',
          mutation: false,
          gate: 'wsjf',
          circle: 'seeker'
        };
        const enriched = enricher.enrichEvent(event, {});
        enricher.writeEnrichedEvent(enriched);
      }

      const content = fs.readFileSync(metricsPath, 'utf-8');
      const lines = content.trim().split('\n');
      expect(lines.length).toBe(3);
      
      lines.forEach((line, i) => {
        const parsed = JSON.parse(line);
        expect(parsed.pattern).toBe(`pattern-${i}`);
        expect(parsed.semantic_context).toBeDefined();
      });
    });
  });

  describe('analyzeContextCoverage', () => {
    it('should return zero coverage for empty metrics file', () => {
      const coverage = enricher.analyzeContextCoverage(24);

      expect(coverage.total_events).toBe(0);
      expect(coverage.enriched_events).toBe(0);
      expect(coverage.coverage_percentage).toBe(0);
      expect(coverage.patterns_with_context).toEqual([]);
      expect(coverage.patterns_without_context).toEqual([]);
    });

    it('should calculate coverage percentage correctly', () => {
      const metricsPath = path.join(testDir, 'pattern_metrics.jsonl');
      
      // Write 2 enriched events
      for (let i = 0; i < 2; i++) {
        const event = {
          ts: new Date().toISOString(),
          pattern: `enriched-${i}`,
          mode: 'advisory',
          mutation: false,
          gate: 'wsjf',
          circle: 'seeker'
        };
        const enriched = enricher.enrichEvent(event, {});
        enricher.writeEnrichedEvent(enriched);
      }
      
      // Write 3 non-enriched events
      for (let i = 0; i < 3; i++) {
        const event = {
          ts: new Date().toISOString(),
          pattern: `plain-${i}`,
          mode: 'advisory',
          mutation: false,
          gate: 'wsjf',
          circle: 'seeker'
        };
        fs.appendFileSync(metricsPath, JSON.stringify(event) + '\n');
      }

      const coverage = enricher.analyzeContextCoverage(24);

      expect(coverage.total_events).toBe(5);
      expect(coverage.enriched_events).toBe(2);
      expect(coverage.coverage_percentage).toBe(40);
      expect(coverage.patterns_with_context.length).toBe(2);
      expect(coverage.patterns_without_context.length).toBe(3);
    });

    it('should filter events by time window', () => {
      const metricsPath = path.join(testDir, 'pattern_metrics.jsonl');
      
      // Write old event (48 hours ago)
      const oldEvent = {
        ts: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        pattern: 'old-pattern',
        mode: 'advisory',
        mutation: false,
        gate: 'wsjf',
        circle: 'seeker'
      };
      const enrichedOld = enricher.enrichEvent(oldEvent, {});
      enricher.writeEnrichedEvent(enrichedOld);
      
      // Write recent event
      const recentEvent = {
        ts: new Date().toISOString(),
        pattern: 'recent-pattern',
        mode: 'advisory',
        mutation: false,
        gate: 'wsjf',
        circle: 'seeker'
      };
      const enrichedRecent = enricher.enrichEvent(recentEvent, {});
      enricher.writeEnrichedEvent(enrichedRecent);

      const coverage = enricher.analyzeContextCoverage(24); // Last 24 hours

      expect(coverage.total_events).toBe(1); // Only recent event
      expect(coverage.patterns_with_context).toContain('recent-pattern');
      expect(coverage.patterns_with_context).not.toContain('old-pattern');
    });

    it('should identify unique patterns', () => {
      const metricsPath = path.join(testDir, 'pattern_metrics.jsonl');
      
      // Write multiple events with same pattern
      for (let i = 0; i < 3; i++) {
        const event = {
          ts: new Date().toISOString(),
          pattern: 'repeated-pattern',
          mode: 'advisory',
          mutation: false,
          gate: 'wsjf',
          circle: 'seeker'
        };
        const enriched = enricher.enrichEvent(event, {});
        enricher.writeEnrichedEvent(enriched);
      }

      const coverage = enricher.analyzeContextCoverage(24);

      expect(coverage.total_events).toBe(3);
      expect(coverage.enriched_events).toBe(3);
      expect(coverage.patterns_with_context.length).toBe(1); // Only 1 unique pattern
      expect(coverage.patterns_with_context[0]).toBe('repeated-pattern');
    });
  });

  describe('Historical Analysis', () => {
    it('should load decision history from existing metrics', () => {
      const metricsPath = path.join(testDir, 'pattern_metrics.jsonl');
      
      // Write enriched events
      for (let i = 0; i < 5; i++) {
        const event = {
          ts: new Date().toISOString(),
          pattern: 'circuit-breaker',
          mode: 'enforcement',
          mutation: false,
          gate: 'health',
          circle: 'orchestrator'
        };
        const enriched = enricher.enrichEvent(event, {});
        enricher.writeEnrichedEvent(enriched);
      }

      // Create new enricher to test loading
      const newEnricher = new SemanticContextEnricher({
        goalieDir: testDir,
        enableHistoricalAnalysis: true
      });

      const event = {
        ts: new Date().toISOString(),
        pattern: 'circuit-breaker',
        mode: 'enforcement',
        mutation: false,
        gate: 'health',
        circle: 'orchestrator'
      };

      const enriched = newEnricher.enrichEvent(event, {});

      expect(enriched.semantic_context?.historical_context).toBeDefined();
      expect(enriched.semantic_context?.historical_context?.similar_decisions).toBe(5);
    });

    it('should increase confidence with more historical data', () => {
      const metricsPath = path.join(testDir, 'pattern_metrics.jsonl');
      
      // Write 10 historical events
      for (let i = 0; i < 10; i++) {
        const event = {
          ts: new Date().toISOString(),
          pattern: 'test-pattern',
          mode: 'advisory',
          mutation: false,
          gate: 'wsjf',
          circle: 'seeker'
        };
        const enriched = enricher.enrichEvent(event, {});
        enricher.writeEnrichedEvent(enriched);
      }

      // Create new enricher with historical analysis
      const newEnricher = new SemanticContextEnricher({
        goalieDir: testDir,
        enableHistoricalAnalysis: true
      });

      const eventWithHistory = {
        ts: new Date().toISOString(),
        pattern: 'test-pattern',
        mode: 'advisory',
        mutation: false,
        gate: 'wsjf',
        circle: 'seeker'
      };

      const eventWithoutHistory = {
        ts: new Date().toISOString(),
        pattern: 'new-pattern',
        mode: 'advisory',
        mutation: false,
        gate: 'wsjf',
        circle: 'seeker'
      };

      const enrichedWith = newEnricher.enrichEvent(eventWithHistory, {});
      const enrichedWithout = newEnricher.enrichEvent(eventWithoutHistory, {});

      expect(enrichedWith.semantic_context?.confidence).toBeGreaterThan(
        enrichedWithout.semantic_context?.confidence || 0
      );
    });
  });
});
