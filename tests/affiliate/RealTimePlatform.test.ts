/**
 * Real-Time Platform Integration Tests
 * Tests for RealTimePlatformHub, channels, metrics, and governance logging
 */

import {
  RealTimePlatformHub,
  RealTimeCircuitBreaker,
  createRealTimePlatformHub,
  getDefaultConfig,
  RealTimeConfig,
  RealTimeEvent,
} from '../../src/integrations/realtime_platform';

describe('RealTimePlatformHub', () => {
  let hub: RealTimePlatformHub;

  beforeEach(() => {
    hub = createRealTimePlatformHub({
      enableGovernanceLogging: false, // Disable file I/O in tests
    });
  });

  afterEach(() => {
    hub.stop();
  });

  describe('Initialization', () => {
    it('should create hub with default config', () => {
      expect(hub).toBeDefined();
      const config = getDefaultConfig();
      expect(config.targetThroughput).toBe(100000);
      expect(config.targetLatencyMs).toBe(5);
    });

    it('should initialize default channels', () => {
      const channels = hub.getChannels();
      expect(channels.length).toBe(5);
      expect(channels.map(c => c.channelId)).toContain('affiliate-events');
      expect(channels.map(c => c.channelId)).toContain('ml-training-events');
    });

    it('should start and stop correctly', () => {
      hub.start();
      expect(hub.isHealthy()).toBe(true);
      hub.stop();
    });
  });

  describe('Event Publishing', () => {
    beforeEach(() => {
      hub.start();
    });

    it('should publish event to channel', async () => {
      const eventId = await hub.publish('affiliate-events', {
        eventType: 'affiliate',
        source: 'midstreamer',
        payload: { affiliateId: 'aff-001', action: 'tier_change' },
      });

      expect(eventId).toMatch(/^rt-\d+-[a-z0-9]+$/);
    });

    it('should publish batch of events', async () => {
      const events = [
        { eventType: 'affiliate' as const, source: 'midstreamer' as const, payload: { id: 1 } },
        { eventType: 'affiliate' as const, source: 'midstreamer' as const, payload: { id: 2 } },
        { eventType: 'affiliate' as const, source: 'midstreamer' as const, payload: { id: 3 } },
      ];

      const eventIds = await hub.publishBatch('affiliate-events', events);
      expect(eventIds.length).toBe(3);
    });

    it('should fail on unknown channel', async () => {
      await expect(
        hub.publish('unknown-channel', {
          eventType: 'system',
          source: 'governance',
          payload: {},
        }),
      ).rejects.toThrow('Channel not found');
    });

    it('should track event metrics', async () => {
      await hub.publish('affiliate-events', {
        eventType: 'affiliate',
        source: 'midstreamer',
        payload: { test: true },
      });

      const channel = hub.getChannel('affiliate-events');
      expect(channel?.eventCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Subscriptions', () => {
    it('should subscribe to channel', () => {
      const result = hub.subscribe('affiliate-events', 'subscriber-1');
      expect(result).toBe(true);

      const channel = hub.getChannel('affiliate-events');
      expect(channel?.subscribers.has('subscriber-1')).toBe(true);
    });

    it('should unsubscribe from channel', () => {
      hub.subscribe('affiliate-events', 'subscriber-1');
      const result = hub.unsubscribe('affiliate-events', 'subscriber-1');
      expect(result).toBe(true);

      const channel = hub.getChannel('affiliate-events');
      expect(channel?.subscribers.has('subscriber-1')).toBe(false);
    });

    it('should fail subscribe on unknown channel', () => {
      const result = hub.subscribe('unknown', 'sub-1');
      expect(result).toBe(false);
    });
  });

  describe('Metrics', () => {
    beforeEach(() => {
      hub.start();
    });

    it('should track total events processed', async () => {
      for (let i = 0; i < 10; i++) {
        await hub.publish('affiliate-events', {
          eventType: 'affiliate',
          source: 'midstreamer',
          payload: { index: i },
        });
      }

      // Wait for flush
      await new Promise(resolve => setTimeout(resolve, 150));

      const metrics = hub.getMetrics();
      expect(metrics.totalEventsProcessed).toBeGreaterThanOrEqual(10);
    });

    it('should calculate latency percentiles', async () => {
      for (let i = 0; i < 100; i++) {
        await hub.publish('transaction-events', {
          eventType: 'transaction',
          source: 'analytics',
          payload: { txId: i },
        });
      }

      const metrics = hub.getMetrics();
      expect(metrics.avgLatencyMs).toBeDefined();
      expect(metrics.p95LatencyMs).toBeDefined();
      expect(metrics.p99LatencyMs).toBeDefined();
    });

    it('should track channel and subscriber counts', () => {
      hub.subscribe('affiliate-events', 'sub-1');
      hub.subscribe('affiliate-events', 'sub-2');
      hub.subscribe('transaction-events', 'sub-3');

      const metrics = hub.getMetrics();
      expect(metrics.channelCount).toBe(5);
      expect(metrics.subscriberCount).toBe(3);
    });

    it('should track uptime', async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      const metrics = hub.getMetrics();
      expect(metrics.uptimeMs).toBeGreaterThanOrEqual(100);
    });
  });

  describe('Channel Management', () => {
    it('should create new channel', () => {
      const result = hub.createChannel('custom-channel', 'Custom Channel', 'queue');
      expect(result).toBe(true);

      const channel = hub.getChannel('custom-channel');
      expect(channel?.name).toBe('Custom Channel');
      expect(channel?.type).toBe('queue');
    });

    it('should not create duplicate channel', () => {
      hub.createChannel('new-channel', 'New', 'broadcast');
      const result = hub.createChannel('new-channel', 'Duplicate', 'pubsub');
      expect(result).toBe(false);
    });
  });

  describe('Health Check', () => {
    it('should report healthy state', () => {
      hub.start();
      expect(hub.isHealthy()).toBe(true);
    });
  });
});

describe('RealTimeCircuitBreaker', () => {
  let breaker: RealTimeCircuitBreaker;

  beforeEach(() => {
    breaker = new RealTimeCircuitBreaker(3, 1000);
  });

  it('should start in closed state', () => {
    expect(breaker.getState()).toBe('closed');
    expect(breaker.canProcess()).toBe(true);
  });

  it('should open after threshold failures', () => {
    breaker.recordFailure();
    breaker.recordFailure();
    const tripped = breaker.recordFailure();
    
    expect(tripped).toBe(true);
    expect(breaker.getState()).toBe('open');
    expect(breaker.canProcess()).toBe(false);
  });

  it('should transition to half-open after cooldown', async () => {
    // Use shorter cooldown for test
    breaker = new RealTimeCircuitBreaker(2, 100);
    
    breaker.recordFailure();
    breaker.recordFailure();
    
    expect(breaker.getState()).toBe('open');
    
    await new Promise(resolve => setTimeout(resolve, 150));
    
    expect(breaker.canProcess()).toBe(true);
    expect(breaker.getState()).toBe('half_open');
  });

  it('should close after successful requests in half-open', async () => {
    breaker = new RealTimeCircuitBreaker(2, 50);
    
    breaker.recordFailure();
    breaker.recordFailure();
    
    await new Promise(resolve => setTimeout(resolve, 100));
    breaker.canProcess(); // Trigger half-open
    
    breaker.recordSuccess();
    breaker.recordSuccess();
    breaker.recordSuccess();
    
    expect(breaker.getState()).toBe('closed');
  });

  it('should reduce failures on success in closed state', () => {
    breaker.recordFailure();
    breaker.recordSuccess();
    
    expect(breaker.getState()).toBe('closed');
    expect(breaker.canProcess()).toBe(true);
  });
});

describe('Factory Functions', () => {
  it('should create hub with custom config', () => {
    const config: Partial<RealTimeConfig> = {
      maxBatchSize: 500,
      flushIntervalMs: 50,
      targetThroughput: 50000,
    };

    const hub = createRealTimePlatformHub(config);
    expect(hub).toBeDefined();
    hub.stop();
  });

  it('should return default config', () => {
    const config = getDefaultConfig();
    expect(config.enableGovernanceLogging).toBe(true);
    expect(config.metricsLogPath).toBe('.goalie/metrics_log.jsonl');
    expect(config.circuitBreakerThreshold).toBe(5);
  });
});

