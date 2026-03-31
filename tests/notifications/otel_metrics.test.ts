import { OTelMetrics } from '../../src/notifications/otel_metrics';

describe('OTelMetrics', () => {
  it('constructs and methods do not throw without OpenTelemetry deps', () => {
    const metr = new OTelMetrics();
    expect(() => metr.inc('cleanup_cycles_total')).not.toThrow();
    expect(() => metr.gauge('notifications_in_store', 42)).not.toThrow();
    expect(() => metr.observe('cleanup_cycle_duration_ms', 12)).not.toThrow();
  });
});
