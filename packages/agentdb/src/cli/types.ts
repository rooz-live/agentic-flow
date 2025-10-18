/**
 * Type definitions for CLI and plugin system
 */

export interface WizardOptions {
  template?: string;
  name?: string;
  customize?: boolean;
}

export interface GeneratorOptions {
  configOnly?: boolean;
  force?: boolean;
}

export interface MetadataConfig {
  name: string;
  description: string;
  author?: string;
  version: string;
}

export interface AlgorithmConfig {
  type: string;
  base: 'decision_transformer' | 'q_learning' | 'sarsa' | 'actor_critic' | 'custom';
  [key: string]: any;
}

export interface RewardConfig {
  // SECURITY FIX: Removed 'custom' type to prevent code injection
  type: 'success_based' | 'time_aware' | 'token_aware';
  // SECURITY: function field removed - custom functions not supported
}

export interface StorageConfig {
  backend: 'agentdb';
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

export interface TrainingConfig {
  batch_size?: number;
  epochs?: number;
  min_experiences: number;
  train_every?: number;
  validation_split?: number;
  online?: boolean;
}

export interface MonitoringConfig {
  track_metrics: string[];
  log_interval: number;
  save_checkpoints: boolean;
  checkpoint_interval?: number;
}

export interface PluginConfig extends MetadataConfig {
  algorithm: AlgorithmConfig;
  reward: RewardConfig;
  storage: StorageConfig;
  training: TrainingConfig;
  monitoring?: MonitoringConfig;
}

// Plugin interface types (to be implemented in main package)
export interface Experience {
  state: Vector;
  action: Action;
  reward: number;
  nextState: Vector;
  done: boolean;
}

export type Vector = Float32Array;

export interface Action {
  id: number;
  type: 'discrete' | 'continuous';
  value?: number[];
}

export interface LearningPlugin {
  name: string;
  version: string;
  config: PluginConfig;

  initialize(config: PluginConfig): Promise<void>;
  destroy(): Promise<void>;

  storeExperience(experience: Experience): Promise<void>;
  storeBatch(experiences: Experience[]): Promise<void>;
  retrieveSimilar(state: Vector, k: number): Promise<Experience[]>;

  selectAction(state: Vector, context?: any): Promise<Action>;

  train(options?: any): Promise<any>;

  getMetrics(): Promise<any>;
  getConfig(): PluginConfig;

  save(path: string): Promise<void>;
  load(path: string): Promise<void>;
}
