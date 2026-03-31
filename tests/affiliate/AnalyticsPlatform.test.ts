/**
 * Analytics Platform Integration Tests
 */

import {
  AnalyticsPlatformClient,
  AnalyticsEvent,
  AffiliateMetrics,
  SystemMetrics,
  createAnalyticsPlatformClient,
  getAnalyticsConfigFromEnv,
} from '../../src/integrations/analytics_platform';

describe('AnalyticsPlatformClient', () => {
  let client: AnalyticsPlatformClient;

  beforeEach(() => {
    client = new AnalyticsPlatformClient({
      primaryEndpoint: 'https://analytics.interface.tag.ooo',
      halfAnalyticsEndpoint: 'https://half.masslessmassive.com',
      multiAnalyticsEndpoint: 'https://multi.masslessmassive.com',
    });
  });

  describe('Event Tracking', () => {
    it('should track analytics events', async () => {
      const event: AnalyticsEvent = {
        eventId: 'test-event-1',
        eventType: 'affiliate',
        source: 'test',
        timestamp: new Date(),
        data: { affiliateId: 'aff-123', action: 'signup' },
      };

      const result = await client.trackEvent(event);
      expect(result).toBe(true);
    });

    it('should track affiliate metrics', async () => {
      const metrics: AffiliateMetrics = {
        affiliateId: 'aff-123',
        revenue: 5000,
        referrals: 25,
        conversionRate: 0.15,
        activityScore: 0.8,
        tier: 'premium',
        riskScore: 0.1,
        period: 'monthly',
        timestamp: new Date(),
      };

      const result = await client.trackAffiliateMetrics(metrics);
      expect(result).toBe(true);

      const storedMetrics = client.getAffiliateMetrics('aff-123');
      expect(storedMetrics.length).toBe(1);
      expect(storedMetrics[0].revenue).toBe(5000);
    });

    it('should track system metrics', async () => {
      const metrics: SystemMetrics = {
        midstreamerThroughput: 10000,
        agentDbAccuracy: 0.95,
        apiUptime: 99.9,
        webhookSuccessRate: 0.98,
        avgLatencyMs: 5,
        timestamp: new Date(),
      };

      const result = await client.trackSystemMetrics(metrics);
      expect(result).toBe(true);
    });

    it('should emit events when tracking', async () => {
      const events: string[] = [];
      client.on('event:queued', () => events.push('queued'));
      client.on('event:sent', () => events.push('sent'));

      await client.trackEvent({
        eventId: 'test-2',
        eventType: 'system',
        source: 'test',
        timestamp: new Date(),
        data: {},
      });

      expect(events).toContain('queued');
      expect(events).toContain('sent');
    });
  });

  describe('Health Monitoring', () => {
    it('should check platform health', async () => {
      const health = await client.checkHealth();
      expect(health.length).toBe(3);
      expect(health.every(h => h.status === 'healthy')).toBe(true);
    });

    it('should track latency in health checks', async () => {
      const health = await client.checkHealth();
      health.forEach(h => {
        expect(h.latencyMs).toBeGreaterThanOrEqual(0);
        expect(h.lastCheck).toBeInstanceOf(Date);
      });
    });

    it('should return health status map', () => {
      const status = client.getHealthStatus();
      expect(status.size).toBe(3);
      expect(status.has('primary')).toBe(true);
      expect(status.has('half')).toBe(true);
      expect(status.has('multi')).toBe(true);
    });
  });

  describe('Data Aggregation', () => {
    it('should aggregate metrics', async () => {
      // Add some metrics
      for (let i = 0; i < 5; i++) {
        await client.trackAffiliateMetrics({
          affiliateId: `aff-${i}`,
          revenue: 1000 * (i + 1),
          referrals: 10 * (i + 1),
          conversionRate: 0.1 + i * 0.02,
          activityScore: 0.5 + i * 0.1,
          tier: 'standard',
          riskScore: 0.1,
          period: 'monthly',
          timestamp: new Date(),
        });
      }

      const aggregated = await client.aggregateMetrics('monthly');
      expect(aggregated.totalAffiliates).toBe(5);
      expect(aggregated.totalRevenue).toBe(15000); // 1000+2000+3000+4000+5000
      expect(aggregated.period).toBe('monthly');
    });

    it('should return recent events', async () => {
      for (let i = 0; i < 10; i++) {
        await client.trackEvent({
          eventId: `event-${i}`,
          eventType: 'affiliate',
          source: 'test',
          timestamp: new Date(),
          data: { index: i },
        });
      }

      const recent = client.getRecentEvents(5);
      expect(recent.length).toBe(5);
    });
  });

  describe('Trend Analysis', () => {
    it('should analyze affiliate trends', async () => {
      // Add metrics with increasing revenue
      for (let i = 0; i < 10; i++) {
        await client.trackAffiliateMetrics({
          affiliateId: 'aff-trend',
          revenue: 1000 + i * 200,
          referrals: 10,
          conversionRate: 0.15,
          activityScore: 0.8,
          tier: 'premium',
          riskScore: 0.1,
          period: 'daily',
          timestamp: new Date(),
        });
      }

      const trend = client.analyzeTrends('aff-trend');
      expect(['up', 'down', 'stable']).toContain(trend.trend);
      expect(typeof trend.change).toBe('number');
    });

    it('should return stable for insufficient data', () => {
      const trend = client.analyzeTrends('nonexistent');
      expect(trend.trend).toBe('stable');
      expect(trend.change).toBe(0);
    });
  });

  describe('Factory Functions', () => {
    it('should create client with factory function', () => {
      const factoryClient = createAnalyticsPlatformClient();
      expect(factoryClient).toBeInstanceOf(AnalyticsPlatformClient);
    });

    it('should get config from environment', () => {
      const config = getAnalyticsConfigFromEnv();
      expect(config.primaryEndpoint).toBeDefined();
      expect(config.halfAnalyticsEndpoint).toBeDefined();
      expect(config.multiAnalyticsEndpoint).toBeDefined();
    });
  });
});

