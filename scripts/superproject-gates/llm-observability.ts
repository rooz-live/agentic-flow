/**
 * LLM Observatory Integration
 * Supports multiple observability backends:
 * - Traceloop OpenLLMetry (primary, OpenTelemetry-native)
 * - Datadog LLM Observability (enterprise APM)
 * - OpenTelemetry (direct SDK)
 */

import { SpanStatusCode, trace } from '@opentelemetry/api';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import * as traceloop from '@traceloop/node-server-sdk';
import tracer from 'dd-trace';

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
export class LLMObservability {
  private config: LLMObservabilityConfig;
  private initialized: boolean = false;
  private tracerProvider?: NodeTracerProvider;

  constructor(config: LLMObservabilityConfig) {
    this.config = config;
  }

  /**
   * Initialize the selected observability backend
   */
  initialize(): void {
    if (this.initialized) {
      console.warn('LLM Observability already initialized');
      return;
    }

    switch (this.config.backend) {
      case 'traceloop':
        this.initializeTraceloop();
        break;
      case 'datadog':
        this.initializeDatadog();
        break;
      case 'opentelemetry':
        this.initializeOpenTelemetry();
        break;
      case 'none':
        console.log('LLM Observability disabled (backend: none)');
        break;
      default:
        throw new Error(`Unknown observability backend: ${this.config.backend}`);
    }

    this.initialized = true;
  }

  /**
   * Initialize Traceloop OpenLLMetry
   * Recommended: OpenTelemetry-native, supports all major LLM providers
   */
  private initializeTraceloop(): void {
    traceloop.initialize({
      appName: this.config.serviceName || 'agentic-flow-core',
      apiKey: this.config.apiKey,
      disableBatch: this.config.disableBatch || false,
      instrumentModules: {
        // Type cast for SDK compatibility
      } as any,
    });
    console.log('✅ Traceloop OpenLLMetry initialized');
  }

  /**
   * Initialize Datadog LLM Observability
   * Enterprise APM with built-in dashboards
   */
  private initializeDatadog(): void {
    tracer.init({
      service: this.config.serviceName || 'agentic-flow-core',
      env: this.config.environment || 'production',
      tags: {
        'llm.observability': 'enabled',
      },
      profiling: true,
      logInjection: true,
    });
    tracer.use('http');
    tracer.use('fetch');
    console.log('✅ Datadog APM initialized');
  }

  /**
   * Initialize OpenTelemetry directly
   * Most flexible, works with any OTel collector
   */
  private initializeOpenTelemetry(): void {
    this.tracerProvider = new NodeTracerProvider();
    this.tracerProvider.register();
    console.log('✅ OpenTelemetry initialized');
  }

  /**
   * Track LLM completion with automatic instrumentation
   */
  async trackCompletion(
    options: LLMSpanOptions,
    completionFn: () => Promise<LLMCompletionData>
  ): Promise<LLMCompletionData> {
    if (!this.initialized) {
      console.warn('LLM Observability not initialized, tracking skipped');
      return completionFn();
    }

    const startTime = Date.now();

    switch (this.config.backend) {
      case 'traceloop':
        return this.trackWithTraceloop(options, completionFn, startTime);
      case 'datadog':
        return this.trackWithDatadog(options, completionFn, startTime);
      case 'opentelemetry':
        return this.trackWithOpenTelemetry(options, completionFn, startTime);
      default:
        return completionFn();
    }
  }

  /**
   * Track with Traceloop (wraps LLM calls automatically)
   */
  private async trackWithTraceloop(
    options: LLMSpanOptions,
    completionFn: () => Promise<LLMCompletionData>,
    startTime: number
  ): Promise<LLMCompletionData> {
    // Use any cast for Traceloop SDK compatibility
    return (traceloop as any).withSpan(
      {
        name: options.name,
        kind: 'llm',
        metadata: {
          model: options.modelName,
          provider: options.modelProvider,
          temperature: options.temperature,
          max_tokens: options.maxTokens,
          ...options.metadata,
        },
      },
      async () => {
        try {
          const result = await completionFn();

          // Record metrics via OTel if available, otherwise cast to any for SDK
          try {
            (traceloop as any).recordMetric('llm.completion.latency', Date.now() - startTime);
            (traceloop as any).recordMetric('llm.tokens.prompt', result.promptTokens || 0);
            (traceloop as any).recordMetric('llm.tokens.completion', result.completionTokens || 0);
          } catch (e) {
            console.debug('Metric recording failed', e);
          }

          return result;
        } catch (error) {
          try {
            (traceloop as any).recordException(error as Error);
          } catch (e) {
            console.debug('Exception recording failed', e);
          }
          throw error;
        }
      }
    );
  }

