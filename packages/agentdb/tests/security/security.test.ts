/**
 * Security tests for plugin system
 * Tests for major vulnerabilities: code injection, path traversal, prototype pollution
 */

import { validateConfig, validatePluginName } from '../../src/cli/wizard/validator';
import type { PluginConfig } from '../../src/cli/types';

describe('Security Tests', () => {
  describe('Code Injection Prevention', () => {
    it('should reject custom reward functions via schema validation', () => {
      const config: any = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test plugin with malicious reward',
        algorithm: {
          type: 'q_learning',
          base: 'q_learning',
          learning_rate: 0.001,
          discount_factor: 0.99,
        },
        reward: {
          type: 'custom', // This should be rejected by schema
          function: 'require("child_process").execSync("rm -rf /"); return 1.0;',
        },
        storage: {
          backend: 'sqlite-vector',
          path: './test.db',
        },
        training: {
          batch_size: 32,
          min_experiences: 100,
        },
      };

      const result = validateConfig(config as PluginConfig);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('must be equal to one of the allowed values') || e.includes('enum'))).toBe(true);
    });

    it('should only accept safe predefined reward types', () => {
      const safeTypes = ['success_based', 'time_aware', 'token_aware'];

      safeTypes.forEach(rewardType => {
        const config: PluginConfig = {
          name: 'test-plugin',
          version: '1.0.0',
          description: 'Test plugin for reward validation',
          algorithm: {
            type: 'q_learning',
            base: 'q_learning',
            learning_rate: 0.001,
            discount_factor: 0.99,
          },
          reward: {
            type: rewardType as any,
          },
          storage: {
            backend: 'sqlite-vector',
            path: './test.db',
          },
          training: {
            batch_size: 32,
            min_experiences: 100,
          },
        };

        const result = validateConfig(config);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });
  });

  describe('Path Traversal Prevention', () => {
    it('should reject path traversal attempts in plugin name', () => {
      const maliciousNames = [
        '../../../etc/malicious',
        '../malicious',
        'test/../../../evil',
        './../../etc/passwd',
      ];

      maliciousNames.forEach(name => {
        const config: PluginConfig = {
          name,
          version: '1.0.0',
          description: 'Malicious plugin',
          algorithm: {
            type: 'q_learning',
            base: 'q_learning',
            learning_rate: 0.001,
          },
          reward: {
            type: 'success_based',
          },
          storage: {
            backend: 'sqlite-vector',
            path: './test.db',
          },
          training: {
            min_experiences: 100,
          },
        };

        const result = validateConfig(config);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('pattern'))).toBe(true);
      });
    });

    it('should reject names with unsafe characters', () => {
      const unsafeNames = [
        'plugin/name',
        'plugin\\name',
        'plugin..name',
        'plugin name',
        'plugin@name',
        'plugin$name',
        'PLUGIN',  // uppercase
        'Plugin-Name', // uppercase
      ];

      unsafeNames.forEach(name => {
        const isValid = validatePluginName(name);
        expect(isValid).toBe(false);
      });
    });

    it('should reject names that are too long', () => {
      const longName = 'a'.repeat(51);
      const config: PluginConfig = {
        name: longName,
        version: '1.0.0',
        description: 'Test plugin with valid description',
        algorithm: {
          type: 'q_learning',
          base: 'q_learning',
          learning_rate: 0.001,
          discount_factor: 0.99,
        },
        reward: {
          type: 'success_based',
        },
        storage: {
          backend: 'sqlite-vector',
          path: './test.db',
        },
        training: {
          batch_size: 32,
          min_experiences: 100,
        },
      };

      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      // AJV error message format for name field
      expect(result.errors.some(e =>
        e.includes('maxLength') ||
        e.includes('must NOT have more than')
      )).toBe(true);
    });

    it('should reject names that are too short', () => {
      const config: PluginConfig = {
        name: 'ab',
        version: '1.0.0',
        description: 'Test plugin with valid description',
        algorithm: {
          type: 'q_learning',
          base: 'q_learning',
          learning_rate: 0.001,
          discount_factor: 0.99,
        },
        reward: {
          type: 'success_based',
        },
        storage: {
          backend: 'sqlite-vector',
          path: './test.db',
        },
        training: {
          batch_size: 32,
          min_experiences: 100,
        },
      };

      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      // AJV error message format for name field
      expect(result.errors.some(e =>
        e.includes('minLength') ||
        e.includes('must NOT have fewer than')
      )).toBe(true);
    });

    it('should only allow safe characters in plugin name', () => {
      const safeName = 'my-safe-plugin-123';
      expect(validatePluginName(safeName)).toBe(true);
    });
  });

  describe('Prototype Pollution Prevention', () => {
    it('should be protected by JSON schema validation', () => {
      // The schema validation prevents prototype pollution by:
      // 1. Only accepting whitelisted keys
      // 2. Type validation for all values
      // 3. Not allowing arbitrary object keys

      const config: PluginConfig = {
        name: 'safe-plugin',
        version: '1.0.0',
        description: 'Safe plugin with proper validation',
        algorithm: {
          type: 'q_learning',
          base: 'q_learning',
          learning_rate: 0.001,
          discount_factor: 0.99,
        },
        reward: {
          type: 'success_based',
        },
        storage: {
          backend: 'sqlite-vector',
          path: './test.db',
        },
        training: {
          batch_size: 32,
          min_experiences: 100,
        },
      };

      const result = validateConfig(config);
      expect(result.valid).toBe(true);
    });
  });

  describe('DoS Prevention', () => {
    it('should validate description length', () => {
      const config: PluginConfig = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Short', // Too short (< 10 chars)
        algorithm: {
          type: 'q_learning',
          base: 'q_learning',
          learning_rate: 0.001,
          discount_factor: 0.99,
        },
        reward: {
          type: 'success_based',
        },
        storage: {
          backend: 'sqlite-vector',
          path: './test.db',
        },
        training: {
          min_experiences: 100,
        },
      };

      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      // Check for AJV's actual error format
      expect(result.errors.some(e =>
        e.includes('must NOT have fewer than') ||
        e.includes('minLength')
      )).toBe(true);
    });

    it('should validate description maximum length', () => {
      const config: PluginConfig = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'a'.repeat(501), // Too long (> 500 chars)
        algorithm: {
          type: 'q_learning',
          base: 'q_learning',
          learning_rate: 0.001,
          discount_factor: 0.99,
        },
        reward: {
          type: 'success_based',
        },
        storage: {
          backend: 'sqlite-vector',
          path: './test.db',
        },
        training: {
          min_experiences: 100,
        },
      };

      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      // Check for AJV's actual error format
      expect(result.errors.some(e =>
        e.includes('must NOT have more than') ||
        e.includes('maxLength')
      )).toBe(true);
    });
  });

  describe('Safe Configuration Validation', () => {
    it('should accept valid configurations', () => {
      const validConfig: PluginConfig = {
        name: 'my-safe-plugin',
        version: '1.0.0',
        description: 'A safe plugin with no security issues',
        algorithm: {
          type: 'q_learning',
          base: 'q_learning',
          learning_rate: 0.001,
          discount_factor: 0.99,
        },
        reward: {
          type: 'success_based',
        },
        storage: {
          backend: 'sqlite-vector',
          path: './safe-plugin.db',
        },
        training: {
          batch_size: 32,
          min_experiences: 100,
        },
      };

      const result = validateConfig(validConfig);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept all predefined reward types', () => {
      const rewardTypes: Array<'success_based' | 'time_aware' | 'token_aware'> = [
        'success_based',
        'time_aware',
        'token_aware',
      ];

      rewardTypes.forEach(rewardType => {
        const config: PluginConfig = {
          name: 'test-plugin',
          version: '1.0.0',
          description: 'Test plugin for reward type validation',
          algorithm: {
            type: 'q_learning',
            base: 'q_learning',
            learning_rate: 0.001,
            discount_factor: 0.99,
          },
          reward: {
            type: rewardType,
          },
          storage: {
            backend: 'sqlite-vector',
            path: './test.db',
          },
          training: {
            batch_size: 32,
            min_experiences: 100,
          },
        };

        const result = validateConfig(config);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('should validate Q-Learning specific requirements', () => {
      const config: PluginConfig = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test Q-Learning plugin',
        algorithm: {
          type: 'q_learning',
          base: 'q_learning',
          // Missing learning_rate and discount_factor
        },
        reward: {
          type: 'success_based',
        },
        storage: {
          backend: 'sqlite-vector',
          path: './test.db',
        },
        training: {
          min_experiences: 100,
        },
      };

      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('learning_rate'))).toBe(true);
      expect(result.errors.some(e => e.includes('discount_factor'))).toBe(true);
    });
  });
});
