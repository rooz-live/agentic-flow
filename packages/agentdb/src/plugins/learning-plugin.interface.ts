/**
 * Core interface for learning plugins in the SQLite Vector system
 * Defines the contract that all learning methodologies must implement
 */

import { SearchResult } from '../types';

/**
 * Vector type alias for learning plugins
 */
export type Vector = number[];

/**
 * Configuration for a learning plugin
 */
export interface PluginConfig {
  /** Plugin name */
  name: string;

  /** Plugin version */
  version: string;

  /** Algorithm-specific parameters */
  algorithm: AlgorithmConfig;

  /** Experience replay configuration */
  experienceReplay?: ExperienceReplayConfig;

  /** Training configuration */
  training: TrainingConfig;

  /** Storage configuration */
  storage: StorageConfig;

  /** Optional reward shaping */
  reward?: RewardConfig;
}

/**
 * Algorithm-specific configuration
 */
export interface AlgorithmConfig {
  type: 'decision_transformer' | 'q_learning' | 'sarsa' | 'actor_critic';
  learningRate: number;
  discountFactor: number;
  [key: string]: any;
}

/**
 * Experience replay configuration
 */
export interface ExperienceReplayConfig {
  type: 'none' | 'uniform' | 'prioritized';
  capacity: number;
  alpha?: number; // Priority exponent (for prioritized replay)
  beta?: number; // Importance sampling exponent
  betaIncrement?: number;
}

/**
 * Training configuration
 */
export interface TrainingConfig {
  batchSize: number;
  epochs?: number;
  minExperiences: number;
  trainEvery?: number; // Train every N experiences
  online?: boolean; // Online vs offline learning
  validationSplit?: number;
  earlyStoppingPatience?: number;
}

/**
 * Storage configuration
 */
export interface StorageConfig {
  path: string;
  hnsw?: {
    enabled: boolean;
    M: number;
    efConstruction: number;
    efSearch?: number;
  };
  quantization?: {
    enabled: boolean;
    bits: 8 | 16;
  };
}

/**
 * Reward configuration
 */
export interface RewardConfig {
  type: 'success_based' | 'time_aware' | 'token_aware' | 'custom';
  function?: string; // JavaScript function code for custom rewards
  shaping?: {
    gamma: number;
    lambda: number;
  };
}

/**
 * A single experience/transition in the RL environment
 */
export interface Experience {
  /** Unique identifier */
  id?: string;

  /** State vector */
  state: number[];

  /** Action taken (can be action ID or embedding) */
  action: any;

  /** Reward received */
  reward: number;

  /** Next state vector */
  nextState: number[];

  /** Whether episode terminated */
  done: boolean;

  /** Episode identifier for grouping */
  episodeId?: string;

  /** Step index within episode */
  stepIndex?: number;

  /** Additional metadata */
  metadata?: {
    taskType?: string;
    duration?: number;
    tokensUsed?: number;
    success?: boolean;
    quality?: number;
    [key: string]: any;
  };

  /** Timestamp */
  timestamp?: number;
}

/**
 * Action representation
 */
export interface Action {
  /** Action identifier */
  id: string;

  /** Action embedding or parameters */
  embedding: number[];

  /** Source of the action */
  source?: 'exact_retrieval' | 'knn_interpolation' | 'neural_network' | 'policy';

  /** Confidence/similarity score */
  confidence?: number;

  /** Additional metadata */
  metadata?: any;
}

/**
 * Context for action selection
 */
export interface Context {
  /** Task description */
  taskDescription?: string;

  /** Task type */
  taskType?: string;

  /** Desired return-to-go */
  desiredReturn?: number;

  /** Episode history */
  history?: Experience[];

  /** Additional context */
  [key: string]: any;
}

/**
 * Training options
 */
export interface TrainOptions {
  /** Number of epochs */
  epochs?: number;

  /** Batch size */
  batchSize?: number;

  /** Learning rate */
  learningRate?: number;

  /** Validation split */
  validationSplit?: number;

  /** Verbose logging */
  verbose?: boolean;
}

/**
 * Training metrics
 */
export interface TrainingMetrics {
  /** Average loss */
  loss: number;

  /** Validation loss (if applicable) */
  validationLoss?: number;

  /** Average Q-value (for value-based methods) */
  avgQValue?: number;

  /** Policy entropy (for policy gradient methods) */
  policyEntropy?: number;

  /** Exploration rate (epsilon for epsilon-greedy) */
  epsilon?: number;

  /** Number of episodes trained on */
  episodesTrained?: number;

  /** Additional metrics */
  [key: string]: any;
}

/**
 * Plugin metrics for monitoring
 */
export interface PluginMetrics {
  /** Total experiences stored */
  totalExperiences: number;

  /** Number of episodes */
  totalEpisodes: number;

  /** Success rate */
  successRate: number;

  /** Average reward */
  avgReward: number;

  /** Average episode duration */
  avgDuration: number;

  /** Current training metrics */
  currentTraining?: TrainingMetrics;

  /** Additional metrics */
  [key: string]: any;
}

/**
 * Main interface that all learning plugins must implement
 */
export interface LearningPlugin {
  /** Plugin name */
  name: string;

  /** Plugin version */
  version: string;

  /** Plugin configuration */
  config: PluginConfig;

  /**
   * Initialize the plugin with configuration
   */
  initialize(config: PluginConfig): Promise<void>;

  /**
   * Destroy the plugin and cleanup resources
   */
  destroy(): Promise<void>;

  /**
   * Store a single experience/transition
   */
  storeExperience(experience: Experience): Promise<void>;

  /**
   * Store a batch of experiences
   */
  storeBatch(experiences: Experience[]): Promise<void>;

  /**
   * Retrieve similar experiences from storage
   */
  retrieveSimilar(state: number[], k: number): Promise<SearchResult<Experience>[]>;

  /**
   * Select an action given current state
   */
  selectAction(state: number[], context?: Context): Promise<Action>;

  /**
   * Train the plugin on stored experiences
   */
  train(options?: TrainOptions): Promise<TrainingMetrics>;

  /**
   * Get current plugin metrics
   */
  getMetrics(): Promise<PluginMetrics>;

  /**
   * Get plugin configuration
   */
  getConfig(): PluginConfig;

  /**
   * Save plugin state to disk
   */
  save(path: string): Promise<void>;

  /**
   * Load plugin state from disk
   */
  load(path: string): Promise<void>;
}
