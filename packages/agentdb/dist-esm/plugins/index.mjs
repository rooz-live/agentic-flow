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
// ============ Plugin Registry ============
export { 
// Registry class
PluginRegistry, 
// Registry functions
getRegistry, registerPlugin, loadPlugin, 
// Errors
PluginError } from './registry.mjs';
// ============ Base Plugin ============
export { 
// Base plugin class
BasePlugin } from './base-plugin.mjs';
// ============ Validation ============
export { 
// Validation functions
validatePluginConfig, validateRequired, getErrorSummary } from './validator.mjs';
// ============ Version Information ============
/**
 * Plugin system version
 */
export const PLUGIN_SYSTEM_VERSION = '1.0.0';
/**
 * Supported plugin API version
 */
export const PLUGIN_API_VERSION = '1.0.0';
export function createDefaultConfig(overrides) {
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
import { getRegistry } from './registry.mjs';
/**
 * Check if plugin system is initialized
 *
 * @returns Whether registry has plugins
 */
export function isInitialized() {
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
        availablePlugins: plugins.map((p) => ({
            name: p.name,
            version: p.version,
            baseAlgorithm: p.baseAlgorithm
        }))
    };
}
