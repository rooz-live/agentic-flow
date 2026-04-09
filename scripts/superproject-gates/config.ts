/**
 * ONNX LLM Proxy Configuration Loader
 * 
 * Loads and validates configuration from environment variables and config files.
 * Provides secure defaults and configuration merging for agentic-flow@alpha.
 */

import { EventEmitter } from 'events';
import type {
  ONNXLLMProxyConfig,
  ONNXModelConfig,
  InferenceEndpointConfig,
  ConnectionPoolConfig,
  RequestRoutingConfig,
  TimeoutRetryConfig,
  LoggingConfig,
  MonitoringConfig,
  AgenticWorkflowConfig
} from './types.js';

/**
 * Environment variable prefix for ONNX proxy configuration
 */
const ENV_PREFIX = 'ONNX_LLM_PROXY_';

/**
 * Default connection pool configuration
 */
export const DEFAULT_CONNECTION_POOL: ConnectionPoolConfig = {
  minConnections: 2,
  maxConnections: 10,
  acquireTimeoutMs: 30000,
  idleTimeoutMs: 60000,
  validationIntervalMs: 30000,
  enableKeepalive: true,
  keepaliveIntervalMs: 30000,
  maxLifetimeMs: 3600000, // 1 hour
  retryAttempts: 3,
  retryDelayMs: 1000,
  retryBackoffMultiplier: 2
};

/**
 * Default request routing configuration
 */
export const DEFAULT_ROUTING: RequestRoutingConfig = {
  strategy: 'round-robin',
  affinityTimeoutMs: 300000, // 5 minutes
  enableDeduplication: true,
  deduplicationWindowMs: 1000,
  priorityLevels: {
    critical: 0,
    high: 1,
    normal: 2,
    low: 3
  },
  maxQueueSize: 1000,
  queueTimeoutMs: 30000,
  circuitBreaker: {
    enabled: true,
    failureThreshold: 5,
    successThreshold: 3,
    halfOpenMaxRequests: 3,
    resetTimeoutMs: 30000
  }
};

/**
 * Default timeout and retry configuration
 */
export const DEFAULT_TIMEOUT_RETRY: TimeoutRetryConfig = {
  requestTimeoutMs: 60000,
  connectionTimeoutMs: 10000,
  readTimeoutMs: 60000,
  writeTimeoutMs: 30000,
  maxRetries: 3,
  retryDelayMs: 1000,
  maxRetryDelayMs: 30000,
  retryBackoff: 'exponential',
  jitterFactor: 0.2,
  retryableErrors: [
    'ECONNRESET',
    'ETIMEDOUT',
    'ECONNREFUSED',
    'EPIPE',
    'NETWORK_ERROR',
    'SERVICE_UNAVAILABLE',
    'RATE_LIMITED'
  ],
  nonRetryableErrors: [
    'INVALID_INPUT',
    'UNAUTHORIZED',
    'FORBIDDEN',
    'MODEL_NOT_FOUND',
    'VALIDATION_ERROR'
  ]
};

/**
 * Default logging configuration
 */
export const DEFAULT_LOGGING: LoggingConfig = {
  enableRequestLogging: true,
  enablePerformanceLogging: true,
  enableInferenceLogging: false, // Disabled by default for performance
  logLevel: 'info',
  logFormat: 'json',
  maxLogLength: 10000,
  redactFields: [
    'authorization',
    'api_key',
    'token',
    'password',
    'secret',
    'credential'
  ],
  enableRequestIdTracking: true,
  correlationIdHeader: 'x-correlation-id'
};

/**
 * Default monitoring configuration
 */
export const DEFAULT_MONITORING: MonitoringConfig = {
  enableMetrics: true,
  metricsIntervalMs: 60000,
  metricsEndpoint: '/metrics',
  enableTracing: true,
  tracingSampleRate: 0.1, // 10% sampling
  metricTags: {
    service: 'onnx-llm-proxy',
    version: '1.0.0-alpha'
  },
  healthCheckIntervalMs: 30000,
  alertThresholds: {
    latencyP99Ms: 5000,
    errorRatePercent: 5,
    queueDepth: 500,
    connectionPoolUtilization: 90
  }
};

/**
 * Default agentic workflow configuration
 */
