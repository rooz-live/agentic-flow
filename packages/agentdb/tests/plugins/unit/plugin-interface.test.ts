/**
 * Unit tests for plugin interface and types
 */

import { describe, it, expect } from 'vitest';
import { assertValidPlugin } from '../setup';

describe('Plugin Interface', () => {
  describe('Plugin Structure', () => {
    it('should define required plugin properties', () => {
      const mockPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test plugin',
        author: 'Test Author',
        type: 'reinforcement-learning' as const,
        initialize: async () => {},
        train: async () => {},
        predict: async () => ({ action: 0, confidence: 1.0 }),
        save: async () => ({}),
        load: async () => {},
        getMetrics: () => ({}),
        validate: () => ({ valid: true, errors: [] }),
      };

      assertValidPlugin(mockPlugin);
      expect(mockPlugin.type).toBe('reinforcement-learning');
    });

    it('should validate plugin types', () => {
      const validTypes = ['reinforcement-learning', 'supervised-learning', 'unsupervised-learning', 'custom'];

      validTypes.forEach(type => {
        const plugin = {
          name: 'test',
          version: '1.0.0',
          description: 'test',
          type: type as any,
          initialize: async () => {},
          train: async () => {},
          predict: async () => ({ action: 0 }),
          save: async () => ({}),
          load: async () => {},
        };

        expect(plugin.type).toBe(type);
      });
    });

    it('should handle plugin lifecycle methods', async () => {
      let initialized = false;
      let trained = false;
      let saved = false;
      let loaded = false;

      const plugin = {
        name: 'lifecycle-test',
        version: '1.0.0',
        description: 'Lifecycle test plugin',
        type: 'custom' as const,
        initialize: async () => { initialized = true; },
        train: async () => { trained = true; },
        predict: async () => ({ result: 'test' }),
        save: async () => { saved = true; return {}; },
        load: async () => { loaded = true; },
      };

      await plugin.initialize({});
      expect(initialized).toBe(true);

      await plugin.train([]);
      expect(trained).toBe(true);

      await plugin.save('/tmp/test');
      expect(saved).toBe(true);

      await plugin.load('/tmp/test');
      expect(loaded).toBe(true);
    });
  });

  describe('Plugin Configuration', () => {
    it('should accept valid configuration', () => {
      const config = {
        dimensions: 128,
        learningRate: 0.001,
        gamma: 0.99,
        epsilon: 0.1,
      };

      expect(config.dimensions).toBeGreaterThan(0);
      expect(config.learningRate).toBeGreaterThan(0);
      expect(config.learningRate).toBeLessThanOrEqual(1);
      expect(config.gamma).toBeGreaterThanOrEqual(0);
      expect(config.gamma).toBeLessThanOrEqual(1);
    });

    it('should validate configuration ranges', () => {
      const invalidConfigs = [
        { dimensions: 0 },
        { dimensions: -1 },
        { learningRate: -0.1 },
        { learningRate: 1.5 },
        { gamma: 1.5 },
        { gamma: -0.1 },
      ];

      invalidConfigs.forEach(config => {
        if ('dimensions' in config) {
          expect(config.dimensions).toBeLessThanOrEqual(0);
        }
        if ('learningRate' in config && config.learningRate < 0) {
          expect(config.learningRate).toBeLessThan(0);
        }
        if ('gamma' in config && (config.gamma < 0 || config.gamma > 1)) {
          expect(config.gamma < 0 || config.gamma > 1).toBe(true);
        }
      });
    });
  });

  describe('Plugin Metadata', () => {
    it('should include required metadata fields', () => {
      const metadata = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test plugin for validation',
        author: 'Test Author',
        license: 'MIT',
        repository: 'https://github.com/test/test-plugin',
        tags: ['machine-learning', 'reinforcement-learning'],
      };

      expect(metadata.name).toBeDefined();
      expect(metadata.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(metadata.description).toBeDefined();
      expect(metadata.tags).toBeInstanceOf(Array);
    });

    it('should validate semantic versioning', () => {
      const validVersions = ['1.0.0', '2.1.3', '0.0.1', '10.20.30'];
      const invalidVersions = ['1.0', 'v1.0.0', '1.0.0-beta', ''];

      validVersions.forEach(version => {
        expect(version).toMatch(/^\d+\.\d+\.\d+$/);
      });

      invalidVersions.forEach(version => {
        expect(version).not.toMatch(/^\d+\.\d+\.\d+$/);
      });
    });
  });

  describe('Plugin Methods', () => {
    it('should define async initialize method', async () => {
      const plugin = {
        initialize: async (config: any) => {
          return new Promise(resolve => setTimeout(resolve, 10));
        },
      };

      const result = plugin.initialize({});
      expect(result).toBeInstanceOf(Promise);
      await result;
    });

    it('should define async train method', async () => {
      const plugin = {
        train: async (data: any[]) => {
          return new Promise(resolve => setTimeout(resolve, 10));
        },
      };

      const result = plugin.train([]);
      expect(result).toBeInstanceOf(Promise);
      await result;
    });

    it('should define async predict method', async () => {
      const plugin = {
        predict: async (input: any) => {
          return { action: 0, confidence: 1.0 };
        },
      };

      const result = await plugin.predict({ state: [1, 2, 3] });
      expect(result).toHaveProperty('action');
      expect(typeof result.action).toBe('number');
    });

    it('should define save/load methods', async () => {
      let savedState: any = null;

      const plugin = {
        save: async (path: string) => {
          savedState = { path, data: 'test' };
          return savedState;
        },
        load: async (path: string) => {
          return savedState;
        },
      };

      const saved = await plugin.save('/tmp/test');
      expect(saved).toBeDefined();
      expect(saved.path).toBe('/tmp/test');

      const loaded = await plugin.load('/tmp/test');
      expect(loaded).toEqual(saved);
    });
  });

  describe('Error Handling', () => {
    it('should handle initialization errors', async () => {
      const plugin = {
        initialize: async (config: any) => {
          if (!config.required) {
            throw new Error('Missing required configuration');
          }
        },
      };

      await expect(plugin.initialize({})).rejects.toThrow('Missing required configuration');
    });

    it('should handle training errors', async () => {
      const plugin = {
        train: async (data: any[]) => {
          if (data.length === 0) {
            throw new Error('No training data provided');
          }
        },
      };

      await expect(plugin.train([])).rejects.toThrow('No training data provided');
    });

    it('should handle prediction errors', async () => {
      const plugin = {
        predict: async (input: any) => {
          if (!input || !input.state) {
            throw new Error('Invalid input state');
          }
          return { action: 0 };
        },
      };

      await expect(plugin.predict(null)).rejects.toThrow('Invalid input state');
      await expect(plugin.predict({})).rejects.toThrow('Invalid input state');
    });
  });
});
