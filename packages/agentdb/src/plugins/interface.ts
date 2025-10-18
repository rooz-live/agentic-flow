/**
 * Core interface definitions for the Learning Plugin System
 *
 * This module defines the contract that all learning plugins must implement,
 * enabling custom learning methodologies to integrate seamlessly with the
 * agentdb system.
 *
 * @module plugins/interface
 */

/**
 * Vector type for state and action embeddings
 */
export type Vector = number[] | Float32Array | Float64Array;

/**
 * Plugin execution context with metadata
 */
export interface Context {
  /** Task identifier */
  taskId?: string;
  /** Execution duration in milliseconds */
  duration?: number;
  /** Number of tokens used */
  tokensUsed?: number;
  /** Code complexity score (0-1) */
  codeComplexity?: number;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Task outcome after action execution
 */
export interface Outcome {
  /** Whether the task succeeded */
  success: boolean;
  /** Result value or error */
  result?: any;
  /** Error information if failed */
  error?: Error;
  /** Next state after action */
  nextState?: any;
  /** Whether this is a terminal state */
  done: boolean;
}

/**
 * Experience tuple for reinforcement learning
 */
export interface Experience {
  /** Unique experience identifier */
  id?: string;
  /** Current state vector */
  state: Vector;
  /** Action taken */
  action: Action;
  /** Reward received */
  reward: number;
  /** Next state vector */
  nextState: Vector;
  /** Whether episode terminated */
  done: boolean;
  /** Additional metadata */
  metadata?: Record<string, any>;
  /** Timestamp when experience was collected */
  timestamp?: number;
  /** Priority for prioritized replay (optional) */
  priority?: number;
}

/**
 * Action representation
 */
export interface Action {
  /** Action identifier or index */
  id: string | number;
  /** Action type */
  type: 'discrete' | 'continuous';
  /** Action value(s) */
  value: number | number[];
  /** Confidence or probability */
  confidence?: number;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Training options
 */
export interface TrainOptions {
  /** Number of training epochs */
  epochs?: number;
  /** Batch size for training */
  batchSize?: number;
  /** Validation split ratio */
  validationSplit?: number;
  /** Enable verbose logging */
  verbose?: boolean;
  /** Custom training callbacks */
  callbacks?: TrainingCallback[];
}

/**
 * Training callback interface
 */
export interface TrainingCallback {
  /** Called before training starts */
  onTrainBegin?(logs?: Record<string, any>): void | Promise<void>;
  /** Called after training ends */
  onTrainEnd?(logs?: Record<string, any>): void | Promise<void>;
  /** Called before each epoch */
  onEpochBegin?(epoch: number, logs?: Record<string, any>): void | Promise<void>;
  /** Called after each epoch */
  onEpochEnd?(epoch: number, logs?: Record<string, any>): void | Promise<void>;
  /** Called before each batch */
  onBatchBegin?(batch: number, logs?: Record<string, any>): void | Promise<void>;
  /** Called after each batch */
  onBatchEnd?(batch: number, logs?: Record<string, any>): void | Promise<void>;
}

/**
 * Training metrics
 */
export interface TrainingMetrics {
  /** Training loss */
  loss: number;
  /** Validation loss */
  validationLoss?: number;
  /** Average Q-value */
  avgQValue?: number;
  /** Current exploration rate (epsilon) */
  epsilon?: number;
  /** Number of experiences processed */
  experiencesProcessed: number;
  /** Training duration in milliseconds */
  duration: number;
  /** Additional custom metrics */
  [key: string]: any;
}

/**
 * Plugin performance metrics
 */
export interface PluginMetrics {
  /** Success rate (0-1) */
  successRate: number;
  /** Average reward per episode */
  avgReward: number;
  /** Total number of experiences collected */
  totalExperiences: number;
  /** Total number of training steps */
  totalTrainingSteps: number;
  /** Sample efficiency (experiences needed to reach threshold) */
  sampleEfficiency?: number;
  /** Current exploration rate */
  explorationRate?: number;
  /** Additional custom metrics */
  [key: string]: any;
}

/**
 * Plugin configuration schema
 */
export interface PluginConfig {
  /** Plugin name (kebab-case) */
  name: string;
  /** Semantic version */
  version: string;
  /** Plugin author */
  author?: string;
  /** Plugin description */
  description: string;
  /** Base algorithm type */
  baseAlgorithm: 'decision_transformer' | 'q_learning' | 'sarsa' | 'actor_critic' | 'custom';

