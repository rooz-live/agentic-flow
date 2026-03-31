/**
 * Test Suite for IRIS Bridge
 *
 * Tests IRIS CLI output parsing, event transformation, and metrics logging
 */

import * as fs from 'fs/promises';
import * as path from 'path';
// Jest globals are automatically available via @types/jest
// Using jest.fn() instead of vi.fn()
import {
    __resetIrisBridgeCache,
    __setCommandRunner,
    captureIrisMetrics,
    isIrisMetricsEnabled,
} from '../../tools/federation/iris_bridge';

// Mock data
const mockHealthOutput = `✅ Using sql.js (WASM SQLite, no build tools required)

🚀 Smart execution: agentic-flow + AgentDB

1️⃣  Drift Analysis:
   Found 2 unacknowledged alert(s)

2️⃣  Prompt Analysis:
   Analyzing 5 expert(s)
   Generated 3 recommendation(s)

3️⃣  Reflexion Analysis:
   Total: 10
   Stale: 1
   Avg Validity: 95.5%`;

const mockDiscoverOutput = `✅ Using sql.js (WASM SQLite, no build tools required)

📊 SUMMARY
────────────────────────────────────────────────────────────
  Total Files Scanned: 778
  Total Experts Found: 89
  With Telemetry: 0 ✅
  Without Telemetry: 89 ⚠️

  By Language:
    typescript: 54
    python: 35

  By Type:
    ai_function: 87
    dspy_signature: 2`;

// Test setup
const TEST_PROJECT_ROOT = path.join(process.cwd(), '.goalie-test');
const TEST_GOALIE_DIR = path.join(TEST_PROJECT_ROOT, '.goalie');
const TEST_METRICS_LOG = path.join(TEST_GOALIE_DIR, 'metrics_log.jsonl');

