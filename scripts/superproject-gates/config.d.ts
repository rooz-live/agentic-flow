/**
 * ONNX LLM Proxy Configuration Loader
 *
 * Loads and validates configuration from environment variables and config files.
 * Provides secure defaults and configuration merging for agentic-flow@alpha.
 */
import { EventEmitter } from 'events';
import type { ONNXLLMProxyConfig, ONNXModelConfig, InferenceEndpointConfig, ConnectionPoolConfig, RequestRoutingConfig, TimeoutRetryConfig, LoggingConfig, MonitoringConfig, AgenticWorkflowConfig } from './types.js';
/**
 * Default connection pool configuration
 */
export declare const DEFAULT_CONNECTION_POOL: ConnectionPoolConfig;
/**
 * Default request routing configuration
 */
export declare const DEFAULT_ROUTING: RequestRoutingConfig;
/**
 * Default timeout and retry configuration
 */
export declare const DEFAULT_TIMEOUT_RETRY: TimeoutRetryConfig;
/**
 * Default logging configuration
 */
export declare const DEFAULT_LOGGING: LoggingConfig;
/**
 * Default monitoring configuration
 */
export declare const DEFAULT_MONITORING: MonitoringConfig;
/**
 * Default agentic workflow configuration
 */
export declare const DEFAULT_AGENTIC_WORKFLOW: AgenticWorkflowConfig;
/**
 * Configuration loader and manager for ONNX LLM Proxy
 */
export declare class ONNXProxyConfigLoader extends EventEmitter {
    private config;
    private configFilePath?;
    private watchInterval?;
    constructor(configFilePath?: string);
    /**
     * Load default configuration
     */
    private loadDefaultConfig;
    /**
     * Get environment from NODE_ENV
     */
    private getEnvironment;
    /**
     * Load configuration from environment variables
     */
    loadFromEnvironment(): void;
    /**
     * Parse model paths from environment variable
     */
    private parseModelPaths;
    /**
     * Parse endpoint URLs from environment variable
     */
    private parseEndpointUrls;
    /**
     * Get environment variable as string
     */
    private getEnvString;
    /**
     * Get environment variable as integer
     */
    private getEnvInt;
    /**
     * Get environment variable as float
     */
    private getEnvFloat;
    /**
     * Get environment variable as boolean
     */
    private getEnvBool;
    /**
     * Add a model configuration
     */
    addModel(model: ONNXModelConfig): void;
    /**
     * Add an endpoint configuration
     */
    addEndpoint(endpoint: InferenceEndpointConfig): void;
    /**
     * Get the current configuration
     */
    getConfig(): ONNXLLMProxyConfig;
    /**
     * Get a specific model configuration
     */
    getModel(modelId: string): ONNXModelConfig | undefined;
    /**
     * Get a specific endpoint configuration
     */
    getEndpoint(endpointId: string): InferenceEndpointConfig | undefined;
    /**
     * Get active endpoints
     */
    getActiveEndpoints(): InferenceEndpointConfig[];
    /**
     * Validate the configuration
     */
    validate(): {
        valid: boolean;
        errors: string[];
    };
    /**
     * Export configuration to JSON
     */
    exportToJSON(): string;
    /**
     * Import configuration from JSON
     */
    importFromJSON(json: string): void;
    /**
     * Start watching for configuration changes
     */
    startConfigWatch(intervalMs?: number): void;
    /**
     * Stop watching for configuration changes
     */
    stopConfigWatch(): void;
}
export declare function getConfigLoader(configFilePath?: string): ONNXProxyConfigLoader;
export declare function resetConfigLoader(): void;
//# sourceMappingURL=config.d.ts.map