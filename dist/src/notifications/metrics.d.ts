export interface Metrics {
    inc(name: string, value?: number, labels?: Record<string, string | number>): void;
    gauge(name: string, value: number, labels?: Record<string, string | number>): void;
    observe(name: string, value: number, labels?: Record<string, string | number>): void;
}
export declare class NoopMetrics implements Metrics {
    inc(_name: string, _value?: number, _labels?: Record<string, string | number>): void;
    gauge(_name: string, _value: number, _labels?: Record<string, string | number>): void;
    observe(_name: string, _value: number, _labels?: Record<string, string | number>): void;
}
//# sourceMappingURL=metrics.d.ts.map