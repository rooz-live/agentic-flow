/**
 * Unit Tests for KL Divergence Validation
 * 
 * Tests the validation logic for kl_divergence field in tf-distribution-check pattern events.
 * Ensures proper handling of edge cases including NaN, Infinity, negative values, and extreme values.
 */

import { PatternMetricsValidator } from '../src/pattern-metrics-validator';
import { PatternEventGenerator } from '../src/test-utils/pattern-event-generator';
import { PatternEvent } from '../src/types/pattern-types';

describe('KL Divergence Validation', () => {
  let validator: PatternMetricsValidator;
  let generator: PatternEventGenerator;

  beforeEach(() => {
    validator = new PatternMetricsValidator();
    generator = new PatternEventGenerator();
  });

  describe('Valid KL Divergence Values', () => {
    test('should accept valid kl_divergence of 0 (identical distributions)', () => {
      const event = generator.generateValidPatternEvent({
        pattern: 'tf-distribution-check',
        framework: 'tensorflow',
        tags: ['ML', 'Stats'],
      });
      
      (event as any).distribution_shift_detected = false;
      (event as any).kl_divergence = 0;

      const result = validator.validateEvent(event);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should accept valid positive kl_divergence', () => {
      const event = generator.generateValidPatternEvent({
        pattern: 'tf-distribution-check',
        framework: 'tensorflow',
        tags: ['ML', 'Stats'],
      });
      
      (event as any).distribution_shift_detected = true;
      (event as any).kl_divergence = 0.5;

      const result = validator.validateEvent(event);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should accept small kl_divergence values', () => {
      const event = generator.generateValidPatternEvent({
        pattern: 'tf-distribution-check',
        framework: 'tensorflow',
        tags: ['ML', 'Stats'],
      });
      
      (event as any).distribution_shift_detected = false;
      (event as any).kl_divergence = 0.001;

      const result = validator.validateEvent(event);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should accept moderate kl_divergence values', () => {
      const event = generator.generateValidPatternEvent({
        pattern: 'tf-distribution-check',
        framework: 'tensorflow',
        tags: ['ML', 'Stats'],
      });
      
      (event as any).distribution_shift_detected = true;
      (event as any).kl_divergence = 100;

      const result = validator.validateEvent(event);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Invalid KL Divergence Values', () => {
    test('should reject negative kl_divergence', () => {
      const event = generator.generateValidPatternEvent({
        pattern: 'tf-distribution-check',
        framework: 'tensorflow',
        tags: ['ML', 'Stats'],
      });
      
      (event as any).distribution_shift_detected = true;
      (event as any).kl_divergence = -0.5;

      const result = validator.validateEvent(event);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('kl_divergence must be a non-negative number');
    });

    test('should reject NaN kl_divergence', () => {
      const event = generator.generateValidPatternEvent({
        pattern: 'tf-distribution-check',
        framework: 'tensorflow',
        tags: ['ML', 'Stats'],
      });
      
      (event as any).distribution_shift_detected = true;
      (event as any).kl_divergence = NaN;

      const result = validator.validateEvent(event);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('kl_divergence must be a finite number (not Infinity or NaN)');
    });

    test('should reject Infinity kl_divergence', () => {
      const event = generator.generateValidPatternEvent({
        pattern: 'tf-distribution-check',
        framework: 'tensorflow',
        tags: ['ML', 'Stats'],
      });
      
      (event as any).distribution_shift_detected = true;
      (event as any).kl_divergence = Infinity;

      const result = validator.validateEvent(event);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('kl_divergence must be a finite number (not Infinity or NaN)');
    });

    test('should reject -Infinity kl_divergence', () => {
      const event = generator.generateValidPatternEvent({
        pattern: 'tf-distribution-check',
        framework: 'tensorflow',
        tags: ['ML', 'Stats'],
      });
      
      (event as any).distribution_shift_detected = true;
      (event as any).kl_divergence = -Infinity;

      const result = validator.validateEvent(event);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('kl_divergence must be a non-negative number');
    });

    test('should reject non-number kl_divergence', () => {
      const event = generator.generateValidPatternEvent({
        pattern: 'tf-distribution-check',
        framework: 'tensorflow',
        tags: ['ML', 'Stats'],
      });
      
      (event as any).distribution_shift_detected = true;
      (event as any).kl_divergence = "0.5"; // String instead of number

      const result = validator.validateEvent(event);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('kl_divergence must be a non-negative number');
    });
  });

  describe('Warning Cases', () => {
    test('should warn on extremely high kl_divergence values', () => {
      const event = generator.generateValidPatternEvent({
        pattern: 'tf-distribution-check',
        framework: 'tensorflow',
        tags: ['ML', 'Stats'],
      });
      
      (event as any).distribution_shift_detected = true;
      (event as any).kl_divergence = 1500;

      const result = validator.validateEvent(event);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('kl_divergence value is unusually high, which may indicate distribution mismatch');
    });

    test('should not warn on high but reasonable kl_divergence values', () => {
      const event = generator.generateValidPatternEvent({
        pattern: 'tf-distribution-check',
        framework: 'tensorflow',
        tags: ['ML', 'Stats'],
      });
      
      (event as any).distribution_shift_detected = true;
      (event as any).kl_divergence = 500;

      const result = validator.validateEvent(event);
      
      expect(result.isValid).toBe(true);
      const klDivWarnings = result.warnings.filter(w => w.includes('kl_divergence'));
      expect(klDivWarnings).toHaveLength(0);
    });
  });

  describe('Required Field Validation', () => {
    test('should require distribution_shift_detected field', () => {
      const event = generator.generateValidPatternEvent({
        pattern: 'tf-distribution-check',
        framework: 'tensorflow',
        tags: ['ML', 'Stats'],
      });
      
      // Don't add distribution_shift_detected
      (event as any).kl_divergence = 0.5;

      const result = validator.validateEvent(event);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required field for tf-distribution-check: distribution_shift_detected');
    });

    test('should allow missing kl_divergence if distribution_shift_detected is present', () => {
      const event = generator.generateValidPatternEvent({
        pattern: 'tf-distribution-check',
        framework: 'tensorflow',
        tags: ['ML', 'Stats'],
      });
      
      (event as any).distribution_shift_detected = false;
      // Don't add kl_divergence

      const result = validator.validateEvent(event);
      
      // kl_divergence is optional, should still be valid
      expect(result.isValid).toBe(true);
    });
  });

  describe('Batch Validation', () => {
    test('should correctly identify multiple events with divergence issues', () => {
      const events: PatternEvent[] = [
        {
          ...generator.generateValidPatternEvent({ pattern: 'tf-distribution-check', framework: 'tensorflow', tags: ['ML'] }),
          distribution_shift_detected: true,
          kl_divergence: 0.5, // Valid
        } as PatternEvent,
        {
          ...generator.generateValidPatternEvent({ pattern: 'tf-distribution-check', framework: 'tensorflow', tags: ['ML'] }),
          distribution_shift_detected: true,
          kl_divergence: Infinity, // Invalid
        } as PatternEvent,
        {
          ...generator.generateValidPatternEvent({ pattern: 'tf-distribution-check', framework: 'tensorflow', tags: ['ML'] }),
          distribution_shift_detected: true,
          kl_divergence: NaN, // Invalid
        } as PatternEvent,
        {
          ...generator.generateValidPatternEvent({ pattern: 'tf-distribution-check', framework: 'tensorflow', tags: ['ML'] }),
          distribution_shift_detected: true,
          kl_divergence: -1, // Invalid
        } as PatternEvent,
        {
          ...generator.generateValidPatternEvent({ pattern: 'tf-distribution-check', framework: 'tensorflow', tags: ['ML'] }),
          distribution_shift_detected: true,
          kl_divergence: 2000, // Valid but warns
        } as PatternEvent,
      ];

      const result = validator.validateEvents(events);
      
      expect(result.totalEvents).toBe(5);
      expect(result.validEvents).toBe(2); // First and last are valid
      expect(result.invalidEvents).toBe(3); // Middle three are invalid
      expect(result.warnings).toHaveLength(1); // One warning for extremely high value
    });
  });

  describe('Edge Cases', () => {
    test('should handle very small positive kl_divergence', () => {
      const event = generator.generateValidPatternEvent({
        pattern: 'tf-distribution-check',
        framework: 'tensorflow',
        tags: ['ML', 'Stats'],
      });
      
      (event as any).distribution_shift_detected = false;
      (event as any).kl_divergence = Number.MIN_VALUE;

      const result = validator.validateEvent(event);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should handle boundary value at warning threshold', () => {
      const event = generator.generateValidPatternEvent({
        pattern: 'tf-distribution-check',
        framework: 'tensorflow',
        tags: ['ML', 'Stats'],
      });
      
      (event as any).distribution_shift_detected = true;
      (event as any).kl_divergence = 1000; // Exactly at threshold

      const result = validator.validateEvent(event);
      
      expect(result.isValid).toBe(true);
      const klDivWarnings = result.warnings.filter(w => w.includes('kl_divergence'));
      expect(klDivWarnings).toHaveLength(0); // Should not warn at exactly 1000
    });

    test('should handle boundary value just above warning threshold', () => {
      const event = generator.generateValidPatternEvent({
        pattern: 'tf-distribution-check',
        framework: 'tensorflow',
        tags: ['ML', 'Stats'],
      });
      
      (event as any).distribution_shift_detected = true;
      (event as any).kl_divergence = 1000.1; // Just above threshold

      const result = validator.validateEvent(event);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('kl_divergence value is unusually high, which may indicate distribution mismatch');
    });
  });
});