  /** Algorithm-specific configuration */
  algorithm: AlgorithmConfig;

  /** State representation configuration */
  state: StateConfig;

  /** Action space configuration */
  action: ActionConfig;

  /** Reward configuration */
  reward: RewardConfig;

  /** Experience replay configuration */
  experienceReplay?: ExperienceReplayConfig;

  /** Storage configuration */
  storage: StorageConfig;

  /** Training configuration */
  training: TrainingConfig;

  /** Monitoring configuration */
  monitoring?: MonitoringConfig;

  /** Plugin extensions */
  extensions?: ExtensionConfig[];
}

/**
 * Algorithm configuration
 */
export interface AlgorithmConfig {
  /** Algorithm type */
  type: string;
  /** Learning rate */
  learningRate?: number;
  /** Discount factor (gamma) */
  discountFactor?: number;
  /** Additional algorithm-specific parameters */
  [key: string]: any;
}

/**
 * State configuration
 */
export interface StateConfig {
  /** Embedding model name */
  embeddingModel?: string;
  /** State vector dimension */
  dimension: number;
  /** Preprocessing steps */
  preprocessing?: ('normalize' | 'reduce_dim' | 'augment')[];
}

/**
 * Action configuration
 */
export interface ActionConfig {
  /** Action space type */
  type: 'discrete' | 'continuous';
  /** Number of discrete actions */
  spaceSize?: number;
  /** Bounds for continuous actions */
  spaceBounds?: [number, number][];
  /** Action selection strategy */
  selectionStrategy: string;
}

/**
 * Reward configuration
 */
export interface RewardConfig {
  /** Reward function type */
  type: 'success_based' | 'time_aware' | 'token_aware' | 'custom';
  /** Custom reward function code */
  function?: string;
  /** Reward shaping parameters */
  shaping?: {
    gamma: number;
    lambda: number;
  };
}

/**
 * Experience replay configuration
 */
export interface ExperienceReplayConfig {
  /** Replay buffer type */
  type: 'none' | 'uniform' | 'prioritized';
  /** Buffer capacity */
  capacity: number;
  /** Prioritization exponent (for prioritized replay) */
  alpha?: number;
  /** Importance sampling exponent */
  beta?: number;
  /** Beta increment per sample */
  betaIncrement?: number;
}

/**
 * Storage configuration
 */
export interface StorageConfig {
  /** Storage backend */
  backend: 'agentdb';
  /** Database file path */
  path: string;
  /** HNSW index configuration */
  hnsw?: {
    enabled: boolean;
    M: number;
    efConstruction: number;
    efSearch?: number;
  };
  /** Quantization configuration */
  quantization?: {
    enabled: boolean;
    bits: 8 | 16;
  };
}

/**
 * Training configuration
 */
export interface TrainingConfig {
  /** Batch size */
  batchSize: number;
  /** Number of training epochs */
  epochs?: number;
  /** Validation split ratio */
  validationSplit?: number;
  /** Early stopping patience */
  earlyStoppingPatience?: number;
  /** Minimum experiences before training */
  minExperiences: number;
  /** Train every N experiences */
  trainEvery?: number;
  /** Online training mode */
  online?: boolean;
}

/**
 * Monitoring configuration
 */
export interface MonitoringConfig {
  /** Metrics to track */
  trackMetrics: string[];
  /** Log interval (episodes) */
  logInterval: number;
  /** Save checkpoints */
  saveCheckpoints: boolean;
  /** Checkpoint interval (episodes) */
  checkpointInterval?: number;
  /** Weights & Biases configuration */
  wandb?: {
    enabled: boolean;
    project: string;
    entity?: string;
  };
}

/**
 * Extension configuration
 */
export interface ExtensionConfig {
  /** Extension name */
  name: string;
  /** Whether extension is enabled */
  enabled: boolean;
  /** Extension-specific configuration */
  config: Record<string, any>;
}

/**
 * Core Learning Plugin interface
 *
 * All learning plugins must implement this interface to integrate
 * with the agentdb plugin system.
 */
export interface LearningPlugin {
  /** Plugin name */
  readonly name: string;

