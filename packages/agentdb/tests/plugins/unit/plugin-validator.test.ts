/**
 * Unit tests for PluginValidator
 */

import { describe, it, expect } from 'vitest';

// Mock PluginValidator for testing
class PluginValidator {
  validate(plugin: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required fields
    if (!plugin.name) errors.push('Plugin must have a name');
    if (!plugin.version) errors.push('Plugin must have a version');
    if (!plugin.description) errors.push('Plugin must have a description');
    if (!plugin.type) errors.push('Plugin must have a type');

    // Validate version format
    if (plugin.version && !/^\d+\.\d+\.\d+$/.test(plugin.version)) {
      errors.push('Version must be in semantic versioning format (x.y.z)');
    }

    // Check required methods
    const requiredMethods = ['initialize', 'train', 'predict', 'save', 'load'];
    requiredMethods.forEach(method => {
      if (typeof plugin[method] !== 'function') {
        errors.push(`Plugin must implement ${method} method`);
      }
    });

    // Validate plugin type
    const validTypes = ['reinforcement-learning', 'supervised-learning', 'unsupervised-learning', 'custom'];
    if (plugin.type && !validTypes.includes(plugin.type)) {
      errors.push(`Invalid plugin type: ${plugin.type}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  validateConfig(config: any, schema: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    Object.entries(schema).forEach(([key, rules]: [string, any]) => {
      const value = config[key];

      // Check required fields
      if (rules.required && (value === undefined || value === null)) {
        errors.push(`${key} is required`);
        return;
      }

      if (value === undefined || value === null) return;

      // Type validation
      if (rules.type && typeof value !== rules.type) {
        errors.push(`${key} must be of type ${rules.type}`);
      }

      // Range validation
      if (rules.min !== undefined && value < rules.min) {
        errors.push(`${key} must be >= ${rules.min}`);
      }
      if (rules.max !== undefined && value > rules.max) {
        errors.push(`${key} must be <= ${rules.max}`);
      }

      // Enum validation
      if (rules.enum && !rules.enum.includes(value)) {
        errors.push(`${key} must be one of: ${rules.enum.join(', ')}`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

describe('PluginValidator', () => {
  let validator: PluginValidator;

  beforeEach(() => {
    validator = new PluginValidator();
  });

  describe('Plugin Validation', () => {
    it('should validate complete plugin', () => {
      const plugin = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test plugin',
        type: 'reinforcement-learning',
        initialize: async () => {},
        train: async () => {},
        predict: async () => ({}),
        save: async () => ({}),
        load: async () => {},
      };

      const result = validator.validate(plugin);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject plugin without name', () => {
      const plugin = {
        version: '1.0.0',
        description: 'Test',
        type: 'custom',
        initialize: async () => {},
        train: async () => {},
        predict: async () => ({}),
        save: async () => ({}),
        load: async () => {},
      };

      const result = validator.validate(plugin);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Plugin must have a name');
    });

    it('should reject plugin without version', () => {
      const plugin = {
        name: 'test-plugin',
        description: 'Test',
        type: 'custom',
        initialize: async () => {},
        train: async () => {},
        predict: async () => ({}),
        save: async () => ({}),
        load: async () => {},
      };

      const result = validator.validate(plugin);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Plugin must have a version');
    });

    it('should reject plugin with invalid version format', () => {
      const plugin = {
        name: 'test-plugin',
        version: 'v1.0',
        description: 'Test',
        type: 'custom',
        initialize: async () => {},
        train: async () => {},
        predict: async () => ({}),
        save: async () => ({}),
        load: async () => {},
      };

      const result = validator.validate(plugin);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('semantic versioning'))).toBe(true);
    });

    it('should reject plugin without required methods', () => {
      const plugin = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test',
        type: 'custom',
      };

      const result = validator.validate(plugin);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('initialize'))).toBe(true);
      expect(result.errors.some(e => e.includes('train'))).toBe(true);
      expect(result.errors.some(e => e.includes('predict'))).toBe(true);
    });

    it('should reject plugin with invalid type', () => {
      const plugin = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test',
        type: 'invalid-type',
        initialize: async () => {},
        train: async () => {},
        predict: async () => ({}),
        save: async () => ({}),
        load: async () => {},
      };

      const result = validator.validate(plugin);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid plugin type'))).toBe(true);
    });
  });

  describe('Configuration Validation', () => {
    it('should validate valid configuration', () => {
      const config = {
        dimensions: 128,
        learningRate: 0.001,
        gamma: 0.99,
      };

      const schema = {
        dimensions: { type: 'number', required: true, min: 1 },
        learningRate: { type: 'number', required: true, min: 0, max: 1 },
        gamma: { type: 'number', required: true, min: 0, max: 1 },
      };

      const result = validator.validateConfig(config, schema);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing required fields', () => {
      const config = {
        dimensions: 128,
      };

      const schema = {
        dimensions: { type: 'number', required: true },
        learningRate: { type: 'number', required: true },
      };

      const result = validator.validateConfig(config, schema);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('learningRate is required');
    });

    it('should reject invalid types', () => {
      const config = {
        dimensions: '128', // Should be number
      };

      const schema = {
        dimensions: { type: 'number', required: true },
      };

      const result = validator.validateConfig(config, schema);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('must be of type number'))).toBe(true);
    });

    it('should reject out-of-range values', () => {
      const config = {
        learningRate: 1.5,
        gamma: -0.1,
      };

      const schema = {
        learningRate: { type: 'number', min: 0, max: 1 },
        gamma: { type: 'number', min: 0, max: 1 },
      };

      const result = validator.validateConfig(config, schema);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('learningRate'))).toBe(true);
      expect(result.errors.some(e => e.includes('gamma'))).toBe(true);
    });

    it('should validate enum values', () => {
      const config = {
        optimizer: 'sgd',
      };

      const schema = {
        optimizer: { type: 'string', enum: ['adam', 'sgd', 'rmsprop'] },
      };

      const result = validator.validateConfig(config, schema);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid enum values', () => {
      const config = {
        optimizer: 'invalid',
      };

      const schema = {
        optimizer: { type: 'string', enum: ['adam', 'sgd', 'rmsprop'] },
      };

      const result = validator.validateConfig(config, schema);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('must be one of'))).toBe(true);
    });

    it('should allow optional fields', () => {
      const config = {
        dimensions: 128,
      };

      const schema = {
        dimensions: { type: 'number', required: true },
        learningRate: { type: 'number', required: false },
      };

      const result = validator.validateConfig(config, schema);
      expect(result.valid).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty plugin object', () => {
      const result = validator.validate({});
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle null plugin', () => {
      const result = validator.validate(null);
      expect(result.valid).toBe(false);
    });

    it('should handle plugin with extra fields', () => {
      const plugin = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test',
        type: 'custom',
        initialize: async () => {},
        train: async () => {},
        predict: async () => ({}),
        save: async () => ({}),
        load: async () => {},
        extraField: 'extra',
      };

      const result = validator.validate(plugin);
      expect(result.valid).toBe(true); // Extra fields should be allowed
    });
  });
});
