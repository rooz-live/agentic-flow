/**
 * ONNX LLM Proxy Client
 * 
 * Main client for ONNX inference proxy with request routing,
 * retry policies, and agentic workflow integration.
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import type {
  ONNXLLMProxyConfig,
  ONNXModelConfig,
  InferenceEndpointConfig,
  InferenceRequest,
  InferenceResponse,
  RequestRoutingConfig,
  TimeoutRetryConfig,
  ProxyMetricsSummary
} from './types.js';
import { ONNXProxyConfigLoader, getConfigLoader } from './config.js';
import { ConnectionPoolManager, getConnectionPool } from './connection-pool.js';

/**
 * Request queue item
 */
interface QueuedRequest {
  request: InferenceRequest;
  priority: number;
  enqueuedAt: Date;
  resolve: (response: InferenceResponse) => void;
  reject: (error: Error) => void;
}

/**
 * Request routing state
 */
interface RoutingState {
  currentIndex: number;
  affinityMap: Map<string, string>; // correlationId -> endpointId
  endpointLoadMap: Map<string, number>;
  latencyMap: Map<string, number[]>;
}

/**
 * Metrics collector
 */
interface MetricsCollector {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  latencies: number[];
  tokenCounts: number[];
  startTime: Date;
}

/**
 * ONNX LLM Proxy Client for agentic-flow@alpha
 */
export class ONNXLLMProxyClient extends EventEmitter {
  private configLoader: ONNXProxyConfigLoader;
  private connectionPool: ConnectionPoolManager;
  private config: ONNXLLMProxyConfig;
  private requestQueue: QueuedRequest[] = [];
  private routingState: RoutingState;
  private metrics: MetricsCollector;
  private isInitialized: boolean = false;
  private isProcessingQueue: boolean = false;
  private queueProcessInterval?: ReturnType<typeof setInterval>;
  private metricsInterval?: ReturnType<typeof setInterval>;

  constructor(configLoader?: ONNXProxyConfigLoader) {
    super();
    this.configLoader = configLoader ?? getConfigLoader();
    this.config = this.configLoader.getConfig();
    
    // Initialize routing state
    this.routingState = {
      currentIndex: 0,
      affinityMap: new Map(),
      endpointLoadMap: new Map(),
      latencyMap: new Map()
    };

    // Initialize metrics
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      latencies: [],
      tokenCounts: [],
      startTime: new Date()
    };

    // Get connection pool
    this.connectionPool = getConnectionPool(this.config.connectionPool);

