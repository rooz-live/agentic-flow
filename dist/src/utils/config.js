/**
 * Configuration Management
 * Centralized configuration for the medical analysis system
 */
/**
 * Default system configuration
 */
export const DEFAULT_CONFIG = {
    antiHallucination: {
        minimumConfidence: 0.70,
        requireProviderReviewThreshold: 0.75,
        autoApproveThreshold: 0.90,
        enableContradictionDetection: true,
        enableCitationVerification: true,
        knowledgeBaseSources: [
            'PubMed',
            'Mayo Clinic',
            'UpToDate',
            'NEJM',
            'The Lancet'
        ]
    },
    providers: {
        notificationEnabled: true,
        autoAssignProvider: true,
        requiredForHighRisk: true,
        responseTimeoutMinutes: 60
    },
    api: {
        port: parseInt(process.env.PORT || '3000'),
        enableWebSocket: true,
        rateLimitPerMinute: 100,
        requireAuthentication: process.env.NODE_ENV !== 'development',
        maxConcurrentAnalyses: 50
    },
    learning: {
        enablePatternLearning: true,
        agentDbPath: process.env.AGENTDB_PATH || './data/medical-learning.db',
        minimumPatternFrequency: 3,
        retrainIntervalHours: 24
    }
};
/**
 * Configuration manager
 */
export class ConfigManager {
    config;
    constructor(customConfig) {
        this.config = {
            ...DEFAULT_CONFIG,
            ...customConfig
        };
    }
    /**
     * Get configuration
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * Update configuration
     */
    updateConfig(updates) {
        this.config = {
            ...this.config,
            ...updates
        };
    }
    /**
     * Get anti-hallucination config
     */
    getAntiHallucinationConfig() {
        return this.config.antiHallucination;
    }
    /**
     * Get provider config
     */
    getProviderConfig() {
        return this.config.providers;
    }
    /**
     * Get API config
     */
    getApiConfig() {
        return this.config.api;
    }
    /**
     * Get learning config
     */
    getLearningConfig() {
        return this.config.learning;
    }
    /**
     * Validate configuration
     */
    validate() {
        const errors = [];
        // Validate anti-hallucination config
        if (this.config.antiHallucination.minimumConfidence < 0 ||
            this.config.antiHallucination.minimumConfidence > 1) {
            errors.push('minimumConfidence must be between 0 and 1');
        }
        if (this.config.antiHallucination.requireProviderReviewThreshold <
            this.config.antiHallucination.minimumConfidence) {
            errors.push('requireProviderReviewThreshold must be >= minimumConfidence');
        }
        // Validate API config
        if (this.config.api.port < 1 || this.config.api.port > 65535) {
            errors.push('port must be between 1 and 65535');
        }
        if (this.config.api.rateLimitPerMinute < 1) {
            errors.push('rateLimitPerMinute must be positive');
        }
        // Validate learning config
        if (this.config.learning.minimumPatternFrequency < 1) {
            errors.push('minimumPatternFrequency must be positive');
        }
        if (errors.length > 0) {
            console.error('Configuration validation errors:', errors);
            return false;
        }
        return true;
    }
    /**
     * Load configuration from file
     */
    static async loadFromFile(path) {
        try {
            const fs = await import('fs/promises');
            const content = await fs.readFile(path, 'utf-8');
            const config = JSON.parse(content);
            return new ConfigManager(config);
        }
        catch (error) {
            console.error('Error loading config from file:', error);
            return new ConfigManager();
        }
    }
    /**
     * Save configuration to file
     */
    async saveToFile(path) {
        try {
            const fs = await import('fs/promises');
            await fs.writeFile(path, JSON.stringify(this.config, null, 2));
        }
        catch (error) {
            console.error('Error saving config to file:', error);
            throw error;
        }
    }
    /**
     * Export configuration as JSON
     */
    toJSON() {
        return JSON.stringify(this.config, null, 2);
    }
    /**
     * Load from environment variables
     */
    static fromEnvironment() {
        const config = {};
        // Anti-hallucination settings
        if (process.env.MIN_CONFIDENCE) {
            config.antiHallucination = {
                ...DEFAULT_CONFIG.antiHallucination,
                minimumConfidence: parseFloat(process.env.MIN_CONFIDENCE)
            };
        }
        // API settings
        if (process.env.PORT || process.env.API_PORT) {
            config.api = {
                ...DEFAULT_CONFIG.api,
                port: parseInt(process.env.PORT || process.env.API_PORT || '3000')
            };
        }
        // Learning settings
        if (process.env.AGENTDB_PATH) {
            config.learning = {
                ...DEFAULT_CONFIG.learning,
                agentDbPath: process.env.AGENTDB_PATH
            };
        }
        return new ConfigManager(config);
    }
}
// Export singleton instance
export const config = ConfigManager.fromEnvironment();
//# sourceMappingURL=config.js.map