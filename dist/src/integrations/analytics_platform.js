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
const DEFAULT_CONFIG = {
    primaryEndpoint: 'https://analytics.interface.tag.ooo',
    halfAnalyticsEndpoint: 'https://half.masslessmassive.com',
    multiAnalyticsEndpoint: 'https://multi.masslessmassive.com',
    timeout: 10000,
    retryAttempts: 3,
};
// =============================================================================
// Analytics Platform Client
// =============================================================================
export class AnalyticsPlatformClient extends EventEmitter {
    config;
    eventQueue = [];
    healthStatus = new Map();
    metricsCache = new Map();
    constructor(config = {}) {
        super();
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.initializeHealthChecks();
    }
    initializeHealthChecks() {
        const platforms = [
            { name: 'primary', endpoint: this.config.primaryEndpoint },
            { name: 'half', endpoint: this.config.halfAnalyticsEndpoint },
            { name: 'multi', endpoint: this.config.multiAnalyticsEndpoint },
        ];
        platforms.forEach(p => {
            this.healthStatus.set(p.name, {
                platform: p.name,
                status: 'healthy', // Assume healthy until proven otherwise
                latencyMs: 0,
                lastCheck: new Date(),
            });
        });
    }
    // ===========================================================================
    // Event Tracking
    // ===========================================================================
    async trackEvent(event) {
        this.eventQueue.push(event);
        this.emit('event:queued', event);
        try {
            await this.sendToAllPlatforms(event);
            this.emit('event:sent', event);
            return true;
        }
        catch (error) {
            this.emit('event:failed', { event, error });
            return false;
        }
    }
    async trackAffiliateMetrics(metrics) {
        const event = {
            eventId: `aff_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            eventType: 'affiliate',
            source: 'affiliate_tracker',
            timestamp: new Date(),
            data: metrics,
        };
        const existing = this.metricsCache.get(metrics.affiliateId) || [];
        existing.push(metrics);
        this.metricsCache.set(metrics.affiliateId, existing.slice(-100)); // Keep last 100
        return this.trackEvent(event);
    }
    async trackSystemMetrics(metrics) {
        const event = {
            eventId: `sys_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            eventType: 'system',
            source: 'system_monitor',
            timestamp: new Date(),
            data: metrics,
        };
        return this.trackEvent(event);
    }
    // ===========================================================================
    // Platform Communication
    // ===========================================================================
    async sendToAllPlatforms(event) {
        const platforms = [
            { name: 'primary', endpoint: this.config.primaryEndpoint },
            { name: 'half', endpoint: this.config.halfAnalyticsEndpoint },
            { name: 'multi', endpoint: this.config.multiAnalyticsEndpoint },
        ];
        await Promise.allSettled(platforms.map(p => this.sendToPlatform(p.name, p.endpoint, event)));
    }
    async sendToPlatform(name, endpoint, event) {
        const startTime = Date.now();
        try {
            // In production, use fetch to send to actual endpoint
            // For now, simulate successful send
            await this.simulateSend(endpoint, event);
            this.healthStatus.set(name, {
                platform: name,
                status: 'healthy',
                latencyMs: Date.now() - startTime,
                lastCheck: new Date(),
            });
        }
        catch (error) {
            this.healthStatus.set(name, {
                platform: name,
                status: 'degraded',
                latencyMs: Date.now() - startTime,
                lastCheck: new Date(),
                errorMessage: error.message,
            });
            throw error;
        }
    }
    async simulateSend(endpoint, event) {
        // Simulate network latency
        await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
    }
    // ===========================================================================
    // Health Monitoring
    // ===========================================================================
    async checkHealth() {
        const platforms = [
            { name: 'primary', endpoint: this.config.primaryEndpoint },
            { name: 'half', endpoint: this.config.halfAnalyticsEndpoint },
            { name: 'multi', endpoint: this.config.multiAnalyticsEndpoint },
        ];
        const results = [];
        for (const platform of platforms) {
            const startTime = Date.now();
            try {
                await this.pingPlatform(platform.endpoint);
                const health = {
                    platform: platform.name,
                    status: 'healthy',
                    latencyMs: Date.now() - startTime,
                    lastCheck: new Date(),
                };
                this.healthStatus.set(platform.name, health);
                results.push(health);
            }
            catch (error) {
                const health = {
                    platform: platform.name,
                    status: 'offline',
                    latencyMs: Date.now() - startTime,
                    lastCheck: new Date(),
                    errorMessage: error.message,
                };
                this.healthStatus.set(platform.name, health);
                results.push(health);
            }
        }
        return results;
    }
    async pingPlatform(endpoint) {
        // Simulate ping - in production, use fetch with HEAD request
        await new Promise(resolve => setTimeout(resolve, 10));
    }
    getHealthStatus() {
        return new Map(this.healthStatus);
    }
    // ===========================================================================
    // Data Aggregation
    // ===========================================================================
    getAffiliateMetrics(affiliateId) {
        return this.metricsCache.get(affiliateId) || [];
    }
    getRecentEvents(limit = 100) {
        return this.eventQueue.slice(-limit);
    }
    async aggregateMetrics(period) {
        const allMetrics = Array.from(this.metricsCache.values()).flat();
        return {
            totalAffiliates: this.metricsCache.size,
            totalRevenue: allMetrics.reduce((sum, m) => sum + m.revenue, 0),
            avgConversionRate: allMetrics.length > 0
                ? allMetrics.reduce((sum, m) => sum + m.conversionRate, 0) / allMetrics.length
                : 0,
            avgActivityScore: allMetrics.length > 0
                ? allMetrics.reduce((sum, m) => sum + m.activityScore, 0) / allMetrics.length
                : 0,
            period,
            generatedAt: new Date(),
        };
    }
    // ===========================================================================
    // Trend Analysis
    // ===========================================================================
    analyzeTrends(affiliateId) {
        const metrics = this.getAffiliateMetrics(affiliateId);
        if (metrics.length < 2)
            return { trend: 'stable', change: 0 };
        const recent = metrics.slice(-5);
        const older = metrics.slice(-10, -5);
        if (recent.length === 0 || older.length === 0)
            return { trend: 'stable', change: 0 };
        const recentAvg = recent.reduce((sum, m) => sum + m.revenue, 0) / recent.length;
        const olderAvg = older.reduce((sum, m) => sum + m.revenue, 0) / older.length;
        const change = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;
        return {
            trend: change > 5 ? 'up' : change < -5 ? 'down' : 'stable',
            change: Math.round(change * 100) / 100,
        };
    }
}
// =============================================================================
// Factory Functions
// =============================================================================
export function createAnalyticsPlatformClient(config) {
    return new AnalyticsPlatformClient(config);
}
export function getAnalyticsConfigFromEnv() {
    return {
        primaryEndpoint: process.env.ANALYTICS_PRIMARY_ENDPOINT || DEFAULT_CONFIG.primaryEndpoint,
        halfAnalyticsEndpoint: process.env.ANALYTICS_HALF_ENDPOINT || DEFAULT_CONFIG.halfAnalyticsEndpoint,
        multiAnalyticsEndpoint: process.env.ANALYTICS_MULTI_ENDPOINT || DEFAULT_CONFIG.multiAnalyticsEndpoint,
        apiKey: process.env.ANALYTICS_API_KEY,
    };
}
//# sourceMappingURL=analytics_platform.js.map