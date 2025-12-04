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

// =============================================================================
// Configuration
// =============================================================================

export interface AnalyticsPlatformConfig {
  primaryEndpoint: string;
  halfAnalyticsEndpoint: string;
  multiAnalyticsEndpoint: string;
  apiKey?: string;
  timeout?: number;
  retryAttempts?: number;
}

const DEFAULT_CONFIG: AnalyticsPlatformConfig = {
  primaryEndpoint: 'https://analytics.interface.tag.ooo',
  halfAnalyticsEndpoint: 'https://half.masslessmassive.com',
  multiAnalyticsEndpoint: 'https://multi.masslessmassive.com',
  timeout: 10000,
  retryAttempts: 3,
};

// =============================================================================
// Types
// =============================================================================

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

// =============================================================================
// Analytics Platform Client
// =============================================================================

export class AnalyticsPlatformClient extends EventEmitter {
  private config: AnalyticsPlatformConfig;
  private eventQueue: AnalyticsEvent[] = [];
  private healthStatus: Map<string, PlatformHealth> = new Map();
  private metricsCache: Map<string, AffiliateMetrics[]> = new Map();

  constructor(config: Partial<AnalyticsPlatformConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializeHealthChecks();
  }

  private initializeHealthChecks(): void {
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

  async trackEvent(event: AnalyticsEvent): Promise<boolean> {
    this.eventQueue.push(event);
    this.emit('event:queued', event);

    try {
      await this.sendToAllPlatforms(event);
      this.emit('event:sent', event);
      return true;
    } catch (error) {
      this.emit('event:failed', { event, error });
      return false;
    }
  }

  async trackAffiliateMetrics(metrics: AffiliateMetrics): Promise<boolean> {
    const event: AnalyticsEvent = {
      eventId: `aff_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      eventType: 'affiliate',
      source: 'affiliate_tracker',
      timestamp: new Date(),
      data: metrics as unknown as Record<string, unknown>,
    };

    const existing = this.metricsCache.get(metrics.affiliateId) || [];
    existing.push(metrics);
    this.metricsCache.set(metrics.affiliateId, existing.slice(-100)); // Keep last 100

    return this.trackEvent(event);
  }

  async trackSystemMetrics(metrics: SystemMetrics): Promise<boolean> {
    const event: AnalyticsEvent = {
      eventId: `sys_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      eventType: 'system',
      source: 'system_monitor',
      timestamp: new Date(),
      data: metrics as unknown as Record<string, unknown>,
    };
    return this.trackEvent(event);
  }

  // ===========================================================================
  // Platform Communication
  // ===========================================================================

  private async sendToAllPlatforms(event: AnalyticsEvent): Promise<void> {
    const platforms = [
      { name: 'primary', endpoint: this.config.primaryEndpoint },
      { name: 'half', endpoint: this.config.halfAnalyticsEndpoint },
      { name: 'multi', endpoint: this.config.multiAnalyticsEndpoint },
    ];

    await Promise.allSettled(
      platforms.map(p => this.sendToPlatform(p.name, p.endpoint, event))
    );
  }

  private async sendToPlatform(name: string, endpoint: string, event: AnalyticsEvent): Promise<void> {
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
    } catch (error) {
      this.healthStatus.set(name, {
        platform: name,
        status: 'degraded',
        latencyMs: Date.now() - startTime,
        lastCheck: new Date(),
        errorMessage: (error as Error).message,
      });
      throw error;
    }
  }

  private async simulateSend(endpoint: string, event: AnalyticsEvent): Promise<void> {
    // Simulate network latency
    await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
  }

  // ===========================================================================
  // Health Monitoring
  // ===========================================================================

  async checkHealth(): Promise<PlatformHealth[]> {
    const platforms = [
      { name: 'primary', endpoint: this.config.primaryEndpoint },
      { name: 'half', endpoint: this.config.halfAnalyticsEndpoint },
      { name: 'multi', endpoint: this.config.multiAnalyticsEndpoint },
    ];

    const results: PlatformHealth[] = [];

    for (const platform of platforms) {
      const startTime = Date.now();
      try {
        await this.pingPlatform(platform.endpoint);
        const health: PlatformHealth = {
          platform: platform.name,
          status: 'healthy',
          latencyMs: Date.now() - startTime,
          lastCheck: new Date(),
        };
        this.healthStatus.set(platform.name, health);
        results.push(health);
      } catch (error) {
        const health: PlatformHealth = {
          platform: platform.name,
          status: 'offline',
          latencyMs: Date.now() - startTime,
          lastCheck: new Date(),
          errorMessage: (error as Error).message,
        };
        this.healthStatus.set(platform.name, health);
        results.push(health);
      }
    }

    return results;
  }

  private async pingPlatform(endpoint: string): Promise<void> {
    // Simulate ping - in production, use fetch with HEAD request
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  getHealthStatus(): Map<string, PlatformHealth> {
    return new Map(this.healthStatus);
  }

  // ===========================================================================
  // Data Aggregation
  // ===========================================================================

  getAffiliateMetrics(affiliateId: string): AffiliateMetrics[] {
    return this.metricsCache.get(affiliateId) || [];
  }

  getRecentEvents(limit: number = 100): AnalyticsEvent[] {
    return this.eventQueue.slice(-limit);
  }

  async aggregateMetrics(period: 'daily' | 'weekly' | 'monthly'): Promise<Record<string, unknown>> {
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

  analyzeTrends(affiliateId: string): { trend: 'up' | 'down' | 'stable'; change: number } {
    const metrics = this.getAffiliateMetrics(affiliateId);
    if (metrics.length < 2) return { trend: 'stable', change: 0 };

    const recent = metrics.slice(-5);
    const older = metrics.slice(-10, -5);

    if (recent.length === 0 || older.length === 0) return { trend: 'stable', change: 0 };

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

export function createAnalyticsPlatformClient(
  config?: Partial<AnalyticsPlatformConfig>
): AnalyticsPlatformClient {
  return new AnalyticsPlatformClient(config);
}

export function getAnalyticsConfigFromEnv(): Partial<AnalyticsPlatformConfig> {
  return {
    primaryEndpoint: process.env.ANALYTICS_PRIMARY_ENDPOINT || DEFAULT_CONFIG.primaryEndpoint,
    halfAnalyticsEndpoint: process.env.ANALYTICS_HALF_ENDPOINT || DEFAULT_CONFIG.halfAnalyticsEndpoint,
    multiAnalyticsEndpoint: process.env.ANALYTICS_MULTI_ENDPOINT || DEFAULT_CONFIG.multiAnalyticsEndpoint,
    apiKey: process.env.ANALYTICS_API_KEY,
  };
}