    // Listen for config changes
    this.configLoader.on('configLoaded', (newConfig: ONNXLLMProxyConfig) => {
      this.config = newConfig;
      this.emit('configUpdated', newConfig);
    });
  }

  /**
   * Initialize the proxy client
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('[ONNX-PROXY] Already initialized');
      return;
    }

    console.log('[ONNX-PROXY] Initializing ONNX LLM Proxy Client');

    // Load configuration from environment
    this.configLoader.loadFromEnvironment();
    this.config = this.configLoader.getConfig();

    // Validate configuration
    const validation = this.configLoader.validate();
    if (!validation.valid) {
      console.warn('[ONNX-PROXY] Configuration validation warnings:', validation.errors);
    }

    // Initialize connection pools for each endpoint
    for (const endpoint of this.config.endpoints) {
      await this.connectionPool.initializeEndpoint(endpoint);
      this.routingState.endpointLoadMap.set(endpoint.endpointId, 0);
      this.routingState.latencyMap.set(endpoint.endpointId, []);
    }

    // Start health checks
    this.connectionPool.startHealthChecks(
      this.config.endpoints,
      this.config.monitoring.healthCheckIntervalMs
    );

    // Start connection validation
    this.connectionPool.startConnectionValidation();

    // Start queue processing
    this.startQueueProcessing();

    // Start metrics collection
    this.startMetricsCollection();

    this.isInitialized = true;
    console.log('[ONNX-PROXY] Initialization complete');
    this.emit('initialized');
  }

  /**
   * Execute an inference request
   */
  public async infer(request: Partial<InferenceRequest>): Promise<InferenceResponse> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Build complete request
    const fullRequest = this.buildRequest(request);

    // Log request if enabled
    if (this.config.logging.enableRequestLogging) {
      this.logRequest(fullRequest);
    }

    // Route to appropriate endpoint
    const endpoint = this.selectEndpoint(fullRequest);
    if (!endpoint) {
      return this.createErrorResponse(fullRequest, 'NO_AVAILABLE_ENDPOINT', 'No healthy endpoint available');
    }

    // Execute with retry policy
    try {
      const response = await this.executeWithRetry(fullRequest, endpoint);
      
      // Update metrics
      this.metrics.totalRequests++;
      this.metrics.successfulRequests++;
      if (response.metrics.latencyMs) {
        this.metrics.latencies.push(response.metrics.latencyMs);
      }
      if (response.generationMetadata?.tokensGenerated) {
        this.metrics.tokenCounts.push(response.generationMetadata.tokensGenerated);
      }

      // Update routing state
      this.updateRoutingState(endpoint.endpointId, response.metrics.latencyMs);

      // Emit success event
      this.emit('inferenceCompleted', {
        requestId: fullRequest.requestId,
        modelId: fullRequest.modelId,
        latencyMs: response.metrics.latencyMs
      });

      return response;

    } catch (error) {
      this.metrics.totalRequests++;
      this.metrics.failedRequests++;

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const response = this.createErrorResponse(fullRequest, 'INFERENCE_ERROR', errorMessage);

      // Emit failure event
      this.emit('inferenceFailed', {
        requestId: fullRequest.requestId,
        modelId: fullRequest.modelId,
        error: errorMessage
      });

      return response;
    }
  }

  /**
   * Queue an inference request for async processing
   */
  public async queueInference(request: Partial<InferenceRequest>): Promise<string> {
    const fullRequest = this.buildRequest(request);
    const priority = this.config.routing.priorityLevels[fullRequest.metadata.priority];

    // Check queue size
    if (this.requestQueue.length >= this.config.routing.maxQueueSize) {
      throw new Error('Request queue is full');
    }

    return new Promise((resolve, reject) => {
      const queueItem: QueuedRequest = {
        request: fullRequest,
        priority,
        enqueuedAt: new Date(),
        resolve: (response) => {
          this.emit('queuedRequestCompleted', { requestId: fullRequest.requestId, response });
          resolve(fullRequest.requestId);
        },
        reject: (error) => {
          this.emit('queuedRequestFailed', { requestId: fullRequest.requestId, error });
          reject(error);
        }
      };

      // Insert in priority order
      const insertIndex = this.requestQueue.findIndex(item => item.priority > priority);
      if (insertIndex >= 0) {
        this.requestQueue.splice(insertIndex, 0, queueItem);
      } else {
        this.requestQueue.push(queueItem);
      }

      this.emit('requestQueued', { requestId: fullRequest.requestId, queueSize: this.requestQueue.length });
      
      // Return immediately with request ID for tracking
      resolve(fullRequest.requestId);
    });
  }

  /**
   * Build a complete inference request
   */
  private buildRequest(partial: Partial<InferenceRequest>): InferenceRequest {
    const requestId = partial.requestId ?? uuidv4();
    const correlationId = partial.metadata?.correlationId ?? uuidv4();

    return {
      requestId,
      modelId: partial.modelId ?? this.getDefaultModelId(),
      input: partial.input ?? { text: '' },
      parameters: {
        maxTokens: partial.parameters?.maxTokens ?? this.config.agenticWorkflow.contextManagement.maxTokens,
        temperature: partial.parameters?.temperature ?? 0.7,
        topP: partial.parameters?.topP ?? 0.9,
        topK: partial.parameters?.topK ?? 50,
        repetitionPenalty: partial.parameters?.repetitionPenalty ?? 1.0,
        stopSequences: partial.parameters?.stopSequences ?? [],
        ...partial.parameters
      },
      metadata: {
        correlationId,
        priority: partial.metadata?.priority ?? 'normal',
        source: partial.metadata?.source ?? 'onnx-proxy-client',
        pdaPhase: partial.metadata?.pdaPhase,
        context: partial.metadata?.context ?? {}
      },
      timestamp: new Date()
    };
  }

  /**
   * Get default model ID based on configuration
   */
  private getDefaultModelId(): string {
    if (this.config.models.length > 0) {
      return this.config.models[0].modelId;
    }
    return 'default-model';
  }

  /**
   * Select endpoint based on routing strategy
   */
  private selectEndpoint(request: InferenceRequest): InferenceEndpointConfig | undefined {
    const activeEndpoints = this.config.endpoints.filter(e => e.isActive);
    const healthyEndpoints = activeEndpoints.filter(e => {
      const health = this.connectionPool.getAllEndpointHealth().find(h => h.endpointId === e.endpointId);
      return health && health.status !== 'unhealthy';
    });

    if (healthyEndpoints.length === 0) {
      return undefined;
    }

    // Filter by model availability
    const modelEndpoints = healthyEndpoints.filter(e => 
      e.modelIds.includes(request.modelId) || e.modelIds.length === 0
    );

    const candidates = modelEndpoints.length > 0 ? modelEndpoints : healthyEndpoints;

    switch (this.config.routing.strategy) {
      case 'round-robin':
        return this.selectRoundRobin(candidates);
      case 'weighted':
        return this.selectWeighted(candidates);
      case 'least-connections':
        return this.selectLeastConnections(candidates);
      case 'latency-based':
        return this.selectLatencyBased(candidates);
      case 'affinity':
        return this.selectWithAffinity(candidates, request.metadata.correlationId);
      default:
        return this.selectRoundRobin(candidates);
    }
  }

  /**
   * Round-robin endpoint selection
   */
  private selectRoundRobin(endpoints: InferenceEndpointConfig[]): InferenceEndpointConfig {
    const index = this.routingState.currentIndex % endpoints.length;
    this.routingState.currentIndex++;
    return endpoints[index];
  }

  /**
   * Weighted endpoint selection
   */
  private selectWeighted(endpoints: InferenceEndpointConfig[]): InferenceEndpointConfig {
    const totalWeight = endpoints.reduce((sum, e) => sum + e.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const endpoint of endpoints) {
      random -= endpoint.weight;
      if (random <= 0) {
        return endpoint;
      }
    }
    
    return endpoints[0];
  }

  /**
   * Least connections endpoint selection
   */
  private selectLeastConnections(endpoints: InferenceEndpointConfig[]): InferenceEndpointConfig {
    let minLoad = Infinity;
    let selected = endpoints[0];
    
    for (const endpoint of endpoints) {
      const load = this.routingState.endpointLoadMap.get(endpoint.endpointId) ?? 0;
      if (load < minLoad) {
        minLoad = load;
        selected = endpoint;
      }
    }
    
    return selected;
  }

  /**
   * Latency-based endpoint selection
   */
  private selectLatencyBased(endpoints: InferenceEndpointConfig[]): InferenceEndpointConfig {
    let minLatency = Infinity;
    let selected = endpoints[0];
    
    for (const endpoint of endpoints) {
      const latencies = this.routingState.latencyMap.get(endpoint.endpointId) ?? [];
      const avgLatency = latencies.length > 0 
        ? latencies.reduce((a, b) => a + b, 0) / latencies.length 
        : Infinity;
      
      if (avgLatency < minLatency) {
        minLatency = avgLatency;
        selected = endpoint;
      }
    }
    
    return selected;
  }

  /**
   * Affinity-based endpoint selection
   */
  private selectWithAffinity(
    endpoints: InferenceEndpointConfig[], 
    correlationId: string
  ): InferenceEndpointConfig {
    // Check for existing affinity
    const affinityEndpointId = this.routingState.affinityMap.get(correlationId);
    if (affinityEndpointId) {
      const affinityEndpoint = endpoints.find(e => e.endpointId === affinityEndpointId);
      if (affinityEndpoint) {
        return affinityEndpoint;
      }
    }
    
    // Select new endpoint and establish affinity
    const selected = this.selectRoundRobin(endpoints);
    this.routingState.affinityMap.set(correlationId, selected.endpointId);
    
    // Set timeout to clear affinity
    setTimeout(() => {
      this.routingState.affinityMap.delete(correlationId);
    }, this.config.routing.affinityTimeoutMs);
    
    return selected;
  }

  /**
   * Update routing state after request completion
   */
  private updateRoutingState(endpointId: string, latencyMs: number): void {
    // Update load count
    const currentLoad = this.routingState.endpointLoadMap.get(endpointId) ?? 0;
    this.routingState.endpointLoadMap.set(endpointId, Math.max(0, currentLoad - 1));
    
    // Update latency history (keep last 100 samples)
    const latencies = this.routingState.latencyMap.get(endpointId) ?? [];
    latencies.push(latencyMs);
    if (latencies.length > 100) {
      latencies.shift();
    }
    this.routingState.latencyMap.set(endpointId, latencies);
  }

  /**
   * Execute request with retry policy
   */
  private async executeWithRetry(
    request: InferenceRequest,
    endpoint: InferenceEndpointConfig
  ): Promise<InferenceResponse> {
    const retryConfig = this.config.timeoutRetry;
    let lastError: Error | null = null;
    let attemptCount = 0;

    // Increment load counter
    const currentLoad = this.routingState.endpointLoadMap.get(endpoint.endpointId) ?? 0;
    this.routingState.endpointLoadMap.set(endpoint.endpointId, currentLoad + 1);

    while (attemptCount <= retryConfig.maxRetries) {
      try {
        const response = await this.executeRequest(request, endpoint);
        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Check if error is retryable
        if (!this.isRetryableError(lastError, retryConfig)) {
          throw lastError;
        }

        attemptCount++;
        
        if (attemptCount <= retryConfig.maxRetries) {
          const delay = this.calculateRetryDelay(attemptCount, retryConfig);
          console.log(`[ONNX-PROXY] Retry attempt ${attemptCount}/${retryConfig.maxRetries} after ${delay}ms`);
          await this.sleep(delay);
        }
      }
    }

    throw lastError ?? new Error('Max retries exceeded');
  }

  /**
   * Execute a single inference request
   */
  private async executeRequest(
    request: InferenceRequest,
    endpoint: InferenceEndpointConfig
  ): Promise<InferenceResponse> {
    const startTime = Date.now();
    
    // Acquire connection from pool
    const connection = await this.connectionPool.acquireConnection(
      endpoint.endpointId,
      this.config.timeoutRetry.connectionTimeoutMs
    );

    try {
      const queueTime = Date.now() - startTime;
      const inferenceStartTime = Date.now();

      // Build request payload
      const payload = this.buildInferencePayload(request);

      // Execute request
      const response = await connection.client.post('/v1/inference', payload, {
        timeout: this.config.timeoutRetry.requestTimeoutMs,
        headers: {
          'X-Request-Id': request.requestId,
          'X-Correlation-Id': request.metadata.correlationId,
          'X-Model-Id': request.modelId
        }
      });

      const inferenceTime = Date.now() - inferenceStartTime;
      const totalLatency = Date.now() - startTime;

      // Build response
      const inferenceResponse: InferenceResponse = {
        requestId: request.requestId,
        modelId: request.modelId,
        status: 'success',
        output: {
          text: response.data.text ?? response.data.generated_text,
          tokenIds: response.data.token_ids,
          embeddings: response.data.embeddings,
          tensors: response.data.tensors,
          logits: response.data.logits
        },
        generationMetadata: {
          tokensGenerated: response.data.tokens_generated ?? 0,
          tokensPrompt: response.data.tokens_prompt ?? 0,
          finishReason: response.data.finish_reason ?? 'stop',
          generationTimeMs: inferenceTime
        },
        metrics: {
          latencyMs: totalLatency,
          queueTimeMs: queueTime,
          inferenceTimeMs: inferenceTime,
          endpointId: endpoint.endpointId
        },
        timestamp: new Date()
      };

      // Release connection
      this.connectionPool.releaseConnection(connection, false);

      return inferenceResponse;

    } catch (error) {
      // Release connection with error flag
      this.connectionPool.releaseConnection(connection, true);
      throw error;
    }
  }

  /**
   * Build inference payload for API request
   */
  private buildInferencePayload(request: InferenceRequest): Record<string, unknown> {
    return {
      model_id: request.modelId,
      input: request.input.text ?? {
        token_ids: request.input.tokenIds,
        embeddings: request.input.embeddings,
        tensors: request.input.tensors
      },
      parameters: {
        max_tokens: request.parameters?.maxTokens,
        temperature: request.parameters?.temperature,
        top_p: request.parameters?.topP,
        top_k: request.parameters?.topK,
        repetition_penalty: request.parameters?.repetitionPenalty,
        stop_sequences: request.parameters?.stopSequences
      },
      metadata: {
        request_id: request.requestId,
        correlation_id: request.metadata.correlationId,
        source: request.metadata.source,
        pda_phase: request.metadata.pdaPhase
      }
    };
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: Error, config: TimeoutRetryConfig): boolean {
    const errorCode = (error as any).code ?? '';
    const errorMessage = error.message.toUpperCase();
    
    // Check non-retryable errors
    for (const code of config.nonRetryableErrors) {
      if (errorCode === code || errorMessage.includes(code)) {
        return false;
      }
    }
    
    // Check retryable errors
    for (const code of config.retryableErrors) {
      if (errorCode === code || errorMessage.includes(code)) {
        return true;
      }
    }
    
    // Default to retryable for timeout/network errors
    return errorMessage.includes('TIMEOUT') || 
           errorMessage.includes('ECONNRESET') ||
           errorMessage.includes('NETWORK');
  }

  /**
   * Calculate retry delay based on backoff strategy
   */
  private calculateRetryDelay(attemptNumber: number, config: TimeoutRetryConfig): number {
    let delay: number;
    
    switch (config.retryBackoff) {
      case 'fixed':
        delay = config.retryDelayMs;
        break;
      case 'linear':
        delay = config.retryDelayMs * attemptNumber;
        break;
      case 'exponential':
        delay = config.retryDelayMs * Math.pow(2, attemptNumber - 1);
        break;
      case 'jitter':
        delay = config.retryDelayMs * Math.pow(2, attemptNumber - 1);
        const jitter = delay * config.jitterFactor * (Math.random() * 2 - 1);
        delay += jitter;
        break;
      default:
        delay = config.retryDelayMs;
    }
    
    return Math.min(delay, config.maxRetryDelayMs);
  }

  /**
   * Create error response
   */
  private createErrorResponse(
    request: InferenceRequest,
    code: string,
    message: string
  ): InferenceResponse {
    return {
      requestId: request.requestId,
      modelId: request.modelId,
      status: 'error',
      output: {},
      metrics: {
        latencyMs: 0,
        queueTimeMs: 0,
        inferenceTimeMs: 0,
        endpointId: ''
      },
      error: {
        code,
        message,
        retryable: this.isRetryableError(new Error(message), this.config.timeoutRetry)
      },
      timestamp: new Date()
    };
  }

  /**
   * Log request (with redaction)
   */
  private logRequest(request: InferenceRequest): void {
    const logData = {
      requestId: request.requestId,
      modelId: request.modelId,
      correlationId: request.metadata.correlationId,
      priority: request.metadata.priority,
      source: request.metadata.source,
      pdaPhase: request.metadata.pdaPhase,
      inputLength: request.input.text?.length ?? 0,
      parameters: request.parameters,
      timestamp: request.timestamp.toISOString()
    };

    console.log(`[ONNX-PROXY] Request: ${JSON.stringify(logData)}`);
  }

  /**
   * Start queue processing
   */
  private startQueueProcessing(): void {
    if (this.queueProcessInterval) {
      clearInterval(this.queueProcessInterval);
    }

    this.queueProcessInterval = setInterval(async () => {
      if (this.isProcessingQueue || this.requestQueue.length === 0) {
        return;
      }

      this.isProcessingQueue = true;

      try {
        // Process requests in priority order
        while (this.requestQueue.length > 0) {
          const item = this.requestQueue[0];
          
          // Check for timeout
          const queueTime = Date.now() - item.enqueuedAt.getTime();
          if (queueTime > this.config.routing.queueTimeoutMs) {
            this.requestQueue.shift();
            item.reject(new Error('Queue timeout exceeded'));
            continue;
          }

          try {
            const response = await this.infer(item.request);
            this.requestQueue.shift();
            item.resolve(response);
          } catch (error) {
            this.requestQueue.shift();
            item.reject(error instanceof Error ? error : new Error(String(error)));
          }
        }
      } finally {
        this.isProcessingQueue = false;
      }
    }, 100); // Process queue every 100ms
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    this.metricsInterval = setInterval(() => {
      this.emit('metricsCollected', this.getMetricsSummary());
    }, this.config.monitoring.metricsIntervalMs);
  }

  /**
   * Get metrics summary
   */
  public getMetricsSummary(): ProxyMetricsSummary {
    const sortedLatencies = [...this.metrics.latencies].sort((a, b) => a - b);
    const p50Index = Math.floor(sortedLatencies.length * 0.5);
    const p95Index = Math.floor(sortedLatencies.length * 0.95);
    const p99Index = Math.floor(sortedLatencies.length * 0.99);

    const elapsedSeconds = (Date.now() - this.metrics.startTime.getTime()) / 1000;
    const rps = elapsedSeconds > 0 ? this.metrics.totalRequests / elapsedSeconds : 0;
    const tps = elapsedSeconds > 0 
      ? this.metrics.tokenCounts.reduce((a, b) => a + b, 0) / elapsedSeconds 
      : 0;

    return {
      totalRequests: this.metrics.totalRequests,
      successfulRequests: this.metrics.successfulRequests,
      failedRequests: this.metrics.failedRequests,
      averageLatencyMs: sortedLatencies.length > 0 
        ? sortedLatencies.reduce((a, b) => a + b, 0) / sortedLatencies.length 
        : 0,
      p50LatencyMs: sortedLatencies[p50Index] ?? 0,
      p95LatencyMs: sortedLatencies[p95Index] ?? 0,
      p99LatencyMs: sortedLatencies[p99Index] ?? 0,
      requestsPerSecond: rps,
      tokensPerSecond: tps,
      connectionPool: this.connectionPool.getPoolStatus(this.config.endpoints[0]?.endpointId ?? ''),
      endpoints: this.connectionPool.getAllEndpointHealth(),
      timestamp: new Date()
    };
  }

  /**
   * Get model configuration
   */
  public getModel(modelId: string): ONNXModelConfig | undefined {
    return this.configLoader.getModel(modelId);
  }

  /**
   * Get all model configurations
   */
  public getModels(): ONNXModelConfig[] {
    return this.config.models;
  }

  /**
   * Check if client is ready
   */
  public isReady(): boolean {
    return this.isInitialized && 
           this.config.endpoints.some(e => e.isActive) &&
           this.connectionPool.getAllEndpointHealth().some(h => h.status !== 'unhealthy');
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Shutdown the proxy client
   */
  public async shutdown(): Promise<void> {
    console.log('[ONNX-PROXY] Shutting down proxy client');

    // Stop intervals
    if (this.queueProcessInterval) {
      clearInterval(this.queueProcessInterval);
    }
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    // Process remaining queue items with timeout errors
    for (const item of this.requestQueue) {
      item.reject(new Error('Proxy shutdown'));
    }
    this.requestQueue.length = 0;

    // Shutdown connection pool
    await this.connectionPool.shutdown();

    // Stop config watch
    this.configLoader.stopConfigWatch();

    this.isInitialized = false;
    this.emit('shutdown');
    console.log('[ONNX-PROXY] Shutdown complete');
  }
}

/**
 * Create a singleton proxy client instance
 */
let proxyClientInstance: ONNXLLMProxyClient | null = null;

export function getProxyClient(configLoader?: ONNXProxyConfigLoader): ONNXLLMProxyClient {
  if (!proxyClientInstance) {
    proxyClientInstance = new ONNXLLMProxyClient(configLoader);
  }
  return proxyClientInstance;
}

export function resetProxyClient(): void {
  if (proxyClientInstance) {
    proxyClientInstance.shutdown();
    proxyClientInstance = null;
  }
}
