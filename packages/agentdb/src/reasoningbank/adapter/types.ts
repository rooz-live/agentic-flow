/**
 * Type definitions for AgentDB ReasoningBank Adapter
 *
 * Maintains 100% backward compatibility with legacy ReasoningBank types
 * while adding new AgentDB capabilities.
 */

/**
 * Legacy ReasoningMemory format (backward compatible)
 */
export interface ReasoningMemory {
  id: string;
  type: 'pattern' | 'trajectory' | 'experience';
  domain: string;
  pattern_data: string; // JSON stringified PatternData
  confidence: number;
  usage_count: number;
  success_count: number;
  created_at: number;
  last_used: number;
}

/**
 * Pattern data structure
 */
export interface PatternData {
  embedding: number[];
  pattern: any;
  context?: any;
  metadata?: Record<string, any>;
}

/**
 * Trajectory data structure
 */
export interface TrajectoryData {
  id: string;
  domain?: string;
  states: number[][];
  actions: any[];
  rewards: number[];
  metadata?: Record<string, any>;
}

/**
 * Options for retrieval operations
 */
export interface RetrievalOptions {
  query?: string | number[];
  domain?: string;
  agent?: string;
  minConfidence?: number;
  limit?: number;
  useMMR?: boolean;
  lambda?: number;
}

/**
 * Options for insert operations
 */
export interface InsertOptions {
  skipLearning?: boolean;
  skipSync?: boolean;
  metadata?: Record<string, any>;
}

/**
 * Pattern match result
 */
export interface PatternMatch {
  id: string;
  pattern: any;
  confidence: number;
  similarity: number;
  context?: any;
}

/**
 * Reasoning context
 */
export interface ReasoningContext {
  query: string | number[];
  domain?: string;
  agent?: string;
  similarPatterns: PatternMatch[];
  synthesizedContext?: any;
  metadata?: Record<string, any>;
}

/**
 * Memory optimization result
 */
export interface OptimizationResult {
  patternsConsolidated: number;
  patternsPruned: number;
  spaceSaved: number;
  performanceGain: number;
}

/**
 * Training metrics
 */
export interface TrainingMetrics {
  loss: number;
  accuracy?: number;
  episodesProcessed: number;
  duration: number;
  metadata?: Record<string, any>;
}

/**
 * Sync event
 */
export interface SyncEvent {
  type: 'insert' | 'update' | 'delete';
  id: string;
  embedding?: number[];
  metadata?: any;
  updates?: any;
  timestamp: number;
  source?: string;
}
