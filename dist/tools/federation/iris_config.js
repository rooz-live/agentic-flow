/**
 * Enterprise-Grade IRIS Bridge Configuration Management
 *
 * This module provides comprehensive configuration management for the IRIS bridge,
 * including environment variable support, config file loading, validation,
 * and runtime configuration updates.
 */
import { promises as fs, existsSync } from 'fs';
import * as path from 'path';
import { z } from 'zod';
// ============================================================================
// Configuration Schema Validation
// ============================================================================
const RetryConfigSchema = z.object({
    maxAttempts: z.number().min(1).max(10),
    baseDelayMs: z.number().min(100).max(60000),
    maxDelayMs: z.number().min(1000).max(300000),
    backoffMultiplier: z.number().min(1.1).max(5),
    jitter: z.boolean(),
});
const CircuitBreakerConfigSchema = z.object({
    failureThreshold: z.number().min(1).max(100),
    recoveryTimeoutMs: z.number().min(1000).max(600000),
    monitoringPeriodMs: z.number().min(1000).max(300000),
    halfOpenMaxCalls: z.number().min(1).max(20),
});
const PerformanceConfigSchema = z.object({
    enableMetrics: z.boolean(),
    enableTracing: z.boolean(),
    memoryThresholdMb: z.number().min(64).max(16384),
    executionTimeoutMs: z.number().min(1000).max(600000),
    enableResourceMonitoring: z.boolean(),
});
const ValidationConfigSchema = z.object({
    enableInputSanitization: z.boolean(),
    enableCommandWhitelist: z.boolean(),
    allowedCommands: z.array(z.string()),
    maxArgsLength: z.number().min(1).max(1000),
    enableOutputValidation: z.boolean(),
});
const ConcurrencyConfigSchema = z.object({
    maxConcurrentCommands: z.number().min(1).max(100),
    resourcePoolSize: z.number().min(1).max(200),
    queueTimeoutMs: z.number().min(1000).max(300000),
    enablePriorityQueue: z.boolean(),
});
const BridgeConfigSchema = z.object({
    retry: RetryConfigSchema,
    circuitBreaker: CircuitBreakerConfigSchema,
    performance: PerformanceConfigSchema,
    validation: ValidationConfigSchema,
    concurrency: ConcurrencyConfigSchema,
    enableEnterpriseFeatures: z.boolean(),
    logLevel: z.enum(['debug', 'info', 'warn', 'error']),
});
const EnvironmentConfigSchema = z.object({
    name: z.string(),
    type: z.enum(['development', 'staging', 'production']),
    features: z.object({
        circuitBreaker: z.boolean(),
        retry: z.boolean(),
        performance: z.boolean(),
        validation: z.boolean(),
        concurrency: z.boolean(),
    }),
    thresholds: z.object({
        maxExecutionTime: z.number(),
        maxMemoryUsage: z.number(),
        maxFailureRate: z.number(),
        minSuccessRate: z.number(),
    }),
    notifications: z.object({
        onFailure: z.boolean(),
        OnCircuitBreak: z.boolean(),
        OnPerformanceDegradation: z.boolean(),
    }),
});
const IntegrationConfigSchema = z.object({
    metrics: z.object({
        enabled: z.boolean(),
        endpoint: z.string().url().optional(),
        format: z.enum(['json', 'prometheus', 'custom']),
        batchSize: z.number().min(1).max(1000),
        flushInterval: z.number().min(1000).max(300000),
    }),
    tracing: z.object({
        enabled: z.boolean(),
        endpoint: z.string().url().optional(),
        samplingRate: z.number().min(0).max(1),
        includeArgs: z.boolean(),
        includeOutput: z.boolean(),
    }),
    logging: z.object({
        level: z.enum(['debug', 'info', 'warn', 'error']),
        format: z.enum(['json', 'text']),
        includeStackTrace: z.boolean(),
        maxLogSize: z.number().min(1000).max(10000000),
    }),
});
// ============================================================================
// Configuration Manager Class
// ============================================================================
export class IrisConfigManager {
    static instance;
    config;
    configPath;
    lastModified = null;
    watchers = [];
    constructor(configPath) {
        this.configPath = configPath || this.getDefaultConfigPath();
        this.config = { ...DEFAULT_IRIS_BRIDGE_CONFIG };
    }
    static getInstance(configPath) {
        if (!IrisConfigManager.instance) {
            IrisConfigManager.instance = new IrisConfigManager(configPath);
        }
        return IrisConfigManager.instance;
    }
    getDefaultConfigPath() {
        const envPath = process.env.IRIS_CONFIG_PATH;
        if (envPath) {
            return path.resolve(envPath);
        }
        const cwd = process.cwd();
        const possiblePaths = [
            path.join(cwd, 'config/iris/bridge.yaml'),
            path.join(cwd, 'config/iris/bridge.yml'),
            path.join(cwd, '.iris/bridge.yaml'),
            path.join(cwd, '.iris/bridge.yml'),
            path.join(cwd, 'iris-config.yaml'),
            path.join(cwd, 'iris-config.yml'),
        ];
        for (const possiblePath of possiblePaths) {
            if (existsSync(possiblePath)) {
                return possiblePath;
            }
        }
        return possiblePaths[0]; // Default to first option
    }
    async loadConfig() {
        try {
            const stats = await fs.stat(this.configPath);
            // Check if config file has been modified since last load
            if (this.lastModified && stats.mtimeMs <= this.lastModified) {
                return this.config;
            }
            const raw = await fs.readFile(this.configPath, 'utf-8');
            const yaml = await import('yaml');
            const parsed = yaml.parse(raw) || {};
            // Merge with environment variables
            const envOverrides = this.loadEnvironmentOverrides();
            const merged = this.mergeConfigurations(parsed, envOverrides);
            // Validate the merged configuration
            const validated = BridgeConfigSchema.parse(merged);
            this.config = validated;
            this.lastModified = stats.mtimeMs;
            this.notifyWatchers();
            return this.config;
        }
        catch (error) {
            console.warn(`[IrisConfigManager] Failed to load config from ${this.configPath}:`, error);
            console.warn('[IrisConfigManager] Using default configuration');
            return { ...DEFAULT_IRIS_BRIDGE_CONFIG };
        }
    }
    async saveConfig(config) {
        try {
            const merged = this.mergeConfigurations(this.config, config);
            const validated = BridgeConfigSchema.parse(merged);
            const yaml = await import('yaml');
            const yamlString = yaml.stringify(validated, { indent: 2 });
            // Ensure directory exists
            const dir = path.dirname(this.configPath);
            await fs.mkdir(dir, { recursive: true });
            await fs.writeFile(this.configPath, yamlString, 'utf-8');
            this.config = validated;
            this.lastModified = Date.now();
            this.notifyWatchers();
        }
        catch (error) {
            throw new Error(`Failed to save IRIS configuration: ${error instanceof Error ? error.message : error}`);
        }
    }
    getConfig() {
        return { ...this.config };
    }
    updateConfig(updates) {
        const merged = this.mergeConfigurations(this.config, updates);
        const validated = BridgeConfigSchema.parse(merged);
        this.config = validated;
        this.notifyWatchers();
    }
    watchConfig(callback) {
        this.watchers.push(callback);
        // Return unsubscribe function
        return () => {
            const index = this.watchers.indexOf(callback);
            if (index > -1) {
                this.watchers.splice(index, 1);
            }
        };
    }
    notifyWatchers() {
        this.watchers.forEach(callback => {
            try {
                callback(this.getConfig());
            }
            catch (error) {
                console.error('[IrisConfigManager] Error in config watcher:', error);
            }
        });
    }
    loadEnvironmentOverrides() {
        const overrides = {};
        // Retry configuration
        if (process.env.IRIS_RETRY_MAX_ATTEMPTS) {
            overrides.retry = {
                ...this.config.retry,
                maxAttempts: parseInt(process.env.IRIS_RETRY_MAX_ATTEMPTS, 10),
            };
        }
        if (process.env.IRIS_RETRY_BASE_DELAY_MS) {
            overrides.retry = {
                ...overrides.retry || this.config.retry,
                baseDelayMs: parseInt(process.env.IRIS_RETRY_BASE_DELAY_MS, 10),
            };
        }
        if (process.env.IRIS_RETRY_MAX_DELAY_MS) {
            overrides.retry = {
                ...overrides.retry || this.config.retry,
                maxDelayMs: parseInt(process.env.IRIS_RETRY_MAX_DELAY_MS, 10),
            };
        }
        if (process.env.IRIS_RETRY_BACKOFF_MULTIPLIER) {
            overrides.retry = {
                ...overrides.retry || this.config.retry,
                backoffMultiplier: parseFloat(process.env.IRIS_RETRY_BACKOFF_MULTIPLIER),
            };
        }
        if (process.env.IRIS_RETRY_JITTER) {
            overrides.retry = {
                ...overrides.retry || this.config.retry,
                jitter: process.env.IRIS_RETRY_JITTER === '1' || process.env.IRIS_RETRY_JITTER === 'true',
            };
        }
        // Circuit breaker configuration
        if (process.env.IRIS_CIRCUIT_BREAKER_FAILURE_THRESHOLD) {
            overrides.circuitBreaker = {
                ...this.config.circuitBreaker,
                failureThreshold: parseInt(process.env.IRIS_CIRCUIT_BREAKER_FAILURE_THRESHOLD, 10),
            };
        }
        if (process.env.IRIS_CIRCUIT_BREAKER_RECOVERY_TIMEOUT_MS) {
            overrides.circuitBreaker = {
                ...overrides.circuitBreaker || this.config.circuitBreaker,
                recoveryTimeoutMs: parseInt(process.env.IRIS_CIRCUIT_BREAKER_RECOVERY_TIMEOUT_MS, 10),
            };
        }
        if (process.env.IRIS_CIRCUIT_BREAKER_MONITORING_PERIOD_MS) {
            overrides.circuitBreaker = {
                ...overrides.circuitBreaker || this.config.circuitBreaker,
                monitoringPeriodMs: parseInt(process.env.IRIS_CIRCUIT_BREAKER_MONITORING_PERIOD_MS, 10),
            };
        }
        // Performance configuration
        if (process.env.IRIS_PERFORMANCE_ENABLE_METRICS) {
            overrides.performance = {
                ...this.config.performance,
                enableMetrics: process.env.IRIS_PERFORMANCE_ENABLE_METRICS === '1' || process.env.IRIS_PERFORMANCE_ENABLE_METRICS === 'true',
            };
        }
        if (process.env.IRIS_PERFORMANCE_ENABLE_TRACING) {
            overrides.performance = {
                ...overrides.performance || this.config.performance,
                enableTracing: process.env.IRIS_PERFORMANCE_ENABLE_TRACING === '1' || process.env.IRIS_PERFORMANCE_ENABLE_TRACING === 'true',
            };
        }
        if (process.env.IRIS_PERFORMANCE_MEMORY_THRESHOLD_MB) {
            overrides.performance = {
                ...overrides.performance || this.config.performance,
                memoryThresholdMb: parseInt(process.env.IRIS_PERFORMANCE_MEMORY_THRESHOLD_MB, 10),
            };
        }
        if (process.env.IRIS_PERFORMANCE_EXECUTION_TIMEOUT_MS) {
            overrides.performance = {
                ...overrides.performance || this.config.performance,
                executionTimeoutMs: parseInt(process.env.IRIS_PERFORMANCE_EXECUTION_TIMEOUT_MS, 10),
            };
        }
        // Validation configuration
        if (process.env.IRIS_VALIDATION_ENABLE_INPUT_SANITIZATION) {
            overrides.validation = {
                ...this.config.validation,
                enableInputSanitization: process.env.IRIS_VALIDATION_ENABLE_INPUT_SANITIZATION === '1' || process.env.IRIS_VALIDATION_ENABLE_INPUT_SANITIZATION === 'true',
            };
        }
        if (process.env.IRIS_VALIDATION_ENABLE_COMMAND_WHITELIST) {
            overrides.validation = {
                ...overrides.validation || this.config.validation,
                enableCommandWhitelist: process.env.IRIS_VALIDATION_ENABLE_COMMAND_WHITELIST === '1' || process.env.IRIS_VALIDATION_ENABLE_COMMAND_WHITELIST === 'true',
            };
        }
        if (process.env.IRIS_VALIDATION_MAX_ARGS_LENGTH) {
            overrides.validation = {
                ...overrides.validation || this.config.validation,
                maxArgsLength: parseInt(process.env.IRIS_VALIDATION_MAX_ARGS_LENGTH, 10),
            };
        }
        // Concurrency configuration
        if (process.env.IRIS_CONCURRENCY_MAX_CONCURRENT_COMMANDS) {
            overrides.concurrency = {
                ...this.config.concurrency,
                maxConcurrentCommands: parseInt(process.env.IRIS_CONCURRENCY_MAX_CONCURRENT_COMMANDS, 10),
            };
        }
        if (process.env.IRIS_CONCURRENCY_RESOURCE_POOL_SIZE) {
            overrides.concurrency = {
                ...overrides.concurrency || this.config.concurrency,
                resourcePoolSize: parseInt(process.env.IRIS_CONCURRENCY_RESOURCE_POOL_SIZE, 10),
            };
        }
        if (process.env.IRIS_CONCURRENCY_QUEUE_TIMEOUT_MS) {
            overrides.concurrency = {
                ...overrides.concurrency || this.config.concurrency,
                queueTimeoutMs: parseInt(process.env.IRIS_CONCURRENCY_QUEUE_TIMEOUT_MS, 10),
            };
        }
        // General configuration
        if (process.env.IRIS_ENABLE_ENTERPRISE_FEATURES) {
            overrides.enableEnterpriseFeatures = process.env.IRIS_ENABLE_ENTERPRISE_FEATURES === '1' || process.env.IRIS_ENABLE_ENTERPRISE_FEATURES === 'true';
        }
        if (process.env.IRIS_LOG_LEVEL) {
            const logLevel = process.env.IRIS_LOG_LEVEL.toLowerCase();
            if (['debug', 'info', 'warn', 'error'].includes(logLevel)) {
                overrides.logLevel = logLevel;
            }
        }
        return overrides;
    }
    mergeConfigurations(base, override) {
        return {
            retry: { ...base.retry, ...override.retry },
            circuitBreaker: { ...base.circuitBreaker, ...override.circuitBreaker },
            performance: { ...base.performance, ...override.performance },
            validation: { ...base.validation, ...override.validation },
            concurrency: { ...base.concurrency, ...override.concurrency },
            enableEnterpriseFeatures: override.enableEnterpriseFeatures ?? base.enableEnterpriseFeatures,
            logLevel: override.logLevel ?? base.logLevel,
        };
    }
    // ============================================================================
    // Environment-Specific Configuration
    // ============================================================================
    async loadEnvironmentConfig(environmentName) {
        const env = environmentName || process.env.IRIS_ENVIRONMENT || process.env.NODE_ENV || 'development';
        const configPath = this.getEnvironmentConfigPath(env);
        try {
            const raw = await fs.readFile(configPath, 'utf-8');
            const yaml = await import('yaml');
            const parsed = yaml.parse(raw) || {};
            return EnvironmentConfigSchema.parse({ ...parsed, name: env });
        }
        catch (error) {
            console.warn(`[IrisConfigManager] Failed to load environment config for ${env}:`, error);
            return this.getDefaultEnvironmentConfig(env);
        }
    }
    getEnvironmentConfigPath(environment) {
        const cwd = process.cwd();
        return path.join(cwd, 'config', 'iris', `environments`, `${environment}.yaml`);
    }
    getDefaultEnvironmentConfig(environment) {
        return {
            name: environment,
            type: environment === 'production' ? 'production' : environment === 'staging' ? 'staging' : 'development',
            features: {
                circuitBreaker: true,
                retry: true,
                performance: true,
                validation: true,
                concurrency: true,
            },
            thresholds: {
                maxExecutionTime: 120000,
                maxMemoryUsage: 1024,
                maxFailureRate: 0.1,
                minSuccessRate: 0.9,
            },
            notifications: {
                onFailure: true,
                OnCircuitBreak: true,
                OnPerformanceDegradation: true,
            },
        };
    }
    // ============================================================================
    // Integration Configuration
    // ============================================================================
    async loadIntegrationConfig() {
        const configPath = this.getIntegrationConfigPath();
        try {
            const raw = await fs.readFile(configPath, 'utf-8');
            const yaml = await import('yaml');
            const parsed = yaml.parse(raw) || {};
            return IntegrationConfigSchema.parse(parsed);
        }
        catch (error) {
            console.warn('[IrisConfigManager] Failed to load integration config:', error);
            return this.getDefaultIntegrationConfig();
        }
    }
    getIntegrationConfigPath() {
        const cwd = process.cwd();
        return path.join(cwd, 'config', 'iris', 'integration.yaml');
    }
    getDefaultIntegrationConfig() {
        return {
            metrics: {
                enabled: true,
                format: 'json',
                batchSize: 100,
                flushInterval: 10000,
            },
            tracing: {
                enabled: true,
                samplingRate: 0.1,
                includeArgs: false,
                includeOutput: false,
            },
            logging: {
                level: 'info',
                format: 'json',
                includeStackTrace: true,
                maxLogSize: 100000,
            },
        };
    }
    // ============================================================================
    // Configuration Validation
    // ============================================================================
    validateConfig(config) {
        try {
            const merged = this.mergeConfigurations(this.config, config);
            BridgeConfigSchema.parse(merged);
            return { valid: true, errors: [] };
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                return {
                    valid: false,
                    errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
                };
            }
            return {
                valid: false,
                errors: [error instanceof Error ? error.message : 'Unknown validation error'],
            };
        }
    }
    // ============================================================================
    // Configuration Export/Import
    // ============================================================================
    async exportConfig(format = 'yaml') {
        const config = this.getConfig();
        if (format === 'json') {
            return JSON.stringify(config, null, 2);
        }
        else {
            const yaml = await import('yaml');
            return yaml.stringify(config, { indent: 2 });
        }
    }
    async importConfig(configString, format = 'yaml') {
        try {
            let parsed;
            if (format === 'json') {
                parsed = JSON.parse(configString);
            }
            else {
                const yaml = await import('yaml');
                parsed = yaml.parse(configString);
            }
            await this.saveConfig(parsed);
        }
        catch (error) {
            throw new Error(`Failed to import configuration: ${error instanceof Error ? error.message : error}`);
        }
    }
}
// ============================================================================
// Utility Functions
// ============================================================================
export function createIrisConfigManager(configPath) {
    return IrisConfigManager.getInstance(configPath);
}
export async function loadIrisConfig(configPath) {
    const manager = IrisConfigManager.getInstance(configPath);
    return manager.loadConfig();
}
export function getIrisConfig() {
    const manager = IrisConfigManager.getInstance();
    return manager.getConfig();
}
export function updateIrisConfig(updates) {
    const manager = IrisConfigManager.getInstance();
    manager.updateConfig(updates);
}
export function watchIrisConfig(callback) {
    const manager = IrisConfigManager.getInstance();
    return manager.watchConfig(callback);
}
//# sourceMappingURL=iris_config.js.map