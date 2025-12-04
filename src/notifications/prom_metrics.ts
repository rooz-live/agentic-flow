import { Metrics } from './metrics';

export class PromMetrics implements Metrics {
  private client: any;
  private counters: Map<string, any> = new Map();
  private gauges: Map<string, any> = new Map();
  private histograms: Map<string, any> = new Map();

  constructor() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      this.client = require('prom-client');
    } catch {
      this.client = null;
    }
  }

  private ensureCounter(name: string) {
    if (!this.client) return null;
    if (!this.counters.has(name)) {
      this.counters.set(name, new this.client.Counter({ name, help: name }));
    }
    return this.counters.get(name);
  }

  private ensureGauge(name: string) {
    if (!this.client) return null;
    if (!this.gauges.has(name)) {
      this.gauges.set(name, new this.client.Gauge({ name, help: name }));
    }
    return this.gauges.get(name);
  }

  private ensureHistogram(name: string) {
    if (!this.client) return null;
    if (!this.histograms.has(name)) {
      this.histograms.set(name, new this.client.Histogram({ name, help: name }));
    }
    return this.histograms.get(name);
  }

  inc(name: string, value: number = 1): void {
    const c = this.ensureCounter(name);
    if (c) c.inc(value);
  }

  gauge(name: string, value: number): void {
    const g = this.ensureGauge(name);
    if (g) g.set(value);
  }

  observe(name: string, value: number): void {
    const h = this.ensureHistogram(name);
    if (h) h.observe(value);
  }
}