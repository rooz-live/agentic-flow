/**
 * Base class for learning plugins providing common functionality
 */

import { SQLiteVectorDB } from '../core/vector-db';
import { SearchResult } from '../types';
import {
  LearningPlugin,
  PluginConfig,
  Experience,
  Action,
  Context,
  TrainOptions,
  TrainingMetrics,
  PluginMetrics,
} from './learning-plugin.interface';

/**
 * Abstract base class that provides common functionality for all learning plugins
 */
export abstract class BasePlugin implements LearningPlugin {
  /** Plugin name */
  public abstract name: string;

  /** Plugin version */
  public abstract version: string;

  /** Plugin configuration */
  public config!: PluginConfig;

  /** Vector database for experience storage */
  protected vectorDB!: SQLiteVectorDB;

  /** Whether plugin is initialized */
  protected initialized: boolean = false;

  /** Experience counter */
  protected experienceCount: number = 0;

  /** Episode counter */
  protected episodeCount: number = 0;

  /** Success counter */
  protected successCount: number = 0;

  /** Total reward accumulated */
  protected totalReward: number = 0;

  /** Total duration accumulated */
  protected totalDuration: number = 0;

  /**
   * Initialize the plugin with configuration
   */
  async initialize(config: PluginConfig): Promise<void> {
    this.config = config;

    // Initialize vector database
    const dbConfig: any = {
      path: config.storage.path,
      memoryMode: false,
      queryCache: {
        enabled: true,
        maxSize: 1000,
      },
    };

    // Add quantization if properly configured
    if (config.storage.quantization?.enabled) {
      dbConfig.quantization = {
        enabled: true,
        dimensions: config.algorithm.stateDim || 768,
        subvectors: 8,
        bits: config.storage.quantization.bits || 8,
      };
    }

    this.vectorDB = new SQLiteVectorDB(dbConfig);

    // If using WASM backend, initialize async
    if (this.vectorDB.getBackendType() === 'wasm') {
      await this.vectorDB.initializeAsync();
    }

    this.initialized = true;

    // Call custom initialization
    await this.onInitialize();
  }

  /**
   * Destroy the plugin and cleanup resources
   */
  async destroy(): Promise<void> {
    if (this.vectorDB) {
      this.vectorDB.close();
    }

    this.initialized = false;

    // Call custom cleanup
    await this.onDestroy();
  }

  /**
   * Store a single experience
   */
  async storeExperience(experience: Experience): Promise<void> {
    this.checkInitialized();

    // Generate ID if not provided
    if (!experience.id) {
      experience.id = this.generateId();
    }

    // Store in vector database
    this.vectorDB.insert({
      id: experience.id,
      embedding: experience.state,
      metadata: {
        action: experience.action,
        reward: experience.reward,
        nextState: experience.nextState,
        done: experience.done,
        episodeId: experience.episodeId,
        stepIndex: experience.stepIndex,
        ...experience.metadata,
        timestamp: experience.timestamp || Date.now(),
      },
    });

    // Update counters
    this.experienceCount++;
    this.totalReward += experience.reward;

    if (experience.metadata?.duration) {
      this.totalDuration += experience.metadata.duration;
    }

    if (experience.metadata?.success) {
      this.successCount++;
    }

    // Track unique episodes
    if (experience.done && experience.episodeId) {
      this.episodeCount++;
    }

    // Call custom hook
    await this.onStoreExperience(experience);
  }

  /**
   * Store a batch of experiences
   */
  async storeBatch(experiences: Experience[]): Promise<void> {
    this.checkInitialized();

    for (const experience of experiences) {
      await this.storeExperience(experience);
    }
  }

  /**
   * Retrieve similar experiences from storage
   */
  async retrieveSimilar(state: number[], k: number): Promise<SearchResult<Experience>[]> {
    this.checkInitialized();

    const results = this.vectorDB.search(state, k, 'cosine');

    return results.map(r => ({
      id: r.id,
      score: r.score,
      embedding: r.embedding,
      metadata: {
        id: r.id,
        state: r.embedding,
        action: r.metadata.action,
        reward: r.metadata.reward,
        nextState: r.metadata.nextState,
        done: r.metadata.done,
        episodeId: r.metadata.episodeId,
        stepIndex: r.metadata.stepIndex,
        metadata: r.metadata,
        timestamp: r.metadata.timestamp,
      } as Experience,
    }));
  }