export const DEFAULT_AGENTIC_WORKFLOW: AgenticWorkflowConfig = {
  enablePDACycle: true,
  enableInterpretability: true,
  evidenceEmission: {
    enabled: true,
    emitterName: 'onnx-llm-proxy',
    category: 'Inference'
  },
  roleModelMappings: {
    analyst: 'default-reasoning',
    assessor: 'default-classification',
    innovator: 'default-generation',
    intuitive: 'default-reasoning',
    orchestrator: 'default-reasoning',
    seeker: 'default-embedding'
  },
  contextManagement: {
    maxTokens: 4096,
    truncationStrategy: 'tail',
    enableContextCaching: true,
    cacheTTLMs: 300000 // 5 minutes
  }
};

/**
 * Configuration loader and manager for ONNX LLM Proxy
 */
export class ONNXProxyConfigLoader extends EventEmitter {
  private config: ONNXLLMProxyConfig;
  private configFilePath?: string;
  private watchInterval?: ReturnType<typeof setInterval>;

  constructor(configFilePath?: string) {
    super();
    this.configFilePath = configFilePath;
    this.config = this.loadDefaultConfig();
  }

  /**
   * Load default configuration
   */
  private loadDefaultConfig(): ONNXLLMProxyConfig {
    return {
      version: '1.0.0-alpha',
      environment: this.getEnvironment(),
      models: [],
      endpoints: [],
      connectionPool: { ...DEFAULT_CONNECTION_POOL },
      routing: { ...DEFAULT_ROUTING },
      timeoutRetry: { ...DEFAULT_TIMEOUT_RETRY },
      logging: { ...DEFAULT_LOGGING },
      monitoring: { ...DEFAULT_MONITORING },
      agenticWorkflow: { ...DEFAULT_AGENTIC_WORKFLOW }
    };
  }

  /**
   * Get environment from NODE_ENV
   */
  private getEnvironment(): 'development' | 'staging' | 'production' {
    const env = process.env.NODE_ENV?.toLowerCase();
    if (env === 'production' || env === 'prod') return 'production';
    if (env === 'staging' || env === 'stage') return 'staging';
    return 'development';
  }

