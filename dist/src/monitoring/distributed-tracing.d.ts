import { SpanKind } from '@opentelemetry/api';
import { EventEmitter } from 'events';
export interface TracingConfig {
    serviceName: string;
    serviceVersion: string;
    environment: string;
    endpoint: string;
    sampleRate?: number;
    enableAutoInstrumentation?: boolean;
}
export interface SpanOptions {
    name: string;
    kind?: SpanKind;
    attributes?: Record<string, string | number | boolean>;
    parentSpan?: any;
}
export declare class DistributedTracing {
    private config;
    private eventBus;
    private sdk;
    constructor(config: TracingConfig, eventBus: EventEmitter);
    private initializeTracing;
    createSpan(options: SpanOptions): any;
    withSpan<T>(options: SpanOptions, fn: (span: any) => Promise<T>): Promise<T>;
    withSpanSync<T>(options: SpanOptions, fn: (span: any) => T): T;
    traceAgentActivity(agentId: string, agentType: string, taskType: string, taskData: any, fn: (span: any) => Promise<any>): Promise<any>;
    traceDiscordActivity(eventType: string, guildId: string, channelId: string, userId: string, command?: string, fn: (span: any) => Promise<any>): Promise<any>;
    traceTradingActivity(symbol: string, orderType: string, orderData: any, fn: (span: any) => Promise<any>): Promise<any>;
    tracePaymentActivity(paymentId: string, amount: number, currency: string, method: string, fn: (span: any) => Promise<any>): Promise<any>;
    traceGovernanceActivity(decisionType: string, context: any, fn: (span: any) => Promise<any>): Promise<any>;
    traceHttpRequest(method: string, url: string, headers: Record<string, string>, fn: (span: any) => Promise<any>): Promise<any>;
    traceDatabaseOperation(operation: string, table: string, query?: string, fn: (span: any) => Promise<any>): Promise<any>;
    traceCacheOperation(operation: 'get' | 'set' | 'delete' | 'clear', key: string, fn: (span: any) => Promise<any>): Promise<any>;
    traceExternalCall(serviceName: string, operation: string, endpoint: string, fn: (span: any) => Promise<any>): Promise<any>;
    traceMessageQueue(queueName: string, operation: 'publish' | 'consume', messageId?: string, fn: (span: any) => Promise<any>): Promise<any>;
    addEvent(eventName: string, attributes?: Record<string, any>): void;
    setAttribute(key: string, value: string | number | boolean): void;
    getCurrentTraceId(): string | undefined;
    getCurrentSpanId(): string | undefined;
    injectTraceContext(headers: Record<string, string>): Record<string, string>;
    extractTraceContext(headers: Record<string, string>): any;
    private getInstanceId;
    private getHeaders;
    private getSampler;
    shutdown(): Promise<void>;
}
export default DistributedTracing;
//# sourceMappingURL=distributed-tracing.d.ts.map