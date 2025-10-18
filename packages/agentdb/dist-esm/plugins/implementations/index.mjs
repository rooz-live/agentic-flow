/**
 * Concrete implementations of learning plugins
 *
 * This module exports all available learning plugin implementations:
 *
 * Core RL Algorithms:
 * - DecisionTransformerPlugin: Sequence modeling with 3-tier action selection
 * - QLearningPlugin: Off-policy value-based learning with experience replay
 * - SARSAPlugin: On-policy learning with eligibility traces
 * - ActorCriticPlugin: Policy gradient with value function baseline
 *
 * Advanced Learning Paradigms:
 * - FederatedLearningPlugin: Privacy-preserving distributed learning
 * - CurriculumLearningPlugin: Structured learning from easy to hard
 * - ActiveLearningPlugin: Query-based learning with uncertainty sampling
 * - AdversarialTrainingPlugin: Robust learning through adversarial examples
 * - NeuralArchitectureSearchPlugin: Automated architecture optimization
 * - MultiTaskLearningPlugin: Joint learning across multiple related tasks
 */
// Core RL Algorithms
export { DecisionTransformerPlugin } from './decision-transformer.mjs';
export { QLearningPlugin } from './q-learning.mjs';
export { SARSAPlugin } from './sarsa.mjs';
export { ActorCriticPlugin } from './actor-critic.mjs';
// Advanced Learning Paradigms
export { FederatedLearningPlugin } from './federated-learning.mjs';
export { CurriculumLearningPlugin } from './curriculum-learning.mjs';
export { ActiveLearningPlugin } from './active-learning.mjs';
export { AdversarialTrainingPlugin } from './adversarial-training.mjs';
export { NeuralArchitectureSearchPlugin } from './neural-architecture-search.mjs';
export { MultiTaskLearningPlugin } from './multi-task-learning.mjs';
