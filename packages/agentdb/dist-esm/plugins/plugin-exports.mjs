/**
 * Learning Plugin System for SQLite Vector
 *
 * This module provides an extensible plugin architecture for implementing
 * various reinforcement learning and adaptive learning algorithms.
 *
 * @example Basic usage
 * ```typescript
 * import { DecisionTransformerPlugin, PluginConfig } from '@agentic-flow/agentdb/plugins';
 *
 * const config: PluginConfig = {
 *   name: 'my-dt-plugin',
 *   version: '1.0.0',
 *   algorithm: {
 *     type: 'decision_transformer',
 *     learningRate: 0.001,
 *     discountFactor: 0.99,
 *     stateDim: 768,
 *     hiddenSize: 256,
 *   },
 *   training: {
 *     batchSize: 32,
 *     minExperiences: 100,
 *   },
 *   storage: {
 *     path: './data/plugin.db',
 *   },
 * };
 *
 * const plugin = new DecisionTransformerPlugin();
 * await plugin.initialize(config);
 *
 * // Store experiences
 * await plugin.storeExperience({
 *   state: stateVector,
 *   action: actionTaken,
 *   reward: 1.0,
 *   nextState: nextStateVector,
 *   done: false,
 * });
 *
 * // Select action
 * const action = await plugin.selectAction(currentState, { desiredReturn: 1.0 });
 *
 * // Train
 * const metrics = await plugin.train({ epochs: 10 });
 * ```
 *
 * @example Creating a custom plugin
 * ```typescript
 * import { BasePlugin, LearningPlugin, PluginConfig } from '@agentic-flow/agentdb/plugins';
 *
 * export class MyCustomPlugin extends BasePlugin {
 *   public name = 'my-custom-plugin';
 *   public version = '1.0.0';
 *
 *   async selectAction(state: number[], context?: Context): Promise<Action> {
 *     // Your custom action selection logic
 *   }
 *
 *   async train(options?: TrainOptions): Promise<TrainingMetrics> {
 *     // Your custom training logic
 *   }
 * }
 * ```
 */
export { BasePlugin } from './base-plugin.mjs';
// Concrete implementations
export { DecisionTransformerPlugin, QLearningPlugin, SARSAPlugin, ActorCriticPlugin, } from './implementations.mjs';
