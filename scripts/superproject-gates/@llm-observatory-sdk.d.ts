/**
 * Type declarations for @llm-observatory/sdk
 * 
 * This file provides TypeScript type declarations for the LLM Observatory SDK
 * to allow compilation even when the package is only in devDependencies.
 */

declare module '@llm-observatory/sdk' {
  /**
   * LLM Observatory SDK main interface
   */
  export interface LLMObservatoryClient {
    /**
     * Initialize the observatory client
     */
    initialize(config?: LLMObservatoryConfig): Promise<void>;

    /**
     * Track an LLM call
     */
    trackLLMCall(params: LLMCallParams): Promise<LLMCallResult>;

    /**
     * Get metrics for a time range
     */
    getMetrics(params: MetricsParams): Promise<MetricsResult>;

    /**
     * Shutdown the client
     */
    shutdown(): Promise<void>;
  }

  /**
   * Configuration for the observatory client
   */
  export interface LLMObservatoryConfig {
    apiKey?: string;
    endpoint?: string;
    enableTracing?: boolean;
    enableMetrics?: boolean;
    serviceName?: string;
    environment?: string;
  }

  /**
   * Parameters for tracking an LLM call
   */
  export interface LLMCallParams {
    model: string;
    provider: string;
    prompt: string;
    response?: string;
    latencyMs?: number;
    tokensUsed?: {
      prompt: number;
      completion: number;
      total: number;
    };
    metadata?: Record<string, any>;
  }

  /**
   * Result of tracking an LLM call
   */
  export interface LLMCallResult {
    callId: string;
    timestamp: number;
    success: boolean;
    error?: string;
  }

  /**
   * Parameters for getting metrics
   */
  export interface MetricsParams {
    startTime: number;
    endTime: number;
    filters?: Record<string, any>;
  }

  /**
   * Metrics result
   */
  export interface MetricsResult {
    totalCalls: number;
    successRate: number;
    avgLatencyMs: number;
    p95LatencyMs: number;
    p99LatencyMs: number;
    totalTokens: number;
    byModel: Record<string, {
      calls: number;
      avgLatency: number;
      tokens: number;
    }>;
    byProvider: Record<string, {
      calls: number;
      avgLatency: number;
      tokens: number;
    }>;
  }

  /**
   * Create a new LLM Observatory client
   */
  export function createClient(config?: LLMObservatoryConfig): LLMObservatoryClient;

  /**
   * Default export
   */
  const sdk: {
    createClient: typeof createClient;
  };
  export default sdk;
}
