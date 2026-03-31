import { EventEmitter } from 'events';
import { InAppNotifier } from '../../src/notifications/inapp-notifier';
import { NotificationChannel, NotificationPayload, NotificationPriority, NotificationStatus } from '../../src/notifications/types';

// Minimal fake metrics to ensure calls succeed
class TestMetrics {
  counters: Record<string, number> = {};
  gauges: Record<string, number> = {};
  hist: Array<{ name: string; value: number }> = [];
  inc(name: string, value: number = 1) { this.counters[name] = (this.counters[name] || 0) + value; }
  gauge(name: string, value: number) { this.gauges[name] = value; }
  observe(name: string, value: number) { this.hist.push({ name, value }); }
}

describe('InAppNotifier observability', () => {
  it('emits lifecycle and cleanup events', async () => {
    const events = new EventEmitter();
    const metrics = new TestMetrics();
    const received: Array<{ evt: string; data?: any }> = [];

    const record = (evt: string) => (data: any) => received.push({ evt, data });
    events.on('notifier.init', record('notifier.init'));
    events.on('cleanup.started', record('cleanup.started'));
    events.on('cleanup.cycle.completed', record('cleanup.cycle.completed'));
    events.on('cleanup.error', record('cleanup.error'));
    events.on('notifier.destroyed', record('notifier.destroyed'));

    const notifier = new InAppNotifier({
      storageType: 'memory',
      maxNotificationsPerUser: 100,
      retentionDays: 0 // force retention expiry
    }, { events, metrics: metrics as any });

    const payload: NotificationPayload = {
      id: 'evt-1',
      type: 'test',
      title: 't',
      message: 'm',
      priority: NotificationPriority.LOW,
      channels: [NotificationChannel.INAPP],
      recipient: { id: 'u1', type: 'provider', name: 'User', preferredChannels: [NotificationChannel.INAPP] },
      createdAt: new Date(Date.now() - 10_000) // 10s ago
    };

    const res = await notifier.send(payload);
    expect(res.status).toBe(NotificationStatus.DELIVERED);

    // Force immediate cleanup
    const { removed } = notifier.runCleanupNow();
    expect(removed).toBeGreaterThanOrEqual(1);

    notifier.destroy();

    const names = received.map(r => r.evt);
    expect(names).toContain('notifier.init');
    expect(names).toContain('cleanup.started');
    expect(names).toContain('cleanup.cycle.completed');
    expect(names).toContain('notifier.destroyed');
  });
});
