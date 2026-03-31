import { Metrics } from './metrics';
export declare class PromMetrics implements Metrics {
    private client;
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
//# sourceMappingURL=prom_metrics.d.ts.map