  /**
   * Load configuration from environment variables
   */
  public loadFromEnvironment(): void {
    console.log('[ONNX-PROXY-CONFIG] Loading configuration from environment variables');

    // Connection Pool
    this.config.connectionPool.minConnections = this.getEnvInt('CONNECTION_POOL_MIN', DEFAULT_CONNECTION_POOL.minConnections);
    this.config.connectionPool.maxConnections = this.getEnvInt('CONNECTION_POOL_MAX', DEFAULT_CONNECTION_POOL.maxConnections);
    this.config.connectionPool.acquireTimeoutMs = this.getEnvInt('CONNECTION_POOL_ACQUIRE_TIMEOUT_MS', DEFAULT_CONNECTION_POOL.acquireTimeoutMs);
    this.config.connectionPool.idleTimeoutMs = this.getEnvInt('CONNECTION_POOL_IDLE_TIMEOUT_MS', DEFAULT_CONNECTION_POOL.idleTimeoutMs);
    this.config.connectionPool.enableKeepalive = this.getEnvBool('CONNECTION_POOL_KEEPALIVE', DEFAULT_CONNECTION_POOL.enableKeepalive);
    this.config.connectionPool.retryAttempts = this.getEnvInt('CONNECTION_POOL_RETRY_ATTEMPTS', DEFAULT_CONNECTION_POOL.retryAttempts);

    // Timeout and Retry
    this.config.timeoutRetry.requestTimeoutMs = this.getEnvInt('REQUEST_TIMEOUT_MS', DEFAULT_TIMEOUT_RETRY.requestTimeoutMs);
    this.config.timeoutRetry.connectionTimeoutMs = this.getEnvInt('CONNECTION_TIMEOUT_MS', DEFAULT_TIMEOUT_RETRY.connectionTimeoutMs);
    this.config.timeoutRetry.readTimeoutMs = this.getEnvInt('READ_TIMEOUT_MS', DEFAULT_TIMEOUT_RETRY.readTimeoutMs);
    this.config.timeoutRetry.writeTimeoutMs = this.getEnvInt('WRITE_TIMEOUT_MS', DEFAULT_TIMEOUT_RETRY.writeTimeoutMs);
    this.config.timeoutRetry.maxRetries = this.getEnvInt('MAX_RETRIES', DEFAULT_TIMEOUT_RETRY.maxRetries);
    this.config.timeoutRetry.retryDelayMs = this.getEnvInt('RETRY_DELAY_MS', DEFAULT_TIMEOUT_RETRY.retryDelayMs);

    // Routing
    const routingStrategy = this.getEnvString('ROUTING_STRATEGY', DEFAULT_ROUTING.strategy);
    if (['round-robin', 'weighted', 'least-connections', 'latency-based', 'affinity'].includes(routingStrategy)) {
      this.config.routing.strategy = routingStrategy as RequestRoutingConfig['strategy'];
    }
    this.config.routing.maxQueueSize = this.getEnvInt('MAX_QUEUE_SIZE', DEFAULT_ROUTING.maxQueueSize);
    this.config.routing.queueTimeoutMs = this.getEnvInt('QUEUE_TIMEOUT_MS', DEFAULT_ROUTING.queueTimeoutMs);
    this.config.routing.circuitBreaker.enabled = this.getEnvBool('CIRCUIT_BREAKER_ENABLED', DEFAULT_ROUTING.circuitBreaker.enabled);
    this.config.routing.circuitBreaker.failureThreshold = this.getEnvInt('CIRCUIT_BREAKER_FAILURE_THRESHOLD', DEFAULT_ROUTING.circuitBreaker.failureThreshold);

    // Logging
    const logLevel = this.getEnvString('LOG_LEVEL', DEFAULT_LOGGING.logLevel);
    if (['debug', 'info', 'warn', 'error'].includes(logLevel)) {
      this.config.logging.logLevel = logLevel as LoggingConfig['logLevel'];
    }
    this.config.logging.enableRequestLogging = this.getEnvBool('ENABLE_REQUEST_LOGGING', DEFAULT_LOGGING.enableRequestLogging);
    this.config.logging.enablePerformanceLogging = this.getEnvBool('ENABLE_PERFORMANCE_LOGGING', DEFAULT_LOGGING.enablePerformanceLogging);
    this.config.logging.enableInferenceLogging = this.getEnvBool('ENABLE_INFERENCE_LOGGING', DEFAULT_LOGGING.enableInferenceLogging);

    // Monitoring
    this.config.monitoring.enableMetrics = this.getEnvBool('ENABLE_METRICS', DEFAULT_MONITORING.enableMetrics);
    this.config.monitoring.enableTracing = this.getEnvBool('ENABLE_TRACING', DEFAULT_MONITORING.enableTracing);
    this.config.monitoring.tracingSampleRate = this.getEnvFloat('TRACING_SAMPLE_RATE', DEFAULT_MONITORING.tracingSampleRate);
    this.config.monitoring.healthCheckIntervalMs = this.getEnvInt('HEALTH_CHECK_INTERVAL_MS', DEFAULT_MONITORING.healthCheckIntervalMs);

    // Alert Thresholds
    this.config.monitoring.alertThresholds.latencyP99Ms = this.getEnvInt('ALERT_LATENCY_P99_MS', DEFAULT_MONITORING.alertThresholds.latencyP99Ms);
    this.config.monitoring.alertThresholds.errorRatePercent = this.getEnvFloat('ALERT_ERROR_RATE_PERCENT', DEFAULT_MONITORING.alertThresholds.errorRatePercent);
    this.config.monitoring.alertThresholds.queueDepth = this.getEnvInt('ALERT_QUEUE_DEPTH', DEFAULT_MONITORING.alertThresholds.queueDepth);

    // Agentic Workflow
    this.config.agenticWorkflow.enablePDACycle = this.getEnvBool('ENABLE_PDA_CYCLE', DEFAULT_AGENTIC_WORKFLOW.enablePDACycle);
    this.config.agenticWorkflow.enableInterpretability = this.getEnvBool('ENABLE_INTERPRETABILITY', DEFAULT_AGENTIC_WORKFLOW.enableInterpretability);
    this.config.agenticWorkflow.contextManagement.maxTokens = this.getEnvInt('CONTEXT_MAX_TOKENS', DEFAULT_AGENTIC_WORKFLOW.contextManagement.maxTokens);
    this.config.agenticWorkflow.contextManagement.enableContextCaching = this.getEnvBool('ENABLE_CONTEXT_CACHING', DEFAULT_AGENTIC_WORKFLOW.contextManagement.enableContextCaching);

    // Model paths (comma-separated list)
    const modelPaths = this.getEnvString('MODEL_PATHS', '');
    if (modelPaths) {
      this.parseModelPaths(modelPaths);
    }

    // Endpoint URLs (comma-separated list)
    const endpointUrls = this.getEnvString('ENDPOINT_URLS', '');
    if (endpointUrls) {
      this.parseEndpointUrls(endpointUrls);
    }

    console.log('[ONNX-PROXY-CONFIG] Configuration loaded from environment');
    this.emit('configLoaded', this.config);
  }

