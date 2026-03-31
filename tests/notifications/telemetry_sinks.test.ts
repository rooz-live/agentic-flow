import { EventEmitter } from 'events';
import { JsonlEventSink } from '../../src/notifications/telemetry_sinks';
import { existsSync, readFileSync, rmSync } from 'fs';

describe('JsonlEventSink', () => {
  const filePath = 'tmp/test_metrics_log.jsonl';

  afterEach(() => {
    try { if (existsSync(filePath)) rmSync(filePath); } catch {}
  });

  it('batches and rate-limits event writes', async () => {
    const bus = new EventEmitter();
    const sink = new JsonlEventSink(bus, {
      filePath,
      flushIntervalMs: 200,
      batchSize: 20,
      maxPerMinute: 50,
      subscribeTo: ['cleanup.cycle.completed']
    });

    sink.start();

    // Emit a burst of events
    for (let i = 0; i < 200; i++) {
      bus.emit('cleanup.cycle.completed', { removed: 1, scanned: 100, durationMs: 5 });
    }

    // wait for a few flush intervals
    await new Promise(r => setTimeout(r, 700));
    sink.stop();

    expect(existsSync(filePath)).toBe(true);
    const content = readFileSync(filePath, 'utf8').trim();
    expect(content.length).toBeGreaterThan(0);

    // Should not have written all 200 due to rate limit
    const lines = content.split('\n');
    expect(lines.length).toBeLessThan(200);
  });
});
