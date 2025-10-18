/**
 * Unit tests for PluginRegistry
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { assertValidPlugin } from '../setup';

// Mock PluginRegistry for testing
class PluginRegistry {
  private plugins: Map<string, any> = new Map();

  register(plugin: any): void {
    if (!plugin.name || !plugin.version) {
      throw new Error('Plugin must have name and version');
    }
    const key = `${plugin.name}@${plugin.version}`;
    if (this.plugins.has(key)) {
      throw new Error(`Plugin ${key} already registered`);
    }
    this.plugins.set(key, plugin);
  }

  unregister(name: string, version: string): boolean {
    const key = `${name}@${version}`;
    return this.plugins.delete(key);
  }

  get(name: string, version?: string): any | null {
    if (version) {
      return this.plugins.get(`${name}@${version}`) || null;
    }
    // Get latest version
    const matching = Array.from(this.plugins.entries())
      .filter(([key]) => key.startsWith(`${name}@`))
      .sort((a, b) => b[0].localeCompare(a[0]));
    return matching.length > 0 ? matching[0][1] : null;
  }

  list(): any[] {
    return Array.from(this.plugins.values());
  }

  has(name: string, version?: string): boolean {
    if (version) {
      return this.plugins.has(`${name}@${version}`);
    }
    return Array.from(this.plugins.keys()).some(key => key.startsWith(`${name}@`));
  }

  clear(): void {
    this.plugins.clear();
  }
}

describe('PluginRegistry', () => {
  let registry: PluginRegistry;

  beforeEach(() => {
    registry = new PluginRegistry();
  });

  describe('Plugin Registration', () => {
    it('should register a valid plugin', () => {
      const plugin = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test plugin',
        type: 'custom' as const,
        initialize: async () => {},
        train: async () => {},
        predict: async () => ({ result: 'test' }),
        save: async () => ({}),
        load: async () => {},
      };

      registry.register(plugin);
      expect(registry.has('test-plugin', '1.0.0')).toBe(true);
    });

    it('should reject plugin without name', () => {
      const plugin = {
        version: '1.0.0',
        initialize: async () => {},
        train: async () => {},
        predict: async () => ({}),
        save: async () => ({}),
        load: async () => {},
      };

      expect(() => registry.register(plugin)).toThrow('Plugin must have name and version');
    });

    it('should reject plugin without version', () => {
      const plugin = {
        name: 'test-plugin',
        initialize: async () => {},
        train: async () => {},
        predict: async () => ({}),
        save: async () => ({}),
        load: async () => {},
      };

      expect(() => registry.register(plugin)).toThrow('Plugin must have name and version');
    });

    it('should reject duplicate plugin registration', () => {
      const plugin = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test',
        type: 'custom' as const,
        initialize: async () => {},
        train: async () => {},
        predict: async () => ({}),
        save: async () => ({}),
        load: async () => {},
      };

      registry.register(plugin);
      expect(() => registry.register(plugin)).toThrow('already registered');
    });

    it('should allow multiple versions of same plugin', () => {
      const plugin1 = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test',
        type: 'custom' as const,
        initialize: async () => {},
        train: async () => {},
        predict: async () => ({}),
        save: async () => ({}),
        load: async () => {},
      };

      const plugin2 = {
        ...plugin1,
        version: '2.0.0',
      };

      registry.register(plugin1);
      registry.register(plugin2);

      expect(registry.has('test-plugin', '1.0.0')).toBe(true);
      expect(registry.has('test-plugin', '2.0.0')).toBe(true);
    });
  });

  describe('Plugin Retrieval', () => {
    it('should retrieve plugin by name and version', () => {
      const plugin = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test',
        type: 'custom' as const,
        initialize: async () => {},
        train: async () => {},
        predict: async () => ({}),
        save: async () => ({}),
        load: async () => {},
      };

      registry.register(plugin);
      const retrieved = registry.get('test-plugin', '1.0.0');

      expect(retrieved).toBeDefined();
      expect(retrieved.name).toBe('test-plugin');
      expect(retrieved.version).toBe('1.0.0');
    });

    it('should retrieve latest version when version not specified', () => {
      const plugin1 = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test',
        type: 'custom' as const,
        initialize: async () => {},
        train: async () => {},
        predict: async () => ({}),
        save: async () => ({}),
        load: async () => {},
      };

      const plugin2 = { ...plugin1, version: '2.0.0' };

      registry.register(plugin1);
      registry.register(plugin2);

      const retrieved = registry.get('test-plugin');
      expect(retrieved.version).toBe('2.0.0');
    });

    it('should return null for non-existent plugin', () => {
      const retrieved = registry.get('non-existent');
      expect(retrieved).toBeNull();
    });
  });

  describe('Plugin Unregistration', () => {
    it('should unregister existing plugin', () => {
      const plugin = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test',
        type: 'custom' as const,
        initialize: async () => {},
        train: async () => {},
        predict: async () => ({}),
        save: async () => ({}),
        load: async () => {},
      };

      registry.register(plugin);
      expect(registry.has('test-plugin', '1.0.0')).toBe(true);

      const result = registry.unregister('test-plugin', '1.0.0');
      expect(result).toBe(true);
      expect(registry.has('test-plugin', '1.0.0')).toBe(false);
    });

    it('should return false when unregistering non-existent plugin', () => {
      const result = registry.unregister('non-existent', '1.0.0');
      expect(result).toBe(false);
    });
  });

  describe('Plugin Listing', () => {
    it('should list all registered plugins', () => {
      const plugins = [
        {
          name: 'plugin-1',
          version: '1.0.0',
          description: 'Test 1',
          type: 'custom' as const,
          initialize: async () => {},
          train: async () => {},
          predict: async () => ({}),
          save: async () => ({}),
          load: async () => {},
        },
        {
          name: 'plugin-2',
          version: '1.0.0',
          description: 'Test 2',
          type: 'custom' as const,
          initialize: async () => {},
          train: async () => {},
          predict: async () => ({}),
          save: async () => ({}),
          load: async () => {},
        },
      ];

      plugins.forEach(p => registry.register(p));
      const list = registry.list();

      expect(list).toHaveLength(2);
      expect(list.map(p => p.name)).toContain('plugin-1');
      expect(list.map(p => p.name)).toContain('plugin-2');
    });

    it('should return empty array when no plugins registered', () => {
      const list = registry.list();
      expect(list).toHaveLength(0);
    });
  });

  describe('Plugin Existence Check', () => {
    it('should check if plugin exists by name and version', () => {
      const plugin = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test',
        type: 'custom' as const,
        initialize: async () => {},
        train: async () => {},
        predict: async () => ({}),
        save: async () => ({}),
        load: async () => {},
      };

      registry.register(plugin);

      expect(registry.has('test-plugin', '1.0.0')).toBe(true);
      expect(registry.has('test-plugin', '2.0.0')).toBe(false);
      expect(registry.has('other-plugin', '1.0.0')).toBe(false);
    });

    it('should check if any version exists when version not specified', () => {
      const plugin = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test',
        type: 'custom' as const,
        initialize: async () => {},
        train: async () => {},
        predict: async () => ({}),
        save: async () => ({}),
        load: async () => {},
      };

      registry.register(plugin);

      expect(registry.has('test-plugin')).toBe(true);
      expect(registry.has('other-plugin')).toBe(false);
    });
  });

  describe('Registry Clear', () => {
    it('should clear all registered plugins', () => {
      const plugin = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test',
        type: 'custom' as const,
        initialize: async () => {},
        train: async () => {},
        predict: async () => ({}),
        save: async () => ({}),
        load: async () => {},
      };

      registry.register(plugin);
      expect(registry.list()).toHaveLength(1);

      registry.clear();
      expect(registry.list()).toHaveLength(0);
    });
  });
});
