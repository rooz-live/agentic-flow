export class PromMetrics {
    client;
    counters = new Map();
    gauges = new Map();
    histograms = new Map();
    constructor() {
        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            this.client = require('prom-client');
        }
        catch {
            this.client = null;
        }
    }
    ensureCounter(name) {
        if (!this.client)
            return null;
        if (!this.counters.has(name)) {
            this.counters.set(name, new this.client.Counter({ name, help: name }));
        }
        return this.counters.get(name);
    }
    ensureGauge(name) {
        if (!this.client)
            return null;
        if (!this.gauges.has(name)) {
            this.gauges.set(name, new this.client.Gauge({ name, help: name }));
        }
        return this.gauges.get(name);
    }
    ensureHistogram(name) {
        if (!this.client)
            return null;
        if (!this.histograms.has(name)) {
            this.histograms.set(name, new this.client.Histogram({ name, help: name }));
        }
        return this.histograms.get(name);
    }
    inc(name, value = 1) {
        const c = this.ensureCounter(name);
        if (c)
            c.inc(value);
    }
    gauge(name, value) {
        const g = this.ensureGauge(name);
        if (g)
            g.set(value);
    }
    observe(name, value) {
        const h = this.ensureHistogram(name);
        if (h)
            h.observe(value);
    }
}
//# sourceMappingURL=prom_metrics.js.map