  /**
   * Parse model paths from environment variable
   */
  private parseModelPaths(modelPathsStr: string): void {
    const paths = modelPathsStr.split(',').map(p => p.trim()).filter(p => p);
    
    for (let i = 0; i < paths.length; i++) {
      const path = paths[i];
      const modelId = `model-${i + 1}`;
      
      const model: ONNXModelConfig = {
        modelId,
        modelName: `Model ${i + 1}`,
        modelPath: path,
        version: '1.0.0',
        modelType: 'text-generation',
        maxSequenceLength: 4096,
        inputNames: ['input_ids', 'attention_mask'],
        outputNames: ['logits'],
        supportsBatching: true,
        maxBatchSize: 8,
        quantization: 'fp16'
      };

      // Check for model-specific env vars
      const modelEnvPrefix = `MODEL_${i + 1}_`;
      model.modelName = this.getEnvString(`${modelEnvPrefix}NAME`, model.modelName);
      model.version = this.getEnvString(`${modelEnvPrefix}VERSION`, model.version);
      const modelType = this.getEnvString(`${modelEnvPrefix}TYPE`, model.modelType);
      if (['text-generation', 'text-embedding', 'classification', 'reasoning', 'custom'].includes(modelType)) {
        model.modelType = modelType as ONNXModelConfig['modelType'];
      }
      model.maxSequenceLength = this.getEnvInt(`${modelEnvPrefix}MAX_SEQ_LENGTH`, model.maxSequenceLength);
      model.maxBatchSize = this.getEnvInt(`${modelEnvPrefix}MAX_BATCH_SIZE`, model.maxBatchSize);

      this.config.models.push(model);
    }
  }

  /**
   * Parse endpoint URLs from environment variable
   */
  private parseEndpointUrls(endpointUrlsStr: string): void {
    const urls = endpointUrlsStr.split(',').map(u => u.trim()).filter(u => u);
    
    for (let i = 0; i < urls.length; i++) {
      const url = new URL(urls[i]);
      const endpointId = `endpoint-${i + 1}`;
      
      const endpoint: InferenceEndpointConfig = {
        endpointId,
        url: url.origin,
        protocol: url.protocol.replace(':', '') as InferenceEndpointConfig['protocol'],
        port: parseInt(url.port) || (url.protocol === 'https:' ? 443 : 80),
        healthCheckPath: '/health',
        isActive: true,
        priority: i,
        weight: 1,
        modelIds: this.config.models.map(m => m.modelId)
      };

      // Check for endpoint-specific env vars
      const endpointEnvPrefix = `ENDPOINT_${i + 1}_`;
      endpoint.healthCheckPath = this.getEnvString(`${endpointEnvPrefix}HEALTH_PATH`, endpoint.healthCheckPath);
      endpoint.priority = this.getEnvInt(`${endpointEnvPrefix}PRIORITY`, endpoint.priority);
      endpoint.weight = this.getEnvInt(`${endpointEnvPrefix}WEIGHT`, endpoint.weight);
      endpoint.region = this.getEnvString(`${endpointEnvPrefix}REGION`, undefined);

      this.config.endpoints.push(endpoint);
    }
  }

  /**
   * Get environment variable as string
   */
  private getEnvString(key: string, defaultValue: string): string;
  private getEnvString(key: string, defaultValue?: string): string | undefined;
  private getEnvString(key: string, defaultValue?: string): string | undefined {
    return process.env[`${ENV_PREFIX}${key}`] ?? defaultValue;
  }