describe('IRIS Bridge', () => {
  beforeEach(async () => {
    // Create test project root directory
    await fs.mkdir(TEST_PROJECT_ROOT, { recursive: true });

    // Mock process.cwd() to use test project root
    jest.spyOn(process, 'cwd').mockReturnValue(TEST_PROJECT_ROOT);

    // Provide a deterministic IRIS command runner for tests
    __setCommandRunner(async (command: string, _args: string[]) => {
      switch (command) {
        case 'health':
          return JSON.stringify({
            drift_alerts: 2,
            prompt_recommendations: 3,
          });
        case 'discover':
          return JSON.stringify({
            experts_found: 89,
            without_telemetry: 89,
          });
        default:
          return JSON.stringify({});
      }
    });
  });

  afterEach(async () => {
    await __resetIrisBridgeCache();
    __setCommandRunner(null);
    await fs.rm(TEST_PROJECT_ROOT, { recursive: true, force: true });
    jest.restoreAllMocks();
  });

  describe('isIrisMetricsEnabled', () => {
    it('should return true when AF_ENABLE_IRIS_METRICS=1', () => {
      process.env.AF_ENABLE_IRIS_METRICS = '1';
      expect(isIrisMetricsEnabled()).toBe(true);
      delete process.env.AF_ENABLE_IRIS_METRICS;
    });

    it('should return true when --log-goalie flag is present', () => {
      process.argv.push('--log-goalie');
      expect(isIrisMetricsEnabled()).toBe(true);
      process.argv.pop();
    });

    it('should return false when neither enabled', () => {
      delete process.env.AF_ENABLE_IRIS_METRICS;
      expect(isIrisMetricsEnabled()).toBe(false);
    });
  });

  describe('Health Output Parsing', () => {
    it('should parse health output correctly', async () => {
      const event = await captureIrisMetrics('health', []);

      expect(event.type).toBe('iris_evaluation');
      expect(event.iris_command).toBe('health');
      expect(event.circles_involved).toContain('assessor');
      expect(event.actions_taken).toHaveLength(2);
      expect(event.actions_taken[0].action).toContain('2 drift alert');
      expect(event.actions_taken[0].priority).toBe('urgent');
      expect(event.actions_taken[1].action).toContain('3 optimization recommendation');
      expect(event.actions_taken[1].priority).toBe('important');
    });
  });

  describe('Discover Output Parsing', () => {
    it('should parse discover output correctly', async () => {
      const event = await captureIrisMetrics('discover', []);

      expect(event.iris_command).toBe('discover');
      expect(event.circles_involved).toContain('seeker');
      expect(event.circles_involved).toContain('analyst');
      expect(event.actions_taken.some(a => a.action.includes('89 expert agent'))).toBe(true);
      expect(event.actions_taken.some(a => a.action.includes('89 agent(s) without telemetry'))).toBe(true);
    });
  });

  describe('Event Schema Validation', () => {
    it('should produce valid event schema', async () => {
      const event = await captureIrisMetrics('evaluate', []);

      // Validate required fields
      expect(event).toHaveProperty('type', 'iris_evaluation');
      expect(event).toHaveProperty('timestamp');
      expect(event).toHaveProperty('iris_command');
      expect(event).toHaveProperty('circles_involved');
      expect(event).toHaveProperty('actions_taken');
      expect(event).toHaveProperty('production_maturity');
      expect(event).toHaveProperty('execution_context');

      // Validate timestamp format (ISO 8601)
      expect(new Date(event.timestamp).toISOString()).toBe(event.timestamp);

      // Validate circles_involved is array of strings
      expect(Array.isArray(event.circles_involved)).toBe(true);
      event.circles_involved.forEach(circle => {
        expect(typeof circle).toBe('string');
      });

      // Validate actions_taken structure
      expect(Array.isArray(event.actions_taken)).toBe(true);
      event.actions_taken.forEach(action => {
        expect(action).toHaveProperty('circle');
        expect(action).toHaveProperty('action');
        expect(action).toHaveProperty('priority');
        expect(['critical', 'urgent', 'important', 'normal']).toContain(action.priority);
      });

      // Validate production_maturity structure
      expect(event.production_maturity).toHaveProperty('starlingx_openstack');
      expect(event.production_maturity).toHaveProperty('hostbill');
      expect(event.production_maturity).toHaveProperty('loki_environments');
      expect(event.production_maturity).toHaveProperty('cms_interfaces');
      expect(event.production_maturity).toHaveProperty('communication_stack');
      expect(event.production_maturity).toHaveProperty('messaging_protocols');

      // Validate execution_context
      expect(event.execution_context).toHaveProperty('incremental');
      expect(event.execution_context).toHaveProperty('relentless');
      expect(event.execution_context).toHaveProperty('focused');
      expect(typeof event.execution_context.incremental).toBe('boolean');
      expect(typeof event.execution_context.relentless).toBe('boolean');
      expect(typeof event.execution_context.focused).toBe('boolean');
    });
  });

  describe('Circle Inference', () => {
    it('should assign correct circles for health command', async () => {
      const event = await captureIrisMetrics('health', []);
      expect(event.circles_involved).toContain('assessor');
    });

    it('should assign correct circles for discover command', async () => {
      const event = await captureIrisMetrics('discover', []);
      expect(event.circles_involved).toContain('seeker');
      expect(event.circles_involved).toContain('analyst');
    });

    it('should assign correct circles for evaluate command', async () => {
      const event = await captureIrisMetrics('evaluate', []);
      expect(event.circles_involved).toContain('assessor');
      expect(event.circles_involved).toContain('analyst');
    });

    it('should assign correct circles for patterns command', async () => {
      const event = await captureIrisMetrics('patterns', []);
      expect(event.circles_involved).toContain('innovator');
      expect(event.circles_involved).toContain('analyst');
    });

    it('should assign correct circles for federated command', async () => {
      const event = await captureIrisMetrics('federated', []);
      expect(event.circles_involved).toContain('orchestrator');
      expect(event.circles_involved).toContain('intuitive');
    });
  });

  describe('Priority Tagging', () => {
    it('should tag drift alerts as urgent', async () => {
      const event = await captureIrisMetrics('health', []);
      const driftAction = event.actions_taken.find(a => a.action.includes('drift alert'));
      if (driftAction) {
        expect(driftAction.priority).toBe('urgent');
      }
    });

    it('should tag recommendations as important', async () => {
      const event = await captureIrisMetrics('health', []);
      const recAction = event.actions_taken.find(a => a.action.includes('recommendation'));
      if (recAction) {
        expect(recAction.priority).toBe('important');
      }
    });

    it('should tag missing telemetry as important', async () => {
      const event = await captureIrisMetrics('discover', []);
      const telemetryAction = event.actions_taken.find(a => a.action.includes('without telemetry'));
      if (telemetryAction) {
        expect(telemetryAction.priority).toBe('important');
      }
    });
  });

  describe('Metrics Log Writing', () => {
    it('should append event to .goalie/metrics_log.jsonl and propagate environment', async () => {
      process.env.AF_IRIS_ENVIRONMENT = 'prod';

      const event = await captureIrisMetrics('evaluate', []);

      // Read metrics log
      const logContent = await fs.readFile(TEST_METRICS_LOG, 'utf8');
      const lines = logContent.trim().split('\n');

      expect(lines.length).toBeGreaterThan(0);

      // Parse last line
      const lastEvent = JSON.parse(lines[lines.length - 1]);
      expect(lastEvent.type).toBe('iris_evaluation');
      expect(lastEvent.iris_command).toBe('evaluate');
      expect(lastEvent.environment).toBe('prod');
      expect(event.environment).toBe('prod');

      delete process.env.AF_IRIS_ENVIRONMENT;
    });

    it('should create .goalie directory if missing', async () => {
      await fs.rm(TEST_PROJECT_ROOT, { recursive: true, force: true });

      await captureIrisMetrics('health', []);

      // Check directory was created
      const dirExists = await fs.stat(TEST_GOALIE_DIR);
      expect(dirExists.isDirectory()).toBe(true);

      // Check log file exists
      const fileExists = await fs.stat(TEST_METRICS_LOG);
      expect(fileExists.isFile()).toBe(true);
    });
  });

  describe('Production Maturity Status', () => {
    it('should include all required production environments', async () => {
      const event = await captureIrisMetrics('health', []);

      expect(event.production_maturity.starlingx_openstack).toBeDefined();
      expect(event.production_maturity.hostbill).toBeDefined();
      expect(event.production_maturity.loki_environments).toBeDefined();
      expect(event.production_maturity.cms_interfaces.symfony).toBeDefined();
      expect(event.production_maturity.cms_interfaces.oro).toBeDefined();
      expect(event.production_maturity.cms_interfaces.wordpress).toBeDefined();
      expect(event.production_maturity.cms_interfaces.flarum).toBeDefined();
      expect(event.production_maturity.communication_stack.telnyx).toBeDefined();
      expect(event.production_maturity.communication_stack.plivo).toBeDefined();
      expect(event.production_maturity.communication_stack.sms).toBeDefined();
      expect(event.production_maturity.communication_stack.ivr).toBeDefined();
      expect(event.production_maturity.communication_stack.tts).toBeDefined();
      expect(event.production_maturity.messaging_protocols).toContain('smtp');
      expect(event.production_maturity.messaging_protocols).toContain('websocket');
      expect(event.production_maturity.messaging_protocols).toContain('grpc');
      expect(event.production_maturity.messaging_protocols).toContain('rest');
    });
  });

  describe('Execution Context', () => {
    it('should default to incremental/relentless/focused=true', async () => {
      const event = await captureIrisMetrics('health', []);
      expect(event.execution_context.incremental).toBe(true);
      expect(event.execution_context.relentless).toBe(true);
      expect(event.execution_context.focused).toBe(true);
    });

    it('should accept custom execution context', async () => {
      const event = await captureIrisMetrics('health', [], {
        incremental: false,
        relentless: true,
        focused: false,
      });
      expect(event.execution_context.incremental).toBe(false);
      expect(event.execution_context.relentless).toBe(true);
      expect(event.execution_context.focused).toBe(false);
    });
  });
});
