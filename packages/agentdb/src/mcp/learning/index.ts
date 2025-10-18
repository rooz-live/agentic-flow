/**
 * MCP Learning Integration - Main Entry Point
 *
 * Provides reinforcement learning capabilities for MCP tools including:
 * - Experience recording and replay
 * - Multi-dimensional reward calculation
 * - Policy optimization (Q-learning)
 * - Session management
 * - Transfer learning between tasks
 */

// Core classes
export { LearningManager } from './core/learning-manager.js';
export { ExperienceRecorder } from './core/experience-recorder.js';
export { RewardEstimator } from './core/reward-estimator.js';
export { SessionManager } from './core/session-manager.js';
export { PolicyOptimizer } from './core/policy-optimizer.js';
export { ExperienceBuffer } from './core/experience-buffer.js';

// MCP tools
export { MCPLearningTools } from './tools/mcp-learning-tools.js';

// Types
export type {
  ExecutionContext,
  State,
  Action,
  Experience,
  Outcome,
  Reward,
  ActionPrediction,
  TrainingOptions,
  TrainingMetrics,
  LearningSession,
  FeedbackInput,
  LearningMetrics,
  TransferMetrics,
} from './types/index.js';
