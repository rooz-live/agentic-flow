/**
 * AgentDB Re-exports for Backwards Compatibility
 *
 * This module provides backwards-compatible exports for code that previously
 * used embedded AgentDB controllers. Now uses local controller implementations.
 *
 * @since v1.7.0 - Integrated agentdb as proper dependency
 */
// Import from local controllers
export { CausalMemoryGraph } from './controllers/CausalMemoryGraph.js';
export { CausalRecall } from './controllers/CausalRecall.js';
export { EmbeddingService } from './controllers/EmbeddingService.js';
export { ExplainableRecall } from './controllers/ExplainableRecall.js';
export { NightlyLearner } from './controllers/NightlyLearner.js';
export { ReflexionMemory } from './controllers/ReflexionMemory.js';
export { SkillLibrary } from './controllers/SkillLibrary.js';
//# sourceMappingURL=index.js.map