  /**
   * Get current plugin metrics
   */
  async getMetrics(): Promise<PluginMetrics> {
    return {
      totalExperiences: this.experienceCount,
      totalEpisodes: this.episodeCount,
      successRate: this.experienceCount > 0 ? this.successCount / this.experienceCount : 0,
      avgReward: this.experienceCount > 0 ? this.totalReward / this.experienceCount : 0,
      avgDuration: this.experienceCount > 0 ? this.totalDuration / this.experienceCount : 0,
    };
  }

  /**
   * Get plugin configuration
   */
  getConfig(): PluginConfig {
    return this.config;
  }

  /**
   * Save plugin state to disk
   */
  async save(path: string): Promise<void> {
    this.checkInitialized();

    // Export database if WASM
    if (this.vectorDB.getBackendType() === 'wasm') {
      const data = this.vectorDB.export();
      if (data) {
        const fs = await import('fs/promises');
        await fs.writeFile(path, data);
      }
    }

    // Call custom save
    await this.onSave(path);
  }

  /**
   * Load plugin state from disk
   */
  async load(path: string): Promise<void> {
    this.checkInitialized();

    // Import database if WASM
    if (this.vectorDB.getBackendType() === 'wasm') {
      const fs = await import('fs/promises');
      const data = await fs.readFile(path);
      await this.vectorDB.importAsync(new Uint8Array(data));
    }

    // Call custom load
    await this.onLoad(path);
  }

  /**
   * Abstract method: Select action given state
   * Must be implemented by concrete plugins
   */
  abstract selectAction(state: number[], context?: Context): Promise<Action>;

  /**
   * Abstract method: Train the plugin
   * Must be implemented by concrete plugins
   */
  abstract train(options?: TrainOptions): Promise<TrainingMetrics>;

  // Lifecycle hooks (can be overridden by subclasses)

  /**
   * Called after initialize() completes
   */
  protected async onInitialize(): Promise<void> {
    // Override in subclass if needed
  }

  /**
   * Called before destroy() completes
   */
  protected async onDestroy(): Promise<void> {
    // Override in subclass if needed
  }

  /**
   * Called after each experience is stored
   */
  protected async onStoreExperience(experience: Experience): Promise<void> {
    // Override in subclass if needed
  }

  /**
   * Called during save()
   */
  protected async onSave(path: string): Promise<void> {
    // Override in subclass if needed
  }

  /**
   * Called during load()
   */
  protected async onLoad(path: string): Promise<void> {
    // Override in subclass if needed
  }

  // Utility methods

  /**
   * Check if plugin is initialized
   */
  protected checkInitialized(): void {
    if (!this.initialized) {
      throw new Error(`Plugin ${this.name} not initialized. Call initialize() first.`);
    }
  }

  /**
   * Generate unique ID
   */
  protected generateId(): string {
    return `${this.name}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Compute discounted returns for an episode
   */
  protected computeReturns(rewards: number[], gamma: number): number[] {
    const returns = new Array(rewards.length);
    let futureReturn = 0;

    for (let i = rewards.length - 1; i >= 0; i--) {
      futureReturn = rewards[i] + gamma * futureReturn;
      returns[i] = futureReturn;
    }

    return returns;
  }

  /**
   * Compute custom reward based on configuration
   */
  protected computeReward(experience: Experience): number {
    if (!this.config.reward) {
      return experience.reward;
    }

    const { type } = this.config.reward;
    const metadata = experience.metadata || {};

    switch (type) {
      case 'success_based':
        return metadata.success ? 1.0 : -1.0;

      case 'time_aware': {
        const baseReward = metadata.success ? 1.0 : -1.0;
        const timePenalty = -0.1 * ((metadata.duration || 0) / 1000);
        return baseReward + timePenalty;
      }

      case 'token_aware': {
        const baseReward = metadata.success ? 1.0 : -1.0;
        const tokenPenalty = -0.01 * ((metadata.tokensUsed || 0) / 100);
        return baseReward + tokenPenalty;
      }

      case 'custom':
        // Custom reward function would be evaluated here
        // For now, return the base reward
        return experience.reward;

      default:
        return experience.reward;
    }
  }
}
