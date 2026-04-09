/**
 * ONNX Proxy Initialization Module
 *
 * This module handles the initialization of the ONNX LLM proxy for the
 * agentic-flow@alpha package. It loads configuration, initializes the ONNX runtime,
 * validates model files, and starts the inference server.
 */
/**
 * ONNX Proxy Configuration Interface
 */
export interface OnnxProxyConfig {
    model: {
        path: string;
        endpoint: {
            url: string;
        };
        name: string;
        version: string;
        provider: string;
    };
    connection_pooling: {
        max_connections: number;
        max_idle_connections: number;
        idle_timeout: number;
        request_timeout: number;
        connect_timeout: number;
        keep_alive: boolean;
    };
    request_routing: {
        default_model: string;
        task_models: Record<string, {
            model: string;
            priority: number;
        }>;
        fallback: {
            enabled: boolean;
            model: string;
            max_retries: number;
            timeout: number;
        };
    };
    policies: {
        retry: {
            max_retries: number;
            strategy: 'exponential' | 'linear' | 'constant';
            initial_delay: number;
            max_delay: number;
            multiplier: number;
            jitter: boolean;
        };
        timeout: {
            request: number;
            connect: number;
            read: number;
            write: number;
            total: number;
        };
    };
    logging: {
        request_logging: boolean;
        response_logging: boolean;
        error_logging: boolean;
        level: 'debug' | 'info' | 'warn' | 'error';
        request_response: {
            headers: boolean;
            body: boolean;
            response_headers: boolean;
            response_body: boolean;
            mask_sensitive: boolean;
        };
        metrics: {
            enabled: boolean;
            percentiles: number[];
            histogram_buckets: number[];
        };
        file: {
            path: string;
            max_size: number;
            max_files: number;
            rotation: 'daily' | 'hourly' | 'size';
        };
    };
    performance: {
        caching: {
            enabled: boolean;
            size_mb: number;
            ttl: number;
            key_pattern: string;
        };
        batching: {
            enabled: boolean;
            max_size: number;
            max_wait_ms: number;
        };
        warmup: {
            enabled: boolean;
            requests: number;
            timeout: number;
        };
    };
    security: {
        api_key: {
            enabled: boolean;
        };
        tls: {
            verify: boolean;
            ca_cert: string;
            client_cert: string;
            client_key: string;
        };
        rate_limit: {
            enabled: boolean;
            requests_per_second: number;
            burst: number;
        };
    };
    health_check: {
        enabled: boolean;
        interval: number;
        timeout: number;
        unhealthy_threshold: number;
        healthy_threshold: number;
        endpoint: string;
        metrics: {
            model_available: boolean;
            latency_threshold: number;
            error_rate_threshold: number;
        };
    };
}
/**
 * ONNX Proxy Initialization Options
 */
export interface InitializationOptions {
    configPath?: string;
    validateModel?: boolean;
    startServer?: boolean;
    port?: number;
}
/**
 * ONNX Proxy Class
 */
export declare class OnnxProxy {
    private options;
    private config;
    private server?;
    private isInitialized;
    private healthStatus;
    private connectionPool;
    private requestCount;
    private errorCount;
    private responseTimes;
    constructor(options?: InitializationOptions);
    /**
     * Initialize the ONNX proxy
     */
    initialize(): Promise<void>;
    /**
     * Load configuration from YAML file
     */
    private loadConfiguration;
    /**
     * Expand environment variables in configuration
     */
    private expandEnvironmentVariables;
    /**
     * Validate configuration
     */
    private validateConfiguration;
    /**
     * Validate model file exists and is accessible
     */
    private validateModelFile;
    /**
     * Initialize connection pool
     */
    private initializeConnectionPool;
    /**
     * Start inference server
     */
    private startInferenceServer;
    /**
     * Handle incoming HTTP request
     */
    private handleRequest;
    /**
     * Parse request body
     */
    private parseRequestBody;
    /**
     * Extract task type from request
     */
    private extractTaskType;
    /**
     * Route request to appropriate model
     */
    private routeRequest;
    /**
     * Forward request to inference endpoint
     */
    private forwardRequest;
    /**
     * Perform warmup requests
     */
    private performWarmup;
    /**
     * Start health checks
     */
    private startHealthChecks;
    /**
     * Perform health check
     */
    private performHealthCheck;
    /**
     * Update metrics
     */
    private updateMetrics;
    /**
     * Log message
     */
    private log;
    /**
     * Check if message should be logged based on log level
     */
    private shouldLog;
    /**
     * Log to file
     */
    private logToFile;
    /**
     * Log request
     */
    private logRequest;
    /**
     * Log response
     */
    private logResponse;
    /**
     * Shutdown the proxy
     */
    shutdown(): Promise<void>;
    /**
     * Get proxy status
     */
    getStatus(): {
        isInitialized: boolean;
        healthStatus: string;
        requestCount: number;
        errorCount: number;
        averageResponseTime: number;
    };
}
/**
 * Initialize ONNX proxy with default options
 */
export declare function initializeOnnxProxy(options?: InitializationOptions): Promise<OnnxProxy>;
/**
 * Main entry point for standalone execution
 */
export declare function main(): Promise<void>;
//# sourceMappingURL=initialize.d.ts.map