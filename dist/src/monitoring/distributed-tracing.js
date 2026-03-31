// @ts-nocheck
import { trace, context, SpanKind, SpanStatusCode } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
export class DistributedTracing {
    config;
    eventBus;
    sdk = null;
    constructor(config, eventBus) {
        this.config = {
            sampleRate: 1.0,
            enableAutoInstrumentation: true,
            ...config
        };
        this.eventBus = eventBus;
        this.initializeTracing();
    }
    initializeTracing() {
        try {
            // Create resource with service information
            // @ts-expect-error - Type incompatibility requires refactoring
            // @ts-expect-error - OpenTelemetry type issue
            const resource = new Resource({
                [SemanticResourceAttributes.SERVICE_NAME]: this.config.serviceName,
                [SemanticResourceAttributes.SERVICE_VERSION]: this.config.serviceVersion,
                [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: this.config.environment,
                'service.instance.id': this.getInstanceId(),
                'service.namespace': 'agentic-flow'
            });
            // Create trace exporter
            const traceExporter = new OTLPTraceExporter({
                url: `${this.config.endpoint}/v1/traces`,
                headers: this.getHeaders()
            });
            // Initialize SDK
            this.sdk = new NodeSDK({
                resource,
                traceExporter,
                instrumentations: this.config.enableAutoInstrumentation ? getNodeAutoInstrumentations() : [],
                sampler: this.getSampler()
            });
            this.sdk.start();
            console.log(`Distributed tracing initialized for ${this.config.serviceName}`);
        }
        catch (error) {
            console.error('Failed to initialize distributed tracing:', error);
        }
    }
    // Create a new span
    createSpan(options) {
        const tracer = trace.getTracer(this.config.serviceName, this.config.serviceVersion);
        const spanOptions = {
            kind: options.kind || SpanKind.INTERNAL,
            attributes: {
                ...options.attributes,
                'service.name': this.config.serviceName,
                'service.version': this.config.serviceVersion,
                'environment': this.config.environment
            }
        };
        if (options.parentSpan) {
            spanOptions.parent = options.parentSpan;
        }
        return tracer.startSpan(options.name, spanOptions);
    }
    // Execute function within a span
    async withSpan(options, fn) {
        const span = this.createSpan(options);
        try {
            const result = await fn(span);
            span.setStatus({ code: SpanStatusCode.OK });
            return result;
        }
        catch (error) {
            span.setStatus({
                code: SpanStatusCode.ERROR,
                message: error instanceof Error ? error.message : 'Unknown error'
            });
            span.recordException(error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
        finally {
            span.end();
        }
    }
    // Execute synchronous function within a span
    withSpanSync(options, fn) {
        const span = this.createSpan(options);
        try {
            const result = fn(span);
            span.setStatus({ code: SpanStatusCode.OK });
            return result;
        }
        catch (error) {
            span.setStatus({
                code: SpanStatusCode.ERROR,
                message: error instanceof Error ? error.message : 'Unknown error'
            });
            span.recordException(error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
        finally {
            span.end();
        }
    }
    // Agent activity tracing
    async traceAgentActivity(agentId, agentType, taskType, taskData, fn) {
        return this.withSpan({
            name: 'agent.activity',
            kind: SpanKind.SERVER,
            attributes: {
                'agent.id': agentId,
                'agent.type': agentType,
                'task.type': taskType,
                'task.data': JSON.stringify(taskData),
                'component': 'agent-system'
            }
        }, fn);
    }
    // Discord activity tracing
    async traceDiscordActivity(eventType, guildId, channelId, userId, command, fn) {
        return this.withSpan({
            name: 'discord.activity',
            kind: SpanKind.SERVER,
            attributes: {
                'discord.event_type': eventType,
                'discord.guild_id': guildId,
                'discord.channel_id': channelId,
                'discord.user_id': userId,
                'discord.command': command || 'unknown',
                'component': 'discord-bot'
            }
        }, fn);
    }
    // Trading activity tracing
    async traceTradingActivity(symbol, orderType, orderData, fn) {
        return this.withSpan({
            name: 'trading.activity',
            kind: SpanKind.SERVER,
            attributes: {
                'trading.symbol': symbol,
                'trading.order_type': orderType,
                'trading.order_data': JSON.stringify(orderData),
                'component': 'trading-engine'
            }
        }, fn);
    }
    // Payment activity tracing
    async tracePaymentActivity(paymentId, amount, currency, method, fn) {
        return this.withSpan({
            name: 'payment.activity',
            kind: SpanKind.SERVER,
            attributes: {
                'payment.id': paymentId,
                'payment.amount': amount,
                'payment.currency': currency,
                'payment.method': method,
                'component': 'payment-system'
            }
        }, fn);
    }
    // Governance activity tracing
    async traceGovernanceActivity(decisionType, context, fn) {
        return this.withSpan({
            name: 'governance.activity',
            kind: SpanKind.SERVER,
            attributes: {
                'governance.decision_type': decisionType,
                'governance.context': JSON.stringify(context),
                'component': 'governance-system'
            }
        }, fn);
    }
    // HTTP request tracing
    async traceHttpRequest(method, url, headers, fn) {
        return this.withSpan({
            name: `http.${method.toLowerCase()}`,
            kind: SpanKind.SERVER,
            attributes: {
                'http.method': method,
                'http.url': url,
                'http.user_agent': headers['user-agent'] || 'unknown',
                'component': 'http-server'
            }
        }, async (span) => {
            const result = await fn(span);
            // Add response attributes
            if (result && result.statusCode) {
                span.setAttributes({
                    'http.status_code': result.statusCode,
                    'http.status_text': result.statusText || 'Unknown'
                });
            }
            return result;
        });
    }
    // Database operation tracing
    async traceDatabaseOperation(operation, table, query, fn) {
        return this.withSpan({
            name: `db.${operation}`,
            kind: SpanKind.CLIENT,
            attributes: {
                'db.operation': operation,
                'db.table': table,
                'db.query': query || 'unknown',
                'db.system': 'postgresql',
                'component': 'database'
            }
        }, fn);
    }
    // Cache operation tracing
    async traceCacheOperation(operation, key, fn) {
        return this.withSpan({
            name: `cache.${operation}`,
            kind: SpanKind.CLIENT,
            attributes: {
                'cache.operation': operation,
                'cache.key': key,
                'cache.system': 'redis',
                'component': 'cache'
            }
        }, fn);
    }
    // External API call tracing
    async traceExternalCall(serviceName, operation, endpoint, fn) {
        return this.withSpan({
            name: `external.${serviceName}.${operation}`,
            kind: SpanKind.CLIENT,
            attributes: {
                'external.service': serviceName,
                'external.operation': operation,
                'external.endpoint': endpoint,
                'component': 'external-api'
            }
        }, fn);
    }
    // Message queue operation tracing
    async traceMessageQueue(queueName, operation, messageId, fn) {
        return this.withSpan({
            name: `queue.${operation}`,
            kind: SpanKind.PRODUCER,
            attributes: {
                'queue.name': queueName,
                'queue.operation': operation,
                'queue.message_id': messageId || 'unknown',
                'queue.system': 'redis',
                'component': 'message-queue'
            }
        }, fn);
    }
    // Add custom event to current span
    addEvent(eventName, attributes) {
        const currentSpan = trace.getActiveSpan();
        if (currentSpan) {
            currentSpan.addEvent(eventName, {
                attributes: {
                    ...attributes,
                    'timestamp': Date.now()
                }
            });
        }
    }
    // Set custom attribute to current span
    setAttribute(key, value) {
        const currentSpan = trace.getActiveSpan();
        if (currentSpan) {
            currentSpan.setAttribute(key, value);
        }
    }
    // Get current trace context
    getCurrentTraceId() {
        const currentSpan = trace.getActiveSpan();
        if (currentSpan) {
            const spanContext = currentSpan.spanContext();
            return spanContext.traceId;
        }
        return undefined;
    }
    // Get current span ID
    getCurrentSpanId() {
        const currentSpan = trace.getActiveSpan();
        if (currentSpan) {
            const spanContext = currentSpan.spanContext();
            return spanContext.spanId;
        }
        return undefined;
    }
    // Inject trace context into headers
    injectTraceContext(headers) {
        const activeContext = context.active();
        if (activeContext) {
            // This would use the appropriate propagation format
            // For simplicity, we'll use traceparent header format
            const spanContext = trace.getSpan(activeContext)?.spanContext();
            if (spanContext) {
                headers['traceparent'] = `00-${spanContext.traceId}-${spanContext.spanId}-${spanContext.traceFlags.toString(16).padStart(2, '0')}`;
            }
        }
        return headers;
    }
    // Extract trace context from headers
    extractTraceContext(headers) {
        const traceparent = headers['traceparent'] || headers['traceparent'];
        if (traceparent) {
            // Parse traceparent header
            const parts = traceparent.split('-');
            if (parts.length === 4) {
                return {
                    traceId: parts[1],
                    spanId: parts[2],
                    traceFlags: parseInt(parts[3], 16)
                };
            }
        }
        return null;
    }
    // Utility methods
    getInstanceId() {
        // Generate or retrieve instance ID
        if (process.env.INSTANCE_ID) {
            return process.env.INSTANCE_ID;
        }
        // Generate a unique instance ID
        return `${this.config.serviceName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    getHeaders() {
        const headers = {};
        if (process.env.OTEL_EXPORTER_OTLP_HEADERS) {
            const headerPairs = process.env.OTEL_EXPORTER_OTLP_HEADERS.split(',');
            headerPairs.forEach(pair => {
                const [key, value] = pair.split('=');
                if (key && value) {
                    headers[key.trim()] = value.trim();
                }
            });
        }
        return headers;
    }
    getSampler() {
        // Return appropriate sampler based on configuration
        if (this.config.sampleRate && this.config.sampleRate < 1.0) {
            // Would use TraceIdRatioSampler in real implementation
            return {
                shouldSample: () => Math.random() < this.config.sampleRate
            };
        }
        // Always on sampler
        return {
            shouldSample: () => true
        };
    }
    // Shutdown tracing
    async shutdown() {
        if (this.sdk) {
            try {
                await this.sdk.shutdown();
                console.log('Distributed tracing shutdown completed');
            }
            catch (error) {
                console.error('Error shutting down distributed tracing:', error);
            }
        }
    }
}
export default DistributedTracing;
//# sourceMappingURL=distributed-tracing.js.map