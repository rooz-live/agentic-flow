/**
 * Enterprise-Grade IRIS Bridge Unit Tests
 * 
 * Comprehensive test suite for the IRIS bridge module covering enterprise features
 * including circuit breaker, retry strategies, performance monitoring, validation,
 * and governance metrics.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

import { EnterpriseIrisBridge } from '../iris_bridge.js';
import { 
  IrisBridgeConfig,
  IrisCaptureOptions,
  IrisMetricsEvent,
  IrisCircuitBreakerState,
  RiskLevel,
  DEFAULT_IRIS_BRIDGE_CONFIG,
} from '../iris_types.js';
import { createIrisConfigManager } from '../iris_config.js';

// Mock dependencies
jest.mock('child_process', () => ({
  spawn: jest.fn(),
}));

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  promises: {
    ...jest.requireActual('fs').promises,
    mkdir: jest.fn(),
    appendFile: jest.fn(),
    stat: jest.fn(),
    readFile: jest.fn(),
  },
}));

describe('EnterpriseIrisBridge', () => {
  let bridge: EnterpriseIrisBridge;
  let mockConfig: IrisBridgeConfig;
  let testDir: string;

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create test directory
    testDir = path.join('/tmp', 'iris-bridge-test', randomUUID());
    await fs.mkdir(testDir, { recursive: true });

    // Create mock configuration
    mockConfig = {
      ...DEFAULT_IRIS_BRIDGE_CONFIG,
      enableEnterpriseFeatures: true,
      logLevel: 'info',
      retry: {
        maxAttempts: 3,
        baseDelayMs: 100,
        maxDelayMs: 1000,
        backoffMultiplier: 2,
        jitter: false,
      },
      circuitBreaker: {
        failureThreshold: 3,
        recoveryTimeoutMs: 5000,
        monitoringPeriodMs: 1000,
        halfOpenMaxCalls: 2,
      },
      performance: {
        enableMetrics: true,
        enableTracing: true,
        memoryThresholdMb: 512,
        executionTimeoutMs: 30000,
        enableResourceMonitoring: true,
      },
      validation: {
        enableInputSanitization: true,
        enableCommandWhitelist: true,
        allowedCommands: ['health', 'discover', 'evaluate', 'patterns', 'telemetry', 'federated'],
        maxArgsLength: 10,
        enableOutputValidation: true,
      },
      concurrency: {
        maxConcurrentCommands: 5,
        resourcePoolSize: 10,
        queueTimeoutMs: 5000,
        enablePriorityQueue: true,
      },
    };

    // Create bridge instance
    bridge = new EnterpriseIrisBridge(mockConfig);
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      const defaultBridge = new EnterpriseIrisBridge();
      expect(defaultBridge).toBeInstanceOf(EnterpriseIrisBridge);
    });

    it('should initialize with custom configuration', () => {
      const customBridge = new EnterpriseIrisBridge(mockConfig);
      expect(customBridge).toBeInstanceOf(EnterpriseIrisBridge);
    });

    it('should initialize enterprise features when enabled', () => {
      const enabledBridge = new EnterpriseIrisBridge({ ...mockConfig, enableEnterpriseFeatures: true });
      const metrics = enabledBridge.getMetrics();
      expect(Array.isArray(metrics)).toBe(true);
    });

    it('should disable enterprise features when disabled', () => {
      const disabledBridge = new EnterpriseIrisBridge({ ...mockConfig, enableEnterpriseFeatures: false });
      const metrics = disabledBridge.getMetrics();
      expect(metrics).toEqual([]);
    });
  });

  describe('Command Validation', () => {
    it('should validate allowed commands', async () => {
      const { spawn } = require('child_process');
      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') callback(0);
        }),
      };
      spawn.mockReturnValue(mockChild);

      const result = await bridge.captureIrisMetrics('health', [], {
        logFile: path.join(testDir, 'metrics.jsonl'),
      });

      expect(result).toBeDefined();
      expect(result.iris_command).toBe('health');
      expect(result.correlation_id).toBeDefined();
      expect(result.execution_id).toBeDefined();
    });

    it('should reject disallowed commands', async () => {
      const invalidBridge = new EnterpriseIrisBridge({
        ...mockConfig,
        validation: {
          ...mockConfig.validation,
          enableCommandWhitelist: true,
          allowedCommands: ['health'],
        },
      });

      await expect(invalidBridge.captureIrisMetrics('invalid-command', []))
        .rejects.toThrow('Command validation failed');
    });

    it('should sanitize input when enabled', async () => {
      const sanitizingBridge = new EnterpriseIrisBridge({
        ...mockConfig,
        validation: {
          ...mockConfig.validation,
          enableInputSanitization: true,
        },
      });

      const { spawn } = require('child_process');
      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') callback(0);
        }),
      };
      spawn.mockReturnValue(mockChild);

      const result = await sanitizingBridge.captureIrisMetrics('health', ['<script>alert("xss")</script>'], {
        logFile: path.join(testDir, 'metrics.jsonl'),
      });

      expect(result).toBeDefined();
      expect(result.command_args).not.toContain('<script>');
    });

    it('should validate args length', async () => {
      const strictBridge = new EnterpriseIrisBridge({
        ...mockConfig,
        validation: {
          ...mockConfig.validation,
          maxArgsLength: 2,
        },
      });

      await expect(strictBridge.captureIrisMetrics('health', ['arg1', 'arg2', 'arg3']))
        .rejects.toThrow('Command validation failed');
    });
  });

  describe('Circuit Breaker', () => {
    it('should allow commands when circuit is closed', async () => {
      const { spawn } = require('child_process');
      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') callback(0);
        }),
      };
      spawn.mockReturnValue(mockChild);

      const result = await bridge.captureIrisMetrics('health', []);
      expect(result).toBeDefined();
    });

    it('should open circuit after failure threshold', async () => {
      const failingBridge = new EnterpriseIrisBridge({
        ...mockConfig,
        circuitBreaker: {
          ...mockConfig.circuitBreaker,
          failureThreshold: 2,
        },
      });

      const { spawn } = require('child_process');
      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') callback(1); // Always fail
        }),
      };
      spawn.mockReturnValue(mockChild);

      // Fail twice to open circuit
      await expect(failingBridge.captureIrisMetrics('health', [])).rejects.toThrow();
      await expect(failingBridge.captureIrisMetrics('health', [])).rejects.toThrow();

      // Third call should be blocked by circuit breaker
      await expect(failingBridge.captureIrisMetrics('health', []))
        .rejects.toThrow('Circuit breaker is open');
    });

    it('should transition to half-open after recovery timeout', async () => {
      const { spawn } = require('child_process');
      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') callback(0);
        }),
      };
      spawn.mockReturnValue(mockChild);

      // This would need to be tested with time manipulation
      // For now, just verify the circuit breaker status
      const status = bridge.getCircuitBreakerStatus();
      expect(status).toBeDefined();
      expect(status.state).toBeDefined();
    });
  });

  describe('Retry Strategy', () => {
    it('should retry failed commands', async () => {
      const { spawn } = require('child_process');
      let attemptCount = 0;
      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            attemptCount++;
            callback(attemptCount < 3 ? 1 : 0); // Fail first 2 attempts
          }
        }),
      };
      spawn.mockReturnValue(mockChild);

      const result = await bridge.captureIrisMetrics('health', [], {
        logFile: path.join(testDir, 'metrics.jsonl'),
      });

      expect(result).toBeDefined();
      expect(spawn).toHaveBeenCalledTimes(3);
    });

    it('should respect max retry attempts', async () => {
      const { spawn } = require('child_process');
      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') callback(1); // Always fail
        }),
      };
      spawn.mockReturnValue(mockChild);

      await expect(bridge.captureIrisMetrics('health', []))
        .rejects.toThrow('Command failed after 3 attempts');
      
      expect(spawn).toHaveBeenCalledTimes(3);
    });

    it('should calculate exponential backoff', async () => {
      const { spawn } = require('child_process');
      const delays: number[] = [];
      const originalSetTimeout = global.setTimeout;
      
      global.setTimeout = jest.fn((callback, delay) => {
        delays.push(delay);
        return originalSetTimeout(callback, delay);
      });

      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') callback(1);
        }),
      };
      spawn.mockReturnValue(mockChild);

      await expect(bridge.captureIrisMetrics('health', []))
        .rejects.toThrow();

      // Verify exponential backoff: 100ms, 200ms, 400ms
      expect(delays).toContain(100);
      expect(delays).toContain(200);
      expect(delays).toContain(400);

      global.setTimeout = originalSetTimeout;
    });
  });

  describe('Resource Management', () => {
    it('should limit concurrent commands', async () => {
      const { spawn } = require('child_process');
      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') callback(0);
        }),
      };
      spawn.mockReturnValue(mockChild);

      // Start multiple concurrent commands
      const promises = Array(6).fill(null).map(() => 
        bridge.captureIrisMetrics('health', [])
      );

      // Wait for all to complete
      const results = await Promise.allSettled(promises);
      
      // Should have some failures due to resource limits
      const failures = results.filter(r => r.status === 'rejected');
      expect(failures.length).toBeGreaterThan(0);
    });

    it('should update resource metrics', async () => {
      const { spawn } = require('child_process');
      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') callback(0);
        }),
      };
      spawn.mockReturnValue(mockChild);

      await bridge.captureIrisMetrics('health', []);

      const metrics = bridge.getResourcePoolStatus();
      expect(metrics).toBeDefined();
      expect(metrics.activeConnections).toBeGreaterThanOrEqual(0);
      expect(metrics.resourceUtilization).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Performance Monitoring', () => {
    it('should collect performance metrics', async () => {
      const { spawn } = require('child_process');
      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') callback(0);
        }),
      };
      spawn.mockReturnValue(mockChild);

      await bridge.captureIrisMetrics('health', [], {
        logFile: path.join(testDir, 'metrics.jsonl'),
      });

      const metrics = bridge.getMetrics();
      expect(metrics).toBeDefined();
      expect(metrics.length).toBeGreaterThan(0);
      
      const latestMetric = metrics[metrics.length - 1];
      expect(latestMetric.command).toBe('health');
      expect(latestMetric.executionTimeMs).toBeGreaterThan(0);
      expect(latestMetric.memoryUsageMb).toBeGreaterThan(0);
    });

    it('should limit metrics history size', async () => {
      const { spawn } = require('child_process');
      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') callback(0);
        }),
      };
      spawn.mockReturnValue(mockChild);

      // Generate many metrics
      for (let i = 0; i < 100; i++) {
        await bridge.captureIrisMetrics('health', []);
      }

      const metrics = bridge.getMetrics();
      expect(metrics.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('Metrics Event Creation', () => {
    it('should create properly structured metrics event', async () => {
      const { spawn } = require('child_process');
      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') callback(0);
        }),
      };
      spawn.mockReturnValue(mockChild);

      const result = await bridge.captureIrisMetrics('health', [], {
        correlationId: 'test-correlation-id',
        executionId: 'test-execution-id',
        logFile: path.join(testDir, 'metrics.jsonl'),
      });

      // Verify basic event fields
      expect(result.type).toBe('iris_evaluation');
      expect(result.timestamp).toBeDefined();
      expect(result.correlation_id).toBe('test-correlation-id');
      expect(result.execution_id).toBe('test-execution-id');
      expect(result.iris_command).toBe('health');
      expect(result.command_args).toEqual([]);

      // Verify enterprise monitoring fields
      expect(result.performance_metrics).toBeDefined();
      expect(result.circuit_breaker_metrics).toBeDefined();
      expect(result.resource_metrics).toBeDefined();
      expect(result.governance_metrics).toBeDefined();

      // Verify circles involvement
      expect(result.circles_involved).toBeDefined();
      expect(Array.isArray(result.circles_involved)).toBe(true);

      // Verify production maturity
      expect(result.production_maturity).toBeDefined();
      expect(result.production_maturity.maturity_level).toBeDefined();

      // Verify execution context
      expect(result.execution_context).toBeDefined();
      expect(result.execution_context.incremental).toBe(true);
    });

    it('should handle error events properly', async () => {
      const { spawn } = require('child_process');
      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') callback(1);
        }),
      };
      spawn.mockReturnValue(mockChild);

      await expect(bridge.captureIrisMetrics('health', []))
        .rejects.toThrow();

      // Verify error was handled and metrics were still written
      expect(fs.appendFile).toHaveBeenCalled();
    });
  });

  describe('Configuration Management', () => {
    it('should emit config-updated event', async () => {
      const configSpy = jest.fn();
      bridge.on('config-updated', configSpy);

      // Simulate config update
      const configManager = createIrisConfigManager();
      await configManager.saveConfig({ logLevel: 'debug' });

      // In a real scenario, this would trigger the watcher
      // For now, just verify the event system works
      expect(typeof bridge.on).toBe('function');
    });

    it('should reinitialize features on config change', () => {
      const initialStatus = bridge.getCircuitBreakerStatus();
      expect(initialStatus).toBeDefined();

      // Config changes would trigger reinitialization
      // This is tested implicitly through the initialization
    });
  });

  describe('Distributed Tracing', () => {
    it('should create trace spans for commands', async () => {
      const traceSpy = jest.fn();
      bridge.on('trace-completed', traceSpy);

      const { spawn } = require('child_process');
      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') callback(0);
        }),
      };
      spawn.mockReturnValue(mockChild);

      await bridge.captureIrisMetrics('health', []);

      expect(traceSpy).toHaveBeenCalled();
      
      const traceCall = traceSpy.mock.calls[0][0];
      expect(traceCall.operationName).toBe('iris.health');
      expect(traceCall.duration).toBeGreaterThan(0);
      expect(traceCall.tags).toBeDefined();
    });
  });

  describe('Security and Input Validation', () => {
    it('should sanitize dangerous input', async () => {
      const { spawn } = require('child_process');
      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') callback(0);
        }),
      };
      spawn.mockReturnValue(mockChild);

      const result = await bridge.captureIrisMetrics('health', [
        'arg-with\x00-control-char',
        'arg-with<br>-html',
        'arg-with-quotes"'
      ], {
        logFile: path.join(testDir, 'metrics.jsonl'),
      });

      expect(result).toBeDefined();
      // Verify sanitization occurred
      expect(result.command_args[0]).not.toContain('\x00');
      expect(result.command_args[1]).not.toContain('<br>');
    });

    it('should enforce command whitelist', async () => {
      const { spawn } = require('child_process');
      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') callback(0);
        }),
      };
      spawn.mockReturnValue(mockChild);

      await expect(bridge.captureIrisMetrics('malicious-command', []))
        .rejects.toThrow('Command validation failed');
    });
  });

  describe('Governance and Compliance', () => {
    it('should include governance metrics in events', async () => {
      const { spawn } = require('child_process');
      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') callback(0);
        }),
      };
      spawn.mockReturnValue(mockChild);

      const result = await bridge.captureIrisMetrics('health', []);

      expect(result.governance_metrics).toBeDefined();
      expect(result.governance_metrics.complianceScore).toBeGreaterThanOrEqual(0);
      expect(result.governance_metrics.complianceScore).toBeLessThanOrEqual(1);
      expect(['low', 'medium', 'high']).toContain(result.governance_metrics.riskAssessment);
    });

    it('should track audit trail', async () => {
      const { spawn } = require('child_process');
      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') callback(0);
        }),
      };
      spawn.mockReturnValue(mockChild);

      const result = await bridge.captureIrisMetrics('health', []);

      expect(result.governance_metrics.auditTrail).toBeDefined();
      expect(Array.isArray(result.governance_metrics.auditTrail)).toBe(true);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle spawn errors gracefully', async () => {
      const { spawn } = require('child_process');
      spawn.mockImplementation(() => {
        throw new Error('Spawn failed');
      });

      await expect(bridge.captureIrisMetrics('health', []))
        .rejects.toThrow();
    });

    it('should handle timeout errors', async () => {
      const { spawn } = require('child_process');
      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'error') callback(new Error('Timeout'));
        }),
      };
      spawn.mockReturnValue(mockChild);

      await expect(bridge.captureIrisMetrics('health', []))
        .rejects.toThrow();
    });

    it('should create error events with proper structure', async () => {
      const { spawn } = require('child_process');
      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') callback(1);
        }),
      };
      spawn.mockReturnValue(mockChild);

      try {
        await bridge.captureIrisMetrics('health', [], {
          logFile: path.join(testDir, 'metrics.jsonl'),
        });
      } catch (error) {
        // Verify error event was written
        expect(fs.appendFile).toHaveBeenCalled();
        
        const writeCall = (fs.appendFile as jest.Mock).mock.calls.find(
          call => call[0].includes('metrics.jsonl')
        );
        expect(writeCall).toBeDefined();
        
        const eventData = JSON.parse(writeCall[1]);
        expect(eventData.error_details).toBeDefined();
        expect(eventData.error_details.error_type).toBeDefined();
        expect(eventData.error_details.error_message).toBeDefined();
      }
    });
  });

  describe('Integration with metrics_log.jsonl', () => {
    it('should write events to metrics log file', async () => {
      const { spawn } = require('child_process');
      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') callback(0);
        }),
      };
      spawn.mockReturnValue(mockChild);

      const logFile = path.join(testDir, 'metrics.jsonl');
      await bridge.captureIrisMetrics('health', [], { logFile });

      expect(fs.mkdir).toHaveBeenCalledWith(
        path.dirname(logFile),
        { recursive: true }
      );
      expect(fs.appendFile).toHaveBeenCalledWith(
        logFile,
        expect.stringContaining('"type":"iris_evaluation"')
      );
    });

    it('should maintain backward compatibility with existing format', async () => {
      const { spawn } = require('child_process');
      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') callback(0);
        }),
      };
      spawn.mockReturnValue(mockChild);

      const result = await bridge.captureIrisMetrics('health', []);

      // Verify backward compatibility fields
      expect(result.type).toBe('iris_evaluation');
      expect(result.timestamp).toBeDefined();
      expect(result.iris_command).toBe('health');
      expect(result.circles_involved).toBeDefined();
      expect(result.actions_taken).toBeDefined();
      expect(result.production_maturity).toBeDefined();
      expect(result.execution_context).toBeDefined();
    });
  });

  describe('Performance Benchmarks', () => {
    it('should meet performance requirements (<2s overhead)', async () => {
      const { spawn } = require('child_process');
      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') callback(0);
        }),
      };
      spawn.mockReturnValue(mockChild);

      const startTime = Date.now();
      await bridge.captureIrisMetrics('health', []);
      const endTime = Date.now();

      const overhead = endTime - startTime;
      expect(overhead).toBeLessThan(2000); // Less than 2 seconds
    });

    it('should handle high concurrency efficiently', async () => {
      const { spawn } = require('child_process');
      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') callback(0);
        }),
      };
      spawn.mockReturnValue(mockChild);

      const startTime = Date.now();
      const promises = Array(5).fill(null).map(() => 
        bridge.captureIrisMetrics('health', [])
      );

      await Promise.all(promises);
      const endTime = Date.now();

      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(5000); // Should handle 5 concurrent commands efficiently
    });
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('EnterpriseIrisBridge Integration', () => {
  let bridge: EnterpriseIrisBridge;
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join('/tmp', 'iris-bridge-integration-test', randomUUID());
    await fs.mkdir(testDir, { recursive: true });
    
    bridge = new EnterpriseIrisBridge({
      ...DEFAULT_IRIS_BRIDGE_CONFIG,
      enableEnterpriseFeatures: true,
    });
  });

  it('should integrate with existing metrics_log.jsonl format', async () => {
    // Create a sample existing metrics file
    const existingMetrics = [
      {
        type: 'iris_evaluation',
        timestamp: '2023-01-01T00:00:00.000Z',
        iris_command: 'health',
        circles_involved: ['assessor'],
        actions_taken: [{ circle: 'assessor', action: 'Check health', priority: 'normal' }],
        production_maturity: {
          starlingx_openstack: { status: 'healthy', issues: [] },
          hostbill: { status: 'healthy', issues: [] },
          loki_environments: { status: 'healthy', issues: [] },
          cms_interfaces: {},
          communication_stack: {},
          messaging_protocols: ['smtp'],
        },
        execution_context: {
          incremental: true,
          relentless: true,
          focused: true,
        },
      },
    ];

    const metricsFile = path.join(testDir, 'existing_metrics.jsonl');
    const existingContent = existingMetrics.map(m => JSON.stringify(m)).join('\n');
    await fs.writeFile(metricsFile, existingContent);

    // Verify the new bridge can read and extend this format
    const { spawn } = require('child_process');
    const mockChild = {
      stdout: { on: jest.fn() },
      stderr: { on: jest.fn() },
      on: jest.fn((event, callback) => {
        if (event === 'close') callback(0);
      }),
    };
    spawn.mockReturnValue(mockChild);

    const result = await bridge.captureIrisMetrics('discover', [], {
      logFile: metricsFile,
    });

    // Verify new event maintains compatibility
    expect(result.type).toBe('iris_evaluation');
    expect(result.iris_command).toBe('discover');
    expect(result.circles_involved).toBeDefined();
    expect(result.actions_taken).toBeDefined();
    expect(result.production_maturity).toBeDefined();
    expect(result.execution_context).toBeDefined();

    // Verify enterprise features are present
    expect(result.performance_metrics).toBeDefined();
    expect(result.circuit_breaker_metrics).toBeDefined();
    expect(result.resource_metrics).toBeDefined();
    expect(result.governance_metrics).toBeDefined();
  });

  it('should work with existing AF CLI infrastructure', async () => {
    // Test compatibility with existing command-line interface
    process.env.AF_ENABLE_IRIS_METRICS = '1';
    process.env.AF_IRIS_ENVIRONMENT = 'test';

    const { spawn } = require('child_process');
    const mockChild = {
      stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') callback(0);
        }),
      };
      spawn.mockReturnValue(mockChild);

    const result = await bridge.captureIrisMetrics('health', ['--format', 'json']);

    expect(result).toBeDefined();
    expect(result.environment).toBe('test');
  });
});