  /** Plugin version */
  readonly version: string;

  /** Plugin configuration */
  readonly config: PluginConfig;

  // ============ Lifecycle Methods ============

  /**
   * Initialize the plugin with configuration
   *
   * @param config - Plugin configuration
   * @throws {Error} If initialization fails
   */
  initialize(config: PluginConfig): Promise<void>;

  /**
   * Cleanup and destroy the plugin
   *
   * @throws {Error} If cleanup fails
   */
  destroy(): Promise<void>;

  // ============ Experience Management ============

  /**
   * Store a single experience
   *
   * @param experience - Experience to store
   * @throws {Error} If storage fails
   */
  storeExperience(experience: Experience): Promise<void>;

  /**
   * Store a batch of experiences efficiently
   *
   * @param experiences - Array of experiences
   * @throws {Error} If batch storage fails
   */
  storeBatch(experiences: Experience[]): Promise<void>;

  /**
   * Retrieve similar experiences using vector similarity
   *
   * @param state - Query state vector
   * @param k - Number of similar experiences to retrieve
   * @returns Array of similar experiences
   * @throws {Error} If retrieval fails
   */
  retrieveSimilar(state: Vector, k: number): Promise<Experience[]>;

  // ============ Action Selection ============

  /**
   * Select an action given the current state
   *
   * @param state - Current state vector
   * @param context - Optional execution context
   * @returns Selected action
   * @throws {Error} If action selection fails
   */
  selectAction(state: Vector, context?: Context): Promise<Action>;

  // ============ Training ============

  /**
   * Train the plugin on collected experiences
   *
   * @param options - Optional training configuration
   * @returns Training metrics
   * @throws {Error} If training fails
   */
  train(options?: TrainOptions): Promise<TrainingMetrics>;

  // ============ Metrics & Introspection ============

  /**
   * Get current plugin performance metrics
   *
   * @returns Plugin metrics
   */
  getMetrics(): Promise<PluginMetrics>;

  /**
   * Get plugin configuration
   *
   * @returns Plugin configuration
   */
  getConfig(): PluginConfig;

  // ============ Persistence ============

  /**
   * Save plugin state to disk
   *
   * @param path - File path to save to
   * @throws {Error} If save fails
   */
  save(path: string): Promise<void>;

  /**
   * Load plugin state from disk
   *
   * @param path - File path to load from
   * @throws {Error} If load fails
   */
  load(path: string): Promise<void>;
}

/**
 * Plugin factory function type
 */
export type PluginFactory = (config?: Partial<PluginConfig>) => LearningPlugin | Promise<LearningPlugin>;

/**
 * Plugin metadata for registration
 */
export interface PluginMetadata {
  /** Plugin name */
  name: string;
  /** Plugin version */
  version: string;
  /** Plugin description */
  description: string;
  /** Plugin author */
  author?: string;
  /** Base algorithm */
  baseAlgorithm: string;
  /** Plugin factory function */
  factory: PluginFactory;
  /** Default configuration */
  defaultConfig?: Partial<PluginConfig>;
  /** Plugin tags for categorization */
  tags?: string[];
}
