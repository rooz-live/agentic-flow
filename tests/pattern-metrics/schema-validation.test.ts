/**
 * Test Suite for Pattern Metrics Schema Validation
 *
 * Tests:
 * - JSON Schema validation compliance
 * - Pattern event structure validation
 * - Tag coverage and taxonomy validation
 * - Economic scoring validation
 * - Timeline semantics validation (SAFLA-003)
 * - Edge cases and error handling
 */

import { PatternMetricsValidator } from '../src/pattern-metrics-validator';
import { PatternEventGenerator } from '../src/test-utils/pattern-event-generator';
import {
  ValidPatternEvent,
  InvalidPatternEvent,
  PatternValidationResult,
  TimelineSignature
} from '../src/types/pattern-types';

// Mock data generators
import {
  generateValidPatternEvent,
  generateInvalidPatternEvent,
  generateTimelineSignature,
  generateEconomicScoring,
  generateTagCombinations
} from '../src/test-utils/pattern-test-data';

describe('Pattern Metrics Schema Validation', () => {
  let validator: PatternMetricsValidator;
  let eventGenerator: PatternEventGenerator;

  beforeAll(() => {
    validator = new PatternMetricsValidator();
    eventGenerator = new PatternEventGenerator();
  });

  describe('Required Field Validation', () => {
    const requiredFields = [
      'ts', 'run', 'run_id', 'iteration', 'circle', 'depth',
      'pattern', 'mode', 'mutation', 'gate', 'framework',
      'scheduler', 'tags', 'economic', 'reason', 'action', 'prod_mode'
    ];

    test.each(requiredFields)('should validate presence of required field: %s', (field) => {
      const invalidEvent = generateValidPatternEvent();
      delete (invalidEvent as any)[field];

      const result = validator.validateEvent(invalidEvent);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        expect.stringContaining(`Missing required field: ${field}`)
      );
    });

    test('should validate event with all required fields present', () => {
      const validEvent = generateValidPatternEvent();
      const result = validator.validateEvent(validEvent);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Data Type Validation', () => {
    test('should validate timestamp format (ISO 8601)', () => {
      const event = generateValidPatternEvent();

      // Valid timestamps
      const validTimestamps = [
        '2025-01-01T00:00:00Z',
        '2025-01-01T12:30:45.123Z',
        '2025-01-01T23:59:59+00:00'
      ];

      validTimestamps.forEach(ts => {
        event.ts = ts;
        const result = validator.validateEvent(event);
        expect(result.isValid).toBe(true);
      });

      // Invalid timestamps
      const invalidTimestamps = [
        '2025-01-01', // Missing time
        '01-01-2025T00:00:00Z', // Wrong format
        '2025-13-01T00:00:00Z', // Invalid month
        'not-a-timestamp'
      ];

      invalidTimestamps.forEach(ts => {
        event.ts = ts;
        const result = validator.validateEvent(event);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          expect.stringContaining('Invalid timestamp format')
        );
      });
    });

    test('should validate iteration is positive integer', () => {
      const event = generateValidPatternEvent();

      // Valid iterations
      const validIterations = [1, 5, 10, 100];
      validIterations.forEach(iteration => {
        event.iteration = iteration;
        const result = validator.validateEvent(event);
        expect(result.isValid).toBe(true);
      });

      // Invalid iterations
      const invalidIterations = [0, -1, 1.5, '1' as any, null as any];
      invalidIterations.forEach(iteration => {
        event.iteration = iteration;
        const result = validator.validateEvent(event);
        expect(result.isValid).toBe(false);
      });
    });

    test('should validate depth range (1-4)', () => {
      const event = generateValidPatternEvent();

      // Valid depths
      const validDepths = [1, 2, 3, 4];
      validDepths.forEach(depth => {
        event.depth = depth;
        const result = validator.validateEvent(event);
        expect(result.isValid).toBe(true);
      });

      // Invalid depths
      const invalidDepths = [0, 5, -1, 2.5, '2' as any];
      invalidDepths.forEach(depth => {
        event.depth = depth;
        const result = validator.validateEvent(event);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          expect.stringContaining('Depth must be between 1 and 4')
        );
      });
    });

    test('should validate circle enum values', () => {
      const event = generateValidPatternEvent();

      const validCircles = ['analyst', 'assessor', 'innovator', 'intuitive', 'architect', 'orchestrator'];
      validCircles.forEach(circle => {
        event.circle = circle;
        const result = validator.validateEvent(event);
        expect(result.isValid).toBe(true);
      });

      const invalidCircles = ['invalid-circle', 'ANALYST', 'analyst1', ''];
      invalidCircles.forEach(circle => {
        event.circle = circle;
        const result = validator.validateEvent(event);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          expect.stringContaining('Invalid circle value')
        );
      });
    });

    test('should validate mode enum values', () => {
      const event = generateValidPatternEvent();

      const validModes = ['advisory', 'enforcement', 'mutation'];
      validModes.forEach(mode => {
        event.mode = mode;
        const result = validator.validateEvent(event);
        expect(result.isValid).toBe(true);
      });

      const invalidModes = ['invalid-mode', 'ADVISORY', 'advisory1', ''];
      invalidModes.forEach(mode => {
        event.mode = mode;
        const result = validator.validateEvent(event);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          expect.stringContaining('Invalid mode value')
        );
      });
    });
  });

  describe('Economic Scoring Validation', () => {
    test('should validate economic object structure', () => {
      const event = generateValidPatternEvent();

      // Valid economic scoring
      const validEconomicScenarios = [
        { cod: 0, wsjf_score: 0 },
        { cod: 100.5, wsjf_score: 250.75 },
        { cod: 5000, wsjf_score: 10000 }
      ];

      validEconomicScenarios.forEach(economic => {
        event.economic = economic;
        const result = validator.validateEvent(event);
        expect(result.isValid).toBe(true);
      });

      // Missing economic object
      delete (event as any).economic;
      let result = validator.validateEvent(event);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        expect.stringContaining('Missing required field: economic')
      );

      // Invalid economic values
      const invalidEconomicScenarios = [
        { cod: -1, wsjf_score: 0 }, // Negative COD
        { cod: 0, wsjf_score: -1 }, // Negative WSJF
        { cod: 'invalid' as any, wsjf_score: 0 }, // String COD
        { cod: 0, wsjf_score: null as any }, // Null WSJF
        { cod: 0 }, // Missing wsjf_score
        {} // Missing both
      ];

      event.economic = { cod: 0, wsjf_score: 0 }; // Reset to valid
      invalidEconomicScenarios.forEach(economic => {
        event.economic = economic;
        result = validator.validateEvent(event);
        expect(result.isValid).toBe(false);
      });
    });

    test('should validate WSJF score calculation consistency', () => {
      const event = generateValidPatternEvent();

      // High COD should generally correlate with high WSJF for consistency
      event.economic = { cod: 5000, wsjf_score: 1 }; // Inconsistent
      let result = validator.validateEvent(event);
      expect(result.warnings).toContain(
        expect.stringContaining('WSJF score may be inconsistent with COD')
      );
      // Still valid, just a warning
      expect(result.isValid).toBe(true);

      event.economic = { cod: 5000, wsjf_score: 5000 }; // Consistent
      result = validator.validateEvent(event);
      expect(result.warnings).not.toContain(
        expect.stringContaining('WSJF score may be inconsistent')
      );
    });
  });

  describe('Tag Validation', () => {
    test('should validate tag taxonomy', () => {
      const event = generateValidPatternEvent();

      const validTagSets = [
        ['ML'],
        ['HPC'],
        ['Stats'],
        ['Device/Web'],
        ['Rust'],
        ['Federation'],
        ['ML', 'HPC'],
        ['Stats', 'Federation'],
        ['ML', 'Stats', 'Device/Web']
      ];

      validTagSets.forEach(tags => {
        event.tags = tags;
        const result = validator.validateEvent(event);
        expect(result.isValid).toBe(true);
      });

      const invalidTags = [
        ['InvalidTag'],
        ['ML', 'InvalidTag'],
        [''],
        ['ml'], // Case sensitive
        [1 as any, 2 as any] // Non-string
      ];

      invalidTags.forEach(tags => {
        event.tags = tags;
        const result = validator.validateEvent(event);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          expect.stringContaining('Invalid tag value')
        );
      });
    });

    test('should validate tag-Pattern consistency', () => {
      // ML patterns should have ML tag
      const mlEvent = generateValidPatternEvent();
      mlEvent.pattern = 'ml-training-guardrail';
      mlEvent.tags = ['HPC']; // Missing ML tag

      let result = validator.validateEvent(mlEvent);
      expect(result.warnings).toContain(
        expect.stringContaining('ML pattern should have ML tag')
      );

      // HPC patterns should have HPC tag
      const hpcEvent = generateValidPatternEvent();
      hpcEvent.pattern = 'hpc-batch-window';
      hpcEvent.tags = ['ML']; // Missing HPC tag

      result = validator.validateEvent(hpcEvent);
      expect(result.warnings).toContain(
        expect.stringContaining('HPC pattern should have HPC tag')
      );
    });
  });

  describe('Pattern-Specific Validation', () => {
    test('should validate ML training guardrail pattern fields', () => {
      const event = generateValidPatternEvent();
      event.pattern = 'ml-training-guardrail';

      // Required ML-specific fields
      event.max_epochs = 100;
      event.early_stop_triggered = true;
      event.grad_explosions = 0;
      event.nan_batches = 0;
      event.gpu_util_pct = 85.5;
      event.p99_latency_ms = 120;

      let result = validator.validateEvent(event);
      expect(result.isValid).toBe(true);

      // Missing required ML fields
      delete (event as any).max_epochs;
      result = validator.validateEvent(event);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        expect.stringContaining('Missing required field for ml-training-guardrail: max_epochs')
      );

      // Invalid ML field values
      event.max_epochs = -1; // Invalid
      result = validator.validateEvent(event);
      expect(result.isValid).toBe(false);
    });

    test('should validate HPC batch window pattern fields', () => {
      const event = generateValidPatternEvent();
      event.pattern = 'hpc-batch-window';

      // Required HPC-specific fields
      event.queue_time_sec = 300;
      event.node_count = 4;
      event.gpu_util_pct = 95.0;
      event.throughput_samples_sec = 1000;
      event.p99_latency_ms = 150;

      let result = validator.validateEvent(event);
      expect(result.isValid).toBe(true);

      // Invalid HPC field values
      event.queue_time_sec = -100; // Invalid
      result = validator.validateEvent(event);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        expect.stringContaining('queue_time_sec must be non-negative')
      );
    });

    test('should validate safe-degrade pattern fields', () => {
      const event = generateValidPatternEvent();
      event.pattern = 'safe-degrade';

      // Required safe-degrade fields
      event.trigger_reason = 'high_load';
      event.degraded_to = 'read-only';
      event.recovery_plan = 'wait-for-load-decrease';
      event.incident_threshold = 10;
      event.current_value = 15;

      let result = validator.validateEvent(event);
      expect(result.isValid).toBe(true);

      // Invalid trigger_reason
      event.trigger_reason = 'invalid-trigger';
      result = validator.validateEvent(event);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        expect.stringContaining('Invalid trigger_reason for safe-degrade')
      );
    });
  });

  describe('Timeline Semantics Validation (SAFLA-003)', () => {
    test('should validate optional timeline signature fields', () => {
      const event = generateValidPatternEvent();
      const timeline = generateTimelineSignature();
      event.timeline = timeline;

      const result = validator.validateEvent(event);
      expect(result.isValid).toBe(true);

      // Verify Ed25519 signature format
      expect(timeline.signature).toMatch(/^[0-9a-fA-F]+$/);
      expect(timeline.publicKey).toMatch(/^[0-9a-fA-F]+$/);
      expect(timeline.eventId).toMatch(/^[0-9a-fA-F-]+$/); // UUID format
    });

    test('should validate Merkle chain fields', () => {
      const event = generateValidPatternEvent();
      event.merkle = {
        index: 42,
        merkleHash: 'a1b2c3d4e5f6',
        previousMerkleHash: 'f6e5d4c3b2a1'
      };

      const result = validator.validateEvent(event);
      expect(result.isValid).toBe(true);

      // Invalid Merkle index
      event.merkle!.index = -1;
      const invalidResult = validator.validateEvent(event);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors).toContain(
        expect.stringContaining('Merkle index must be non-negative')
      );
    });

    test('should validate rollup window structure', () => {
      const rollupWindow = {
        window_start: '2025-01-01T00:00:00Z',
        window_end: '2025-01-01T01:00:00Z',
        window_duration_ms: 3600000,
        event_count: 100,
        patterns: ['ml-training-guardrail', 'safe-degrade'],
        circles: ['analyst', 'assessor'],
        total_cod: 5000,
        avg_wsjf: 250,
        max_wsjf: 1000,
        delta_summary: {
          performance_delta: 0.1,
          efficiency_delta: -0.05,
          stability_delta: 0.2,
          capability_delta: 0.15,
          total_delta: 0.12
        }
      };

      const result = validator.validateRollupWindow(rollupWindow);
      expect(result.isValid).toBe(true);

      // Invalid window duration
      const invalidRollup = { ...rollupWindow, window_duration_ms: -1000 };
      const invalidResult = validator.validateRollupWindow(invalidRollup);
      expect(invalidResult.isValid).toBe(false);
    });
  });

  describe('Batch Validation', () => {
    test('should validate multiple events efficiently', () => {
      const events = Array.from({ length: 1000 }, () => generateValidPatternEvent());

      const startTime = performance.now();
      const result = validator.validateEvents(events);
      const endTime = performance.now();

      expect(result.validEvents).toBe(1000);
      expect(result.invalidEvents).toBe(0);
      expect(result.errors).toHaveLength(0);

      // Performance check - should process 1000 events in < 1 second
      expect(endTime - startTime).toBeLessThan(1000);
    });

    test('should handle mixed valid/invalid events', () => {
      const validEvents = Array.from({ length: 50 }, () => generateValidPatternEvent());
      const invalidEvents = Array.from({ length: 20 }, () => generateInvalidPatternEvent());
      const events = [...validEvents, ...invalidEvents];

      // Shuffle for random order
      const shuffled = events.sort(() => Math.random() - 0.5);

      const result = validator.validateEvents(shuffled);

      expect(result.validEvents).toBe(50);
      expect(result.invalidEvents).toBe(20);
      expect(result.errors).toHaveLength(20);

      // Verify error details
      result.errors.forEach(error => {
        expect(error).toHaveProperty('eventIndex');
        expect(error).toHaveProperty('error');
      });
    });

    test('should validate tag coverage threshold', () => {
      const events = Array.from({ length: 100 }, (_, i) => {
        const event = generateValidPatternEvent();
        // Only tag 90% of events
        event.tags = i < 90 ? ['ML'] : [];
        return event;
      });

      const result = validator.validateTagCoverage(events, 0.90);
      expect(result.passes).toBe(true);
      expect(result.coverage).toBe(90.0);

      // Test with higher threshold
      const strictResult = validator.validateTagCoverage(events, 0.95);
      expect(strictResult.passes).toBe(false);
      expect(strictResult.coverage).toBe(90.0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle null/undefined events gracefully', () => {
      const events = [null, undefined, generateValidPatternEvent()];

      const result = validator.validateEvents(events as any[]);

      expect(result.validEvents).toBe(1);
      expect(result.invalidEvents).toBe(2);
      expect(result.errors).toHaveLength(2);
    });

    test('should handle malformed JSON in events', () => {
      const malformedEvent = {
        ...generateValidPatternEvent(),
        // Add circular reference
        self: null as any
      };
      malformedEvent.self = malformedEvent;

      const result = validator.validateEvent(malformedEvent);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        expect.stringContaining('Circular reference detected')
      );
    });

    test('should handle extremely large field values', () => {
      const event = generateValidPatternEvent();

      // Very long string
      event.reason = 'a'.repeat(10000);
      let result = validator.validateEvent(event);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain(
        expect.stringContaining('Very long field value')
      );

      // Very large number
      event.economic.cod = Number.MAX_SAFE_INTEGER;
      result = validator.validateEvent(event);
      expect(result.isValid).toBe(true);

      // Number beyond safe range
      event.economic.cod = Number.MAX_VALUE;
      result = validator.validateEvent(event);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        expect.stringContaining('Number value exceeds safe range')
      );
    });

    test('should handle special characters in string fields', () => {
      const event = generateValidPatternEvent();

      const specialChars = [
        'Test with "quotes"',
        "Test with 'apostrophes'",
        'Test with \n newlines \r\n and \t tabs',
        'Test with émojis 🚀 and unicode 中文',
        'Test with JSON escape characters \\ / \" \b \f',
        'Test with <script>alert("xss")</script>'
      ];

      specialChars.forEach(reason => {
        event.reason = reason;
        const result = validator.validateEvent(event);
        expect(result.isValid).toBe(true);
      });
    });
  });

  describe('Performance and Load Testing', () => {
    test('should handle large datasets efficiently', () => {
      const largeDataset = Array.from({ length: 10000 }, () => generateValidPatternEvent());

      const startTime = performance.now();
      const result = validator.validateEvents(largeDataset);
      const endTime = performance.now();

      expect(result.validEvents).toBe(10000);
      expect(result.invalidEvents).toBe(0);

      // Should process 10K events in < 5 seconds
      const processingTime = endTime - startTime;
      expect(processingTime).toBeLessThan(5000);

      // Memory efficiency check
      const memoryBefore = process.memoryUsage().heapUsed;
      validator.validateEvents(largeDataset);
      const memoryAfter = process.memoryUsage().heapUsed;
      const memoryIncrease = memoryAfter - memoryBefore;

      // Should not increase memory by more than 100MB
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    });

    test('should validate events concurrently when possible', () => {
      const events = Array.from({ length: 5000 }, () => generateValidPatternEvent());

      // Test concurrent validation
      const startTime = performance.now();
      const result = validator.validateEventsConcurrent(events, 10); // 10 workers
      const endTime = performance.now();

      expect(result.validEvents).toBe(5000);

      // Should be faster than sequential for large datasets
      const concurrentTime = endTime - startTime;
      const sequentialStart = performance.now();
      validator.validateEvents(events);
      const sequentialEnd = performance.now();
      const sequentialTime = sequentialEnd - sequentialStart;

      // Concurrent should be at least 20% faster for this dataset size
      expect(concurrentTime).toBeLessThan(sequentialTime * 0.8);
    });
  });
});