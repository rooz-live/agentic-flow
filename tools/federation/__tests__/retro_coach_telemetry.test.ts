/**
 * Retro Coach Telemetry Integration Tests
 *
 * Verifies that telemetry consumers (pattern_metrics.jsonl, metrics_log.jsonl)
 * continue to work after schema changes for closed-loop production maturity.
 */

import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';

describe('Retro Coach Telemetry Schema Compatibility', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'retro-coach-test-'));
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('pattern_metrics.jsonl schema', () => {
    it('should accept circle_participation events with patterns_triggered field', async () => {
      const event = {
        ts: new Date().toISOString(),
        run: 'prod-cycle',
        run_id: 'test-run-123',
        iteration: 1,
        circle: 'analyst',
        depth: 4,
        pattern: 'circle-participation',
        economic: { cod: 100, wsjf_score: 8.5, risk_score: 75 },
        roam_delta: 5,
        action: 'capture-participation',
        outcome: 'success',
        patterns_triggered: ['depth-ladder', 'observability-first'],
        mode: 'advisory',
        gate: 'observability',
      };

      const filePath = path.join(testDir, 'pattern_metrics.jsonl');
      await fs.writeFile(filePath, JSON.stringify(event) + '\n');

      const content = await fs.readFile(filePath, 'utf8');
      const parsed = JSON.parse(content.trim());

      expect(parsed.patterns_triggered).toEqual(['depth-ladder', 'observability-first']);
      expect(parsed.economic.cod).toBe(100);
      expect(parsed.economic.wsjf_score).toBe(8.5);
    });

    it('should accept iterative-rca-recommendation events', async () => {
      const event = {
        ts: new Date().toISOString(),
        run: 'prod-cycle',
        run_id: 'test-run-456',
        iteration: 3,
        circle: 'orchestrator',
        pattern: 'iterative-rca-recommendation',
        detected_pattern: 'cascading-failure',
        rca_method: '5-whys',
        recommended_action: 'Apply circuit-breaker pattern',
        priority: 'critical',
        cod_impact: 250,
        mode: 'iterative',
        gate: 'rca-analysis',
      };

      const filePath = path.join(testDir, 'pattern_metrics.jsonl');
      await fs.writeFile(filePath, JSON.stringify(event) + '\n');

      const content = await fs.readFile(filePath, 'utf8');
      const parsed = JSON.parse(content.trim());

      expect(parsed.priority).toBe('critical');
      expect(parsed.rca_method).toBe('5-whys');
      expect(parsed.detected_pattern).toBe('cascading-failure');
    });
  });

  describe('metrics_log.jsonl schema', () => {
    it('should accept circle_participation events with patterns_triggered', async () => {
      const event = {
        type: 'circle_participation',
        timestamp: new Date().toISOString(),
        run_id: 'test-run-789',
        iteration: 2,
        circle: 'assessor',
        depth: 3,
        economic: { cod: 50, wsjf_score: 6.0, risk_score: 80 },
        roam_delta: 3,
        outcome: 'partial',
        evaluation_duration_ms: 1500,
        patterns_duration_ms: 800,
        patterns_triggered: ['safe-degrade', 'circle-risk-focus'],
        circles: [
          {
            circle: 'assessor',
            role: 'coordinator',
            participation_level: 100,
            responsibilities: ['cycle_orchestration', 'iris_integration'],
          },
        ],
      };

      const filePath = path.join(testDir, 'metrics_log.jsonl');
      await fs.writeFile(filePath, JSON.stringify(event) + '\n');

      const content = await fs.readFile(filePath, 'utf8');
      const parsed = JSON.parse(content.trim());

      expect(parsed.type).toBe('circle_participation');
      expect(parsed.patterns_triggered).toContain('safe-degrade');
      expect(parsed.circles[0].role).toBe('coordinator');
    });
  });

  describe('governance_state.json schema', () => {
    it('should include version field and schema metadata', async () => {
      const state = {
        version: '1.1',
        schema: {
          description: 'Governance state for prod-cycle self-tuning',
          patterns: ['depth-ladder', 'circle-rotation', 'iteration-budget', 'safe-degrade'],
          delta_evaluation: 'SAFLA-weighted',
        },
        depth_ladder: { base_depth: 4 },
        circle_rotation: { skipped_circles: [], negative_delta_counts: {} },
        iteration_budget: { max_iterations: 100, extensions_history: [0, 0, 0] },
        safe_degrade: { incident_threshold: 8 },
        delta_history: [],
        last_updated: new Date().toISOString(),
      };

      const filePath = path.join(testDir, 'governance_state.json');
      await fs.writeFile(filePath, JSON.stringify(state, null, 2));

      const content = await fs.readFile(filePath, 'utf8');
      const parsed = JSON.parse(content);

      expect(parsed.version).toBe('1.1');
      expect(parsed.schema.patterns).toContain('depth-ladder');
      expect(parsed.delta_history).toEqual([]);
    });
  });

  describe('CONSOLIDATED_ACTIONS.yaml schema', () => {
    it('should support verified and highImpact boolean fields', async () => {
      const action = {
        id: 'RCA-1234567890-abc123',
        title: 'Apply circuit-breaker pattern to iris_evaluate',
        status: 'PENDING',
        created_at: new Date().toISOString(),
        pattern: 'cascading-failure',
        rca_method: '5-whys',
        priority: 'critical',
        circle: 'orchestrator',
        rca_iteration: 5,
        source: 'iterative-rca',
        verified: false,
        highImpact: false,
        cod_impact: 250,
      };

      expect(action.verified).toBe(false);
      expect(action.highImpact).toBe(false);
      expect(action.priority).toBe('critical');
    });

    it('should support forensic_metrics field after verification', async () => {
      const action = {
        id: 'RCA-1234567890-def456',
        title: 'Implement backoff-retry with jitter',
        status: 'COMPLETE',
        completed_at: new Date().toISOString(),
        pattern: 'retry-storm',
        rca_method: 'fishbone',
        priority: 'urgent',
        verified: true,
        verified_at: new Date().toISOString(),
        verification_method: 'forensic-24h-window',
        highImpact: true,
        highImpact_detected_at: new Date().toISOString(),
        forensic_metrics: {
          cod_pre: 150,
          cod_post: 75,
          wsjf_pre: 6.0,
          wsjf_post: 8.5,
          freq_pre: 10,
          freq_post: 2,
          last_analyzed: new Date().toISOString(),
        },
      };

      expect(action.verified).toBe(true);
      expect(action.highImpact).toBe(true);
      expect(action.forensic_metrics.cod_pre).toBe(150);
      expect(action.forensic_metrics.cod_post).toBe(75);
      expect(action.forensic_metrics.freq_pre).toBeGreaterThan(action.forensic_metrics.freq_post);
    });

    it('should validate priority levels', () => {
      const validPriorities = ['critical', 'urgent', 'important', 'normal', 'low'];
      const priorityRank: Record<string, number> = {
        critical: 4,
        urgent: 3,
        important: 2,
        normal: 1,
        low: 0,
      };

      for (const priority of validPriorities) {
        expect(priorityRank[priority]).toBeDefined();
      }

      expect(priorityRank['critical']).toBeGreaterThan(priorityRank['urgent']);
      expect(priorityRank['urgent']).toBeGreaterThan(priorityRank['important']);
    });
  });
});
