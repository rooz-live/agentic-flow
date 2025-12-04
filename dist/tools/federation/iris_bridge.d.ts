#!/usr/bin/env ts-node
/**
 * Enterprise-Grade IRIS Bridge Module
 *
 * This module provides a resilient TypeScript bridge that captures IRIS CLI outputs
 * and writes structured events to .goalie/metrics_log.jsonl with enterprise-grade
 * reliability, security, and observability features.
 */
import { EventEmitter } from 'events';
import type { IrisBridgeConfig, IrisCaptureOptions, IrisMetricsEvent, IrisPerformanceMetrics, IrisCircuitBreakerMetrics, IrisResourceMetrics, IrisCommandRunner, IrisMiddleware, IrisPlugin } from './iris_types.js';
export declare class EnterpriseIrisBridge extends EventEmitter {
    private config;
    private circuitBreaker;
    private retryStrategy;
    private resourcePool;
    private activeCommands;
    private metricsHistory;
    private plugins;
    private middleware;
    private correlationIdMap;
    private executionCount;
    constructor(config?: Partial<IrisBridgeConfig>);
    private initializeEnterpriseFeatures;
    private setupConfigWatcher;
    private reinitializeEnterpriseFeatures;
    private createCircuitBreaker;
    private createRetryStrategy;
    private createResourcePool;
    captureIrisMetrics(command: string, args?: string[], options?: IrisCaptureOptions): Promise<IrisMetricsEvent>;
    addPlugin(plugin: IrisPlugin): Promise<void>;
    addMiddleware(middleware: IrisMiddleware): void;
    getMetrics(): IrisPerformanceMetrics[];
    getCircuitBreakerStatus(): IrisCircuitBreakerMetrics;
    getResourcePoolStatus(): IrisResourceMetrics;
    private executeWithEnterpriseFeatures;
    private executeWithRetry;
    private executeWithCircuitBreaker;
    private executeCommandWithMonitoring;
    private executeIrisCommand;
    private acquireResource;
    private releaseResource;
    private updateResourceMetrics;
    private validateCommand;
    private sanitizeInput;
    private createMetricsEvent;
    private createErrorMetricsEvent;
    private generateCorrelationId;
    private generateExecutionId;
    private generateTraceId;
    private calculateRetryDelay;
    private sleep;
    private canExecuteCommand;
    private shouldAllowHalfOpenCall;
    private recordCircuitBreakerSuccess;
    private recordCircuitBreakerFailure;
    private updatePerformanceMetrics;
    private updateCircuitBreakerMetrics;
    private getLatestPerformanceMetrics;
    private getCommandPriority;
    private applyMiddleware;
    private applyMiddlewareItem;
    private startDistributedTrace;
    private endDistributedTrace;
    private parseIrisOutput;
    private extractStructuredDataFromText;
    private resolveCircles;
    private resolveActions;
    private buildProductionMaturity;
    private resolveExecutionContext;
    private createGovernanceMetrics;
    private createErrorProductionMaturity;
    private createResourceAllocation;
    private writeMetricsEvent;
    private logDebug;
    private logInfo;
    private logWarn;
    private logError;
}
export declare function captureIrisMetrics(command: string, args?: string[], options?: IrisCaptureOptions): Promise<IrisMetricsEvent>;
export declare function __setCommandRunner(runner: IrisCommandRunner | null): void;
export declare function __resetIrisBridgeCache(): Promise<void>;
export declare function isIrisMetricsEnabled(): boolean;
//# sourceMappingURL=iris_bridge.d.ts.map