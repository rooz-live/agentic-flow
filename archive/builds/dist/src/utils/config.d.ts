/**
 * Configuration Management
 * Centralized configuration for the medical analysis system
 */
import type { SystemConfig } from '../types/medical.types';
/**
 * Default system configuration
 */
export declare const DEFAULT_CONFIG: SystemConfig;
/**
 * Configuration manager
 */
export declare class ConfigManager {
    private config;
    constructor(customConfig?: Partial<SystemConfig>);
    /**
     * Get configuration
     */
    getConfig(): SystemConfig;
    /**
     * Update configuration
     */
    updateConfig(updates: Partial<SystemConfig>): void;
    /**
     * Get anti-hallucination config
     */
    getAntiHallucinationConfig(): import("../types/medical.types").AntiHallucinationConfig;
    /**
     * Get provider config
     */
    getProviderConfig(): import("../types/medical.types").ProviderConfig;
    /**
     * Get API config
     */
    getApiConfig(): import("../types/medical.types").ApiConfig;
    /**
     * Get learning config
     */
    getLearningConfig(): import("../types/medical.types").LearningConfig;
    /**
     * Validate configuration
     */
    validate(): boolean;
    /**
     * Load configuration from file
     */
    static loadFromFile(path: string): Promise<ConfigManager>;
    /**
     * Save configuration to file
     */
    saveToFile(path: string): Promise<void>;
    /**
     * Export configuration as JSON
     */
    toJSON(): string;
    /**
     * Load from environment variables
     */
    static fromEnvironment(): ConfigManager;
}
export declare const config: ConfigManager;
//# sourceMappingURL=config.d.ts.map