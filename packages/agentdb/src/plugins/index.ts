/**
 * SQLite Vector Learning Plugins
 *
 * Extensible plugin system for custom learning methodologies using vector databases.
 *
 * This module provides:
 * - Plugin interface definitions
 * - Plugin registry for discovery and management
 * - Base plugin implementation
 * - Configuration validation
 *
 * @module plugins
 * @packageDocumentation
 *
 * @example
 * ```typescript
 * import {
 *   getRegistry,
 *   registerPlugin,
 *   loadPlugin,
 *   BasePlugin,
 *   type LearningPlugin,
 *   type PluginConfig
 * } from '@agentdb/plugins';
 *
 * // Register a plugin
 * registerPlugin({
 *   name: 'my-q-learning',
 *   version: '1.0.0',
 *   description: 'Custom Q-Learning implementation',
 *   baseAlgorithm: 'q_learning',
 *   factory: (config) => new MyQLearningPlugin(config)
 * });
 *
 * // Load and use plugin
 * const plugin = await loadPlugin('my-q-learning', {
 *   config: {
 *     training: { batchSize: 64 }
 *   },
 *   initialize: true
 * });
 *
 * // Use plugin for learning
 * const action = await plugin.selectAction(stateVector);
 * await plugin.storeExperience({
 *   state: stateVector,
 *   action,
 *   reward: 1.0,
 *   nextState: nextStateVector,
 *   done: false
 * });
 * await plugin.train();
 * ```
 */

// ============ Core Interfaces ============

export {
  // Primary plugin interface
  type LearningPlugin,

  // Configuration types
  type PluginConfig,
  type AlgorithmConfig,
  type StateConfig,
  type ActionConfig,
  type RewardConfig,
  type ExperienceReplayConfig,
  type StorageConfig,
  type TrainingConfig,
  type MonitoringConfig,
  type ExtensionConfig,

  // Data types
  type Vector,
  type Experience,
  type Action,
  type Context,
  type Outcome,

  // Training types
  type TrainOptions,
  type TrainingCallback,
  type TrainingMetrics,
  type PluginMetrics,

  // Plugin metadata
  type PluginFactory,
  type PluginMetadata
} from './interface';

// ============ Plugin Registry ============

export {
  // Registry class
  PluginRegistry,

  // Registry functions
  getRegistry,
  registerPlugin,
  loadPlugin,

  // Registry types
  type PluginLoadOptions,
  type PluginSearchCriteria,

  // Errors
  PluginError
} from './registry';

// ============ Base Plugin ============

export {
  // Base plugin class
  BasePlugin
} from './base-plugin';

// ============ Validation ============

export {
  // Validation functions
  validatePluginConfig,
  validateRequired,
  getErrorSummary,

  // Validation types
  type ValidationResult,
  type ValidationError
} from './validator';

// ============ Version Information ============

/**
 * Plugin system version
 */
export const PLUGIN_SYSTEM_VERSION = '1.0.0';

/**
 * Supported plugin API version
 */
export const PLUGIN_API_VERSION = '1.0.0';

// ============ Utility Functions ============

/**
 * Create a plugin configuration with defaults
 *
 * @param overrides - Configuration overrides
 * @returns Plugin configuration with defaults
 *
 * @example
 * ```typescript
 * const config = createDefaultConfig({
 *   name: 'my-plugin',
 *   version: '1.0.0',
 *   description: 'My custom plugin',
 *   baseAlgorithm: 'q_learning'
 * });
 * ```
 */
import type { PluginConfig as IPluginConfig } from './interface';

export function createDefaultConfig(overrides: Partial<IPluginConfig>): IPluginConfig {
  return {
    name: overrides.name || 'unnamed-plugin',
    version: overrides.version || '1.0.0',
    description: overrides.description || 'A learning plugin',
    baseAlgorithm: overrides.baseAlgorithm || 'custom',

    algorithm: {
      type: 'custom',
      learningRate: 0.001,
      discountFactor: 0.99,
      ...overrides.algorithm
    },

    state: {
      dimension: 768,
      preprocessing: ['normalize'],
      ...overrides.state
    },

    action: {
      type: 'discrete',
      spaceSize: 100,
      selectionStrategy: 'epsilon_greedy',
      ...overrides.action
    },

    reward: {
      type: 'success_based',
      ...overrides.reward
    },

    experienceReplay: overrides.experienceReplay || {
      type: 'uniform',
      capacity: 10000
    },

    storage: {
      backend: 'agentdb',
      path: './.rl/plugin.db',
      hnsw: {
        enabled: true,
        M: 16,
        efConstruction: 200
      },
      ...overrides.storage
    },

    training: {
      batchSize: 32,
      epochs: 10,
      minExperiences: 100,
      trainEvery: 100,
      ...overrides.training
    },

    monitoring: {
      trackMetrics: ['success_rate', 'avg_reward', 'loss'],
      logInterval: 10,
      saveCheckpoints: true,
      checkpointInterval: 50,
      ...overrides.monitoring
    },

    extensions: overrides.extensions || []
  };
}

import { getRegistry } from './registry';

/**
 * Check if plugin system is initialized
 *
 * @returns Whether registry has plugins
 */
export function isInitialized(): boolean {
  const registry = getRegistry();
  return registry.list().length > 0;
}

/**
 * Get plugin system information
 *
 * @returns System information
 */
export function getSystemInfo() {
  const registry = getRegistry();
  const plugins = registry.list();
  const activePlugins = registry.listActive();

  return {
    systemVersion: PLUGIN_SYSTEM_VERSION,
    apiVersion: PLUGIN_API_VERSION,
    totalPlugins: plugins.length,
    activePlugins: activePlugins.length,
    availablePlugins: plugins.map((p: any) => ({
      name: p.name,
      version: p.version,
      baseAlgorithm: p.baseAlgorithm
    }))
  };
}
