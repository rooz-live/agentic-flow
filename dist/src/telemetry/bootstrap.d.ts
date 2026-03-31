import { EventEmitter } from 'events';
import { JsonlEventSink } from '../notifications/telemetry_sinks';
import { Metrics } from '../notifications/metrics';
export interface TelemetryRuntime {
    bus: EventEmitter;
    metrics: Metrics;
    sink?: JsonlEventSink;
    stop: () => void;
}
export declare function startTelemetry(options?: {
    filePath?: string;
    flushIntervalMs?: number;
    batchSize?: number;
    maxPerMinute?: number;
    subscribeTo?: string[];
    useProm?: boolean;
}): TelemetryRuntime;
export declare function getTelemetry(): TelemetryRuntime | undefined;
export declare function stopTelemetry(): void;
//# sourceMappingURL=bootstrap.d.ts.map