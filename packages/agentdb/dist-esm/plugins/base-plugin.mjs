/**
 * Base class for learning plugins providing common functionality
 */
import { SQLiteVectorDB } from '../core/vector-db.mjs';
/**
 * Abstract base class that provides common functionality for all learning plugins
 */
export class BasePlugin {
    constructor() {
        /** Whether plugin is initialized */
        this.initialized = false;
        /** Experience counter */
        this.experienceCount = 0;
        /** Episode counter */
        this.episodeCount = 0;
        /** Success counter */
        this.successCount = 0;
        /** Total reward accumulated */
        this.totalReward = 0;
        /** Total duration accumulated */
        this.totalDuration = 0;
    }
    /**
     * Initialize the plugin with configuration
     */
    async initialize(config) {
        this.config = config;
        // Initialize vector database
        const dbConfig = {
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
    async destroy() {
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
    async storeExperience(experience) {
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
    async storeBatch(experiences) {
        this.checkInitialized();
        for (const experience of experiences) {
            await this.storeExperience(experience);
        }
    }
    /**
     * Retrieve similar experiences from storage
     */
    async retrieveSimilar(state, k) {
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
            },
        }));
    }
    /**
     * Get current plugin metrics
     */
    async getMetrics() {
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
    getConfig() {
        return this.config;
    }
    /**
     * Save plugin state to disk
     */
    async save(path) {
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
    async load(path) {
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
    // Lifecycle hooks (can be overridden by subclasses)
    /**
     * Called after initialize() completes
     */
    async onInitialize() {
        // Override in subclass if needed
    }
    /**
     * Called before destroy() completes
     */
    async onDestroy() {
        // Override in subclass if needed
    }
    /**
     * Called after each experience is stored
     */
    async onStoreExperience(experience) {
        // Override in subclass if needed
    }
    /**
     * Called during save()
     */
    async onSave(path) {
        // Override in subclass if needed
    }
    /**
     * Called during load()
     */
    async onLoad(path) {
        // Override in subclass if needed
    }
    // Utility methods
    /**
     * Check if plugin is initialized
     */
    checkInitialized() {
        if (!this.initialized) {
            throw new Error(`Plugin ${this.name} not initialized. Call initialize() first.`);
        }
    }
    /**
     * Generate unique ID
     */
    generateId() {
        return `${this.name}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    }
    /**
     * Compute discounted returns for an episode
     */
    computeReturns(rewards, gamma) {
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
    computeReward(experience) {
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
