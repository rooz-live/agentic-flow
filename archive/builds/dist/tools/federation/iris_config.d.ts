/**
 * Enterprise-Grade IRIS Bridge Configuration Management
 *
 * This module provides comprehensive configuration management for the IRIS bridge,
 * including environment variable support, config file loading, validation,
 * and runtime configuration updates.
 */
import type { IrisBridgeConfig, IrisEnvironmentConfig, IrisIntegrationConfig } from './iris_types.js';
export declare class IrisConfigManager {
    private static instance;
    private config;
    private configPath;
    private lastModified;
    private watchers;
    private constructor();
    static getInstance(configPath?: string): IrisConfigManager;
    private getDefaultConfigPath;
    loadConfig(): Promise<IrisBridgeConfig>;
    saveConfig(config: Partial<IrisBridgeConfig>): Promise<void>;
    getConfig(): IrisBridgeConfig;
    updateConfig(updates: Partial<IrisBridgeConfig>): void;
    watchConfig(callback: (config: IrisBridgeConfig) => void): () => void;
    private notifyWatchers;
    private loadEnvironmentOverrides;
    private mergeConfigurations;
    loadEnvironmentConfig(environmentName?: string): Promise<IrisEnvironmentConfig>;
    private getEnvironmentConfigPath;
    private getDefaultEnvironmentConfig;
    loadIntegrationConfig(): Promise<IrisIntegrationConfig>;
    private getIntegrationConfigPath;
    private getDefaultIntegrationConfig;
    validateConfig(config: Partial<IrisBridgeConfig>): {
        valid: boolean;
        errors: string[];
    };
    exportConfig(format?: 'yaml' | 'json'): Promise<string>;
    importConfig(configString: string, format?: 'yaml' | 'json'): Promise<void>;
}
export declare function createIrisConfigManager(configPath?: string): IrisConfigManager;
export declare function loadIrisConfig(configPath?: string): Promise<IrisBridgeConfig>;
export declare function getIrisConfig(): IrisBridgeConfig;
export declare function updateIrisConfig(updates: Partial<IrisBridgeConfig>): void;
export declare function watchIrisConfig(callback: (config: IrisBridgeConfig) => void): () => void;
//# sourceMappingURL=iris_config.d.ts.map