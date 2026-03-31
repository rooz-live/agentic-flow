import { Metrics } from './metrics';
export declare class OTelMetrics implements Metrics {
    private meter;
    private counters;
    private gauges;
    private histograms;
    constructor();
    private ensureCounter;
    private ensureGauge;
    private ensureHistogram;
    inc(name: string, value?: number): void;
    gauge(name: string, value: number): void;
    observe(name: string, value: number): void;
}
//# sourceMappingURL=otel_metrics.d.ts.map