  /**
   * Get environment variable as integer
   */
  private getEnvInt(key: string, defaultValue: number): number {
    const value = process.env[`${ENV_PREFIX}${key}`];
    if (value === undefined) return defaultValue;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  /**
   * Get environment variable as float
   */
  private getEnvFloat(key: string, defaultValue: number): number {
    const value = process.env[`${ENV_PREFIX}${key}`];
    if (value === undefined) return defaultValue;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  /**
   * Get environment variable as boolean
   */
  private getEnvBool(key: string, defaultValue: boolean): boolean {
    const value = process.env[`${ENV_PREFIX}${key}`];
    if (value === undefined) return defaultValue;
    return value.toLowerCase() === 'true' || value === '1';
  }

  /**
   * Add a model configuration
   */
  public addModel(model: ONNXModelConfig): void {
    const existingIndex = this.config.models.findIndex(m => m.modelId === model.modelId);
    if (existingIndex >= 0) {
      this.config.models[existingIndex] = model;
    } else {
      this.config.models.push(model);
    }
    this.emit('modelAdded', model);
  }

  /**
   * Add an endpoint configuration
   */
  public addEndpoint(endpoint: InferenceEndpointConfig): void {
    const existingIndex = this.config.endpoints.findIndex(e => e.endpointId === endpoint.endpointId);
    if (existingIndex >= 0) {
      this.config.endpoints[existingIndex] = endpoint;
    } else {
      this.config.endpoints.push(endpoint);
    }
    this.emit('endpointAdded', endpoint);
  }

  /**
   * Get the current configuration
   */
  public getConfig(): ONNXLLMProxyConfig {
    return { ...this.config };
  }

  /**
   * Get a specific model configuration
   */
  public getModel(modelId: string): ONNXModelConfig | undefined {
    return this.config.models.find(m => m.modelId === modelId);
  }

  /**
   * Get a specific endpoint configuration
   */
  public getEndpoint(endpointId: string): InferenceEndpointConfig | undefined {
    return this.config.endpoints.find(e => e.endpointId === endpointId);
  }

  /**
   * Get active endpoints
   */
  public getActiveEndpoints(): InferenceEndpointConfig[] {
    return this.config.endpoints.filter(e => e.isActive);
  }

  /**
   * Validate the configuration
   */
  public validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate connection pool
    if (this.config.connectionPool.minConnections < 1) {
      errors.push('Connection pool minConnections must be at least 1');
    }
    if (this.config.connectionPool.maxConnections < this.config.connectionPool.minConnections) {
      errors.push('Connection pool maxConnections must be >= minConnections');
    }

    // Validate timeout settings
    if (this.config.timeoutRetry.requestTimeoutMs < 1000) {
      errors.push('Request timeout must be at least 1000ms');
    }

    // Validate models
    for (const model of this.config.models) {
      if (!model.modelPath) {
        errors.push(`Model ${model.modelId} is missing modelPath`);
      }
      if (model.maxSequenceLength < 1) {
        errors.push(`Model ${model.modelId} has invalid maxSequenceLength`);
      }
    }

    // Validate endpoints
    for (const endpoint of this.config.endpoints) {
      if (!endpoint.url) {
        errors.push(`Endpoint ${endpoint.endpointId} is missing URL`);
      }
      if (endpoint.port < 1 || endpoint.port > 65535) {
        errors.push(`Endpoint ${endpoint.endpointId} has invalid port`);
      }
    }

    // Validate monitoring thresholds
    if (this.config.monitoring.alertThresholds.errorRatePercent < 0 || 
        this.config.monitoring.alertThresholds.errorRatePercent > 100) {
      errors.push('Alert error rate percent must be between 0 and 100');
    }

    // Validate agentic workflow context
    if (this.config.agenticWorkflow.contextManagement.maxTokens < 1) {
      errors.push('Context max tokens must be at least 1');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Export configuration to JSON
   */
  public exportToJSON(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Import configuration from JSON
   */
  public importFromJSON(json: string): void {
    try {
      const imported = JSON.parse(json) as Partial<ONNXLLMProxyConfig>;
      this.config = {
        ...this.config,
        ...imported
      };
      this.emit('configImported', this.config);
    } catch (error) {
      throw new Error(`Failed to import configuration: ${error}`);
    }
  }

  /**
   * Start watching for configuration changes
   */
  public startConfigWatch(intervalMs: number = 30000): void {
    if (this.watchInterval) {
      clearInterval(this.watchInterval);
    }
    
    this.watchInterval = setInterval(() => {
      this.loadFromEnvironment();
    }, intervalMs);
    
    console.log(`[ONNX-PROXY-CONFIG] Started config watch with ${intervalMs}ms interval`);
  }

  /**
   * Stop watching for configuration changes
   */
  public stopConfigWatch(): void {
    if (this.watchInterval) {
      clearInterval(this.watchInterval);
      this.watchInterval = undefined;
      console.log('[ONNX-PROXY-CONFIG] Stopped config watch');
    }
  }
}

/**
 * Create a singleton config loader instance
 */
let configLoaderInstance: ONNXProxyConfigLoader | null = null;

export function getConfigLoader(configFilePath?: string): ONNXProxyConfigLoader {
  if (!configLoaderInstance) {
    configLoaderInstance = new ONNXProxyConfigLoader(configFilePath);
  }
  return configLoaderInstance;
}

export function resetConfigLoader(): void {
  if (configLoaderInstance) {
    configLoaderInstance.stopConfigWatch();
    configLoaderInstance = null;
  }
}
