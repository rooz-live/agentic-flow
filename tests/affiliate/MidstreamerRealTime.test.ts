/**
 * Midstreamer Real-Time Features Tests
 * Tests for high-performance event streaming and WebSocket integration
 */

import { AffiliateStateTracker } from '../../src/affiliate/AffiliateStateTracker';
import {
    MidstreamerAffiliateStream,
    StreamEvent,
    createAffiliateStream,
    createEventGenerator,
    getStreamHealth
} from '../../src/integrations/midstreamer_affiliate';

describe('Midstreamer Real-Time Features', () => {
  let tracker: AffiliateStateTracker;
  let stream: MidstreamerAffiliateStream;

  beforeEach(() => {
    tracker = new AffiliateStateTracker({ dbPath: ':memory:', enableLearning: false });
    stream = createAffiliateStream(tracker, { batchSize: 10, flushIntervalMs: 100 });
  });

  afterEach(() => {
    stream.stop();
    tracker.close();
  });

  describe('Stream Initialization', () => {
    it('should create stream with default configuration', () => {
      const defaultStream = createAffiliateStream(tracker);
      expect(defaultStream).toBeInstanceOf(MidstreamerAffiliateStream);
      expect(defaultStream.isStreamRunning()).toBe(false);
      defaultStream.stop();
    });

    it('should start and stop stream correctly', () => {
      stream.start();
      expect(stream.isStreamRunning()).toBe(true);
      stream.stop();
      expect(stream.isStreamRunning()).toBe(false);
    });

    it('should emit stream:started event', (done) => {
      stream.on('stream:started', (data) => {
        expect(data.timestamp).toBeInstanceOf(Date);
        done();
      });
      stream.start();
    });

    it('should emit stream:stopped event with metrics', (done) => {
      stream.on('stream:stopped', (data) => {
        expect(data.metrics).toBeDefined();
        expect(data.timestamp).toBeInstanceOf(Date);
        done();
      });
      stream.start();
      stream.stop();
    });
  });

  describe('Event Ingestion', () => {
    beforeEach(() => {
      stream.start();
      tracker.createAffiliate({ affiliateId: 'aff_1', name: 'Test Affiliate', tier: 'standard' });
      tracker.createAffiliate({ affiliateId: 'aff_2', name: 'Test Affiliate 2', tier: 'premium' });
    });

    it('should ingest single event', () => {
      const event: StreamEvent = {
        eventId: 'evt_test_1',
        affiliateId: 'aff_1',
        eventType: 'login',
        source: 'midstreamer',
        payload: { ip: '127.0.0.1' },
        timestamp: new Date(),
      };
      const result = stream.ingest(event);
      expect(result).toBe(true);
      expect(stream.getQueueSize()).toBe(1);
    });

    it('should ingest batch of events', () => {
      const generator = createEventGenerator(['aff_1', 'aff_2']);
      const events = generator.generateBatch(5);
      const { success, failed } = stream.ingestBatch(events);
      expect(success).toBe(5);
      expect(failed).toBe(0);
    });

    it('should reject events when stream is stopped', () => {
      stream.stop();
      const event: StreamEvent = {
        eventId: 'evt_test_2',
        affiliateId: 'aff_1',
        eventType: 'login',
        source: 'midstreamer',
        payload: {},
        timestamp: new Date(),
      };
      const result = stream.ingest(event);
      expect(result).toBe(false);
    });
  });

  describe('Event Batching and Flushing', () => {
    beforeEach(() => {
      stream.start();
      tracker.createAffiliate({ affiliateId: 'aff_1', name: 'Test', tier: 'standard' });
    });

    it('should auto-flush when batch size reached', (done) => {
      stream.on('batch:processed', (data) => {
        expect(data.batchSize).toBe(10);
        done();
      });

      const generator = createEventGenerator(['aff_1']);
      const events = generator.generateBatch(10);
      stream.ingestBatch(events);
    });

    it('should flush on interval', (done) => {
      stream.on('batch:processed', () => done());
      const event: StreamEvent = {
        eventId: 'evt_test',
        affiliateId: 'aff_1',
        eventType: 'login',
        source: 'midstreamer',
        payload: {},
        timestamp: new Date(),
      };
      stream.ingest(event);
      // Wait for flush interval (100ms + buffer)
    }, 500);
  });

  describe('Metrics and Monitoring', () => {
    it('should track metrics correctly', () => {
      stream.start();
      const generator = createEventGenerator(['aff_1']);
      stream.ingestBatch(generator.generateBatch(5));

      const metrics = stream.getMetrics();
      expect(metrics.eventsReceived).toBe(5);
      expect(metrics.queueSize).toBe(5);
    });

    it('should reset metrics', () => {
      stream.start();
      const generator = createEventGenerator(['aff_1']);
      stream.ingestBatch(generator.generateBatch(5));
      stream.resetMetrics();

      const metrics = stream.getMetrics();
      expect(metrics.eventsReceived).toBe(0);
      expect(metrics.eventsProcessed).toBe(0);
    });
  });

  describe('Stream Health Monitoring', () => {
    it('should report healthy status for running stream', () => {
      stream.start();
      const health = getStreamHealth(stream);
      expect(health.isRunning).toBe(true);
      expect(health.status).toBe('healthy');
    });

    it('should report unhealthy status for stopped stream', () => {
      const health = getStreamHealth(stream);
      expect(health.isRunning).toBe(false);
      expect(health.status).toBe('unhealthy');
    });

    it('should calculate queue utilization', () => {
      stream.start();
      const generator = createEventGenerator(['aff_1']);
      stream.ingestBatch(generator.generateBatch(5));

      const health = getStreamHealth(stream, 100);
      expect(health.queueUtilization).toBe(0.05);
    });
  });

  describe('Performance Benchmarks', () => {
    it('should process at least 10,000 events/second', () => {
      const perfStream = createAffiliateStream(tracker, {
        batchSize: 1000,
        flushIntervalMs: 10000 // Long interval to prevent auto-flush
      });
      perfStream.start();

      const generator = createEventGenerator(['aff_1', 'aff_2', 'aff_3']);
      const eventCount = 10000;

      const startTime = Date.now();
      const events = generator.generateBatch(eventCount);
      const { success } = perfStream.ingestBatch(events);
      const endTime = Date.now();

      const duration = (endTime - startTime) / 1000;
      const eventsPerSecond = success / duration;

      perfStream.stop();

      expect(success).toBe(eventCount);
      expect(eventsPerSecond).toBeGreaterThan(10000);
    });

    it('should maintain <10ms latency for event ingestion', () => {
      stream.start();
      const generator = createEventGenerator(['aff_1']);

      const latencies: number[] = [];
      for (let i = 0; i < 100; i++) {
        const event = generator.generateEvent();
        const start = Date.now();
        stream.ingest(event);
        latencies.push(Date.now() - start);
      }

      const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      expect(avgLatency).toBeLessThan(10);
    });

    it('should handle burst traffic without overflow', () => {
      const burstStream = createAffiliateStream(tracker, {
        maxQueueSize: 10000,
        batchSize: 100,
        flushIntervalMs: 5000
      });
      burstStream.start();

      const generator = createEventGenerator(['aff_1', 'aff_2']);
      const { success, failed } = burstStream.ingestBatch(generator.generateBatch(5000));

      burstStream.stop();

      expect(success).toBe(5000);
      expect(failed).toBe(0);
    });
  });

  describe('Event Generator', () => {
    it('should generate events with valid structure', () => {
      const generator = createEventGenerator(['aff_1']);
      const event = generator.generateEvent();

      expect(event.eventId).toMatch(/^evt_/);
      expect(event.affiliateId).toBe('aff_1');
      expect(event.source).toBe('midstreamer');
      expect(event.timestamp).toBeInstanceOf(Date);
    });

    it('should generate batch of specified size', () => {
      const generator = createEventGenerator(['aff_1', 'aff_2']);
      const batch = generator.generateBatch(50);

      expect(batch.length).toBe(50);
    });

    it('should generate payloads for different event types', () => {
      const generator = createEventGenerator(['aff_1']);
      const events = generator.generateBatch(100);

      const transactionEvents = events.filter(e => e.eventType === 'transaction');
      const commissionEvents = events.filter(e => e.eventType === 'commission');

      if (transactionEvents.length > 0) {
        expect(transactionEvents[0].payload).toHaveProperty('amount');
      }
      if (commissionEvents.length > 0) {
        expect(commissionEvents[0].payload).toHaveProperty('rate');
      }
    });
  });
});