  /**
   * Track with Datadog (manual span creation)
   */
  private async trackWithDatadog(
    options: LLMSpanOptions,
    completionFn: () => Promise<LLMCompletionData>,
    startTime: number
  ): Promise<LLMCompletionData> {
    const span = tracer.startSpan('llm.completion', {
      tags: {
        'resource.name': options.name,
        'llm.model': options.modelName,
        'llm.provider': options.modelProvider,
        'llm.temperature': options.temperature,
        'llm.max_tokens': options.maxTokens,
      },
    });

    try {
      const result = await completionFn();

      // Add metrics to span
      span.setTag('llm.tokens.prompt', result.promptTokens || 0);
      span.setTag('llm.tokens.completion', result.completionTokens || 0);
      span.setTag('llm.tokens.total', result.totalTokens || 0);
      span.setTag('llm.latency_ms', Date.now() - startTime);

      span.finish();
      return result;
    } catch (error) {
      span.setTag('error', true);
      span.setTag('error.message', (error as Error).message);
      span.setTag('error.stack', (error as Error).stack);
      span.finish();
      throw error;
    }
  }

  /**
   * Track with OpenTelemetry (direct API)
   */
  private async trackWithOpenTelemetry(
    options: LLMSpanOptions,
    completionFn: () => Promise<LLMCompletionData>,
    startTime: number
  ): Promise<LLMCompletionData> {
    const tracer = trace.getTracer('agentic-flow-llm');

    return tracer.startActiveSpan(options.name, async (span) => {
      try {
        span.setAttribute('llm.model', options.modelName || 'unknown');
        span.setAttribute('llm.provider', options.modelProvider || 'unknown');
        span.setAttribute('llm.temperature', options.temperature || 0);
        span.setAttribute('llm.max_tokens', options.maxTokens || 0);

        const result = await completionFn();

        // Add completion metrics
        span.setAttribute('llm.tokens.prompt', result.promptTokens || 0);
        span.setAttribute('llm.tokens.completion', result.completionTokens || 0);
        span.setAttribute('llm.tokens.total', result.totalTokens || 0);
        span.setAttribute('llm.latency_ms', Date.now() - startTime);

        span.setStatus({ code: SpanStatusCode.OK });
        span.end();
        return result;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: (error as Error).message,
        });
        span.end();
        throw error;
      }
    });
  }

  /**
   * Submit custom evaluation metric
   */
  submitEvaluation(
    spanId: string,
    label: string,
    value: number | string,
    tags?: Record<string, any>
  ): void {
    if (!this.initialized) return;

    switch (this.config.backend) {
      case 'traceloop':
        (traceloop as any).recordMetric(`evaluation.${label}`, typeof value === 'number' ? value : 1, tags);
        break;
      case 'datadog':
        if ((tracer as any).dogstatsd) {
          (tracer as any).dogstatsd.gauge(`llm.evaluation.${label}`, typeof value === 'number' ? value : 1, tags);
        }
        break;
      case 'opentelemetry':
        // OpenTelemetry metrics API
        try {
          const meter = (trace as any).getMeterProvider?.().getMeter('agentic-flow-llm');
          if (meter) {
            const gauge = meter.createGauge(`evaluation.${label}`);
            gauge.record(typeof value === 'number' ? value : 1, tags);
          }
        } catch (e) {
          console.debug('OTel metric submission failed', e);
        }
        break;
    }
  }

  /**
   * Flush pending spans (for graceful shutdown)
   */
  async flush(): Promise<void> {
    if (!this.initialized) return;

    switch (this.config.backend) {
      case 'traceloop':
        await (traceloop as any).flush?.();
        break;
      case 'datadog':
        await (tracer as any).flush?.();
        break;
      case 'opentelemetry':
        await this.tracerProvider?.forceFlush();
        break;
    }
  }
}

/**
 * Factory function to create observability client from environment
 */
export function createObservabilityClient(
  backend?: ObservabilityBackend
): LLMObservability {
  const selectedBackend = backend || (process.env.LLM_OBSERVABILITY_BACKEND as ObservabilityBackend) || 'traceloop';

  const config: LLMObservabilityConfig = {
    backend: selectedBackend,
    apiKey: process.env.TRACELOOP_API_KEY || process.env.DD_API_KEY,
    serviceName: process.env.SERVICE_NAME || 'agentic-flow-core',
    environment: process.env.NODE_ENV || 'development',
    disableBatch: process.env.NODE_ENV === 'development',
  };

  const client = new LLMObservability(config);
  client.initialize();
  return client;
}

// Export singleton instance
export const llmObservability = createObservabilityClient();

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
