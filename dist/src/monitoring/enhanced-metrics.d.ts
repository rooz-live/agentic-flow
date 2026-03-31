import { Metrics } from '../notifications/metrics';
import { EventEmitter } from 'events';
export interface EnhancedMetricsConfig {
    service: string;
    version: string;
    environment: string;
    enableTracing?: boolean;
    enableProfiling?: boolean;
    customLabels?: Record<string, string>;
}
export declare class EnhancedMetrics implements Metrics {
    private baseMetrics;
    private config;
    private eventBus;
    private startTime;
    constructor(baseMetrics: Metrics, config: EnhancedMetricsConfig, eventBus: EventEmitter);
    private initializeMetrics;
    inc(name: string, value?: number, labels?: Record<string, string | number>): void;
    gauge(name: string, value: number, labels?: Record<string, string | number>): void;
    observe(name: string, value: number, labels?: Record<string, string | number>): void;
    recordHttpRequest(method: string, route: string, statusCode: number, duration: number): void;
    recordDatabaseQuery(operation: string, table: string, duration: number, success: boolean): void;
    recordCacheOperation(operation: 'hit' | 'miss' | 'set' | 'delete', key: string): void;
    recordAgentActivity(agentId: string, agentType: string, taskType: string, duration: number, success: boolean): void;
    recordDiscordActivity(eventType: string, command?: string, duration?: number, success?: boolean): void;
    recordTradingActivity(symbol: string, orderType: string, quantity: number, price: number, success: boolean): void;
    recordPaymentActivity(paymentId: string, amount: number, currency: string, method: string, success: boolean): void;
    recordGovernanceActivity(decisionType: string, duration: number, outcome: 'approved' | 'rejected' | 'escalated'): void;
    recordSecurityEvent(eventType: string, severity: 'low' | 'medium' | 'high' | 'critical', userId?: string): void;
    recordBusinessMetric(metricName: string, value: number, unit?: string): void;
    recordSystemHealth(component: string, status: 'healthy' | 'degraded' | 'unhealthy'): void;
    recordResourceUsage(resourceType: 'cpu' | 'memory' | 'disk' | 'network', usage: number, total: number): void;
    recordSLACompliance(serviceName: string, slaType: string, compliance: number): void;
    private getStatusClass;
    private getKeyPattern;
    recordHealthCheck(checkName: string, status: 'pass' | 'fail', duration: number): void;
    recordError(errorType: string, errorMessage: string, context?: Record<string, any>): void;
    startTimer(name: string, labels?: Record<string, string | number>): () => void;
    recordBatchOperation(operationType: string, itemCount: number, duration: number, success: boolean): void;
    recordCustomMetric(name: string, value: number, type: 'counter' | 'gauge' | 'histogram', labels?: Record<string, string | number>): void;
}
export default EnhancedMetrics;
//# sourceMappingURL=enhanced-metrics.d.ts.map