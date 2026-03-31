import { Metrics } from './metrics';

export class OTelMetrics implements Metrics {
  private meter: any | null = null;
  private counters: Map<string, any> = new Map();
  private gauges: Map<string, any> = new Map();
  private histograms: Map<string, any> = new Map();

  constructor() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const api = require('@opentelemetry/api');
      const meterProvider = api.metrics.getMeterProvider?.();
      this.meter = meterProvider?.getMeter?.('agentic-flow') || api.metrics.getMeter?.('agentic-flow');
    } catch {
      this.meter = null; // OpenTelemetry not installed; remain inert
    }
  }

  private ensureCounter(name: string) {
    if (!this.meter) return null;
    if (!this.counters.has(name)) {
      const c = this.meter.createCounter ? this.meter.createCounter(name) : null;
      this.counters.set(name, c);
    }
    return this.counters.get(name);
  }

  private ensureGauge(name: string) {
    if (!this.meter) return null;
    if (!this.gauges.has(name)) {
      const g = this.meter.createObservableGauge ? this.meter.createObservableGauge(name, {
        callback: (obs: any) => {
          const v = (g as any).__lastValue ?? 0;
          obs.observe(v);
        }
      }) : null;
      if (g) (g as any).__lastValue = 0;
      this.gauges.set(name, g);
    }
    return this.gauges.get(name);
  }

  private ensureHistogram(name: string) {
    if (!this.meter) return null;
    if (!this.histograms.has(name)) {
      const h = this.meter.createHistogram ? this.meter.createHistogram(name) : null;
      this.histograms.set(name, h);
    }
    return this.histograms.get(name);
  }

  inc(name: string, value: number = 1): void {
    const c = this.ensureCounter(name);
    if (c && c.add) c.add(value);
  }

  gauge(name: string, value: number): void {
    const g = this.ensureGauge(name);
    if (g) (g as any).__lastValue = value;
  }

  observe(name: string, value: number): void {
    const h = this.ensureHistogram(name);
    if (h && h.record) h.record(value);
  }
}
