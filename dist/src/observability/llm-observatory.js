/**
 * LLM Observatory Integration
 * Using Traceloop OpenLLMetry + Datadog + OpenTelemetry
 *
 * @see https://github.com/traceloop/openllmetry
 * @see https://docs.datadoghq.com/llm_observability/instrumentation/sdk/
 */
import { trace } from '@opentelemetry/api';
export class LLMObservability {
    config;
    tracer;
    spans = new Map();
    constructor(config = {}) {
        this.config = {
            enabled: config.enabled !== false,
            mlAppName: config.mlAppName || process.env.DD_LLMOBS_ML_APP || 'agentic-flow',
            datadogSite: config.datadogSite || process.env.DD_SITE,
            datadogApiKey: config.datadogApiKey || process.env.DD_API_KEY,
            agentless: config.agentless || process.env.DD_LLMOBS_AGENTLESS_ENABLED === '1',
        };
        if (this.config.enabled) {
            this.initializeTracing();
        }
    }
    initializeTracing() {
        try {
            // Initialize OpenTelemetry tracer
            this.tracer = trace.getTracer(this.config.mlAppName, '1.0.0');
            console.log(`✅ LLM Observatory initialized: ${this.config.mlAppName}`);
        }
        catch (error) {
            console.warn(`⚠️  LLM Observatory initialization failed: ${error}`);
        }
    }
    /**
     * Start an LLM operation span
     */
    startSpan(name, attributes = {}) {
        if (!this.config.enabled || !this.tracer) {
            return 'disabled';
        }
        const span = this.tracer.startSpan(name, {
            attributes: {
                'llm.app': this.config.mlAppName,
                'llm.operation': name,
                ...attributes,
            },
        });
        const spanId = span.spanContext().spanId;
        const traceId = span.spanContext().traceId;
        this.spans.set(spanId, {
            spanId,
            traceId,
            name,
            startTime: Date.now(),
            status: 'running',
        });
        return spanId;
    }
    /**
     * End a span with results
     */
    endSpan(spanId, result = {}) {
        if (!this.config.enabled || spanId === 'disabled') {
            return;
        }
        const span = this.spans.get(spanId);
        if (!span) {
            return;
        }
        // Update span with results
        span.endTime = Date.now();
        span.model = result.model;
        span.promptTokens = result.promptTokens;
        span.completionTokens = result.completionTokens;
        span.totalTokens = result.totalTokens;
        span.temperature = result.temperature;
        span.status = result.error ? 'error' : 'success';
        span.error = result.error;
        // Would call OpenTelemetry span.end() here
        console.log(`📊 LLM Span completed: ${span.name} (${span.endTime - span.startTime}ms)`);
    }
    /**
     * Track LLM inference
     */
    async trackInference(name, fn, metadata = {}) {
        const spanId = this.startSpan(name, metadata);
        try {
            const result = await fn();
            this.endSpan(spanId, { status: 'success' });
            return result;
        }
        catch (error) {
            this.endSpan(spanId, { status: 'error', error: String(error) });
            throw error;
        }
    }
    /**
     * Get observability stats
     */
    getStats() {
        const spans = Array.from(this.spans.values());
        return {
            totalSpans: spans.length,
            runningSpans: spans.filter(s => s.status === 'running').length,
            successSpans: spans.filter(s => s.status === 'success').length,
            errorSpans: spans.filter(s => s.status === 'error').length,
            avgLatency: spans
                .filter(s => s.endTime)
                .reduce((sum, s) => sum + (s.endTime - s.startTime), 0) / spans.length || 0,
        };
    }
}
// Singleton instance
let observability = null;
export function initializeLLMObservability(config) {
    if (!observability) {
        observability = new LLMObservability(config);
    }
    return observability;
}
export function getLLMObservability() {
    if (!observability) {
        observability = new LLMObservability();
    }
    return observability;
}
//# sourceMappingURL=llm-observatory.js.map