/**
 * ONNX LLM Proxy Client
 *
 * Main client for ONNX inference proxy with request routing,
 * retry policies, and agentic workflow integration.
 */
import { EventEmitter } from 'events';
import type { ONNXModelConfig, InferenceRequest, InferenceResponse, ProxyMetricsSummary } from './types.js';
import { ONNXProxyConfigLoader } from './config.js';
/**
 * ONNX LLM Proxy Client for agentic-flow@alpha
 */
export declare class ONNXLLMProxyClient extends EventEmitter {
    private configLoader;
    private connectionPool;
    private config;
    private requestQueue;
    private routingState;
    private metrics;
    private isInitialized;
    private isProcessingQueue;
    private queueProcessInterval?;
    private metricsInterval?;
    constructor(configLoader?: ONNXProxyConfigLoader);
    /**
     * Initialize the proxy client
     */
    initialize(): Promise<void>;
    /**
     * Execute an inference request
     */
    infer(request: Partial<InferenceRequest>): Promise<InferenceResponse>;
    /**
     * Queue an inference request for async processing
     */
    queueInference(request: Partial<InferenceRequest>): Promise<string>;
    /**
     * Build a complete inference request
     */
    private buildRequest;
    /**
     * Get default model ID based on configuration
     */
    private getDefaultModelId;
    /**
     * Select endpoint based on routing strategy
     */
    private selectEndpoint;
    /**
     * Round-robin endpoint selection
     */
    private selectRoundRobin;
    /**
     * Weighted endpoint selection
     */
    private selectWeighted;
    /**
     * Least connections endpoint selection
     */
    private selectLeastConnections;
    /**
     * Latency-based endpoint selection
     */
    private selectLatencyBased;
    /**
     * Affinity-based endpoint selection
     */
    private selectWithAffinity;
    /**
     * Update routing state after request completion
     */
    private updateRoutingState;
    /**
     * Execute request with retry policy
     */
    private executeWithRetry;
    /**
     * Execute a single inference request
     */
    private executeRequest;
    /**
     * Build inference payload for API request
     */
    private buildInferencePayload;
    /**
     * Check if error is retryable
     */
    private isRetryableError;
    /**
     * Calculate retry delay based on backoff strategy
     */
    private calculateRetryDelay;
    /**
     * Create error response
     */
    private createErrorResponse;
    /**
     * Log request (with redaction)
     */
    private logRequest;
    /**
     * Start queue processing
     */
    private startQueueProcessing;
    /**
     * Start metrics collection
     */
    private startMetricsCollection;
    /**
     * Get metrics summary
     */
    getMetricsSummary(): ProxyMetricsSummary;
    /**
     * Get model configuration
     */
    getModel(modelId: string): ONNXModelConfig | undefined;
    /**
     * Get all model configurations
     */
    getModels(): ONNXModelConfig[];
    /**
     * Check if client is ready
     */
    isReady(): boolean;
    /**
     * Sleep utility
     */
    private sleep;
    /**
     * Shutdown the proxy client
     */
    shutdown(): Promise<void>;
}
export declare function getProxyClient(configLoader?: ONNXProxyConfigLoader): ONNXLLMProxyClient;
export declare function resetProxyClient(): void;
//# sourceMappingURL=proxy-client.d.ts.map