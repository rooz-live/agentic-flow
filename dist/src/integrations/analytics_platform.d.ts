/**
 * Analytics Platform Integration
 * @module integrations/analytics_platform
 *
 * Unified analytics integration for:
 * - analytics.interface.tag.ooo (Primary)
 * - half.masslessmassive.com (Half Analytics)
 * - multi.masslessmassive.com (Multi Analytics)
 */
import { EventEmitter } from 'events';
export interface AnalyticsPlatformConfig {
    primaryEndpoint: string;
    halfAnalyticsEndpoint: string;
    multiAnalyticsEndpoint: string;
    apiKey?: string;
    timeout?: number;
    retryAttempts?: number;
}
export interface AnalyticsEvent {
    eventId: string;
    eventType: 'affiliate' | 'transaction' | 'tier_change' | 'payout' | 'risk' | 'system';
    source: string;
    timestamp: Date;
    data: Record<string, unknown>;
    metadata?: Record<string, unknown>;
}
export interface AffiliateMetrics {
    affiliateId: string;
    revenue: number;
    referrals: number;
    conversionRate: number;
    activityScore: number;
    tier: string;
    riskScore: number;
    period: 'daily' | 'weekly' | 'monthly' | 'yearly';
    timestamp: Date;
}
export interface SystemMetrics {
    midstreamerThroughput: number;
    agentDbAccuracy: number;
    apiUptime: number;
    webhookSuccessRate: number;
    avgLatencyMs: number;
    timestamp: Date;
}
export interface PlatformHealth {
    platform: string;
    status: 'healthy' | 'degraded' | 'offline';
    latencyMs: number;
    lastCheck: Date;
    errorMessage?: string;
}
export declare class AnalyticsPlatformClient extends EventEmitter {
    private config;
    private eventQueue;
    private healthStatus;
    private metricsCache;
    constructor(config?: Partial<AnalyticsPlatformConfig>);
    private initializeHealthChecks;
    trackEvent(event: AnalyticsEvent): Promise<boolean>;
    trackAffiliateMetrics(metrics: AffiliateMetrics): Promise<boolean>;
    trackSystemMetrics(metrics: SystemMetrics): Promise<boolean>;
    private sendToAllPlatforms;
    private sendToPlatform;
    private simulateSend;
    checkHealth(): Promise<PlatformHealth[]>;
    private pingPlatform;
    getHealthStatus(): Map<string, PlatformHealth>;
    getAffiliateMetrics(affiliateId: string): AffiliateMetrics[];
    getRecentEvents(limit?: number): AnalyticsEvent[];
    aggregateMetrics(period: 'daily' | 'weekly' | 'monthly'): Promise<Record<string, unknown>>;
    analyzeTrends(affiliateId: string): {
        trend: 'up' | 'down' | 'stable';
        change: number;
    };
}
export declare function createAnalyticsPlatformClient(config?: Partial<AnalyticsPlatformConfig>): AnalyticsPlatformClient;
export declare function getAnalyticsConfigFromEnv(): Partial<AnalyticsPlatformConfig>;
//# sourceMappingURL=analytics_platform.d.ts.map