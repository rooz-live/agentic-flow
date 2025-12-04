export class OTelMetrics {
    meter = null;
    counters = new Map();
    gauges = new Map();
    histograms = new Map();
    constructor() {
        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const api = require('@opentelemetry/api');
            const meterProvider = api.metrics.getMeterProvider?.();
            this.meter = meterProvider?.getMeter?.('agentic-flow') || api.metrics.getMeter?.('agentic-flow');
        }
        catch {
            this.meter = null; // OpenTelemetry not installed; remain inert
        }
    }
    ensureCounter(name) {
        if (!this.meter)
            return null;
        if (!this.counters.has(name)) {
            const c = this.meter.createCounter ? this.meter.createCounter(name) : null;
            this.counters.set(name, c);
        }
        return this.counters.get(name);
    }
    ensureGauge(name) {
        if (!this.meter)
            return null;
        if (!this.gauges.has(name)) {
            const g = this.meter.createObservableGauge ? this.meter.createObservableGauge(name, {
                callback: (obs) => {
                    const v = g.__lastValue ?? 0;
                    obs.observe(v);
                }
            }) : null;
            if (g)
                g.__lastValue = 0;
            this.gauges.set(name, g);
        }
        return this.gauges.get(name);
    }
    ensureHistogram(name) {
        if (!this.meter)
            return null;
        if (!this.histograms.has(name)) {
            const h = this.meter.createHistogram ? this.meter.createHistogram(name) : null;
            this.histograms.set(name, h);
        }
        return this.histograms.get(name);
    }
    inc(name, value = 1) {
        const c = this.ensureCounter(name);
        if (c && c.add)
            c.add(value);
    }
    gauge(name, value) {
        const g = this.ensureGauge(name);
        if (g)
            g.__lastValue = value;
    }
    observe(name, value) {
        const h = this.ensureHistogram(name);
        if (h && h.record)
            h.record(value);
    }
}
//# sourceMappingURL=otel_metrics.js.map