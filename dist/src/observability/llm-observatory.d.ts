/**
 * LLM Observatory Integration
 * Using Traceloop OpenLLMetry + Datadog + OpenTelemetry
 *
 * @see https://github.com/traceloop/openllmetry
 * @see https://docs.datadoghq.com/llm_observability/instrumentation/sdk/
 */
export interface LLMObservabilityConfig {
    enabled: boolean;
    mlAppName: string;
    datadogSite?: string;
    datadogApiKey?: string;
    agentless?: boolean;
}
export interface LLMSpan {
    spanId: string;
    traceId: string;
    name: string;
    startTime: number;
    endTime?: number;
    model?: string;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    temperature?: number;
    status: 'running' | 'success' | 'error';
    error?: string;
}
export declare class LLMObservability {
    private config;
    private tracer;
    private spans;
    constructor(config?: Partial<LLMObservabilityConfig>);
    private initializeTracing;
    /**
     * Start an LLM operation span
     */
    startSpan(name: string, attributes?: Record<string, any>): string;
    /**
     * End a span with results
     */
    endSpan(spanId: string, result?: Partial<LLMSpan>): void;
    /**
     * Track LLM inference
     */
    trackInference<T>(name: string, fn: () => Promise<T>, metadata?: Record<string, any>): Promise<T>;
    /**
     * Get observability stats
     */
    getStats(): {
        totalSpans: number;
        runningSpans: number;
        successSpans: number;
        errorSpans: number;
        avgLatency: number;
    };
    /**
     * Trace local LLM operations
     */
    traceLocalLLM<T>(operation: string, fn: () => Promise<T>): Promise<T>;
}
export declare function initializeLLMObservability(config?: Partial<LLMObservabilityConfig>): LLMObservability;
export declare function getLLMObservability(): LLMObservability;
//# sourceMappingURL=llm-observatory.d.ts.map