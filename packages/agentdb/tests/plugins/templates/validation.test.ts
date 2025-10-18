/**
 * Template validation tests for plugin configurations
 */

import { describe, it, expect } from 'vitest';

// Template definitions
const PLUGIN_TEMPLATES = {
  'q-learning-basic': {
    name: 'q-learning',
    config: {
      learningRate: 0.1,
      gamma: 0.99,
      epsilon: 0.1,
      numActions: 4,
      dimensions: 128,
    },
  },
  'q-learning-advanced': {
    name: 'q-learning',
    config: {
      learningRate: 0.01,
      gamma: 0.95,
      epsilon: 0.05,
      numActions: 8,
      dimensions: 256,
    },
  },
  'sarsa-basic': {
    name: 'sarsa',
    config: {
      learningRate: 0.1,
      gamma: 0.99,
      epsilon: 0.1,
      numActions: 4,
    },
  },
  'actor-critic-basic': {
    name: 'actor-critic',
    config: {
      actorLR: 0.001,
      criticLR: 0.01,
      gamma: 0.99,
      numActions: 4,
      dimensions: 128,
    },
  },
  'decision-tree-basic': {
    name: 'decision-tree',
    config: {
      maxDepth: 10,
      minSamplesSplit: 2,
      minSamplesLeaf: 1,
    },
  },
};

// Validation schemas
const VALIDATION_SCHEMAS = {
  'q-learning': {
    learningRate: { type: 'number', min: 0, max: 1, required: true },
    gamma: { type: 'number', min: 0, max: 1, required: true },
    epsilon: { type: 'number', min: 0, max: 1, required: true },
    numActions: { type: 'number', min: 1, required: true },
    dimensions: { type: 'number', min: 1, required: false },
  },
  'sarsa': {
    learningRate: { type: 'number', min: 0, max: 1, required: true },
    gamma: { type: 'number', min: 0, max: 1, required: true },
    epsilon: { type: 'number', min: 0, max: 1, required: true },
    numActions: { type: 'number', min: 1, required: true },
  },
  'actor-critic': {
    actorLR: { type: 'number', min: 0, max: 1, required: true },
    criticLR: { type: 'number', min: 0, max: 1, required: true },
    gamma: { type: 'number', min: 0, max: 1, required: true },
    numActions: { type: 'number', min: 1, required: true },
  },
  'decision-tree': {
    maxDepth: { type: 'number', min: 1, required: true },
    minSamplesSplit: { type: 'number', min: 2, required: true },
    minSamplesLeaf: { type: 'number', min: 1, required: true },
  },
};

