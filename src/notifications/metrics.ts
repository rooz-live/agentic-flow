export interface Metrics {
  inc(name: string, value?: number, labels?: Record<string, string | number>): void;
  gauge(name: string, value: number, labels?: Record<string, string | number>): void;
  observe(name: string, value: number, labels?: Record<string, string | number>): void;
}

export class NoopMetrics implements Metrics {
  inc(_name: string, _value: number = 1, _labels?: Record<string, string | number>): void {}
  gauge(_name: string, _value: number, _labels?: Record<string, string | number>): void {}
  observe(_name: string, _value: number, _labels?: Record<string, string | number>): void {}
}
