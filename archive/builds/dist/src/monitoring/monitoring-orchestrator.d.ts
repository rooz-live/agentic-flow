import { LogLevel } from './centralized-logging';
export interface MonitoringOrchestratorConfig {
    service: {
        name: string;
        version: string;
        environment: string;
    };
    metrics: {
        enabled: boolean;
        provider: 'prometheus' | 'otel' | 'custom';
        endpoint?: string;
        sampleRate?: number;
    };
    tracing: {
        enabled: boolean;
        provider: 'jaeger' | 'otel' | 'zipkin';
        endpoint?: string;
        sampleRate?: number;
    };
    logging: {
        enabled: boolean;
        level: LogLevel;
        provider: 'elk' | 'file' | 'console';
        endpoint?: string;
        structured: boolean;
    };
    security: {
        enabled: boolean;
        anomalyDetection: boolean;
        threatIntelligence: boolean;
    };
    automation: {
        enabled: boolean;
        selfHealing: boolean;
    };
    healthChecks: Array<{
        name: string;
        endpoint: string;
        interval: number;
        timeout: number;
    }>;
}
export declare class MonitoringOrchestrator {
    private config;
    private eventBus;
    private baseMetrics;
    private enhancedMetrics;
    private tracing;
    private logging;
    private security;
    private automation;
    private isInitialized;
    constructor(config: MonitoringOrchestratorConfig);
    private initialize;
    private createMetricsProvider;
    private setupCrossComponentIntegration;
    private setupHTTPMiddleware;
    private createHTTPMiddleware;
    private getDefaultAutomationRules;
    private generateRequestId;
    start(): Promise<void>;
    private startBackgroundTasks;
    private performHealthChecks;
    private collectSystemMetrics;
    private performCleanup;
    recordAgentActivity(agentId: string, agentType: string, taskType: string, duration: number, success: boolean): void;
    recordDiscordActivity(eventType: string, command?: string, duration?: number, success?: boolean): void;
    recordTradingActivity(symbol: string, orderType: string, quantity: number, price: number, success: boolean): void;
    recordPaymentActivity(paymentId: string, amount: number, currency: string, method: string, success: boolean): void;
    recordGovernanceActivity(decisionType: string, duration: number, outcome: 'approved' | 'rejected' | 'escalated'): void;
    recordSecurityEvent(eventType: any, severity: any, source: string, details: any): void;
    recordBusinessMetric(metricName: string, value: number, unit?: string): void;
    traceAgentActivity(agentId: string, agentType: string, taskType: string, taskData: any, fn: any): Promise<any>;
    traceDiscordActivity(eventType: string, guildId: string, channelId: string, userId: string, command?: string, fn: any): Promise<any>;
    traceTradingActivity(symbol: string, orderType: string, orderData: any, fn: any): Promise<any>;
    tracePaymentActivity(paymentId: string, amount: number, currency: string, method: string, fn: any): Promise<any>;
    traceGovernanceActivity(decisionType: string, context: any, fn: any): Promise<any>;
    getHealthStatus(): {
        overall: 'healthy' | 'degraded' | 'unhealthy';
        components: Record<string, 'healthy' | 'degraded' | 'unhealthy'>;
        lastCheck: string;
    };
    getMetrics(): any;
    getSecurityStatus(): any;
    getAutomationStatus(): any;
    stop(): Promise<void>;
    updateConfig(updates: Partial<MonitoringOrchestratorConfig>): void;
    getConfig(): MonitoringOrchestratorConfig;
}
export default MonitoringOrchestrator;
//# sourceMappingURL=monitoring-orchestrator.d.ts.map