// Template validator
class TemplateValidator {
  validate(template: any, schema: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    Object.entries(schema).forEach(([key, rules]: [string, any]) => {
      const value = template[key];

      if (rules.required && (value === undefined || value === null)) {
        errors.push(`${key} is required`);
        return;
      }

      if (value === undefined || value === null) return;

      if (rules.type && typeof value !== rules.type) {
        errors.push(`${key} must be of type ${rules.type}`);
      }

      if (rules.min !== undefined && value < rules.min) {
        errors.push(`${key} must be >= ${rules.min}`);
      }

      if (rules.max !== undefined && value > rules.max) {
        errors.push(`${key} must be <= ${rules.max}`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

describe('Template Validation', () => {
  let validator: TemplateValidator;

  beforeEach(() => {
    validator = new TemplateValidator();
  });

  describe('Q-Learning Templates', () => {
    it('should validate basic Q-learning template', () => {
      const template = PLUGIN_TEMPLATES['q-learning-basic'];
      const schema = VALIDATION_SCHEMAS['q-learning'];

      const result = validator.validate(template.config, schema);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate advanced Q-learning template', () => {
      const template = PLUGIN_TEMPLATES['q-learning-advanced'];
      const schema = VALIDATION_SCHEMAS['q-learning'];

      const result = validator.validate(template.config, schema);

      expect(result.valid).toBe(true);
    });

    it('should reject invalid learning rate', () => {
      const invalidTemplate = {
        ...PLUGIN_TEMPLATES['q-learning-basic'].config,
        learningRate: 1.5,
      };

      const schema = VALIDATION_SCHEMAS['q-learning'];
      const result = validator.validate(invalidTemplate, schema);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('learningRate'))).toBe(true);
    });

    it('should reject invalid gamma', () => {
      const invalidTemplate = {
        ...PLUGIN_TEMPLATES['q-learning-basic'].config,
        gamma: -0.1,
      };

      const schema = VALIDATION_SCHEMAS['q-learning'];
      const result = validator.validate(invalidTemplate, schema);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('gamma'))).toBe(true);
    });
  });

  describe('SARSA Templates', () => {
    it('should validate basic SARSA template', () => {
      const template = PLUGIN_TEMPLATES['sarsa-basic'];
      const schema = VALIDATION_SCHEMAS['sarsa'];

      const result = validator.validate(template.config, schema);

      expect(result.valid).toBe(true);
    });

    it('should enforce required fields', () => {
      const incompleteTemplate = {
        learningRate: 0.1,
        // Missing gamma, epsilon, numActions
      };

      const schema = VALIDATION_SCHEMAS['sarsa'];
      const result = validator.validate(incompleteTemplate, schema);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Actor-Critic Templates', () => {
    it('should validate basic actor-critic template', () => {
      const template = PLUGIN_TEMPLATES['actor-critic-basic'];
      const schema = VALIDATION_SCHEMAS['actor-critic'];

      const result = validator.validate(template.config, schema);

      expect(result.valid).toBe(true);
    });

    it('should validate separate learning rates', () => {
      const template = PLUGIN_TEMPLATES['actor-critic-basic'].config;

      expect(template.actorLR).toBeDefined();
      expect(template.criticLR).toBeDefined();
      expect(template.actorLR).not.toBe(template.criticLR);
    });
  });

  describe('Decision Tree Templates', () => {
    it('should validate basic decision tree template', () => {
      const template = PLUGIN_TEMPLATES['decision-tree-basic'];
      const schema = VALIDATION_SCHEMAS['decision-tree'];

      const result = validator.validate(template.config, schema);

      expect(result.valid).toBe(true);
    });

    it('should reject invalid maxDepth', () => {
      const invalidTemplate = {
        ...PLUGIN_TEMPLATES['decision-tree-basic'].config,
        maxDepth: 0,
      };

      const schema = VALIDATION_SCHEMAS['decision-tree'];
      const result = validator.validate(invalidTemplate, schema);

      expect(result.valid).toBe(false);
    });

    it('should reject invalid minSamplesSplit', () => {
      const invalidTemplate = {
        ...PLUGIN_TEMPLATES['decision-tree-basic'].config,
        minSamplesSplit: 1, // Must be >= 2
      };

      const schema = VALIDATION_SCHEMAS['decision-tree'];
      const result = validator.validate(invalidTemplate, schema);

      expect(result.valid).toBe(false);
    });
  });

  describe('Template Completeness', () => {
    it('should have templates for all plugin types', () => {
      const pluginTypes = ['q-learning', 'sarsa', 'actor-critic', 'decision-tree'];

      pluginTypes.forEach(type => {
        const hasTemplate = Object.keys(PLUGIN_TEMPLATES).some(key => key.includes(type));
        expect(hasTemplate).toBe(true);
      });
    });

    it('should have schemas for all plugin types', () => {
      const pluginTypes = ['q-learning', 'sarsa', 'actor-critic', 'decision-tree'];

      pluginTypes.forEach(type => {
        expect(VALIDATION_SCHEMAS).toHaveProperty(type);
      });
    });
  });

  describe('Template Consistency', () => {
    it('should have consistent naming conventions', () => {
      const templateNames = Object.keys(PLUGIN_TEMPLATES);

      templateNames.forEach(name => {
        expect(name).toMatch(/^[a-z-]+$/); // Only lowercase and hyphens
      });
    });

    it('should have reasonable default values', () => {
      Object.values(PLUGIN_TEMPLATES).forEach(template => {
        const config = template.config as any;

        // Learning rates should be reasonable
        if ('learningRate' in config) {
          expect(config.learningRate).toBeGreaterThan(0);
          expect(config.learningRate).toBeLessThanOrEqual(1);
        }

        // Gamma should be in valid range
        if ('gamma' in config) {
          expect(config.gamma).toBeGreaterThanOrEqual(0);
          expect(config.gamma).toBeLessThanOrEqual(1);
        }

        // Epsilon should be in valid range
        if ('epsilon' in config) {
          expect(config.epsilon).toBeGreaterThanOrEqual(0);
          expect(config.epsilon).toBeLessThanOrEqual(1);
        }
      });
    });
  });

  describe('Custom Templates', () => {
    it('should validate custom template', () => {
      const customTemplate = {
        learningRate: 0.05,
        gamma: 0.98,
        epsilon: 0.15,
        numActions: 6,
      };

      const schema = VALIDATION_SCHEMAS['q-learning'];
      const result = validator.validate(customTemplate, schema);

      expect(result.valid).toBe(true);
    });

    it('should allow overriding template values', () => {
      const baseTemplate = PLUGIN_TEMPLATES['q-learning-basic'].config;
      const customTemplate = {
        ...baseTemplate,
        learningRate: 0.05, // Override
      };

      const schema = VALIDATION_SCHEMAS['q-learning'];
      const result = validator.validate(customTemplate, schema);

      expect(result.valid).toBe(true);
      expect(customTemplate.learningRate).toBe(0.05);
    });
  });
});
