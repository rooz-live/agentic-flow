/**
 * LLM Observatory Integration
 * Supports multiple observability backends:
 * - Traceloop OpenLLMetry (primary, OpenTelemetry-native)
 * - Datadog LLM Observability (enterprise APM)
 * - OpenTelemetry (direct SDK)
 */
export type ObservabilityBackend = 'traceloop' | 'datadog' | 'opentelemetry' | 'none';
export interface LLMObservabilityConfig {
    backend: ObservabilityBackend;
    apiKey?: string;
    serviceName?: string;
    environment?: string;
    disableBatch?: boolean;
}
export interface LLMSpanOptions {
    name: string;
    modelName?: string;
    modelProvider?: string;
    temperature?: number;
    maxTokens?: number;
    metadata?: Record<string, any>;
}
export interface LLMCompletionData {
    prompt: string;
    completion: string;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    latencyMs?: number;
    error?: Error;
}
/**
 * Unified LLM Observability Client
 * Abstracts over multiple observability backends
 */
export declare class LLMObservability {
    private config;
    private initialized;
    private tracerProvider?;
    constructor(config: LLMObservabilityConfig);
    /**
     * Initialize the selected observability backend
     */
    initialize(): void;
    /**
     * Initialize Traceloop OpenLLMetry
     * Recommended: OpenTelemetry-native, supports all major LLM providers
     */
    private initializeTraceloop;
    /**
     * Initialize Datadog LLM Observability
     * Enterprise APM with built-in dashboards
     */
    private initializeDatadog;
    /**
     * Initialize OpenTelemetry directly
     * Most flexible, works with any OTel collector
     */
    private initializeOpenTelemetry;
    /**
     * Track LLM completion with automatic instrumentation
     */
    trackCompletion(options: LLMSpanOptions, completionFn: () => Promise<LLMCompletionData>): Promise<LLMCompletionData>;
    /**
     * Track with Traceloop (wraps LLM calls automatically)
     */
    private trackWithTraceloop;
    /**
     * Track with Datadog (manual span creation)
     */
    private trackWithDatadog;
    /**
     * Track with OpenTelemetry (direct API)
     */
    private trackWithOpenTelemetry;
    /**
     * Submit custom evaluation metric
     */
    submitEvaluation(spanId: string, label: string, value: number | string, tags?: Record<string, any>): void;
    /**
     * Flush pending spans (for graceful shutdown)
     */
    flush(): Promise<void>;
}
/**
 * Factory function to create observability client from environment
 */
export declare function createObservabilityClient(backend?: ObservabilityBackend): LLMObservability;
export declare const llmObservability: LLMObservability;
/**
 * Example Usage:
 *
 * import { llmObservability } from './llm-observability';
 *
 * // Track LLM completion
 * const result = await llmObservability.trackCompletion(
 *   {
 *     name: 'generate-code',
 *     modelName: 'claude-3.5-sonnet',
 *     modelProvider: 'anthropic',
 *     temperature: 0.7,
 *     maxTokens: 4096
 *   },
 *   async () => {
 *     const response = await anthropic.messages.create({ ... });
 *     return {
 *       prompt: messages[0].content,
 *       completion: response.content[0].text,
 *       promptTokens: response.usage.input_tokens,
 *       completionTokens: response.usage.output_tokens,
 *       totalTokens: response.usage.input_tokens + response.usage.output_tokens
 *     };
 *   }
 * );
 *
 * // Submit evaluation
 * llmObservability.submitEvaluation(
 *   'span-123',
 *   'toxicity',
 *   0.05,
 *   { evaluator: 'ragas', threshold: 0.1 }
 * );
 */
//# sourceMappingURL=llm-observability.d.ts.map